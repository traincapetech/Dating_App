import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, typography, spacing } from '../../../theme';
import { changeEmail } from '../../../services/auth/authService';

const ChangeEmailScreen = () => {
  const navigation = useNavigation();
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!newEmail.trim()) {
      Alert.alert('Required', 'Please enter your new email address');
      return;
    }

    if (!password.trim()) {
      Alert.alert('Required', 'Please enter your password to confirm');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.trim())) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);

    try {
      const userData = await AsyncStorage.getItem('@pryvo_user');
      if (!userData) {
        Alert.alert('Error', 'User not found. Please sign in again.');
        navigation.goBack();
        return;
      }

      const user = JSON.parse(userData);
      await changeEmail(user.id, newEmail.trim(), password);

      Alert.alert(
        'Success',
        'Your email has been updated successfully',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Error changing email:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        data: error.data,
        stack: error.stack,
      });
      
      let errorMessage = 'Failed to update email. Please try again.';
      
      // Handle network errors
      if (error.isNetworkError) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (error.isHtmlResponse) {
        errorMessage = 'Server error. The email change feature may not be available on the server yet.';
      } else if (error.message && error.message !== 'Something went wrong') {
        errorMessage = error.message;
      } else if (error.data?.message) {
        errorMessage = error.data.message;
      } else if (error.data?.error) {
        errorMessage = error.data.error;
      } else if (error.status === 401) {
        errorMessage = 'Invalid password. Please check your password and try again.';
      } else if (error.status === 409) {
        errorMessage = 'An account already exists with this email address.';
      } else if (error.status === 404) {
        errorMessage = 'User not found. Please sign in again.';
      } else if (error.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Change Email</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.description}>
          Enter your new email address and current password to update your email.
        </Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>New Email</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter new email"
            placeholderTextColor={colors.textSecondary}
            value={newEmail}
            onChangeText={setNewEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isSubmitting}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Current Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your password"
            placeholderTextColor={colors.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!isSubmitting}
          />
        </View>

        <Pressable
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}>
          {isSubmitting ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <Text style={styles.submitButtonText}>Update Email</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: spacing.sm,
  },
  backText: {
    fontSize: 24,
    color: '#1a1a1a',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: typography.fontFamilyBold,
    color: '#1a1a1a',
  },
  content: {
    padding: spacing.lg,
  },
  description: {
    fontSize: typography.body.medium,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: typography.body.medium,
    fontFamily: typography.fontFamilyMedium,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.body.medium,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textPrimary,
    backgroundColor: colors.inputBackground,
  },
  submitButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 18,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: colors.surface,
    fontFamily: typography.fontFamilyBold,
    fontSize: typography.body.large,
  },
});

export default ChangeEmailScreen;

