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
import {updateProfile} from '../../../services/profile/profileService';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {useAuth} from '../../../context/AuthContext';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {decodeJWT} from '../../../utils/safeUtils';
const ProfilePromptsScreen = () => {
  const {profile, loadProfile} = useAuth();
  const navigation = useNavigation();
  const [activeCategory, setActiveCategory] = useState('aboutMe');
  const [selectedPrompts, setSelectedPrompts] = useState({
    aboutMe: {question: '', answer: ''},
    selfCare: {question: '', answer: ''},
    gettingPersonal: {question: '', answer: ''},
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load existing prompts if available
  React.useEffect(() => {
    const init = async () => {
      if (profile?.profilePrompts) {
        console.log(
          '[ProfilePrompts] Existing prompts found in profile context',
        );
        setSelectedPrompts({
          aboutMe: profile.profilePrompts.aboutMe || {question: '', answer: ''},
          selfCare: profile.profilePrompts.selfCare || {
            question: '',
            answer: '',
          },
          gettingPersonal: profile.profilePrompts.gettingPersonal || {
            question: '',
            answer: '',
          },
        });
      } else {
        // Try to load from server if not in context
        try {
          const userData = await AsyncStorage.getItem('@pryvo_user');
          if (userData) {
            const user = JSON.parse(userData);
            console.log(
              '[ProfilePrompts] Fetching profile from server for init',
            );
            await loadProfile(user.id);
          }
        } catch (error) {
          console.error('[ProfilePrompts] Init error:', error);
        }
      }
    };
    init();
  }, [profile, loadProfile]);

  const promptCategories = {
    aboutMe: {
      title: 'About me',
      prompts: [
        'Unusual Skills',
        'My most irrational fear',
        'This year, I really want to',
        'I go crazy for',
        'A little goal of mine',
        'My random superpower',
        'A random fact I love is',
        'The way to win me over is',
        'My ideal first date',
        'Typical Sunday',
      ],
    },
    selfCare: {
      title: 'Self Care',
      prompts: [
        'When I need advice, I go to',
        'My last journal entry was about',
        'I get myself out of',
        'My self-care routine is',
        'My therapist would say I',
        'My cry-it-all-out song is',
        'The best thing I have ever done is',
        'A boundary of mine is',
        'Therapy recently taught me',
        'I wind down by',
      ],
    },
    gettingPersonal: {
      title: 'Getting personal',
      prompts: [
        "Don't invite me if",
        'When I hold you, that',
        'I never shut up about',
        'You should not go out with me if',
        'The one thing you should know about me is',
        'My love language is',
        'The key to my heart is',
        'I geek out on',
        "If loving is wrong, I don't want to be right",
      ],
    },
  };

  const handlePromptSelect = prompt => {
    setSelectedPrompts(prev => ({
      ...prev,
      [activeCategory]: {...prev[activeCategory], question: prompt},
    }));
  };

  const handleAnswerChange = answer => {
    setSelectedPrompts(prev => ({
      ...prev,
      [activeCategory]: {...prev[activeCategory], answer},
    }));
  };

  const canProceed = () => {
    return (
      selectedPrompts.aboutMe.question &&
      selectedPrompts.aboutMe.answer.trim() &&
      selectedPrompts.selfCare.question &&
      selectedPrompts.selfCare.answer.trim() &&
      selectedPrompts.gettingPersonal.question &&
      selectedPrompts.gettingPersonal.answer.trim()
    );
  };

  const handleContinue = async () => {
    setIsSubmitting(true);
    try {
      await updateProfile({
        profilePrompts: {
          aboutMe: selectedPrompts.aboutMe,
          selfCare: selectedPrompts.selfCare,
          gettingPersonal: selectedPrompts.gettingPersonal,
        },
      });
      console.log('Profile prompts saved successfully');
      const userData = await AsyncStorage.getItem('@pryvo_user');
      if (userData) {
        const user = JSON.parse(userData);
        await loadProfile(user.id);
      }
      navigation.navigate(AppRoute.MediaUpload);
    } catch (error) {
      console.error('Error saving profile prompts:', error);
      Alert.alert(
        'Error',
        error?.message || 'Failed to save profile prompts. Please try again.',
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
          <Text style={styles.title}>Write your profile answers</Text>
          <Pressable 
            onPress={() => navigation.navigate(AppRoute.MediaUpload)}
            style={styles.skipButton}
          >
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        </View>
        <Text style={styles.subtitle}>
          There are three prompts and when tapped on them will get many prompts.
        </Text>
      </View>

      <View style={styles.categoryTabs}>
        {Object.keys(promptCategories).map(category => (
          <Pressable
            key={category}
            style={[
              styles.tab,
              activeCategory === category && styles.tabActive,
            ]}
            onPress={() => setActiveCategory(category)}>
            <Text
              style={[
                styles.tabText,
                activeCategory === category && styles.tabTextActive,
              ]}>
              {promptCategories[category].title}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.promptsContainer}>
        <Text style={styles.promptsLabel}>Select a prompt:</Text>
        {promptCategories[activeCategory].prompts.map(prompt => (
          <Pressable
            key={prompt}
            style={[
              styles.promptButton,
              selectedPrompts[activeCategory].question === prompt &&
                styles.promptButtonSelected,
            ]}
            onPress={() => handlePromptSelect(prompt)}>
            <Text
              style={[
                styles.promptText,
                selectedPrompts[activeCategory].question === prompt &&
                  styles.promptTextSelected,
              ]}>
              {prompt}
            </Text>
          </Pressable>
        ))}
      </View>

      {selectedPrompts[activeCategory].question && (
        <View style={styles.answerContainer}>
          <Text style={styles.answerLabel}>
            {selectedPrompts[activeCategory].question}
          </Text>
          <TextInput
            value={selectedPrompts[activeCategory].answer}
            onChangeText={handleAnswerChange}
            placeholder="Write your answer here..."
            multiline
            numberOfLines={4}
            style={styles.answerInput}
            placeholderTextColor={colors.textSecondary}
            textAlignVertical="top"
          />
        </View>
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
  categoryTabs: {
    flexDirection: 'row',
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: 'rgba(124, 58, 237, 0.3)',
    borderColor: '#C084FC',
  },
  tabText: {
    fontFamily: typography.fontFamilyMedium,
    fontSize: typography.body.small,
    color: 'rgba(255,255,255,0.85)',
  },
  tabTextActive: {
    color: '#EACCFF',
    fontFamily: typography.fontFamilyBold,
  },
  promptsContainer: {
    marginBottom: spacing.xl,
  },
  promptsLabel: {
    fontFamily: typography.fontFamilyBold,
    fontSize: typography.body.medium,
    color: '#FFFFFF',
    marginBottom: spacing.md,
  },
  promptButton: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 14,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  promptButtonSelected: {
    borderColor: '#C084FC',
    backgroundColor: 'rgba(124, 58, 237, 0.3)',
  },
  promptText: {
    fontFamily: typography.fontFamilyMedium,
    fontSize: typography.body.medium,
    color: 'rgba(255,255,255,0.85)',
  },
  promptTextSelected: {
    fontFamily: typography.fontFamilyBold,
    color: '#EACCFF',
  },
  answerContainer: {
    marginBottom: spacing.xl,
  },
  answerLabel: {
    fontFamily: typography.fontFamilyBold,
    fontSize: typography.body.medium,
    color: '#FFFFFF',
    marginBottom: spacing.sm,
  },
  answerInput: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.body.medium,
    color: '#FFFFFF',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    minHeight: 120,
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

export default ProfilePromptsScreen;