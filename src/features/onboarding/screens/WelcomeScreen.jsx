import React from 'react';
import {View, Text, StyleSheet, Pressable, ScrollView} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {AppRoute} from '../../../constants/routes';
import {colors, typography, spacing} from '../../../theme';

import {useAuth} from '../../../context/AuthContext';

const WelcomeScreen = () => {
  const navigation = useNavigation();
  const {logout} = useAuth();

  const handleContinue = () => {
    navigation.navigate(AppRoute.BasicInfo);
  };

  const handleLogout = async () => {
    await logout();
    // Auth state change will handle navigation back to SplashScreen/Landing
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        <Text style={styles.title}>You are one of a kind</Text>
        <Text style={styles.subtitle}>
          Let's build your profile and find your perfect match
        </Text>
      </View>

      <View style={styles.footer}>
        <Pressable style={styles.primaryButton} onPress={handleContinue}>
          <Text style={styles.primaryButtonText}>Enter basic info</Text>
        </Pressable>

        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Not you? </Text>
          <Text style={styles.logoutAction}>Sign out</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    backgroundColor: colors.background,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  title: {
    fontFamily: typography.fontFamilyBold,
    fontSize: typography.headings.h1,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  subtitle: {
    fontFamily: typography.fontFamilyRegular,
    fontSize: typography.body.large,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 18,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.surface,
    fontFamily: typography.fontFamilyBold,
    fontSize: typography.body.large,
  },
  footer: {
    marginTop: spacing.xl,
  },
  logoutButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
  },
  logoutText: {
    fontFamily: typography.fontFamilyRegular,
    fontSize: typography.body.medium,
    color: colors.textSecondary,
  },
  logoutAction: {
    fontFamily: typography.fontFamilyBold,
    fontSize: typography.body.medium,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
});

export default WelcomeScreen;
