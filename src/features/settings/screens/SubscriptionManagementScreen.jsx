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
  StatusBar,
} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';
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
      if (userData && userData !== 'undefined') {
        const user = JSON.parse(userData);
        setCurrentUserId(user.id);

        const [statusResponse, historyResponse] = await Promise.all([
          getSubscriptionStatus(user.id).catch(() => null),
          getUserSubscriptions(user.id).catch(() => ({subscriptions: []})),
        ]);

        if (statusResponse?.success) {
          setIsPremium(statusResponse.isPremium);
          setSubscription(statusResponse.subscription);
        }

        setAllSubscriptions(historyResponse?.subscriptions || []);
      } else {
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error loading subscription data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = () => {
    if (!subscription) return;

    Alert.alert(
      'Cancel Subscription',
      'Your Premium benefits will remain active until the end of your current period. Are you sure?',
      [
        {text: 'Keep Premium', style: 'cancel'},
        {
          text: 'Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await cancelSubscription(
                subscription.id,
                currentUserId,
              );
              if (response?.success) {
                Alert.alert('Success', 'Auto-renewal has been cancelled.');
                loadSubscriptionData();
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel subscription');
            }
          },
        },
      ],
    );
  };

  const handleToggleAutoRenew = async enabled => {
    if (!subscription) return;
    try {
      const response = await setAutoRenewal(subscription.id, enabled);
      if (response?.success) {
        setSubscription({...subscription, autoRenew: enabled});
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update auto-renewal');
    }
  };

  const formatDate = dateString => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusConfig = status => {
    switch (status) {
      case 'active':
        return {color: colors.success, label: 'Active'};
      case 'cancelled':
        return {color: colors.warning, label: 'Cancelled'};
      case 'expired':
        return {color: colors.textTertiary, label: 'Expired'};
      default:
        return {
          color: colors.textSecondary,
          label: status?.toUpperCase() || 'Unknown',
        };
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.backButton}>
            <Text style={styles.backButtonText}>✕</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Subscription</Text>
          <View style={{width: 40}} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {!isPremium ? (
            <View style={styles.noSubSection}>
              <LinearGradient
                colors={[colors.primary, '#9B51E0']}
                style={styles.upsellCard}>
                <Text style={styles.upsellEmoji}>💎</Text>
                <Text style={styles.upsellTitle}>Unlock Pryvo Premium</Text>
                <Text style={styles.upsellText}>
                  Get unlimited likes, see who likes you, and 3x more matches!
                </Text>
                <Pressable
                  style={styles.upsellButton}
                  onPress={() => navigation.navigate('SubscriptionUpsell')}>
                  <Text style={styles.upsellButtonText}>View Plans</Text>
                </Pressable>
              </LinearGradient>
            </View>
          ) : (
            <View style={styles.activeSubSection}>
              <View style={styles.activeCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.planName}>
                    {subscription?.planName || 'Premium'}
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          getStatusConfig(subscription?.status).color + '20',
                      },
                    ]}>
                    <Text
                      style={[
                        styles.statusBadgeText,
                        {color: getStatusConfig(subscription?.status).color},
                      ]}>
                      {getStatusConfig(subscription?.status).label}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailsList}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Expiry Date</Text>
                    <Text style={styles.detailValue}>
                      {formatDate(subscription?.expiresAt)}
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Price Paid</Text>
                    <Text style={styles.detailValue}>
                      {subscription?.price} {subscription?.currency || 'USD'}
                    </Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.row}>
                  <View style={styles.autoRenewInfo}>
                    <Text style={styles.autoRenewTitle}>Auto-Renewal</Text>
                    <Text style={styles.autoRenewDesc}>
                      Keep your benefits uninterrupted
                    </Text>
                  </View>
                  <Switch
                    value={subscription?.autoRenew !== false}
                    onValueChange={handleToggleAutoRenew}
                    trackColor={{false: '#D1D1D1', true: colors.primary}}
                  />
                </View>
              </View>

              <View style={styles.actionButtons}>
                <Pressable
                  style={styles.upgradeBtn}
                  onPress={() => navigation.navigate('SubscriptionUpsell')}>
                  <Text style={styles.upgradeBtnText}>⭐ Upgrade Plan</Text>
                </Pressable>

                {subscription?.status === 'active' && (
                  <Pressable
                    style={styles.cancelBtn}
                    onPress={handleCancelSubscription}>
                    <Text style={styles.cancelBtnText}>Cancel Renewal</Text>
                  </Pressable>
                )}
              </View>
            </View>
          )}

          {allSubscriptions.length > 0 && (
            <View style={styles.historySection}>
              <Text style={styles.sectionTitle}>Billing History</Text>
              {allSubscriptions.map((sub, idx) => (
                <View key={sub.id || idx} style={styles.historyCard}>
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyName}>
                      {sub.planName || 'Premium'}
                    </Text>
                    <Text style={styles.historyDate}>
                      {formatDate(sub.createdAt)}
                    </Text>
                  </View>
                  <View style={styles.historyPrice}>
                    <Text style={styles.historyAmount}>
                      {sub.price} {sub.currency || 'USD'}
                    </Text>
                    <Text
                      style={[
                        styles.historyStatus,
                        {color: getStatusConfig(sub.status).color},
                      ]}>
                      {getStatusConfig(sub.status).label}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  headerTitle: {
    fontSize: typography.headings.h4,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  noSubSection: {
    marginBottom: spacing.xl,
  },
  upsellCard: {
    padding: spacing.xl,
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  upsellEmoji: {
    fontSize: 50,
    marginBottom: spacing.md,
  },
  upsellTitle: {
    fontSize: typography.headings.h3,
    fontFamily: typography.fontFamilyBold,
    color: '#fff',
    marginBottom: spacing.xs,
  },
  upsellText: {
    fontSize: typography.body.medium,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  upsellButton: {
    backgroundColor: '#fff',
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: 20,
  },
  upsellButtonText: {
    color: colors.primary,
    fontFamily: typography.fontFamilyBold,
    fontSize: typography.body.large,
  },
  activeSubSection: {
    marginBottom: spacing.xl,
  },
  activeCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  planName: {
    fontSize: typography.headings.h3,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  detailsList: {
    marginBottom: spacing.xl,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  detailLabel: {
    fontSize: typography.body.medium,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: typography.body.medium,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  autoRenewInfo: {
    flex: 1,
  },
  autoRenewTitle: {
    fontSize: typography.body.large,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
  },
  autoRenewDesc: {
    fontSize: typography.body.small,
    color: colors.textSecondary,
    marginTop: 2,
  },
  actionButtons: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  upgradeBtn: {
    backgroundColor: colors.primary,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  upgradeBtnText: {
    color: '#fff',
    fontSize: typography.button,
    fontFamily: typography.fontFamilyBold,
  },
  cancelBtn: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelBtnText: {
    color: colors.textSecondary,
    fontSize: typography.body.medium,
    fontFamily: typography.fontFamilyMedium,
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
  historyCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: spacing.lg,
    borderRadius: 16,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  historyInfo: {
    flex: 1,
  },
  historyName: {
    fontSize: typography.body.medium,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
  },
  historyDate: {
    fontSize: typography.body.small,
    color: colors.textSecondary,
    marginTop: 2,
  },
  historyPrice: {
    alignItems: 'flex-end',
  },
  historyAmount: {
    fontSize: typography.body.medium,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
  },
  historyStatus: {
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 2,
    textTransform: 'uppercase',
  },
});

export default SubscriptionManagementScreen;
