import React, {useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import {colors, spacing, typography} from '../../../theme';
import FAQItem from '../components/FAQItem';

// Enable LayoutAnimation for Android
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Category Data Dictionary
const categoryData = {
  Account: [
    {
      question: 'How to update my profile?',
      answer:
        'Tap on your profile icon in the bottom menu, then select "Edit Profile". You can change your photos, bio, and preferences anytime.',
    },
    {
      question: 'How do I delete my account?',
      answer:
        'You can permanently delete your account in Settings → Account → Delete Account. This action cannot be undone.',
    },
    {
      question: 'How do I change my email or password?',
      answer:
        'Go to Settings → Account to securely update your email address or account password.',
    },
    {
      question: 'Can I hide my profile without deleting it?',
      answer:
        "Yes! In Settings → Account, you can Pause your account. Your profile won't be shown to new people, but you can still chat with existing matches.",
    },
  ],
  Safety: [
    {
      question: 'How do I report someone?',
      answer:
        'Open the user\'s profile or your chat with them, tap the three dots icon in the top right, and select "Report". We take reports very seriously.',
    },
    {
      question: 'How do I block a user?',
      answer:
        "You can block a user from their profile or chat by tapping the three dots icon. They won't be able to see you or contact you again.",
    },
    {
      question: 'What are the community guidelines?',
      answer:
        'We expect all users to be respectful. Harassment, explicit content, spam, and fake profiles are strictly prohibited.',
    },
    {
      question: 'Is my personal information secure?',
      answer:
        'Yes. We use industry-standard encryption to protect your data. Your exact location is never shared with other users.',
    },
  ],
  Billing: [
    {
      question: 'How do I manage my subscription?',
      answer:
        'Go to Settings → Subscription Management. From there, you can view your active plan, upgrade, or cancel your renewal.',
    },
    {
      question: 'Can I get a refund?',
      answer:
        'Refunds are handled by the app store where you made the purchase (Apple App Store or Google Play Store) according to their policies.',
    },
    {
      question: 'What do I get with a Premium subscription?',
      answer:
        'Premium users get unlimited likes, the ability to see who liked them, advanced filters, and more visibility.',
    },
  ],
  Matches: [
    {
      question: 'How does matching work?',
      answer:
        'Pryvo uses a mutual-interest system. When two people both "Like" each other, it\'s a match! You can then start a conversation.',
    },
    {
      question: 'How can I get more matches?',
      answer:
        'Make sure your profile is complete! Add clear, high-quality photos and write an engaging bio. Using Boosts can also increase your visibility.',
    },
    {
      question: 'Did my match disappear?',
      answer:
        'If a conversation is missing, the other user may have unmatched you, or their account might have been deleted or banned.',
    },
    {
      question: 'How can I change my location radius?',
      answer:
        'To see people further away (or closer), go to Settings → Distance Filter and adjust the slider.',
    },
  ],
};

const CategoryHelpScreen = () => {
  const [expandedFAQ, setExpandedFAQ] = useState(null);
  const navigation = useNavigation();
  const route = useRoute();

  const {category, icon} = route.params || {};

  const toggleFAQ = index => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedFAQ(expandedFAQ === index ? null : index);
  };

  const faqs = categoryData[category] || [];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerBar}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>
          {icon} {category}
        </Text>
        <View style={{width: 40}} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Help with {category}</Text>
          <Text style={styles.heroSubtitle}>
            Find answers to the most common questions about{' '}
            {category.toLowerCase()}.
          </Text>
        </View>

        <View style={styles.section}>
          {faqs.length > 0 ? (
            faqs.map((item, index) => (
              <FAQItem
                key={index}
                question={item.question}
                answer={item.answer}
                isExpanded={expandedFAQ === index}
                onToggle={() => toggleFAQ(index)}
              />
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                No articles found for this category.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default CategoryHelpScreen;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  backButton: {
    padding: spacing.xs,
  },
  backText: {
    fontSize: 24,
    color: colors.textPrimary,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
  },
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },
  heroSection: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: spacing.lg,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  heroTitle: {
    fontSize: 28,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  heroSubtitle: {
    fontSize: 16,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  section: {
    paddingHorizontal: spacing.xl,
    marginTop: spacing.md,
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontFamily: typography.fontFamilyMedium,
    color: colors.textTertiary,
  },
});
