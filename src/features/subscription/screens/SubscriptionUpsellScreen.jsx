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
const {width, height} = Dimensions.get('window');
import { Animated, Easing } from 'react-native';

const FEATURES = [
  {icon: '🔥', title: 'Unlimited Likes', desc: 'Swipe without restrictions'},
  {icon: '👀', title: 'See Who Liked You', desc: 'No more guessing games'},
  {icon: '📍', title: 'Advanced Filters', desc: 'Height, lifestyle & more'},
  {icon: '⚡', title: '3x Priority Boost', desc: 'Be seen by more people'},
];

const SubscriptionUpsellScreenContent = () => {
  const navigation = useNavigation();
  const stripe = useStripe();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentSubscription, setCurrentSubscription] = useState(null);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const userData = await AsyncStorage.getItem('@pryvo_user');
      if (userData && userData !== 'undefined') {
        const user = JSON.parse(userData);
        setCurrentUserId(user.id);
        await Promise.all([loadPlans(), loadSubscriptionStatus(user.id)]);
      }
      setLoading(false);
    };
    init();
  }, []);

  const loadPlans = async () => {
    try {
      const response = await getAvailablePlans();
      if (response?.success && response?.plans) {
        setPlans(response.plans);
        const popular = response.plans.find(p => p.popular);
        if (popular) setSelectedPlan(popular.id);
      }
    } catch (e) { console.error(e); }
  };

  const loadSubscriptionStatus = async userId => {
    try {
      const response = await getSubscriptionStatus(userId);
      if (response?.success && response?.subscription) setCurrentSubscription(response.subscription);
    } catch (e) { console.error(e); }
  };

  const calculateProRatedPrice = plan => {
    if (!currentSubscription) return plan.price;
    const currentPlan = plans.find(p => p.id === currentSubscription.planId);
    if (!currentPlan || plan.rank <= currentPlan.rank) return plan.price;
    const now = new Date();
    const expiresAt = new Date(currentSubscription.expiresAt);
    const remainingDays = Math.max(0, Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24)));
    const credit = (remainingDays / (currentPlan.duration || 30)) * currentPlan.price;
    return Math.max(0, Math.round((plan.price - credit) * 100) / 100);
  };

  const handleCheckout = async () => {
    if (!selectedPlan || !currentUserId || !stripe) return;
    try {
      setProcessing(true);
      const orderResponse = await createPaymentOrder(currentUserId, selectedPlan);
      if (!orderResponse?.success) throw new Error(orderResponse?.message || 'Failed to create order');
      const {paymentOrder, plan} = orderResponse;
      const {error: initError} = await stripe.initPaymentSheet({
        paymentIntentClientSecret: paymentOrder.clientSecret,
        merchantDisplayName: 'Pryvo Premium',
        appearance: {colors: {primary: colors.primary}},
      });
      if (initError) throw new Error(initError.message);
      const {error: presentError} = await stripe.presentPaymentSheet();
      if (presentError) { if (presentError.code === 'Canceled') return; throw new Error(presentError.message); }
      const verifyResponse = await verifyPaymentAndCreateSubscription(currentUserId, selectedPlan, paymentOrder.orderId, paymentOrder.orderId, '', 'stripe', paymentOrder.currency || 'USD', true);
      if (verifyResponse?.success) {
        Alert.alert('Congratulations!', 'Your subscription is active!', [{text: 'Great!', onPress: () => navigation.navigate(AppRoute.HomeTabs)}]);
      } else throw new Error(verifyResponse?.message || 'Verification failed');
    } catch (error) { Alert.alert('Payment Error', error.message); }
    finally { setProcessing(false); }
  };

  if (loading) return (
    <LinearGradient colors={['#0F051C', '#281052']} style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#E0AAFF" />
    </LinearGradient>
  );

  const selectedPlanData = plans.find(p => p.id === selectedPlan);

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" transparent backgroundColor="transparent" />
      <LinearGradient colors={['#0F051C', '#281052', '#0A0014']} style={StyleSheet.absoluteFillObject} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerContainer}>
          <View style={styles.headerTop}>
            <View style={styles.pricingPill}><Text style={styles.pricingPillText}>Pricing Plan</Text></View>
            <Pressable onPress={() => navigation.goBack()} style={styles.backButton}><MaterialCommunityIcons name="close" size={20} color="#fff" /></Pressable>
          </View>
          <Text style={styles.heroTitle}>Access Premium{'\n'}Features on Every Plan</Text>
          <Text style={styles.pryvoUpgradeText}>Upgrade to <Text style={styles.pryvoGold}>Pryvo</Text> Premium</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuresScrollContainer}>
          {FEATURES.map((f, i) => (
            <LinearGradient key={i} colors={['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.02)']} style={styles.featureTile}>
              <View style={styles.featureEmojiWrapper}><Text style={styles.featureEmoji}>{f.icon}</Text></View>
              <Text style={styles.featureTileTitle} numberOfLines={2}>{f.title}</Text>
            </LinearGradient>
          ))}
        </ScrollView>

        <View style={styles.segmentContainerWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segmentContainer}>
            {plans.map(plan => (
              <Pressable key={plan.id} onPress={() => setSelectedPlan(plan.id)} style={[styles.segmentBtn, selectedPlan === plan.id && styles.segmentBtnActive]}>
                <Text style={[styles.segmentText, selectedPlan === plan.id && styles.segmentTextActive]}>{plan.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {selectedPlanData && (
          <View style={styles.giantCardContainer}>
            <LinearGradient colors={['rgba(15, 10, 20, 0.7)', 'rgba(2, 0, 5, 0.95)']} style={styles.giantCard}>
              <View style={styles.giantCardTop}>
                <Text style={styles.giantPlanName}>{selectedPlanData.name}</Text>
                <View style={styles.giantPriceRow}>
                  <Text style={styles.giantDollar}>$</Text>
                  <Text style={styles.giantPrice}>{selectedPlanData.price.toFixed(2).replace(/\.00$/, '')}</Text>
                  <Text style={styles.giantPeriod}>/{selectedPlanData.period}</Text>
                </View>
                {calculateProRatedPrice(selectedPlanData) < selectedPlanData.price && (
                  <Text style={styles.upgradeNotice}>Upgrade today for only ${calculateProRatedPrice(selectedPlanData).toFixed(2)}!</Text>
                )}
              </View>
              <View style={styles.giantActionRow}>
                <Pressable style={[styles.giantPayButton, processing && styles.payButtonDisabled]} onPress={handleCheckout} disabled={processing}>
                  <LinearGradient colors={['#6C48FB', '#8A63FF']} style={styles.giantPayGradient}>
                    {processing ? <ActivityIndicator color="#fff" /> : <View style={styles.btnContentRow}><Text style={styles.giantPayText}>Get started</Text><MaterialCommunityIcons name="arrow-top-right" size={16} color="#fff" style={styles.btnIcon} /></View>}
                  </LinearGradient>
                </Pressable>
              </View>
              <View style={styles.giantDivider} />
              <View style={styles.bulletsContainer}>
                {FEATURES.map((f, i) => <Text key={i} style={styles.bulletItem}>• {f.title}: {f.desc}</Text>)}
                <Text style={styles.bulletItem}>• Billed securely via Stripe. Cancel anytime.</Text>
              </View>
            </LinearGradient>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#0A0014' },
  scrollContent: { paddingBottom: 60 },
  headerContainer: { paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingHorizontal: 20, marginBottom: 20 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  pricingPill: { backgroundColor: 'rgba(0, 0, 0, 0.4)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)' },
  pricingPillText: { color: 'rgba(255, 255, 255, 0.6)', fontSize: 12, fontFamily: typography.fontFamilyMedium },
  backButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 28, fontFamily: typography.fontFamilyBold, color: '#fff', lineHeight: 36 },
  pryvoUpgradeText: { fontSize: 14, color: 'rgba(255, 255, 255, 0.5)', marginTop: 8, fontFamily: typography.fontFamilyMedium },
  pryvoGold: { color: '#FFD700', fontStyle: 'italic', fontFamily: typography.fontFamilyBold },
  featuresScrollContainer: { paddingHorizontal: 20, paddingBottom: 20, gap: 16 },
  featureTile: { width: 110, height: 110, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 16, padding: 12 },
  featureEmojiWrapper: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  featureEmoji: { fontSize: 24 },
  featureTileTitle: { color: 'rgba(255,255,255,0.7)', fontSize: 12, textAlign: 'center', fontFamily: typography.fontFamilyMedium },
  segmentContainerWrapper: { alignItems: 'center', marginBottom: 30, marginTop: 10 },
  segmentContainer: { flexDirection: 'row', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 30, padding: 4 },
  segmentBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 26 },
  segmentBtnActive: { backgroundColor: '#6C48FB' },
  segmentText: { color: 'rgba(255, 255, 255, 0.5)', fontSize: 13, fontFamily: typography.fontFamilySemiBold },
  segmentTextActive: { color: '#fff' },
  giantCardContainer: { paddingHorizontal: 20 },
  giantCard: { borderRadius: 32, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)', padding: 30 },
  giantCardTop: { marginBottom: 24 },
  giantPlanName: { color: '#fff', fontSize: 24, fontFamily: typography.fontFamilyBold, marginBottom: 4 },
  giantPriceRow: { flexDirection: 'row', alignItems: 'baseline' },
  giantDollar: { color: '#fff', fontSize: 26, fontFamily: typography.fontFamilyBold },
  giantPrice: { color: '#fff', fontSize: 52, fontFamily: typography.fontFamilyBold },
  giantPeriod: { color: 'rgba(255, 255, 255, 0.4)', fontSize: 16, fontFamily: typography.fontFamilyMedium },
  upgradeNotice: { color: '#10B981', fontSize: 13, fontFamily: typography.fontFamilyMedium, marginTop: 8 },
  giantActionRow: { marginBottom: 30 },
  giantPayButton: { borderRadius: 20, overflow: 'hidden', height: 48, width: 140 },
  giantPayGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  btnContentRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  giantPayText: { color: '#fff', fontSize: 14, fontFamily: typography.fontFamilySemiBold },
  btnIcon: { backgroundColor: '#fff', color: '#6C48FB', borderRadius: 8, padding: 2, overflow: 'hidden' },
  giantDivider: { height: 1, backgroundColor: 'rgba(255, 255, 255, 0.05)', marginBottom: 20 },
  bulletsContainer: { gap: 12, marginBottom: 24 },
  bulletItem: { color: 'rgba(255, 255, 255, 0.4)', fontSize: 12, fontFamily: typography.fontFamilyMedium, lineHeight: 18 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A0014' },
  payButtonDisabled: { opacity: 0.6 },
});

const SubscriptionUpsellScreen = () => {
  const [publishableKey] = useState('pk_test_51RNq3aQ0qRbELDrXrWQtGUARFShAyk2osAsJOFT9Cj2lvamEsGnRqqHdrwKhkMHFkqmt2OqeX91FDQfPdWK4FHSH00Xi0LTJft');
  return (
    <StripeProvider publishableKey={publishableKey}>
      <SubscriptionUpsellScreenContent />
    </StripeProvider>
  );
};

export default SubscriptionUpsellScreen;