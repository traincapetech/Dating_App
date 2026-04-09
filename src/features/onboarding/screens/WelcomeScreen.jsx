
import React, {useRef, useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  useWindowDimensions,
  Platform,
} from 'react-native';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import {AppRoute} from '../../../constants/routes';
import {spacing, typography} from '../../../theme';
import {useAuth} from '../../../context/AuthContext';

const WelcomeScreen = () => {
  const navigation = useNavigation();
  const {logout, getNextOnboardingScreen} = useAuth();
  const {height} = useWindowDimensions();
  const headerSpacing = Math.min(120, height * 0.15);
  const [isFocused, setIsFocused] = useState(false);

  const mainSentence = "You are one of a kind";
  const words = mainSentence.split(' ');

  const animatedValues = useRef(
    words.map(() => new Animated.Value(0))
  ).current;

  const subtextAnim = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  // Function to ensure animations always run when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      // 1. Reset all values
      animatedValues.forEach(anim => anim.setValue(0));
      subtextAnim.setValue(0);

      // 2. Define the staggered animation for main text using spring
      const staggerAnim = Animated.stagger(
        400, // Slower stagger delay so words appear distinctly
        animatedValues.map(anim =>
          Animated.spring(anim, {
            toValue: 1,
            friction: 8, 
            tension: 10, // Much lower tension for a slower, floaty animation
            useNativeDriver: true,
          })
        )
      );

      // 3. Define the subtext animation (starts slightly after) using spring
      const subtextSequence = Animated.sequence([
        Animated.delay(2000), // Wait until main words finish
        Animated.spring(subtextAnim, {
          toValue: 1,
          friction: 8,
          tension: 15,
          useNativeDriver: true,
        })
      ]);

      // 4. Start both
      Animated.parallel([staggerAnim, subtextSequence]).start();

      return () => {
        // Cleanup if needed when leaving
      };
    }, [animatedValues, subtextAnim])
  );

  const handleLogout = async () => {
    try {
      await logout();
      navigation.reset({
        index: 0,
        routes: [{ name: AppRoute.OnboardingIntro }],
      });
    } catch (error) {
      console.log('Error signing out', error);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    Animated.spring(buttonScale, {
      toValue: 1.02, // Subtle grow to emphasize focus
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.spring(buttonScale, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  return (
    <LinearGradient
      colors={['#743A9A', '#9B5CC5']} // Light purple gradient
      style={styles.flex}
    >
      {/* Programmatic Botanical Shadows */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <MaterialCommunityIcons name="leaf" size={180} color="#000" style={[styles.shadowIcon, { top: -20, left: -60, transform: [{ rotate: '45deg' }] }]} />
        <MaterialCommunityIcons name="clover" size={140} color="#000" style={[styles.shadowIcon, { top: height * 0.2, right: -40, transform: [{ rotate: '-20deg' }] }]} />
        <MaterialCommunityIcons name="leaf-maple" size={200} color="#000" style={[styles.shadowIcon, { bottom: height * 0.1, left: -80, transform: [{ rotate: '70deg' }] }]} />
        <MaterialCommunityIcons name="cannabis" size={160} color="#000" style={[styles.shadowIcon, { bottom: -30, right: 30, transform: [{ rotate: '-10deg' }] }]} />
      </View>

      {/* Blur Layer Overlay */}
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(255, 255, 255, 0.15)' }]} pointerEvents="none" />

      <View style={[styles.container, {paddingTop: headerSpacing}]}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.kineticContainer}>
              {words.map((word, index) => {
                const translateY = animatedValues[index].interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0], // Move up from a more visible 50px offset
                });

                const opacity = animatedValues[index];
                
                // Identify the word "one"
                const isOne = word.toLowerCase() === 'one';

                return (
                  <Animated.View
                    key={`${index}-${word}`}
                    style={{
                      transform: [{ translateY }],
                      opacity,
                    }}>
                    <Text style={[styles.titleWord, isOne && styles.glowingWord]}>
                      {word}{' '}
                    </Text>
                  </Animated.View>
                );
              })}
            </View>

            <Animated.View
              style={{
                opacity: subtextAnim,
                transform: [
                  {
                    translateY: subtextAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [15, 0],
                    }),
                  },
                ],
              }}>
              <Text style={styles.subtitle}>Let's build your profile and find your</Text>
              <Text style={styles.subtitleSecondLine}>perfect match</Text>
            </Animated.View>
          </View>
        </View>

        <View style={styles.footer}>
          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <Pressable
              style={[
                styles.primaryButton,
                isFocused && styles.primaryButtonFocused,
              ]}
              onHoverIn={handleFocus}
              onHoverOut={handleBlur}
              onPressIn={handleFocus}
              onPressOut={handleBlur}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onPress={() => navigation.navigate(getNextOnboardingScreen())}>
              <Text style={styles.primaryButtonText}>Enter basic info</Text>
            </Pressable>
          </Animated.View>
          
          <View style={styles.bottomLinkContainer}>
            <Pressable onPress={handleLogout} style={styles.logoutPressable}>
              <Text style={styles.footerText}>
                Not you? <Text style={styles.linkText}>Sign out</Text>
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  shadowIcon: {
    position: 'absolute',
    opacity: 0.12,
    ...(Platform.OS === 'ios' && {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.8,
        shadowRadius: 20,
    })
  },
  container: {
    paddingHorizontal: spacing.xl,
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingBottom: Platform.OS === 'ios' ? 50 : 30,
  },
  content: {
    flex: 1,
    justifyContent: 'center', // Centers content vertically
    paddingBottom: spacing.xxxl, // Offset slightly to account for footer
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  kineticContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  titleWord: {
    fontFamily: 'MonaSans-Regular',
    fontSize: 34,
    color: '#D4B895',
    letterSpacing: 0.5,
  },
  glowingWord: {
    fontFamily: 'MonaSans-SemiBold',
    fontWeight: '600',
    color: '#FFDFAC',
    textShadowColor: 'rgba(255, 223, 172, 0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontFamily: 'MonaSans-Regular',
    fontSize: 16,
    color: '#D4B895',
    textAlign: 'center',
    opacity: 0.9,
    lineHeight: 24,
  },
  subtitleSecondLine: {
    fontFamily: 'MonaSans-Regular',
    fontSize: 16,
    color: '#D4B895',
    textAlign: 'center',
    opacity: 0.9,
    lineHeight: 24,
  },
  footer: {
    width: '100%',
    paddingBottom: spacing.lg,
  },
  primaryButton: {
    backgroundColor: 'rgba(57, 28, 86, 0.4)',
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  primaryButtonFocused: {
    backgroundColor: 'rgba(155, 92, 197, 0.85)', // Much brighter, more solid purple
    borderColor: 'rgba(255, 255, 255, 0.6)', // Brighter border highlight
    shadowColor: '#E5C49F', // Golden glow
    shadowOpacity: 0.3,
    shadowOffset: {width: 0, height: 0},
    shadowRadius: 15,
  },
  primaryButtonText: {
    color: '#E5C49F',
    fontFamily: 'MonaSans-Medium',
    fontSize: 16,
    letterSpacing: 0.3,
  },
  bottomLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    paddingTop: spacing.sm,
  },
  logoutPressable: {
    padding: spacing.xs,
  },
  footerText: {
    fontFamily: 'MonaSans-Regular',
    fontSize: 14,
    color: '#D4B895',
    opacity: 0.8,
  },
  linkText: {
    fontFamily: 'MonaSans-Medium',
    textDecorationLine: 'underline',
  },
});

export default WelcomeScreen;