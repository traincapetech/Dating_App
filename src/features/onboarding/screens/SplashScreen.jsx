import React, {useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  StatusBar,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import LottieView from 'lottie-react-native';
import {colors, spacing, typography} from '../../../theme';
import {AppRoute} from '../../../constants/routes';

const {width} = Dimensions.get('window');

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

const SplashScreen = ({navigation}) => {
  const glowScale = useSharedValue(1);
  const heroTranslate = useSharedValue(40);
  const heroOpacity = useSharedValue(0);
  const cardTranslate = useSharedValue(60);
  const cardOpacity = useSharedValue(0);
  const backgroundShift = useSharedValue(0);

  useEffect(() => {
    glowScale.value = withRepeat(
      withTiming(1.12, {
        duration: 2400,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true,
    );

    heroTranslate.value = withTiming(0, {
      duration: 900,
      easing: Easing.out(Easing.cubic),
    });
    heroOpacity.value = withTiming(1, {
      duration: 900,
      easing: Easing.out(Easing.cubic),
    });

    cardTranslate.value = withDelay(
      250,
      withTiming(0, {
        duration: 900,
        easing: Easing.out(Easing.cubic),
      }),
    );
    cardOpacity.value = withDelay(
      250,
      withTiming(1, {
        duration: 900,
        easing: Easing.out(Easing.cubic),
      }),
    );

    backgroundShift.value = withRepeat(
      withTiming(1, {
        duration: 4000,
        easing: Easing.inOut(Easing.quad),
      }),
      -1,
      true,
    );
  }, [glowScale, heroTranslate, heroOpacity, cardTranslate, cardOpacity, backgroundShift]);

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{scale: glowScale.value}],
  }));

  const heroStyle = useAnimatedStyle(() => ({
    opacity: heroOpacity.value,
    transform: [{translateY: heroTranslate.value}],
  }));

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{translateY: cardTranslate.value}],
  }));

  const gradientStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: backgroundShift.value * width * 0.3,
      },
    ],
  }));

  const handleCreateAccount = () => {
    navigation?.navigate(AppRoute.SignUp);
  };

  const handleSignIn = () => {
    navigation?.navigate(AppRoute.SignIn);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#ff4d9e', '#ff7593', '#ffb081']}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={StyleSheet.absoluteFillObject}
      />

      <AnimatedLinearGradient
        colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0)']}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={[styles.gradientGlow, gradientStyle]}
      />

      <Animated.View style={[styles.glowOrb, glowStyle]} />

      <LottieView
        source={{
          uri: 'https://lottie.host/76c4dbb2-5e7a-4b21-b5c7-4b673a4182f1/I31pjvD8QZ.json',
        }}
        autoPlay
        loop
        style={styles.lottieBackground}
      />

      <Animated.View style={[styles.heroContainer, heroStyle]}>
        <Text style={styles.appName}>Pryvo</Text>
        <Text style={styles.tagline}>
          Real connections begin with a vibe. Find the people who feel like your
          next great story.
        </Text>
      </Animated.View>

      <Animated.View style={[styles.card, cardStyle]}>
        <Text style={styles.cardHeading}>Match by energy</Text>
        <Text style={styles.cardBody}>
          Swipe through cinematic profiles, love prompts, and stories that bring
          personalities to life.
        </Text>
        <View style={styles.ctaContainer}>
          <Pressable style={styles.primaryButton} onPress={handleCreateAccount}>
            <Text style={styles.primaryButtonText}>Create Account</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={handleSignIn}>
            <Text style={styles.secondaryButtonText}>Sign In</Text>
          </Pressable>
        </View>
        <View style={styles.inlineHighlights}>
          <View style={styles.highlightPill}>
            <Text style={styles.highlightText}>Curated Matches</Text>
          </View>
          <View style={styles.highlightPill}>
            <Text style={styles.highlightText}>Verified Profiles</Text>
          </View>
          <View style={styles.highlightPill}>
            <Text style={styles.highlightText}>Video Prompts</Text>
          </View>
        </View>
        <Text style={styles.disclaimer}>
          By continuing, you agree to our Terms of Service and acknowledge our
          Privacy Policy.
        </Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xxxl,
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
  },
  gradientGlow: {
    position: 'absolute',
    top: -180,
    left: -100,
    width: width * 1.6,
    height: width * 1.1,
    opacity: 0.55,
  },
  glowOrb: {
    position: 'absolute',
    bottom: -120,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  lottieBackground: {
    position: 'absolute',
    top: spacing.xxxl,
    alignSelf: 'center',
    width: width * 0.9,
    height: width * 0.9,
    opacity: 0.85,
  },
  heroContainer: {
    marginTop: spacing.xxxl,
  },
  appName: {
    fontFamily: typography.fontFamilyBold,
    fontSize: typography.headings.h1 + 12,
    color: colors.surface,
    letterSpacing: 2,
  },
  tagline: {
    marginTop: spacing.lg,
    fontSize: typography.body.large,
    lineHeight: 30,
    color: colors.surface,
    opacity: 0.96,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 34,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xxl,
    shadowColor: '#2a0b19',
    shadowOffset: {width: 0, height: 20},
    shadowOpacity: 0.25,
    shadowRadius: 40,
    elevation: 22,
  },
  cardHeading: {
    fontFamily: typography.fontFamilyBold,
    fontSize: typography.headings.h3,
    color: colors.textPrimary,
  },
  cardBody: {
    marginTop: spacing.sm,
    fontSize: typography.body.medium,
    lineHeight: 24,
    color: colors.textSecondary,
  },
  ctaContainer: {
    marginTop: spacing.xl,
    gap: spacing.md,
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
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 18,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.primary,
    fontFamily: typography.fontFamilyMedium,
    fontSize: typography.body.large,
  },
  inlineHighlights: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  highlightPill: {
    backgroundColor: colors.background,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
  },
  highlightText: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    fontFamily: typography.fontFamilyMedium,
  },
  disclaimer: {
    marginTop: spacing.md,
    fontSize: typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default SplashScreen;
