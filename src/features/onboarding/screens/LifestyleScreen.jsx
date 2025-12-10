import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {AppRoute} from '../../../constants/routes';
import {colors, typography, spacing} from '../../../theme';
import {saveLifestyle} from '../../../services/profile/profileService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LifestyleScreen = () => {
  const navigation = useNavigation();
  const [lifestyle, setLifestyle] = useState({
    drink: '',
    smokeTobacco: '',
    smokeWeed: '',
    useDrugs: '',
    politicalBeliefs: '',
    religiousBeliefs: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const yesNoOptions = ['Yes', 'Sometimes', 'No', 'Prefer Not to say'];

  const politicalOptions = [
    'Liberal',
    'Moderate',
    'Conservative',
    'Not Political',
    'Prefer not to say',
  ];

  const religiousOptions = [
    'Agnostic',
    'Atheist',
    'Buddhist',
    'Catholic',
    'Christian',
    'Hindu',
    'Jewish',
    'Muslim',
    'Spiritual',
    'Other',
    'Prefer not to say',
  ];

  const handleContinue = async () => {
    setIsSubmitting(true);
    try {
      // Get user ID from storage
      const userData = await AsyncStorage.getItem('@pryvo_user');
      let userId = null;
      
      if (userData) {
        const user = JSON.parse(userData);
        userId = user.id;
      } else {
        // Try to get from token (decode JWT)
        const token = await AsyncStorage.getItem('@pryvo/token');
        if (token) {
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

      // Save lifestyle to backend
      await saveLifestyle({...lifestyle, userId});
      
      console.log('Lifestyle saved successfully');
    navigation.navigate(AppRoute.ProfilePrompts);
    } catch (error) {
      console.error('Error saving lifestyle:', error);
      Alert.alert(
        'Error',
        error?.message || 'Failed to save lifestyle. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderQuestion = (title, field, options) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {options.map(option => (
        <Pressable
          key={option}
          style={[
            styles.optionButton,
            lifestyle[field] === option && styles.optionButtonSelected,
          ]}
          onPress={() => setLifestyle(prev => ({...prev, [field]: option}))}>
          <Text
            style={[
              styles.optionText,
              lifestyle[field] === option && styles.optionTextSelected,
            ]}>
            {option}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Lifestyle & Beliefs</Text>
        <Text style={styles.subtitle}>
          Share your lifestyle choices and beliefs
        </Text>
      </View>

      {renderQuestion('Do you drink?', 'drink', yesNoOptions)}
      {renderQuestion('Do you smoke tobacco?', 'smokeTobacco', yesNoOptions)}
      {renderQuestion('Did you smoke weed?', 'smokeWeed', yesNoOptions)}
      {renderQuestion('Do you use drugs?', 'useDrugs', yesNoOptions)}
      {renderQuestion(
        'What are your political beliefs?',
        'politicalBeliefs',
        politicalOptions,
      )}
      {renderQuestion(
        'What are your religious beliefs?',
        'religiousBeliefs',
        religiousOptions,
      )}

      <Pressable 
        style={[styles.primaryButton, isSubmitting && styles.primaryButtonDisabled]} 
        onPress={handleContinue}
        disabled={isSubmitting}>
        {isSubmitting ? (
          <ActivityIndicator color={colors.surface} />
        ) : (
        <Text style={styles.primaryButtonText}>Continue</Text>
        )}
      </Pressable>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    backgroundColor: colors.background,
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
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontFamily: typography.fontFamilyBold,
    fontSize: typography.body.large,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  optionButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
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
});

export default LifestyleScreen;

