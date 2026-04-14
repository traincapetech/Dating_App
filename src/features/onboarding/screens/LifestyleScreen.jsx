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
const LifestyleScreen = () => {
  const {profile, loadProfile} = useAuth();
  const navigation = useNavigation();
  const [lifestyle, setLifestyle] = useState({
    drink: '',
    smokeTobacco: '',
    smokeWeed: '',
    drugs: '',
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

  const canProceed = () => {
    return (
      lifestyle.drink &&
      lifestyle.smokeTobacco &&
      lifestyle.smokeWeed &&
      lifestyle.drugs &&
      lifestyle.politicalBeliefs &&
      lifestyle.religiousBeliefs
    );
  };

  const handleContinue = async () => {
    setIsSubmitting(true);
    try {
      await updateProfile({lifestyle});
      console.log('Lifestyle saved successfully');
      const userData = await AsyncStorage.getItem('@pryvo_user');
      if (userData) {
        const user = JSON.parse(userData);
        await loadProfile(user.id);
      }
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
          <Text style={styles.title}>Lifestyle & Beliefs</Text>
          <Pressable 
            onPress={() => navigation.navigate(AppRoute.ProfilePrompts)}
            style={styles.skipButton}
          >
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        </View>
        <Text style={styles.subtitle}>
          Share your lifestyle choices and beliefs
        </Text>
      </View>

      {renderQuestion('Do you drink?', 'drink', yesNoOptions)}
      {renderQuestion('Do you smoke tobacco?', 'smokeTobacco', yesNoOptions)}
      {renderQuestion('Did you smoke weed?', 'smokeWeed', yesNoOptions)}
      {renderQuestion('Do you use drugs?', 'drugs', yesNoOptions)}
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

export default LifestyleScreen;