import React, {useEffect} from 'react';
import {View, Text, StyleSheet, Dimensions, Modal} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import {colors, typography} from '../../theme';
import giftImages from '../../assets/images/gifts';

const {width} = Dimensions.get('window');

// Unique romantic messages per gift slug (receiver side)
const RECEIVER_MESSAGES = {
  rose: 'Sent you a rose to make your day more beautiful 🌹',
  'teddy-bear': 'A teddy bear for a warm virtual hug 🧸',
  ring: 'A sparkling surprise just for you 💍',
  diamond: "You've been gifted a shining diamond 💎",
  crown: "You've been crowned with a royal gift 👑",
};

// Gift sent confirmation messages (sender side)
const SENDER_MESSAGES = {
  rose: 'You sent a beautiful rose 🌹',
  'teddy-bear': 'You sent a warm teddy bear hug 🧸',
  ring: 'You sent a sparkling ring 💍',
  diamond: 'You sent a shining diamond 💎',
  crown: 'You sent a royal crown 👑',
};

// Individual floating heart component
const FloatingHeart = ({startX, delay, size}) => {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0);

  useEffect(() => {
    const t = setTimeout(() => {
      opacity.value = withTiming(1, {duration: 300});
      scale.value = withSpring(1);
      translateY.value = withRepeat(
        withTiming(-200, {duration: 2000, easing: Easing.out(Easing.ease)}),
        1,
        false,
      );
      setTimeout(() => {
        opacity.value = withTiming(0, {duration: 500});
      }, 1800);
    }, delay);
    return () => clearTimeout(t);
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{translateY: translateY.value}, {scale: scale.value}],
    opacity: opacity.value,
    position: 'absolute',
    bottom: 80,
    left: startX,
  }));

  return (
    <Animated.Text style={[animStyle, {fontSize: size}]}>❤️</Animated.Text>
  );
};

const GiftReceiverAnimation = ({gift, visible, onComplete}) => {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(60);
  const floatY = useSharedValue(0);
  const rotateVal = useSharedValue(0);

  useEffect(() => {
    if (visible && gift) {
      // Reset first
      scale.value = 0;
      opacity.value = 0;
      translateY.value = 60;
      floatY.value = 0;
      rotateVal.value = 0;

      // Entrance animation
      opacity.value = withTiming(1, {duration: 400});
      scale.value = withSpring(1.05, {damping: 8, stiffness: 90}, () => {
        scale.value = withSpring(1, {damping: 12});
      });
      translateY.value = withSpring(0, {damping: 12, stiffness: 80});

      // Floating idle animation
      floatY.value = withRepeat(
        withTiming(-12, {duration: 1400, easing: Easing.inOut(Easing.ease)}),
        -1,
        true,
      );
      rotateVal.value = withRepeat(
        withTiming(0.04, {duration: 1800, easing: Easing.inOut(Easing.ease)}),
        -1,
        true,
      );

      // Auto-dismiss after 3 seconds
      const timeout = setTimeout(() => {
        opacity.value = withTiming(0, {duration: 600}, finished => {
          if (finished && onComplete) {
            runOnJS(onComplete)();
          }
        });
        scale.value = withTiming(0.85, {duration: 600});
      }, 3000);

      return () => clearTimeout(timeout);
    }
  }, [visible, gift]);

  const containerAnimStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{scale: scale.value}, {translateY: translateY.value}],
  }));

  const imageAnimStyle = useAnimatedStyle(() => ({
    transform: [{translateY: floatY.value}, {rotate: `${rotateVal.value}rad`}],
  }));

  if (!gift) return null;

  const isSender = gift.isSender;
  const slug = gift.slug;

  const message = isSender
    ? SENDER_MESSAGES[slug] || `You sent a ${gift.name}! 🎁`
    : RECEIVER_MESSAGES[slug] || `You received a ${gift.name}! 🎁`;

  const subtitle = isSender
    ? 'Your gift is on its way! 💝'
    : 'Someone is thinking of you 💖';

  const topEmoji = isSender ? '💝' : '🎁';

  // Hearts configuration
  const hearts = [
    {startX: width * 0.1, delay: 100, size: 20},
    {startX: width * 0.25, delay: 300, size: 28},
    {startX: width * 0.5, delay: 200, size: 22},
    {startX: width * 0.65, delay: 500, size: 24},
    {startX: width * 0.8, delay: 150, size: 18},
    {startX: width * 0.4, delay: 400, size: 26},
  ];

  return (
    // Using Modal ensures it renders at SYSTEM LEVEL — not clipped by KeyboardAvoidingView
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => {
        if (onComplete) onComplete();
      }}>
      <View style={styles.overlay} pointerEvents="none">
        {/* Backdrop */}
        <View style={styles.backdrop} />

        {/* Floating hearts */}
        {hearts.map((h, i) => (
          <FloatingHeart
            key={i}
            startX={h.startX}
            delay={h.delay}
            size={h.size}
          />
        ))}

        {/* Gift Card */}
        <Animated.View style={[styles.card, containerAnimStyle]}>
          <Text style={styles.emoji}>{topEmoji}</Text>

          <View style={styles.imageWrapper}>
            <View style={styles.glow} />
            <Animated.Image
              source={giftImages[slug]}
              style={[styles.giftImage, imageAnimStyle]}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.title}>{message}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  card: {
    width: width * 0.82,
    maxWidth: 340,
    backgroundColor: '#fff',
    borderRadius: 32,
    paddingVertical: 32,
    paddingHorizontal: 28,
    alignItems: 'center',
    elevation: 30,
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 16},
    shadowOpacity: 0.3,
    shadowRadius: 32,
    borderWidth: 2,
    borderColor: 'rgba(255, 107, 107, 0.2)',
    zIndex: 10,
  },
  emoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  imageWrapper: {
    width: 150,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.primary,
    opacity: 0.12,
    borderRadius: 75,
    transform: [{scale: 1.15}],
  },
  giftImage: {
    width: 130,
    height: 130,
  },
  title: {
    fontSize: 18,
    fontFamily: typography.fontFamilyBold,
    color: '#1a1a2e',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 26,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: typography.fontFamilyMedium,
    color: colors.primary,
    textAlign: 'center',
  },
});

export default GiftReceiverAnimation;
