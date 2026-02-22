import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { colors, typography, spacing } from '../../../theme';
import { getLikesReceived, likeUser } from '../../../services/swipeActions';
import { useLoading } from '../../../context/LoadingContext';

const LikesScreen = ({ navigation }) => {
  const { setLoading: setGlobalLoading } = useLoading();
  const [likes, setLikes] = useState([]);
  const [likesCount, setLikesCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isPremiumRequired, setIsPremiumRequired] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadLikes();
    }, []),
  );

  const loadLikes = async () => {
    try {
      setGlobalLoading(true);
      let user;
      const userData = await AsyncStorage.getItem('@pryvo_user');
      if (userData && userData !== 'undefined') {
        try {
          user = JSON.parse(userData);
          setCurrentUserId(user.id);
        } catch (e) {
          console.error('Failed to parse user data in LikesScreen:', e);
          return;
        }
      } else {
        return;
      }

      if (!user || !user.id) return;

      // For now, everyone is treated as premium (LIKES_VISIBLE_FREE = true on server)
      const isPremium = true; // Change this based on user subscription status

      const response = await getLikesReceived(user.id, isPremium);

      if (response.success) {
        setLikes(response.likes || []);
        setLikesCount(response.count || 0);
        setIsPremiumRequired(response.isPremiumRequired || false);
      }
    } catch (error) {
      console.log('Error fetching likes:', error);
    } finally {
      setLoading(false);
      setGlobalLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadLikes();
  };

  const handleLikeBack = async likerId => {
    try {
      const result = await likeUser(currentUserId, likerId);

      if (result.isMatch) {
        Alert.alert("It's a Match! 🎉", 'You can now start chatting!', [
          {
            text: 'Send Message',
            onPress: () => {
              navigation.navigate('ChatScreen', {
                matchId: result.match._id,
                theirId: likerId,
              });
            },
          },
          { text: 'Continue', style: 'cancel' },
        ]);

        // Remove from likes list
        setLikes(prev => prev.filter(l => l.senderId !== likerId));
        setLikesCount(prev => prev - 1);
      }
    } catch (error) {
      console.log('Error liking back:', error);
      Alert.alert('Error', 'Failed to like back. Please try again.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center} edges={['top', 'left', 'right']}>
        <View />
      </SafeAreaView>
    );
  }

  if (isPremiumRequired) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Likes</Text>
          {likesCount > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{likesCount}</Text>
            </View>
          )}
        </View>

        <View style={styles.premiumContainer}>
          <Text style={styles.premiumEmoji}>💕</Text>
          <Text style={styles.premiumTitle}>
            {likesCount} people liked you!
          </Text>
          <Text style={styles.premiumSubtitle}>
            Upgrade to Premium to see who liked you and match instantly!
          </Text>
          <Pressable
            style={styles.premiumButton}
            onPress={() => navigation.navigate('SubscriptionUpsell')}>
            <Text style={styles.premiumButtonText}>💎 Upgrade to Premium</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (likes.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Likes</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>💕</Text>
          <Text style={styles.emptyTitle}>No likes yet</Text>
          <Text style={styles.emptySubtitle}>
            Keep swiping! When someone likes you, they'll appear here.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderItem = ({ item }) => (
    <View style={styles.likeCard}>
      <Image
        source={{
          uri:
            item.photo ||
            'https://ui-avatars.com/api/?background=667eea&color=fff&name=' +
            (item.name || 'U'),
        }}
        style={styles.avatar}
      />
      <View style={styles.infoContainer}>
        <Text style={styles.name}>
          {item.name}
          {item.age ? `, ${item.age}` : ''}
        </Text>
        <Text style={styles.likedText}>Liked your profile</Text>
      </View>
      <Pressable
        style={styles.likeBackButton}
        onPress={() => handleLikeBack(item.senderId)}>
        <Text style={styles.likeBackText}>❤️ Like Back</Text>
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Likes</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{likesCount}</Text>
        </View>
      </View>

      <FlatList
        data={likes}
        keyExtractor={(item, index) => item.senderId || index.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
  },
  countBadge: {
    marginLeft: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
  },
  countText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  listContent: {
    paddingVertical: spacing.md,
  },
  likeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.surface,
  },
  infoContainer: {
    flex: 1,
    marginLeft: spacing.md,
  },
  name: {
    fontSize: 18,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
  },
  likedText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  likeBackButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
  },
  likeBackText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 22,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  premiumContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  premiumEmoji: {
    fontSize: 80,
    marginBottom: spacing.lg,
  },
  premiumTitle: {
    fontSize: 24,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  premiumSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  premiumButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 30,
  },
  premiumButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default LikesScreen;
