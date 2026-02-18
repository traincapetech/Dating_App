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
  useWindowDimensions,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {AppRoute} from '../../../constants/routes';
import {colors, typography, spacing} from '../../../theme';
import {signIn} from '../../../services/auth';
import {useLoading} from '../../../context/LoadingContext';

const SignInScreen = () => {
  const navigation = useNavigation();
  const {setLoading} = useLoading();
  const {height} = useWindowDimensions();
  const [form, setForm] = useState({email: '', password: ''});
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const headerSpacing = Math.min(72, height * 0.08);
  const contentPaddingBottom = Platform.OS === 'ios' ? 70 : 50;

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
    setLoading(true);
    try {
      await signIn({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      navigation.reset({
        index: 0,
        routes: [{name: AppRoute.HomeTabs}],
      });
    } catch (error) {
      const message = error?.message || 'Unable to sign you in right now.';
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
          styles.scrollContainer,
          {
            paddingTop: headerSpacing,
            paddingBottom: contentPaddingBottom,
          },
        ]}
        keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Welcome back 👋</Text>
          <Text style={styles.subtitle}>
            Pick up where you left off with your conversations and matches.
          </Text>
        </View>

        {errors.api ? <Text style={styles.errorText}>{errors.api}</Text> : null}

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
              placeholder="Email"
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
              placeholder="Password"
              secureTextEntry
              style={styles.input}
              placeholderTextColor={colors.textSecondary}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
          </View>
          {errors.password && (
            <Text style={styles.errorText}>{errors.password}</Text>
          )}
        </View>

        <Pressable
          style={styles.forgotPassword}
          onPress={() => navigation.navigate('ForgotPassword')}>
          <Text style={styles.forgotPasswordText}>Forgot password?</Text>
        </Pressable>

        <View style={styles.actionsContainer}>
          <Pressable
            style={styles.primaryButton}
            onPress={handleSubmit}
            disabled={isSubmitting}>
            {isSubmitting ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <Text style={styles.primaryButtonText}>Log in</Text>
            )}
          </Pressable>

          <Pressable
            style={styles.secondaryCta}
            onPress={() => navigation.navigate(AppRoute.SignUp)}>
            <Text style={styles.secondaryCtaText}>
              Need an account?{' '}
              <Text style={styles.secondaryCtaHighlight}>Create one</Text>
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
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
    fontWeight: '600',
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
    paddingHorizontal: 0,
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
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: spacing.xl,
  },
  forgotPasswordText: {
    fontSize: typography.body.small,
    color: colors.primary,
    fontWeight: '600',
  },
  actionsContainer: {
    marginTop: spacing.sm,
    width: '100%',
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
  secondaryCta: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  secondaryCtaText: {
    fontSize: typography.body.medium,
    color: colors.textPrimary,
  },
  secondaryCtaHighlight: {
    color: colors.primary,
    fontWeight: '700',
  },
});

export default SignInScreen;
