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
  TextInput,
} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {colors, spacing, typography} from '../../../theme';
import FAQItem from '../components/FAQItem';
import ThemeBackground from '../../../components/layout/ThemeBackground';

// Enable LayoutAnimation for Android
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const HelpCentreScreen = () => {
  const [expandedFAQ, setExpandedFAQ] = useState(null);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');

  const toggleFAQ = index => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedFAQ(expandedFAQ === index ? null : index);
  };

  const categories = [
    {name: 'Account', icon: 'account-cog-outline', color: '#4A90E2'},
    {name: 'Safety', icon: 'shield-check-outline', color: '#FE5F55'},
    {name: 'Billing', icon: 'credit-card-outline', color: '#FFD700'},
    {name: 'Matches', icon: 'fire', color: '#E25822'},
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
    <ThemeBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.backButton}>
            <MaterialCommunityIcons
              name="arrow-left"
              size={28}
              color={colors.textPrimary}
            />
          </Pressable>
          <Text style={styles.headerTitle}>Help Centre</Text>
          <View style={{width: 40}} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            {paddingBottom: insets.bottom + spacing.xl},
          ]}>
          <View style={styles.heroSection}>
            <Text style={styles.heroTitle}>How can we help?</Text>
            <View style={styles.searchBar}>
              <MaterialCommunityIcons name="magnify" size={24} color="#AAA" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search for articles..."
                placeholderTextColor="#AAA"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>

          <Text style={styles.sectionLabel}>Browse Categories</Text>
          <View style={styles.categoryGrid}>
            {categories.map((cat, index) => (
              <TouchableOpacity
                key={index}
                activeOpacity={0.8}
                style={styles.categoryCard}
                onPress={() =>
                  navigation.navigate('CategoryHelp', {
                    category: cat.name,
                    icon: cat.icon,
                  })
                }>
                <View style={[styles.iconContainer, {backgroundColor: cat.color + '15'}]}>
                  <MaterialCommunityIcons name={cat.icon} size={28} color={cat.color} />
                </View>
                <Text style={styles.categoryLabel}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionLabel}>Frequently Asked Questions</Text>
          <View style={styles.faqList}>
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
              onPress={() => navigation.navigate('ReportProblem')}
              style={styles.contactBtn}>
              <Text style={styles.contactBtnText}>Contact Support</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemeBackground>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: 'transparent',
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
  },
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },
  heroSection: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    marginBottom: spacing.md,
  },
  heroTitle: {
    fontSize: 32,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
    marginBottom: spacing.xl,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 18,
    paddingHorizontal: spacing.lg,
    paddingVertical: Platform.OS === 'ios' ? spacing.md : spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(107, 33, 168, 0.1)',
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: 16,
    fontFamily: typography.fontFamilyRegular,
    color: '#333',
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: typography.fontFamilyBold,
    color: '#6B21A8',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    paddingHorizontal: spacing.xl + 4,
    marginBottom: spacing.lg,
    marginTop: spacing.md,
  },
  categoryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
  },
  categoryCard: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(107, 33, 168, 0.1)',
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  categoryLabel: {
    fontSize: 15,
    fontFamily: typography.fontFamilySemiBold,
    color: '#333',
  },
  faqList: {
    paddingHorizontal: 0,
  },
  contactSupportCard: {
    margin: spacing.xl,
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    borderRadius: 30,
    padding: spacing.xl,
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 8,
  },
  contactInfo: {
    marginBottom: spacing.xl,
  },
  contactTitle: {
    fontSize: 22,
    fontFamily: typography.fontFamilyBold,
    color: '#FFF',
    marginBottom: spacing.sm,
  },
  contactSub: {
    fontSize: 14,
    fontFamily: typography.fontFamilyRegular,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 22,
  },
  contactBtn: {
    backgroundColor: '#FFF',
    paddingVertical: spacing.md + 2,
    borderRadius: 18,
    alignItems: 'center',
  },
  contactBtnText: {
    color: colors.primary,
    fontSize: 16,
    fontFamily: typography.fontFamilyBold,
  },
});

export default HelpCentreScreen;
