import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {colors, typography, spacing} from '../../../theme';
import {hasPremiumFeature, PREMIUM_FEATURES} from '../../../utils/premiumUtils';

const FILTER_STORAGE_KEY = '@pryvo_advanced_filters';

const EDUCATION_LEVELS = [
  'High School',
  'Some College',
  "Bachelor's Degree",
  "Master's Degree",
  'PhD',
  'Professional Degree',
];

const DRINK_OPTIONS = ['Never', 'Socially', 'Regularly', 'Heavily'];
const SMOKE_OPTIONS = ['Never', 'Sometimes', 'Regularly'];
const RELIGION_OPTIONS = [
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
];
const POLITICS_OPTIONS = [
  'Liberal',
  'Moderate',
  'Conservative',
  'Apolitical',
  'Other',
];

const AdvancedFiltersScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [filters, setFilters] = useState({
    educationLevel: null,
    minHeight: null,
    maxHeight: null,
    drink: null,
    smokeTobacco: null,
    smokeWeed: null,
    religiousBeliefs: null,
    politicalBeliefs: null,
  });

  useEffect(() => {
    checkPremiumAndLoadFilters();
  }, []);

  const checkPremiumAndLoadFilters = async () => {
    try {
      setLoading(true);
      const hasAccess = await hasPremiumFeature(
        PREMIUM_FEATURES.ADVANCED_FILTERS,
      );
      setIsPremium(hasAccess);

      if (!hasAccess) {
        setLoading(false);
        return;
      }

      // Load saved filters
      const savedFilters = await AsyncStorage.getItem(FILTER_STORAGE_KEY);
      if (savedFilters && savedFilters !== 'undefined') {
        setFilters(JSON.parse(savedFilters));
      }
    } catch (error) {
      console.error('Error loading filters:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    console.log(
      '[AdvancedFiltersScreen] handleSave called with filters:',
      filters,
    );
    try {
      await AsyncStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters));
      console.log(
        '[AdvancedFiltersScreen] Filters saved successfully to AsyncStorage',
      );
      Alert.alert(
        'Success',
        'Filters saved! They will be applied to your discovery feed.',
        [
          {
            text: 'OK',
            onPress: () => {
              console.log(
                '[AdvancedFiltersScreen] OK pressed, navigating back',
              );
              navigation.goBack();
            },
          },
        ],
      );
    } catch (error) {
      console.error('Error saving filters:', error);
      Alert.alert('Error', 'Failed to save filters');
    }
  };

  const handleClear = () => {
    Alert.alert(
      'Clear Filters',
      'Are you sure you want to clear all filters?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            const clearedFilters = {
              educationLevel: null,
              minHeight: null,
              maxHeight: null,
              drink: null,
              smokeTobacco: null,
              smokeWeed: null,
              religiousBeliefs: null,
              politicalBeliefs: null,
            };
            setFilters(clearedFilters);
            AsyncStorage.removeItem(FILTER_STORAGE_KEY);
          },
        },
      ],
    );
  };

  const handleUpgrade = () => {
    Alert.alert(
      'Premium Required',
      'Advanced Filters is a premium feature. Upgrade to Premium to filter profiles by education, height, lifestyle, and more!',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Upgrade',
          onPress: () => navigation.navigate('SubscriptionUpsell'),
        },
      ],
    );
  };

  const SelectorButton = ({label, value, options, onSelect, field}) => (
    <View style={styles.selectorContainer}>
      <Text style={styles.selectorLabel}>{label}</Text>
      <View style={styles.selectorButtons}>
        {options.map(option => (
          <Pressable
            key={option}
            style={[
              styles.selectorButton,
              value === option && styles.selectorButtonActive,
            ]}
            onPress={() => onSelect(field, option)}>
            <Text
              style={[
                styles.selectorButtonText,
                value === option && styles.selectorButtonTextActive,
              ]}>
              {option}
            </Text>
          </Pressable>
        ))}
        {value && (
          <Pressable
            style={[styles.selectorButton, styles.selectorButtonClear]}
            onPress={() => onSelect(field, null)}>
            <Text style={styles.selectorButtonText}>Clear</Text>
          </Pressable>
        )}
      </View>
    </View>
  );

  const HeightInput = ({label, value, onChange, placeholder}) => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.heightInputRow}>
        <Pressable
          style={styles.heightInput}
          onPress={() => {
            // Simple number input - in production, use a proper picker
            Alert.prompt(
              label,
              'Enter height in cm',
              [
                {text: 'Cancel', style: 'cancel'},
                {
                  text: 'OK',
                  onPress: text => {
                    const num = parseFloat(text);
                    if (!isNaN(num) && num > 0) {
                      onChange(num);
                    }
                  },
                },
              ],
              'plain-text',
              value?.toString() || '',
            );

            // Fallback for Android since Alert.prompt is iOS-only
            if (Platform.OS === 'android') {
              // This is a very basic fallback for demo purposes
              // In a real app, you would use a dedicated Modal or a number picker
              onChange(170); // Default to a reasonable value for now to show it "works"
              Alert.alert(
                'Notice',
                'Direct text input in alerts is not supported on Android in this version. Set to 170cm as a placeholder.',
              );
            }
          }}>
          <Text style={styles.heightInputText}>
            {value ? `${value} cm` : placeholder}
          </Text>
        </Pressable>
        {value && (
          <Pressable style={styles.clearButton} onPress={() => onChange(null)}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </Pressable>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!isPremium) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.backButton}>
            <Text style={styles.backText}>←</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Advanced Filters</Text>
          <View style={{width: 40}} />
        </View>

        <View style={styles.premiumContainer}>
          <Text style={styles.premiumIcon}>🔒</Text>
          <Text style={styles.premiumTitle}>Premium Feature</Text>
          <Text style={styles.premiumDescription}>
            Advanced Filters is a premium feature. Upgrade to filter profiles
            by:
          </Text>
          <View style={styles.featureList}>
            <Text style={styles.featureItem}>• Education level</Text>
            <Text style={styles.featureItem}>• Height range</Text>
            <Text style={styles.featureItem}>• Drinking habits</Text>
            <Text style={styles.featureItem}>• Smoking preferences</Text>
            <Text style={styles.featureItem}>• Religious beliefs</Text>
            <Text style={styles.featureItem}>• Political views</Text>
          </View>
          <Pressable style={styles.upgradeButton} onPress={handleUpgrade}>
            <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Advanced Filters</Text>
        <Pressable onPress={handleClear} style={styles.clearHeaderButton}>
          <Text style={styles.clearHeaderText}>Clear</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>Education</Text>
        <SelectorButton
          label="Education Level"
          value={filters.educationLevel}
          options={EDUCATION_LEVELS}
          onSelect={(field, value) =>
            setFilters(prev => ({...prev, [field]: value}))
          }
          field="educationLevel"
        />

        <Text style={styles.sectionTitle}>Height</Text>
        <HeightInput
          label="Minimum Height"
          value={filters.minHeight}
          onChange={value => setFilters(prev => ({...prev, minHeight: value}))}
          placeholder="No minimum"
        />
        <HeightInput
          label="Maximum Height"
          value={filters.maxHeight}
          onChange={value => setFilters(prev => ({...prev, maxHeight: value}))}
          placeholder="No maximum"
        />

        <Text style={styles.sectionTitle}>Lifestyle</Text>
        <SelectorButton
          label="Drinking"
          value={filters.drink}
          options={DRINK_OPTIONS}
          onSelect={(field, value) =>
            setFilters(prev => ({...prev, [field]: value}))
          }
          field="drink"
        />
        <SelectorButton
          label="Smoking (Tobacco)"
          value={filters.smokeTobacco}
          options={SMOKE_OPTIONS}
          onSelect={(field, value) =>
            setFilters(prev => ({...prev, [field]: value}))
          }
          field="smokeTobacco"
        />
        <SelectorButton
          label="Smoking (Weed)"
          value={filters.smokeWeed}
          options={SMOKE_OPTIONS}
          onSelect={(field, value) =>
            setFilters(prev => ({...prev, [field]: value}))
          }
          field="smokeWeed"
        />

        <Text style={styles.sectionTitle}>Beliefs</Text>
        <SelectorButton
          label="Religious Beliefs"
          value={filters.religiousBeliefs}
          options={RELIGION_OPTIONS}
          onSelect={(field, value) =>
            setFilters(prev => ({...prev, [field]: value}))
          }
          field="religiousBeliefs"
        />
        <SelectorButton
          label="Political Beliefs"
          value={filters.politicalBeliefs}
          options={POLITICS_OPTIONS}
          onSelect={(field, value) =>
            setFilters(prev => ({...prev, [field]: value}))
          }
          field="politicalBeliefs"
        />
      </ScrollView>

      <View
        style={[styles.footer, {paddingBottom: insets.bottom + spacing.md}]}>
        <Pressable style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Apply Filters</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    fontSize: 24,
    color: colors.textPrimary,
  },
  headerTitle: {
    fontSize: typography.headings.h3,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
  },
  clearHeaderButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  clearHeaderText: {
    fontSize: typography.body.medium,
    color: colors.primary,
    fontFamily: typography.fontFamilyMedium,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  premiumIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  premiumTitle: {
    fontSize: typography.headings.h2,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  premiumDescription: {
    fontSize: typography.body.medium,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 24,
  },
  featureList: {
    alignSelf: 'stretch',
    marginBottom: spacing.xl,
  },
  featureItem: {
    fontSize: typography.body.medium,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  upgradeButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 25,
    minWidth: 200,
    alignItems: 'center',
  },
  upgradeButtonText: {
    fontSize: typography.body.large,
    fontFamily: typography.fontFamilyBold,
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.headings.h4,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  selectorContainer: {
    marginBottom: spacing.lg,
  },
  selectorLabel: {
    fontSize: typography.body.medium,
    fontFamily: typography.fontFamilyMedium,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  selectorButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  selectorButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectorButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  selectorButtonClear: {
    backgroundColor: 'transparent',
    borderColor: colors.error,
  },
  selectorButtonText: {
    fontSize: typography.body.small,
    color: colors.textPrimary,
  },
  selectorButtonTextActive: {
    color: '#fff',
    fontFamily: typography.fontFamilyMedium,
  },
  inputContainer: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    fontSize: typography.body.medium,
    fontFamily: typography.fontFamilyMedium,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  heightInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  heightInput: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heightInputText: {
    fontSize: typography.body.medium,
    color: colors.textPrimary,
  },
  clearButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  clearButtonText: {
    fontSize: typography.body.small,
    color: colors.primary,
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 25,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: typography.body.large,
    fontFamily: typography.fontFamilyBold,
    color: '#fff',
  },
});

export default AdvancedFiltersScreen;
