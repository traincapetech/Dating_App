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
  Animated,
  FlatList,
  Easing,
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
import {useAuth} from '../../../context/AuthContext';

const {width: SW} = Dimensions.get('window');
const CARD_W = SW * 0.72;
const CARD_MARGIN = 12;
const FULL_CARD_W = CARD_W + CARD_MARGIN;
const SIDE_OPACITY = 0.65;
const SIDE_SCALE = 0.9;
const CARD_SIDE_OFFSET = (SW - CARD_W) / 2;

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
            {translateY: anim.interpolate({inputRange: [0, 1], outputRange: [20, 0]})},
            {scale: anim.interpolate({inputRange: [0, 1], outputRange: [0.95, 1]})},
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
const PlanCard = ({plan, isSelected, isCurrent, isDowngrade, proRated, onPress, scrollX, index}) => {
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
    <Animated.View style={[
      styles.planCardWrap,
      {
        opacity,
        zIndex: isSelected ? 10 : 1,
        transform: [
          {perspective: 1000},
          {scale},
          {translateX},
          {rotateY},
        ],
      }
    ]}>
      <Pressable disabled={disabled} onPress={onPress} style={styles.planCardPressable}>
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
              <Text style={[styles.planBadgeText, {color: '#999'}]}>🔒 Locked</Text>
            </View>
          )}

          <View style={styles.planCardBody}>
            <Text style={[styles.planCardName, (isSelected || isCurrent) && {color: '#fff'}]}>
              {plan.name}
            </Text>

            <View style={styles.planPriceBlock}>
              {hasDiscount && (
                <Text style={[styles.planOldPrice, (isSelected || isCurrent) && {color: 'rgba(255,255,255,0.55)'}]}>
                  ${plan.price}
                </Text>
              )}
              <Text style={[styles.planNewPrice, (isSelected || isCurrent) && {color: '#fff'}]}>
                ${proRated.toFixed(2)}
              </Text>
              <Text style={[styles.planPer, (isSelected || isCurrent) && {color: 'rgba(255,255,255,0.7)'}]}>
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
  const {pendingIntent, setPendingIntent} = useAuth();
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
      if (userId) await Promise.all([loadPlans(), loadSubscriptionStatus(userId)]);
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

  const handlePressIn = (scale) => {
    Animated.timing(scale, {
      toValue: 0.95,
      duration: 150,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = (scale) => {
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
    } catch (e) {console.error(e);}
    return null;
  };

  const loadSubscriptionStatus = async userId => {
    try {
      const response = await getSubscriptionStatus(userId);
      if (response?.success && response?.subscription) setCurrentSubscription(response.subscription);
    } catch (e) {console.error(e);}
  };

  const loadPlans = async () => {
    try {
      const response = await getAvailablePlans();
      if (response?.success && response?.plans) {
        setPlans(response.plans);
        const popular = response.plans.find(p => p.popular);
        if (popular) setSelectedPlan(popular.id);
      }
    } catch (e) {console.error(e);}
  };

  const calculateProRatedPrice = plan => {
    if (!currentSubscription) return plan.price;
    const currentPlan = plans.find(p => p.id === currentSubscription.planId);
    if (!currentPlan || plan.rank <= currentPlan.rank) return plan.price;
    const now = new Date();
    const remaining = Math.max(0, Math.ceil((new Date(currentSubscription.expiresAt) - now) / 86400000));
    const credit = (remaining / (currentPlan.duration || 30)) * currentPlan.price;
    return Math.round(Math.max(0, plan.price - credit) * 100) / 100;
  };

  const handleCheckout = async () => {
    if (!selectedPlan || !currentUserId) {Alert.alert('Error', 'Please select a plan'); return;}
    if (!stripe) {Alert.alert('Error', 'Payment system is initializing.'); return;}
    try {
      setProcessing(true);
      const orderResponse = await createPaymentOrder(currentUserId, selectedPlan);
      if (!orderResponse?.success || !orderResponse?.paymentOrder)
        throw new Error(orderResponse?.message || 'Failed to create payment order');

      const {paymentOrder, plan} = orderResponse;
      if (plan.isUpgrade) {
        const confirmed = await new Promise(resolve => Alert.alert(
          'Confirm Upgrade',
          `Upgrading to ${plan.name}.\n\nCredit: $${plan.upgradeCredit.toFixed(2)}\nFinal: $${plan.proRatedPrice.toFixed(2)}`,
          [{text: 'Cancel', onPress: () => resolve(false), style: 'cancel'}, {text: 'Proceed', onPress: () => resolve(true)}],
        ));
        if (!confirmed) {setProcessing(false); return;}
      }

      const {error: initError} = await stripe.initPaymentSheet({
        paymentIntentClientSecret: paymentOrder.clientSecret,
        merchantDisplayName: 'Pryvo Premium',
        appearance: {colors: {primary: colors.primary}},
      });
      if (initError) throw new Error(initError.message);

      const {error: presentError} = await stripe.presentPaymentSheet();
      if (presentError) {
        if (presentError.code === 'Canceled') {setProcessing(false); return;}
        throw new Error(presentError.message);
      }

      const verifyResponse = await verifyPaymentAndCreateSubscription(
        currentUserId, selectedPlan, paymentOrder.orderId,
        paymentOrder.orderId, '', 'stripe', paymentOrder.currency || 'USD', true,
      );

      if (verifyResponse?.success) {
        const nav = () => {
          if (pendingIntent?.type === 'profile_view' && pendingIntent?.userId) {
            const id = pendingIntent.userId;
            setPendingIntent(null);
            navigation.replace('UserProfileView', {userId: id});
          } else {
            setPendingIntent(null);
            navigation.navigate(AppRoute.HomeTabs);
          }
        };
        Alert.alert('Welcome to Premium! 🎉',
          plan.isUpgrade ? 'Your plan has been upgraded!' : 'You are now a Pryvo Premium member!',
          [{text: "Let's Go! 🚀", onPress: nav}]);
      } else {
        throw new Error(verifyResponse?.message || 'Verification failed');
      }
    } catch (error) {
      Alert.alert('Payment Error', error.message || 'Something went wrong');
    } finally {
      setProcessing(false);
    }
  };

  // ── Loading ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <LinearGradient colors={['#2D0060', '#4A007A', '#6B0099']} style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E0AAFF" />
        <Text style={styles.loadingText}>Preparing your experience…</Text>
      </LinearGradient>
    );
  }

  const selectedPlanData = plans.find(p => p.id === selectedPlan);
  const displayPrice = selectedPlanData ? calculateProRatedPrice(selectedPlanData) : '0.00';
  const currentPlanObj = plans.find(p => p.id === currentSubscription?.planId);
  const isUpgrade = selectedPlanData && currentSubscription && selectedPlanData.rank > (currentPlanObj?.rank || 0);

  const auraScale = auraPulse.interpolate({inputRange: [0, 1], outputRange: [1, 1.25]});
  const auraOpacity = auraPulse.interpolate({inputRange: [0, 1], outputRange: [0.2, 0.45]});
  const floatY = floatAnim.interpolate({inputRange: [0, 1], outputRange: [0, -8]});
  const ctaS = ctaPulse.interpolate({inputRange: [0, 1], outputRange: [1, 1.04]});
  const totalY = totalFloat.interpolate({inputRange: [0, 1], outputRange: [0, -6]});

  const orb1X = orbAnim.interpolate({inputRange: [0, 1], outputRange: [-20, 40]});
  const orb1Y = orbAnim.interpolate({inputRange: [0, 1], outputRange: [20, -30]});
  const orb2X = orbAnim.interpolate({inputRange: [0, 1], outputRange: [60, -20]});
  const orb2Y = orbAnim.interpolate({inputRange: [0, 1], outputRange: [-40, 50]});

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      {/* High-Vibrancy Luminous Gradient Background */}
      <LinearGradient
        colors={['#4A00E0', '#8E2DE2', '#FF0099']}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={StyleSheet.absoluteFillObject}
      />
      {/* Reduced dark overlay for more brightness */}
      <View style={[styles.darkOverlay, {backgroundColor: 'rgba(0,0,0,0.1)'}]} />

      {/* Intensified Luminous Orbs */}
      <Animated.View style={[styles.bgOrb, styles.orb1, {transform: [{translateX: orb1X}, {translateY: orb1Y}]}]}>
        <LinearGradient colors={['rgba(255,255,255,0.4)', 'rgba(255,255,255,0)']} style={StyleSheet.absoluteFillObject} />
      </Animated.View>
      <Animated.View style={[styles.bgOrb, styles.orb2, {transform: [{translateX: orb2X}, {translateY: orb2Y}]}]}>
        <LinearGradient colors={['rgba(255,122,217,0.3)', 'rgba(255,122,217,0)']} style={StyleSheet.absoluteFillObject} />
      </Animated.View>

      <View style={styles.topGlowOverlay} />

      {/* Top bar */}
      <View style={styles.topBar}>
        <Animated.View style={{transform: [{scale: backPressScale}]}}>
          <Pressable
            onPressIn={() => handlePressIn(backPressScale)}
            onPressOut={() => handlePressOut(backPressScale)}
            onPress={() => navigation.goBack()}
            style={styles.topBtn}>
            <View style={styles.glassBackground} />
            <Text style={styles.topBtnIcon}>←</Text>
          </Pressable>
        </Animated.View>

        <Animated.View style={{transform: [{scale: skipPressScale}]}}>
          <Pressable
            onPressIn={() => handlePressIn(skipPressScale)}
            onPressOut={() => handlePressOut(skipPressScale)}
            onPress={() => navigation.navigate(AppRoute.HomeTabs)}
            style={styles.skipBtn}>
            <View style={styles.glassBackground} />
            <Text style={styles.skipBtnText}>Skip</Text>
          </Pressable>
        </Animated.View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Hero ──────────────────────────────────────── */}
        <Animated.View
          style={[
            styles.hero,
            {
              opacity: heroAnim,
              transform: [{translateY: heroAnim.interpolate({inputRange: [0, 1], outputRange: [18, 0]})}],
            },
          ]}>
          <View style={styles.glowAuraWrap}>
            <Animated.View
              style={[
                styles.auraRing,
                {
                  opacity: auraOpacity,
                  transform: [{scale: auraScale}],
                },
              ]}
            />
            <Animated.View style={{transform: [{translateY: floatY}]}}>
              <LinearGradient colors={['#B040FF', '#D580FF', '#FF50CC']} style={styles.diamondRing}>
                <Text style={styles.diamondEmoji}>💎</Text>
              </LinearGradient>
            </Animated.View>
          </View>
          <Text style={styles.heroTitle}>Pryvo Premium</Text>
          <Text style={styles.heroTagline}>Find love faster. Stand out from the crowd.</Text>
        </Animated.View>

        {/* ── Current plan banner ──────────────────────── */}
        {currentSubscription && (
          <View style={styles.currentBanner}>
            <View>
              <Text style={styles.currentBannerLabel}>CURRENT PLAN</Text>
              <Text style={styles.currentBannerName}>{currentSubscription.planName || 'Premium'}</Text>
              <Text style={styles.currentBannerExpiry}>
                Expires {new Date(currentSubscription.expiresAt).toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.activePill}>
              <Text style={styles.activePillText}>● ACTIVE</Text>
            </View>
          </View>
        )}

        {/* ── Plans — Horizontal Snapping Carousel ──────── */}
        <Text style={styles.sectionHeading}>Choose Your Plan</Text>
        <Animated.FlatList
          data={plans}
          keyExtractor={item => item.id}
          horizontal
          onScroll={Animated.event(
            [{nativeEvent: {contentOffset: {x: scrollX}}}],
            {useNativeDriver: true}
          )}
          scrollEventThrottle={16}
          showsHorizontalScrollIndicator={false}
          snapToInterval={FULL_CARD_W}
          snapToAlignment="center"
          decelerationRate="fast"
          contentContainerStyle={styles.plansCarousel}
          renderItem={({item: plan, index}) => {
            const isCurrent = currentSubscription?.planId === plan.id;
            const isDowngrade = currentSubscription && plan.rank < (currentPlanObj?.rank || 0);
            const proRated = calculateProRatedPrice(plan);
            return (
              <PlanCard
                plan={plan}
                index={index}
                scrollX={scrollX}
                isSelected={selectedPlan === plan.id}
                isCurrent={isCurrent}
                isDowngrade={isDowngrade}
                proRated={proRated}
                onPress={() => setSelectedPlan(plan.id)}
              />
            );
          }}
        />

        {/* ── Features ─────────────────────────────────── */}
        <Text style={[styles.sectionHeading, {marginTop: 28}]}>What You Unlock</Text>
        <View style={styles.featuresCard}>
          {FEATURES.map((f, i) => (
            <FeatureItem key={f.label} {...f} delay={200 + i * 80} />
          ))}
        </View>

        <View style={{height: 160}} />
      </ScrollView>

      {/* ── Sticky Footer CTA ──────────────────────────── */}
      <View style={styles.footer}>
        <LinearGradient
          colors={['rgba(58,0,112,0)', 'rgba(58,0,112,0.97)', '#3A0070']}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />
        <View style={styles.footerContent}>
          <Animated.View style={[
            styles.totalCard,
            {transform: [{translateY: totalY}]}
          ]}>
            <LinearGradient
              colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.08)']}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.totalCardInner}>
              <Text style={styles.totalLabel}>Total to pay</Text>
              <Text style={styles.totalPrice}>
                ${typeof displayPrice === 'number' ? displayPrice.toFixed(2) : displayPrice}
              </Text>
            </View>
          </Animated.View>

          <Animated.View style={{transform: [{scale: ctaS}]}}>
            <Pressable
              disabled={processing || !selectedPlan}
              onPress={handleCheckout}
              style={({pressed}) => [
                styles.ctaBtnContainer,
                pressed && {opacity: 0.9}
              ]}>
              <LinearGradient
                colors={processing || !selectedPlan ? ['#888', '#666'] : ['#FF0099', '#493240']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={styles.ctaBtn}>
                {processing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.ctaBtnText}>
                    {isUpgrade ? '⬆ Upgrade Now' : currentSubscription ? '🔄 Extend Plan' : '🚀 Join Premium'}
                  </Text>
                )}
              </LinearGradient>
              {!processing && selectedPlan && (
                <View style={styles.ctaInnerHighlight} />
              )}
            </Pressable>
          </Animated.View>

          <Text style={styles.secureNote}>🔒 Secure payment via Stripe</Text>
        </View>
      </View>
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#1A1522'},
  loadingContainer: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  loadingText: {color: 'rgba(255,255,255,0.7)', marginTop: 15, fontSize: 16, fontWeight: '600'},

  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },

  bgOrb: {
    position: 'absolute',
    width: SW * 1.2,
    height: SW * 1.2,
    borderRadius: SW * 0.6,
    opacity: 0.3,
  },
  orb1: {
    top: -100,
    left: -100,
  },
  orb2: {
    bottom: -150,
    right: -100,
  },

  topGlowOverlay: {
    position: 'absolute', top: -120, left: SW / 2 - 200,
    width: 400, height: 400, borderRadius: 200,
    backgroundColor: '#C86BFA', opacity: 0.1,
  },

  topBar: {
    position: 'absolute', top: 50, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 20, zIndex: 100,
  },
  topBtn: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.22)',
  },
  glassBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  topBtnIcon: {fontSize: 24, color: '#fff', fontWeight: 'bold'},
  skipBtn: {
    paddingHorizontal: 22, paddingVertical: 12,
    borderRadius: 24, overflow: 'hidden',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.20)',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  skipBtnText: {color: '#fff', fontWeight: '800', fontSize: 14, letterSpacing: 0.5},

  scrollContent: {paddingTop: 120, paddingHorizontal: 20},

  // Hero
  hero: {alignItems: 'center', marginBottom: 40, paddingTop: 10},
  glowAuraWrap: {alignItems: 'center', justifyContent: 'center', marginBottom: 25},
  auraRing: {
    position: 'absolute', width: 160, height: 160, borderRadius: 80,
    backgroundColor: '#C86BFA',
    shadowColor: '#C86BFA', shadowOffset: {width: 0, height: 0},
    shadowOpacity: 1, shadowRadius: 40, elevation: 0,
  },
  diamondRing: {
    width: 110, height: 110, borderRadius: 55,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#C86BFA', shadowOffset: {width: 0, height: 12},
    shadowOpacity: 0.6, shadowRadius: 25, elevation: 20,
  },
  diamondEmoji: {fontSize: 52},
  heroTitle: {
    fontSize: 34, fontWeight: '900', color: '#fff',
    letterSpacing: -0.8, textAlign: 'center', marginBottom: 10,
    textShadowColor: 'rgba(200,107,250,0.6)',
    textShadowOffset: {width: 0, height: 4}, textShadowRadius: 20,
  },
  heroTagline: {
    fontSize: 16, color: 'rgba(255,255,255,0.7)', textAlign: 'center',
    paddingHorizontal: 30, lineHeight: 22, fontWeight: '500',
  },

  // Current plan
  currentBanner: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 24,
    padding: 18, marginBottom: 35,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.18)',
    shadowColor: '#000', shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.2, shadowRadius: 15,
  },
  currentBannerLabel: {
    fontSize: 11, fontWeight: '900', color: '#C86BFA',
    letterSpacing: 2, textTransform: 'uppercase', marginBottom: 5,
  },
  currentBannerName: {fontSize: 20, fontWeight: '900', color: '#fff'},
  currentBannerExpiry: {fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4},
  activePill: {
    backgroundColor: 'rgba(46,204,113,0.20)', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1.5, borderColor: 'rgba(46,204,113,0.5)',
  },
  activePillText: {fontSize: 12, fontWeight: '800', color: '#2ECC71'},

  sectionHeading: {
    fontSize: 14, fontWeight: '800', color: 'rgba(255,255,255,0.65)',
    letterSpacing: 2.2, textTransform: 'uppercase', marginBottom: 20,
    paddingLeft: 4,
  },

  // ── Plan Carousel ──────────────────────────────────────────────
  plansCarousel: {
    paddingLeft: CARD_SIDE_OFFSET,
    paddingRight: CARD_SIDE_OFFSET,
    paddingBottom: 40,
  },
  planCardWrap: {
    width: CARD_W,
    marginRight: CARD_MARGIN,
  },
  planCardPressable: {flex: 1},
  planCard: {
    borderRadius: 32, padding: 26, minHeight: 220,
    justifyContent: 'space-between',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.20)',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  selectedPlanCard: {
    borderColor: 'rgba(255,255,255,0.8)',
    shadowColor: '#FF00CC',
    shadowOffset: {width: 0, height: 15},
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 25,
  },
  currentPlanCard: {
    borderColor: '#00F260',
  },
  cardInnerShine: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.5,
  },
  planBadgeHot: {
    alignSelf: 'flex-start', backgroundColor: '#FF00CC',
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginBottom: 15,
    shadowColor: '#FF00CC', shadowOpacity: 0.8, shadowRadius: 10,
  },
  planBadgeSave: {
    alignSelf: 'flex-start', backgroundColor: '#2ECC71',
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginBottom: 15,
  },
  planBadgeLock: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.10)',
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginBottom: 15,
  },
  planBadgeText: {fontSize: 12, fontWeight: '900', color: '#fff'},
  planCardBody: {},
  planCardName: {
    fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 15,
  },
  planPriceBlock: {flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap'},
  planOldPrice: {
    fontSize: 16, color: 'rgba(255,255,255,0.4)',
    textDecorationLine: 'line-through', marginRight: 10,
  },
  planNewPrice: {fontSize: 36, fontWeight: '900', color: '#fff'},
  planPer: {fontSize: 15, color: 'rgba(255,255,255,0.65)', marginLeft: 5},
  currentPill: {
    marginTop: 18, alignSelf: 'flex-start',
    backgroundColor: 'rgba(46,204,113,0.25)',
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14,
    borderWidth: 1.5, borderColor: 'rgba(46,204,113,0.4)',
  },
  currentPillText: {fontSize: 13, fontWeight: '900', color: '#fff'},
  selectedPill: {
    marginTop: 18, alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)',
  },
  selectedPillText: {fontSize: 13, fontWeight: '900', color: '#fff'},

  // Features
  featuresCard: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 28, overflow: 'hidden',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.18)',
    marginBottom: 25,
    shadowColor: '#000', shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.2, shadowRadius: 20,
  },
  featureItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 18, paddingHorizontal: 22,
  },
  featureIconBubble: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center', marginRight: 18,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.20)',
  },
  featureIconText: {fontSize: 26},
  featureTextGroup: {flex: 1},
  featureLabel: {fontSize: 17, fontWeight: '800', color: '#fff'},
  featureSub: {fontSize: 14, color: 'rgba(255,255,255,0.65)', marginTop: 3},
  featureTick: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#C86BFA', shadowRadius: 5, shadowOpacity: 0.5,
  },
  featureTickText: {fontSize: 14, color: '#fff', fontWeight: '900'},

  // Footer
  footer: {position: 'absolute', bottom: 0, left: 0, right: 0, paddingTop: 45},
  footerContent: {paddingHorizontal: 25, paddingBottom: 40, paddingTop: 10},
  totalCard: {
    borderRadius: 24,
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.18)',
    shadowColor: '#C86BFA',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  totalCardInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 22,
  },
  totalLabel: {fontSize: 15, color: 'rgba(255,255,255,0.7)', fontWeight: '800'},
  totalPrice: {fontSize: 34, fontWeight: '900', color: '#fff'},

  ctaBtnContainer: {
    shadowColor: '#C86BFA', shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.7, shadowRadius: 30, elevation: 25,
  },
  ctaBtn: {
    height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  ctaBtnText: {fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: 0.8},
  ctaInnerHighlight: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: 34,
    pointerEvents: 'none',
  },
  secureNote: {textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 18, fontWeight: '600'},
});

// ─── Stripe wrapper ──────────────────────────────────────────────
const SubscriptionUpsellScreen = () => {
  const [publishableKey, setPublishableKey] = useState(null);
  useEffect(() => {
    setPublishableKey('pk_test_51RNq3aQ0qRbELDrXrWQtGUARFShAyk2osAsJOFT9Cj2lvamEsGnRqqHdrwKhkMHFkqmt2OqeX91FDQfPdWK4FHSH00Xi0LTJft');
  }, []);

  if (!publishableKey) {
    return (
      <LinearGradient colors={['#3A0070', '#5B0099', '#7B00BB']} style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
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
