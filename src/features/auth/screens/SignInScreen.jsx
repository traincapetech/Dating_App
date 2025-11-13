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
import {AppRoute} from '../../../constants/routes';
import {colors, typography, spacing} from '../../../theme';
import {signIn} from '../../../services/auth';

const SignInScreen = () => {
  const navigation = useNavigation();
  const [form, setForm] = useState({email: '', password: ''});
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field, value) => {
    setForm(prev => ({...prev, [field]: value}));
    setErrors(prev => ({...prev, [field]: undefined, api: undefined}));
  };

  const validate = () => {
    const newErrors = {};
    if (!form.email.trim()) newErrors.email = 'Email is required';
    if (!/\S+@\S+\.\S+/.test(form.email)) {
      newErrors.email = 'Enter a valid email address';
    }
    if (!form.password) newErrors.password = 'Password is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }
    setIsSubmitting(true);
    try {
      await signIn({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      Alert.alert('Signed in', 'You are now authenticated.', [
        {
          text: 'Continue',
          onPress: () => navigation.navigate(AppRoute.PhoneInput),
        },
      ]);
    } catch (error) {
      const message = error?.message || 'Unable to sign you in right now.';
      setErrors(prev => ({...prev, api: message}));
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
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>
            Pick up where you left off with your conversations and matches.
          </Text>
        </View>

        {errors.api ? <Text style={styles.errorText}>{errors.api}</Text> : null}

        <View style={styles.fieldset}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            value={form.email}
            onChangeText={value => handleChange('email', value)}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            style={[styles.input, errors.email && styles.inputError]}
            placeholderTextColor={colors.textSecondary}
            returnKeyType="next"
          />
          {errors.email && (
            <Text style={styles.errorText}>{errors.email}</Text>
          )}
        </View>

        <View style={styles.fieldset}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            value={form.password}
            onChangeText={value => handleChange('password', value)}
            placeholder="Enter your password"
            secureTextEntry
            style={[styles.input, errors.password && styles.inputError]}
            placeholderTextColor={colors.textSecondary}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />
          {errors.password && (
            <Text style={styles.errorText}>{errors.password}</Text>
          )}
        </View>

        <Pressable style={styles.forgotPassword}>
          <Text style={styles.forgotPasswordText}>Forgot password?</Text>
        </Pressable>

        <Pressable
          style={styles.primaryButton}
          onPress={handleSubmit}
          disabled={isSubmitting}>
          {isSubmitting ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <Text style={styles.primaryButtonText}>Sign in</Text>
          )}
        </Pressable>

        <Pressable
          style={styles.secondaryCta}
          onPress={() => navigation.navigate(AppRoute.SignUp)}>
          <Text style={styles.secondaryCtaText}>
            Need an account? Create one
          </Text>
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
  },
  subtitle: {
    fontFamily: typography.fontFamilyRegular,
    fontSize: typography.body.medium,
    color: colors.textSecondary,
    marginTop: spacing.sm,
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
    borderColor: colors.neutralLight,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.body.medium,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    marginTop: spacing.xs,
    color: colors.error,
    fontSize: typography.caption,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
  },
  forgotPasswordText: {
    fontFamily: typography.fontFamilyMedium,
    fontSize: typography.body.small,
    color: colors.primary,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 18,
    alignItems: 'center',
    marginTop: spacing.xl,
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

export default SignInScreen;

