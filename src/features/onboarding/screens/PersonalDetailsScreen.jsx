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
  SafeAreaView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useNavigation} from '@react-navigation/native';
import {AppRoute} from '../../../constants/routes';
import {colors, typography, spacing} from '../../../theme';
import {savePersonalDetails} from '../../../services/profile/profileService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useAuth} from '../../../context/AuthContext';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {decodeJWT} from '../../../utils/safeUtils';
const PersonalDetailsScreen = () => {
  const {profile, loadProfile} = useAuth();
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

  const canProceed = () => {
    return details.height;
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
            const payload = decodeJWT(token);
            userId = payload?.userId || payload?.id;
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
      await savePersonalDetails({...details, userId});

      console.log('Personal details saved successfully');

      // Reload profile in context
      if (userId) {
        await loadProfile(userId);
      }

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
          <Text style={styles.title}>More about you</Text>
          <Pressable 
            onPress={() => navigation.navigate(AppRoute.Lifestyle)}
            style={styles.skipButton}
          >
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        </View>
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
            onPress={() =>
              setDetails(prev => ({...prev, familyPlans: option}))
            }>
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
            onPress={() =>
              setDetails(prev => ({...prev, hasChildren: option}))
            }>
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
          onChangeText={value =>
            setDetails(prev => ({...prev, hometown: value}))
          }
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
          onChangeText={value =>
            setDetails(prev => ({...prev, jobTitle: value}))
          }
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
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontFamily: typography.fontFamilyBold,
    fontSize: typography.body.large,
    color: '#FFFFFF',
    marginBottom: spacing.md,
  },
  optionButton: {
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
  },
  optionTextSelected: {
    fontFamily: typography.fontFamilyBold,
    color: '#EACCFF',
  },
  heightContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  heightButton: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 14,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    minWidth: 60,
    alignItems: 'center',
  },
  heightButtonSelected: {
    borderColor: '#C084FC',
    backgroundColor: 'rgba(124, 58, 237, 0.3)',
  },
  heightText: {
    fontFamily: typography.fontFamilyMedium,
    fontSize: typography.body.medium,
    color: 'rgba(255,255,255,0.85)',
  },
  heightTextSelected: {
    fontFamily: typography.fontFamilyBold,
    color: '#EACCFF',
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.body.medium,
    color: '#FFFFFF',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
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

export default PersonalDetailsScreen;