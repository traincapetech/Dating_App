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
  DeviceEventEmitter,
} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {colors, typography, spacing} from '../../../theme';
import {hasPremiumFeature, PREMIUM_FEATURES} from '../../../utils/premiumUtils';
import ThemeBackground from '../../../components/layout/ThemeBackground';

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
                '[AdvancedFiltersScreen] OK pressed — emitting filtersUpdated event',
              );
              // Emit a cross-navigator event so HomeScreen re-fetches
              // regardless of how deeply nested this screen is.
              DeviceEventEmitter.emit('pryvo:filtersUpdated');
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
          onPress: async () => {
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
            await AsyncStorage.removeItem(FILTER_STORAGE_KEY);
            // Emit cross-navigator event so HomeScreen resets the feed
            DeviceEventEmitter.emit('pryvo:filtersUpdated');
            navigation.goBack();
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
      <ThemeBackground>
        <SafeAreaView style={styles.safe}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </SafeAreaView>
      </ThemeBackground>
    );
  }

  if (!isPremium) {
    return (
      <ThemeBackground>
        <SafeAreaView style={styles.safe} edges={['top', 'right', 'left']}>
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
            <Text style={styles.headerTitle}>Advanced Filters</Text>
            <View style={{width: 40}} />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.premiumScrollContent}>
            <View style={styles.premiumLockCard}>
              <LinearGradient
                colors={[colors.primary, '#6A11CB']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={styles.premiumGradient}>
                <MaterialCommunityIcons
                  name="shield-lock-outline"
                  size={64}
                  color="#FFF"
                  style={styles.premiumIcon}
                />
                <Text style={styles.premiumTitle}>Premium Feature</Text>
                <Text style={styles.premiumDescription}>
                  Advanced Filters allow you to refine your search with precision.
                  Upgrade to Premium to filter profiles by:
                </Text>
                <View style={styles.featureList}>
                  <View style={styles.featureLine}>
                    <MaterialCommunityIcons name="check-circle-outline" size={18} color="rgba(255,255,255,0.8)" />
                    <Text style={styles.premiumFeatureItem}>Education Level</Text>
                  </View>
                  <View style={styles.featureLine}>
                    <MaterialCommunityIcons name="check-circle-outline" size={18} color="rgba(255,255,255,0.8)" />
                    <Text style={styles.premiumFeatureItem}>Height Range</Text>
                  </View>
                  <View style={styles.featureLine}>
                    <MaterialCommunityIcons name="check-circle-outline" size={18} color="rgba(255,255,255,0.8)" />
                    <Text style={styles.premiumFeatureItem}>Lifestyle Habits</Text>
                  </View>
                  <View style={styles.featureLine}>
                    <MaterialCommunityIcons name="check-circle-outline" size={18} color="rgba(255,255,255,0.8)" />
                    <Text style={styles.premiumFeatureItem}>Political & Religious Beliefs</Text>
                  </View>
                </View>
                <Pressable
                  style={styles.premiumUpgradeBtn}
                  onPress={handleUpgrade}>
                  <Text style={styles.premiumUpgradeText}>Upgrade to Premium</Text>
                </Pressable>
              </LinearGradient>
            </View>
          </ScrollView>
        </SafeAreaView>
      </ThemeBackground>
    );
  }

  return (
    <ThemeBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'right', 'left']}>
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
          <Text style={styles.headerTitle}>Advanced Filters</Text>
          <Pressable onPress={handleClear} style={styles.clearHeaderButton}>
            <Text style={styles.clearHeaderText}>Clear All</Text>
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.scrollView}
          contentContainerStyle={{paddingBottom: insets.bottom + 100}}>
          
          <Text style={styles.sectionLabel}>Education</Text>
          <View style={styles.card}>
            <SelectorButton
              label="Education Level"
              value={filters.educationLevel}
              options={EDUCATION_LEVELS}
              onSelect={(field, value) =>
                setFilters(prev => ({...prev, [field]: value}))
              }
              field="educationLevel"
            />
          </View>

          <Text style={styles.sectionLabel}>Height</Text>
          <View style={styles.card}>
            <HeightInput
              label="Minimum Height"
              value={filters.minHeight}
              onChange={value => setFilters(prev => ({...prev, minHeight: value}))}
              placeholder="No minimum"
            />
            <View style={styles.cardSeparator} />
            <HeightInput
              label="Maximum Height"
              value={filters.maxHeight}
              onChange={value => setFilters(prev => ({...prev, maxHeight: value}))}
              placeholder="No maximum"
            />
          </View>

          <Text style={styles.sectionLabel}>Lifestyle</Text>
          <View style={styles.card}>
            <SelectorButton
              label="Drinking"
              value={filters.drink}
              options={DRINK_OPTIONS}
              onSelect={(field, value) =>
                setFilters(prev => ({...prev, [field]: value}))
              }
              field="drink"
            />
            <View style={styles.cardSeparator} />
            <SelectorButton
              label="Smoking (Tobacco)"
              value={filters.smokeTobacco}
              options={SMOKE_OPTIONS}
              onSelect={(field, value) =>
                setFilters(prev => ({...prev, [field]: value}))
              }
              field="smokeTobacco"
            />
            <View style={styles.cardSeparator} />
            <SelectorButton
              label="Smoking (Weed)"
              value={filters.smokeWeed}
              options={SMOKE_OPTIONS}
              onSelect={(field, value) =>
                setFilters(prev => ({...prev, [field]: value}))
              }
              field="smokeWeed"
            />
          </View>

          <Text style={styles.sectionLabel}>Beliefs</Text>
          <View style={styles.card}>
            <SelectorButton
              label="Religious Beliefs"
              value={filters.religiousBeliefs}
              options={RELIGION_OPTIONS}
              onSelect={(field, value) =>
                setFilters(prev => ({...prev, [field]: value}))
              }
              field="religiousBeliefs"
            />
            <View style={styles.cardSeparator} />
            <SelectorButton
              label="Political Beliefs"
              value={filters.politicalBeliefs}
              options={POLITICS_OPTIONS}
              onSelect={(field, value) =>
                setFilters(prev => ({...prev, [field]: value}))
              }
              field="politicalBeliefs"
            />
          </View>
        </ScrollView>

        <View style={[styles.floatingFooter, {paddingBottom: insets.bottom + spacing.md}]}>
          <Pressable style={styles.applyButton} onPress={handleSave}>
            <LinearGradient
              colors={['#C084FC', '#E040C8']}
              style={styles.applyGradient}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}>
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>
    </ThemeBackground>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
  },
  clearHeaderButton: {
    paddingHorizontal: spacing.sm,
  },
  clearHeaderText: {
    fontSize: 14,
    color: colors.primary,
    fontFamily: typography.fontFamilySemiBold,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumScrollContent: {
    padding: spacing.xl,
    paddingTop: spacing.xl * 2,
  },
  premiumLockCard: {
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 20},
    shadowOpacity: 0.3,
    shadowRadius: 25,
    elevation: 15,
  },
  premiumGradient: {
    padding: spacing.xl * 1.5,
    alignItems: 'center',
  },
  premiumIcon: {
    marginBottom: spacing.xl,
  },
  premiumTitle: {
    fontSize: 28,
    fontFamily: typography.fontFamilyBold,
    color: '#FFF',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  premiumDescription: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    fontFamily: typography.fontFamilyRegular,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  featureList: {
    width: '100%',
    marginBottom: spacing.xl * 1.5,
  },
  featureLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: spacing.md,
    borderRadius: 16,
  },
  premiumFeatureItem: {
    fontSize: 15,
    fontFamily: typography.fontFamilySemiBold,
    color: '#FFF',
    marginLeft: spacing.sm,
  },
  premiumUpgradeBtn: {
    backgroundColor: '#FFF',
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.xl * 1.5,
    borderRadius: 20,
    width: '100%',
    alignItems: 'center',
  },
  premiumUpgradeText: {
    color: '#6A11CB',
    fontSize: 16,
    fontFamily: typography.fontFamilyBold,
  },
  scrollView: {
    flex: 1,
  },
  sectionLabel: {
    fontSize: 13,
    fontFamily: typography.fontFamilyBold,
    color: '#6B21A8',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    paddingHorizontal: spacing.xl + 4,
    marginBottom: spacing.sm,
    marginTop: spacing.xl,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    marginHorizontal: spacing.lg,
    borderRadius: 24,
    padding: spacing.lg,
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(107, 33, 168, 0.1)',
  },
  cardSeparator: {
    height: 1,
    backgroundColor: 'rgba(107, 33, 168, 0.05)',
    marginVertical: spacing.lg,
  },
  selectorContainer: {
    width: '100%',
  },
  selectorLabel: {
    fontSize: 16,
    fontFamily: typography.fontFamilySemiBold,
    color: '#333',
    marginBottom: spacing.md,
  },
  selectorButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectorButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(107, 33, 168, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(107, 33, 168, 0.08)',
  },
  selectorButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  selectorButtonClear: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(255, 59, 48, 0.2)',
  },
  selectorButtonText: {
    fontSize: 13,
    fontFamily: typography.fontFamilyMedium,
    color: '#555',
  },
  selectorButtonTextActive: {
    color: '#FFF',
  },
  inputContainer: {
    width: '100%',
  },
  inputLabel: {
    fontSize: 16,
    fontFamily: typography.fontFamilySemiBold,
    color: '#333',
    marginBottom: spacing.md,
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
    borderRadius: 16,
    backgroundColor: 'rgba(107, 33, 168, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(107, 33, 168, 0.08)',
  },
  heightInputText: {
    fontSize: 15,
    fontFamily: typography.fontFamilyMedium,
    color: '#333',
  },
  clearButton: {
    paddingHorizontal: spacing.sm,
  },
  clearButtonText: {
    fontSize: 13,
    fontFamily: typography.fontFamilySemiBold,
    color: colors.primary,
  },
  floatingFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  applyButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  applyGradient: {
    paddingVertical: spacing.md + 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButtonText: {
    fontSize: 18,
    fontFamily: typography.fontFamilyBold,
    color: '#FFF',
  },
});

export default AdvancedFiltersScreen;
