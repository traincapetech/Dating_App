import React, {useEffect} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import {colors, typography, spacing} from '../../theme';

const StreakBadge = ({
  count,
  graceUsed = false,
  compact = false,
  containerStyle,
}) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    // Subtle breathing animation for the fire emoji
    scale.value = withRepeat(
      withSequence(
        withTiming(1.2, {duration: 800}),
        withTiming(1, {duration: 1200}),
      ),
      -1,
      true,
    );

    // Slight glow effect if streak is high
    if (count >= 7) {
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.8, {duration: 1000}),
          withTiming(1, {duration: 1000}),
        ),
        -1,
        true,
      );
    }
  }, [count]);

  const animatedEmojiStyle = useAnimatedStyle(() => ({
    transform: [{scale: scale.value}],
    opacity: graceUsed ? 0.6 : opacity.value,
  }));

  if (!count || count <= 0) return null;

  return (
    <View
      style={[
        styles.container,
        count >= 7 && styles.hotContainer,
        graceUsed && styles.graceContainer,
        compact && styles.compactContainer,
        containerStyle,
      ]}>
      <Animated.Text
        style={[
          styles.emoji,
          compact && styles.compactEmoji,
          animatedEmojiStyle,
        ]}>
        🔥
      </Animated.Text>
      {!compact && (
        <Text
          style={[
            styles.count,
            count >= 7 && styles.hotText,
            graceUsed && styles.graceText,
          ]}>
          {count}
        </Text>
      )}
      {compact && <Text style={styles.compactCount}>{count}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 123, 0, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 123, 0, 0.2)',
  },
  hotContainer: {
    backgroundColor: 'rgba(255, 69, 0, 0.15)',
    borderColor: 'rgba(255, 69, 0, 0.3)',
    shadowColor: '#FF4500',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  graceContainer: {
    backgroundColor: 'rgba(108, 117, 125, 0.1)',
    borderColor: 'rgba(108, 117, 125, 0.2)',
  },
  emoji: {
    fontSize: 14,
    marginRight: 3,
  },
  count: {
    fontSize: 12,
    fontFamily: typography.fontFamilyBold || 'System',
    fontWeight: '700',
    color: '#FF7B00',
  },
  hotText: {
    color: '#FF4500',
  },
  graceText: {
    color: '#6C757D',
    fontStyle: 'italic',
  },
  compactContainer: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 10,
    backgroundColor: '#FF7B00',
    borderWidth: 1,
    borderColor: '#fff',
  },
  compactEmoji: {
    fontSize: 11,
    marginRight: 2,
  },
  compactCount: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
});

export default StreakBadge;
