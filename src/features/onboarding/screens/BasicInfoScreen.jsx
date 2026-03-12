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
  PermissionsAndroid,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Geolocation from 'react-native-geolocation-service';
import {useNavigation} from '@react-navigation/native';
import {AppRoute} from '../../../constants/routes';
import {colors, typography, spacing} from '../../../theme';
import {sendEmailOTP, verifyEmailOTP} from '../../../services/otp';
import {
  enableNotifications,
  disableNotifications,
  checkNotificationPermission,
} from '../../../services/notifications';
import {saveBasicInfo} from '../../../services/profile/profileService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import {useAuth} from '../../../context/AuthContext';

const BasicInfoScreen = () => {
  const {loadProfile} = useAuth();
  const navigation = useNavigation();
  const [step, setStep] = useState(1); // 1: Name, 2: Email, 3: Notifications, 4: Location, 5: Gender
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    dob: '',
    email: '',
    emailVerified: false,
    notificationsEnabled: true,
    location: '',
    locationDetails: null,
    gender: '',
    showGenderOnProfile: true,
    isVerified: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [emailOTP, setEmailOTP] = useState(['', '', '', '', '', '']);
  const [isSendingOTP, setIsSendingOTP] = useState(false);
  const [isVerifyingOTP, setIsVerifyingOTP] = useState(false);
  const [showOTPInput, setShowOTPInput] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const otpInputRefs = React.useRef([]);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Pre-fill form from stored user data on mount
  React.useEffect(() => {
    const prefillData = async () => {
      try {
        const userData = await AsyncStorage.getItem('@pryvo_user');
        if (userData && userData !== 'undefined') {
          const user = JSON.parse(userData);
          const fullName = user.fullName || '';
          const email = user.email || '';

          // Split full name into first and last name
          let firstName = '';
          let lastName = '';
          if (fullName) {
            const parts = fullName.trim().split(' ');
            firstName = parts[0] || '';
            lastName = parts.slice(1).join(' ') || '';
          }

          setForm(prev => ({
            ...prev,
            firstName: prev.firstName || firstName,
            lastName: prev.lastName || lastName,
            email: prev.email || email,
          }));
        }
      } catch (error) {
        console.warn('Failed to pre-fill device data:', error);
      } finally {
        setHasInitialized(true);
      }
    };

    prefillData();
  }, []);

  const handleChange = (field, value) => {
    setForm(prev => ({...prev, [field]: value}));
  };

  // Pre-fill form and determine starting step from backend or storage
  React.useEffect(() => {
    const initializeOnboarding = async () => {
      try {
        setIsSubmitting(true);
        // 1. Get basic user info from storage (from signup/login)
        const userData = await AsyncStorage.getItem('@pryvo_user');
        let userId = null;
        let storedEmail = '';
        let storedFirstName = '';
        let storedLastName = '';

        if (userData && userData !== 'undefined') {
          const user = JSON.parse(userData);
          userId = user.id;
          storedEmail = user.email || '';
          const fullName = user.fullName || '';
          if (fullName) {
            const parts = fullName.trim().split(' ');
            storedFirstName = parts[0] || '';
            storedLastName = parts.slice(1).join(' ') || '';
          }
        }

        if (!userId) {
          setHasInitialized(true);
          setIsSubmitting(false);
          return;
        }

        // 2. Fetch full profile from backend to see what's missing
        const {getProfile} = await import(
          '../../../services/profile/profileService'
        );
        const profileResponse = await getProfile(userId);

        if (profileResponse?.profile) {
          const p = profileResponse.profile;
          // Important: Our enriched profile from server flattens email and isVerified,
          // but firstName, lastName etc are in basicInfo
          const firstName = p.basicInfo?.firstName || storedFirstName;
          const lastName = p.basicInfo?.lastName || storedLastName;
          const email = p.email || storedEmail; // Enriched top-level
          const dob = p.basicInfo?.dob || '';
          const isVerified = p.isVerified || false; // Enriched top-level
          const notificationsEnabled = p.basicInfo?.notificationsEnabled;
          const location = p.basicInfo?.location || '';
          const locationDetails = p.basicInfo?.locationDetails || null;
          const gender = p.basicInfo?.gender || '';

          setForm({
            firstName,
            lastName,
            dob,
            email,
            emailVerified: isVerified,
            isVerified,
            notificationsEnabled,
            location,
            locationDetails,
            gender,
            showGenderOnProfile: p.basicInfo?.showGenderOnProfile !== false,
          });

          // 3. Determine the first incomplete step
          if (!firstName || !lastName || !dob) {
            setStep(1);
          } else if (!isVerified) {
            setStep(2);
          } else if (notificationsEnabled === undefined) {
            setStep(3);
          } else if (!locationDetails) {
            setStep(4);
          } else if (!gender) {
            setStep(5);
          } else {
            // Everything done in basic info, maybe advance to next screen?
            // Actually let's stay on step 5 or just navigate away
            setStep(5);
          }
        } else {
          // Fallback to pre-fill from storage if profile fetch empty
          setForm(prev => ({
            ...prev,
            firstName: storedFirstName,
            lastName: storedLastName,
            email: storedEmail,
          }));
          setStep(1);
        }
      } catch (error) {
        console.warn('Failed to initialize onboarding progress:', error);
        setStep(1);
      } finally {
        setIsSubmitting(false);
        setHasInitialized(true);
      }
    };

    initializeOnboarding();
  }, []);

  // Request location permission
  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message:
              'Pryvo needs access to your location to show you matches nearby.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('Location permission error:', err);
        return false;
      }
    }
    // iOS handles permissions automatically via Info.plist
    return true;
  };

  // Get current location using GPS
  const getCurrentLocation = async () => {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      Alert.alert(
        'Permission Denied',
        'Location permission is required to find matches nearby. Please enable it in your device settings.',
      );
      return;
    }

    setIsGettingLocation(true);
    try {
      const position = await new Promise((resolve, reject) => {
        Geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
        });
      });

      const {latitude, longitude, accuracy} = position.coords;

      // Store GPS coordinates
      const locationData = {
        lat: latitude,
        lng: longitude,
        accuracy: accuracy,
        timestamp: position.timestamp,
        source: 'gps',
      };

      // Get city name using reverse geocoding (optional)
      try {
        const cityName = await reverseGeocode(latitude, longitude);
        if (cityName) {
          locationData.city = cityName;
          locationData.description = cityName;
          handleChange('location', cityName);
        } else {
          handleChange(
            'location',
            `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
          );
        }
      } catch (geocodeError) {
        console.warn('Reverse geocoding failed:', geocodeError);
        // Use coordinates as fallback
        handleChange(
          'location',
          `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        );
      }

      handleChange('locationDetails', locationData);
      Alert.alert(
        'Location Found',
        'Your location has been detected successfully!',
      );
    } catch (error) {
      console.error('Location error:', error);
      Alert.alert(
        'Location Error',
        error.message ||
          'Failed to get your location. Please make sure GPS is enabled and try again.',
      );
    } finally {
      setIsGettingLocation(false);
    }
  };

  // Reverse geocoding to get city name from coordinates
  const reverseGeocode = async (lat, lng) => {
    try {
      // Using Google Geocoding API for reverse geocoding
      const apiKey = 'AIzaSyDD9uRgqIVB8roh8-ob-AZiiXoFocAExvY';
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}&language=en`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.results.length > 0) {
        // Extract city/locality from results
        const result = data.results[0];
        const addressComponents = result.address_components;

        // Find city/locality
        let city = null;
        for (const component of addressComponents) {
          if (
            component.types.includes('locality') ||
            component.types.includes('administrative_area_level_1')
          ) {
            city = component.long_name;
            break;
          }
        }

        // Fallback to formatted address
        if (!city) {
          city = result.formatted_address.split(',')[0];
        }

        return city;
      }
      return null;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return null;
    }
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
      Alert.alert(
        'Email Verified',
        'Your email has been verified successfully',
        [
          {
            text: 'OK',
            onPress: () => {
              // Auto-advance to next step
              setStep(3);
            },
          },
        ],
      );
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
    try {
      // Get user ID from storage
      const userData = await AsyncStorage.getItem('@pryvo_user');
      let userId = null;

      if (userData && userData !== 'undefined') {
        const user = JSON.parse(userData);
        userId = user.id;
      } else {
        // Try to get from token (decode JWT)
        const token = await AsyncStorage.getItem('@pryvo/token');
        if (token && token !== 'undefined') {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            userId = payload.userId || payload.id;
          } catch (e) {
            console.error('Failed to decode token:', e);
          }
        }
      }

      if (!userId) {
        Alert.alert('Error', 'User ID not found. Please sign in again.');
        setIsSubmitting(false);
        return;
      }

      // Prepare basic info data
      const basicInfoData = {
        userId: userId, // Include userId for server authentication
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        dob: form.dob.trim(),
        email: form.email.trim(),
        location: form.location.trim(),
        locationDetails: form.locationDetails,
        gender: form.gender,
        showGenderOnProfile: form.showGenderOnProfile,
        notificationsEnabled: form.notificationsEnabled,
      };

      // Save to backend
      await saveBasicInfo(basicInfoData);

      console.log('Basic info saved successfully');

      // Reload profile in context
      if (userId) {
        await loadProfile(userId);
      }

      navigation.navigate(AppRoute.DatingPreferences);
    } catch (error) {
      console.error('Error saving basic info:', error);
      Alert.alert(
        'Error',
        error?.message || 'Failed to save basic info. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate age from date of birth
  const calculateAge = dobString => {
    if (!dobString || dobString.length < 10) return null;

    try {
      // Parse date (format: YYYY-MM-DD)
      const parts = dobString.split('-');
      if (parts.length !== 3) return null;

      const birthDate = new Date(
        parseInt(parts[0]),
        parseInt(parts[1]) - 1,
        parseInt(parts[2]),
      );
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();

      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birthDate.getDate())
      ) {
        age--;
      }

      return age;
    } catch (error) {
      console.error('Error calculating age:', error);
      return null;
    }
  };

  // Verify user is 18+
  const verifyAge = dobString => {
    const age = calculateAge(dobString);
    if (age === null)
      return {
        valid: false,
        message: 'Please enter a valid date of birth (YYYY-MM-DD)',
      };
    if (age < 18)
      return {
        valid: false,
        message: 'You must be at least 18 years old to use Pryvo.',
      };
    return {valid: true, age};
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        if (
          !form.firstName.trim() ||
          !form.lastName.trim() ||
          !form.dob.trim()
        ) {
          return false;
        }
        // Verify age is 18+
        const ageCheck = verifyAge(form.dob);
        return ageCheck.valid;
      case 2:
        return (
          form.email.trim() &&
          /\S+@\S+\.\S+/.test(form.email) &&
          form.emailVerified
        );
      case 3:
        return true; // Notifications is optional
      case 4:
        // Require GPS coordinates
        return (
          form.locationDetails &&
          form.locationDetails.lat &&
          form.locationDetails.lng &&
          form.locationDetails.source === 'gps'
        );
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
            <Text style={[styles.label, {marginTop: spacing.lg}]}>
              Date of birth (YYYY-MM-DD)
            </Text>
            <Text style={styles.hintText}>
              You must be at least 18 years old to use Pryvo
            </Text>
            <Pressable
              style={styles.input}
              onPress={() => setShowDatePicker(true)}>
              <Text
                style={{
                  color: form.dob ? colors.textPrimary : colors.textSecondary,
                  fontSize: typography.body.medium,
                }}>
                {form.dob || 'YYYY-MM-DD'}
              </Text>
            </Pressable>

            {showDatePicker && (
              <DateTimePicker
                value={
                  form.dob
                    ? new Date(`${form.dob}T12:00:00`)
                    : (() => {
                        const d = new Date();
                        d.setFullYear(d.getFullYear() - 18);
                        return d;
                      })()
                }
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                maximumDate={(() => {
                  const d = new Date();
                  d.setFullYear(d.getFullYear() - 18);
                  return d;
                })()}
                onChange={(event, selectedDate) => {
                  if (Platform.OS === 'android') setShowDatePicker(false);
                  if (selectedDate && event.type !== 'dismissed') {
                    const year = selectedDate.getFullYear();
                    const month = String(selectedDate.getMonth() + 1).padStart(
                      2,
                      '0',
                    );
                    const day = String(selectedDate.getDate()).padStart(2, '0');
                    const formattedDate = `${year}-${month}-${day}`;
                    handleChange('dob', formattedDate);
                  }
                }}
              />
            )}
            {form.dob.length >= 10 &&
              (() => {
                const ageCheck = verifyAge(form.dob);
                if (!ageCheck.valid) {
                  return (
                    <Text style={styles.errorText}>{ageCheck.message}</Text>
                  );
                }
                return (
                  <Text style={styles.successText}>
                    ✓ Age verified: {ageCheck.age} years old
                  </Text>
                );
              })()}
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
                    <ActivityIndicator
                      color={colors.textInverse}
                      size="small"
                    />
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
                        <ActivityIndicator
                          color={colors.textInverse}
                          size="small"
                        />
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
                  const previousValue = form.notificationsEnabled;
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
                      // Only try to unregister token if permission was actually granted
                      const hasPermission = await checkNotificationPermission();
                      if (hasPermission) {
                        await disableNotifications();
                      }
                      // Disable notifications
                      handleChange('notificationsEnabled', false);
                    }
                  } catch (error) {
                    Alert.alert(
                      'Notification Error',
                      error?.message ||
                        'Failed to update notification settings. Please try again.',
                    );
                    // Revert switch if error
                    handleChange('notificationsEnabled', previousValue);
                  }
                }}
                trackColor={{false: colors.borderLight, true: colors.primary}}
              />
            </View>
            <Pressable
              style={styles.secondaryButton}
              onPress={async () => {
                try {
                  const hasPermission = await checkNotificationPermission();
                  if (hasPermission) {
                    await disableNotifications();
                  }
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
              We'll use your device's GPS to detect your location. This helps us
              show you matches nearby.
            </Text>

            <Pressable
              style={[
                styles.locationButton,
                isGettingLocation && styles.locationButtonDisabled,
              ]}
              onPress={getCurrentLocation}
              disabled={isGettingLocation}>
              {isGettingLocation ? (
                <>
                  <ActivityIndicator color={colors.primary} size="small" />
                  <Text style={styles.locationButtonText}>
                    Detecting location...
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.locationIcon}>📍</Text>
                  <Text style={styles.locationButtonText}>Get My Location</Text>
                </>
              )}
            </Pressable>

            {form.location && form.locationDetails && (
              <View style={styles.selectedLocation}>
                <Text style={styles.selectedLocationText}>
                  ✓ Location: {form.location}
                </Text>
                {form.locationDetails.lat && form.locationDetails.lng && (
                  <Text style={styles.locationCoordsText}>
                    Coordinates: {form.locationDetails.lat.toFixed(6)},{' '}
                    {form.locationDetails.lng.toFixed(6)}
                  </Text>
                )}
                {form.locationDetails.accuracy && (
                  <Text style={styles.locationAccuracyText}>
                    Accuracy: ±{Math.round(form.locationDetails.accuracy)}m
                  </Text>
                )}
              </View>
            )}

            {!form.locationDetails && (
              <View style={styles.infoBox}>
                <Text style={styles.infoBoxText}>
                  💡 Make sure your GPS is enabled and you're in an area with
                  good signal.
                </Text>
              </View>
            )}
          </View>
        );
      case 5:
        return (
          <View>
            <Text style={styles.subtitle}>What gender best describes you?</Text>
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
        <Pressable style={styles.skipButton} onPress={() => setStep(4)}>
          <Text style={styles.skipText}>Skip for now</Text>
        </Pressable>
      )}
    </>
  );

  if (isLocationStep) {
    // For location step, use View to avoid VirtualizedList nesting
    return (
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
          <View style={styles.container}>{content}</View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled">
          {content}
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
  locationCoordsText: {
    fontFamily: typography.fontFamilyRegular,
    fontSize: typography.body.small,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  warningLocation: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.warning + '20',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  warningLocationText: {
    fontFamily: typography.fontFamilyMedium,
    fontSize: typography.body.small,
    color: colors.warning || colors.error,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 14,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  locationButtonDisabled: {
    opacity: 0.6,
  },
  locationIcon: {
    fontSize: 24,
  },
  locationButtonText: {
    fontFamily: typography.fontFamilyBold,
    fontSize: typography.body.medium,
    color: colors.surface,
  },
  locationAccuracyText: {
    fontFamily: typography.fontFamilyRegular,
    fontSize: typography.body.small,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  infoBox: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.secondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoBoxText: {
    fontFamily: typography.fontFamilyRegular,
    fontSize: typography.body.small,
    color: colors.textSecondary,
    lineHeight: 20,
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
  hintText: {
    fontFamily: typography.fontFamilyRegular,
    fontSize: typography.body.small,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  errorText: {
    fontFamily: typography.fontFamilyRegular,
    fontSize: typography.body.small,
    color: '#FF3B30',
    marginTop: spacing.xs,
  },
  successText: {
    fontFamily: typography.fontFamilyMedium,
    fontSize: typography.body.small,
    color: colors.success || '#34C759',
    marginTop: spacing.xs,
  },
});

export default BasicInfoScreen;
