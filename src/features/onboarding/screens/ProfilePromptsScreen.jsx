import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {AppRoute} from '../../../constants/routes';
import {colors, typography, spacing} from '../../../theme';

const ProfilePromptsScreen = () => {
  const navigation = useNavigation();
  const [activeCategory, setActiveCategory] = useState('aboutMe');
  const [selectedPrompts, setSelectedPrompts] = useState({
    aboutMe: {prompt: '', answer: ''},
    selfCare: {prompt: '', answer: ''},
    gettingPersonal: {prompt: '', answer: ''},
  });

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
        'If loving is wrong, I don\'t want to be right',
      ],
    },
  };

  const handlePromptSelect = prompt => {
    setSelectedPrompts(prev => ({
      ...prev,
      [activeCategory]: {...prev[activeCategory], prompt},
    }));
  };

  const handleAnswerChange = answer => {
    setSelectedPrompts(prev => ({
      ...prev,
      [activeCategory]: {...prev[activeCategory], answer},
    }));
  };

  const handleContinue = () => {
    navigation.navigate(AppRoute.MediaUpload);
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Write your profile answers</Text>
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
              selectedPrompts[activeCategory].prompt === prompt &&
                styles.promptButtonSelected,
            ]}
            onPress={() => handlePromptSelect(prompt)}>
            <Text
              style={[
                styles.promptText,
                selectedPrompts[activeCategory].prompt === prompt &&
                  styles.promptTextSelected,
              ]}>
              {prompt}
            </Text>
          </Pressable>
        ))}
      </View>

      {selectedPrompts[activeCategory].prompt && (
        <View style={styles.answerContainer}>
          <Text style={styles.answerLabel}>
            {selectedPrompts[activeCategory].prompt}
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

      <Pressable style={styles.primaryButton} onPress={handleContinue}>
        <Text style={styles.primaryButtonText}>Continue</Text>
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
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    fontFamily: typography.fontFamilyMedium,
    fontSize: typography.body.small,
    color: colors.textPrimary,
  },
  tabTextActive: {
    color: colors.surface,
    fontFamily: typography.fontFamilyBold,
  },
  promptsContainer: {
    marginBottom: spacing.xl,
  },
  promptsLabel: {
    fontFamily: typography.fontFamilyBold,
    fontSize: typography.body.medium,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  promptButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  promptButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.secondary,
  },
  promptText: {
    fontFamily: typography.fontFamilyMedium,
    fontSize: typography.body.medium,
    color: colors.textPrimary,
  },
  promptTextSelected: {
    fontFamily: typography.fontFamilyBold,
    color: colors.primary,
  },
  answerContainer: {
    marginBottom: spacing.xl,
  },
  answerLabel: {
    fontFamily: typography.fontFamilyBold,
    fontSize: typography.body.medium,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  answerInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.body.medium,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    minHeight: 120,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 18,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  primaryButtonText: {
    color: colors.surface,
    fontFamily: typography.fontFamilyBold,
    fontSize: typography.body.large,
  },
});

export default ProfilePromptsScreen;

