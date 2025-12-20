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
  ActivityIndicator,
  Alert,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {colors, typography, spacing} from '../../../theme';
import {resetPassword} from '../../../services/auth/authService';

const ResetPasswordScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const email = route.params?.email || '';
  
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const newErrors = {};
    
    if (!code.trim()) {
      newErrors.code = 'Reset code is required';
    } else if (code.trim().length !== 6) {
      newErrors.code = 'Reset code must be 6 digits';
    }
    
    if (!newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters';
    }
    
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    if (!email) {
      Alert.alert('Error', 'Email is required. Please go back and start again.');
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword(email, code.trim(), newPassword);
      
      Alert.alert(
        'Success',
        'Your password has been reset successfully. Please sign in with your new password.',
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [{name: 'SignIn'}],
              });
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error resetting password:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to reset password. Please check your reset code and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit code sent to {email || 'your email'} and your new password.
          </Text>
        </View>

        <View style={styles.fieldset}>
          <Text style={styles.label}>Reset Code</Text>
          <TextInput
            value={code}
            onChangeText={value => {
              setCode(value.replace(/\D/g, '').slice(0, 6));
              setErrors(prev => ({...prev, code: undefined}));
            }}
            placeholder="000000"
            keyboardType="number-pad"
            maxLength={6}
            style={[styles.input, errors.code && styles.inputError]}
            placeholderTextColor={colors.textSecondary}
            returnKeyType="next"
            editable={!isSubmitting}
          />
          {errors.code && <Text style={styles.errorText}>{errors.code}</Text>}
        </View>

        <View style={styles.fieldset}>
          <Text style={styles.label}>New Password</Text>
          <TextInput
            value={newPassword}
            onChangeText={value => {
              setNewPassword(value);
              setErrors(prev => ({...prev, newPassword: undefined}));
            }}
            placeholder="Enter new password"
            secureTextEntry
            style={[styles.input, errors.newPassword && styles.inputError]}
            placeholderTextColor={colors.textSecondary}
            returnKeyType="next"
            editable={!isSubmitting}
          />
          {errors.newPassword && <Text style={styles.errorText}>{errors.newPassword}</Text>}
        </View>

        <View style={styles.fieldset}>
          <Text style={styles.label}>Confirm Password</Text>
          <TextInput
            value={confirmPassword}
            onChangeText={value => {
              setConfirmPassword(value);
              setErrors(prev => ({...prev, confirmPassword: undefined}));
            }}
            placeholder="Confirm new password"
            secureTextEntry
            style={[styles.input, errors.confirmPassword && styles.inputError]}
            placeholderTextColor={colors.textSecondary}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            editable={!isSubmitting}
          />
          {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
        </View>

        <Pressable
          style={[styles.primaryButton, isSubmitting && styles.primaryButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}>
          {isSubmitting ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <Text style={styles.primaryButtonText}>Reset Password</Text>
          )}
        </Pressable>

        <Pressable
          style={styles.secondaryCta}
          onPress={() => navigation.goBack()}>
          <Text style={styles.secondaryCtaText}>Back</Text>
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
    marginBottom: spacing.xl,
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
  fieldset: {
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
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    marginTop: spacing.xs,
    color: colors.error,
    fontSize: typography.caption,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 18,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: colors.surface,
    fontFamily: typography.fontFamilyBold,
    fontSize: typography.body.large,
  },
  secondaryCta: {
    marginTop: spacing.xl,
    alignSelf: 'center',
  },
  secondaryCtaText: {
    fontFamily: typography.fontFamilyMedium,
    fontSize: typography.body.medium,
    color: colors.primary,
  },
});

export default ResetPasswordScreen;

