import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  ActivityIndicator,
  Pressable,
  Dimensions,
  StatusBar,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {colors, typography, spacing} from '../../../theme';
import {getStreakLeaderboard} from '../../../services/streakService';

const {width} = Dimensions.get('window');

const StreakLeaderboardScreen = ({navigation}) => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    fetchLeaderboard();
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const userData = await AsyncStorage.getItem('@pryvo_user');
      if (userData && userData !== 'undefined') {
        const user = JSON.parse(userData);
        setCurrentUserId(user.id || user._id);
      }
    } catch (e) {
      console.error('[Streak Leaderboard] User fetch error:', e);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const data = await getStreakLeaderboard();
      setLeaderboard(data || []);
    } catch (error) {
      console.error('[Streak Leaderboard] Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderRankBadge = index => {
    const isTop3 = index < 3;
    const badgeColors = [
      ['#FFD700', '#FFA500'], // Gold
      ['#C0C0C0', '#808080'], // Silver
      ['#CD7F32', '#8B4513'], // Bronze
    ];

    if (isTop3) {
      return (
        <LinearGradient
          colors={badgeColors[index]}
          style={styles.rankBadgeGradient}>
          <Text style={styles.rankBadgeText}>{index + 1}</Text>
        </LinearGradient>
      );
    }

    return (
      <View style={styles.rankBadgeSimple}>
        <Text style={styles.rankNumberText}>{index + 1}</Text>
      </View>
    );
  };

  const renderItem = ({item, index}) => {
    const isFirst = index === 0;

    const isCurrentUserEntry =
      item.userA?.id === currentUserId || item.userB?.id === currentUserId;
    const shouldBlur = !isCurrentUserEntry && currentUserId !== null;

    return (
      <View style={[styles.card, isFirst && styles.firstCard]}>
        <View style={styles.cardContent}>
          <View style={styles.profileSection}>
            <View style={styles.avatarGroup}>
              <View style={styles.avatarWrapper}>
                <View
                  style={[
                    styles.avatarContainer,
                    isFirst && styles.firstAvatarContainer,
                  ]}>
                  <Image
                    source={{
                      uri:
                        item.userA?.photo ||
                        `https://ui-avatars.com/api/?background=9411FA&color=fff&name=${encodeURIComponent(
                          item.userA?.name || 'A',
                        )}`,
                    }}
                    style={styles.avatar}
                    blurRadius={shouldBlur ? 50 : 0}
                  />
                </View>
              </View>
              <View style={[styles.avatarWrapper, styles.overlappingAvatar]}>
                <View
                  style={[
                    styles.avatarContainer,
                    isFirst && styles.firstAvatarContainer,
                  ]}>
                  <Image
                    source={{
                      uri:
                        item.userB?.photo ||
                        `https://ui-avatars.com/api/?background=9411FA&color=fff&name=${encodeURIComponent(
                          item.userB?.name || 'B',
                        )}`,
                    }}
                    style={styles.avatar}
                    blurRadius={shouldBlur ? 35 : 0}
                  />
                </View>
              </View>
            </View>
            <View style={styles.nameContainer}>
              <Text
                style={[styles.pairNamesText, shouldBlur && styles.blurredText]}
                numberOfLines={1}>
                {item.userA?.name} & {item.userB?.name}
              </Text>
            </View>
          </View>

          <View style={styles.streakContainer}>
            <Text style={styles.streakEmojiRow}>🔥</Text>
            <Text style={styles.streakValueRow}>{item.streakCount}</Text>
          </View>

          <View style={styles.rankSection}>{renderRankBadge(index)}</View>
        </View>
      </View>
    );
  };

  const Header = () => (
    <LinearGradient
      colors={[colors.primary, '#C48EFF']}
      start={{x: 0, y: 0}}
      end={{x: 1, y: 1}}
      style={styles.headerGradient}>
      <View style={styles.headerTop}>
        <Pressable
          style={styles.iconButton}
          onPress={() => navigation.goBack()}>
          <Icon name="chevron-back" size={28} color="#FFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Leaderboard</Text>
        <Pressable style={styles.iconButton} onPress={fetchLeaderboard}>
          <Icon name="refresh" size={24} color="#FFF" />
        </Pressable>
      </View>
      <View style={styles.headerBottom}>
        <View style={styles.headerIconContainer}>
          <Text style={styles.headerMainEmoji}>🔥</Text>
        </View>
        <Text style={styles.headerSubtitle}>Absolute Legends</Text>
        <Text style={styles.headerDescription}>
          Top 10 hottest streaks on Pryvo
        </Text>
      </View>
    </LinearGradient>
  );

  return (
    <View style={styles.mainContainer}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />
      <Header />

      <View style={styles.contentOverlay}>
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Fetching heat...</Text>
          </View>
        ) : leaderboard.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🌑</Text>
            <Text style={styles.emptyTitle}>Cold as Ice</Text>
            <Text style={styles.emptyText}>
              No streaks active yet. Go break the ice!
            </Text>
            <Pressable
              style={styles.startChatButton}
              onPress={() => navigation.goBack()}>
              <Text style={styles.startChatButtonText}>Start Chatting</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={leaderboard}
            keyExtractor={item => item.userPairId}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 40,
    paddingHorizontal: spacing.lg,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 1,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBottom: {
    alignItems: 'center',
  },
  headerIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  headerMainEmoji: {
    fontSize: 32,
  },
  headerSubtitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  headerDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  contentOverlay: {
    flex: 1,
    marginTop: -20,
    backgroundColor: '#F8F9FA',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 10,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    marginBottom: spacing.md,
    padding: spacing.md,
    shadowColor: '#9411FA',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  firstCard: {
    borderWidth: 2,
    borderColor: '#FFD700',
    backgroundColor: '#FFFDF0',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  overlappingAvatar: {
    marginLeft: -25,
  },
  avatarWrapper: {
    zIndex: 1,
  },
  avatarContainer: {
    padding: 2,
    borderRadius: 24,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  firstAvatarContainer: {
    backgroundColor: '#FFD700',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  nameContainer: {
    flex: 1,
    paddingRight: 5,
  },
  pairNamesText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  blurredText: {
    color: 'transparent',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 10,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
    backgroundColor: '#FFF5F5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  streakEmojiRow: {
    fontSize: 16,
    marginRight: 4,
  },
  streakValueRow: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FF4B4B',
  },
  rankSection: {
    width: 40,
    alignItems: 'flex-end',
  },
  rankBadgeGradient: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  rankBadgeSimple: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    minWidth: 60,
    justifyContent: 'center',
  },
  streakEmoji: {
    fontSize: 14,
    marginRight: 4,
  },
  streakValue: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 14,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  emptyEmoji: {
    fontSize: 60,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 30,
  },
  startChatButton: {
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 30,
    backgroundColor: colors.primary,
  },
  startChatButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default StreakLeaderboardScreen;
