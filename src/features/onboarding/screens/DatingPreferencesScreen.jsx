import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useNavigation} from '@react-navigation/native';
import {AppRoute} from '../../../constants/routes';
import {colors, typography, spacing} from '../../../theme';
import {updateProfile} from '../../../services/profile/profileService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useAuth} from '../../../context/AuthContext';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {decodeJWT} from '../../../utils/safeUtils';
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
      await updateProfile({datingPreferences: preferences});
      console.log('Dating preferences saved successfully');
      const userData = await AsyncStorage.getItem('@pryvo_user');
      if (userData) {
        const user = JSON.parse(userData);
        await loadProfile(user.id);
      }
      navigation.navigate(AppRoute.PersonalDetails);
    } catch (error) {
      console.error('Error saving dating preferences:', error);
      Alert.alert(
        'Error',
        error?.message || 'Failed to save dating preferences. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <LinearGradient
      colors={['#743A9A', '#9B5CC5']}
      style={styles.flex}>
      {/* Programmatic Botanical Shadows */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <MaterialCommunityIcons name="leaf" size={180} color="#000" style={{ position: 'absolute', opacity: 0.08, top: -20, left: -60, transform: [{ rotate: '45deg' }] }} />
        <MaterialCommunityIcons name="clover" size={140} color="#000" style={{ position: 'absolute', opacity: 0.08, top: 150, right: -40, transform: [{ rotate: '-20deg' }] }} />
        <MaterialCommunityIcons name="leaf-maple" size={200} color="#000" style={{ position: 'absolute', opacity: 0.08, bottom: 80, left: -80, transform: [{ rotate: '70deg' }] }} />
        <MaterialCommunityIcons name="cannabis" size={160} color="#000" style={{ position: 'absolute', opacity: 0.08, bottom: -30, right: 30, transform: [{ rotate: '-10deg' }] }} />
      </View>
      <LinearGradient
        colors={['rgba(26, 24, 33, 0.4)', 'rgba(10, 9, 13, 0.7)']}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />
      <SafeAreaView style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Who would you like to date?</Text>
          <Pressable 
            onPress={() => navigation.navigate(AppRoute.PersonalDetails)}
            style={styles.skipButton}
          >
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        </View>
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
        style={(!canProceed() || isSubmitting) && styles.primaryButtonDisabled}
        onPress={handleContinue}
        disabled={isSubmitting || !canProceed()}>
        <LinearGradient
          colors={['#7C3AED', '#C084FC']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.primaryButton}>
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>Continue</Text>
          )}
        </LinearGradient>
      </Pressable>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  header: {
    marginBottom: spacing.xl,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    fontFamily: typography.fontFamilyBold,
    fontSize: typography.headings.h2,
    color: '#FFFFFF',
    flex: 1,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  skipButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  skipText: {
    color: '#E5C49F',
    fontWeight: '600',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontFamily: typography.fontFamilyRegular,
    fontSize: typography.body.medium,
    color: 'rgba(255,255,255,0.7)',
  },
  section: {
    marginBottom: spacing.xxl,
  },
  sectionTitle: {
    fontFamily: typography.fontFamilyBold,
    fontSize: typography.body.large,
    color: '#FFFFFF',
    marginBottom: spacing.md,
  },
  optionButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 14,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  optionButtonSelected: {
    borderColor: '#C084FC',
    backgroundColor: 'rgba(124, 58, 237, 0.3)',
  },
  optionText: {
    fontFamily: typography.fontFamilyMedium,
    fontSize: typography.body.medium,
    color: 'rgba(255,255,255,0.85)',
    flex: 1,
  },
  optionTextSelected: {
    fontFamily: typography.fontFamilyBold,
    color: '#EACCFF',
  },
  checkmark: {
    color: '#EACCFF',
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
    borderColor: '#C084FC',
    borderRadius: 6,
    marginRight: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  checkboxIcon: {
    color: '#EACCFF',
    fontSize: 16,
    fontFamily: typography.fontFamilyBold,
  },
  checkboxLabel: {
    fontFamily: typography.fontFamilyRegular,
    fontSize: typography.body.medium,
    color: 'rgba(255,255,255,0.85)',
  },
  primaryButton: {
    paddingVertical: 18,
    borderRadius: 999,
    alignItems: 'center',
    marginTop: spacing.xl,
    elevation: 4,
    shadowColor: '#7C3AED',
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontFamily: typography.fontFamilyBold,
    fontSize: typography.body.large,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default DatingPreferencesScreen;