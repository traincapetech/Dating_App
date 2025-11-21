import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  StatusBar,
  Dimensions,
  Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {colors, spacing, typography} from '../../../theme';
import {AppRoute} from '../../../constants/routes';

const {width, height} = Dimensions.get('window');

const SplashScreen = ({navigation}) => {
  const handleCreateAccount = () => {
    navigation?.navigate(AppRoute.SignUp);
  };

  const handleSignIn = () => {
    navigation?.navigate(AppRoute.SignIn);
  };

  const backgroundImageUri =
    'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent />

      {/* Background Image */}
      <View style={StyleSheet.absoluteFillObject}>
        <Image
          source={{uri: backgroundImageUri}}
          style={styles.backgroundImage}
          resizeMode="cover"
          onError={(error) => {
            console.log('Background image failed to load:', error);
          }}
        />
      </View>

      {/* Gradient Overlay */}
      <LinearGradient
        colors={[
          'rgba(0,0,0,0.7)',
          'rgba(254,60,114,0.6)',
          'rgba(254,60,114,0.8)',
        ]}
        start={{x: 0, y: 0}}
        end={{x: 0, y: 1}}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Content */}
      <View style={styles.content}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.logoContainer}>
            <Text style={styles.appName}>Pryvo</Text>
            <View style={styles.logoUnderline} />
          </View>
          <Text style={styles.tagline}>Real connections begin with a vibe</Text>
          <Text style={styles.subTagline}>
            Find the people who feel like your next great story
          </Text>
        </View>

        {/* Action Card */}
        <View style={styles.actionCard}>
          <Text style={styles.cardTitle}>Start Your Journey</Text>
          <Text style={styles.cardDescription}>
            Join thousands finding meaningful connections through authentic
            profiles and real conversations.
          </Text>

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
        </View>
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
