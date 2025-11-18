import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {GooglePlacesAutocomplete} from 'react-native-google-places-autocomplete';
import {useNavigation} from '@react-navigation/native';
import {AppRoute} from '../../../constants/routes';
import {colors, typography, spacing} from '../../../theme';
import {sendEmailOTP, verifyEmailOTP} from '../../../services/otp';
import {
  enableNotifications,
  disableNotifications,
  checkNotificationPermission,
} from '../../../services/notifications';

const BasicInfoScreen = () => {
  const navigation = useNavigation();
  const [step, setStep] = useState(1); // 1: Name, 2: Email, 3: Notifications, 4: Location, 5: Gender
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    emailVerified: false,
    notificationsEnabled: true,
    location: '',
    locationDetails: null,
    gender: '',
    showGenderOnProfile: true,
  });
  const [useSimpleInput, setUseSimpleInput] = useState(true); // Start with simple input to prevent crashes
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailOTP, setEmailOTP] = useState(['', '', '', '', '', '']);
  const [isSendingOTP, setIsSendingOTP] = useState(false);
  const [isVerifyingOTP, setIsVerifyingOTP] = useState(false);
  const [showOTPInput, setShowOTPInput] = useState(false);
  const otpInputRefs = React.useRef([]);

  const handleChange = (field, value) => {
    setForm(prev => ({...prev, [field]: value}));
  };

  const handleSendEmailOTP = async () => {
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }

    setIsSendingOTP(true);
    try {
      await sendEmailOTP(form.email);
      setShowOTPInput(true);
      Alert.alert('OTP Sent', 'Check your email for the verification code');
      // Auto-focus first OTP input
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    } catch (error) {
      Alert.alert('Error', error?.message || 'Failed to send OTP');
    } finally {
      setIsSendingOTP(false);
    }
  };

  const handleOTPChange = (value, index) => {
    if (value.length > 1) {
      // Handle paste
      const pastedOtp = value.slice(0, 6).split('');
      const newOtp = [...emailOTP];
      pastedOtp.forEach((digit, i) => {
        if (index + i < 6) {
          newOtp[index + i] = digit;
        }
      });
      setEmailOTP(newOtp);
      const nextIndex = Math.min(index + pastedOtp.length, 5);
      otpInputRefs.current[nextIndex]?.focus();
      return;
    }

    const newOtp = [...emailOTP];
    newOtp[index] = value;
    setEmailOTP(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOTPKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !emailOTP[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyEmailOTP = async () => {
    const otpCode = emailOTP.join('');
    if (otpCode.length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter the complete 6-digit code');
      return;
    }

    setIsVerifyingOTP(true);
    try {
      await verifyEmailOTP(form.email, otpCode);
      setForm(prev => ({...prev, emailVerified: true}));
      setShowOTPInput(false);
      Alert.alert('Email Verified', 'Your email has been verified successfully');
    } catch (error) {
      Alert.alert('Verification Failed', error?.message || 'Invalid OTP code');
      setEmailOTP(['', '', '', '', '', '']);
      otpInputRefs.current[0]?.focus();
    } finally {
      setIsVerifyingOTP(false);
    }
  };

  const handleNext = () => {
    if (step < 5) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      navigation.navigate(AppRoute.DatingPreferences);
    }, 500);
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return form.firstName.trim() && form.lastName.trim();
      case 2:
        return form.email.trim() && /\S+@\S+\.\S+/.test(form.email) && form.emailVerified;
      case 3:
        return true; // Notifications is optional
      case 4:
        return form.location.trim();
      case 5:
        return form.gender.trim();
      default:
        return false;
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <View>
            <Text style={styles.label}>First name</Text>
            <TextInput
              value={form.firstName}
              onChangeText={value => handleChange('firstName', value)}
              placeholder="First name"
              autoCapitalize="words"
              style={styles.input}
              placeholderTextColor={colors.textSecondary}
            />
            <Text style={[styles.label, {marginTop: spacing.lg}]}>
              Last name
            </Text>
            <TextInput
              value={form.lastName}
              onChangeText={value => handleChange('lastName', value)}
              placeholder="Last name"
              autoCapitalize="words"
              style={styles.input}
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        );
      case 2:
        return (
          <View>
            <Text style={styles.subtitle}>
              After giving email, OTP will be sent over email and after
              verification next screen will come.
            </Text>
            <Text style={[styles.label, {marginTop: spacing.lg}]}>Email</Text>
            <TextInput
              value={form.email}
              onChangeText={value => handleChange('email', value)}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
              placeholderTextColor={colors.textSecondary}
              editable={!form.emailVerified}
            />
            {form.emailVerified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>✓ Email Verified</Text>
              </View>
            )}

            {!form.emailVerified && (
              <>
                <Pressable
                  style={[
                    styles.otpButton,
                    isSendingOTP && styles.otpButtonDisabled,
                  ]}
                  onPress={handleSendEmailOTP}
                  disabled={isSendingOTP || !form.email.trim()}>
                  {isSendingOTP ? (
                    <ActivityIndicator color={colors.textInverse} size="small" />
                  ) : (
                    <Text style={styles.otpButtonText}>Send OTP</Text>
                  )}
                </Pressable>

                {showOTPInput && (
                  <View style={styles.otpContainer}>
                    <Text style={styles.otpLabel}>Enter verification code</Text>
                    <View style={styles.otpInputs}>
                      {emailOTP.map((digit, index) => (
                        <TextInput
                          key={index}
                          ref={ref => (otpInputRefs.current[index] = ref)}
                          value={digit}
                          onChangeText={value => handleOTPChange(value, index)}
                          onKeyPress={e => handleOTPKeyPress(e, index)}
                          keyboardType="number-pad"
                          maxLength={1}
                          style={styles.otpInput}
                          textAlign="center"
                        />
                      ))}
                    </View>
                    <Pressable
                      style={[
                        styles.verifyButton,
                        isVerifyingOTP && styles.verifyButtonDisabled,
                      ]}
                      onPress={handleVerifyEmailOTP}
                      disabled={isVerifyingOTP}>
                      {isVerifyingOTP ? (
                        <ActivityIndicator color={colors.textInverse} size="small" />
                      ) : (
                        <Text style={styles.verifyButtonText}>Verify</Text>
                      )}
                    </Pressable>
                  </View>
                )}
              </>
            )}
          </View>
        );
      case 3:
        return (
          <View>
            <Text style={styles.subtitle}>
              Never miss a message from someone. Get notified about new matches,
              messages, and likes.
            </Text>
            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>Enable Notifications</Text>
              <Switch
                value={form.notificationsEnabled}
                onValueChange={async value => {
                  try {
                    if (value) {
                      // Enable notifications - request permission and get token
                      await enableNotifications();
                      handleChange('notificationsEnabled', true);
                      Alert.alert(
                        'Notifications Enabled',
                        'You will now receive push notifications for matches and messages.',
                      );
                    } else {
                      // Disable notifications
                      await disableNotifications();
                      handleChange('notificationsEnabled', false);
                    }
                  } catch (error) {
                    Alert.alert(
                      'Notification Error',
                      error?.message ||
                        'Failed to update notification settings. Please try again.',
                    );
                    // Revert switch if error
                    handleChange('notificationsEnabled', !value);
                  }
                }}
                trackColor={{false: colors.borderLight, true: colors.primary}}
              />
            </View>
            <Pressable
              style={styles.secondaryButton}
              onPress={async () => {
                try {
                  await disableNotifications();
                  handleChange('notificationsEnabled', false);
                } catch (error) {
                  Alert.alert(
                    'Error',
                    'Failed to disable notifications. Please try again.',
                  );
                }
              }}>
              <Text style={styles.secondaryButtonText}>
                Disable Notification
              </Text>
            </Pressable>
          </View>
        );
      case 4:
        return (
          <View>
            <Text style={styles.subtitle}>
              Only the neighborhood name will appear on your profile.
            </Text>
            {useSimpleInput ? (
              <TextInput
                style={styles.input}
                placeholder="Enter your location"
                placeholderTextColor={colors.textSecondary}
                value={form.location}
                onChangeText={(text) => handleChange('location', text)}
                autoCapitalize="words"
              />
            ) : (
              <View style={styles.placesWrapper}>
                <GooglePlacesAutocomplete
                  placeholder="Search for your location"
                  predefinedPlaces={[]}
                  onPress={(data) => {
                    try {
                      if (data && data.description) {
                        handleChange('location', data.description);
                        handleChange('locationDetails', {
                          placeId: data.place_id || '',
                          description: data.description,
                          structured_formatting: data.structured_formatting || {},
                        });
                      }
                    } catch (error) {
                      console.error('Error handling place selection:', error);
                    }
                  }}
                  query={{
                    key: 'AIzaSyDD9uRgqIVB8roh8-ob-AZiiXoFocAExvY',
                    language: 'en',
                  }}
                  fetchDetails={false}
                  styles={{
                    container: {
                      flex: 0,
                    },
                    textInputContainer: {
                      marginTop: spacing.md,
                    },
                    textInput: {
                      ...styles.input,
                      marginTop: 0,
                    },
                    listView: {
                      backgroundColor: colors.surface,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: colors.border,
                      marginTop: spacing.sm,
                      maxHeight: 200,
                    },
                    row: {
                      padding: spacing.md,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.borderLight,
                    },
                    description: {
                      fontFamily: typography.fontFamilyRegular,
                      fontSize: typography.body.medium,
                      color: colors.textPrimary,
                    },
                  }}
                  textInputProps={{
                    placeholderTextColor: colors.textSecondary,
                    returnKeyType: 'search',
                    onFocus: () => {
                      // Prevent crashes on focus
                    },
                  }}
                  enablePoweredByContainer={false}
                  debounce={500}
                  minLength={2}
                  onFail={() => {
                    setUseSimpleInput(true);
                  }}
                />
              </View>
            )}
            {useSimpleInput && (
              <Pressable
                style={styles.linkButton}
                onPress={() => setUseSimpleInput(false)}>
                <Text style={styles.linkText}>
                  Try autocomplete again
                </Text>
              </Pressable>
            )}
            {form.location && (
              <View style={styles.selectedLocation}>
                <Text style={styles.selectedLocationText}>
                  Selected: {form.location}
                </Text>
              </View>
            )}
          </View>
        );
      case 5:
        return (
          <View>
            <Text style={styles.subtitle}>
              What gender best describes you?
            </Text>
            {['Man', 'Woman', 'Non Binary'].map(gender => (
              <Pressable
                key={gender}
                style={[
                  styles.optionButton,
                  form.gender === gender && styles.optionButtonSelected,
                ]}
                onPress={() => handleChange('gender', gender)}>
                <Text
                  style={[
                    styles.optionText,
                    form.gender === gender && styles.optionTextSelected,
                  ]}>
                  {gender}
                </Text>
              </Pressable>
            ))}
            <View style={styles.checkboxContainer}>
              <Pressable
                style={styles.checkbox}
                onPress={() =>
                  handleChange('showGenderOnProfile', !form.showGenderOnProfile)
                }>
                <Text style={styles.checkboxIcon}>
                  {form.showGenderOnProfile ? '✓' : ''}
                </Text>
              </Pressable>
              <Text style={styles.checkboxLabel}>Visible on profile</Text>
            </View>
          </View>
        );
      default:
        return null;
    }
  };

  // For location step, we can't use ScrollView because GooglePlacesAutocomplete uses FlatList
  const isLocationStep = step === 4;

  const content = (
    <>
      <View style={styles.header}>
        <Text style={styles.title}>
          {step === 1 && "What's your name?"}
          {step === 2 && 'Provide Your Email'}
          {step === 3 && 'Notifications'}
          {step === 4 && 'Location'}
          {step === 5 && 'Gender'}
        </Text>
      </View>

      {renderStepContent()}

      <Pressable
        style={[
          styles.primaryButton,
          (!canProceed() || isSubmitting) && styles.primaryButtonDisabled,
        ]}
        onPress={handleNext}
        disabled={!canProceed() || isSubmitting}>
        {isSubmitting ? (
          <ActivityIndicator color={colors.textInverse} />
        ) : (
          <Text style={styles.primaryButtonText}>
            {step === 5 ? 'Continue' : 'Next'}
          </Text>
        )}
      </Pressable>

      {step === 3 && (
        <Pressable
          style={styles.skipButton}
          onPress={() => setStep(4)}>
          <Text style={styles.skipText}>Skip for now</Text>
        </Pressable>
      )}
    </>
  );

  if (isLocationStep) {
    // For location step, use View to avoid VirtualizedList nesting
    return (
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        <View style={styles.container}>
          {content}
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled">
        {content}
      </ScrollView>
    </KeyboardAvoidingView>
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
    marginBottom: spacing.xl,
  },
  title: {
    fontFamily: typography.fontFamilyBold,
    fontSize: typography.headings.h2,
    color: colors.textPrimary,
  },
  subtitle: {
    fontFamily: typography.fontFamilyRegular,
    fontSize: typography.body.medium,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  label: {
    fontFamily: typography.fontFamilyMedium,
    fontSize: typography.body.medium,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.body.medium,
    color: colors.textPrimary,
    backgroundColor: colors.inputBackground,
  },
  verifiedBadge: {
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.success + '20',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  verifiedText: {
    color: colors.success,
    fontFamily: typography.fontFamilyMedium,
    fontSize: typography.body.small,
  },
  otpButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  otpButtonDisabled: {
    opacity: 0.6,
  },
  otpButtonText: {
    color: colors.textInverse,
    fontFamily: typography.fontFamilyBold,
    fontSize: typography.body.medium,
  },
  otpContainer: {
    marginTop: spacing.lg,
  },
  otpLabel: {
    fontFamily: typography.fontFamilyMedium,
    fontSize: typography.body.medium,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  otpInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  otpInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: spacing.md,
    fontSize: typography.headings.h3,
    color: colors.textPrimary,
    backgroundColor: colors.inputBackground,
    fontFamily: typography.fontFamilyBold,
  },
  verifyButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 14,
    alignItems: 'center',
  },
  verifyButtonDisabled: {
    opacity: 0.6,
  },
  verifyButtonText: {
    color: colors.textInverse,
    fontFamily: typography.fontFamilyBold,
    fontSize: typography.body.medium,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
  },
  switchLabel: {
    fontFamily: typography.fontFamilyMedium,
    fontSize: typography.body.medium,
    color: colors.textPrimary,
  },
  placesWrapper: {
    zIndex: 1,
  },
  placesContainer: {
    flex: 0,
  },
  placesInputContainer: {
    marginTop: spacing.md,
  },
  placesInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.body.medium,
    color: colors.textPrimary,
    backgroundColor: colors.inputBackground,
  },
  placesList: {
    marginTop: spacing.sm,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    maxHeight: 200,
  },
  placesRow: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  placesDescription: {
    fontFamily: typography.fontFamilyMedium,
    fontSize: typography.body.medium,
    color: colors.textPrimary,
  },
  placesSubtext: {
    fontFamily: typography.fontFamilyRegular,
    fontSize: typography.body.small,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  placesSeparator: {
    height: 1,
    backgroundColor: colors.borderLight,
  },
  selectedLocation: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.secondary,
    borderRadius: 12,
  },
  selectedLocationText: {
    fontFamily: typography.fontFamilyMedium,
    fontSize: typography.body.small,
    color: colors.primary,
  },
  optionButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.inputBackground,
  },
  optionButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.secondary,
  },
  optionText: {
    fontFamily: typography.fontFamilyMedium,
    fontSize: typography.body.medium,
    color: colors.textPrimary,
  },
  optionTextSelected: {
    fontFamily: typography.fontFamilyBold,
    color: colors.primary,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 6,
    marginRight: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.inputBackground,
  },
  checkboxIcon: {
    color: colors.primary,
    fontSize: 16,
    fontFamily: typography.fontFamilyBold,
  },
  checkboxLabel: {
    fontFamily: typography.fontFamilyRegular,
    fontSize: typography.body.medium,
    color: colors.textPrimary,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 18,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: colors.textInverse,
    fontFamily: typography.fontFamilyBold,
    fontSize: typography.body.large,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 18,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontFamily: typography.fontFamilyMedium,
    fontSize: typography.body.medium,
  },
  skipButton: {
    marginTop: spacing.md,
    alignSelf: 'center',
  },
  skipText: {
    fontFamily: typography.fontFamilyMedium,
    fontSize: typography.body.medium,
    color: colors.textSecondary,
  },
  linkButton: {
    marginTop: spacing.sm,
    padding: spacing.sm,
  },
  linkText: {
    fontFamily: typography.fontFamilyMedium,
    fontSize: typography.body.small,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
});

export default BasicInfoScreen;
