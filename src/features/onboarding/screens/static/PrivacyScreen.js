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

const PrivacyScreen = () => {
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

      <LinearGradient
        colors={[colors.primaryDark, colors.primary]}
        style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Icon name="chevron-back" size={28} color={colors.textInverse} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <Text style={styles.headerSubtitle}>
          Last Updated: {lastUpdatedDate}
        </Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.introText}>
          At Pryvo, we are committed to protecting your privacy. This Privacy
          Policy explains how we collect, use, disclose, and safeguard your
          information when you use our dating application.
        </Text>

        <Text style={styles.title}>1. Information We Collect</Text>

        <Text style={styles.subtitle}>1.1 Personal Information</Text>
        <Text style={styles.text}>
          When you create an account, we collect information such as your name,
          email address, phone number, date of birth, gender, location, photos,
          and profile information including interests, lifestyle preferences,
          and dating preferences.
        </Text>

        <Text style={styles.subtitle}>1.2 Usage Information</Text>
        <Text style={styles.text}>
          We automatically collect information about how you interact with our
          service, including your matches, messages, likes, swipes, and other
          in-app activities. We also collect device information such as IP
          address, device type, operating system, and unique device identifiers.
        </Text>

        <Text style={styles.subtitle}>1.3 Location Information</Text>
        <Text style={styles.text}>
          With your permission, we collect precise location data (GPS
          coordinates) to show you profiles of people nearby and calculate
          distances. You can control location sharing through your device
          settings.
        </Text>

        <Text style={styles.title}>2. How We Use Your Information</Text>
        <Text style={styles.text}>We use the information we collect to:</Text>
        <Text style={styles.listItem}>
          • Provide, maintain, and improve our dating service
        </Text>
        <Text style={styles.listItem}>
          • Create and manage your profile and account
        </Text>
        <Text style={styles.listItem}>
          • Match you with potential partners based on your preferences
        </Text>
        <Text style={styles.listItem}>
          • Enable communication between matched users
        </Text>
        <Text style={styles.listItem}>
          • Send you notifications about matches, messages, and other activities
        </Text>
        <Text style={styles.listItem}>
          • Detect and prevent fraud, abuse, and other harmful activities
        </Text>
        <Text style={styles.listItem}>
          • Comply with legal obligations and enforce our Terms of Service
        </Text>
        <Text style={styles.listItem}>
          • Analyze usage patterns to improve our service
        </Text>

        <Text style={styles.title}>3. Information Sharing and Disclosure</Text>

        <Text style={styles.subtitle}>3.1 With Other Users</Text>
        <Text style={styles.text}>
          When you match with another user, they can see your profile
          information, photos, and messages you send. Your exact location is not
          shared, but approximate distance may be shown.
        </Text>

        <Text style={styles.subtitle}>3.2 Service Providers</Text>
        <Text style={styles.text}>
          We may share your information with third-party service providers who
          perform services on our behalf, such as cloud storage, analytics,
          payment processing, and customer support. These providers are
          contractually obligated to protect your information.
        </Text>

        <Text style={styles.subtitle}>3.3 Legal Requirements</Text>
        <Text style={styles.text}>
          We may disclose your information if required by law, court order, or
          government regulation, or to protect the rights, property, or safety
          of Pryvo, our users, or others.
        </Text>

        <Text style={styles.subtitle}>3.4 Business Transfers</Text>
        <Text style={styles.text}>
          If we are involved in a merger, acquisition, or sale of assets, your
          information may be transferred as part of that transaction.
        </Text>

        <Text style={styles.title}>4. Data Security</Text>
        <Text style={styles.text}>
          We implement industry-standard security measures to protect your
          personal information, including encryption, secure servers, and access
          controls. However, no method of transmission over the internet or
          electronic storage is 100% secure. While we strive to protect your
          information, we cannot guarantee absolute security.
        </Text>

        <Text style={styles.title}>5. Your Rights and Choices</Text>

        <Text style={styles.subtitle}>5.1 Access and Correction</Text>
        <Text style={styles.text}>
          You can access and update most of your personal information directly
          through the app settings. You can also request a copy of your data by
          contacting us.
        </Text>

        <Text style={styles.subtitle}>5.2 Account Deletion</Text>
        <Text style={styles.text}>
          You can delete your account at any time through the app settings. When
          you delete your account, we will delete or anonymize your personal
          information, except where we are required to retain it by law or for
          legitimate business purposes.
        </Text>

        <Text style={styles.subtitle}>5.3 Location Controls</Text>
        <Text style={styles.text}>
          You can control location sharing through your device settings.
          Disabling location services may limit certain features of our service.
        </Text>

        <Text style={styles.subtitle}>5.4 Notification Preferences</Text>
        <Text style={styles.text}>
          You can manage your notification preferences in the app settings to
          control what types of notifications you receive.
        </Text>

        <Text style={styles.subtitle}>5.5 GDPR Rights (EU Users)</Text>
        <Text style={styles.text}>
          If you are located in the European Economic Area (EEA), you have
          additional rights under the General Data Protection Regulation (GDPR),
          including:
        </Text>
        <Text style={styles.listItem}>
          • Right to access your personal data
        </Text>
        <Text style={styles.listItem}>
          • Right to rectification of inaccurate data
        </Text>
        <Text style={styles.listItem}>
          • Right to erasure ("right to be forgotten")
        </Text>
        <Text style={styles.listItem}>• Right to restrict processing</Text>
        <Text style={styles.listItem}>• Right to data portability</Text>
        <Text style={styles.listItem}>• Right to object to processing</Text>
        <Text style={styles.listItem}>• Right to withdraw consent</Text>
        <Text style={styles.text}>
          To exercise these rights, please contact us at privacy@pryvo.com.
        </Text>

        <Text style={styles.title}>6. Data Retention</Text>
        <Text style={styles.text}>
          We retain your personal information for as long as your account is
          active or as needed to provide our services. We may retain certain
          information after account deletion to comply with legal obligations,
          resolve disputes, and enforce our agreements. Deleted information may
          persist in backup systems for a limited time.
        </Text>

        <Text style={styles.title}>7. Children's Privacy</Text>
        <Text style={styles.text}>
          Pryvo is intended for users who are 18 years of age or older. We do
          not knowingly collect personal information from children under 18. If
          we become aware that we have collected information from a child under
          18, we will delete that information immediately.
        </Text>

        <Text style={styles.title}>8. International Data Transfers</Text>
        <Text style={styles.text}>
          Your information may be transferred to and processed in countries
          other than your country of residence. These countries may have data
          protection laws that differ from those in your country. By using our
          service, you consent to the transfer of your information to these
          countries.
        </Text>

        <Text style={styles.title}>9. Third-Party Links</Text>
        <Text style={styles.text}>
          Our service may contain links to third-party websites or services. We
          are not responsible for the privacy practices of these third parties.
          We encourage you to read their privacy policies.
        </Text>

        <Text style={styles.title}>10. Changes to This Privacy Policy</Text>
        <Text style={styles.text}>
          We may update this Privacy Policy from time to time. We will notify
          you of any material changes by posting the new Privacy Policy in the
          app and updating the "Last Updated" date. Your continued use of the
          service after such changes constitutes acceptance of the updated
          Privacy Policy.
        </Text>

        <Text style={styles.title}>11. Contact Us</Text>
        <Text style={styles.text}>
          If you have questions, concerns, or requests regarding this Privacy
          Policy or our data practices, please contact us at:
        </Text>
        <Text style={styles.contactInfo}>
          Email: pryvo@traincapetech.in{'\n'}
          Help Centre: Available in-app
        </Text>

        <Text style={styles.lastUpdated}>Last Updated: {lastUpdatedDate}</Text>
        <View style={{height: 50}} />
      </ScrollView>
    </View>
  );
};

export default PrivacyScreen;

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
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
