import React from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { colors, typography, spacing } from '../../../../theme';

const TermsScreen = () => {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent />

      {/* HEADER */}
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <Text style={styles.headerSubtitle}>
          Updated January 2025
        </Text>
      </LinearGradient>

      {/* CONTENT */}
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>1. Introduction</Text>
        <Text style={styles.text}>
          Welcome to Pryvo. By accessing or using our app, you agree to comply 
          with and be bound by these Terms of Service.
        </Text>

        <Text style={styles.title}>2. User Responsibilities</Text>
        <Text style={styles.text}>
          You agree to use the service respectfully, avoid harmful content, and 
          comply with community guidelines at all times.
        </Text>

        <Text style={styles.title}>3. Account Usage</Text>
        <Text style={styles.text}>
          You are responsible for maintaining the confidentiality of your 
          account and all activities under it.
        </Text>

        <Text style={styles.title}>4. Safety & Conduct</Text>
        <Text style={styles.text}>
          Pryvo reserves the right to suspend accounts involved in harassment, 
          impersonation, or any form of abuse.
        </Text>

        <Text style={styles.title}>5. Changes to Terms</Text>
        <Text style={styles.text}>
          We may update these terms periodically. Continued use of the app 
          implies acceptance of the updated terms.
        </Text>

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
