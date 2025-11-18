import React, {useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  StatusBar,
  Dimensions,
  Image,
  ImageBackground,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import {colors, spacing, typography} from '../../../theme';
import {AppRoute} from '../../../constants/routes';

const {width, height} = Dimensions.get('window');

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);
const AnimatedImageBackground =
  Animated.createAnimatedComponent(ImageBackground);

const SplashScreen = ({navigation}) => {
  // Animation values
  const imageScale = useSharedValue(1);
  const imageOpacity = useSharedValue(0);
  const overlayOpacity = useSharedValue(0.4);
  const heroTranslate = useSharedValue(50);
  const heroOpacity = useSharedValue(0);
  const cardTranslate = useSharedValue(80);
  const cardOpacity = useSharedValue(0);
  const buttonScale = useSharedValue(0.9);
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    // Image entrance animation
    imageOpacity.value = withTiming(1, {
      duration: 1200,
      easing: Easing.out(Easing.cubic),
    });
    imageScale.value = withTiming(1.1, {
      duration: 15000,
      easing: Easing.inOut(Easing.ease),
    });

    // Overlay pulse
    overlayOpacity.value = withRepeat(
      withSequence(
        withTiming(0.5, {duration: 2000, easing: Easing.inOut(Easing.ease)}),
        withTiming(0.4, {duration: 2000, easing: Easing.inOut(Easing.ease)}),
      ),
      -1,
      false,
    );

    // Hero text animation
    heroTranslate.value = withTiming(0, {
      duration: 1000,
      easing: Easing.out(Easing.cubic),
    });
    heroOpacity.value = withDelay(
      300,
      withTiming(1, {
        duration: 800,
        easing: Easing.out(Easing.cubic),
      }),
    );

    // Card animation
    cardTranslate.value = withDelay(
      600,
      withTiming(0, {
        duration: 1000,
        easing: Easing.out(Easing.cubic),
      }),
    );
    cardOpacity.value = withDelay(
      600,
      withTiming(1, {
        duration: 1000,
        easing: Easing.out(Easing.cubic),
      }),
    );

    // Button scale animation
    buttonScale.value = withDelay(
      900,
      withTiming(1, {
        duration: 500,
        easing: Easing.out(Easing.back(1.5)),
      }),
    );

    // Pulse animation for accent
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.05, {duration: 2000, easing: Easing.inOut(Easing.ease)}),
        withTiming(1, {duration: 2000, easing: Easing.inOut(Easing.ease)}),
      ),
      -1,
      false,
    );
  }, []);

  const imageStyle = useAnimatedStyle(() => ({
    opacity: imageOpacity.value,
    transform: [{scale: imageScale.value}],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const heroStyle = useAnimatedStyle(() => ({
    opacity: heroOpacity.value,
    transform: [{translateY: heroTranslate.value}],
  }));

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{translateY: cardTranslate.value}],
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{scale: buttonScale.value}],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{scale: pulseScale.value}],
  }));

  const handleCreateAccount = () => {
    navigation?.navigate(AppRoute.SignUp);
  };

  const handleSignIn = () => {
    navigation?.navigate(AppRoute.SignIn);
  };

  // Placeholder image URL - Replace this with your own image/video
  // For video, you can use react-native-video component instead
  const backgroundImageUri =
    'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent />

      {/* Background Image */}
      <Animated.View style={[StyleSheet.absoluteFillObject, imageStyle]}>
        <Image
          source={{uri: backgroundImageUri}}
          style={styles.backgroundImage}
          resizeMode="cover"
        />
      </Animated.View>

      {/* Gradient Overlay */}
      <AnimatedLinearGradient
        colors={[
          'rgba(0,0,0,0.7)',
          'rgba(254,60,114,0.6)',
          'rgba(254,60,114,0.8)',
        ]}
        start={{x: 0, y: 0}}
        end={{x: 0, y: 1}}
        style={[StyleSheet.absoluteFillObject, overlayStyle]}
      />

      {/* Animated accent circles */}
      <Animated.View style={[styles.accentCircle1, pulseStyle]} />
      <Animated.View style={styles.accentCircle2} />

      {/* Content */}
      <View style={styles.content}>
        {/* Hero Section */}
        <Animated.View style={[styles.heroSection, heroStyle]}>
          <View style={styles.logoContainer}>
            <Text style={styles.appName}>Pryvo</Text>
            <View style={styles.logoUnderline} />
          </View>
          <Text style={styles.tagline}>Real connections begin with a vibe</Text>
          <Text style={styles.subTagline}>
            Find the people who feel like your next great story
          </Text>
        </Animated.View>

        {/* Action Card */}
        <Animated.View style={[styles.actionCard, cardStyle]}>
          <Text style={styles.cardTitle}>Start Your Journey</Text>
          <Text style={styles.cardDescription}>
            Join thousands finding meaningful connections through authentic
            profiles and real conversations.
          </Text>

          <Animated.View style={buttonStyle}>
            <Pressable
              style={styles.primaryButton}
              onPress={handleCreateAccount}>
              <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 0}}
                style={styles.buttonGradient}>
                <Text style={styles.primaryButtonText}>Create Account</Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>

          <Pressable style={styles.secondaryButton} onPress={handleSignIn}>
            <Text style={styles.secondaryButtonText}>Sign In</Text>
          </Pressable>

          {/* Feature Pills */}
          <View style={styles.featuresContainer}>
            <View style={styles.featurePill}>
              <Text style={styles.featureIcon}>✨</Text>
              <Text style={styles.featureText}>Curated Matches</Text>
            </View>
            <View style={styles.featurePill}>
              <Text style={styles.featureIcon}>✓</Text>
              <Text style={styles.featureText}>Verified</Text>
            </View>
            <View style={styles.featurePill}>
              <Text style={styles.featureIcon}>🎬</Text>
              <Text style={styles.featureText}>Video Prompts</Text>
            </View>
          </View>

          <Text style={styles.disclaimer}>
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
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxxl + 20,
    paddingBottom: spacing.xxl,
    justifyContent: 'space-between',
  },
  accentCircle1: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  accentCircle2: {
    position: 'absolute',
    bottom: -150,
    left: -150,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroSection: {
    alignItems: 'center',
    marginTop: spacing.xxl,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  appName: {
    fontFamily: typography.fontFamilyBold,
    fontSize: 52,
    color: colors.textInverse,
    letterSpacing: 3,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: {width: 0, height: 2},
    textShadowRadius: 8,
  },
  logoUnderline: {
    width: 60,
    height: 4,
    backgroundColor: colors.textInverse,
    borderRadius: 2,
    marginTop: spacing.xs,
  },
  tagline: {
    fontSize: typography.headings.h2,
    fontFamily: typography.fontFamilyBold,
    color: colors.textInverse,
    textAlign: 'center',
    marginTop: spacing.xl,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 6,
  },
  subTagline: {
    fontSize: typography.body.large,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textInverse,
    textAlign: 'center',
    marginTop: spacing.md,
    opacity: 0.95,
    paddingHorizontal: spacing.xl,
    lineHeight: 24,
  },
  actionCard: {
    backgroundColor: colors.surface,
    borderRadius: 32,
    padding: spacing.xxl,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 20},
    shadowOpacity: 0.3,
    shadowRadius: 40,
    elevation: 25,
  },
  cardTitle: {
    fontSize: typography.headings.h3,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  cardDescription: {
    fontSize: typography.body.medium,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  primaryButton: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonGradient: {
    paddingVertical: spacing.md + 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: colors.textInverse,
    fontFamily: typography.fontFamilyBold,
    fontSize: typography.body.large,
    letterSpacing: 0.5,
  },
  secondaryButton: {
    borderWidth: 2,
    borderColor: colors.primary,
    paddingVertical: spacing.md + 4,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: spacing.lg,
    backgroundColor: 'transparent',
  },
  secondaryButtonText: {
    color: colors.primary,
    fontFamily: typography.fontFamilyBold,
    fontSize: typography.body.medium,
  },
  featuresContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: 20,
    gap: spacing.xs,
  },
  featureIcon: {
    fontSize: 16,
  },
  featureText: {
    fontSize: typography.caption + 1,
    fontFamily: typography.fontFamilyMedium,
    color: colors.textPrimary,
  },
  disclaimer: {
    fontSize: typography.caption,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 16,
  },
  linkText: {
    color: colors.primary,
    fontFamily: typography.fontFamilyMedium,
    textDecorationLine: 'underline',
  },
});

export default SplashScreen;
