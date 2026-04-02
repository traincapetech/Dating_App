import React, {useEffect, useState, useCallback, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useFocusEffect} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import {colors, typography, spacing} from '../../../theme';
import {fetchMatches, fetchLastMessages} from '../../../services/chatService';

import {fetchUserStreaks} from '../../../services/streakService';
import StreakBadge from '../../../components/common/StreakBadge';
import {initSocket} from '../../../services/socket';

import {useLoading} from '../../../context/LoadingContext';
import {useInitialLoad} from '../../../context/InitialLoadContext';
import FullScreenLoader from '../../../components/layout/FullScreenLoader';
import ThemeBackground from '../../../components/layout/ThemeBackground';

/**
 * 🌠 ChatsScreen: PREMIUM MESSAGING LIST
 * Redesigned for visual consistency with the Matches screen.
 */

const EmptyState = () => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  return (
    <Animated.View style={[styles.emptyContainer, {opacity: fadeAnim}]}>
      <View style={styles.emptyIllustrationContainer}>
        <LinearGradient
          colors={['#FFF5F5', '#FFF0F0', '#FFE5E5']}
          style={styles.illustrationCircle}>
          <Text style={styles.emptyEmoji}>💬</Text>
        </LinearGradient>
      </View>
      <Text style={styles.emptyTitle}>No conversations yet</Text>
      <Text style={styles.emptySubtitle}>
        When you match with someone, you can start chatting here. Your next
        great story is about to begin.
      </Text>
    </Animated.View>
  );
};

const ChatsScreen = ({navigation}) => {
  const {setLoading: setGlobalLoading} = useLoading();
  const [matches, setMatches] = useState([]);
  const [lastMessages, setLastMessages] = useState({});
  const [streaks, setStreaks] = useState({});
  const [currentUserId, setCurrentUserId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const {visited, markVisited} = useInitialLoad();

  useFocusEffect(
    useCallback(() => {
      loadMatches();
    }, []),
  );

  useEffect(() => {
    const initializeSocket = async () => {
      const userData = await AsyncStorage.getItem('@pryvo_user');
      if (userData && userData !== 'undefined') {
        try {
          const user = JSON.parse(userData);
          setCurrentUserId(user.id);
          const socket = initSocket(user.id);

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

        try {
          const streakList = await fetchUserStreaks(user.id);
          const streakMap = {};
          streakList.forEach(s => {
            streakMap[s.userPairId] = s;
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
      if (!visited.chats) markVisited('chats');
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
    if (diffDays === 0)
      return date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return date.toLocaleDateString([], {weekday: 'short'});
    return date.toLocaleDateString([], {month: 'short', day: 'numeric'});
  };

  const getPreviewText = message => {
    if (!message) return 'Tap to start chatting';
    if (message.mediaUrl) return '📷 Photo';
    return message.text || 'Tap to start chatting';
  };

  const sortedMatches = React.useMemo(() => {
    return [...matches].sort((a, b) => {
      // Prioritize the real-time last message timestamp from socket/API, 
      // fallback to the Match's lastActivityAt or the match's createdAt date.
      const dateA = new Date(
        lastMessages[a._id]?.lastMessage?.timestamp || 
        a.lastMessageAt || 
        a.createdAt
      ).getTime();
      const dateB = new Date(
        lastMessages[b._id]?.lastMessage?.timestamp || 
        b.lastMessageAt || 
        b.createdAt
      ).getTime();
      return dateB - dateA; // Descending order
    });
  }, [matches, lastMessages]);

  if (loading && !visited.chats) {
    return (
      <FullScreenLoader
        visible={true}
        message="Love might be one message away…"
      />
    );
  }

  return (
    <ThemeBackground>
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <Pressable
          style={styles.leaderboardButton}
          onPress={() => navigation.navigate('StreakLeaderboard')}>
          <Icon name="medal-outline" size={24} color={colors.primary} />
          <Text style={styles.leaderboardText}>Top</Text>
        </Pressable>
      </View>
 
      <FlatList
        data={sortedMatches}
        keyExtractor={item => item._id}
        ListEmptyComponent={
          !loading && matches.length === 0 ? <EmptyState /> : null
        }
        contentContainerStyle={[
          styles.listContent,
          matches.length === 0 && {flex: 1},
        ]}
        renderItem={({item}) => {
          const theirId = item.users.find(u => u !== currentUserId);
          const matchData = lastMessages[item._id] || {};
          const unreadCount = matchData.unreadCount || 0;
          const streakData =
            streaks[
              `${[currentUserId, theirId].sort()[0]}_${
                [currentUserId, theirId].sort()[1]
              }`
            ];

          return (
            <Pressable
              style={styles.chatItem}
              onPress={() =>
                navigation.navigate('ChatScreen', {
                  matchId: item._id,
                  theirId,
                  theirName:
                    item.theirName || `User ${theirId?.slice(0, 6) || ''}`,
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
                  {matchData.lastMessage && (
                    <Text style={styles.timeText}>
                      {formatTime(matchData.lastMessage.timestamp)}
                    </Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.lastMessage,
                    unreadCount > 0 && styles.lastMessageUnread,
                  ]}
                  numberOfLines={1}>
                  {matchData.lastMessage?.senderId === currentUserId && '✓ '}
                  {getPreviewText(matchData.lastMessage)}
                </Text>
              </View>
            </Pressable>
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
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
    </ThemeBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingBottom: 84, // Space for floating tab bar
  },
  header: {
    paddingHorizontal: 22,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: typography.fontFamilyBold,
    color: '#1f1f1f',
    letterSpacing: -0.5,
  },
  leaderboardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  leaderboardText: {
    fontSize: 14,
    fontFamily: typography.fontFamilyBold,
    color: colors.primary,
    marginLeft: 4,
  },
  listContent: {
    paddingTop: 10,
    paddingBottom: 32,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F8F8F8',
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
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  unreadText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  streakBadgeOverlay: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    transform: [{scale: 0.8}],
  },
  textContainer: {
    flex: 1,
    paddingBottom: 14,
    justifyContent: 'center',
  },
  separator: {
    height: 0,
    backgroundColor: 'transparent',
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 17,
    fontFamily: typography.fontFamilyMedium,
    color: colors.textPrimary,
    flex: 1,
  },
  nameBold: {
    fontFamily: typography.fontFamilyBold,
  },
  timeText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 8,
  },
  lastMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: typography.fontFamilyRegular,
  },
  lastMessageUnread: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamilyBold,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    minHeight: 400,
  },
  emptyIllustrationContainer: {
    marginBottom: 24,
  },
  illustrationCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 50,
  },
  emptyTitle: {
    fontSize: 22,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default ChatsScreen;
