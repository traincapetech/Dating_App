import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {colors, typography, spacing} from '../../../theme';
import {forgotPassword} from '../../../services/auth/authService';

const ForgotPasswordScreen = () => {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    if (!email.trim()) {
      setError('Email is required');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Enter a valid email address');
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await forgotPassword(email.trim().toLowerCase());
      
      Alert.alert(
        'Reset Code Sent',
        result.message || 'If an account exists with this email, a password reset code has been sent.',
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.navigate('ResetPassword', {email: email.trim().toLowerCase()});
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error requesting password reset:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to send reset code. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Forgot Password?</Text>
          <Text style={styles.subtitle}>
            Enter your email address and we'll send you a code to reset your password.
          </Text>
        </View>

        <View style={styles.fieldset}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={value => {
              setEmail(value);
              setError('');
            }}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            style={[styles.input, error && styles.inputError]}
            placeholderTextColor={colors.textSecondary}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            editable={!isSubmitting}
          />
          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>

        <Pressable
          style={[styles.primaryButton, isSubmitting && styles.primaryButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}>
          {isSubmitting ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <Text style={styles.primaryButtonText}>Send Reset Code</Text>
          )}
        </Pressable>

        <Pressable
          style={styles.secondaryCta}
          onPress={() => navigation.goBack()}>
          <Text style={styles.secondaryCtaText}>Back to Sign In</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    fontFamily: typography.fontFamilyBold,
    fontSize: typography.headings.h2,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontFamily: typography.fontFamilyRegular,
    fontSize: typography.body.medium,
    color: colors.textSecondary,
  },
  fieldset: {
    marginBottom: spacing.lg,
  },
  label: {
    fontFamily: typography.fontFamilyMedium,
    fontSize: typography.body.medium,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.body.medium,
    color: colors.textPrimary,
    backgroundColor: colors.inputBackground,
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    marginTop: spacing.xs,
    color: colors.error,
    fontSize: typography.caption,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 18,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: colors.surface,
    fontFamily: typography.fontFamilyBold,
    fontSize: typography.body.large,
  },
  secondaryCta: {
    marginTop: spacing.xl,
    alignSelf: 'center',
  },
  secondaryCtaText: {
    fontFamily: typography.fontFamilyMedium,
    fontSize: typography.body.medium,
    color: colors.primary,
  },
});

export default ForgotPasswordScreen;

