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
  Switch,
  useWindowDimensions,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {AppRoute} from '../../../constants/routes';
import {colors, typography, spacing} from '../../../theme';
import {signUp} from '../../../services/auth';
import {useLoading} from '../../../context/LoadingContext';
import {useAuth} from '../../../context/AuthContext';

const SignUpScreen = () => {
  const navigation = useNavigation();
  const {setLoading} = useLoading();
  const {login} = useAuth();
  const {height} = useWindowDimensions();
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

  const headerSpacing = Math.min(72, height * 0.08);
  const contentPaddingBottom = Platform.OS === 'ios' ? 70 : 50;

  const isValid = useMemo(() => {
    const requiredFilled =
      form.fullName && form.email && form.phone && form.password;
    const passwordMatch =
      form.password && form.password === form.confirmPassword;
    return Boolean(
      requiredFilled && passwordMatch && ageVerified && termsAccepted,
    );
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
      newErrors.terms =
        'You must accept the Terms of Service and Privacy Policy';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }
    setIsSubmitting(true);
    setLoading(true);
    try {
      const data = await signUp({
        fullName: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        password: form.password,
      });
      if (data?.user) {
        await login(data.user);
      }
      navigation.navigate(AppRoute.Welcome);
    } catch (error) {
      const message = error?.message || 'Failed to create your account.';
      setErrors(prev => ({...prev, api: message}));
    } finally {
      setIsSubmitting(false);
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 40}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: headerSpacing,
            paddingBottom: contentPaddingBottom,
          },
        ]}
        keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Create Account 👋</Text>
          <Text style={styles.subtitle}>
            Build your profile and connect with matches tailored to your energy.
          </Text>
        </View>

        {errors.api ? <Text style={styles.errorText}>{errors.api}</Text> : null}

        <View style={styles.fieldset}>
          <Text style={styles.label}>Full name</Text>
          <View
            style={[
              styles.inputContainer,
              errors.fullName && styles.inputError,
            ]}>
            <MaterialCommunityIcons
              name="account"
              size={20}
              color={colors.textPrimary}
              style={styles.inputIcon}
            />
            <TextInput
              value={form.fullName}
              onChangeText={value => handleChange('fullName', value)}
              placeholder="e.g. Jordan Blake"
              autoCapitalize="words"
              style={styles.input}
              placeholderTextColor={colors.textSecondary}
              returnKeyType="next"
            />
          </View>
          {errors.fullName && (
            <Text style={styles.errorText}>{errors.fullName}</Text>
          )}
        </View>

        <View style={styles.fieldset}>
          <Text style={styles.label}>Email</Text>
          <View
            style={[styles.inputContainer, errors.email && styles.inputError]}>
            <MaterialCommunityIcons
              name="email"
              size={20}
              color={colors.textPrimary}
              style={styles.inputIcon}
            />
            <TextInput
              value={form.email}
              onChangeText={value => handleChange('email', value)}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
              placeholderTextColor={colors.textSecondary}
              returnKeyType="next"
            />
          </View>
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
        </View>

        <View style={styles.fieldset}>
          <Text style={styles.label}>Phone number</Text>
          <View
            style={[styles.inputContainer, errors.phone && styles.inputError]}>
            <MaterialCommunityIcons
              name="phone"
              size={20}
              color={colors.textPrimary}
              style={styles.inputIcon}
            />
            <TextInput
              value={form.phone}
              onChangeText={value => handleChange('phone', value)}
              placeholder="(555) 555-1234"
              keyboardType="phone-pad"
              style={styles.input}
              placeholderTextColor={colors.textSecondary}
              returnKeyType="next"
            />
          </View>
          {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
        </View>

        <View style={styles.fieldset}>
          <Text style={styles.label}>Password</Text>
          <View
            style={[
              styles.inputContainer,
              errors.password && styles.inputError,
            ]}>
            <MaterialCommunityIcons
              name="lock"
              size={20}
              color={colors.textPrimary}
              style={styles.inputIcon}
            />
            <TextInput
              value={form.password}
              onChangeText={value => handleChange('password', value)}
              placeholder="Create a secure password"
              secureTextEntry
              style={styles.input}
              placeholderTextColor={colors.textSecondary}
              returnKeyType="next"
            />
          </View>
          {errors.password && (
            <Text style={styles.errorText}>{errors.password}</Text>
          )}
        </View>

        <View style={styles.fieldset}>
          <Text style={styles.label}>Confirm password</Text>
          <View
            style={[
              styles.inputContainer,
              errors.confirmPassword && styles.inputError,
            ]}>
            <MaterialCommunityIcons
              name="lock-check"
              size={20}
              color={colors.textPrimary}
              style={styles.inputIcon}
            />
            <TextInput
              value={form.confirmPassword}
              onChangeText={value => handleChange('confirmPassword', value)}
              placeholder="Re-enter your password"
              secureTextEntry
              style={styles.input}
              placeholderTextColor={colors.textSecondary}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
          </View>
          {errors.confirmPassword && (
            <Text style={styles.errorText}>{errors.confirmPassword}</Text>
          )}
        </View>

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
        {errors.age && <Text style={styles.errorText}>{errors.age}</Text>}

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
              </Text>{' '}
              and{' '}
              <Text
                style={styles.linkText}
                onPress={() => navigation.navigate('Privacy')}>
                Privacy Policy
              </Text>
            </Text>
          </View>
        </View>
        {errors.terms && <Text style={styles.errorText}>{errors.terms}</Text>}

        <Pressable
          style={[
            styles.primaryButton,
            (!isValid || isSubmitting) && styles.primaryButtonDisabled,
          ]}
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
            Already have an account?{' '}
            <Text className="text-primary font-bold">Sign in</Text>
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
    flexGrow: 1,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    fontFamily: typography.fontFamilyBold,
    fontSize: typography.headings.h2,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: spacing.sm,
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
    marginBottom: spacing.md,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.inputBackground,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: typography.body.medium,
    color: colors.textPrimary,
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
    color: colors.textPrimary,
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
    color: colors.textPrimary,
    fontFamily: typography.fontFamilyMedium,
    textDecorationLine: 'underline',
  },
});

export default SignUpScreen;
