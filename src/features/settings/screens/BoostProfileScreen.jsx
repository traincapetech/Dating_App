import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {colors, typography, spacing} from '../../../theme';
import {createBoost, getBoostStatus} from '../../../services/boost/boostService';

const BoostProfileScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [boosting, setBoosting] = useState(false);
  const [boostStatus, setBoostStatus] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    loadBoostStatus();
  }, []);

  const loadBoostStatus = async () => {
    try {
      setLoading(true);
      const userData = await AsyncStorage.getItem('@pryvo_user');
      if (!userData) {
        Alert.alert('Error', 'User not found');
        navigation.goBack();
        return;
      }

      const user = JSON.parse(userData);
      setCurrentUserId(user.id);
      setIsPremium(user.isPremium || false);

      const response = await getBoostStatus(user.id);
      if (response?.success) {
        setBoostStatus(response);
        setIsPremium(response.isPremium);
      }
    } catch (error) {
      console.error('Error loading boost status:', error);
      Alert.alert('Error', 'Failed to load boost status');
    } finally {
      setLoading(false);
    }
  };

  const handleBoost = async () => {
    if (!isPremium) {
      Alert.alert(
        'Premium Required',
        'Boost Profile is a premium feature. Please upgrade to Premium to use this feature.',
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Upgrade',
            onPress: () => navigation.navigate('SubscriptionUpsell'),
          },
        ]
      );
      return;
    }

    if (boostStatus?.hasActiveBoost) {
      Alert.alert(
        'Boost Active',
        `You already have an active boost! It will expire in ${boostStatus.boost.timeRemaining} minutes.`
      );
      return;
    }

    Alert.alert(
      'Boost Your Profile',
      'Boost your profile for 30 minutes to get 10x more visibility! Your profile will appear at the top of discovery feeds.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Boost Now',
          onPress: async () => {
            try {
              setBoosting(true);
              const response = await createBoost(30);
              if (response?.success) {
                Alert.alert('Success', 'Your profile has been boosted! 🚀', [
                  {text: 'OK', onPress: () => loadBoostStatus()},
                ]);
              } else {
                throw new Error(response?.error || 'Failed to boost profile');
              }
            } catch (error) {
              if (error.message?.includes('premium')) {
                Alert.alert(
                  'Premium Required',
                  'Boost Profile is only available for premium users.',
                  [
                    {text: 'Cancel', style: 'cancel'},
                    {
                      text: 'Upgrade',
                      onPress: () => navigation.navigate('SubscriptionUpsell'),
                    },
                  ]
                );
              } else if (error.message?.includes('already have an active boost')) {
                Alert.alert('Boost Active', 'You already have an active boost!');
                loadBoostStatus();
              } else {
                Alert.alert('Error', error?.message || 'Failed to boost profile');
              }
            } finally {
              setBoosting(false);
            }
          },
        },
      ]
    );
  };

  const formatTimeRemaining = (minutes) => {
    if (minutes <= 0) return 'Expired';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>←</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Boost Profile</Text>
          <View style={{width: 40}} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Boost Profile</Text>
        <View style={{width: 40}} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {paddingBottom: insets.bottom + spacing.lg},
        ]}>
        {/* Boost Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>🚀</Text>
          <Text style={styles.infoTitle}>Get 10x More Visibility</Text>
          <Text style={styles.infoText}>
            Boost your profile to appear at the top of discovery feeds for 30 minutes. Get more likes, matches, and conversations!
          </Text>
        </View>

        {/* Active Boost Status */}
        {boostStatus?.hasActiveBoost && boostStatus.boost && (
          <View style={styles.activeBoostCard}>
            <View style={styles.activeBoostHeader}>
              <Text style={styles.activeBoostIcon}>✨</Text>
              <View style={styles.activeBoostContent}>
                <Text style={styles.activeBoostTitle}>Boost Active!</Text>
                <Text style={styles.activeBoostTime}>
                  {formatTimeRemaining(boostStatus.boost.timeRemaining)} remaining
                </Text>
              </View>
            </View>
            <View style={styles.activeBoostBar}>
              <View
                style={[
                  styles.activeBoostProgress,
                  {
                    width: `${Math.min(
                      100,
                      (boostStatus.boost.timeRemaining / boostStatus.boost.duration) * 100
                    )}%`,
                  },
                ]}
              />
            </View>
          </View>
        )}

        {/* Premium Check */}
        {!isPremium ? (
          <View style={styles.premiumRequiredCard}>
            <Text style={styles.premiumRequiredIcon}>💎</Text>
            <Text style={styles.premiumRequiredTitle}>Premium Required</Text>
            <Text style={styles.premiumRequiredText}>
              Boost Profile is a premium feature. Upgrade to Premium to boost your profile and get more visibility!
            </Text>
            <Pressable
              style={styles.upgradeButton}
              onPress={() => navigation.navigate('SubscriptionUpsell')}>
              <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={[styles.boostButton, boosting && styles.boostButtonDisabled]}
            onPress={handleBoost}
            disabled={boosting || boostStatus?.hasActiveBoost}>
            {boosting ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <>
                <Text style={styles.boostButtonIcon}>🚀</Text>
                <Text style={styles.boostButtonText}>
                  {boostStatus?.hasActiveBoost ? 'Boost Active' : 'Boost My Profile'}
                </Text>
              </>
            )}
          </Pressable>
        )}

        {/* Benefits List */}
        <View style={styles.benefitsCard}>
          <Text style={styles.benefitsTitle}>Boost Benefits</Text>
          <View style={styles.benefitItem}>
            <Text style={styles.benefitIcon}>⭐</Text>
            <Text style={styles.benefitText}>
              Appear at the top of discovery feeds
            </Text>
          </View>
          <View style={styles.benefitItem}>
            <Text style={styles.benefitIcon}>👀</Text>
            <Text style={styles.benefitText}>
              Get 10x more profile views
            </Text>
          </View>
          <View style={styles.benefitItem}>
            <Text style={styles.benefitIcon}>❤️</Text>
            <Text style={styles.benefitText}>
              Receive more likes and matches
            </Text>
          </View>
          <View style={styles.benefitItem}>
            <Text style={styles.benefitIcon}>💬</Text>
            <Text style={styles.benefitText}>
              Start more conversations
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.background,
  },
  backButton: {
    padding: spacing.xs,
  },
  backText: {
    fontSize: 24,
    color: colors.primary,
  },
  headerTitle: {
    fontSize: typography.headings.h4,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: spacing.lg,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  infoIcon: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  infoTitle: {
    fontSize: typography.headings.h3,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  infoText: {
    fontSize: typography.body.medium,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  activeBoostCard: {
    backgroundColor: colors.primary + '15',
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  activeBoostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  activeBoostIcon: {
    fontSize: 32,
    marginRight: spacing.md,
  },
  activeBoostContent: {
    flex: 1,
  },
  activeBoostTitle: {
    fontSize: typography.headings.h4,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  activeBoostTime: {
    fontSize: typography.body.medium,
    fontFamily: typography.fontFamilyMedium,
    color: colors.primary,
  },
  activeBoostBar: {
    height: 6,
    backgroundColor: colors.borderLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  activeBoostProgress: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  premiumRequiredCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  premiumRequiredIcon: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  premiumRequiredTitle: {
    fontSize: typography.headings.h4,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  premiumRequiredText: {
    fontSize: typography.body.medium,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 22,
  },
  upgradeButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 12,
  },
  upgradeButtonText: {
    color: colors.surface,
    fontFamily: typography.fontFamilyBold,
    fontSize: typography.body.large,
  },
  boostButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: spacing.lg,
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  boostButtonDisabled: {
    opacity: 0.6,
  },
  boostButtonIcon: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  boostButtonText: {
    color: colors.surface,
    fontFamily: typography.fontFamilyBold,
    fontSize: typography.headings.h4,
  },
  benefitsCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  benefitsTitle: {
    fontSize: typography.headings.h4,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  benefitIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  benefitText: {
    flex: 1,
    fontSize: typography.body.medium,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textPrimary,
  },
});

export default BoostProfileScreen;

