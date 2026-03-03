import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useFocusEffect} from '@react-navigation/native';
import {colors, typography, spacing} from '../../../theme';
import {fetchMatches, fetchLastMessages} from '../../../services/chatService';

import {fetchUserStreaks} from '../../../services/streakService';
import StreakBadge from '../../../components/common/StreakBadge';
import {initSocket} from '../../../services/socket';

import {useLoading} from '../../../context/LoadingContext';

const ChatsScreen = ({navigation}) => {
  const {setLoading: setGlobalLoading} = useLoading();
  const [matches, setMatches] = useState([]);
  const [lastMessages, setLastMessages] = useState({});
  const [streaks, setStreaks] = useState({});
  const [currentUserId, setCurrentUserId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load matches when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadMatches();
    }, []),
  );

  useEffect(() => {
    // Initialize socket when component mounts
    const initializeSocket = async () => {
      const userData = await AsyncStorage.getItem('@pryvo_user');
      if (userData && userData !== 'undefined') {
        try {
          const user = JSON.parse(userData);
          setCurrentUserId(user.id);

          const socket = initSocket(user.id);

          // Listen for new messages to update the list
          socket.on('receiveMessage', msg => {
            setLastMessages(prev => ({
              ...prev,
              [msg.matchId]: {
                lastMessage: msg,
                unreadCount:
                  (prev[msg.matchId]?.unreadCount || 0) +
                  (msg.receiverId === user.id ? 1 : 0),
              },
            }));
          });

          // Real-time streak updates
          socket.on('streak:update', data => {
            setStreaks(prev => ({
              ...prev,
              [data.userPairId]: data,
            }));
          });
        } catch (e) {
          console.error('Failed to parse user data in ChatsScreen:', e);
        }
      }
    };

    initializeSocket();
  }, []);

  const loadMatches = async () => {
    try {
      if (!matches.length && !refreshing) {
        setLoading(true);
      }
      const userData = await AsyncStorage.getItem('@pryvo_user');
      if (userData && userData !== 'undefined') {
        const user = JSON.parse(userData);
        setCurrentUserId(user.id);

        const response = await fetchMatches(user.id);
        const list = response?.matches || [];

        // Deduplicate by theirId to ensure one chat per person
        const uniqueMatches = [];
        const seenIds = new Set();

        list.forEach(match => {
          const theirId = match.users.find(u => u !== user.id);
          if (!seenIds.has(theirId)) {
            seenIds.add(theirId);
            uniqueMatches.push(match);
          }
        });

        setMatches(uniqueMatches);

        // Load last messages for all matches
        if (list.length > 0) {
          const matchIds = list.map(m => m._id);
          const lastMsgs = await fetchLastMessages(matchIds, user.id);

          const msgMap = {};
          lastMsgs.forEach(item => {
            msgMap[item.matchId] = {
              lastMessage: item.lastMessage,
              unreadCount: item.unreadCount || 0,
            };
          });
          setLastMessages(msgMap);
        }

        // Load Streaks
        try {
          const streakList = await fetchUserStreaks(user.id);
          const streakMap = {};
          streakList.forEach(s => {
            const pairId = s.userPairId;
            streakMap[pairId] = s;
          });
          setStreaks(streakMap);
        } catch (err) {
          console.warn('[ChatsScreen] Streak fetch silently failed:', err);
        }
      }
    } catch (error) {
      console.log('Error fetching matches', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadMatches();
  };

  const formatTime = timestamp => {
    if (!timestamp) return '';

    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], {weekday: 'short'});
    } else {
      return date.toLocaleDateString([], {month: 'short', day: 'numeric'});
    }
  };

  const getPreviewText = message => {
    if (!message) return 'Tap to start chatting';
    if (message.mediaUrl) return '📷 Photo';
    return message.text || 'Tap to start chatting';
  };

  // Removed blank loading screen
  if (!matches.length) {
    return (
      <SafeAreaView style={styles.center} edges={['top', 'left', 'right']}>
        <Text style={styles.emptyEmoji}>💬</Text>
        <Text style={styles.emptyTitle}>No matches yet</Text>
        <Text style={styles.emptyText}>
          When you match with someone, you can start chatting here
        </Text>
      </SafeAreaView>
    );
  }

  const renderItem = ({item}) => {
    const theirId = item.users.find(u => u !== currentUserId);
    const matchData = lastMessages[item._id] || {};
    const lastMessage = matchData.lastMessage;
    const unreadCount = matchData.unreadCount || 0;

    const ids = [currentUserId, theirId].sort();
    const pairId = `${ids[0]}_${ids[1]}`;
    const streakData = streaks[pairId];

    return (
      <Pressable
        style={styles.chatItem}
        onPress={() =>
          navigation.navigate('ChatScreen', {
            matchId: item._id,
            theirId,
            theirName: item.theirName || `User ${theirId?.slice(0, 6) || ''}`,
            theirPhoto: item.theirPhoto,
            theirAge: item.theirAge,
          })
        }>
        <View style={styles.avatarContainer}>
          <Image
            source={{
              uri:
                item.theirPhoto ||
                'https://ui-avatars.com/api/?background=667eea&color=fff&name=User',
            }}
            style={styles.avatar}
          />
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </Text>
            </View>
          )}
          {streakData && streakData.streakCount > 0 && (
            <View style={styles.streakBadgeOverlay}>
              <StreakBadge
                count={streakData.streakCount}
                graceUsed={streakData.graceUsed}
                compact={true}
              />
            </View>
          )}
        </View>

        <View style={styles.textContainer}>
          <View style={styles.nameRow}>
            <Text
              style={[styles.name, unreadCount > 0 && styles.nameBold]}
              numberOfLines={1}>
              {item.theirName || `User ${theirId?.slice(0, 6) || ''}`}
              {item.theirAge ? `, ${item.theirAge}` : ''}
            </Text>
            {lastMessage && (
              <Text style={styles.timeText}>
                {formatTime(lastMessage.timestamp)}
              </Text>
            )}
          </View>
          <Text
            style={[
              styles.lastMessage,
              unreadCount > 0 && styles.lastMessageUnread,
            ]}
            numberOfLines={1}>
            {lastMessage?.senderId === currentUserId && '✓ '}
            {getPreviewText(lastMessage)}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>

      <FlatList
        data={matches}
        keyExtractor={item => item._id}
        renderItem={renderItem}
        contentContainerStyle={{paddingVertical: spacing.sm}}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: typography.body?.large || 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#eee',
  },
  unreadBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  streakBadgeOverlay: {
    position: 'absolute',
    bottom: -6,
    right: -4,
    transform: [{scale: 0.85}],
  },
  textContainer: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: typography.body?.large || 16,
    color: colors.textPrimary,
    flex: 1,
  },
  nameBold: {
    fontFamily: typography.fontFamilyBold,
  },
  timeText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  lastMessage: {
    fontSize: typography.body?.small || 14,
    color: colors.textSecondary,
  },
  lastMessageUnread: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
});

export default ChatsScreen;
