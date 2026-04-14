import React, { useState, useRef } from 'react';
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
import { colors, typography, spacing } from '../../../theme';
import { signIn } from '../../../services/auth';
import { useLoading } from '../../../context/LoadingContext';
import { useAuth } from '../../../context/AuthContext';
import apiConfig from '../../../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SignInScreen = () => {
  const navigation = useNavigation();
  const { setLoading } = useLoading();
  const { login, getNextOnboardingScreen } = useAuth();
  const { height } = useWindowDimensions();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const headerSpacing = Math.min(72, height * 0.08);
  const contentPaddingBottom = Platform.OS === 'ios' ? 70 : 50;

  // Focus animations
  const focusAnims = useRef({
    email: new Animated.Value(0),
    password: new Animated.Value(0),
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
      outputRange: ['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.9)'],
    }),
    borderTopColor: anim.interpolate({
      inputRange: [0, 1],
      outputRange: ['rgba(255,255,255,0.5)', 'rgba(255,255,255,1)'],
    }),
    backgroundColor: anim.interpolate({
      inputRange: [0, 1],
      outputRange: ['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.28)'],
    }),
    transform: [{
      scale: anim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.025],
      }),
    }],
  });

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: undefined, api: undefined }));
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
      const data = await signIn({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      if (data?.user) {
        const fetchedProfile = await login(data.user);
        
        // Navigation is now handled based on authentication status + onboarding history.
        const status = await AsyncStorage.getItem(`@pryvo_has_seen_onboarding_${data.user.id}`);
        const nextScreen = getNextOnboardingScreen(data.user, status === 'true');
        console.log('[SignIn] Navigating to next screen:', nextScreen);

        navigation.reset({
          index: 0,
          routes: [{ name: nextScreen }],
        });
      } else {
        navigation.navigate(AppRoute.Welcome);
      }
    } catch (error) {
      console.error('[SignIn] error:', error);
      const { 
        message,  
        accountLocked, 
        remainingMinutes 
      } = error?.response?.data || error || {};

      let finalMessage = message || 'Unable to sign you in right now.';
      
      if (accountLocked) {
        finalMessage = `Account locked. Please try again in ${remainingMinutes} minutes.`;
      }

      setErrors({ api: finalMessage });
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
            <Text style={styles.logoText}>Pryvo</Text>
            <Text style={styles.title}>Welcome back 👋</Text>
            <Text style={styles.subtitle}>
              Pick up where you left off with your conversations and matches.
            </Text>
          </View>

          {errors.api ? <Text style={styles.errorText}>{errors.api}</Text> : null}

          <View style={styles.fieldset}>
            <Text style={styles.label}>Email</Text>
            <Animated.View
              style={[styles.inputContainer, getAnimatedStyle(focusAnims.email), errors.email && styles.inputError]}>
              <MaterialCommunityIcons
                name="email"
                size={20}
                color="rgba(255,255,255,0.8)"
                style={styles.inputIcon}
              />
              <TextInput
                value={form.email}
                onChangeText={value => handleChange('email', value)}
                placeholder="Email"
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

          <View style={styles.fieldset}>
            <Text style={styles.label}>Password</Text>
            <Animated.View
              style={[
                styles.inputContainer,
                getAnimatedStyle(focusAnims.password),
                errors.password && styles.inputError,
              ]}>
              <MaterialCommunityIcons
                name="lock"
                size={20}
                color="rgba(255,255,255,0.8)"
                style={styles.inputIcon}
              />
              <TextInput
                value={form.password}
                onChangeText={value => handleChange('password', value)}
                placeholder="Password"
                secureTextEntry={!showPassword}
                style={styles.input}
                placeholderTextColor="rgba(255,255,255,0.5)"
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
                onFocus={() => animateFocus(focusAnims.password)}
                onBlur={() => animateBlur(focusAnims.password)}
              />
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}>
                <MaterialCommunityIcons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color="rgba(255,255,255,0.7)"
                />
              </Pressable>
            </Animated.View>
            {errors.password && (
              <Text style={styles.errorText}>{errors.password}</Text>
            )}
          </View>

          <Pressable
            style={styles.forgotPassword}
            onPress={() => navigation.navigate('ForgotPassword')}>
            <Text style={styles.forgotPasswordText}>Forgot password?</Text>
          </Pressable>

          <View style={styles.glassCard}>
            <View style={styles.actionsContainer}>
              <Pressable
                style={isSubmitting && styles.primaryButtonDisabled}
                onPress={handleSubmit}
                disabled={isSubmitting}>
                <LinearGradient
                  colors={['#7C3AED', '#C084FC']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryButton}>
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Log in</Text>
                  )}
                </LinearGradient>
              </Pressable>

              <Pressable
                style={styles.secondaryCta}
                onPress={() => navigation.navigate(AppRoute.SignUp)}>
                <Text style={styles.secondaryCtaText}>
                  Need an account?{' '}
                  <Text style={styles.secondaryCtaHighlight}>Sign up</Text>
                </Text>
              </Pressable>
            </View>
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
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  header: {
    marginBottom: spacing.xl,
  },
  logoText: {
    fontFamily: typography.fontFamilyBold,
    fontSize: 44,
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 1,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
    marginBottom: 4,
  },
  title: {
    fontFamily: typography.fontFamilyBold,
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  subtitle: {
    marginTop: spacing.xs,
    fontFamily: typography.fontFamilyRegular,
    fontSize: typography.body.medium,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  fieldset: {
    marginBottom: spacing.md,
  },
  label: {
    fontWeight: '600',
    fontSize: typography.body.small,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderTopColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 0,
    fontSize: typography.body.medium,
    color: '#FFFFFF',
  },
  inputError: {
    borderWidth: 2,
    borderColor: '#FF6B6B',
  },
  errorText: {
    marginTop: spacing.xs,
    color: '#FFD0C0',
    fontSize: typography.caption,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: spacing.xl,
  },
  forgotPasswordText: {
    fontSize: typography.body.small,
    color: '#FFFFFF',
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  glassCard: {
    backgroundColor: 'transparent',
    marginTop: spacing.xs,
  },
  actionsContainer: {
    width: '100%',
  },
  primaryButton: {
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontFamily: typography.fontFamilyBold,
    fontSize: typography.body.large,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  secondaryCta: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  secondaryCtaText: {
    fontSize: typography.body.medium,
    color: '#FFFFFF',
  },
  secondaryCtaHighlight: {
    color: '#C084FC',
    fontWeight: '700',
    fontFamily: typography.fontFamilyBold,
  },
  eyeIcon: {
    padding: spacing.xs,
  },
});

export default SignInScreen;