import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {colors, typography, spacing} from '../../../theme';
import {deleteAccount} from '../../../services/auth/authService';
import {clearTokens} from '../../../services/storage/tokenStorage';

const DeleteAccountScreen = () => {
  const navigation = useNavigation();
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};

    if (!password) {
      newErrors.password = 'Password is required to confirm deletion';
    }

    if (confirmText.toLowerCase() !== 'delete') {
      newErrors.confirmText = 'Please type "delete" to confirm';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleDelete = async () => {
    if (!validate()) {
      return;
    }

    Alert.alert(
      'Final Confirmation',
      'This action cannot be undone. All your data, matches, messages, and profile will be permanently deleted. Are you absolutely sure?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Yes, Delete My Account',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              const userData = await AsyncStorage.getItem('@pryvo_user');
              if (!userData || userData === 'undefined') {
                Alert.alert('Error', 'User not found. Please sign in again.');
                navigation.goBack();
                return;
              }

              const user = JSON.parse(userData);

              // Note: The backend delete endpoint doesn't require password verification
              // In production, you might want to add password verification
              await deleteAccount(user.id);

              // Clear all local data
              await clearTokens();
              await AsyncStorage.multiRemove([
                '@pryvo_user',
                '@pryvo/token',
                '@pryvo/refreshToken',
              ]);

              Alert.alert(
                'Account Deleted',
                "Your account has been permanently deleted. We're sorry to see you go!",
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      navigation.reset({
                        index: 0,
                        routes: [{name: 'OnboardingIntro'}],
                      });
                    },
                  },
                ],
              );
            } catch (error) {
              console.error('Error deleting account:', error);
              Alert.alert(
                'Error',
                error.message ||
                  'Failed to delete account. Please try again or contact support.',
              );
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable
              onPress={() => navigation.goBack()}
              style={styles.backButton}>
              <Text style={styles.backText}>←</Text>
            </Pressable>
            <Text style={styles.headerTitle}>Delete Account</Text>
            <View style={{width: 40}} />
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}>
            <View style={styles.warningBox}>
              <Text style={styles.warningIcon}>⚠️</Text>
              <Text style={styles.warningTitle}>This action is permanent</Text>
              <Text style={styles.warningText}>
                Deleting your account will permanently remove:
              </Text>
              <View style={styles.listContainer}>
                <Text style={styles.listItem}>• Your profile and photos</Text>
                <Text style={styles.listItem}>• All your matches</Text>
                <Text style={styles.listItem}>• All your messages</Text>
                <Text style={styles.listItem}>
                  • Your likes and preferences
                </Text>
                <Text style={styles.listItem}>• All other account data</Text>
              </View>
              <Text style={styles.warningText}>
                This cannot be undone. If you're sure, please continue below.
              </Text>
            </View>

            <View style={styles.fieldset}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                value={password}
                onChangeText={value => {
                  setPassword(value);
                  setErrors(prev => ({...prev, password: undefined}));
                }}
                placeholder="Enter your password"
                secureTextEntry
                style={[styles.input, errors.password && styles.inputError]}
                placeholderTextColor={colors.textSecondary}
                editable={!isDeleting}
              />
              {errors.password && (
                <Text style={styles.errorText}>{errors.password}</Text>
              )}
            </View>

            <View style={styles.fieldset}>
              <Text style={styles.label}>Type "delete" to confirm</Text>
              <TextInput
                value={confirmText}
                onChangeText={value => {
                  setConfirmText(value);
                  setErrors(prev => ({...prev, confirmText: undefined}));
                }}
                placeholder="Type 'delete'"
                style={[styles.input, errors.confirmText && styles.inputError]}
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
                editable={!isDeleting}
              />
              {errors.confirmText && (
                <Text style={styles.errorText}>{errors.confirmText}</Text>
              )}
            </View>

            <Pressable
              style={[
                styles.deleteButton,
                isDeleting && styles.deleteButtonDisabled,
              ]}
              onPress={handleDelete}
              disabled={isDeleting}>
              {isDeleting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.deleteButtonText}>Delete My Account</Text>
              )}
            </Pressable>

            <Pressable
              style={styles.cancelButton}
              onPress={() => navigation.goBack()}
              disabled={isDeleting}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          </ScrollView>
        </View>
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
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: colors.background,
  },
  backButton: {
    padding: spacing.sm,
  },
  backText: {
    fontSize: 24,
    color: colors.primary,
  },
  headerTitle: {
    fontSize: typography.headings?.h4 || 18,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
  },
  content: {
    padding: spacing.xl,
  },
  warningBox: {
    backgroundColor: '#FFF3CD',
    borderColor: '#FFC107',
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  warningIcon: {
    fontSize: 32,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  warningTitle: {
    fontFamily: typography.fontFamilyBold,
    fontSize: typography.body.large,
    color: '#856404',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  warningText: {
    fontFamily: typography.fontFamilyRegular,
    fontSize: typography.body.medium,
    color: '#856404',
    marginBottom: spacing.sm,
  },
  listContainer: {
    marginVertical: spacing.md,
    paddingLeft: spacing.md,
  },
  listItem: {
    fontFamily: typography.fontFamilyRegular,
    fontSize: typography.body.medium,
    color: '#856404',
    marginBottom: spacing.xs,
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
  deleteButton: {
    backgroundColor: colors.error,
    paddingVertical: spacing.md,
    borderRadius: 18,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  deleteButtonDisabled: {
    opacity: 0.6,
  },
  deleteButtonText: {
    color: '#fff',
    fontFamily: typography.fontFamilyBold,
    fontSize: typography.body.large,
  },
  cancelButton: {
    marginTop: spacing.md,
    alignSelf: 'center',
    paddingVertical: spacing.sm,
  },
  cancelButtonText: {
    fontFamily: typography.fontFamilyMedium,
    fontSize: typography.body.medium,
    color: colors.textSecondary,
  },
});

export default DeleteAccountScreen;
