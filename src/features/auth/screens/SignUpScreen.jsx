// ─── OLD IMPLEMENTATION (commented out lines 1-462 preserved identically) ─────
// import React, {useMemo, useState} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Pressable,
//   TextInput,
//   KeyboardAvoidingView,
//   Platform,
//   ScrollView,
//   ActivityIndicator,
//   Switch,
//   useWindowDimensions,
// } from 'react-native';
// import {useNavigation} from '@react-navigation/native';
// import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
// import {AppRoute} from '../../../constants/routes';
// import {colors, typography, spacing} from '../../../theme';
// import {signUp} from '../../../services/auth';
// import {useLoading} from '../../../context/LoadingContext';
// import {useAuth} from '../../../context/AuthContext';
//
// const SignUpScreen = () => { ... } // See previously commented lines 1-462
// ─────────────────────────────────────────────────────────────────────────────

import React, { useMemo, useState, useRef } from 'react';
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
import { typography, spacing } from '../../../theme';
import { signUp } from '../../../services/auth';
import { useLoading } from '../../../context/LoadingContext';
import { useAuth } from '../../../context/AuthContext';

const SignUpScreen = () => {
  const navigation = useNavigation();
  const { setLoading } = useLoading();
  const { login } = useAuth();
  const { height } = useWindowDimensions();
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

  // Focus animations for each input
  const focusAnims = useRef({
    fullName: new Animated.Value(0),
    email: new Animated.Value(0),
    phone: new Animated.Value(0),
    password: new Animated.Value(0),
    confirmPassword: new Animated.Value(0),
  }).current;

  const animateFocus = anim =>
    Animated.spring(anim, {
      toValue: 1,
      useNativeDriver: false,
      speed: 20,
      bounciness: 8,
    }).start();

  const animateBlur = anim =>
    Animated.spring(anim, {
      toValue: 0,
      useNativeDriver: false,
      speed: 20,
      bounciness: 0,
    }).start();

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
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: undefined, api: undefined }));
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
        const fetchedProfile = await login(data.user);
        const nextScreen = getNextOnboardingScreen(data.user, fetchedProfile);
        navigation.reset({
          index: 0,
          routes: [{ name: nextScreen }],
        });
      }
    } catch (error) {
      const message = error?.message || 'Failed to create your account.';
      setErrors(prev => ({ ...prev, api: message }));
    } finally {
      setIsSubmitting(false);
      setLoading(false);
    }
  };

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
            
            {/* Context/Header area */}
            <View style={styles.header}>
              <Text style={styles.title}>Pryvo</Text>
              <Text style={styles.subtitle}>Create Your Account</Text>
            </View>

            {/* Glass Container */}
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
                  <MaterialCommunityIcons
                    name="account"
                    size={20}
                    color="rgba(255,255,255,0.8)"
                    style={styles.inputIcon}
                  />
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

              {/* Email */}
              <View style={styles.fieldset}>
                <Text style={styles.label}>Email</Text>
                <Animated.View
                  style={[
                    styles.inputContainer,
                    getAnimatedStyle(focusAnims.email),
                    errors.email && styles.inputError,
                  ]}>
                  <MaterialCommunityIcons
                    name="email"
                    size={20}
                    color="rgba(255,255,255,0.8)"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    value={form.email}
                    onChangeText={value => handleChange('email', value)}
                    placeholder="you@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={styles.input}
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    returnKeyType="next"
                    onFocus={() => animateFocus(focusAnims.email)}
                    onBlur={() => animateBlur(focusAnims.email)}
                  />
                </Animated.View>
                {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
              </View>

              {/* Phone number */}
              <View style={styles.fieldset}>
                <Text style={styles.label}>Phone number</Text>
                <Animated.View
                  style={[
                    styles.inputContainer,
                    getAnimatedStyle(focusAnims.phone),
                    errors.phone && styles.inputError,
                  ]}>
                  <MaterialCommunityIcons
                    name="phone"
                    size={20}
                    color="rgba(255,255,255,0.8)"
                    style={styles.inputIcon}
                  />
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

              {/* Password Section (Side-by-side) */}
              <View style={styles.passwordRow}>
                {/* Password Box */}
                <View style={styles.halfWidth}>
                  <Text style={styles.label}>Password</Text>
                  <Animated.View
                    style={[
                      styles.inputContainer,
                      getAnimatedStyle(focusAnims.password),
                      errors.password && styles.inputError,
                    ]}>
                    <MaterialCommunityIcons
                      name="lock"
                      size={18}
                      color="rgba(255,255,255,0.8)"
                      style={styles.inputIcon}
                    />
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

                {/* Confirm Password Box */}
                <View style={styles.halfWidth}>
                  <Text style={styles.label}>Confirm password</Text>
                  <Animated.View
                    style={[
                      styles.inputContainer,
                      getAnimatedStyle(focusAnims.confirmPassword),
                      errors.confirmPassword && styles.inputError,
                    ]}>
                    <MaterialCommunityIcons
                      name="lock-check"
                      size={18}
                      color="rgba(255,255,255,0.8)"
                      style={styles.inputIcon}
                    />
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
                  {errors.confirmPassword && (
                    <Text style={styles.errorText}>{errors.confirmPassword}</Text>
                  )}
                </View>
              </View>

              {/* Age Verification (Radio style) */}
              <Pressable 
                style={styles.checkboxContainer} 
                onPress={() => setAgeVerified(!ageVerified)}>
                <View style={[styles.radioCircle, ageVerified && styles.radioCircleActive]}>
                  {ageVerified && <View style={styles.radioDot} />}
                </View>
                <View style={styles.checkboxTextContainer}>
                  <Text style={styles.checkboxText}>
                    I confirm that I am 18 years of age or older
                  </Text>
                </View>
              </Pressable>
              {errors.age && <Text style={styles.errorText}>{errors.age}</Text>}

              {/* Terms Acceptance (Radio style) */}
              <Pressable 
                style={styles.checkboxContainer} 
                onPress={() => setTermsAccepted(!termsAccepted)}>
                <View style={[styles.radioCircle, termsAccepted && styles.radioCircleActive]}>
                  {termsAccepted && <View style={styles.radioDot} />}
                </View>
                <View style={styles.checkboxTextContainer}>
                  <Text style={styles.checkboxText}>
                    I agree to the{' '}
                    <Text
                      style={styles.linkTextPurple}
                      onPress={() => navigation.navigate('Terms')}>
                      Terms of Service
                    </Text>{' '}
                    and{' '}
                    <Text
                      style={styles.linkTextPurple}
                      onPress={() => navigation.navigate('Privacy')}>
                      Privacy Policy
                    </Text>
                  </Text>
                </View>
              </Pressable>
              {errors.terms && <Text style={styles.errorText}>{errors.terms}</Text>}

              {/* Purple Gradient Call-to-action */}
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

              {/* Sign In CTA */}
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
  bgImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  bgImageCrop: {
    transform: [{ scale: 1.08 }, { translateY: 15 }, { translateX: 15 }],
  },
  flex: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
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
  card: {
    backgroundColor: 'transparent',
    padding: 20,
  },
  fieldset: {
    marginBottom: 16,
  },
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
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: typography.body.medium,
    color: '#FFFFFF',
  },
  inputCompact: {
    flex: 1,
    paddingVertical: 12,
    fontSize: typography.body.small,
    color: '#FFFFFF',
  },
  inputError: {
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  errorText: {
    marginTop: 4,
    color: '#FFB3B3',
    fontSize: typography.caption,
  },
  errorTextApi: {
    marginBottom: 10,
    textAlign: 'center',
    color: '#FFB3B3',
    fontSize: typography.caption,
  },
  passwordRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  halfWidth: {
    flex: 1,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    marginBottom: 8,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  radioCircleActive: {
    borderColor: '#C084FC',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#C084FC',
  },
  checkboxTextContainer: {
    flex: 1,
  },
  checkboxText: {
    fontFamily: typography.fontFamilyRegular,
    fontSize: typography.body.small,
    color: '#FFFFFF',
    lineHeight: 20,
  },
  linkTextPurple: {
    color: '#C084FC',
    fontFamily: typography.fontFamilyMedium,
    textDecorationLine: 'underline',
  },
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
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontFamily: typography.fontFamilyBold,
    fontSize: typography.body.large,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  secondaryCta: {
    marginTop: 20,
    marginBottom: 5,
    alignSelf: 'center',
    padding: 10,
  },
  secondaryCtaText: {
    fontFamily: typography.fontFamilyMedium,
    fontSize: typography.body.medium,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  signInLink: {
    color: '#C084FC',
    fontFamily: typography.fontFamilyBold,
    fontWeight: '700',
  },
  eyeIcon: {
    padding: 4,
  },
});

export default SignUpScreen;