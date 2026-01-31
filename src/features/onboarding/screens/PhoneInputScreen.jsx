import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import PhoneInput from 'react-native-international-phone-number';
import { AppRoute } from '../../../constants/routes';
import { colors, typography, spacing } from '../../../theme';

const PhoneInputScreen = () => {
  const navigation = useNavigation();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // This library validates automatically through callbacks
  const [isValid, setIsValid] = useState(false);

  // Fallback validation: check if phone number has at least 10 digits
  const validatePhoneNumber = (phone) => {
    if (!phone || !phone.trim()) return false;
    // Remove all non-digit characters and check length
    const digitsOnly = phone.replace(/\D/g, '');
    return digitsOnly.length >= 10;
  };

  const handlePhoneChange = (value) => {
    setPhoneNumber(value);
    // Also update isValid based on our own validation as fallback
    // This ensures the button works even if the library's validation callback doesn't fire
    const valid = validatePhoneNumber(value);
    setIsValid(valid);
  };

  const handleContinue = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert('Required', 'Please enter your phone number');
      return;
    }

    // Use fallback validation if library validation didn't work
    const phoneValid = isValid || validatePhoneNumber(phoneNumber);
    
    if (!phoneValid) {
      Alert.alert('Invalid', 'Please enter a valid phone number (at least 10 digits)');
      return;
    }

    setIsSubmitting(true);

    try {
      // Navigate to OTPVerification screen with phone number
      // The OTPVerification screen will handle the verification or skip it
      navigation.navigate(AppRoute.OTPVerification, { phone: phoneNumber });
    } catch (error) {
      console.error('Error in handleContinue:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>What's your phone number?</Text>
          <Text style={styles.subtitle}>
            We'll use this to help you connect with others.
          </Text>
        </View>

        {/* CORRECT IMPLEMENTATION FOR NEW LIBRARY */}
        <PhoneInput
          defaultCountry="IN"
          value={phoneNumber}
          onChangePhoneNumber={handlePhoneChange}
          onChangeIsValid={setIsValid}
          containerStyle={styles.phoneInputContainer}
          phoneInputTextStyle={styles.phoneInputText}
          placeholder="Phone number"
        />

        <Pressable
          style={[
            styles.primaryButton,
            (!phoneNumber.trim() || (!isValid && !validatePhoneNumber(phoneNumber)) || isSubmitting) &&
              styles.primaryButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!phoneNumber.trim() || (!isValid && !validatePhoneNumber(phoneNumber)) || isSubmitting}>
          {isSubmitting ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <Text style={styles.primaryButtonText}>Continue</Text>
          )}
        </Pressable>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  header: { marginBottom: spacing.xxl },
  title: {
    fontFamily: typography.fontFamilyBold,
    fontSize: typography.headings.h2,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontFamily: typography.fontFamilyRegular,
    fontSize: typography.body.medium,
    color: colors.textSecondary,
  },
  phoneInputContainer: {
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.inputBackground,
    marginBottom: spacing.xl,
  },
  phoneInputText: {
    fontSize: typography.body.medium,
    color: colors.textPrimary,
    fontFamily: typography.fontFamilyRegular,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 18,
    alignItems: 'center',
  },
  primaryButtonDisabled: { opacity: 0.4 },
  primaryButtonText: {
    color: colors.surface,
    fontFamily: typography.fontFamilyBold,
    fontSize: typography.body.large,
  },
});

export default PhoneInputScreen;
