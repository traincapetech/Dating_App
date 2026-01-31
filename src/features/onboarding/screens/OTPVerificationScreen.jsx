import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import {AppRoute} from '../../../constants/routes';
import {colors, typography, spacing} from '../../../theme';

const OTPVerificationScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const phone = route.params?.phone || '';
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    // Auto-focus first input
    inputRefs.current[0]?.focus();
  }, []);

  const handleOtpChange = (value, index) => {
    if (value.length > 1) {
      // Handle paste
      const pastedOtp = value.slice(0, 6).split('');
      const newOtp = [...otp];
      pastedOtp.forEach((digit, i) => {
        if (index + i < 6) {
          newOtp[index + i] = digit;
        }
      });
      setOtp(newOtp);
      const nextIndex = Math.min(index + pastedOtp.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      return;
    }
    setIsSubmitting(true);
    // For phone verification, accept any 6-digit code (no SMS service yet)
    // TODO: Implement actual phone OTP verification when SMS service is added
    setTimeout(() => {
      setIsSubmitting(false);
      navigation.navigate(AppRoute.Welcome);
    }, 500);
  };

  const handleSkip = () => {
    // Skip OTP verification for phone numbers (no SMS service yet)
    navigation.navigate(AppRoute.Welcome);
  };

  const isOtpComplete = otp.every(digit => digit !== '');

  return (
    <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>OTP Verification</Text>
          <Text style={styles.subtitle}>
            We've sent a verification code to {phone}
          </Text>
        </View>

        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={ref => (inputRefs.current[index] = ref)}
              value={digit}
              onChangeText={value => handleOtpChange(value, index)}
              onKeyPress={e => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={1}
              style={styles.otpInput}
              textAlign="center"
              returnKeyType={index === 5 ? 'done' : 'next'}
              onSubmitEditing={index === 5 ? handleVerify : undefined}
            />
          ))}
        </View>

        <Pressable
          style={[
            styles.primaryButton,
            (!isOtpComplete || isSubmitting) && styles.primaryButtonDisabled,
          ]}
          onPress={handleVerify}
          disabled={!isOtpComplete || isSubmitting}>
          {isSubmitting ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <Text style={styles.primaryButtonText}>Verify</Text>
          )}
        </Pressable>

        {phone && (
          <Pressable style={styles.resendButton} onPress={handleSkip}>
            <Text style={styles.resendText}>Skip verification</Text>
          </Pressable>
        )}
        {!phone && (
          <Pressable style={styles.resendButton}>
            <Text style={styles.resendText}>Resend code</Text>
          </Pressable>
        )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  header: {
    marginBottom: spacing.xxl,
    alignItems: 'center',
  },
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
    textAlign: 'center',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xxl,
    gap: spacing.md,
  },
  otpInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: spacing.md,
    fontSize: typography.headings.h3,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    fontFamily: typography.fontFamilyBold,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 18,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: colors.surface,
    fontFamily: typography.fontFamilyBold,
    fontSize: typography.body.large,
  },
  resendButton: {
    marginTop: spacing.xl,
    alignSelf: 'center',
  },
  resendText: {
    fontFamily: typography.fontFamilyMedium,
    fontSize: typography.body.medium,
    color: colors.primary,
  },
});

export default OTPVerificationScreen;

