import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { spacing } from '../../theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const ProfileSkeleton = () => {
  const animatedValue = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 0.6,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0.3,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [animatedValue]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.card, { opacity: animatedValue }]} />
      
      <View style={styles.infoContainer}>
        <Animated.View style={[styles.nameLine, { opacity: animatedValue }]} />
        <Animated.View style={[styles.bioLine, { opacity: animatedValue }]} />
        <Animated.View style={[styles.bioLineShort, { opacity: animatedValue }]} />
      </View>

      <View style={styles.actionsContainer}>
        <Animated.View style={[styles.circle, { opacity: animatedValue }]} />
        <Animated.View style={[styles.circleLarge, { opacity: animatedValue }]} />
        <Animated.View style={[styles.circle, { opacity: animatedValue }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 84,
  },
  card: {
    width: SCREEN_WIDTH - 48,
    height: SCREEN_HEIGHT * 0.70,
    borderRadius: 24,
    backgroundColor: '#E5E7EB',
  },
  infoContainer: {
    position: 'absolute',
    bottom: (SCREEN_HEIGHT * 0.08) + 84, // Approximate position of info on card
    left: 48,
    width: '100%',
    gap: 12,
  },
  nameLine: {
    width: 180,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#D1D5DB',
  },
  bioLine: {
    width: 240,
    height: 16,
    borderRadius: 4,
    backgroundColor: '#D1D5DB',
  },
  bioLineShort: {
    width: 120,
    height: 16,
    borderRadius: 4,
    backgroundColor: '#D1D5DB',
  },
  actionsContainer: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  circle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E5E7EB',
  },
  circleLarge: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#E5E7EB',
  }
});

export default ProfileSkeleton;
