import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {colors, typography, spacing} from '../../../theme';
import Icon from 'react-native-vector-icons/Ionicons';

const CountdownTimer = ({expiresAt, status}) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [isCritical, setIsCritical] = useState(false);

  useEffect(() => {
    if (!expiresAt || status !== 'active') return;

    const interval = setInterval(() => {
      const now = new Date();
      const end = new Date(expiresAt);
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft('Expired');
        clearInterval(interval);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);

      // Critical if less than 4 hours
      setIsCritical(diff < 4 * 60 * 60 * 1000);
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, status]);

  if (status === 'secured') {
    return (
      <View style={[styles.container, styles.securedContainer]}>
        <Icon name="checkmark-circle" size={14} color="#fff" />
        <Text style={styles.textSecured}>Date Secured</Text>
      </View>
    );
  }

  if (status === 'expired') {
    return (
      <View style={[styles.container, styles.expiredContainer]}>
        <Icon name="alert-circle" size={14} color="#fff" />
        <Text style={styles.textExpired}>Expired</Text>
      </View>
    );
  }

  if (!timeLeft) return null;

  return (
    <View
      style={[
        styles.container,
        isCritical ? styles.criticalContainer : styles.activeContainer,
      ]}>
      <Icon name="time-outline" size={14} color="#fff" />
      <Text style={styles.text}>{timeLeft}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  activeContainer: {
    backgroundColor: colors.primary,
  },
  criticalContainer: {
    backgroundColor: colors.error,
  },
  securedContainer: {
    backgroundColor: '#4CAF50',
  },
  expiredContainer: {
    backgroundColor: '#9E9E9E',
  },
  text: {
    color: '#fff',
    fontSize: 12,
    fontFamily: typography.fontFamilyBold,
  },
  textSecured: {
    color: '#fff',
    fontSize: 12,
    fontFamily: typography.fontFamilyBold,
  },
  textExpired: {
    color: '#fff',
    fontSize: 12,
    fontFamily: typography.fontFamilyBold,
  },
});

export default CountdownTimer;
