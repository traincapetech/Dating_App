import React, {useEffect, useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ScrollView,
  useWindowDimensions,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import Video from 'react-native-video';
import LinearGradient from 'react-native-linear-gradient';
import {colors, typography} from '../../../theme';
import {AppRoute} from '../../../constants/routes';
import {googleSignIn} from '../../../services/auth/authService';
import {useAuth} from '../../../context/AuthContext';
import google from '../../../assets/images/google.png';

// Premium Animated Button Wrapper
const AnimatedPressable = ({onPress, style, children, disabled, buttonStyle}) => {
  const scaleValue = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 20,
      bounciness: 5,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 5,
    }).start();
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      disabled={disabled}
      style={style}>
      <Animated.View style={[buttonStyle, {transform: [{scale: scaleValue}]}]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

const SplashScreen = ({navigation}) => {
  const {width, height} = useWindowDimensions();
  const {isAuthenticated, profile, loading: authLoading} = useAuth();
  
  // Sizing logic
  const heroImageSize = Math.min(width * 0.4, 180);
  const heroFontSize = Math.min(36, Math.max(28, width * 0.09));
  const bodyFontSize = Math.min(16, Math.max(14, width * 0.045));
  const heroSpacingTop = height * 0.1;
  const actionCardWidth = Math.min(400, width - 32);

  const [googleLoading, setGoogleLoading] = useState(false);

  // Animations
  const uiFadeAnim = useRef(new Animated.Value(0)).current;
  const uiTranslateY = useRef(new Animated.Value(40)).current;

  // Trigger load animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(uiFadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(uiTranslateY, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Auth Routing logic (UNTOUCHED constraint)
  useEffect(() => {
    let timer;
    if (!authLoading) {
      timer = setTimeout(() => {
        if (isAuthenticated) {
          if (profile) {
            console.log('[SplashScreen] Session found with profile, navigating to Home');
            navigation?.reset({index: 0, routes: [{name: AppRoute.HomeTabs}]});
          } else {
            console.log('[SplashScreen] Session found but no profile, navigating to Onboarding');
            navigation?.reset({index: 0, routes: [{name: AppRoute.Welcome}]});
          }
        }
      }, 1500);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [authLoading, isAuthenticated, profile, navigation]);

  const handleCreateAccount = () => {
    navigation?.navigate(AppRoute.SignIn);
  };

  const handleSignIn = () => {
    navigation?.navigate(AppRoute.SignUp);
  };

  const handleGoogleSignIn = async () => {
    if (googleLoading) return;
    setGoogleLoading(true);
    try {
      const result = await googleSignIn();
      if (result?.tokens) {
        if (result.isNewUser) {
          navigation?.reset({index: 0, routes: [{name: AppRoute.BasicInfo}]});
        } else {
          navigation?.reset({index: 0, routes: [{name: AppRoute.HomeTabs}]});
        }
      }
    } catch (error) {
      console.error('Google Sign-In error:', error);
      const isCancelled = error?.code === 'SIGN_IN_CANCELLED' || error?.message?.includes('cancel');
      if (!isCancelled) {
        Alert.alert('Sign-In Failed', error?.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Background Video - Disabled for emulator stability testing */}
      {/* <Video
        source={require('../../../assets/videos/landing.mp4')}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
        repeat={true}
        muted={true}
        paused={true} // TEST: Pause video to troubleshoot emulator crash
        playWhenInactive={true}
        shutterColor="transparent"
      /> */}
      
      {/* Dark overlay for readability */}
      <LinearGradient
        colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.8)']}
        style={StyleSheet.absoluteFillObject}
      />

      <SafeAreaView style={styles.safeArea}>
        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, {justifyContent: 'flex-end'}]}
          style={{
            opacity: uiFadeAnim,
            transform: [{translateY: uiTranslateY}],
          }}>

          {/* Buttons — no glass card, floating directly on gradient */}
          <View style={[styles.actionsContainer, {width: actionCardWidth}]}>
            {/* Google Button */}
            <AnimatedPressable
              onPress={handleGoogleSignIn}
              disabled={googleLoading}
              style={{width: '100%', marginBottom: 12}}>
              <View style={[styles.googleButton, googleLoading && {opacity: 0.7}]}>
                {googleLoading ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Image source={google} style={styles.googleIcon} />
                )}
                <Text style={styles.googleButtonText}>
                  {googleLoading ? 'Signing in...' : 'Continue with Google'}
                </Text>
              </View>
            </AnimatedPressable>

            {/* Log In Button (Gradient) */}
            <AnimatedPressable onPress={handleCreateAccount} style={{width: '100%', marginBottom: 16}}>
              <LinearGradient
                colors={['#7C3AED', '#C084FC']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 0}}
                style={styles.loginButton}>
                <Text style={styles.loginButtonText}>Log In</Text>
              </LinearGradient>
            </AnimatedPressable>

            {/* Sign Up Text link */}
            <Pressable onPress={handleSignIn} style={({pressed}) => [{opacity: pressed ? 0.7 : 1, marginTop: 8}]}>
              <Text style={styles.signUpPrompt}>
                Don't have an account? <Text style={styles.signUpHighlight}>Sign Up</Text>
              </Text>
            </Pressable>

            <Text style={[styles.legalText, {maxWidth: Math.min(width - 40, 360)}]}>
              By continuing, you agree to our{' '}
              <Text
                style={styles.legalLink}
                onPress={() => navigation.navigate(AppRoute.Terms)}>
                Terms of Service
              </Text>{' '}
              and{' '}
              <Text
                style={styles.legalLink}
                onPress={() => navigation.navigate(AppRoute.Privacy)}>
                Privacy Policy
              </Text>
            </Text>
          </View>
        </Animated.ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  heroSection: {
    alignItems: 'center',
    width: '100%',
  },
  logo: {
    resizeMode: 'contain',
    marginBottom: 24,
  },
  headline: {
    fontFamily: typography.fontFamilyBold,
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: {width: 0, height: 2},
    textShadowRadius: 8,
    marginBottom: 16,
  },
  subtext: {
    fontFamily: typography.fontFamilyMedium,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    lineHeight: 22,
    letterSpacing: 0.3,
  },
  actionsContainer: {
    width: '100%',
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 24,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  googleIcon: {
    width: 24,
    height: 24,
    marginRight: 12,
  },
  googleButtonText: {
    fontFamily: typography.fontFamilySemiBold,
    color: '#1A1A1A',
    fontSize: 18,
  },
  loginButton: {
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  loginButtonText: {
    fontFamily: typography.fontFamilyBold,
    color: '#FFFFFF',
    fontSize: 18,
    letterSpacing: 0.5,
  },
  signUpPrompt: {
    marginTop: 24,
    fontFamily: typography.fontFamilyMedium,
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
  },
  signUpHighlight: {
    fontFamily: typography.fontFamilyBold,
    color: '#FFD700', // Premium gold/yellow accent to stand out against purple
  },
  legalText: {
    marginTop: 24,
    fontFamily: typography.fontFamilyRegular,
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  legalLink: {
    fontFamily: typography.fontFamilySemiBold,
    color: 'rgba(255, 255, 255, 0.9)',
    textDecorationLine: 'underline',
  },
});

export default SplashScreen;
