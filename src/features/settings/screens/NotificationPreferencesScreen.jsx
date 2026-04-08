import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Alert,
  Linking,
  AppState,
} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {colors, typography, spacing} from '../../../theme';
import apiClient from '../../../services/api/client';
import {
  enableNotifications,
  disableNotifications,
  checkNotificationPermission,
} from '../../../services/notifications/notificationService';
import ThemeBackground from '../../../components/layout/ThemeBackground';

const NOTIFICATION_PREFS_KEY = '@pryvo_notification_preferences';

// ── Icon mapping for each notification type ──────────────────────────────────
const ROW_ICONS = {
  newMatches: 'heart-outline',
  newMessages: 'chat-outline',
  newLikes: 'thumb-up-outline',
  superLikes: 'star-outline',
  profileViews: 'eye-outline',
};

const NotificationPreferencesScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [hasSystemPermission, setHasSystemPermission] = useState(false);

  // Granular notification preferences — UNTOUCHED
  const [preferences, setPreferences] = useState({
    pushEnabled: true,
    newMatches: true,
    newMessages: true,
    newLikes: true,
    profileViews: false,
    superLikes: true,
  });

  useEffect(() => {
    loadPreferences();
    checkSystemPermission();

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        checkSystemPermission();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const checkSystemPermission = async () => {
    const hasPermission = await checkNotificationPermission();
    setHasSystemPermission(hasPermission);
  };

  const loadPreferences = async () => {
    try {
      const userId = await getUserId();
      if (userId) {
        try {
          const response = await apiClient.get(
            `/notifications/preferences/${userId}`,
          );
          if (response?.success && response?.preferences) {
            setPreferences(response.preferences);
            return;
          }
        } catch (error) {
          console.warn('Failed to load preferences from backend:', error);
        }
      }
      const stored = await AsyncStorage.getItem(NOTIFICATION_PREFS_KEY);
      if (stored && stored !== 'undefined') {
        setPreferences(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    }
  };

  const getUserId = async () => {
    try {
      const userData = await AsyncStorage.getItem('@pryvo_user');
      if (userData && userData !== 'undefined') {
        const user = JSON.parse(userData);
        return user.id;
      }
      return null;
    } catch (error) {
      return null;
    }
  };

  const savePreferences = async newPrefs => {
    try {
      await AsyncStorage.setItem(
        NOTIFICATION_PREFS_KEY,
        JSON.stringify(newPrefs),
      );
      const userId = await getUserId();
      if (userId) {
        try {
          await apiClient.put(`/notifications/preferences/${userId}`, {
            preferences: newPrefs,
          });
        } catch (error) {
          console.warn('Failed to save preferences to backend:', error);
        }
      }
    } catch (error) {
      console.error('Error saving notification preferences:', error);
    }
  };

  const handleToggle = async (key, value) => {
    const newPrefs = {...preferences, [key]: value};
    setPreferences(newPrefs);
    await savePreferences(newPrefs);

    if (key === 'pushEnabled' && value && !hasSystemPermission) {
      try {
        const result = await enableNotifications();
        if (result.success) {
          setHasSystemPermission(true);
          Alert.alert(
            'Notifications Enabled',
            'You will now receive push notifications based on your preferences.',
          );
        } else if (result.reason === 'no_token') {
          console.warn(
            'Notifications enabled but token missing (likely emulator)',
          );
        } else {
          throw new Error(result.error || 'Failed to enable notifications');
        }
      } catch (error) {
        console.error('Error enabling notifications in preferences:', error);
        if (
          error.message?.includes('permission') ||
          error.message?.includes('denied')
        ) {
          Alert.alert(
            'Permission Required',
            'Please enable notifications in your device settings to receive push notifications.',
            [
              {text: 'Cancel', style: 'cancel'},
              {text: 'Open Settings', onPress: () => Linking.openSettings()},
            ],
          );
        } else {
          Alert.alert(
            'Error',
            error.message || 'Failed to enable notifications',
          );
        }
        setPreferences({...newPrefs, pushEnabled: false});
        await savePreferences({...newPrefs, pushEnabled: false});
      }
    }

    if (key === 'pushEnabled' && !value && hasSystemPermission) {
      try {
        await disableNotifications();
        setHasSystemPermission(false);
      } catch (error) {
        console.warn('Error disabling notifications:', error);
      }
    }
  };

  // ── Premium preference row component ────────────────────────────────────────
  const PreferenceRow = ({title, description, prefKey, icon}) => {
    const isDisabled = !preferences.pushEnabled;
    const value = preferences[prefKey];
    return (
      <View style={[styles.preferenceRow, isDisabled && styles.rowDisabled]}>
        <View style={styles.rowIconWrap}>
          <MaterialCommunityIcons
            name={icon || 'bell-outline'}
            size={22}
            color={isDisabled ? '#CCC' : colors.primary}
          />
        </View>
        <View style={styles.preferenceContent}>
          <Text
            style={[styles.preferenceTitle, isDisabled && styles.disabledText]}>
            {title}
          </Text>
          {description && (
            <Text
              style={[
                styles.preferenceDescription,
                isDisabled && styles.disabledText,
              ]}>
              {description}
            </Text>
          )}
        </View>
        <Switch
          value={value && preferences.pushEnabled}
          onValueChange={val => handleToggle(prefKey, val)}
          disabled={isDisabled}
          trackColor={{false: '#E5E7EB', true: colors.primary}}
          thumbColor={'#FFF'}
        />
      </View>
    );
  };

  return (
    <ThemeBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        {/* ── Header ── */}
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
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={{width: 40}} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            {paddingBottom: insets.bottom + spacing.xl},
          ]}>
          {/* ── Intro ── */}
          <View style={styles.introContainer}>
            <Text style={styles.introTitle}>Stay in the loop</Text>
            <Text style={styles.introSub}>
              Control exactly what you hear about. Push notifications must be
              enabled for any setting below to work.
            </Text>
          </View>

          {/* ── Master Push Toggle ── */}
          <Text style={styles.sectionLabel}>Master Switch</Text>
          <View style={[styles.card, styles.masterCard]}>
            <View style={styles.masterIconWrap}>
              <MaterialCommunityIcons
                name="bell-ring-outline"
                size={28}
                color={preferences.pushEnabled ? colors.primary : '#AAA'}
              />
            </View>
            <View style={styles.preferenceContent}>
              <Text style={styles.masterTitle}>Push Notifications</Text>
              <Text style={styles.preferenceDescription}>
                Enable or disable all push notifications
              </Text>
            </View>
            <Switch
              value={preferences.pushEnabled}
              onValueChange={value => handleToggle('pushEnabled', value)}
              trackColor={{false: '#E5E7EB', true: colors.primary}}
              thumbColor={'#FFF'}
            />
          </View>

          {/* ── System Permission Warning ── */}
          {!hasSystemPermission && preferences.pushEnabled && (
            <View style={styles.warningCard}>
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={20}
                color="#92400E"
              />
              <Text style={styles.warningText}>
                Please enable notifications in your device settings to receive
                push notifications.
              </Text>
              <Pressable
                onPress={() => Linking.openSettings()}
                style={styles.warningButton}>
                <Text style={styles.warningButtonText}>Open Settings</Text>
              </Pressable>
            </View>
          )}

          {/* ── Granular Preferences ── */}
          <Text style={styles.sectionLabel}>Notification Types</Text>
          <View style={styles.card}>
            <PreferenceRow
              title="New Matches"
              description="Get notified when someone likes you back"
              prefKey="newMatches"
              icon={ROW_ICONS.newMatches}
            />
            <View style={styles.separator} />
            <PreferenceRow
              title="New Messages"
              description="Get notified when you receive a message"
              prefKey="newMessages"
              icon={ROW_ICONS.newMessages}
            />
            <View style={styles.separator} />
            <PreferenceRow
              title="New Likes"
              description="Get notified when someone likes your profile"
              prefKey="newLikes"
              icon={ROW_ICONS.newLikes}
            />
            <View style={styles.separator} />
            <PreferenceRow
              title="Super Likes"
              description="Get notified when someone super likes you"
              prefKey="superLikes"
              icon={ROW_ICONS.superLikes}
            />
            <View style={styles.separator} />
            <PreferenceRow
              title="Profile Views"
              description="Get notified when someone views your profile"
              prefKey="profileViews"
              icon={ROW_ICONS.profileViews}
            />
          </View>
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
  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  // ── Scroll ────────────────────────────────────────────────────────────────
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },
  // ── Intro ─────────────────────────────────────────────────────────────────
  introContainer: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    marginBottom: spacing.sm,
  },
  introTitle: {
    fontSize: 28,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  introSub: {
    fontSize: 15,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  // ── Section label ─────────────────────────────────────────────────────────
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
  // ── Card ──────────────────────────────────────────────────────────────────
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
  // ── Master card ───────────────────────────────────────────────────────────
  masterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  masterIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(107, 33, 168, 0.07)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  masterTitle: {
    fontSize: 17,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  // ── Warning card ──────────────────────────────────────────────────────────
  warningCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: '#FFFBEB',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#FCD34D',
    padding: spacing.lg,
    flexDirection: 'column',
    gap: spacing.sm,
  },
  warningText: {
    fontSize: 13,
    fontFamily: typography.fontFamilyMedium,
    color: '#92400E',
    lineHeight: 20,
  },
  warningButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#F59E0B',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 10,
    marginTop: 2,
  },
  warningButtonText: {
    fontSize: 12,
    fontFamily: typography.fontFamilyBold,
    color: '#FFF',
  },
  // ── Preference row ────────────────────────────────────────────────────────
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  rowDisabled: {
    opacity: 0.5,
  },
  rowIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(107, 33, 168, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  preferenceContent: {
    flex: 1,
    marginRight: spacing.md,
  },
  preferenceTitle: {
    fontSize: 15,
    fontFamily: typography.fontFamilySemiBold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  preferenceDescription: {
    fontSize: 12,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  disabledText: {
    opacity: 0.5,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(107, 33, 168, 0.06)',
    marginHorizontal: spacing.lg,
  },
});

export default NotificationPreferencesScreen;
