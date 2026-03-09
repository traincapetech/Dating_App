import React, {useEffect, useState} from 'react';
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
} from 'react-native';
import {colors, typography} from '../../../theme';
import {AppRoute} from '../../../constants/routes';
import {googleSignIn} from '../../../services/auth/authService';
import {useAuth} from '../../../context/AuthContext';
import google from '../../../assets/images/google.png';

const SplashScreen = ({navigation}) => {
  const {width} = useWindowDimensions();
  const {isAuthenticated, profile, loading: authLoading} = useAuth();
  const heroImageSize = Math.min(width * 0.65, 250);
  const heroFontSize = Math.min(32, Math.max(24, width * 0.08));
  const bodyFontSize = Math.min(15, Math.max(14, width * 0.045));
  const heroSpacingTop = width < 360 ? 20 : 40;
  const actionCardWidth = Math.min(420, width - 32);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    let timer;
    if (!authLoading) {
      // Add a small delay so the splash screen logo is actually visible
      timer = setTimeout(() => {
        if (isAuthenticated) {
          if (profile) {
            console.log(
              '[SplashScreen] Session found with profile, navigating to Home',
            );
            navigation?.reset({
              index: 0,
              routes: [{name: AppRoute.HomeTabs}],
            });
          } else {
            console.log(
              '[SplashScreen] Session found but no profile, navigating to Onboarding',
            );
            navigation?.reset({
              index: 0,
              routes: [{name: AppRoute.Welcome}],
            });
          }
        }
      }, 1500); // 1.5 second delay
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
          // New user — go to onboarding
          navigation?.reset({
            index: 0,
            routes: [{name: AppRoute.BasicInfo}],
          });
        } else {
          // Existing user — go to home
          navigation?.reset({
            index: 0,
            routes: [{name: AppRoute.HomeTabs}],
          });
        }
      }
    } catch (error) {
      console.error('Google Sign-In error:', error);
      // Don't show alert if user cancelled
      const isCancelled =
        error?.code === 'SIGN_IN_CANCELLED' ||
        error?.message?.includes('cancel');
      if (!isCancelled) {
        Alert.alert(
          'Sign-In Failed',
          error?.message || 'Something went wrong. Please try again.',
        );
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white mono-sans">
      <ScrollView
        className="px-8"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
        <View className="items-center" style={{marginTop: heroSpacingTop}}>
          <Image
            source={require('../../../assets/images/logo.png')}
            style={{
              width: heroImageSize,
              height: heroImageSize,
              resizeMode: 'contain',
            }}
          />
          <Text
            className="font-semibold text-center text-black shadow-lg"
            style={{
              fontSize: heroFontSize,
              maxWidth: Math.min(width - 40, 380),
            }}>
            Find Your Perfect Match Today
          </Text>
          <Text
            className="text-center text-gray-500 mt-5 px-4 leading-5 tracking-wide"
            style={{
              fontSize: bodyFontSize,
              maxWidth: Math.min(width - 32, 360),
            }}>
            Discover Real Connections with Pryvo's intelligent matchmaking.
            Start swiping to find your perfect match today!
          </Text>
        </View>

        <View
          style={{
            width: actionCardWidth,
            alignItems: 'center',
          }}>
          <Pressable
            onPress={handleGoogleSignIn}
            disabled={googleLoading}
            className="w-full"
            style={{opacity: googleLoading ? 0.6 : 1}}>
            <View className="flex-row items-center justify-center border border-primary rounded-full bg-white px-6 py-3 mb-8">
              {googleLoading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Image source={google} className="w-6 h-6" />
              )}
              <Text className="text-black font-semibold text-lg ml-4">
                {googleLoading ? 'Signing in...' : 'Continue with Google'}
              </Text>
            </View>
          </Pressable>
          <Pressable onPress={handleCreateAccount} className="w-full">
            <Text className="text-white font-semibold bg-primary px-6 py-3 mb-8 rounded-full text-lg text-center">
              Log In
            </Text>
          </Pressable>

          <Pressable onPress={handleSignIn}>
            <Text className="text-black text-lg font-medium text-center mt-6">
              Don't have an account?{' '}
              <Text className="text-primary font-bold">Sign Up</Text>
            </Text>
          </Pressable>

          <Text
            className="text-sm text-center text-gray-600 mt-6 mb-12 px-4 leading-4"
            style={{maxWidth: Math.min(width - 40, 360)}}>
            By continuing, you agree to our{' '}
            <Text
              style={styles.linkText}
              onPress={() => navigation.navigate(AppRoute.Terms)}>
              Terms of Service
            </Text>{' '}
            and{' '}
            <Text
              style={styles.linkText}
              onPress={() => navigation.navigate(AppRoute.Privacy)}>
              Privacy Policy
            </Text>
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  linkText: {
    color: colors.primary,
    fontFamily: typography.fontFamilyMedium,
    textDecorationLine: 'underline',
  },
});

export default SplashScreen;
