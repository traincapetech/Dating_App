import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {colors, typography, spacing} from '../../../theme';
import {getDiscoverProfiles} from '../../../services/profile/profileService';
import ThemeBackground from '../../../components/layout/ThemeBackground';

const DISTANCE_PREF_KEY = '@pryvo_distance_preferences';

const DistanceFilterScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const distancePresets = [
    {label: '10 km', value: 10},
    {label: '25 km', value: 25},
    {label: '50 km', value: 50},
    {label: '100 km', value: 100},
  ];
  const [maxDistance, setMaxDistance] = useState(50);
  const [selectedPreset, setSelectedPreset] = useState(50);
  const [useDistanceFilter, setUseDistanceFilter] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDistancePrefs();
  }, []);

  const loadDistancePrefs = async () => {
    try {
      const raw = await AsyncStorage.getItem(DISTANCE_PREF_KEY);
      if (!raw || raw === 'undefined') return;

      const parsed = JSON.parse(raw);
      const distance = clampDistance(parsed.maxDistance ?? 50);
      const enabled =
        typeof parsed.useDistanceFilter === 'boolean'
          ? parsed.useDistanceFilter
          : true;
      const presetValue = parsed.selectedPreset || null;

      setMaxDistance(distance);
      setUseDistanceFilter(enabled);
      setSelectedPreset(presetValue);
    } catch (error) {
      console.warn('Failed to load distance preferences', error);
    }
  };

  const saveDistancePrefs = async (distance, enabled, presetValue) => {
    try {
      await AsyncStorage.setItem(
        DISTANCE_PREF_KEY,
        JSON.stringify({
          maxDistance: clampDistance(distance),
          useDistanceFilter: enabled,
          selectedPreset: presetValue,
        }),
      );
    } catch (error) {
      console.warn('Failed to save distance preferences', error);
    }
  };

  const clampDistance = value => Math.max(1, Math.min(100, value));

  const handleAdjustDistance = delta => {
    setMaxDistance(prev => {
      const next = clampDistance(prev + delta);
      setSelectedPreset(null);
      saveDistancePrefs(next, useDistanceFilter, null);
      return next;
    });
  };

  const handleSelectPreset = value => {
    setSelectedPreset(value);
    setMaxDistance(value);
    saveDistancePrefs(value, useDistanceFilter, value);
  };

  const handleToggleDistance = () => {
    setUseDistanceFilter(prev => {
      const next = !prev;
      saveDistancePrefs(maxDistance, next, selectedPreset);
      return next;
    });
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const userData = await AsyncStorage.getItem('@pryvo_user');
      const excludeUserId =
        userData && userData !== 'undefined' ? JSON.parse(userData).id : null;

      await getDiscoverProfiles(excludeUserId, {
        useMatching: false,
        maxDistance: useDistanceFilter ? maxDistance : undefined,
      });
    } catch (error) {
      console.error('Error refreshing profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemeBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
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
          <Text style={styles.headerTitle}>Distance Filter</Text>
          <View style={{width: 40}} />
        </View>

        <ScrollView
          style={styles.flex}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{paddingBottom: insets.bottom + spacing.xl}}>
          <View style={styles.introContainer}>
            <Text style={styles.description}>
              Adjust your search radius to find people nearby or explore a wider area.
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.settingItem}>
              <View style={[styles.iconContainer, {backgroundColor: '#FF2D5515'}]}>
                <MaterialCommunityIcons name="map-marker-distance" size={22} color="#FF2D55" />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Enable Distance Filter</Text>
                <Text style={styles.settingSubtitle}>Show people within your radius</Text>
              </View>
              <Switch
                value={useDistanceFilter}
                onValueChange={handleToggleDistance}
                trackColor={{false: '#ddd', true: colors.primary}}
                thumbColor="#fff"
              />
            </View>
          </View>

          {useDistanceFilter && (
            <>
              <Text style={styles.sectionLabel}>Quick Presets</Text>
              <View style={styles.card}>
                <View style={styles.presetContainer}>
                  {distancePresets.map(preset => (
                    <Pressable
                      key={preset.value}
                      style={[
                        styles.presetChip,
                        selectedPreset === preset.value && styles.presetChipActive,
                      ]}
                      onPress={() => handleSelectPreset(preset.value)}>
                      <Text
                        style={[
                          styles.presetChipText,
                          selectedPreset === preset.value && styles.presetChipTextActive,
                        ]}>
                        {preset.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <Text style={styles.sectionLabel}>Custom Distance</Text>
              <View style={styles.card}>
                <View style={styles.distanceRow}>
                  <Pressable
                    style={styles.adjustButton}
                    onPress={() => handleAdjustDistance(-5)}>
                    <MaterialCommunityIcons name="minus" size={24} color={colors.primary} />
                  </Pressable>
                  
                  <View style={styles.distanceValueContainer}>
                    <Text style={styles.distanceValue}>{maxDistance}</Text>
                    <Text style={styles.distanceUnit}>km</Text>
                  </View>

                  <Pressable
                    style={styles.adjustButton}
                    onPress={() => handleAdjustDistance(5)}>
                    <MaterialCommunityIcons name="plus" size={24} color={colors.primary} />
                  </Pressable>
                </View>
              </View>

              <View style={styles.buttonContainer}>
                <Pressable
                  style={[
                    styles.refreshButton,
                    loading && styles.refreshButtonDisabled,
                  ]}
                  onPress={handleRefresh}
                  disabled={loading}>
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.refreshButtonText}>Refresh Discover List</Text>
                  )}
                </Pressable>
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemeBackground>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: 'transparent',
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
  },
  introContainer: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  description: {
    fontSize: 14,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: typography.fontFamilyBold,
    color: '#6B21A8',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    paddingHorizontal: spacing.xl + 4,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    marginHorizontal: spacing.lg,
    borderRadius: 24,
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: spacing.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(107, 33, 168, 0.1)',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md + 4,
    paddingHorizontal: spacing.lg,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md + 4,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontFamily: typography.fontFamilySemiBold,
    color: '#333',
  },
  settingSubtitle: {
    fontSize: 12,
    fontFamily: typography.fontFamilyRegular,
    color: '#AAA',
    marginTop: 2,
  },
  presetContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  presetChip: {
    width: '48%',
    paddingVertical: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(107, 33, 168, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  presetChipActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(107, 33, 168, 0.05)',
  },
  presetChipText: {
    fontFamily: typography.fontFamilySemiBold,
    fontSize: 14,
    color: colors.textSecondary,
  },
  presetChipTextActive: {
    color: colors.primary,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.xl,
  },
  adjustButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(107, 33, 168, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  distanceValueContainer: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  distanceValue: {
    fontFamily: typography.fontFamilyBold,
    fontSize: 32,
    color: colors.primary,
  },
  distanceUnit: {
    fontFamily: typography.fontFamilyBold,
    fontSize: 16,
    color: colors.textSecondary,
    marginLeft: 4,
    marginTop: 8,
  },
  buttonContainer: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  refreshButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  refreshButtonDisabled: {
    opacity: 0.6,
  },
  refreshButtonText: {
    color: '#FFF',
    fontFamily: typography.fontFamilyBold,
    fontSize: 16,
  },
});

export default DistanceFilterScreen;