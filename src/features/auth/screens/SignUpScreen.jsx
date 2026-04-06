// ─── OLD IMPLEMENTATION (preserved as comment, lines 1-462) ──────────────────
// import React, {useMemo, useState} from 'react';
// ... SignUpScreen = () => { ... } // previous implementation
// ─────────────────────────────────────────────────────────────────────────────

import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
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
  ImageBackground,
  Animated,
  SafeAreaView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { AppRoute } from '../../../constants/routes';
import { typography } from '../../../theme';
import { signUp } from '../../../services/auth';
import { useLoading } from '../../../context/LoadingContext';
import { useAuth } from '../../../context/AuthContext';
import { apiClient } from '../../../services/api/client';

const isEmailSyntaxValid = email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

const RESEND_COOLDOWN = 60; // seconds

const SignUpScreen = () => {
  const navigation = useNavigation();
  const { setLoading } = useLoading();
  const { login, getNextOnboardingScreen } = useAuth();
  const { height } = useWindowDimensions();

  // ── Form state ──────────────────────────────────────────────────────────────
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // ── Email OTP state ─────────────────────────────────────────────────────────
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef(null);
  const otpInputRefs = useRef([]);

  // ── Focus animations ────────────────────────────────────────────────────────
  const focusAnims = useRef({
    fullName: new Animated.Value(0),
    email: new Animated.Value(0),
    phone: new Animated.Value(0),
    password: new Animated.Value(0),
    confirmPassword: new Animated.Value(0),
  }).current;

  const animateFocus = anim =>
    Animated.spring(anim, { toValue: 1, useNativeDriver: false, speed: 20, bounciness: 8 }).start();

  const animateBlur = anim =>
    Animated.spring(anim, { toValue: 0, useNativeDriver: false, speed: 20, bounciness: 0 }).start();

  const getAnimatedStyle = anim => ({
    borderColor: anim.interpolate({
      inputRange: [0, 1],
      outputRange: ['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.6)'],
    }),
    backgroundColor: anim.interpolate({
      inputRange: [0, 1],
      outputRange: ['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.25)'],
    }),
  });

  // ── Countdown timer ─────────────────────────────────────────────────────────
  const startCountdown = useCallback(() => {
    setCountdown(RESEND_COOLDOWN);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const canClickVerify = useMemo(() => {
    return isEmailSyntaxValid(form.email);
  }, [form.email]);

  // ── Send OTP ────────────────────────────────────────────────────────────────
  const handleSendOtp = async () => {
    if (!canClickVerify || isSendingOtp || countdown > 0) return;

    setIsSendingOtp(true);
    setErrors(prev => ({ ...prev, email: undefined, otp: undefined }));

    try {
      await apiClient.post('/otp/email/send', { email: form.email.trim().toLowerCase() });
      setOtpSent(true);
      setOtp(['', '', '', '', '', '']);
      startCountdown();
      // 300ms delay prevents Alert/keyboard race condition
      setTimeout(() => otpInputRefs.current[0]?.focus(), 300);
    } catch (err) {
      setErrors(prev => ({ ...prev, email: err?.message || 'Failed to send verification code.' }));
    } finally {
      setIsSendingOtp(false);
    }
  };

  // ── OTP input handling ──────────────────────────────────────────────────────
  const handleOtpChange = (value, index) => {
    if (value.length > 1) {
      // Handle paste: spread digits from cursor position
      const pasted = value.slice(0, 6).split('');
      const newOtp = [...otp];
      pasted.forEach((digit, i) => {
        if (index + i < 6) newOtp[index + i] = digit;
      });
      setOtp(newOtp);
      const nextIndex = Math.min(index + pasted.length, 5);
      otpInputRefs.current[nextIndex]?.focus();
      return;
    }
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) otpInputRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // ── Verify OTP ──────────────────────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    const code = otp.join('');
    if (code.length !== 6) return;

    setIsVerifyingOtp(true);
    setErrors(prev => ({ ...prev, otp: undefined }));

    try {
      await apiClient.post('/otp/email/verify', {
        email: form.email.trim().toLowerCase(),
        code,
      });
      setIsEmailVerified(true);
      setOtpSent(false); // collapse OTP inputs
      if (countdownRef.current) clearInterval(countdownRef.current);
    } catch (err) {
      setErrors(prev => ({
        ...prev,
        otp: err?.message || 'Invalid or expired code. Please try again.',
      }));
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // ── Form validity (email must be verified) ──────────────────────────────────
  const isValid = useMemo(() => {
    const requiredFilled = form.fullName && form.email && form.phone && form.password;
    const passwordMatch = form.password && form.password === form.confirmPassword;
    return Boolean(requiredFilled && passwordMatch && ageVerified && termsAccepted && isEmailVerified);
  }, [form, ageVerified, termsAccepted, isEmailVerified]);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: undefined, api: undefined }));
    // Reset OTP state when email changes (prevents spoofing a verified address)
    if (field === 'email' && (otpSent || isEmailVerified)) {
      setOtpSent(false);
      setIsEmailVerified(false);
      setOtp(['', '', '', '', '', '']);
      if (countdownRef.current) clearInterval(countdownRef.current);
      setCountdown(0);
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!form.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!form.email.trim()) newErrors.email = 'Email is required';
    else if (!isEmailSyntaxValid(form.email)) newErrors.email = 'Enter a valid email address';
    else if (!isEmailVerified) newErrors.email = 'Please verify your email first';
    if (!form.phone.trim()) newErrors.phone = 'Phone number is required';
    if (form.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (form.password !== form.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    if (!ageVerified) newErrors.age = 'You must be 18 or older to use Pryvo';
    if (!termsAccepted) newErrors.terms = 'You must accept the Terms of Service and Privacy Policy';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
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
        // New users always have onboardingStep='BASIC_INFO' from server
        // Pass data.user directly to avoid stale-context race condition
        const nextScreen = getNextOnboardingScreen(data.user, null);
        navigation.reset({ index: 0, routes: [{ name: nextScreen }] });
      }
    } catch (error) {
      const message = error?.message || 'Failed to create your account.';
      setErrors(prev => ({ ...prev, api: message }));
    } finally {
      setIsSubmitting(false);
      setLoading(false);
    }
  };

  const isOtpComplete = otp.every(d => d !== '');

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <ImageBackground
      source={require('../../../assets/images/signup.png')}
      style={styles.bgImage}
      imageStyle={styles.bgImageCrop}
      resizeMode="cover">
      <LinearGradient
        colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />
      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 30}>
          <ScrollView
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Pryvo</Text>
              <Text style={styles.subtitle}>Create Your Account</Text>
            </View>

            {/* Glass Card */}
            <View style={styles.card}>
              {errors.api ? <Text style={styles.errorTextApi}>{errors.api}</Text> : null}

              {/* Full name */}
              <View style={styles.fieldset}>
                <Text style={styles.label}>Full name</Text>
                <Animated.View
                  style={[
                    styles.inputContainer,
                    getAnimatedStyle(focusAnims.fullName),
                    errors.fullName && styles.inputError,
                  ]}>
                  <MaterialCommunityIcons name="account" size={20} color="rgba(255,255,255,0.8)" style={styles.inputIcon} />
                  <TextInput
                    value={form.fullName}
                    onChangeText={value => handleChange('fullName', value)}
                    placeholder="e.g. Jordan Blake"
                    autoCapitalize="words"
                    style={styles.input}
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    returnKeyType="next"
                    onFocus={() => animateFocus(focusAnims.fullName)}
                    onBlur={() => animateBlur(focusAnims.fullName)}
                  />
                </Animated.View>
                {errors.fullName && <Text style={styles.errorText}>{errors.fullName}</Text>}
              </View>

              {/* Email + inline Verify button */}
              <View style={styles.fieldset}>
                <Text style={styles.label}>Email</Text>
                <Animated.View
                  style={[
                    styles.inputContainer,
                    getAnimatedStyle(focusAnims.email),
                    errors.email && !isEmailVerified && styles.inputError,
                    isEmailVerified && styles.inputVerified,
                  ]}>
                  <MaterialCommunityIcons
                    name={isEmailVerified ? 'check-circle' : 'email'}
                    size={20}
                    color={isEmailVerified ? '#86EFAC' : 'rgba(255,255,255,0.8)'}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    value={form.email}
                    onChangeText={value => handleChange('email', value)}
                    placeholder="you@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!isEmailVerified}
                    style={[styles.input, isEmailVerified && styles.inputLockedText]}
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    returnKeyType="next"
                    onFocus={() => animateFocus(focusAnims.email)}
                    onBlur={() => animateBlur(focusAnims.email)}
                  />
                  {isEmailVerified ? (
                    <View style={styles.verifiedBadge}>
                      <Text style={styles.verifiedBadgeText}>Verified ✓</Text>
                    </View>
                  ) : (
                    <Pressable
                      onPress={handleSendOtp}
                      disabled={!canClickVerify || isSendingOtp || countdown > 0}
                      style={[
                        styles.verifyBtn,
                        (!canClickVerify || countdown > 0) && styles.verifyBtnDisabled,
                      ]}>
                      {isSendingOtp ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : countdown > 0 ? (
                        <Text style={styles.verifyBtnText}>{countdown}s</Text>
                      ) : (
                        <Text style={styles.verifyBtnText}>{otpSent ? 'Resend' : 'Verify'}</Text>
                      )}
                    </Pressable>
                  )}
                </Animated.View>

                {errors.email && !isEmailVerified && (
                  <Text style={styles.errorText}>{errors.email}</Text>
                )}
              </View>

              {/* ── Inline OTP section (revealed after sendOTP) ── */}
              {otpSent && !isEmailVerified && (
                <View style={styles.otpSection}>
                  <Text style={styles.otpLabel}>
                    Enter the 6-digit code sent to {form.email}
                  </Text>
                  <View style={styles.otpRow}>
                    {otp.map((digit, index) => (
                      <TextInput
                        key={index}
                        ref={ref => (otpInputRefs.current[index] = ref)}
                        value={digit}
                        onChangeText={value => handleOtpChange(value, index)}
                        onKeyPress={e => handleOtpKeyPress(e, index)}
                        keyboardType="number-pad"
                        maxLength={6}
                        style={[
                          styles.otpInput,
                          digit && styles.otpInputFilled,
                          errors.otp && styles.otpInputError,
                        ]}
                        textAlign="center"
                        returnKeyType={index === 5 ? 'done' : 'next'}
                        onSubmitEditing={index === 5 ? handleVerifyOtp : undefined}
                      />
                    ))}
                  </View>
                  {errors.otp && <Text style={[styles.errorText, { marginBottom: 8 }]}>{errors.otp}</Text>}
                  <Pressable
                    onPress={handleVerifyOtp}
                    disabled={!isOtpComplete || isVerifyingOtp}
                    style={[
                      styles.confirmCodeBtn,
                      (!isOtpComplete || isVerifyingOtp) && styles.confirmCodeBtnDisabled,
                    ]}>
                    <LinearGradient
                      colors={isOtpComplete && !isVerifyingOtp ? ['#7C3AED', '#C084FC'] : ['#555', '#666']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.confirmCodeGradient}>
                      {isVerifyingOtp ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.confirmCodeText}>Confirm Code</Text>
                      )}
                    </LinearGradient>
                  </Pressable>
                </View>
              )}

              {/* Phone number */}
              <View style={styles.fieldset}>
                <Text style={styles.label}>Phone number</Text>
                <Animated.View
                  style={[
                    styles.inputContainer,
                    getAnimatedStyle(focusAnims.phone),
                    errors.phone && styles.inputError,
                  ]}>
                  <MaterialCommunityIcons name="phone" size={20} color="rgba(255,255,255,0.8)" style={styles.inputIcon} />
                  <TextInput
                    value={form.phone}
                    onChangeText={value => handleChange('phone', value)}
                    placeholder="1234567890"
                    keyboardType="phone-pad"
                    style={styles.input}
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    returnKeyType="next"
                    onFocus={() => animateFocus(focusAnims.phone)}
                    onBlur={() => animateBlur(focusAnims.phone)}
                  />
                </Animated.View>
                {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
              </View>

              {/* Password fields (side-by-side) */}
              <View style={styles.passwordRow}>
                <View style={styles.halfWidth}>
                  <Text style={styles.label}>Password</Text>
                  <Animated.View
                    style={[
                      styles.inputContainer,
                      getAnimatedStyle(focusAnims.password),
                      errors.password && styles.inputError,
                    ]}>
                    <MaterialCommunityIcons name="lock" size={18} color="rgba(255,255,255,0.8)" style={styles.inputIcon} />
                    <TextInput
                      value={form.password}
                      onChangeText={value => handleChange('password', value)}
                      placeholder="••••••••"
                      secureTextEntry={!showPassword}
                      style={styles.inputCompact}
                      placeholderTextColor="rgba(255,255,255,0.5)"
                      returnKeyType="next"
                      onFocus={() => animateFocus(focusAnims.password)}
                      onBlur={() => animateBlur(focusAnims.password)}
                    />
                    <Pressable
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeIcon}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <MaterialCommunityIcons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color="rgba(255,255,255,0.7)"
                      />
                    </Pressable>
                  </Animated.View>
                  {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
                </View>

                <View style={styles.halfWidth}>
                  <Text style={styles.label}>Confirm password</Text>
                  <Animated.View
                    style={[
                      styles.inputContainer,
                      getAnimatedStyle(focusAnims.confirmPassword),
                      errors.confirmPassword && styles.inputError,
                    ]}>
                    <MaterialCommunityIcons name="lock-check" size={18} color="rgba(255,255,255,0.8)" style={styles.inputIcon} />
                    <TextInput
                      value={form.confirmPassword}
                      onChangeText={value => handleChange('confirmPassword', value)}
                      placeholder="••••••••"
                      secureTextEntry={!showConfirmPassword}
                      style={styles.inputCompact}
                      placeholderTextColor="rgba(255,255,255,0.5)"
                      returnKeyType="done"
                      onSubmitEditing={handleSubmit}
                      onFocus={() => animateFocus(focusAnims.confirmPassword)}
                      onBlur={() => animateBlur(focusAnims.confirmPassword)}
                    />
                    <Pressable
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={styles.eyeIcon}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <MaterialCommunityIcons
                        name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color="rgba(255,255,255,0.7)"
                      />
                    </Pressable>
                  </Animated.View>
                  {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
                </View>
              </View>

              {/* Age confirmation */}
              <Pressable style={styles.checkboxContainer} onPress={() => setAgeVerified(!ageVerified)}>
                <View style={[styles.radioCircle, ageVerified && styles.radioCircleActive]}>
                  {ageVerified && <View style={styles.radioDot} />}
                </View>
                <View style={styles.checkboxTextContainer}>
                  <Text style={styles.checkboxText}>I confirm that I am 18 years of age or older</Text>
                </View>
              </Pressable>
              {errors.age && <Text style={styles.errorText}>{errors.age}</Text>}

              {/* Terms */}
              <Pressable style={styles.checkboxContainer} onPress={() => setTermsAccepted(!termsAccepted)}>
                <View style={[styles.radioCircle, termsAccepted && styles.radioCircleActive]}>
                  {termsAccepted && <View style={styles.radioDot} />}
                </View>
                <View style={styles.checkboxTextContainer}>
                  <Text style={styles.checkboxText}>
                    I agree to the{' '}
                    <Text style={styles.linkTextPurple} onPress={() => navigation.navigate('Terms')}>
                      Terms of Service
                    </Text>{' '}
                    and{' '}
                    <Text style={styles.linkTextPurple} onPress={() => navigation.navigate('Privacy')}>
                      Privacy Policy
                    </Text>
                  </Text>
                </View>
              </Pressable>
              {errors.terms && <Text style={styles.errorText}>{errors.terms}</Text>}

              {/* Email verification hint when not yet verified */}
              {!isEmailVerified && (
                <Text style={styles.verifyHint}>⚠ Please verify your email before creating your account.</Text>
              )}

              {/* Sign Up CTA — gated on isEmailVerified */}
              <Pressable
                style={(!isValid || isSubmitting) && styles.primaryButtonDisabled}
                onPress={handleSubmit}
                disabled={!isValid || isSubmitting}>
                <LinearGradient
                  colors={['#7C3AED', '#C084FC']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryButton}>
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Create account</Text>
                  )}
                </LinearGradient>
              </Pressable>

              {/* Sign In */}
              <Pressable
                style={styles.secondaryCta}
                onPress={() => navigation.navigate(AppRoute.SignIn)}>
                <Text style={styles.secondaryCtaText}>
                  Already have an account?{' '}
                  <Text style={styles.signInLink}>Sign in</Text>
                </Text>
              </Pressable>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  bgImage: { flex: 1, width: '100%', height: '100%' },
  bgImageCrop: { transform: [{ scale: 1.08 }, { translateY: 15 }, { translateX: 15 }] },
  flex: { flex: 1 },
  container: { flexGrow: 1, paddingTop: 60, paddingBottom: 40, paddingHorizontal: 16 },
  header: { alignItems: 'center', marginBottom: 20 },
  title: {
    fontFamily: typography.fontFamilyBold,
    fontSize: 48,
    color: '#FFFFFF',
    fontWeight: '900',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  subtitle: {
    marginTop: 4,
    fontFamily: typography.fontFamilyMedium,
    fontSize: 16,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  card: { backgroundColor: 'transparent', padding: 20 },
  fieldset: { marginBottom: 16 },
  label: {
    fontFamily: typography.fontFamilyMedium,
    fontSize: typography.body.small,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, paddingVertical: 14, fontSize: typography.body.medium, color: '#FFFFFF' },
  inputCompact: { flex: 1, paddingVertical: 12, fontSize: typography.body.small, color: '#FFFFFF' },
  inputError: { borderWidth: 1, borderColor: '#FF6B6B' },
  inputVerified: { borderWidth: 1, borderColor: '#86EFAC', backgroundColor: 'rgba(134,239,172,0.08)' },
  inputLockedText: { color: 'rgba(255,255,255,0.6)' },
  errorText: { marginTop: 4, color: '#FFB3B3', fontSize: typography.caption },
  errorTextApi: { marginBottom: 10, textAlign: 'center', color: '#FFB3B3', fontSize: typography.caption },

  // Verify button
  verifyBtn: {
    backgroundColor: '#7C3AED',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 8,
    minWidth: 66,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyBtnDisabled: { backgroundColor: 'rgba(124,58,237,0.35)' },
  verifyBtnText: { color: '#fff', fontSize: 13, fontFamily: typography.fontFamilyBold },
  verifiedBadge: {
    backgroundColor: 'rgba(134,239,172,0.18)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  verifiedBadgeText: { color: '#86EFAC', fontSize: 12, fontFamily: typography.fontFamilyBold },

  // OTP section
  otpSection: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  otpLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: typography.body.small,
    fontFamily: typography.fontFamilyMedium,
    marginBottom: 12,
    textAlign: 'center',
  },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 4 },
  otpInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 10,
    paddingVertical: 12,
    fontSize: 20,
    color: '#FFFFFF',
    backgroundColor: 'rgba(255,255,255,0.1)',
    fontFamily: typography.fontFamilyBold,
  },
  otpInputFilled: { borderColor: '#C084FC', backgroundColor: 'rgba(192,132,252,0.15)' },
  otpInputError: { borderColor: '#FF6B6B' },
  confirmCodeBtn: { marginTop: 12, borderRadius: 999, overflow: 'hidden' },
  confirmCodeBtnDisabled: { opacity: 0.5 },
  confirmCodeGradient: {
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  confirmCodeText: {
    color: '#FFFFFF',
    fontFamily: typography.fontFamilyBold,
    fontSize: typography.body.medium,
    letterSpacing: 0.3,
  },

  // Hint and existing
  verifyHint: {
    color: 'rgba(255,200,100,0.85)',
    fontSize: typography.caption,
    fontFamily: typography.fontFamilyMedium,
    textAlign: 'center',
    marginBottom: 8,
    marginTop: -4,
  },
  passwordRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  halfWidth: { flex: 1 },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, marginBottom: 8 },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  radioCircleActive: { borderColor: '#C084FC' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#C084FC' },
  checkboxTextContainer: { flex: 1 },
  checkboxText: {
    fontFamily: typography.fontFamilyRegular,
    fontSize: typography.body.small,
    color: '#FFFFFF',
    lineHeight: 20,
  },
  linkTextPurple: { color: '#C084FC', fontFamily: typography.fontFamilyMedium, textDecorationLine: 'underline' },
  primaryButton: {
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    elevation: 4,
    shadowColor: '#C084FC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  primaryButtonDisabled: { opacity: 0.5 },
  primaryButtonText: {
    color: '#FFFFFF',
    fontFamily: typography.fontFamilyBold,
    fontSize: typography.body.large,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  secondaryCta: { marginTop: 20, marginBottom: 5, alignSelf: 'center', padding: 10 },
  secondaryCtaText: { fontFamily: typography.fontFamilyMedium, fontSize: typography.body.medium, color: 'rgba(255,255,255,0.85)' },
  signInLink: { color: '#C084FC', fontFamily: typography.fontFamilyBold, fontWeight: '700' },
  eyeIcon: { padding: 4 },
});

export default SignUpScreen;