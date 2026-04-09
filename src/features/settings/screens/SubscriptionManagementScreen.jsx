import React, {useState, useEffect, useRef} from 'react';
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
  Animated,
  Dimensions,
  Easing,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
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

const {width: SW} = Dimensions.get('window');

// ─── Premium Feature List ────────────────────────────────────────
const FEATURES = [
  {icon: '🔥', label: 'Unlimited Likes', sub: 'Swipe as much as you want'},
  {icon: '👀', label: 'See Who Liked You', sub: 'No more mystery matches'},
  {icon: '🎯', label: 'Advanced Filters', sub: 'Find your perfect type'},
  {icon: '⚡', label: 'Priority Matching', sub: 'Get seen 3× more'},
  {icon: '💬', label: 'Read Receipts', sub: "Know when they've read"},
  {icon: '🌟', label: 'Profile Boost', sub: '1 free boost per week'},
];

// ─── Helpers ─────────────────────────────────────────────────────
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
      return {color: '#2ECC71', label: 'Active'};
    case 'cancelled':
      return {color: '#F39C12', label: 'Cancelled'};
    case 'expired':
      return {color: '#95A5A6', label: 'Expired'};
    default:
      return {color: '#95A5A6', label: status?.toUpperCase() || 'Unknown'};
  }
};

// ─── Sub-components ───────────────────────────────────────────────

const FeatureRow = ({icon, label, sub, index}) => {
  const [anim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 500,
      delay: 400 + index * 100,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.featureRow,
        {
          opacity: anim,
          transform: [{
            translateY: anim.interpolate({inputRange: [0, 1], outputRange: [20, 0]})
          }],
        },
      ]}>
      <LinearGradient
        colors={['rgba(200,107,250,0.15)', 'rgba(255,122,217,0.1)']}
        style={styles.featureIconWrap}>
        <Text style={styles.featureIcon}>{icon}</Text>
      </LinearGradient>
      <View style={styles.featureTextWrap}>
        <Text style={styles.featureLabel}>{label}</Text>
        <Text style={styles.featureSub}>{sub}</Text>
      </View>
      <View style={styles.featureCheck}>
        <Text style={styles.featureCheckTxt}>✓</Text>
      </View>
    </Animated.View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────

const SubscriptionManagementScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [allSubscriptions, setAllSubscriptions] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);

  // Animations
  const [heroAnim] = useState(() => new Animated.Value(0));
  const [ctaPulse] = useState(() => new Animated.Value(0));
  const [auraPulse] = useState(() => new Animated.Value(0));
  const [floatAnim] = useState(() => new Animated.Value(0));
  const [orbAnim] = useState(() => new Animated.Value(0));
  const [ctaScale] = useState(() => new Animated.Value(1));

  useEffect(() => {
    loadSubscriptionData();

    // Infinite Background Orb movement
    Animated.loop(
      Animated.sequence([
        Animated.timing(orbAnim, {
          toValue: 1,
          duration: 10000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(orbAnim, {
          toValue: 0,
          duration: 10000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // Breathing interactions
    Animated.loop(
      Animated.sequence([
        Animated.timing(auraPulse, {
          toValue: 1,
          duration: 2500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(auraPulse, {
          toValue: 0,
          duration: 2500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(ctaPulse, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(ctaPulse, {
          toValue: 0,
          duration: 1800,
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
              const response = await cancelSubscription(subscription.id, currentUserId);
              if (response?.success) {
                Alert.alert('Done', 'Auto-renewal has been cancelled.');
                loadSubscriptionData();
              }
            } catch {
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
    } catch {
      Alert.alert('Error', 'Failed to update auto-renewal');
    }
  };

  const handleCtaPressIn = () => {
    Animated.spring(ctaScale, {toValue: 0.96, useNativeDriver: true}).start();
  };
  const handleCtaPressOut = () => {
    Animated.spring(ctaScale, {toValue: 1, friction: 4, useNativeDriver: true}).start();
  };

  // ── Loading ────────────────────────────────────────────────────
  if (loading) {
    return (
      <LinearGradient colors={['#1A1522', '#5E4E6A', '#6A4F7D']} style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#C86BFA" />
        <Text style={styles.loadingText}>Refining your experience…</Text>
      </LinearGradient>
    );
  }

  const auraS = auraPulse.interpolate({inputRange: [0, 1], outputRange: [1, 1.2]});
  const auraO = auraPulse.interpolate({inputRange: [0, 1], outputRange: [0.15, 0.35]});
  const floatY = floatAnim.interpolate({inputRange: [0, 1], outputRange: [0, -10]});
  const ctaBreathing = ctaPulse.interpolate({inputRange: [0, 1], outputRange: [1, 1.03]});

  const orb1X = orbAnim.interpolate({inputRange: [0, 1], outputRange: [-30, 50]});
  const orb1Y = orbAnim.interpolate({inputRange: [0, 1], outputRange: [30, -50]});
  const orb2X = orbAnim.interpolate({inputRange: [0, 1], outputRange: [SW * 0.7, SW * 0.4]});
  const orb2Y = orbAnim.interpolate({inputRange: [0, 1], outputRange: [100, 300]});

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
      <View style={[styles.darkOverlay, {backgroundColor: 'rgba(0,0,0,0.1)'}]} />

      {/* Intensified Luminous Orbs */}
      <Animated.View style={[styles.bgOrb, styles.orb1, {transform: [{translateX: orb1X}, {translateY: orb1Y}]}]}>
        <LinearGradient colors={['rgba(255,255,255,0.4)', 'rgba(255,255,255,0)']} style={StyleSheet.absoluteFillObject} />
      </Animated.View>
      <Animated.View style={[styles.bgOrb, styles.orb2, {transform: [{translateX: orb2X}, {translateY: orb2Y}]}]}>
        <LinearGradient colors={['rgba(255,122,217,0.3)', 'rgba(255,122,217,0)']} style={StyleSheet.absoluteFillObject} />
      </Animated.View>

      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backIcon}>←</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Premium Plan</Text>
          <View style={{width: 44}} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>

          {/* ── Hero Section ──────────────────────────────────── */}
          <Animated.View
            style={[
              styles.heroSection,
              {
                opacity: heroAnim,
                transform: [{
                  translateY: heroAnim.interpolate({inputRange: [0, 1], outputRange: [20, 0]})
                }]
              },
            ]}>
            <View style={styles.glowAuraWrap}>
              <Animated.View style={[styles.glowAura, {opacity: auraO, transform: [{scale: auraS}], backgroundColor: '#FF00CC', shadowColor: '#FF00CC'}]} />
              <Animated.View style={{transform: [{translateY: floatY}]}}>
                <LinearGradient
                  colors={['#FF00CC', '#3333FF']}
                  style={styles.iconRing}>
                  <Text style={styles.heroIcon}>💎</Text>
                </LinearGradient>
              </Animated.View>
            </View>
            <Text style={styles.heroTitle}>
              {isPremium ? "You're Premium ✦" : 'Elite Status'}
            </Text>
            <Text style={styles.heroSub}>
              {isPremium
                ? "Enjoy all luxurious benefits. You're standing out from the crowd."
                : 'Unlock the full elite experience and find matches faster.'}
            </Text>
          </Animated.View>

          {/* ── Active Plan Card ─────────────────────────────── */}
          {isPremium && subscription && (
            <View style={styles.glassCardWrap}>
              <LinearGradient
                colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0.12)']}
                style={styles.glassCard}>
                <View style={styles.activePlanHeader}>
                  <View>
                    <Text style={styles.planName}>
                      {subscription.planName || 'Premium'}
                    </Text>
                    <Text style={styles.planMeta}>
                      Expires {formatDate(subscription.expiresAt)}
                    </Text>
                  </View>
                  <LinearGradient
                    colors={['#00F260', '#0575E6']}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 0}}
                    style={styles.activeBadge}>
                    <Text style={styles.activeBadgeText}>✦ ACTIVE</Text>
                  </LinearGradient>
                </View>

                <View style={styles.planDetailRow}>
                  <View style={styles.planDetailItem}>
                    <Text style={styles.planDetailLabel}>Paid</Text>
                    <Text style={styles.planDetailValue}>
                      {subscription.price} {subscription.currency || 'USD'}
                    </Text>
                  </View>
                  <View style={styles.planDetailDivider} />
                  <View style={styles.planDetailItem}>
                    <Text style={styles.planDetailLabel}>Status</Text>
                    <Text
                      style={[
                        styles.planDetailValue,
                        {color: '#00F260'},
                      ]}>
                      {getStatusConfig(subscription.status).label}
                    </Text>
                  </View>
                </View>

                <View style={styles.autoRenewRow}>
                  <View>
                    <Text style={styles.autoRenewTitle}>Auto-Renewal</Text>
                    <Text style={styles.autoRenewSub}>Keep benefits uninterrupted</Text>
                  </View>
                  <Switch
                    value={subscription.autoRenew !== false}
                    onValueChange={handleToggleAutoRenew}
                    trackColor={{false: 'rgba(255,255,255,0.1)', true: '#C86BFA'}}
                    thumbColor="#fff"
                  />
                </View>
              </LinearGradient>
            </View>
          )}

          {/* ── Premium Features ──────────────────────────────── */}
          <View style={styles.featuresSection}>
            <Text style={styles.sectionLabel}>✦ Your Benefits</Text>
            <View style={styles.featuresCard}>
              {FEATURES.map((f, i) => (
                <FeatureRow key={f.label} {...f} index={i} />
              ))}
            </View>
          </View>

          {/* ── CTA ──────────────────────────────────────────── */}
          <View style={styles.ctaSection}>
            <Animated.View style={{transform: [{scale: Animated.multiply(ctaScale, ctaBreathing)}]}}>
              <Pressable
                onPressIn={handleCtaPressIn}
                onPressOut={handleCtaPressOut}
                onPress={() => navigation.navigate('SubscriptionUpsell')}>
                <LinearGradient
                  colors={['#FF00CC', '#3333FF']}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 1}}
                  style={styles.ctaBtn}>
                  <Text style={styles.ctaBtnText}>
                    {isPremium ? '⭐ Upgrade My Plan' : '🚀 Join Premium Now'}
                  </Text>
                </LinearGradient>
                <View style={styles.ctaInnerHighlight} />
              </Pressable>
            </Animated.View>
          </View>

          {/* ── Cancel Button ─────────────────────────────────── */}
          {isPremium && subscription?.status === 'active' && (
            <Pressable style={styles.cancelBtn} onPress={handleCancelSubscription}>
              <Text style={styles.cancelBtnText}>Cancel Renewal</Text>
            </Pressable>
          )}

          {/* ── Billing History ───────────────────────────────── */}
          {allSubscriptions.length > 0 && (
            <View style={styles.historySection}>
              <Text style={styles.sectionLabel}>📋 Billing History</Text>
              {allSubscriptions.map((sub, idx) => {
                const cfg = getStatusConfig(sub.status);
                return (
                  <LinearGradient
                    key={sub.id || idx}
                    colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']}
                    style={styles.historyCard}>
                    <View style={styles.historyInfo}>
                      <Text style={styles.historyName}>{sub.planName || 'Premium'}</Text>
                      <Text style={styles.historyDate}>{formatDate(sub.createdAt)}</Text>
                    </View>
                    <View style={styles.historyRight}>
                      <Text style={styles.historyAmount}>
                        {sub.price} {sub.currency || 'USD'}
                      </Text>
                      <Text style={[styles.historyStatus, {color: cfg.color}]}>
                        {cfg.label}
                      </Text>
                    </View>
                  </LinearGradient>
                );
              })}
            </View>
          )}

          <View style={{height: 32}} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#1A1522'},
  safe: {flex: 1},
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
  orb1: {top: -100, left: -100},
  orb2: {bottom: -150, right: -100},

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  backIcon: {fontSize: 22, color: '#fff', fontWeight: 'bold'},
  headerTitle: {
    fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: 0.5,
  },

  scrollContent: {paddingHorizontal: 20, paddingTop: 10},

  // Hero
  heroSection: {alignItems: 'center', marginBottom: 35, paddingTop: 10},
  glowAuraWrap: {alignItems: 'center', justifyContent: 'center', marginBottom: 25},
  glowAura: {
    position: 'absolute', width: 140, height: 140, borderRadius: 70,
    backgroundColor: '#C86BFA', shadowColor: '#C86BFA',
    shadowOffset: {width: 0, height: 0}, shadowOpacity: 1, shadowRadius: 40,
  },
  iconRing: {
    width: 100, height: 100, borderRadius: 50,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#C86BFA', shadowOffset: {width: 0, height: 12},
    shadowOpacity: 0.6, shadowRadius: 25, elevation: 15,
  },
  heroIcon: {fontSize: 48},
  heroTitle: {
    fontSize: 28, fontWeight: '900', color: '#fff',
    textAlign: 'center', letterSpacing: -0.6, marginBottom: 10,
    textShadowColor: 'rgba(200,107,250,0.5)',
    textShadowOffset: {width: 0, height: 4}, textShadowRadius: 15,
  },
  heroSub: {
    fontSize: 16, color: 'rgba(255,255,255,0.7)',
    textAlign: 'center', lineHeight: 22, paddingHorizontal: 24, fontWeight: '500',
  },

  // Active plan glass card
  glassCardWrap: {
    marginBottom: 30, borderRadius: 32, overflow: 'hidden',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)',
    shadowColor: '#FF00CC', shadowOffset: {width: 0, height: 12},
    shadowOpacity: 0.5, shadowRadius: 20, elevation: 15,
  },
  glassCard: {padding: 24, borderRadius: 32},
  activePlanHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 24,
  },
  planName: {fontSize: 24, fontWeight: '900', color: '#fff'},
  planMeta: {fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 4, fontWeight: '600'},
  activeBadge: {paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20},
  activeBadgeText: {fontSize: 12, fontWeight: '900', color: '#fff', letterSpacing: 1},

  planDetailRow: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20, padding: 20, marginBottom: 24,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  planDetailItem: {flex: 1, alignItems: 'center'},
  planDetailDivider: {width: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginHorizontal: 8},
  planDetailLabel: {
    fontSize: 12, color: 'rgba(255,255,255,0.6)',
    marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '800',
  },
  planDetailValue: {fontSize: 18, fontWeight: '900', color: '#fff'},

  autoRenewRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 8,
  },
  autoRenewTitle: {fontSize: 17, fontWeight: '800', color: '#fff'},
  autoRenewSub: {fontSize: 14, color: 'rgba(255,255,255,0.55)', marginTop: 2, fontWeight: '500'},

  // Features
  featuresSection: {marginBottom: 35},
  sectionLabel: {
    fontSize: 14, fontWeight: '800', color: 'rgba(255,255,255,0.65)',
    letterSpacing: 2, textTransform: 'uppercase', marginBottom: 20,
  },
  featuresCard: {
    borderRadius: 28, padding: 8, overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.18)',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 15,
  },
  featureRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 16,
  },
  featureIconWrap: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center', marginRight: 16,
  },
  featureIcon: {fontSize: 22},
  featureTextWrap: {flex: 1},
  featureLabel: {fontSize: 16, fontWeight: '800', color: '#fff'},
  featureSub: {fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 2},
  featureCheck: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(200,107,250,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  featureCheckTxt: {fontSize: 14, color: '#FFFFFF', fontWeight: '900'},

  // CTA
  ctaSection: {alignItems: 'center', marginBottom: 20},
  ctaBtn: {
    width: SW - 40, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#C86BFA', shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.7, shadowRadius: 20, elevation: 20,
    overflow: 'hidden',
  },
  ctaBtnText: {fontSize: 18, fontWeight: '900', color: '#fff', letterSpacing: 0.8},
  ctaInnerHighlight: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: 32, pointerEvents: 'none',
  },

  // Cancel
  cancelBtn: {alignItems: 'center', paddingVertical: 14, marginBottom: 25},
  cancelBtnText: {fontSize: 15, color: 'rgba(255,255,255,0.4)', fontWeight: '700'},

  // History
  historySection: {marginBottom: 15},
  historyCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderRadius: 20, padding: 18, marginBottom: 10,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.14)',
  },
  historyInfo: {flex: 1},
  historyName: {fontSize: 16, fontWeight: '800', color: '#fff'},
  historyDate: {fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 3, fontWeight: '600'},
  historyRight: {alignItems: 'flex-end'},
  historyAmount: {fontSize: 17, fontWeight: '900', color: '#fff'},
  historyStatus: {fontSize: 12, fontWeight: '800', marginTop: 3, textTransform: 'uppercase', letterSpacing: 1},
});

export default SubscriptionManagementScreen;