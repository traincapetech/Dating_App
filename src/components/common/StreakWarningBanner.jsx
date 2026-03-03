import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, Pressable} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {colors, typography, spacing} from '../../theme';

const StreakWarningBanner = ({expiresAt, onDismiss}) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!expiresAt) return;

    const calculateTime = () => {
      const now = new Date();
      const end = new Date(expiresAt);
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft('Expired');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else {
        setTimeLeft(`${minutes}m ${seconds}s`);
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Icon name="time-outline" size={20} color="#FFD700" />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.text}>
          Don't let your streak break!{' '}
          <Text style={styles.boldText}>{timeLeft}</Text> left.
        </Text>
      </View>
      <Pressable onPress={onDismiss} style={styles.closeButton}>
        <Icon name="close" size={20} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBE6', // Light warning yellow
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE58F',
  },
  iconContainer: {
    marginRight: spacing.sm,
  },
  textContainer: {
    flex: 1,
  },
  text: {
    fontSize: 13,
    fontFamily: typography.fontFamilyRegular,
    color: '#856404',
  },
  boldText: {
    fontFamily: typography.fontFamilyBold,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
});

export default StreakWarningBanner;
