import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {StripeProvider, useStripe} from '@stripe/stripe-react-native';
import {AppRoute} from '../../../constants/routes';
import {colors, typography, spacing} from '../../../theme';
import {
  getAvailablePlans,
  createPaymentOrder,
  verifyPaymentAndCreateSubscription,
  getSubscriptionStatus,
} from '../../../services/subscription/subscriptionService';

const SubscriptionUpsellScreenContent = () => {
  const navigation = useNavigation();
  const stripe = useStripe();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    loadPlans();
    loadUserId();
  }, []);

  const loadUserId = async () => {
    try {
      const userData = await AsyncStorage.getItem('@pryvo_user');
      if (userData) {
        const user = JSON.parse(userData);
        setCurrentUserId(user.id);
      }
    } catch (error) {
      console.error('Error loading user ID:', error);
    }
  };

  const loadPlans = async () => {
    try {
      setLoading(true);
      const response = await getAvailablePlans();
      if (response?.success && response?.plans) {
        setPlans(response.plans);
      } else {
        // Fallback to default plans
        setPlans([
          {id: '1week', label: '1 week', price: 899, period: 'wk'},
          {id: '1month', label: '1 month', price: 1699, period: 'mo', popular: true},
          {id: '3months', label: '3 months', price: 1166.33, period: 'mo', savings: 'Save 50%'},
          {id: '6months', label: '6 months', price: 816.5, period: 'mo', savings: 'Save 79%'},
        ]);
      }
    } catch (error) {
      console.error('Error loading plans:', error);
      // Fallback to default plans
      setPlans([
    {id: '1week', label: '1 week', price: 899, period: 'wk'},
    {id: '1month', label: '1 month', price: 1699, period: 'mo', popular: true},
        {id: '3months', label: '3 months', price: 1166.33, period: 'mo', savings: 'Save 50%'},
        {id: '6months', label: '6 months', price: 816.5, period: 'mo', savings: 'Save 79%'},
      ]);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    'Enhanced Recommendations/Access to your type',
    'Skip the line/Get recommended to matches sooner',
    'Priority likes/Your likes stay at the top of their list',
    'Send unlimited likes/Swipes',
  ];

  const handleCheckout = async () => {
    if (!selectedPlan || !currentUserId) {
      Alert.alert('Error', 'Please select a plan');
      return;
    }

    if (!stripe) {
      Alert.alert('Error', 'Stripe is not initialized. Please check your configuration.');
      return;
    }

    try {
      setProcessing(true);

      // Step 1: Create payment order from backend
      const orderResponse = await createPaymentOrder(currentUserId, selectedPlan);
      
      if (!orderResponse?.success || !orderResponse?.paymentOrder) {
        throw new Error(orderResponse?.message || 'Failed to create payment order');
      }

      const paymentOrder = orderResponse.paymentOrder;
      const gateway = paymentOrder.gateway || 'stripe';

      // Update Stripe publishable key if provided in response
      if (paymentOrder.publishableKey) {
        // Note: This won't update the provider, but the key should be set initially
        // For production, fetch key from a config endpoint before rendering
      }

      // Step 2: Handle payment based on gateway
      if (gateway === 'stripe') {
        // Initialize Stripe payment sheet
        const {error: initError} = await stripe.initPaymentSheet({
          paymentIntentClientSecret: paymentOrder.clientSecret,
          merchantDisplayName: 'Pryvo',
        });

        if (initError) {
          throw new Error(initError.message || 'Failed to initialize payment');
        }

        // Present payment sheet
        const {error: presentError} = await stripe.presentPaymentSheet();

        if (presentError) {
          if (presentError.code !== 'Canceled') {
            throw new Error(presentError.message || 'Payment failed');
          } else {
            // User canceled
            setProcessing(false);
            return;
          }
        }

        // Step 3: Payment succeeded, verify and create subscription
        const verifyResponse = await verifyPaymentAndCreateSubscription(
          currentUserId,
          selectedPlan,
          paymentOrder.orderId,
          paymentOrder.orderId, // Payment ID is same as order ID for Stripe
          '', // No signature needed for Stripe mobile
          'stripe',
          paymentOrder.currency || 'INR',
          true // auto-renew enabled
        );

        if (verifyResponse?.success) {
          Alert.alert(
            'Success!',
            'Your Premium subscription is now active!',
            [
              {
                text: 'OK',
                onPress: () => navigation.navigate(AppRoute.HomeTabs),
              },
            ]
          );
        } else {
          throw new Error(verifyResponse?.message || 'Failed to create subscription');
        }
      } else {
        // For other gateways (Razorpay, etc.), show appropriate message
        Alert.alert(
          'Payment Gateway',
          `${gateway} payment integration is coming soon. Please use Stripe for now.`
        );
      }
    } catch (error) {
      console.error('Checkout error:', error);
      Alert.alert('Error', error?.message || 'Failed to process payment. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleMaybeLater = () => {
    // Navigate to main app
    navigation.navigate(AppRoute.HomeTabs);
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>
          Subscribers go on 3X as many dates
        </Text>
        <Text style={styles.subtitle}>
          Get more matches and better connections
        </Text>
      </View>

      <View style={styles.featuresContainer}>
        {features.map((feature, index) => (
          <View key={index} style={styles.featureItem}>
            <Text style={styles.featureBullet}>•</Text>
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>

      <View style={styles.plansSection}>
        <Text style={styles.plansTitle}>
          Send and see all the likes you want
        </Text>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
        <View style={styles.plansContainer}>
          {plans.map(plan => (
            <Pressable
              key={plan.id}
              style={[
                styles.planCard,
                selectedPlan === plan.id && styles.planCardSelected,
                plan.popular && styles.planCardPopular,
              ]}
              onPress={() => setSelectedPlan(plan.id)}>
              {plan.popular && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularBadgeText}>Popular</Text>
                </View>
              )}
              {plan.savings && (
                <View style={styles.savingsBadge}>
                  <Text style={styles.savingsBadgeText}>{plan.savings}</Text>
                </View>
              )}
              <Text style={styles.planLabel}>{plan.label}</Text>
              <Text style={styles.planPrice}>
                ₹{plan.price?.toFixed(2) || plan.price}/{plan.period}
              </Text>
            </Pressable>
          ))}
        </View>
        )}
        <Text style={styles.plansNote}>
          Send unlimited likes, See everyone who likes you
        </Text>
      </View>

      <View style={styles.ctaContainer}>
        <Pressable
          style={[
            styles.primaryButton,
            (!selectedPlan || processing) && styles.primaryButtonDisabled,
          ]}
          onPress={handleCheckout}
          disabled={!selectedPlan || processing}>
          {processing ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
          <Text style={styles.primaryButtonText}>Check out</Text>
          )}
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={handleMaybeLater}>
          <Text style={styles.secondaryButtonText}>Maybe later</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    backgroundColor: colors.background,
  },
  header: {
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  title: {
    fontFamily: typography.fontFamilyBold,
    fontSize: typography.headings.h2,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontFamily: typography.fontFamilyRegular,
    fontSize: typography.body.medium,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  featuresContainer: {
    marginBottom: spacing.xxl,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  featureItem: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  featureBullet: {
    fontFamily: typography.fontFamilyBold,
    fontSize: typography.body.large,
    color: colors.primary,
    marginRight: spacing.sm,
  },
  featureText: {
    flex: 1,
    fontFamily: typography.fontFamilyRegular,
    fontSize: typography.body.medium,
    color: colors.textPrimary,
  },
  plansSection: {
    marginBottom: spacing.xl,
  },
  plansTitle: {
    fontFamily: typography.fontFamilyBold,
    fontSize: typography.body.large,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  plansContainer: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  planCard: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    position: 'relative',
  },
  planCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.secondary,
  },
  planCardPopular: {
    borderColor: colors.primary,
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: spacing.md,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularBadgeText: {
    color: colors.surface,
    fontFamily: typography.fontFamilyBold,
    fontSize: typography.caption,
  },
  savingsBadge: {
    position: 'absolute',
    top: -10,
    right: spacing.md,
    backgroundColor: colors.success,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  savingsBadgeText: {
    color: colors.surface,
    fontFamily: typography.fontFamilyBold,
    fontSize: typography.caption,
  },
  planLabel: {
    fontFamily: typography.fontFamilyBold,
    fontSize: typography.body.large,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  planPrice: {
    fontFamily: typography.fontFamilyBold,
    fontSize: typography.headings.h3,
    color: colors.primary,
  },
  plansNote: {
    fontFamily: typography.fontFamilyRegular,
    fontSize: typography.body.small,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  ctaContainer: {
    gap: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 18,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: colors.surface,
    fontFamily: typography.fontFamilyBold,
    fontSize: typography.body.large,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 18,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.primary,
    fontFamily: typography.fontFamilyMedium,
    fontSize: typography.body.large,
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// Wrapper component with StripeProvider
const SubscriptionUpsellScreen = () => {
  // Stripe publishable key - get from backend payment order response
  // For production, fetch from backend config endpoint or use env variable
  // Using test key for now - will be replaced when payment order is created
  const [publishableKey, setPublishableKey] = useState(null);

  useEffect(() => {
    // Fetch publishable key from first payment order creation
    // This is a temporary approach - ideally should have a config endpoint
    const fetchStripeKey = async () => {
      try {
        // Try to get key from a test order (or better: create a config endpoint)
        // For now, using a fallback test key
        setPublishableKey('pk_test_51RNq3aQ0qRbELDrXrWQtGUARFShAyk2osAsJOFT9Cj2lvamEsGnRqqHdrwKhkMHFkqmt2OqeX91FDQfPdWK4FHSH00Xi0LTJft');
      } catch (error) {
        console.error('Error loading Stripe key:', error);
        // Fallback test key
        setPublishableKey('pk_test_51RNq3aQ0qRbELDrXrWQtGUARFShAyk2osAsJOFT9Cj2lvamEsGnRqqHdrwKhkMHFkqmt2OqeX91FDQfPdWK4FHSH00Xi0LTJft');
      }
    };
    fetchStripeKey();
  }, []);

  if (!publishableKey) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background}}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{marginTop: 16, color: colors.textSecondary}}>Loading payment system...</Text>
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

