import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
  StatusBar,
  Dimensions,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {StripeProvider, useStripe} from '@stripe/stripe-react-native';
import LinearGradient from 'react-native-linear-gradient';
import {AppRoute} from '../../../constants/routes';
import {colors, typography, spacing} from '../../../theme';
import {
  getAvailablePlans,
  createPaymentOrder,
  verifyPaymentAndCreateSubscription,
  getSubscriptionStatus,
} from '../../../services/subscription/subscriptionService';
import { useAuth } from '../../../context/AuthContext';

const {width} = Dimensions.get('window');

const SubscriptionUpsellScreenContent = () => {
  const navigation = useNavigation();
  const stripe = useStripe();
  const { pendingIntent, setPendingIntent } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentSubscription, setCurrentSubscription] = useState(null);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const userId = await loadUserId();
      if (userId) {
        await Promise.all([loadPlans(), loadSubscriptionStatus(userId)]);
      }
      setLoading(false);
    };
    init();
  }, []);

  const loadUserId = async () => {
    try {
      const userData = await AsyncStorage.getItem('@pryvo_user');
      if (userData && userData !== 'undefined') {
        const user = JSON.parse(userData);
        setCurrentUserId(user.id);
        return user.id;
      }
    } catch (error) {
      console.error('Error loading user ID:', error);
    }
    return null;
  };

  const loadSubscriptionStatus = async userId => {
    try {
      const response = await getSubscriptionStatus(userId);
      if (response?.success && response?.subscription) {
        setCurrentSubscription(response.subscription);
      }
    } catch (error) {
      console.error('Error loading subscription status:', error);
    }
  };

  const loadPlans = async () => {
    try {
      const response = await getAvailablePlans();
      if (response?.success && response?.plans) {
        setPlans(response.plans);
        // Default select the popular plan or first one
        const popularPlan = response.plans.find(p => p.popular);
        if (popularPlan) setSelectedPlan(popularPlan.id);
      }
    } catch (error) {
      console.error('Error loading plans:', error);
    }
  };

  const features = [
    {
      icon: '🔥',
      title: 'Unlimited Likes',
      desc: 'Send as many likes as you want, no limits.',
    },
    {
      icon: '👀',
      title: 'See Who Liked You',
      desc: 'Check out the people who already swiped right on you.',
    },
    {
      icon: '📍',
      title: 'Advanced Filters',
      desc: 'Filter by height, education, and lifestyle choices.',
    },
    {
      icon: '⚡',
      title: 'Priority Matching',
      desc: 'Get seen by 3x more people in your area.',
    },
  ];

  const handleCheckout = async () => {
    if (!selectedPlan || !currentUserId) {
      Alert.alert('Error', 'Please select a plan');
      return;
    }

    if (!stripe) {
      Alert.alert('Error', 'Payment system is initializing. Please wait.');
      return;
    }

    try {
      setProcessing(true);

      // Step 1: Create payment order
      const orderResponse = await createPaymentOrder(
        currentUserId,
        selectedPlan,
      );

      if (!orderResponse?.success || !orderResponse?.paymentOrder) {
        throw new Error(
          orderResponse?.message || 'Failed to create payment order',
        );
      }

      const {paymentOrder, plan} = orderResponse;

      // If it's an upgrade, show confirmation first
      if (plan.isUpgrade) {
        const confirmed = await new Promise(resolve => {
          Alert.alert(
            'Confirm Upgrade',
            `You are upgrading to ${
              plan.name
            }.\n\nYou'll get a credit of $${plan.upgradeCredit.toFixed(
              2,
            )} for your current plan.\n\nFinal Price: $${plan.proRatedPrice.toFixed(
              2,
            )}`,
            [
              {text: 'Cancel', onPress: () => resolve(false), style: 'cancel'},
              {text: 'Proceed', onPress: () => resolve(true)},
            ],
          );
        });

        if (!confirmed) {
          setProcessing(false);
          return;
        }
      }

      // Step 2: Handle Stripe Payment Sheet
      const {error: initError} = await stripe.initPaymentSheet({
        paymentIntentClientSecret: paymentOrder.clientSecret,
        merchantDisplayName: 'Pryvo Premium',
        appearance: {
          colors: {
            primary: colors.primary,
          },
        },
      });

      if (initError) throw new Error(initError.message);

      const {error: presentError} = await stripe.presentPaymentSheet();

      if (presentError) {
        if (presentError.code === 'Canceled') {
          setProcessing(false);
          return;
        }
        throw new Error(presentError.message);
      }

      // Step 3: Verify and finalize
      const verifyResponse = await verifyPaymentAndCreateSubscription(
        currentUserId,
        selectedPlan,
        paymentOrder.orderId,
        paymentOrder.orderId,
        '',
        'stripe',
        paymentOrder.currency || 'USD',
        true,
      );

      if (verifyResponse?.success) {
        // 🎯 Post-Purchase Redirect Logic
        const handlePostPurchaseNav = () => {
            if (pendingIntent?.type === 'profile_view' && pendingIntent?.userId) {
                const targetId = pendingIntent.userId;
                setPendingIntent(null); // Clear first to avoid loops
                navigation.replace('UserProfileView', { userId: targetId });
                return;
            }
            // Standard fallback
            setPendingIntent(null);
            navigation.navigate(AppRoute.HomeTabs);
        };

        Alert.alert(
          'Congratulations!',
          plan.isUpgrade
            ? 'Your subscription has been upgraded successfully!'
            : 'You are now a Premium subscriber!',
          [
            {
              text: 'Great!',
              onPress: handlePostPurchaseNav,
            },
          ],
        );
      } else {
        throw new Error(verifyResponse?.message || 'Verification failed');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      Alert.alert('Payment Error', error.message || 'Something went wrong');
    } finally {
      setProcessing(false);
    }
  };

  const calculateProRatedPrice = plan => {
    if (!currentSubscription) return plan.price;

    const currentPlan = plans.find(p => p.id === currentSubscription.planId);
    if (!currentPlan) return plan.price;

    // Check if new plan is higher rank
    if (plan.rank > currentPlan.rank) {
      const now = new Date();
      const expiresAt = new Date(currentSubscription.expiresAt);
      const remainingTime = expiresAt - now;
      const remainingDays = Math.max(
        0,
        Math.ceil(remainingTime / (1000 * 60 * 60 * 24)),
      );

      // Credit = (remaining days / total days) * original price
      const credit =
        (remainingDays / (currentPlan.duration || 30)) * currentPlan.price;
      const finalPrice = Math.max(0, plan.price - credit);
      return Math.round(finalPrice * 100) / 100;
    }

    return plan.price;
  };

  const renderCurrentSubscription = () => {
    if (!currentSubscription) return null;

    const currentPlan = plans.find(p => p.id === currentSubscription.planId);
    return (
      <View style={styles.currentSubCard}>
        <View style={styles.currentSubHeader}>
          <Text style={styles.currentSubTitle}>Current Plan</Text>
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>ACTIVE</Text>
          </View>
        </View>
        <Text style={styles.currentSubName}>
          {currentSubscription.planName || 'Premium Subscriber'}
        </Text>
        <Text style={styles.currentSubExpiry}>
          Renews/Expires:{' '}
          {new Date(currentSubscription.expiresAt).toLocaleDateString()}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Tailoring your experience...</Text>
      </View>
    );
  }

  const selectedPlanData = plans.find(p => p.id === selectedPlan);
  const displayPrice = selectedPlanData
    ? calculateProRatedPrice(selectedPlanData)
    : '0.00';
  const isSelectedUpgrade =
    selectedPlanData &&
    currentSubscription &&
    selectedPlanData.rank >
      (plans.find(p => p.id === currentSubscription.planId)?.rank || 0);

  return (
    <View style={styles.mainContainer}>
      <StatusBar
        barStyle="light-content"
        transparent
        backgroundColor="transparent"
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        <LinearGradient
          colors={[colors.primary, '#9B51E0']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={styles.heroHeader}>
          <View style={styles.headerTop}>
            <Pressable
              onPress={() => navigation.goBack()}
              style={styles.backButton}>
              <Text style={styles.backButtonText}>✕</Text>
            </Pressable>
            <Pressable 
              onPress={() => navigation.navigate(AppRoute.HomeTabs)}
              style={styles.skipButtonHero}
            >
              <Text style={styles.skipTextHero}>Skip</Text>
            </Pressable>
          </View>
          <Text style={styles.heroEmoji}>💎</Text>
          <Text style={styles.heroTitle}>Upgrade to Pryvo Premium</Text>
          <Text style={styles.heroSubtitle}>
            Unlock all features and find your match faster
          </Text>
        </LinearGradient>

        <View style={styles.content}>
          {renderCurrentSubscription()}

          <View
            style={[
              styles.section,
              {marginTop: currentSubscription ? spacing.lg : -spacing.xl},
            ]}>
            <Text style={styles.sectionTitle}>Pick a Plan</Text>
            <View style={styles.plansList}>
              {plans.map(plan => {
                const isCurrent = currentSubscription?.planId === plan.id;
                const isSelected = selectedPlan === plan.id;
                const proRated = calculateProRatedPrice(plan);
                const hasDiscount = proRated < plan.price;

                const currentPlan = plans.find(
                  p => p.id === currentSubscription?.planId,
                );
                const isDowngrade =
                  currentSubscription && plan.rank < (currentPlan?.rank || 0);
                const isSameTier = isCurrent;

                return (
                  <Pressable
                    key={plan.id}
                    disabled={isCurrent || isDowngrade}
                    onPress={() => setSelectedPlan(plan.id)}
                    style={[
                      styles.planCard,
                      isSelected && styles.planCardSelected,
                      (isCurrent || isDowngrade) && styles.planCardDisabled,
                      plan.popular &&
                        !isCurrent &&
                        !isDowngrade &&
                        styles.planCardPopular,
                    ]}>
                    <View style={styles.planInfo}>
                      <View style={styles.planLabelRow}>
                        <Text style={styles.planLabel}>{plan.name}</Text>
                        {isDowngrade && (
                          <View style={styles.downgradeBadge}>
                            <Text style={styles.downgradeBadgeText}>
                              LOCKED
                            </Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.priceRow}>
                        {hasDiscount && (
                          <Text style={styles.originalPriceStrikethrough}>
                            ${plan.price}
                          </Text>
                        )}
                        <Text style={styles.planCost}>
                          ${proRated.toFixed(2)}/
                          <Text style={styles.planPeriod}>{plan.period}</Text>
                        </Text>
                      </View>
                      {isCurrent && (
                        <Text style={styles.currentSubLabel}>Current Plan</Text>
                      )}
                    </View>

                    {plan.popular && !isCurrent && (
                      <View style={styles.popularTag}>
                        <Text style={styles.popularTagText}>MOST POPULAR</Text>
                      </View>
                    )}

                    {plan.savings && !isCurrent && (
                      <View style={styles.savingsTag}>
                        <Text style={styles.savingsTagText}>
                          {plan.savings}
                        </Text>
                      </View>
                    )}

                    {isSelected && !isCurrent && (
                      <View style={styles.selectionDot}>
                        <View style={styles.selectionDotInner} />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.featuresSection}>
            <Text style={styles.sectionTitle}>Premium Features</Text>
            {features.map((f, i) => (
              <View key={i} style={styles.featureRow}>
                <View style={styles.featureIconContainer}>
                  <Text style={styles.featureIcon}>{f.icon}</Text>
                </View>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>{f.title}</Text>
                  <Text style={styles.featureDesc}>{f.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.priceContainer}>
          <Text style={styles.totalLabel}>Total to pay:</Text>
          <Text style={styles.totalPrice}>${displayPrice}</Text>
        </View>

        <Pressable
          style={[styles.payButton, processing && styles.payButtonDisabled]}
          onPress={handleCheckout}
          disabled={processing || !selectedPlan}>
          {processing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.payButtonText}>
              {isSelectedUpgrade
                ? 'Upgrade Now'
                : currentSubscription
                ? 'Extend Plan'
                : 'Join Premium'}
            </Text>
          )}
        </Pressable>
        <Text style={styles.footerSecureText}>
          🔒 Secure payment via Stripe
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 140,
  },
  heroHeader: {
    paddingTop: spacing.xxl + 20,
    paddingBottom: spacing.xxl + 40,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: spacing.sm,
    position: 'absolute',
    top: spacing.xl + 20,
    zIndex: 10,
  },
  skipButtonHero: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
  },
  skipTextHero: {
    fontFamily: typography.fontFamilyBold,
    fontSize: typography.body.medium,
    color: '#fff',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  heroEmoji: {
    fontSize: 60,
    marginBottom: spacing.md,
  },
  heroTitle: {
    fontSize: typography.headings.h2,
    fontFamily: typography.fontFamilyBold,
    color: '#fff',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  heroSubtitle: {
    fontSize: typography.body.medium,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    maxWidth: '80%',
  },
  content: {
    paddingHorizontal: spacing.lg,
  },
  currentSubCard: {
    backgroundColor: colors.secondary,
    borderRadius: 20,
    padding: spacing.lg,
    marginTop: -40,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  currentSubHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  currentSubTitle: {
    fontSize: typography.caption,
    fontFamily: typography.fontFamilyBold,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  activeBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  activeBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  currentSubName: {
    fontSize: typography.headings.h4,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
  },
  currentSubExpiry: {
    fontSize: typography.body.small,
    color: colors.textSecondary,
    marginTop: 2,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.body.large,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  plansList: {
    gap: spacing.md,
  },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.border,
    position: 'relative',
    overflow: 'hidden',
  },
  planCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.backgroundSecondary,
  },
  planCardPopular: {
    borderColor: 'rgba(254, 60, 114, 0.3)',
  },
  planCardDisabled: {
    opacity: 0.6,
    backgroundColor: colors.backgroundSecondary,
    borderColor: colors.border,
  },
  planInfo: {
    flex: 1,
  },
  planLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 4,
  },
  planLabel: {
    fontSize: typography.body.medium,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
  },
  downgradeBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  downgradeBadgeText: {
    fontSize: 8,
    fontFamily: typography.fontFamilyBold,
    color: '#9CA3AF',
  },
  planCost: {
    fontSize: typography.body.large,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  originalPriceStrikethrough: {
    fontSize: typography.body.small,
    color: colors.textTertiary,
    textDecorationLine: 'line-through',
    marginRight: spacing.xs,
  },
  planPeriod: {
    fontSize: typography.body.small,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textSecondary,
  },
  currentSubLabel: {
    fontSize: 11,
    color: colors.success,
    fontWeight: 'bold',
    marginTop: 4,
  },
  popularTag: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderBottomLeftRadius: 12,
  },
  popularTagText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  savingsTag: {
    backgroundColor: colors.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: spacing.sm,
  },
  savingsTagText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  selectionDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionDotInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  featuresSection: {
    paddingTop: spacing.lg,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  featureIcon: {
    fontSize: 24,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: typography.body.medium,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
  },
  featureDesc: {
    fontSize: typography.body.small,
    color: colors.textSecondary,
    marginTop: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: spacing.xl + 10,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  totalLabel: {
    fontSize: typography.body.medium,
    color: colors.textSecondary,
  },
  totalPrice: {
    fontSize: typography.headings.h3,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
  },
  payButton: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  payButtonDisabled: {
    backgroundColor: colors.textTertiary,
    elevation: 0,
    shadowOpacity: 0,
  },
  payButtonText: {
    color: '#fff',
    fontSize: typography.button,
    fontFamily: typography.fontFamilyBold,
  },
  secureText: {
    textAlign: 'center',
    fontSize: 10,
    color: colors.textTertiary,
    marginTop: spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.body.medium,
    color: colors.textSecondary,
  },
});

const SubscriptionUpsellScreen = () => {
  const [publishableKey, setPublishableKey] = useState(null);

  useEffect(() => {
    const fetchStripeKey = async () => {
      // For now using the mock/test key, but ideally this comes from backend config
      setPublishableKey(
        'pk_test_51RNq3aQ0qRbELDrXrWQtGUARFShAyk2osAsJOFT9Cj2lvamEsGnRqqHdrwKhkMHFkqmt2OqeX91FDQfPdWK4FHSH00Xi0LTJft',
      );
    };
    fetchStripeKey();
  }, []);

  if (!publishableKey) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <StripeProvider publishableKey={publishableKey}>
      <SubscriptionUpsellScreenContent />
    </StripeProvider>
  );
};

export default SubscriptionUpsellScreen;
