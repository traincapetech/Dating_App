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
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {StripeProvider, useStripe} from '@stripe/stripe-react-native';
import * as IAP from 'react-native-iap';
import LinearGradient from 'react-native-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Config from '../../../config/api';
import {
  getAvailablePlans,
  createPaymentOrder,
  verifyPaymentAndCreateSubscription,
} from '../../../services/subscription/subscriptionService';
import {useAuth} from '../../../context/AuthContext';
import {AppRoute} from '../../../constants/routes';

/* ─── Feature list ─────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: 'heart-multiple-outline',
    title: 'Unlimited Likes',
    desc: 'Swipe with no daily limit',
  },
  {
    icon: 'eye-outline',
    title: 'See Who Liked You',
    desc: 'View all your secret admirers',
  },
  {
    icon: 'tune-vertical',
    title: 'Advanced Filters',
    desc: 'Filter by height, interests & more',
  },
  {
    icon: 'lightning-bolt-outline',
    title: '3× Priority Boost',
    desc: 'Appear at the top of the deck',
  },
  {
    icon: 'undo-variant',
    title: 'Unlimited Rewinds',
    desc: 'Take back any accidental swipe',
  },
  {
    icon: 'message-check-outline',
    title: 'Read Receipts',
    desc: 'Know when messages are seen',
  },
];

const SKUS = ['daily', '1week', '1month', '3months', '6months'];

/* ─── Inner content (needs Stripe/IAP context) ─────────────────── */
function Content() {
  const navigation = useNavigation();
  const route = useRoute();
  const fromOnboarding = route.params?.fromOnboarding;
  const {initPaymentSheet, presentPaymentSheet} = useStripe();
  const {completeOnboarding} = useAuth();

  const [plans, setPlans] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [userId, setUserId] = useState(null);
  const [iapSubscriptions, setIapSubscriptions] = useState([]);

  // IAP State
  useEffect(() => {
    let purchaseUpdateSubscription;
    let purchaseErrorSubscription;

    const initIAP = async () => {
      if (Platform.OS !== 'android') return;

      try {
        await IAP.initConnection();
        const subs = await IAP.getSubscriptions({skus: SKUS});
        setIapSubscriptions(subs);
        
        purchaseUpdateSubscription = IAP.purchaseUpdatedListener(async (purchase) => {
          const receipt = purchase.transactionReceipt;
          if (receipt && userId) {
            try {
              // Verify with backend
              const verifyRes = await verifyPaymentAndCreateSubscription(
                userId,
                purchase.productId,
                purchase.transactionId,
                purchase.purchaseToken,
                purchase.transactionReceipt,
                'in_app',
                'USD',
                true,
                {
                   platform: 'android',
                   productId: purchase.productId,
                   purchaseToken: purchase.purchaseToken,
                }
              );

              if (verifyRes.success) {
                await IAP.finishTransaction({purchase, isConsumable: false});
                showSuccessAlert();
              }
            } catch (err) {
              console.error('[IAP] Verification failed:', err);
            }
          }
        });

        purchaseErrorSubscription = IAP.purchaseErrorListener((error) => {
          console.warn('IAP error', error);
          if (error.code !== 'E_USER_CANCELLED') {
            Alert.alert('Payment Error', error.message);
          }
        });
      } catch (err) {
        console.warn('IAP init connection error', err);
      }
    };

    initIAP();

    return () => {
      if (purchaseUpdateSubscription) purchaseUpdateSubscription.remove();
      if (purchaseErrorSubscription) purchaseErrorSubscription.remove();
      if (Platform.OS === 'android') {
        IAP.endConnection();
      }
    };
  }, [userId]);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('@pryvo_user');
        if (raw) {
          const u = JSON.parse(raw);
          setUserId(u.id);
        }
        const r = await getAvailablePlans();
        if (r?.success && r.plans?.length) {
          const sorted = [...r.plans].sort(
            (a, b) => (a.rank || 0) - (b.rank || 0),
          );
          setPlans(sorted);
          const pop = sorted.find(p => p.popular) || sorted[1] || sorted[0];
          if (pop) setSelected(pop.id);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const showSuccessAlert = () => {
    Alert.alert(
      '🎉 Welcome to Premium!',
      'Your subscription is now active.',
      [
        {
          text: 'Awesome!',
          onPress: () => {
            if (fromOnboarding) navigation.replace('HomeTabs');
            else navigation.replace('SubscriptionManagement');
          },
        },
      ],
    );
  };

  const handlePurchase = async () => {
    if (!selected || !userId || processing) return;
    const plan = plans.find(p => p.id === selected);
    if (!plan) return;

    if (Platform.OS === 'android') {
       return handleGooglePlayPurchase(plan);
    } else {
       return handleStripePurchase(plan);
    }
  };

  const handleGooglePlayPurchase = async (plan) => {
    try {
      setProcessing(true);
      
      // Find the specific IAP product for this plan
      const iapSub = iapSubscriptions.find(s => s.productId === plan.id);
      
      // Extract offerToken (required for Google Play Billing 5+)
      const offerToken = iapSub?.subscriptionOfferDetails?.[0]?.offerToken;

      if (!iapSub) {
        throw new Error('Plan not found in Google Play Store. Please try again.');
      }

      await IAP.requestSubscription({
        sku: plan.id,
        ...(offerToken && {
          subscriptionOffers: [{
            sku: plan.id,
            offerToken: offerToken,
          }]
        })
      });
    } catch (err) {
      console.warn('[IAP] Purchase error:', err);
      if (err.code !== 'E_USER_CANCELLED') {
        Alert.alert('Purchase Error', err.message);
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleStripePurchase = async (plan) => {
    try {
      setProcessing(true);

      const orderRes = await createPaymentOrder(userId, plan.id);
      if (!orderRes?.success)
        throw new Error(orderRes?.message || 'Could not create order');

      const {clientSecret, orderId} = orderRes.paymentOrder;

      const {error: initError} = await initPaymentSheet({
        merchantDisplayName: 'Pryvo Dating',
        paymentIntentClientSecret: clientSecret,
        defaultBillingDetails: {
          name: 'Pryvo User',
        },
        appearance: {
          colors: {
            primary: '#9411FA',
            background: '#ffffff',
            componentBackground: '#f8f8f8',
          },
        },
      });

      if (initError) throw new Error(initError.message);

      const {error: presentError} = await presentPaymentSheet();

      if (presentError) {
        if (presentError.code !== 'Canceled') {
           Alert.alert('Payment Failed', presentError.message);
        }
        return;
      }

      const verifyRes = await verifyPaymentAndCreateSubscription(
        userId,
        plan.id,
        orderId,
        orderId,
        '',
        'stripe',
        'USD',
      );

      if (verifyRes?.success) {
        showSuccessAlert();
      } else {
        throw new Error(verifyRes?.message || 'Verification failed');
      }
    } catch (e) {
      Alert.alert(
        'Error',
        e.message || 'Something went wrong. Please try again.',
      );
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#9411FA" />
      </View>
    );
  }

  const selectedPlan = plans.find(p => p.id === selected);

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0D0D14" />

      <View style={{flex: 1}}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scroll}
          style={{flex: 1}}>
          <LinearGradient
            colors={['#1a0533', '#2d0853', '#0D0D14']}
            style={s.hero}>
            <Pressable
              onPress={() => {
                if (fromOnboarding) {
                  completeOnboarding();
                  navigation.replace(AppRoute.HomeTabs);
                } else {
                  navigation.goBack();
                }
              }}
              style={s.closeBtn}
              hitSlop={12}>
              <MaterialCommunityIcons name="close" size={22} color="#aaa" />
            </Pressable>
            <View style={s.crownWrap}>
              <MaterialCommunityIcons name="crown" size={42} color="#FFD700" />
            </View>
            <Text style={s.heroTitle}>Pryvo Premium</Text>
            <Text style={s.heroSub}>Unlock the full Pryvo experience</Text>
          </LinearGradient>

          <View style={s.featuresBlock}>
            {FEATURES.map((f, i) => (
              <View key={i} style={s.featureRow}>
                <View style={s.featureIcon}>
                  <MaterialCommunityIcons
                    name={f.icon}
                    size={20}
                    color="#9411FA"
                  />
                </View>
                <View style={{flex: 1}}>
                  <Text style={s.featureTitle}>{f.title}</Text>
                  <Text style={s.featureDesc}>{f.desc}</Text>
                </View>
                <MaterialCommunityIcons
                  name="check-circle"
                  size={18}
                  color="#22C55E"
                />
              </View>
            ))}
          </View>

          <View style={s.plansBlock}>
            <Text style={s.plansLabel}>CHOOSE YOUR PLAN</Text>
            {plans.map(plan => {
              const isSel = plan.id === selected;
              return (
                <Pressable
                  key={plan.id}
                  onPress={() => setSelected(plan.id)}
                  style={[s.planRow, isSel && s.planRowSel]}>
                  <View style={[s.radio, isSel && s.radioSel]}>
                    {isSel && <View style={s.radioInner} />}
                  </View>
                  <View style={{flex: 1, marginLeft: 14}}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                      }}>
                      <Text style={[s.planName, isSel && s.planNameSel]}>
                        {plan.name}
                      </Text>
                      {plan.popular && (
                        <View style={s.badge}>
                          <Text style={s.badgeTxt}>BEST VALUE</Text>
                        </View>
                      )}
                    </View>
                    <Text style={s.planTagline}>
                      {plan.tagline || `Save more with the ${plan.name} plan`}
                    </Text>
                  </View>
                  <Text style={[s.planPrice, isSel && s.planPriceSel]}>
                    ${plan.price}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={s.disclosureBlock}>
            <Text style={s.disclosureTxt}>
              Subscriptions auto-renew unless cancelled at least 24 hours before
              the renewal date. You can manage or cancel your subscription in
              Account → Subscription at any time.
            </Text>
            <View style={s.legalRow}>
              <Pressable onPress={() => navigation.navigate('Terms')}>
                <Text style={s.legalLink}>Terms of Service</Text>
              </Pressable>
              <Text style={s.legalDot}>·</Text>
              <Pressable onPress={() => navigation.navigate('Privacy')}>
                <Text style={s.legalLink}>Privacy Policy</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </View>

      <View style={s.footerContainer}>
        <Pressable
          onPress={handlePurchase}
          disabled={processing || !selected}
          style={({pressed}) => [
            {borderRadius: 16, overflow: 'hidden'},
            pressed && {transform: [{scale: 0.97}]},
            (processing || !selected) && {opacity: 0.6},
          ]}
        >
          <LinearGradient
            colors={['#C084FC', '#9411FA', '#6D28D9']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={s.mainBuyBtn}
          >
            {processing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={s.ctaContent}>
                <MaterialCommunityIcons name="crown" size={18} color="#FFD700" />
                <Text style={s.mainBuyBtnTxt}>Unlock Premium Now</Text>
              </View>
            )}
          </LinearGradient>
        </Pressable>

        {selectedPlan && (
          <Text style={s.footerSummaryTxt}>
            ✨ {selectedPlan.name} · ${selectedPlan.price} · starts instantly
          </Text>
        )}
      </View>
    </View>
  );
}

/* ─── Wrapper with Stripe provider ─────────────────────────────── */
export default function SubscriptionUpsellScreen(props) {
  return (
    <StripeProvider publishableKey={Config.STRIPE_PUBLISHABLE_KEY}>
      <Content {...props} />
    </StripeProvider>
  );
}

/* ─── Styles ────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#0D0D14'},
  center: {
    flex: 1,
    backgroundColor: '#0D0D14',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {paddingBottom: 150},
  hero: {
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: 40,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  closeBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 44,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffffff14',
    justifyContent: 'center',
    alignItems: 'center',
  },
  crownWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFD70018',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFD70033',
  },
  heroTitle: {fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 6},
  heroSub: {fontSize: 14, color: '#888', textAlign: 'center'},
  featuresBlock: {
    marginHorizontal: 16,
    marginBottom: 24,
    backgroundColor: '#1a1a28',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2a2a3a',
    overflow: 'hidden',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: '#9411FA14',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  featureTitle: {fontSize: 14, fontWeight: '600', color: '#e8e8f0'},
  featureDesc: {fontSize: 12, color: '#666', marginTop: 1},
  plansBlock: {marginHorizontal: 16, marginBottom: 16},
  plansLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#555',
    letterSpacing: 1.5,
    marginBottom: 12,
    marginLeft: 2,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a28',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#2a2a3a',
  },
  planRowSel: {borderColor: '#9411FA', backgroundColor: '#1e0f33'},
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSel: {borderColor: '#9411FA'},
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#9411FA',
  },
  planName: {fontSize: 15, fontWeight: '700', color: '#ccc'},
  planNameSel: {color: '#fff'},
  planTagline: {fontSize: 12, color: '#555', marginTop: 2},
  planPrice: {fontSize: 18, fontWeight: '800', color: '#888'},
  planPriceSel: {color: '#9411FA'},
  badge: {
    backgroundColor: '#9411FA',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeTxt: {fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.5},
  disclosureBlock: {marginHorizontal: 16, marginBottom: 8},
  disclosureTxt: {
    fontSize: 11,
    color: '#444',
    textAlign: 'center',
    lineHeight: 16,
  },
  legalRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  legalLink: {fontSize: 12, color: '#9411FA', fontWeight: '600'},
  legalDot: {fontSize: 14, color: '#444', marginHorizontal: 8},
  footerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#111119',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    borderTopWidth: 1,
    borderColor: '#222',
    zIndex: 999,
  },
  mainBuyBtn: {
    height: 58,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#9411FA',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 12,
  },
  ctaContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mainBuyBtnTxt: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  footerSummaryTxt: {
    fontSize: 12,
    color: '#A1A1AA',
    textAlign: 'center',
    lineHeight: 16,
  },
});
