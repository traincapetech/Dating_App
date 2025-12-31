import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {colors, typography, spacing} from '../../../theme';
import {
  getSubscriptionStatus,
  getUserSubscriptions,
  cancelSubscription,
  setAutoRenewal,
} from '../../../services/subscription/subscriptionService';

const SubscriptionManagementScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [allSubscriptions, setAllSubscriptions] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  const loadSubscriptionData = async () => {
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

      // Get current subscription status
      const statusResponse = await getSubscriptionStatus(user.id);
      if (statusResponse?.success) {
        setIsPremium(statusResponse.isPremium);
        setSubscription(statusResponse.subscription);
      }

      // Get all subscriptions history
      const subscriptionsResponse = await getUserSubscriptions(user.id);
      if (subscriptionsResponse?.success) {
        setAllSubscriptions(subscriptionsResponse.subscriptions || []);
      }
    } catch (error) {
      console.error('Error loading subscription data:', error);
      Alert.alert('Error', 'Failed to load subscription information');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = () => {
    if (!subscription) {
      Alert.alert('No Subscription', 'You do not have an active subscription');
      return;
    }

    Alert.alert(
      'Cancel Subscription',
      subscription.autoRenew
        ? 'Your subscription will remain active until the end of the current billing period, but will not renew automatically.'
        : 'Are you sure you want to cancel your subscription?',
      [
        {text: 'Keep Subscription', style: 'cancel'},
        {
          text: 'Cancel Subscription',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await cancelSubscription(subscription.id, currentUserId);
              if (response?.success) {
                Alert.alert('Success', 'Subscription cancelled successfully', [
                  {text: 'OK', onPress: () => loadSubscriptionData()},
                ]);
              } else {
                throw new Error(response?.message || 'Failed to cancel subscription');
              }
            } catch (error) {
              Alert.alert('Error', error?.message || 'Failed to cancel subscription');
            }
          },
        },
      ]
    );
  };

  const handleToggleAutoRenew = async (enabled) => {
    if (!subscription) return;

    try {
      const response = await setAutoRenewal(subscription.id, enabled);

      if (response?.success) {
        setSubscription({...subscription, autoRenew: enabled});
        Alert.alert(
          'Success',
          `Auto-renewal ${enabled ? 'enabled' : 'disabled'} successfully`
        );
      } else {
        throw new Error('Failed to update auto-renewal');
      }
    } catch (error) {
      Alert.alert('Error', error?.message || 'Failed to update auto-renewal settings');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return colors.success || '#4CAF50';
      case 'cancelled':
        return colors.error || '#FF3B30';
      case 'expired':
        return colors.textSecondary || '#999';
      case 'refunded':
        return '#FF9800';
      default:
        return colors.textSecondary;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>←</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Manage Subscription</Text>
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
        <Text style={styles.headerTitle}>Manage Subscription</Text>
        <View style={{width: 40}} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {paddingBottom: insets.bottom + spacing.lg},
        ]}>
        {!isPremium && !subscription ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>💎</Text>
            <Text style={styles.emptyStateTitle}>No Active Subscription</Text>
            <Text style={styles.emptyStateText}>
              Upgrade to Premium to unlock all features and get unlimited likes!
            </Text>
            <Pressable
              style={styles.upgradeButton}
              onPress={() => navigation.navigate('SubscriptionUpsell')}>
              <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Current Subscription */}
            {subscription && (
              <View style={styles.currentSubscription}>
                <View style={styles.subscriptionHeader}>
                  <View>
                    <Text style={styles.subscriptionTitle}>
                      {subscription.planName || 'Premium Subscription'}
                    </Text>
                    <View style={styles.statusBadge}>
                      <View
                        style={[
                          styles.statusDot,
                          {backgroundColor: getStatusColor(subscription.status)},
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusText,
                          {color: getStatusColor(subscription.status)},
                        ]}>
                        {subscription.status?.toUpperCase() || 'ACTIVE'}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.subscriptionDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Plan</Text>
                    <Text style={styles.detailValue}>
                      {subscription.planName || subscription.planId}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Price</Text>
                    <Text style={styles.detailValue}>
                      ₹{subscription.price || 0} {subscription.currency || 'INR'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Expires On</Text>
                    <Text style={styles.detailValue}>
                      {formatDate(subscription.expiresAt)}
                    </Text>
                  </View>
                  {subscription.createdAt && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Started On</Text>
                      <Text style={styles.detailValue}>
                        {formatDate(subscription.createdAt)}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Auto-Renewal Toggle */}
                {subscription.status === 'active' && (
                  <View style={styles.autoRenewContainer}>
                    <View style={styles.autoRenewContent}>
                      <Text style={styles.autoRenewTitle}>Auto-Renewal</Text>
                      <Text style={styles.autoRenewDescription}>
                        Automatically renew your subscription when it expires
                      </Text>
                    </View>
                    <Switch
                      value={subscription.autoRenew !== false}
                      onValueChange={handleToggleAutoRenew}
                      trackColor={{false: colors.borderLight, true: colors.primary}}
                      thumbColor={colors.surface}
                    />
                  </View>
                )}

                {/* Cancel Button */}
                {subscription.status === 'active' && (
                  <Pressable
                    style={styles.cancelButton}
                    onPress={handleCancelSubscription}>
                    <Text style={styles.cancelButtonText}>Cancel Subscription</Text>
                  </Pressable>
                )}
              </View>
            )}

            {/* Subscription History */}
            {allSubscriptions.length > 0 && (
              <View style={styles.historySection}>
                <Text style={styles.sectionTitle}>Subscription History</Text>
                {allSubscriptions.map((sub, index) => (
                  <View key={sub.id || index} style={styles.historyItem}>
                    <View style={styles.historyHeader}>
                      <Text style={styles.historyPlan}>{sub.planName || sub.planId}</Text>
                      <View
                        style={[
                          styles.historyStatusBadge,
                          {backgroundColor: getStatusColor(sub.status) + '20'},
                        ]}>
                        <Text
                          style={[
                            styles.historyStatusText,
                            {color: getStatusColor(sub.status)},
                          ]}>
                          {sub.status?.toUpperCase() || 'UNKNOWN'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.historyDetails}>
                      <Text style={styles.historyDate}>
                        {formatDate(sub.createdAt)} - {formatDate(sub.expiresAt)}
                      </Text>
                      <Text style={styles.historyPrice}>
                        ₹{sub.price || 0} {sub.currency || 'INR'}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Upgrade CTA for expired subscriptions */}
            {subscription?.status === 'expired' && (
              <View style={styles.upgradeSection}>
                <Text style={styles.upgradeTitle}>Your subscription has expired</Text>
                <Text style={styles.upgradeText}>
                  Renew your Premium subscription to continue enjoying all features
                </Text>
                <Pressable
                  style={styles.upgradeButton}
                  onPress={() => navigation.navigate('SubscriptionUpsell')}>
                  <Text style={styles.upgradeButtonText}>Renew Subscription</Text>
                </Pressable>
              </View>
            )}
          </>
        )}
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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  emptyStateTitle: {
    fontSize: typography.headings.h3,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptyStateText: {
    fontSize: typography.body.medium,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
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
  currentSubscription: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  subscriptionHeader: {
    marginBottom: spacing.md,
  },
  subscriptionTitle: {
    fontSize: typography.headings.h3,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  statusText: {
    fontSize: typography.body.small,
    fontFamily: typography.fontFamilyBold,
  },
  subscriptionDetails: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  detailLabel: {
    fontSize: typography.body.medium,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: typography.body.medium,
    fontFamily: typography.fontFamilyMedium,
    color: colors.textPrimary,
  },
  autoRenewContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  autoRenewContent: {
    flex: 1,
    marginRight: spacing.md,
  },
  autoRenewTitle: {
    fontSize: typography.body.medium,
    fontFamily: typography.fontFamilyMedium,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  autoRenewDescription: {
    fontSize: typography.body.small,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textSecondary,
  },
  cancelButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.error || '#FF3B30',
    borderRadius: 12,
  },
  cancelButtonText: {
    color: colors.error || '#FF3B30',
    fontFamily: typography.fontFamilyMedium,
    fontSize: typography.body.medium,
  },
  historySection: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.body.large,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  historyItem: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  historyPlan: {
    fontSize: typography.body.medium,
    fontFamily: typography.fontFamilyMedium,
    color: colors.textPrimary,
  },
  historyStatusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
  },
  historyStatusText: {
    fontSize: typography.caption,
    fontFamily: typography.fontFamilyBold,
  },
  historyDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  historyDate: {
    fontSize: typography.body.small,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textSecondary,
  },
  historyPrice: {
    fontSize: typography.body.small,
    fontFamily: typography.fontFamilyMedium,
    color: colors.textPrimary,
  },
  upgradeSection: {
    backgroundColor: colors.secondary || '#F0F4FF',
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  upgradeTitle: {
    fontSize: typography.headings.h4,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  upgradeText: {
    fontSize: typography.body.medium,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
});

export default SubscriptionManagementScreen;

