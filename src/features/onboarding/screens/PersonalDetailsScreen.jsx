import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {AppRoute} from '../../../constants/routes';
import {colors, typography, spacing} from '../../../theme';
import {savePersonalDetails} from '../../../services/profile/profileService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PersonalDetailsScreen = () => {
  const navigation = useNavigation();
  const [details, setDetails] = useState({
    familyPlans: '',
    hasChildren: '',
    ethnicity: '',
    height: '',
    hometown: '',
    workplace: '',
    jobTitle: '',
    school: '',
    educationLevel: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const familyPlansOptions = [
    "Don't want children",
    'Want children',
    'Not sure yet',
    'Prefer not to say',
  ];

  const childrenOptions = [
    "Don't have children",
    'Have Children',
    'Prefer not to say',
  ];

  const ethnicityOptions = [
    'Black/African Descent',
    'East Asian',
    'Hispanic/Latino',
    'Middle Eastern',
    'Native American',
    'Pacific Islander',
    'South Asian',
    'Southeast Asian',
    'White/Caucasian',
    'Prefer not to say',
  ];

  const heightOptions = Array.from({length: 24}, (_, i) => {
    const feet = Math.floor((60 + i) / 12);
    const inches = (60 + i) % 12;
    return `${feet}'${inches}"`;
  });

  const educationLevelOptions = [
    'High School',
    'Undergrad',
    'Postgrad',
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

      // Save personal details to backend
      await savePersonalDetails(details);
      
      console.log('Personal details saved successfully');
      navigation.navigate(AppRoute.Lifestyle);
    } catch (error) {
      console.error('Error saving personal details:', error);
      Alert.alert(
        'Error',
        error?.message || 'Failed to save personal details. Please try again.',
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
        <Text style={styles.title}>More about you</Text>
        <Text style={styles.subtitle}>
          The more you share, the better your matches will be
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What are your family plans?</Text>
        {familyPlansOptions.map(option => (
          <Pressable
            key={option}
            style={[
              styles.optionButton,
              details.familyPlans === option && styles.optionButtonSelected,
            ]}
            onPress={() => setDetails(prev => ({...prev, familyPlans: option}))}>
            <Text
              style={[
                styles.optionText,
                details.familyPlans === option && styles.optionTextSelected,
              ]}>
              {option}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Do you have children?</Text>
        {childrenOptions.map(option => (
          <Pressable
            key={option}
            style={[
              styles.optionButton,
              details.hasChildren === option && styles.optionButtonSelected,
            ]}
            onPress={() => setDetails(prev => ({...prev, hasChildren: option}))}>
            <Text
              style={[
                styles.optionText,
                details.hasChildren === option && styles.optionTextSelected,
              ]}>
              {option}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          How do you describe your ethnicity?
        </Text>
        {ethnicityOptions.map(option => (
          <Pressable
            key={option}
            style={[
              styles.optionButton,
              details.ethnicity === option && styles.optionButtonSelected,
            ]}
            onPress={() => setDetails(prev => ({...prev, ethnicity: option}))}>
            <Text
              style={[
                styles.optionText,
                details.ethnicity === option && styles.optionTextSelected,
              ]}>
              {option}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>How tall are you (in feet)?</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.heightContainer}>
            {heightOptions.map(height => (
              <Pressable
                key={height}
                style={[
                  styles.heightButton,
                  details.height === height && styles.heightButtonSelected,
                ]}
                onPress={() => setDetails(prev => ({...prev, height}))}>
                <Text
                  style={[
                    styles.heightText,
                    details.height === height && styles.heightTextSelected,
                  ]}>
                  {height}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Where is your hometown?</Text>
        <TextInput
          value={details.hometown}
          onChangeText={value => setDetails(prev => ({...prev, hometown: value}))}
          placeholder="Enter your hometown"
          style={styles.input}
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Where do you work?</Text>
        <TextInput
          value={details.workplace}
          onChangeText={value =>
            setDetails(prev => ({...prev, workplace: value}))
          }
          placeholder="Enter your workplace"
          style={styles.input}
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What's your job title?</Text>
        <TextInput
          value={details.jobTitle}
          onChangeText={value => setDetails(prev => ({...prev, jobTitle: value}))}
          placeholder="Enter your job title"
          style={styles.input}
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Where did you go to school?</Text>
        <TextInput
          value={details.school}
          onChangeText={value => setDetails(prev => ({...prev, school: value}))}
          placeholder="Add a school"
          style={styles.input}
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          What's the highest level you attend?
        </Text>
        {educationLevelOptions.map(option => (
          <Pressable
            key={option}
            style={[
              styles.optionButton,
              details.educationLevel === option && styles.optionButtonSelected,
            ]}
            onPress={() =>
              setDetails(prev => ({...prev, educationLevel: option}))
            }>
            <Text
              style={[
                styles.optionText,
                details.educationLevel === option && styles.optionTextSelected,
              ]}>
              {option}
            </Text>
          </Pressable>
        ))}
      </View>

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
  heightContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  heightButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.inputBackground,
    minWidth: 60,
    alignItems: 'center',
  },
  heightButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.secondary,
  },
  heightText: {
    fontFamily: typography.fontFamilyMedium,
    fontSize: typography.body.medium,
    color: colors.textPrimary,
  },
  heightTextSelected: {
    fontFamily: typography.fontFamilyBold,
    color: colors.primary,
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

export default PersonalDetailsScreen;

