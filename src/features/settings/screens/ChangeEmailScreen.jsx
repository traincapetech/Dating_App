import React, {useState} from 'react';
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
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {colors, typography, spacing} from '../../../theme';
import {changeEmail} from '../../../services/auth/authService';
import ThemeBackground from '../../../components/layout/ThemeBackground';

const ChangeEmailScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.trim())) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);

    try {
      const userData = await AsyncStorage.getItem('@pryvo_user');
      if (userData && userData !== 'undefined') {
        try {
          const user = JSON.parse(userData);
          await changeEmail(user.id, newEmail.trim(), password);

          Alert.alert('Success', 'Your email has been updated successfully', [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]);
        } catch (e) {
          console.error('Failed to parse user data in ChangeEmailScreen:', e);
          Alert.alert('Error', 'Invalid session. Please sign in again.');
          navigation.reset({
            index: 0,
            routes: [{name: 'OnboardingIntro'}],
          });
        }
      } else {
        Alert.alert('Error', 'User not found. Please sign in again.');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error changing email:', error);
      let errorMessage = 'Failed to update email. Please try again.';

      if (error.status === 401) {
        errorMessage = 'Invalid password. Please check your password and try again.';
      } else if (error.status === 409) {
        errorMessage = 'An account already exists with this email address.';
      } else if (error.message && error.message !== 'Something went wrong') {
        errorMessage = error.message;
      }

      Alert.alert('Error', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ThemeBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.header}>
            <Pressable
              onPress={() => navigation.goBack()}
              style={styles.backButton}>
              <MaterialCommunityIcons
                name="arrow-left"
                size={28}
                color={colors.textPrimary}
              />
            </Pressable>
            <Text style={styles.headerTitle}>Change Email</Text>
            <View style={{width: 40}} />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.content,
              {paddingBottom: insets.bottom + spacing.xl},
            ]}>
            <Text style={styles.description}>
              Enter your new email address and current password to update your
              email.
            </Text>

            <View style={styles.card}>
              <View style={styles.inputWrapper}>
                <Text style={styles.label}>New Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter new email"
                  placeholderTextColor={colors.textTertiary}
                  value={newEmail}
                  onChangeText={setNewEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isSubmitting}
                />
              </View>

              <View style={[styles.inputWrapper, styles.lastInputWrapper]}>
                <Text style={styles.label}>Current Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.textTertiary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  editable={!isSubmitting}
                />
              </View>
            </View>

            <Pressable
              style={[
                styles.submitButton,
                isSubmitting && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting}>
              {isSubmitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitButtonText}>Update Email</Text>
              )}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemeBackground>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: 'transparent',
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
  },
  content: {
    padding: spacing.lg,
  },
  description: {
    fontSize: 14,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    lineHeight: 20,
    paddingHorizontal: spacing.sm,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: spacing.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(107, 33, 168, 0.1)',
  },
  inputWrapper: {
    paddingVertical: spacing.md + 4,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(107, 33, 168, 0.05)',
  },
  lastInputWrapper: {
    borderBottomWidth: 0,
  },
  label: {
    fontSize: 12,
    fontFamily: typography.fontFamilyBold,
    color: '#6B21A8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  input: {
    fontSize: 16,
    fontFamily: typography.fontFamilyMedium,
    color: '#333',
    padding: 0, // Reset padding for cleaner look inside card
  },
  submitButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginTop: spacing.sm,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFF',
    fontFamily: typography.fontFamilyBold,
    fontSize: 16,
  },
});

export default ChangeEmailScreen;