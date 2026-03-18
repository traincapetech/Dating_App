import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { typography } from '../../theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const easeInOutSine = (t) => {
  'worklet';
  return -(Math.cos(Math.PI * t) - 1) / 2;
};

const easeOutQuint = (t) => {
  'worklet';
  return 1 - Math.pow(1 - t, 5);
};

// Glow Blob component for background depth with aura motion
const GlowBlob = ({ color, size, initialX, initialY, duration }) => {
  const transX = useSharedValue(0);
  const transY = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    transX.value = withRepeat(
      withSequence(
        withTiming(40, { duration, easing: easeInOutSine }),
        withTiming(-40, { duration, easing: easeInOutSine })
      ),
      -1,
      true
    );
    transY.value = withRepeat(
      withSequence(
        withTiming(-30, { duration: duration * 1.2, easing: easeInOutSine }),
        withTiming(30, { duration: duration * 1.2, easing: easeInOutSine })
      ),
      -1,
      true
    );
    scale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: duration * 0.8, easing: easeInOutSine }),
        withTiming(0.9, { duration: duration * 0.8, easing: easeInOutSine })
      ),
      -1,
      true
    );
  }, [duration, transX, transY, scale]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: transX.value },
      { translateY: transY.value },
      { scale: scale.value }
    ],
  }));

  return (
    <Animated.View style={[
      styles.glowBlobBase,
      { 
        width: size, 
        height: size, 
        borderRadius: size / 2, 
        backgroundColor: color,
        left: initialX,
        top: initialY,
      },
      style
    ]} />
  );
};

// Sparkle/Particle component
const Sparkle = ({ delay, x, y }) => {
  const transY = useSharedValue(y);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(0.6, { duration: 1000 }),
        withTiming(0.2, { duration: 1000 }),
        withTiming(0.8, { duration: 1000 }),
        withTiming(0, { duration: 1000 }),
      ),
      -1,
      false
    ));
    transY.value = withDelay(delay, withRepeat(
      withTiming(y - 300, { duration: 6000 + Math.random() * 4000, easing: Easing.linear }),
      -1,
      false
    ));
  }, [delay, y, opacity, transY]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: transY.value }],
    opacity: opacity.value,
    left: x,
    position: 'absolute',
  }));

  return (
    <Animated.View style={style}>
      <Icon name="star" size={8} color="#FFFFFF" />
    </Animated.View>
  );
};

// Floating Heart Component with optional silhouettes
const FloatingHeart = ({ delay, scale: baseScale, x, y, layer, color, size: baseSize, silhouette }) => {
  const transY = useSharedValue(y);
  const transX = useSharedValue(x);
  const scale = useSharedValue(baseScale);
  const opacity = useSharedValue(0);
  const silOpacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(layer === 'bg' ? 0.3 : layer === 'mid' ? 0.6 : 1, { duration: 1000 }));
    
    // Occasional silhouette fade
    if (silhouette) {
      silOpacity.value = withDelay(delay + 2000, withRepeat(
        withSequence(
          withTiming(0.4, { duration: 2000 }),
          withTiming(0, { duration: 3000 }),
          withDelay(5000, withTiming(0, { duration: 1 })),
        ),
        -1,
        false
      ));
    }

    transY.value = withRepeat(
      withTiming(-250, { 
        duration: 15000 + (Math.random() * 10000), 
        easing: Easing.linear 
      }),
      -1,
      false
    );

    transX.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(x + (Math.random() * 60 - 30), { duration: 4000 + (Math.random() * 2000), easing: easeInOutSine }),
        withTiming(x + (Math.random() * 60 - 30), { duration: 4000 + (Math.random() * 2000), easing: easeInOutSine }),
      ),
      -1,
      true
    ));

    scale.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(baseScale * 1.1, { duration: 1200, easing: easeInOutSine }),
        withTiming(baseScale, { duration: 1200, easing: easeInOutSine }),
      ),
      -1,
      true
    ));
  }, [delay, x, y, layer, baseScale, transX, transY, scale, opacity, silhouette, silOpacity]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: transX.value },
      { translateY: transY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
    position: 'absolute',
  }));

  const silStyle = useAnimatedStyle(() => ({
    opacity: silOpacity.value,
  }));

  const size = layer === 'bg' ? baseSize : layer === 'mid' ? baseSize * 1.3 : baseSize * 1.6;

  return (
    <Animated.View style={style}>
      <View style={styles.heartStack}>
        <Icon 
          name="heart" 
          size={size} 
          color={color} 
          style={[
            styles.heartShadow,
            layer === 'bg' && styles.blurBg
          ]} 
        />
        {silhouette && (
          <Animated.View style={[StyleSheet.absoluteFill, styles.silContainer, silStyle]}>
            <Icon name={silhouette} size={size * 0.4} color="rgba(255, 255, 255, 0.7)" />
          </Animated.View>
        )}
      </View>
    </Animated.View>
  );
};

const LoadingIndicator = () => {
  const scale = useSharedValue(1);
  const glow = useSharedValue(1);

  useEffect(() => {
    // More rhythmic heartbeat synchronization
    scale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 180, easing: easeInOutSine }),
        withTiming(1.1, { duration: 120, easing: easeInOutSine }),
        withTiming(1.45, { duration: 180, easing: easeInOutSine }),
        withTiming(1, { duration: 800, easing: easeInOutSine }),
      ),
      -1,
      false
    );

    glow.value = withRepeat(
      withSequence(
        withTiming(2.2, { duration: 480 }),
        withTiming(1, { duration: 800 }),
      ),
      -1,
      true
    );
  }, [scale, glow]);

  const mainHeartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowOpacity: interpolate(scale.value, [1, 1.45], [0.4, 0.9]),
    shadowRadius: interpolate(scale.value, [1, 1.45], [15, 35]),
  }));

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glow.value }],
    opacity: interpolate(glow.value, [1, 2.2], [0.5, 0]),
  }));

  return (
    <View style={styles.mainHeartContainer}>
      {/* Background Aura Sync with Heartbeat */}
      <Animated.View style={[styles.heartAura, glowStyle]} />
      <Animated.View style={[styles.mainHeartPulse, mainHeartStyle]}>
        <Icon name="heart" size={110} color="#FF2D55" style={styles.premiumHeartGlow} />
      </Animated.View>
    </View>
  );
};

const FullScreenLoader = ({ visible, message }) => {
  const globalOpacity = useSharedValue(1);

  useEffect(() => {
    if (!visible) {
      globalOpacity.value = withTiming(0, {
        duration: 800,
        easing: easeInOutSine,
      });
    } else {
      globalOpacity.value = 1;
    }
  }, [visible, globalOpacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: globalOpacity.value,
    zIndex: globalOpacity.value > 0 ? 9999 : -1,
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: withTiming(visible ? 1 : 0, { duration: 600 }),
    transform: [{ translateY: withTiming(visible ? 0 : 30, { duration: 800, easing: easeOutQuint }) }],
  }));

  return (
    <Animated.View 
      style={[styles.absoluteFill, animatedStyle]} 
      pointerEvents={visible ? "auto" : "none"}
    >
      <LinearGradient
        colors={['#FFF5F8', '#FFF0F5', '#FDF2F8']}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Animated Glow Blobs Background */}
        <GlowBlob color="rgba(255, 105, 180, 0.25)" size={450} initialX={-150} initialY={-100} duration={12000} />
        <GlowBlob color="rgba(255, 165, 0, 0.18)" size={500} initialX={SCREEN_WIDTH - 250} initialY={SCREEN_HEIGHT - 300} duration={15000} />
        <GlowBlob color="rgba(138, 43, 226, 0.12)" size={400} initialX={SCREEN_WIDTH * 0.1} initialY={SCREEN_HEIGHT * 0.3} duration={14000} />

        {/* Particle System (Sparkles) */}
        {[...Array(10)].map((_, i) => (
          <Sparkle key={`sparkle-${i}`} x={Math.random() * SCREEN_WIDTH} y={SCREEN_HEIGHT + 100} delay={i * 800} />
        ))}

        {/* Layered Decorative Elements */}
        
        {/* Background Layer */}
        <FloatingHeart layer="bg" color="#FBCFE8" x={SCREEN_WIDTH * 0.15} y={SCREEN_HEIGHT * 1.2} delay={0} scale={0.7} size={25} />
        <FloatingHeart layer="bg" color="#F9A8D4" x={SCREEN_WIDTH * 0.8} y={SCREEN_HEIGHT * 1.3} delay={3000} scale={0.8} size={30} silhouette="heart-outline" />
        <FloatingHeart layer="bg" color="#E9D5FF" x={SCREEN_WIDTH * 0.4} y={SCREEN_HEIGHT * 1.5} delay={6000} scale={0.65} size={28} />
        
        {/* Mid Layer */}
        <FloatingHeart layer="mid" color="#FF8BBF" x={SCREEN_WIDTH * 0.3} y={SCREEN_HEIGHT * 1.1} delay={5000} scale={0.9} size={45} silhouette="account-heart" />
        <FloatingHeart layer="mid" color="#FDA4AF" x={SCREEN_WIDTH * 0.2} y={SCREEN_HEIGHT * 1.4} delay={9500} scale={1} size={48} />
        <FloatingHeart layer="mid" color="#FB923C" x={SCREEN_WIDTH * 0.75} y={SCREEN_HEIGHT * 1.6} delay={2500} scale={0.85} size={40} />
        
        {/* Foreground Layer */}
        <FloatingHeart layer="fg" color="#FF2D55" x={SCREEN_WIDTH * 0.65} y={SCREEN_HEIGHT * 1.25} delay={2000} scale={0.9} size={55} silhouette="account-multiple-outline" />
        <FloatingHeart layer="fg" color="#FF0080" x={SCREEN_WIDTH * 0.25} y={SCREEN_HEIGHT * 1.5} delay={7500} scale={1.15} size={60} />
        <FloatingHeart layer="fg" color="#8B5CF6" x={SCREEN_WIDTH * 0.55} y={SCREEN_HEIGHT * 1.7} delay={4000} scale={1} size={50} />

        {/* Content Wrapper */}
        <View style={styles.centerContent}>
          <LoadingIndicator />
          <Animated.View style={[styles.glassTextContainer, textStyle]}>
            <Text style={styles.messageText}>{message}</Text>
          </Animated.View>
        </View>

        {/* Vignette Screen Effect */}
        <LinearGradient
          colors={['rgba(255,192,203,0.1)', 'transparent', 'rgba(255,192,203,0.1)']}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  absoluteFill: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    flex: 1,
    backgroundColor: '#FFF5F8',
  },
  glowBlobBase: {
    position: 'absolute',
    opacity: 0.5,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  glassTextContainer: {
    marginTop: 50,
    paddingHorizontal: 30,
    paddingVertical: 18,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    alignItems: 'center',
    shadowColor: '#FF2D55',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
  },
  messageText: {
    fontSize: 24,
    fontFamily: typography.fontFamilyBold,
    color: '#FF2D55',
    textAlign: 'center',
    letterSpacing: 0.8,
    textShadowColor: 'rgba(255, 45, 85, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  mainHeartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 180,
    width: 180,
  },
  heartAura: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 45, 85, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(255, 45, 85, 0.3)',
  },
  mainHeartPulse: {
    shadowColor: '#FF2D55',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 25,
    elevation: 30,
  },
  premiumHeartGlow: {
    textShadowColor: 'rgba(255, 45, 85, 0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  heartStack: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  silContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartShadow: {
    textShadowColor: 'rgba(0,0,0,0.04)',
    textShadowOffset: { width: 0, height: 6 },
    textShadowRadius: 8,
  },
  blurBg: {
    opacity: 0.22,
    textShadowRadius: 15,
    textShadowColor: 'rgba(255, 255, 255, 1)',
  },
});

export default FullScreenLoader;
