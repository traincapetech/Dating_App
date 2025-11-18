import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {AppRoute} from '../../../constants/routes';
import {colors, typography, spacing} from '../../../theme';

const SubscriptionUpsellScreen = () => {
  const navigation = useNavigation();
  const [selectedPlan, setSelectedPlan] = useState(null);

  const plans = [
    {id: '1week', label: '1 week', price: 899, period: 'wk'},
    {id: '1month', label: '1 month', price: 1699, period: 'mo', popular: true},
    {
      id: '3months',
      label: '3 months',
      price: 1166.33,
      period: 'mo',
      savings: 'Save 50%',
    },
    {
      id: '6months',
      label: '6 months',
      price: 816.5,
      period: 'mo',
      savings: 'Save 79%',
    },
  ];

  const features = [
    'Enhanced Recommendations/Access to your type',
    'Skip the line/Get recommended to matches sooner',
    'Priority likes/Your likes stay at the top of their list',
    'Send unlimited likes/Swipes',
  ];

  const handleCheckout = () => {
    if (selectedPlan) {
      // Navigate to checkout or process payment
      Alert.alert('Checkout', `Processing payment for ${selectedPlan} plan`);
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
                ₹{plan.price.toFixed(2)}/{plan.period}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.plansNote}>
          Send unlimited likes, See everyone who likes you
        </Text>
      </View>

      <View style={styles.ctaContainer}>
        <Pressable
          style={[
            styles.primaryButton,
            !selectedPlan && styles.primaryButtonDisabled,
          ]}
          onPress={handleCheckout}
          disabled={!selectedPlan}>
          <Text style={styles.primaryButtonText}>Check out</Text>
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
});

export default SubscriptionUpsellScreen;

