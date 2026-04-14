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
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import {AppRoute} from '../../../constants/routes';
import {colors, typography, spacing} from '../../../theme';
import {apiClient} from '../../../services/api/client';
import {useAuth} from '../../../context/AuthContext';

const OTPVerificationScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const {user} = useAuth();
  const phone = route.params?.phone || '';
  const email = route.params?.email || user?.email || '';
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleOtpChange = (value, index) => {
    if (value.length > 1) {
      const pastedOtp = value.slice(0, 6).split('');
      const newOtp = [...otp];
      pastedOtp.forEach((digit, i) => {
        if (index + i < 6) newOtp[index + i] = digit;
      });
      setOtp(newOtp);
      const nextIndex = Math.min(index + pastedOtp.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

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
    if (otpCode.length !== 6) return;

    setIsSubmitting(true);
    try {
      // 🚨 REAL VERIFICATION: Verify the code against the server
      await apiClient.post('/otp/email/verify', {
        email: email.trim().toLowerCase(),
        code: otpCode,
      });

      // Verification successful
      navigation.navigate(AppRoute.Welcome);
    } catch (error) {
      console.error('OTP Verification Error:', error);
      Alert.alert(
        'Invalid Code',
        error?.message || 'The verification code you entered is incorrect or has expired.'
      );
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    try {
      await apiClient.post('/otp/email/send', { email: email.toLowerCase() });
      Alert.alert('Sent', `A new code has been sent to ${email}`);
    } catch (err) {
      Alert.alert('Error', 'Failed to resend code. Please try again later.');
    }
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
            <View style={styles.headerTop}>
              <Text style={styles.title}>Secure Verification</Text>
            </View>
            <Text style={styles.subtitle}>
              We've sent a 6-digit verification code to your email: {'\n'}
              <Text style={styles.emailText}>{email}</Text>
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
                style={[styles.otpInput, digit && styles.otpInputFilled]}
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
              <Text style={styles.primaryButtonText}>Verify & Continue</Text>
            )}
          </Pressable>

          <Pressable style={styles.resendButton} onPress={handleResend}>
            <Text style={styles.resendText}>Didn't receive code? Resend</Text>
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
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
    width: '100%',
  },
  title: {
    fontFamily: typography.fontFamilyBold,
    fontSize: typography.headings.h2,
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: typography.fontFamilyRegular,
    fontSize: typography.body.medium,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 10,
  },
  emailText: {
    color: colors.primary,
    fontFamily: typography.fontFamilyBold,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xxl,
    gap: spacing.sm,
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
  otpInputFilled: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(124, 58, 237, 0.05)',
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 18,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  primaryButtonDisabled: { opacity: 0.5 },
  primaryButtonText: {
    color: colors.surface,
    fontFamily: typography.fontFamilyBold,
    fontSize: typography.body.large,
  },
  resendButton: {
    marginTop: spacing.xl,
    alignSelf: 'center',
    padding: 10,
  },
  resendText: {
    fontFamily: typography.fontFamilyMedium,
    fontSize: typography.body.medium,
    color: colors.primary,
  },
});

export default OTPVerificationScreen;