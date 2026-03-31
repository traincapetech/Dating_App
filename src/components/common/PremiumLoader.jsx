import React, { useEffect, useRef, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Animated, 
  Easing, 
  ActivityIndicator,
  StatusBar
} from 'react-native';
import ThemeBackground from '../layout/ThemeBackground';
import { colors, typography } from '../../theme';

const PremiumLoader = ({ 
  visible = false, 
  text = "Finding your perfect match… 💫",
  minDuration = 300 
}) => {
  const [shouldRender, setShouldRender] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const startTime = useRef(0);
  const fadeOutActive = useRef(false);

  const lastVisible = useRef(visible);
  
  useEffect(() => {
    // Only trigger if visibility has actually changed
    if (visible !== lastVisible.current) {
      lastVisible.current = visible;
      
      if (visible) {
        fadeOutActive.current = false;
        setShouldRender(true);
        startTime.current = Date.now();
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      } else if (shouldRender && !fadeOutActive.current) {
        fadeOutActive.current = true;
        const elapsed = Date.now() - startTime.current;
        const remaining = Math.max(0, minDuration - elapsed);

        setTimeout(() => {
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }).start(() => {
            setShouldRender(false);
            fadeOutActive.current = false;
          });
        }, remaining);
      }
    }
  }, [visible, fadeAnim, minDuration, shouldRender]);

  if (!shouldRender) return null;

  return (
    <Animated.View 
      style={[
        styles.overlay, 
        { opacity: fadeAnim }
      ]}
      pointerEvents={visible ? "auto" : "none"}
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <ThemeBackground style={styles.background}>
        <View style={styles.content}>
          <View style={styles.spinnerWrapper}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>

          <View style={styles.textWrapper}>
            <Text style={styles.text}>{text}</Text>
            <AnimatedDots />
          </View>
        </View>
      </ThemeBackground>
    </Animated.View>
  );
};

const AnimatedDots = () => {
  const [dots, setDots] = useState('');
  
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
    }, 450);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.dotsContainer}>
      <Text style={styles.dotsText}>{dots}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10000,
    elevation: 100,
  },
  background: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinnerWrapper: {
    marginBottom: 20,
    transform: [{ scale: 1.2 }],
  },
  textWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  text: {
    color: '#4B3F72', // A darker purple consistent with theme
    fontSize: 18,
    fontFamily: typography.fontFamilyMedium,
    textAlign: 'center',
    letterSpacing: 0.5,
    opacity: 0.8,
  },
  dotsContainer: {
    width: 20,
    marginLeft: 2,
  },
  dotsText: {
    color: '#4B3F72',
    fontSize: 18,
    fontFamily: typography.fontFamilyBold,
    opacity: 0.8,
  }
});

export default PremiumLoader;
