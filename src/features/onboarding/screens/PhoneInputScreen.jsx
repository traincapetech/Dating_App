import React, {useRef, useState} from 'react';
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
import {useNavigation} from '@react-navigation/native';
import PhoneInput from 'react-native-phone-number-input';
import {AppRoute} from '../../../constants/routes';
import {colors, typography, spacing} from '../../../theme';

const PhoneInputScreen = () => {
  const navigation = useNavigation();
  const phoneInput = useRef(null);
  const [value, setValue] = useState('');
  const [formattedValue, setFormattedValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleContinue = async () => {
    if (!value.trim()) {
      Alert.alert('Required', 'Please enter your phone number');
      return;
    }
    
    // Validate phone number using the library
    const isValid = phoneInput.current?.isValidNumber(value);
    if (!isValid) {
      Alert.alert('Invalid', 'Please enter a valid phone number');
      return;
    }
    
    setIsSubmitting(true);
    // Just collect phone number and proceed - no OTP verification
    setTimeout(() => {
      setIsSubmitting(false);
      navigation.navigate(AppRoute.Welcome);
    }, 500);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>What's your phone number?</Text>
          <Text style={styles.subtitle}>
            We'll use this to help you connect with others.
          </Text>
        </View>

        <View style={styles.phoneContainer}>
          <PhoneInput
            ref={phoneInput}
            defaultValue={value}
            defaultCode="US"
            layout="first"
            onChangeText={setValue}
            onChangeFormattedText={text => {
              setFormattedValue(text);
            }}
            withDarkTheme={false}
            withShadow={false}
            autoFocus={false}
            containerStyle={styles.phoneInputContainer}
            textContainerStyle={styles.phoneInputTextContainer}
            textInputStyle={styles.phoneInputText}
            codeTextStyle={styles.phoneInputCodeText}
            flagButtonStyle={styles.phoneInputFlagButton}
            textInputProps={{
              placeholder: 'Phone number',
              placeholderTextColor: colors.textSecondary,
              returnKeyType: 'done',
              onSubmitEditing: handleContinue,
            }}
          />
        </View>

        <Pressable
          style={[
            styles.primaryButton,
            (!value.trim() || isSubmitting) && styles.primaryButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!value.trim() || isSubmitting}>
          {isSubmitting ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <Text style={styles.primaryButtonText}>Continue</Text>
          )}
        </Pressable>
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
    marginBottom: spacing.xxl,
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
  },
  phoneContainer: {
    marginBottom: spacing.xl,
  },
  phoneInputContainer: {
    width: '100%',
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 0,
  },
  phoneInputTextContainer: {
    backgroundColor: 'transparent',
    paddingVertical: 0,
    borderRadius: 14,
  },
  phoneInputText: {
    fontFamily: typography.fontFamilyRegular,
    fontSize: typography.body.medium,
    color: colors.textPrimary,
    height: 50,
  },
  phoneInputCodeText: {
    fontFamily: typography.fontFamilyMedium,
    fontSize: typography.body.medium,
    color: colors.textPrimary,
  },
  phoneInputFlagButton: {
    backgroundColor: 'transparent',
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
});

export default PhoneInputScreen;

