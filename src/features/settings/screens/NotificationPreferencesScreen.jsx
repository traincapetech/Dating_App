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
import {colors, typography, spacing} from '../../../theme';
import apiClient from '../../../services/api/client';
import {
  enableNotifications,
  disableNotifications,
  checkNotificationPermission,
} from '../../../services/notifications/notificationService';

const NOTIFICATION_PREFS_KEY = '@pryvo_notification_preferences';

const NotificationPreferencesScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [hasSystemPermission, setHasSystemPermission] = useState(false);

  // Granular notification preferences
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
      // Try to load from backend first
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

      // Fallback to local storage
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
      // Save to local storage
      await AsyncStorage.setItem(
        NOTIFICATION_PREFS_KEY,
        JSON.stringify(newPrefs),
      );

      // Save to backend
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

    // If enabling push notifications, request system permission
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
          // Silently fail or show mild warning for emulator
          console.warn(
            'Notifications enabled but token missing (likely emulator)',
          );
          // We still allow the toggle to be ON in preferences, just system permission might be partial
        } else {
          // Unknown error
          throw new Error(result.error || 'Failed to enable notifications');
        }
      } catch (error) {
        console.error('Error enabling notifications in preferences:', error);

        // Only show Permission Required dialog if strictly permission related
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
          // Show generic error for other issues (e.g. token failure)
          Alert.alert(
            'Error',
            error.message || 'Failed to enable notifications',
          );
        }

        setPreferences({...newPrefs, pushEnabled: false});
        await savePreferences({...newPrefs, pushEnabled: false});
      }
    }

    // If disabling push notifications, disable system notifications
    if (key === 'pushEnabled' && !value && hasSystemPermission) {
      try {
        await disableNotifications();
        setHasSystemPermission(false);
      } catch (error) {
        console.warn('Error disabling notifications:', error);
      }
    }
  };

  const PreferenceRow = ({
    title,
    description,
    value,
    onValueChange,
    disabled,
  }) => (
    <View style={styles.preferenceRow}>
      <View style={styles.preferenceContent}>
        <Text style={[styles.preferenceTitle, disabled && styles.disabledText]}>
          {title}
        </Text>
        {description && (
          <Text
            style={[
              styles.preferenceDescription,
              disabled && styles.disabledText,
            ]}>
            {description}
          </Text>
        )}
      </View>
      <Switch
        value={value && preferences.pushEnabled}
        onValueChange={onValueChange}
        disabled={disabled || !preferences.pushEnabled}
        trackColor={{false: colors.borderLight, true: colors.primary}}
        thumbColor={colors.surface}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Notification Preferences</Text>
        <View style={{width: 40}} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {paddingBottom: insets.bottom + spacing.lg},
        ]}>
        <Text style={styles.sectionDescription}>
          Control which notifications you receive. Push notifications must be
          enabled for any of these settings to work.
        </Text>

        {/* Main Push Toggle */}
        <View style={styles.mainToggleContainer}>
          <View style={styles.preferenceContent}>
            <Text style={styles.mainToggleTitle}>Push Notifications</Text>
            <Text style={styles.preferenceDescription}>
              Enable or disable all push notifications
            </Text>
          </View>
          <Switch
            value={preferences.pushEnabled}
            onValueChange={value => handleToggle('pushEnabled', value)}
            trackColor={{false: colors.borderLight, true: colors.primary}}
            thumbColor={colors.surface}
          />
        </View>

        {!hasSystemPermission && preferences.pushEnabled && (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              ⚠️ Please enable notifications in your device settings to receive
              push notifications.
            </Text>
          </View>
        )}

        {/* Granular Preferences */}
        <Text style={styles.sectionTitle}>Notification Types</Text>

        <PreferenceRow
          title="New Matches"
          description="Get notified when someone likes you back"
          value={preferences.newMatches}
          onValueChange={value => handleToggle('newMatches', value)}
        />

        <PreferenceRow
          title="New Messages"
          description="Get notified when you receive a message"
          value={preferences.newMessages}
          onValueChange={value => handleToggle('newMessages', value)}
        />

        <PreferenceRow
          title="New Likes"
          description="Get notified when someone likes your profile"
          value={preferences.newLikes}
          onValueChange={value => handleToggle('newLikes', value)}
        />

        <PreferenceRow
          title="Super Likes"
          description="Get notified when someone super likes you"
          value={preferences.superLikes}
          onValueChange={value => handleToggle('superLikes', value)}
        />

        <PreferenceRow
          title="Profile Views"
          description="Get notified when someone views your profile"
          value={preferences.profileViews}
          onValueChange={value => handleToggle('profileViews', value)}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.background,
  },
  backButton: {
    padding: spacing.xs,
  },
  backText: {
    fontSize: 24,
    color: colors.primary,
  },
  headerTitle: {
    fontSize: typography.headings.h4,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
  },
  content: {
    padding: spacing.lg,
  },
  sectionDescription: {
    fontFamily: typography.fontFamilyRegular,
    fontSize: typography.body.medium,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  mainToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  mainToggleTitle: {
    fontFamily: typography.fontFamilyBold,
    fontSize: typography.body.large,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  warningBox: {
    backgroundColor: '#FFF3CD',
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: '#FFC107',
  },
  warningText: {
    fontFamily: typography.fontFamilyRegular,
    fontSize: typography.body.small,
    color: '#856404',
    lineHeight: 18,
  },
  sectionTitle: {
    fontFamily: typography.fontFamilyBold,
    fontSize: typography.body.large,
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  preferenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  preferenceContent: {
    flex: 1,
    marginRight: spacing.md,
  },
  preferenceTitle: {
    fontFamily: typography.fontFamilyMedium,
    fontSize: typography.body.medium,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  preferenceDescription: {
    fontFamily: typography.fontFamilyRegular,
    fontSize: typography.body.small,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  disabledText: {
    opacity: 0.5,
  },
});

export default NotificationPreferencesScreen;
