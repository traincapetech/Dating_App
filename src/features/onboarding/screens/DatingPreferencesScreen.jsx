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
import {saveDatingPreferences} from '../../../services/profile/profileService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useAuth} from '../../../context/AuthContext';

const DatingPreferencesScreen = () => {
  const {profile, loadProfile} = useAuth();
  const navigation = useNavigation();
  const [preferences, setPreferences] = useState({
    whoToDate: [],
    datingIntention: '',
    relationshipType: '',
    showIntentionOnProfile: true,
    showRelationshipTypeOnProfile: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const whoToDateOptions = ['Men', 'Women', 'Nonbinary People', 'Everyone'];

  const intentionOptions = [
    'Long-term Relationship',
    'Short-term relationship, open to short long-term',
    'Short-term relationship',
    'Figuring out my dating goals',
    'Prefer not to say',
  ];

  const relationshipTypeOptions = ['Monogamy', 'Non-Monogamy'];

  const toggleWhoToDate = option => {
    if (option === 'Everyone') {
      setPreferences(prev => ({
        ...prev,
        whoToDate: ['Everyone'],
      }));
    } else {
      setPreferences(prev => ({
        ...prev,
        whoToDate: prev.whoToDate.includes(option)
          ? prev.whoToDate.filter(item => item !== option)
          : prev.whoToDate.filter(item => item !== 'Everyone').concat(option),
      }));
    }
  };

  const canProceed = () => {
    return (
      preferences.whoToDate.length > 0 &&
      preferences.datingIntention &&
      preferences.relationshipType
    );
  };

  const handleContinue = async () => {
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

      // Save dating preferences to backend
      await saveDatingPreferences({...preferences, userId});

      console.log('Dating preferences saved successfully');

      // Reload profile in context
      if (userId) {
        await loadProfile(userId);
      }

      navigation.navigate(AppRoute.PersonalDetails);
    } catch (error) {
      console.error('Error saving dating preferences:', error);
      Alert.alert(
        'Error',
        error?.message ||
          'Failed to save dating preferences. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Who would you like to date?</Text>
        <Text style={styles.subtitle}>Select who you're open to meeting.</Text>
      </View>

      <View style={styles.section}>
        {whoToDateOptions.map(option => (
          <Pressable
            key={option}
            style={[
              styles.optionButton,
              preferences.whoToDate.includes(option) &&
                styles.optionButtonSelected,
            ]}
            onPress={() => toggleWhoToDate(option)}>
            <Text
              style={[
                styles.optionText,
                preferences.whoToDate.includes(option) &&
                  styles.optionTextSelected,
              ]}>
              {option}
            </Text>
            {preferences.whoToDate.includes(option) && (
              <Text style={styles.checkmark}>✓</Text>
            )}
          </Pressable>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What is your dating intention?</Text>
        {intentionOptions.map(option => (
          <Pressable
            key={option}
            style={[
              styles.optionButton,
              preferences.datingIntention === option &&
                styles.optionButtonSelected,
            ]}
            onPress={() =>
              setPreferences(prev => ({...prev, datingIntention: option}))
            }>
            <Text
              style={[
                styles.optionText,
                preferences.datingIntention === option &&
                  styles.optionTextSelected,
              ]}>
              {option}
            </Text>
          </Pressable>
        ))}
        <View style={styles.checkboxContainer}>
          <Pressable
            style={styles.checkbox}
            onPress={() =>
              setPreferences(prev => ({
                ...prev,
                showIntentionOnProfile: !prev.showIntentionOnProfile,
              }))
            }>
            <Text style={styles.checkboxIcon}>
              {preferences.showIntentionOnProfile ? '✓' : ''}
            </Text>
          </Pressable>
          <Text style={styles.checkboxLabel}>Visible on profile</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          What type of relationship are you looking for?
        </Text>
        {relationshipTypeOptions.map(option => (
          <Pressable
            key={option}
            style={[
              styles.optionButton,
              preferences.relationshipType === option &&
                styles.optionButtonSelected,
            ]}
            onPress={() =>
              setPreferences(prev => ({...prev, relationshipType: option}))
            }>
            <Text
              style={[
                styles.optionText,
                preferences.relationshipType === option &&
                  styles.optionTextSelected,
              ]}>
              {option}
            </Text>
          </Pressable>
        ))}
        <View style={styles.checkboxContainer}>
          <Pressable
            style={styles.checkbox}
            onPress={() =>
              setPreferences(prev => ({
                ...prev,
                showRelationshipTypeOnProfile:
                  !prev.showRelationshipTypeOnProfile,
              }))
            }>
            <Text style={styles.checkboxIcon}>
              {preferences.showRelationshipTypeOnProfile ? '✓' : ''}
            </Text>
          </Pressable>
          <Text style={styles.checkboxLabel}>Visible on profile</Text>
        </View>
      </View>

      <Pressable
        style={[
          styles.primaryButton,
          (isSubmitting || !canProceed()) && styles.primaryButtonDisabled,
        ]}
        onPress={handleContinue}
        disabled={isSubmitting || !canProceed()}>
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
    marginBottom: spacing.xxl,
  },
  sectionTitle: {
    fontFamily: typography.fontFamilyBold,
    fontSize: typography.body.large,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  optionButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    flex: 1,
  },
  optionTextSelected: {
    fontFamily: typography.fontFamilyBold,
    color: colors.primary,
  },
  checkmark: {
    color: colors.primary,
    fontSize: 18,
    fontFamily: typography.fontFamilyBold,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
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
    backgroundColor: colors.surface,
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
    opacity: 0.6,
  },
  primaryButtonText: {
    color: colors.surface,
    fontFamily: typography.fontFamilyBold,
    fontSize: typography.body.large,
  },
});

export default DatingPreferencesScreen;
