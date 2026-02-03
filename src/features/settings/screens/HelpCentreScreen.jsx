import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Linking,
  StyleSheet,
  Pressable,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {colors, spacing, typography} from '../../../theme';

// Enable LayoutAnimation for Android
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const FAQItem = ({question, answer, isExpanded, onToggle}) => {
  return (
    <View style={[styles.faqCard, isExpanded && styles.faqCardExpanded]}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onToggle}
        style={styles.faqHeader}>
        <Text
          style={[
            styles.questionText,
            isExpanded && styles.questionTextActive,
          ]}>
          {question}
        </Text>
        <Text style={[styles.chevron, isExpanded && styles.chevronActive]}>
          {isExpanded ? '−' : '+'}
        </Text>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.answerContainer}>
          <View style={styles.divider} />
          <Text style={styles.answerText}>{answer}</Text>
        </View>
      )}
    </View>
  );
};

const HelpCentreScreen = () => {
  const [expandedFAQ, setExpandedFAQ] = useState(null);
  const navigation = useNavigation();

  const toggleFAQ = index => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedFAQ(expandedFAQ === index ? null : index);
  };

  const categories = [
    {name: 'Account', icon: '👤'},
    {name: 'Safety', icon: '🛡️'},
    {name: 'Billing', icon: '💳'},
    {name: 'Matches', icon: '🔥'},
  ];

  const faqs = [
    {
      question: 'How does matching work?',
      answer:
        "Pryvo uses a mutual-interest system. When two people both 'Like' each other, it's a match! You can then start a conversation immediately.",
    },
    {
      question: 'How to update my profile?',
      answer:
        "Tap on your profile icon in the bottom menu, then select 'Edit Profile'. You can change your photos, bio, and preferences anytime.",
    },
    {
      question: 'How can I change my location?',
      answer:
        "We use your device's GPS to find people near you. To change your location radius, go to Settings → Distance Filter.",
    },
    {
      question: 'How do I delete my account?',
      answer:
        "We're sorry to see you go. You can permanently delete your account in Settings → Account → Delete Account. This action cannot be undone.",
    },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerBar}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Help Centre</Text>
        <View style={{width: 40}} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>How can we help?</Text>
          <View style={styles.searchBarPlaceholder}>
            <Text style={styles.searchIcon}>🔍</Text>
            <Text style={styles.searchPlaceholderText}>
              Search for articles...
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Browse Categories</Text>
          <View style={styles.categoryGrid}>
            {categories.map((cat, index) => (
              <TouchableOpacity key={index} style={styles.categoryCard}>
                <Text style={styles.categoryIcon}>{cat.icon}</Text>
                <Text style={styles.categoryLabel}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          {faqs.map((item, index) => (
            <FAQItem
              key={index}
              question={item.question}
              answer={item.answer}
              isExpanded={expandedFAQ === index}
              onToggle={() => toggleFAQ(index)}
            />
          ))}
        </View>

        <View style={styles.contactSupportCard}>
          <View style={styles.contactInfo}>
            <Text style={styles.contactTitle}>Still have questions?</Text>
            <Text style={styles.contactSub}>
              Reach out to our support team and we'll get back to you within 24
              hours.
            </Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => Linking.openURL('mailto:pryvo@traincapetech.in')}
            style={styles.contactBtn}>
            <Text style={styles.contactBtnText}>Contact Support</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default HelpCentreScreen;

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
    paddingVertical: spacing.xxl,
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
    fontSize: 32,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
    marginBottom: spacing.xl,
  },
  searchBarPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 15,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: spacing.sm,
  },
  searchPlaceholderText: {
    color: colors.textTertiary,
    fontSize: 16,
    fontFamily: typography.fontFamilyRegular,
  },
  section: {
    paddingHorizontal: spacing.xl,
    marginTop: spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  categoryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  categoryCard: {
    width: '48%',
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  categoryIcon: {
    fontSize: 28,
    marginBottom: spacing.sm,
  },
  categoryLabel: {
    fontSize: 15,
    fontFamily: typography.fontFamilyMedium,
    color: colors.textPrimary,
  },
  faqCard: {
    backgroundColor: colors.background,
    borderRadius: 15,
    marginBottom: spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  faqCardExpanded: {
    borderColor: colors.primary + '30',
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
  },
  questionText: {
    flex: 1,
    fontSize: 16,
    fontFamily: typography.fontFamilyMedium,
    color: colors.textPrimary,
    paddingRight: spacing.md,
  },
  questionTextActive: {
    color: colors.primary,
  },
  chevron: {
    fontSize: 20,
    color: colors.textTertiary,
    fontWeight: '300',
  },
  chevronActive: {
    color: colors.primary,
  },
  answerContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginBottom: spacing.md,
  },
  answerText: {
    fontSize: 15,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  contactSupportCard: {
    margin: spacing.xl,
    marginTop: spacing.xxl,
    backgroundColor: colors.primary,
    borderRadius: 25,
    padding: spacing.xl,
    elevation: 8,
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.2,
    shadowRadius: 15,
  },
  contactInfo: {
    marginBottom: spacing.xl,
  },
  contactTitle: {
    fontSize: 22,
    fontFamily: typography.fontFamilyBold,
    color: colors.textInverse,
    marginBottom: spacing.sm,
  },
  contactSub: {
    fontSize: 15,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textInverse,
    opacity: 0.9,
    lineHeight: 20,
  },
  contactBtn: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    borderRadius: 15,
    alignItems: 'center',
  },
  contactBtnText: {
    color: colors.primary,
    fontSize: 16,
    fontFamily: typography.fontFamilyBold,
  },
});
