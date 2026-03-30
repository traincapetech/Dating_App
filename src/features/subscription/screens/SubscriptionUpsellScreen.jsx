import React, {useState, useEffect, useRef} from 'react';
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
  Platform,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {StripeProvider, useStripe} from '@stripe/stripe-react-native';
import LinearGradient from 'react-native-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {AppRoute} from '../../../constants/routes';
import {colors, typography, spacing} from '../../../theme';
import {
  getAvailablePlans,
  createPaymentOrder,
  verifyPaymentAndCreateSubscription,
  getSubscriptionStatus,
} from '../../../services/subscription/subscriptionService';
import { Animated, Easing } from 'react-native';

const FULL_CARD_W = width * 0.75;
const SIDE_SCALE = 0.9;
const SIDE_OPACITY = 0.6;

const {width, height} = Dimensions.get('window');

// ─── Feature data ───────────────────────────────────────────────
const FEATURES = [
  {icon: '🔥', label: 'Unlimited Likes', sub: 'Swipe without restrictions'},
  {icon: '👀', label: 'See Who Liked You', sub: 'No more guessing games'},
  {icon: '📍', label: 'Advanced Filters', sub: 'Height, lifestyle & more'},
  {icon: '⚡', label: '3x Priority Boost', sub: 'Be seen by more people'},
];

// ─── Animated feature row ────────────────────────────────────────
const FeatureItem = ({icon, label, sub, delay}) => {
  const [anim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 600,
      delay,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.featureItem,
        {
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            },
            {
              scale: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.95, 1],
              }),
            },
          ],
        },
      ]}>
      <LinearGradient
        colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.05)']}
        style={styles.featureIconBubble}>
        <Text style={styles.featureIconText}>{icon}</Text>
      </LinearGradient>
      <View style={styles.featureTextGroup}>
        <Text style={styles.featureLabel}>{label}</Text>
        <Text style={styles.featureSub}>{sub}</Text>
      </View>
      <View style={styles.featureTick}>
        <LinearGradient
          colors={['#FF50CC', '#B040FF']}
          style={StyleSheet.absoluteFillObject}
        />
        <Text style={styles.featureTickText}>✓</Text>
      </View>
    </Animated.View>
  );
};

// ─── Plan Card (horizontal carousel item) ────────────────────────
const PlanCard = ({
  plan,
  isSelected,
  isCurrent,
  isDowngrade,
  proRated,
  onPress,
  scrollX,
  index,
}) => {
  const disabled = isCurrent || isDowngrade;

  const inputRange = [
    (index - 1) * FULL_CARD_W,
    index * FULL_CARD_W,
    (index + 1) * FULL_CARD_W,
  ];

  const scale = scrollX.interpolate({
    inputRange,
    outputRange: [SIDE_SCALE, 1.06, SIDE_SCALE],
    extrapolate: 'clamp',
  });

  const opacity = scrollX.interpolate({
    inputRange,
    outputRange: [SIDE_OPACITY, 1, SIDE_OPACITY],
    extrapolate: 'clamp',
  });

  const translateX = scrollX.interpolate({
    inputRange,
    outputRange: [60, 0, -60],
    extrapolate: 'clamp',
  });

  const rotateY = scrollX.interpolate({
    inputRange,
    outputRange: ['-30deg', '0deg', '30deg'],
    extrapolate: 'clamp',
  });

  const hasDiscount = proRated < plan.price;

  return (
    <Animated.View
      style={[
        styles.planCardWrap,
        {
          opacity,
          zIndex: isSelected ? 10 : 1,
          transform: [{perspective: 1000}, {scale}, {translateX}, {rotateY}],
        },
      ]}>
      <Pressable
        disabled={disabled}
        onPress={onPress}
        style={styles.planCardPressable}>
        <LinearGradient
          colors={
            isSelected && !isCurrent
              ? ['#FF00CC', '#3333FF'] // Vibrant electric gradient
              : isCurrent
              ? ['#00F260', '#0575E6'] // Fresh active look
              : ['rgba(255,255,255,0.22)', 'rgba(255,255,255,0.12)']
          }
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={[
            styles.planCard,
            disabled && {opacity: 0.5},
            isSelected && !isCurrent && styles.selectedPlanCard,
            isCurrent && styles.currentPlanCard,
          ]}>
          {/* Inner Highlight Overlay */}
          <LinearGradient
            colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0)']}
            style={styles.cardInnerShine}
          />

          {/* Popular / Savings badge */}
          {plan.popular && !isCurrent && (
            <View style={styles.planBadgeHot}>
              <Text style={styles.planBadgeText}>⚡ Most Popular</Text>
            </View>
          )}
          {plan.savings && !isCurrent && !plan.popular && (
            <View style={styles.planBadgeSave}>
              <Text style={styles.planBadgeText}>{plan.savings}</Text>
            </View>
          )}
          {isDowngrade && (
            <View style={styles.planBadgeLock}>
              <Text style={[styles.planBadgeText, {color: '#999'}]}>
                🔒 Locked
              </Text>
            </View>
          )}

          <View style={styles.planCardBody}>
            <Text
              style={[
                styles.planCardName,
                (isSelected || isCurrent) && {color: '#fff'},
              ]}>
              {plan.name}
            </Text>

            <View style={styles.planPriceBlock}>
              {hasDiscount && (
                <Text
                  style={[
                    styles.planOldPrice,
                    (isSelected || isCurrent) && {
                      color: 'rgba(255,255,255,0.55)',
                    },
                  ]}>
                  ${plan.price}
                </Text>
              )}
              <Text
                style={[
                  styles.planNewPrice,
                  (isSelected || isCurrent) && {color: '#fff'},
                ]}>
                ${proRated.toFixed(2)}
              </Text>
              <Text
                style={[
                  styles.planPer,
                  (isSelected || isCurrent) && {color: 'rgba(255,255,255,0.7)'},
                ]}>
                /{plan.period}
              </Text>
            </View>

            {isCurrent && (
              <View style={styles.currentPill}>
                <Text style={styles.currentPillText}>✓ Current Plan</Text>
              </View>
            )}

            {isSelected && !isCurrent && (
              <View style={styles.selectedPill}>
                <Text style={styles.selectedPillText}>Selected ✓</Text>
              </View>
            )}
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
};

// ─── Main content ────────────────────────────────────────────────
const SubscriptionUpsellScreenContent = () => {
  const navigation = useNavigation();
  const stripe = useStripe();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentSubscription, setCurrentSubscription] = useState(null);

  const [scrollX] = useState(() => new Animated.Value(0));
  const [heroAnim] = useState(() => new Animated.Value(0));
  const [auraPulse] = useState(() => new Animated.Value(0));
  const [floatAnim] = useState(() => new Animated.Value(0));
  const [ctaPulse] = useState(() => new Animated.Value(0));
  const [orbAnim] = useState(() => new Animated.Value(0));
  const [totalFloat] = useState(() => new Animated.Value(0));

  // Track button press states
  const [backPressScale] = useState(() => new Animated.Value(1));
  const [skipPressScale] = useState(() => new Animated.Value(1));

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const userId = await loadUserId();
      if (userId)
        await Promise.all([loadPlans(), loadSubscriptionStatus(userId)]);
      setLoading(false);
    };
    init();

    // Infinite Background Orb movement
    Animated.loop(
      Animated.sequence([
        Animated.timing(orbAnim, {
          toValue: 1,
          duration: 8000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(orbAnim, {
          toValue: 0,
          duration: 8000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // Total Floating animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(totalFloat, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(totalFloat, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // Infinite Micro-animations
    Animated.loop(
      Animated.sequence([
        Animated.timing(auraPulse, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(auraPulse, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 2500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(ctaPulse, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(ctaPulse, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  useEffect(() => {
    if (!loading) {
      Animated.timing(heroAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      }).start();
    }
  }, [loading]);

  const handlePressIn = scale => {
    Animated.timing(scale, {
      toValue: 0.95,
      duration: 150,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = scale => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 4,
      useNativeDriver: true,
    }).start();
  };

  const loadUserId = async () => {
    try {
      const userData = await AsyncStorage.getItem('@pryvo_user');
      if (userData && userData !== 'undefined') {
        const user = JSON.parse(userData);
        setCurrentUserId(user.id);
        return user.id;
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  };

  const loadSubscriptionStatus = async userId => {
    try {
      const response = await getSubscriptionStatus(userId);
      if (response?.success && response?.subscription)
        setCurrentSubscription(response.subscription);
    } catch (e) {
      console.error(e);
    }
  };

  const loadPlans = async () => {
    try {
      const response = await getAvailablePlans();
      if (response?.success && response?.plans) {
        setPlans(response.plans);
        const popular = response.plans.find(p => p.popular);
        if (popular) setSelectedPlan(popular.id);
      }
    } catch (e) {
      console.error(e);
    }
  };



  const handleCheckout = async () => {
    if (!selectedPlan || !currentUserId) {
      Alert.alert('Error', 'Please select a plan');
      return;
    }
    if (!stripe) {
      Alert.alert('Error', 'Payment system is initializing.');
      return;
    }
    try {
      setProcessing(true);
      const orderResponse = await createPaymentOrder(
        currentUserId,
        selectedPlan,
      );
      if (!orderResponse?.success || !orderResponse?.paymentOrder)
        throw new Error(
          orderResponse?.message || 'Failed to create payment order',
        );

      const {paymentOrder, plan} = orderResponse;
      if (plan.isUpgrade) {
        const confirmed = await new Promise(resolve =>
          Alert.alert(
            'Confirm Upgrade',
            `Upgrading to ${
              plan.name
            }.\n\nCredit: $${plan.upgradeCredit.toFixed(
              2,
            )}\nFinal: $${plan.proRatedPrice.toFixed(2)}`,
            [
              {text: 'Cancel', onPress: () => resolve(false), style: 'cancel'},
              {text: 'Proceed', onPress: () => resolve(true)},
            ],
          ),
        );
        if (!confirmed) {
          setProcessing(false);
          return;
        }
      }

      const {error: initError} = await stripe.initPaymentSheet({
        paymentIntentClientSecret: paymentOrder.clientSecret,
        merchantDisplayName: 'Pryvo Premium',
        appearance: {colors: {primary: colors.primary}},
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
        Alert.alert(
          'Congratulations!',
          plan.isUpgrade
            ? 'Your subscription has been upgraded successfully!'
            : 'You are now a Premium subscriber!',
          [
            {
              text: 'Great!',
              onPress: () => navigation.navigate(AppRoute.HomeTabs),
            },
          ],
        );
      } else {
        throw new Error(verifyResponse?.message || 'Verification failed');
      }
    } catch (error) {
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

  if (loading) {
    return (
      <LinearGradient
        colors={['#2D0060', '#4A007A', '#6B0099']}
        style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E0AAFF" />
        <Text style={styles.loadingText}>Preparing your experience…</Text>
      </LinearGradient>
    );
  }

  const selectedPlanData = plans.find(p => p.id === selectedPlan);

  return (
    <View style={styles.mainContainer}>
      <StatusBar
        barStyle="light-content"
        transparent
        backgroundColor="transparent"
      />

      {/* Deep Dark Midnight Background matching screenshot */}
      <LinearGradient
        colors={['#0F051C', '#281052', '#0A0014']}
        start={{x: 0, y: 0}}
        end={{x: 0.5, y: 1}}
        style={StyleSheet.absoluteFillObject}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {/* Header Section */}
        <View style={styles.headerContainer}>
          <View style={styles.headerTop}>
            <View style={styles.pricingPill}>
              <Text style={styles.pricingPillText}>Pricing Plan</Text>
            </View>
            <Pressable
              onPress={() => navigation.goBack()}
              style={styles.backButton}>
              <MaterialCommunityIcons name="close" size={20} color="#fff" />
            </Pressable>
          </View>

          <Text style={styles.heroTitle}>
            Access Premium{'\n'}Features on Every Plan
          </Text>
          <Text style={styles.pryvoUpgradeText}>
            Upgrade to <Text style={styles.pryvoGold}>Pryvo</Text> Premium
          </Text>
        </View>

        {/* Feature Tiles */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.featuresScrollContainer}
          snapToInterval={110 + 16}
          decelerationRate="fast">
          {FEATURES.map((f, i) => (
            <LinearGradient
              key={i}
              colors={[
                'rgba(255, 255, 255, 0.08)',
                'rgba(255, 255, 255, 0.02)',
              ]}
              start={{x: 0, y: 0}}
              end={{x: 0, y: 1}}
              style={styles.featureTile}>
              <View style={styles.featureEmojiWrapper}>
                <Text style={styles.featureEmoji}>{f.icon}</Text>
              </View>
              <Text style={styles.featureTileTitle} numberOfLines={2}>
                {f.label}
              </Text>
            </LinearGradient>
          ))}
        </ScrollView>

        {/* Segmented Control Pill */}
        <View style={styles.segmentContainerWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.segmentContainer}>
            {plans.map(plan => {
              const isSelected = selectedPlan === plan.id;
              return (
                <Pressable
                  key={plan.id}
                  onPress={() => setSelectedPlan(plan.id)}
                  style={[
                    styles.segmentBtn,
                    isSelected && styles.segmentBtnActive,
                  ]}>
                  <Text
                    style={[
                      styles.segmentText,
                      isSelected && styles.segmentTextActive,
                    ]}>
                    {plan.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Giant Glass Checkout Card */}
        {selectedPlanData && (
          <View style={styles.giantCardContainer}>
            <LinearGradient
              colors={['rgba(15, 10, 20, 0.7)', 'rgba(2, 0, 5, 0.95)']}
              start={{x: 0, y: 0}}
              end={{x: 0, y: 1}}
              style={styles.giantCard}>
              {/* Card Header Info */}
              <View style={styles.giantCardTop}>
                <Text style={styles.giantPlanName}>
                  {selectedPlanData.name}
                </Text>

                <View style={styles.giantPriceRow}>
                  <Text style={styles.giantDollar}>$</Text>
                  <Text style={styles.giantPrice}>
                    {selectedPlanData.price.toFixed(2).replace(/\.00$/, '')}
                  </Text>
                  <Text style={styles.giantPeriod}>
                    /{selectedPlanData.period}
                  </Text>
                </View>

                {/* Upgrade Credit Informational Banner */}
                {calculateProRatedPrice(selectedPlanData) <
                  selectedPlanData.price && (
                  <Text
                    style={{
                      color: '#10B981',
                      fontSize: 13,
                      fontFamily: typography.fontFamilyMedium,
                      marginTop: 8,
                    }}>
                    Upgrade today for only $
                    {calculateProRatedPrice(selectedPlanData).toFixed(2)} with
                    your existing plan credit!
                  </Text>
                )}
              </View>

              {/* Action Button Row */}
              <View style={styles.giantActionRow}>
                <Pressable
                  style={[
                    styles.giantPayButton,
                    processing && styles.payButtonDisabled,
                  ]}
                  onPress={handleCheckout}
                  disabled={processing}>
                  <LinearGradient
                    colors={['#6C48FB', '#8A63FF']}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 0}}
                    style={styles.giantPayGradient}>
                    {processing ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <View style={styles.btnContentRow}>
                        <Text style={styles.giantPayText}>Get started</Text>
                        <MaterialCommunityIcons
                          name="arrow-top-right"
                          size={16}
                          color="#fff"
                          style={styles.btnIcon}
                        />
                      </View>
                    )}
                  </LinearGradient>
                </Pressable>
              </View>

              {/* Faint Divider */}
              <View style={styles.giantDivider} />

              {/* Bullet Points */}
              <View style={styles.bulletsContainer}>
                {features.map((f, i) => (
                  <Text key={i} style={styles.bulletItem}>
                    • {f.title}: {f.desc}
                  </Text>
                ))}
                <Text style={styles.bulletItem}>
                  • Billed securely via Stripe. Cancel anytime.
                </Text>
              </View>

              {/* Custom Requests Row (aesthetic match) */}
              <View style={styles.customRequestRow}>
                <View style={styles.customLeft}>
                  <MaterialCommunityIcons
                    name="arrow-top-right"
                    size={12}
                    color="rgba(255,255,255,0.5)"
                  />
                  <Text style={styles.customText}>For Custom Requests</Text>
                </View>
                <View style={styles.customRight}>
                  <Text style={styles.customLink}>Get started </Text>
                  <MaterialCommunityIcons
                    name="arrow-top-right"
                    size={14}
                    color="#6C48FB"
                  />
                </View>
              </View>
            </LinearGradient>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#0A0014',
  },
  scrollContent: {
    paddingBottom: 60,
  },
  headerContainer: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  pricingPill: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  pricingPillText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    fontFamily: typography.fontFamilyMedium,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 28,
    fontFamily: typography.fontFamilyBold,
    color: '#fff',
    lineHeight: 36,
  },
  pryvoUpgradeText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 8,
    fontFamily: typography.fontFamilyMedium,
  },
  pryvoGold: {
    color: '#FFD700',
    fontStyle: 'italic',
    fontFamily: typography.fontFamilyBold,
  },
  featuresScrollContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 16,
  },
  featureTile: {
    width: 110,
    height: 110,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    padding: 12,
  },
  featureEmojiWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  featureEmoji: {
    fontSize: 24,
  },
  featureTileTitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    textAlign: 'center',
    fontFamily: typography.fontFamilyMedium,
  },
  segmentContainerWrapper: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 10,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 30,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  segmentBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 26,
  },
  segmentBtnActive: {
    backgroundColor: '#6C48FB',
    shadowColor: '#6C48FB',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  segmentText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
    fontFamily: typography.fontFamilySemiBold,
  },
  segmentTextActive: {
    color: '#fff',
  },
  giantCardContainer: {
    paddingHorizontal: 20,
  },
  giantCard: {
    borderRadius: 32,
    borderWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    borderColor: 'rgba(255, 255, 255, 0.05)',
    padding: 30,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  giantCardTop: {
    marginBottom: 24,
  },
  giantPlanName: {
    color: '#fff',
    fontSize: 24,
    fontFamily: typography.fontFamilyBold,
    marginBottom: 4,
  },
  giantSubtitle: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
    fontFamily: typography.fontFamilyRegular,
    marginBottom: 16,
  },
  giantPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  giantDollar: {
    color: '#fff',
    fontSize: 26,
    fontFamily: typography.fontFamilyBold,
  },
  giantPrice: {
    color: '#fff',
    fontSize: 52,
    fontFamily: typography.fontFamilyBold,
    letterSpacing: -1,
  },
  giantPeriod: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 16,
    fontFamily: typography.fontFamilyMedium,
  },
  giantActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  giantPayButton: {
    borderRadius: 20,
    overflow: 'hidden',
    height: 48,
    width: 140,
  },
  giantPayGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  giantPayText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: typography.fontFamilySemiBold,
  },
  btnIcon: {
    backgroundColor: '#fff',
    color: '#6C48FB',
    borderRadius: 8,
    padding: 2,
    overflow: 'hidden',
  },
  giantDoneText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontFamily: typography.fontFamilyMedium,
  },
  giantDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 20,
  },
  bulletsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  bulletItem: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 12,
    fontFamily: typography.fontFamilyMedium,
    lineHeight: 18,
  },
  customRequestRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  customLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  customText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    fontFamily: typography.fontFamilyMedium,
  },
  customRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customLink: {
    color: '#6C48FB',
    fontSize: 13,
    fontFamily: typography.fontFamilySemiBold,
  },
  payButtonDisabled: {
    opacity: 0.6,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A0014',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.body.medium,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  ctaBtn: {
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  ctaBtnText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.8,
  },
  ctaInnerHighlight: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: 34,
    pointerEvents: 'none',
  },
  secureNote: {
    textAlign: 'center',
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 18,
    fontWeight: '600',
  },
});

// ─── Stripe wrapper ──────────────────────────────────────────────
const SubscriptionUpsellScreen = () => {
  const [publishableKey, setPublishableKey] = useState(null);
  useEffect(() => {
    setPublishableKey(
      'pk_test_51RNq3aQ0qRbELDrXrWQtGUARFShAyk2osAsJOFT9Cj2lvamEsGnRqqHdrwKhkMHFkqmt2OqeX91FDQfPdWK4FHSH00Xi0LTJft',
    );
  }, []);

  if (!publishableKey) {
    return (
      <LinearGradient
        colors={['#3A0070', '#5B0099', '#7B00BB']}
        style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
        <ActivityIndicator size="large" color="#E0AAFF" />
      </LinearGradient>
    );
  }
  return (
    <StripeProvider publishableKey={publishableKey}>
      <SubscriptionUpsellScreenContent />
    </StripeProvider>
  );
};

export default SubscriptionUpsellScreen;
