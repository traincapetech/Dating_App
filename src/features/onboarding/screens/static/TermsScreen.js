import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import {colors, typography, spacing} from '../../../../theme';

const TermsScreen = () => {
  const navigation = useNavigation();

  const getCurrentDate = () => {
    const date = new Date();
    const options = {year: 'numeric', month: 'long'};
    return date.toLocaleDateString('en-US', options);
  };

  const lastUpdatedDate = getCurrentDate();
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent />

      {/* HEADER */}
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Icon name="chevron-back" size={28} color={colors.textInverse} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <Text style={styles.headerSubtitle}>
          Last Updated: {lastUpdatedDate}
        </Text>
      </LinearGradient>

      {/* CONTENT */}
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.introText}>
          Please read these Terms of Service ("Terms", "Terms of Service") carefully before using the Pryvo mobile application and website (the "Service") operated by Pryvo ("us", "we", or "our").
        </Text>

        <Text style={styles.title}>1. Acceptance of Terms</Text>
        <Text style={styles.text}>
          By accessing or using the Service, you agree to be bound by these Terms. If you disagree with any part of these terms, then you may not access the Service. These Terms apply to all visitors, users, and others who access or use the Service.
        </Text>
        <Text style={styles.text}>
          By using Pryvo, you represent and warrant that you have the legal capacity and authority to enter into these Terms and to use the Service in accordance with all applicable laws and regulations.
        </Text>

        <Text style={styles.title}>2. Age Requirement and Eligibility</Text>
        <Text style={styles.text}>
          You must be at least 18 years of age to use Pryvo. By creating an account, you represent and warrant that:
        </Text>
        <Text style={styles.listItem}>• You are 18 years of age or older</Text>
        <Text style={styles.listItem}>• You have the legal capacity to enter into these Terms</Text>
        <Text style={styles.listItem}>• You are not prohibited from using the Service under applicable law</Text>
        <Text style={styles.listItem}>• You have not been previously banned from using the Service</Text>
        <Text style={styles.text}>
          We reserve the right to verify your age and suspend or terminate accounts that violate this requirement. If we discover that a user is under 18, we will immediately delete their account and all associated data.
        </Text>

        <Text style={styles.title}>3. Account Registration and Security</Text>
        <Text style={styles.subtitle}>3.1 Account Creation</Text>
        <Text style={styles.text}>
          To use certain features of the Service, you must register for an account. You agree to provide accurate, current, and complete information during registration and to update such information to keep it accurate, current, and complete.
        </Text>

        <Text style={styles.subtitle}>3.2 Account Security</Text>
        <Text style={styles.text}>
          You are responsible for maintaining the confidentiality of your account credentials, including your password, and for all activities that occur under your account. You agree to:
        </Text>
        <Text style={styles.listItem}>• Immediately notify us of any unauthorized use of your account</Text>
        <Text style={styles.listItem}>• Use a strong, unique password</Text>
        <Text style={styles.listItem}>• Not share your account credentials with any third party</Text>
        <Text style={styles.listItem}>• Log out from your account when using shared devices</Text>

        <Text style={styles.subtitle}>3.3 Account Restrictions</Text>
        <Text style={styles.text}>
          You may not create multiple accounts, use another user's account, or allow others to use your account. Each user is limited to one account. We reserve the right to suspend or terminate accounts that violate this restriction.
        </Text>

        <Text style={styles.title}>4. User Conduct and Prohibited Content (Zero Tolerance Policy)</Text>
        <Text style={styles.text}>
          We have a STRICT ZERO TOLERANCE policy regarding objectionable content and abusive users. You agree to use the Service in a respectful, lawful, and appropriate manner. The following behaviors and User Generated Content (UGC) are strictly prohibited:
        </Text>
        <Text style={styles.listItem}>• Harassment, bullying, intimidation, or threatening behavior</Text>
        <Text style={styles.listItem}>• Hate speech, discrimination, or promotion of violence against any group</Text>
        <Text style={styles.listItem}>• Posting sexually explicit, pornographic, violent, illegal, or highly offensive content (Objectionable UGC)</Text>
        <Text style={styles.listItem}>• Impersonation, fraud, or misrepresentation of identity</Text>
        <Text style={styles.listItem}>• Spamming, soliciting money, or engaging in commercial activities</Text>
        <Text style={styles.listItem}>• Collecting or harvesting user information without consent</Text>
        <Text style={styles.text}>
          Any user found to be uploading Objectionable UGC or engaging in abusive behavior will face IMMEDIATE permanent account termination and removal of their content without notice or refund.
        </Text>

        <Text style={styles.title}>5. Content and Intellectual Property</Text>
        <Text style={styles.subtitle}>5.1 Your Content</Text>
        <Text style={styles.text}>
          You retain ownership of all content you post, upload, or transmit through the Service ("Your Content"). By posting Your Content, you grant us a worldwide, non-exclusive, royalty-free, perpetual, irrevocable, and sublicensable license to use, reproduce, modify, adapt, publish, translate, distribute, and display Your Content for the purpose of operating, promoting, and improving the Service.
        </Text>

        <Text style={styles.subtitle}>5.2 Content Standards</Text>
        <Text style={styles.text}>
          Your Content must be accurate, lawful, and not infringe upon the rights of others. You represent and warrant that:
        </Text>
        <Text style={styles.listItem}>• You own or have the right to post Your Content</Text>
        <Text style={styles.listItem}>• Your Content does not violate any third-party rights</Text>
        <Text style={styles.listItem}>• Your Content complies with all applicable laws</Text>
        <Text style={styles.listItem}>• Your Content is not defamatory, obscene, or harmful</Text>

        <Text style={styles.subtitle}>5.3 Our Intellectual Property</Text>
        <Text style={styles.text}>
          The Service, including its original content, features, and functionality, is owned by Pryvo and is protected by international copyright, trademark, patent, trade secret, and other intellectual property laws. You may not copy, modify, distribute, sell, or lease any part of the Service without our prior written consent.
        </Text>

        <Text style={styles.title}>6. Safety, Moderation, and Reporting</Text>
        <Text style={styles.subtitle}>6.1 Content Moderation</Text>
        <Text style={styles.text}>
          We utilize robust, effective, and ongoing moderation of all User Generated Content (UGC). We continuously review and reserve the absolute right to edit or remove any content that violates these Terms or is deemed objectionable.
        </Text>

        <Text style={styles.subtitle}>6.2 User Safety (Blocking & Reporting)</Text>
        <Text style={styles.text}>
          Pryvo provides an in-app system designed to keep you safe. You have the ability and are highly encouraged to:
        </Text>
        <Text style={styles.listItem}>• BLOCK users: You can immediately block any user to permanently prevent them from viewing your profile or messaging you.</Text>
        <Text style={styles.listItem}>• REPORT users/content: You can report abusive users or objectionable UGC directly from their profile or chat using the in-app reporting tool.</Text>

        <Text style={styles.subtitle}>6.3 Action on Reports</Text>
        <Text style={styles.text}>
          Pryvo takes all user reports seriously. We aim to review reported users and content within 24 hours. Given our zero-tolerance policy, verified reports of objectionable content or abusive behavior will result in the immediate removal of the content and permanent ejection of the offending user from the Service.
        </Text>

        <Text style={styles.title}>7. Privacy and Data Protection</Text>
        <Text style={styles.text}>
          Your use of the Service is also governed by our Privacy Policy, which is incorporated into these Terms by reference. Please review our Privacy Policy to understand how we collect, use, disclose, and protect your information. By using the Service, you consent to the collection and use of your information as described in the Privacy Policy.
        </Text>

        <Text style={styles.title}>8. Subscriptions, Payments, and Refunds</Text>
        <Text style={styles.subtitle}>8.1 Subscription Plans</Text>
        <Text style={styles.text}>
          Pryvo offers both free and premium subscription plans. Premium subscriptions provide access to additional features such as unlimited likes, advanced filters, and priority matching. Subscription fees, features, and terms are subject to change with reasonable notice.
        </Text>

        <Text style={styles.subtitle}>8.2 Payment Terms</Text>
        <Text style={styles.text}>
          Subscription fees are charged in advance on a recurring basis (weekly, monthly, or as otherwise specified). By purchasing a subscription, you authorize us to charge your payment method for the subscription fee and any applicable taxes. You are responsible for providing valid payment information.
        </Text>

        <Text style={styles.subtitle}>8.3 Auto-Renewal</Text>
        <Text style={styles.text}>
          Subscriptions automatically renew unless cancelled at least 24 hours before the end of the current subscription period. You can cancel your subscription at any time through your account settings or through your device's app store settings. Cancellation will take effect at the end of the current billing period.
        </Text>

        <Text style={styles.subtitle}>8.4 Refunds</Text>
        <Text style={styles.text}>
          Subscription fees are non-refundable except as required by law or at our sole discretion. Refund policies may vary by platform (iOS App Store, Google Play Store) and are subject to their respective terms. If you are eligible for a refund, please contact pryvo@traincapetech.in.
        </Text>

        <Text style={styles.subtitle}>8.5 Price Changes</Text>
        <Text style={styles.text}>
          We reserve the right to change subscription prices at any time. Price changes will not affect your current subscription period but will apply to subsequent renewals. We will notify you of price changes via email or through the Service.
        </Text>

        <Text style={styles.title}>9. Disclaimers and Limitation of Liability</Text>
        <Text style={styles.subtitle}>9.1 Service Availability</Text>
        <Text style={styles.text}>
          The Service is provided "as is" and "as available" without warranties of any kind, either express or implied. We do not guarantee that the Service will be uninterrupted, secure, or error-free. We reserve the right to modify, suspend, or discontinue the Service at any time without notice.
        </Text>

        <Text style={styles.subtitle}>9.2 No Guarantee of Matches</Text>
        <Text style={styles.text}>
          We do not guarantee that you will find matches, receive responses, or meet compatible people through the Service. The Service is a platform for connecting users, and we are not responsible for the success or failure of any relationships or interactions.
        </Text>

        <Text style={styles.subtitle}>9.3 Limitation of Liability</Text>
        <Text style={styles.text}>
          To the maximum extent permitted by applicable law, Pryvo, its affiliates, officers, directors, employees, and agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to:
        </Text>
        <Text style={styles.listItem}>• Loss of profits, revenue, data, or use</Text>
        <Text style={styles.listItem}>• Personal injury or property damage</Text>
        <Text style={styles.listItem}>•• Damages arising from your use or inability to use the Service</Text>
        <Text style={styles.listItem}>• Damages arising from interactions with other users</Text>
        <Text style={styles.text}>
          Our total liability to you for all claims arising from or related to the Service shall not exceed the amount you paid us in the 12 months preceding the claim, or $100, whichever is greater.
        </Text>

        <Text style={styles.title}>10. Indemnification</Text>
        <Text style={styles.text}>
          You agree to indemnify, defend, and hold harmless Pryvo, its affiliates, officers, directors, employees, and agents from and against any and all claims, damages, obligations, losses, liabilities, costs, or debt, and expenses (including attorney's fees) arising from:
        </Text>
        <Text style={styles.listItem}>• Your use of or access to the Service</Text>
        <Text style={styles.listItem}>• Your violation of these Terms</Text>
        <Text style={styles.listItem}>• Your violation of any third-party rights</Text>
        <Text style={styles.listItem}>• Your Content or any content you submit</Text>

        <Text style={styles.title}>11. Termination</Text>
        <Text style={styles.subtitle}>11.1 Termination by You</Text>
        <Text style={styles.text}>
          You may delete your account and terminate your use of the Service at any time through the app settings or by contacting pryvo@traincapetech.in. Upon termination, your right to use the Service will immediately cease.
        </Text>

        <Text style={styles.subtitle}>11.2 Termination by Us</Text>
        <Text style={styles.text}>
          We may terminate or suspend your account immediately, without prior notice or liability, for any reason, including but not limited to:
        </Text>
        <Text style={styles.listItem}>• Violation of these Terms</Text>
        <Text style={styles.listItem}>• Conduct that we believe is harmful to other users, us, or third parties</Text>
        <Text style={styles.listItem}>• Fraudulent, abusive, or illegal activity</Text>
        <Text style={styles.listItem}>• Extended periods of inactivity</Text>
        <Text style={styles.text}>
          Upon termination, your right to use the Service will immediately cease, and we may delete your account and all associated data.
        </Text>

        <Text style={styles.subtitle}>11.3 Effect of Termination</Text>
        <Text style={styles.text}>
          Upon termination, all provisions of these Terms that by their nature should survive termination shall survive, including ownership provisions, warranty disclaimers, indemnity, and limitations of liability.
        </Text>

        <Text style={styles.title}>12. Dispute Resolution</Text>
        <Text style={styles.subtitle}>12.1 Governing Law</Text>
        <Text style={styles.text}>
          These Terms shall be governed by and construed in accordance with the laws of [Your Jurisdiction], without regard to its conflict of law provisions.
        </Text>

        <Text style={styles.subtitle}>12.2 Dispute Resolution Process</Text>
        <Text style={styles.text}>
          If you have any dispute with us, you agree to first contact us at pryvo@traincapetech.in to attempt to resolve the dispute informally. If we cannot resolve the dispute within 60 days, you agree to resolve the dispute through binding arbitration in accordance with the rules of [Arbitration Organization], except where prohibited by law.
        </Text>

        <Text style={styles.subtitle}>12.3 Class Action Waiver</Text>
        <Text style={styles.text}>
          You agree that any dispute resolution proceedings will be conducted only on an individual basis and not in a class, consolidated, or representative action. If this provision is found to be unenforceable, then the entirety of this dispute resolution section shall be null and void.
        </Text>

        <Text style={styles.title}>13. Changes to Terms</Text>
        <Text style={styles.text}>
          We reserve the right to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.
        </Text>
        <Text style={styles.text}>
          By continuing to access or use the Service after those revisions become effective, you agree to be bound by the revised Terms. If you do not agree to the new Terms, please stop using the Service and delete your account.
        </Text>

        <Text style={styles.title}>14. Severability</Text>
        <Text style={styles.text}>
          If any provision of these Terms is held to be invalid or unenforceable by a court, the remaining provisions of these Terms will remain in effect. The invalid or unenforceable provision will be replaced with a valid provision that comes closest to the intent of the original provision.
        </Text>

        <Text style={styles.title}>15. Entire Agreement</Text>
        <Text style={styles.text}>
          These Terms, together with our Privacy Policy, constitute the entire agreement between you and Pryvo regarding the Service and supersede all prior agreements and understandings, whether written or oral.
        </Text>

        <Text style={styles.title}>16. Waiver</Text>
        <Text style={styles.text}>
          No waiver of any term of these Terms shall be deemed a further or continuing waiver of such term or any other term. Our failure to assert any right or provision under these Terms shall not constitute a waiver of such right or provision.
        </Text>

        <Text style={styles.title}>17. Assignment</Text>
        <Text style={styles.text}>
          You may not assign or transfer these Terms or your rights hereunder, in whole or in part, by operation of law or otherwise, without our prior written consent. We may assign these Terms or any rights hereunder without your consent.
        </Text>

        <Text style={styles.title}>18. Contact Information</Text>
        <Text style={styles.text}>
          If you have any questions about these Terms of Service, please contact us at:
        </Text>
        <Text style={styles.contactInfo}>
          Email: pryvo@traincapetech.in{'\n'}
          Help Centre: Available in-app
        </Text>

        <Text style={styles.lastUpdated}>Last Updated: {lastUpdatedDate}</Text>
        <View style={{ height: 50 }} />
      </ScrollView>
    </View>
  );
};

export default TermsScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingTop: 70,
    paddingBottom: 40,
    paddingHorizontal: spacing.xl,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 8,
  },
  headerTitle: {
    color: colors.textInverse,
    fontSize: 28,
    fontFamily: typography.fontFamilyBold,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    marginTop: spacing.xs,
    fontSize: 14,
  },
  backButton: {
    marginBottom: spacing.md,
    marginLeft: -spacing.xs,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  introText: {
    fontSize: 16,
    lineHeight: 24,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    color: colors.textPrimary,
    fontFamily: typography.fontFamilyRegular,
  },
  title: {
    fontSize: 20,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 17,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.md,
    color: colors.textSecondary,
    fontFamily: typography.fontFamilyRegular,
  },
  listItem: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.xs,
    marginLeft: spacing.md,
    color: colors.textSecondary,
    fontFamily: typography.fontFamilyRegular,
  },
  contactInfo: {
    fontSize: 15,
    lineHeight: 24,
    marginTop: spacing.sm,
    color: colors.textPrimary,
    fontFamily: typography.fontFamilyMedium,
  },
  lastUpdated: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: spacing.xl,
    color: colors.textTertiary,
    fontFamily: typography.fontFamilyRegular,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
