import React, {useMemo, useState} from 'react';
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
  Switch,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {AppRoute} from '../../../constants/routes';
import {colors, typography, spacing} from '../../../theme';
import {signUp} from '../../../services/auth';

const SignUpScreen = () => {
  const navigation = useNavigation();
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ageVerified, setAgeVerified] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const isValid = useMemo(() => {
    const requiredFilled =
      form.fullName && form.email && form.phone && form.password;
    const passwordMatch =
      form.password && form.password === form.confirmPassword;
    return Boolean(requiredFilled && passwordMatch && ageVerified && termsAccepted);
  }, [form, ageVerified, termsAccepted]);

  const handleChange = (field, value) => {
    setForm(prev => ({...prev, [field]: value}));
    setErrors(prev => ({...prev, [field]: undefined, api: undefined}));
  };

  const validate = () => {
    const newErrors = {};
    if (!form.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!form.email.trim()) newErrors.email = 'Email is required';
    if (!/\S+@\S+\.\S+/.test(form.email)) {
      newErrors.email = 'Enter a valid email address';
    }
    if (!form.phone.trim()) newErrors.phone = 'Phone number is required';
    if (form.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    if (!ageVerified) {
      newErrors.age = 'You must be 18 or older to use Pryvo';
    }
    if (!termsAccepted) {
      newErrors.terms = 'You must accept the Terms of Service and Privacy Policy';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }
    setIsSubmitting(true);
    try {
      await signUp({
        fullName: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        password: form.password,
      });
      // Navigate to phone input for verification
      navigation.navigate(AppRoute.PhoneInput);
    } catch (error) {
      const message = error?.message || 'Failed to create your account.';
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
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Build your profile and connect with matches tailored to your energy.
          </Text>
        </View>

        {errors.api ? <Text style={styles.errorText}>{errors.api}</Text> : null}

        <View style={styles.fieldset}>
          <Text style={styles.label}>Full name</Text>
          <TextInput
            value={form.fullName}
            onChangeText={value => handleChange('fullName', value)}
            placeholder="e.g. Jordan Blake"
            autoCapitalize="words"
            style={[styles.input, errors.fullName && styles.inputError]}
            placeholderTextColor={colors.textSecondary}
            returnKeyType="next"
          />
          {errors.fullName && (
            <Text style={styles.errorText}>{errors.fullName}</Text>
          )}
        </View>

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
          <Text style={styles.label}>Phone number</Text>
          <TextInput
            value={form.phone}
            onChangeText={value => handleChange('phone', value)}
            placeholder="(555) 555-1234"
            keyboardType="phone-pad"
            style={[styles.input, errors.phone && styles.inputError]}
            placeholderTextColor={colors.textSecondary}
            returnKeyType="next"
          />
          {errors.phone && (
            <Text style={styles.errorText}>{errors.phone}</Text>
          )}
        </View>

        <View style={styles.fieldset}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            value={form.password}
            onChangeText={value => handleChange('password', value)}
            placeholder="Create a secure password"
            secureTextEntry
            style={[styles.input, errors.password && styles.inputError]}
            placeholderTextColor={colors.textSecondary}
            returnKeyType="next"
          />
          {errors.password && (
            <Text style={styles.errorText}>{errors.password}</Text>
          )}
        </View>

        <View style={styles.fieldset}>
          <Text style={styles.label}>Confirm password</Text>
          <TextInput
            value={form.confirmPassword}
            onChangeText={value => handleChange('confirmPassword', value)}
            placeholder="Re-enter your password"
            secureTextEntry
            style={[styles.input, errors.confirmPassword && styles.inputError]}
            placeholderTextColor={colors.textSecondary}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />
          {errors.confirmPassword && (
            <Text style={styles.errorText}>{errors.confirmPassword}</Text>
          )}
        </View>

        {/* Age Verification */}
        <View style={styles.checkboxContainer}>
          <Switch
            value={ageVerified}
            onValueChange={setAgeVerified}
            trackColor={{false: colors.borderLight, true: colors.primary}}
            thumbColor={colors.surface}
          />
          <View style={styles.checkboxTextContainer}>
            <Text style={styles.checkboxText}>
              I confirm that I am 18 years of age or older
            </Text>
          </View>
        </View>
        {errors.age && (
          <Text style={styles.errorText}>{errors.age}</Text>
        )}

        {/* Terms & Privacy Acceptance */}
        <View style={styles.checkboxContainer}>
          <Switch
            value={termsAccepted}
            onValueChange={setTermsAccepted}
            trackColor={{false: colors.borderLight, true: colors.primary}}
            thumbColor={colors.surface}
          />
          <View style={styles.checkboxTextContainer}>
            <Text style={styles.checkboxText}>
              I agree to the{' '}
              <Text
                style={styles.linkText}
                onPress={() => navigation.navigate('Terms')}>
                Terms of Service
              </Text>
              {' '}and{' '}
              <Text
                style={styles.linkText}
                onPress={() => navigation.navigate('Privacy')}>
                Privacy Policy
              </Text>
            </Text>
          </View>
        </View>
        {errors.terms && (
          <Text style={styles.errorText}>{errors.terms}</Text>
        )}

        <Pressable
          style={[styles.primaryButton, !isValid && styles.primaryButtonDisabled]}
          onPress={handleSubmit}
          disabled={!isValid || isSubmitting}>
          {isSubmitting ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <Text style={styles.primaryButtonText}>Create account</Text>
          )}
        </Pressable>

        <Pressable
          style={styles.secondaryCta}
          onPress={() => navigation.navigate(AppRoute.SignIn)}>
          <Text style={styles.secondaryCtaText}>
            Already have an account? Sign in
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
    marginTop: spacing.md,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
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
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
  },
  checkboxTextContainer: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  checkboxText: {
    fontFamily: typography.fontFamilyRegular,
    fontSize: typography.body.small,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  linkText: {
    color: colors.primary,
    fontFamily: typography.fontFamilyMedium,
    textDecorationLine: 'underline',
  },
});

export default SignUpScreen;

