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
import {useNavigation} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {colors, typography, spacing} from '../../../theme';
import {getDiscoverProfiles} from '../../../services/profile/profileService';

const DISTANCE_PREF_KEY = '@pryvo_distance_preferences';

const DistanceFilterScreen = () => {
  const navigation = useNavigation();
  const distancePresets = [
    {label: '1 - 10 km', value: 10},
    {label: '1 - 25 km', value: 25},
    {label: '1 - 50 km', value: 50},
    {label: '1 - 100 km', value: 100},
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
      if (!raw) return;
      
      const parsed = JSON.parse(raw);
      const distance = clampDistance(parsed.maxDistance ?? 50);
      const enabled = typeof parsed.useDistanceFilter === 'boolean' 
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
      const excludeUserId = userData ? JSON.parse(userData).id : null;
      
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
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Distance Filter</Text>
        <View style={{width: 40}} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <View style={styles.toggleRow}>
            <Text style={styles.label}>Enable Distance Filter</Text>
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
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quick Presets</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.presetScroll}>
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
              </ScrollView>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Custom Distance</Text>
              <View style={styles.distanceRow}>
                <Pressable
                  style={styles.pillButton}
                  onPress={() => handleAdjustDistance(-5)}>
                  <Text style={styles.pillButtonText}>-5 km</Text>
                </Pressable>
                <Text style={styles.distanceValue}>{maxDistance} km</Text>
                <Pressable
                  style={styles.pillButton}
                  onPress={() => handleAdjustDistance(5)}>
                  <Text style={styles.pillButtonText}>+5 km</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.section}>
              <Pressable
                style={[styles.refreshButton, loading && styles.refreshButtonDisabled]}
                onPress={handleRefresh}
                disabled={loading}>
                {loading ? (
                  <ActivityIndicator size="small" color={colors.surface} />
                ) : (
                  <Text style={styles.refreshButtonText}>Refresh Profiles</Text>
                )}
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: spacing.sm,
  },
  backText: {
    fontSize: 24,
    color: '#1a1a1a',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: typography.fontFamilyBold,
    color: '#1a1a1a',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    marginTop: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    fontFamily: typography.fontFamilyMedium,
    color: '#1a1a1a',
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: typography.fontFamilyBold,
    color: '#999',
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  presetScroll: {
    paddingVertical: spacing.sm,
  },
  presetChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginRight: spacing.sm,
  },
  presetChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.secondary,
  },
  presetChipText: {
    fontFamily: typography.fontFamilyMedium,
    fontSize: typography.body.small,
    color: colors.textPrimary,
  },
  presetChipTextActive: {
    color: colors.primary,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  pillButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pillButtonText: {
    fontFamily: typography.fontFamilyMedium,
    fontSize: typography.body.small,
    color: colors.textPrimary,
  },
  distanceValue: {
    fontFamily: typography.fontFamilyBold,
    fontSize: typography.body.large,
    color: colors.textPrimary,
    minWidth: 72,
    textAlign: 'center',
  },
  refreshButton: {
    paddingVertical: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  refreshButtonDisabled: {
    opacity: 0.6,
  },
  refreshButtonText: {
    fontFamily: typography.fontFamilyBold,
    fontSize: typography.body.medium,
    color: colors.surface,
  },
});

export default DistanceFilterScreen;

