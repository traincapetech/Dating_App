import React from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { colors, spacing, typography } from '../../../../theme';

const PrivacyScreen = () => {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent />

      <LinearGradient
        colors={[colors.primaryDark, colors.primary]}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <Text style={styles.headerSubtitle}>Your privacy matters to us</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>1. What We Collect</Text>
        <Text style={styles.text}>
          We collect information you provide such as name, email, photos, 
          and interactions to offer personalized experiences.
        </Text>

        <Text style={styles.title}>2. How We Use Data</Text>
        <Text style={styles.text}>
          Data is used to enhance match suggestions, maintain safety, and 
          improve overall app functionality.
        </Text>

        <Text style={styles.title}>3. Data Protection</Text>
        <Text style={styles.text}>
          All personal data is securely stored and protected with industry 
          standard encryption protocols.
        </Text>

        <Text style={styles.title}>4. Third-Party Sharing</Text>
        <Text style={styles.text}>
          We do not sell or share your data without your explicit consent 
          except when required by law.
        </Text>

        <Text style={styles.title}>5. Your Rights</Text>
        <Text style={styles.text}>
          You may request deletion of your data, access to your information, 
          or modification of account details at any time.
        </Text>

        <View style={{ height: 50 }} />
      </ScrollView>
    </View>
  );
};

export default PrivacyScreen;

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
    fontSize: 32,
    fontFamily: typography.fontFamilyBold,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    marginTop: spacing.xs,
    fontSize: 14,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  title: {
    fontSize: 20,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
    marginTop: spacing.xl,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.md,
    color: colors.textSecondary,
    fontFamily: typography.fontFamilyRegular,
  },
});
