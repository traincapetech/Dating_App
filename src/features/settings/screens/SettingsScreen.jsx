import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Switch,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {colors, typography, spacing} from '../../../theme';
import {pauseProfile} from '../../../services/profile/profileService';
import {logoutFromAllDevices} from '../../../services/auth/authService';

const SettingsScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = React.useState(true);
  const [showOnline, setShowOnline] = React.useState(true);
  const [isPremium, setIsPremium] = React.useState(false);
  const [isPaused, setIsPaused] = React.useState(false);
  const [loadingPause, setLoadingPause] = React.useState(false);
  const [loadingLogoutAll, setLoadingLogoutAll] = React.useState(false);

  React.useEffect(() => {
    checkPremiumStatus();
    loadProfileStatus();
  }, []);

  const checkPremiumStatus = async () => {
    try {
      const {isUserPremium} = await import('../../../utils/premiumUtils');
      const premium = await isUserPremium();
      setIsPremium(premium);
    } catch (error) {
      console.error('Error checking premium status:', error);
    }
  };

  const loadProfileStatus = async () => {
    try {
      const userData = await AsyncStorage.getItem('@pryvo_user');
      if (userData && userData !== 'undefined') {
        try {
          const user = JSON.parse(userData);
          // Fetch profile to check pause status
          const {getProfile} = await import(
            '../../../services/profile/profileService'
          );
          const response = await getProfile(user.id);
          if (response?.profile) {
            setIsPaused(response.profile.isPaused || false);
          }
        } catch (e) {
          console.error('Failed to parse user data in SettingsScreen:', e);
        }
      }
    } catch (error) {
      console.error('Error loading profile status:', error);
    }
  };

  const handlePauseProfile = async paused => {
    try {
      setLoadingPause(true);
      const userData = await AsyncStorage.getItem('@pryvo_user');
      if (userData && userData !== 'undefined') {
        try {
          const user = JSON.parse(userData);
          const response = await pauseProfile(paused);

          if (response?.success) {
            setIsPaused(paused);
            Alert.alert(
              paused ? 'Profile Paused' : 'Profile Resumed',
              paused
                ? 'Your profile is now hidden from discovery. You can still message your matches.'
                : 'Your profile is now visible in discovery again.',
              [{text: 'OK'}],
            );
          } else {
            throw new Error(
              response?.error || 'Failed to update profile status',
            );
          }
        } catch (e) {
          console.error('Failed to parse user data or pause profile:', e);
          throw e;
        }
      } else {
        Alert.alert('Error', 'User not found');
      }
    } catch (error) {
      console.error('Error pausing profile:', error);
      Alert.alert(
        'Error',
        'Failed to update profile status. Please try again.',
      );
    } finally {
      setLoadingPause(false);
    }
  };

  const handleLogoutAllDevices = () => {
    Alert.alert(
      'Logout from All Devices',
      "This will log you out from all devices where you're signed in. You'll need to sign in again on this device.",
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Logout All',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoadingLogoutAll(true);
              await logoutFromAllDevices();
              Alert.alert(
                'Success',
                'You have been logged out from all devices.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      navigation.reset({
                        index: 0,
                        routes: [{name: 'OnboardingIntro'}],
                      });
                    },
                  },
                ],
              );
            } catch (error) {
              console.error('Error logging out from all devices:', error);
              Alert.alert(
                'Error',
                'Failed to logout from all devices. Please try again.',
              );
            } finally {
              setLoadingLogoutAll(false);
            }
          },
        },
      ],
    );
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.multiRemove([
            '@pryvo_user',
            '@pryvo/token',
            '@pryvo/refresh',
          ]);
          navigation.reset({
            index: 0,
            routes: [{name: 'OnboardingIntro'}],
          });
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    navigation.navigate('DeleteAccount');
  };

  const SettingItem = ({icon, title, subtitle, onPress, rightElement}) => (
    <Pressable style={styles.settingItem} onPress={onPress}>
      <Text style={styles.settingIcon}>{icon}</Text>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {rightElement || <Text style={styles.chevron}>›</Text>}
    </Pressable>
  );

  const SettingToggle = ({icon, title, value, onValueChange}) => (
    <View style={styles.settingItem}>
      <Text style={styles.settingIcon}>{icon}</Text>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{false: '#ddd', true: colors.primary}}
        thumbColor="#fff"
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'right', 'left']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.backButton}>
            <Text style={styles.backText}>←</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={{width: 40}} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{paddingBottom: insets.bottom + 120}}>
          {/* Account Section */}
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.section}>
            <SettingItem
              icon="👤"
              title="Edit Profile"
              onPress={() => navigation.navigate('ProfileDetails')}
            />
            <SettingItem
              icon="📧"
              title="Email"
              subtitle="Change your email address"
              onPress={() => navigation.navigate('ChangeEmail')}
            />
            <SettingItem
              icon="🔒"
              title="Password"
              subtitle="Change your password"
              onPress={() => navigation.navigate('ChangePassword')}
            />
          </View>

          {/* Notifications Section */}
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.section}>
            <SettingItem
              icon="🔔"
              title="Notification Preferences"
              subtitle="Manage your notification settings"
              onPress={() => navigation.navigate('NotificationPreferences')}
            />
          </View>

          {/* Discovery Section */}
          <Text style={styles.sectionTitle}>Discovery</Text>
          <View style={styles.section}>
            <SettingItem
              icon="📍"
              title="Distance Filter"
              subtitle="Set maximum distance for matches"
              onPress={() => navigation.navigate('DistanceFilter')}
            />
            <SettingItem
              icon="🔍"
              title="Advanced Filters"
              subtitle={
                isPremium
                  ? 'Filter by education, height, lifestyle'
                  : 'Premium feature'
              }
              onPress={() => navigation.navigate('AdvancedFilters')}
            />
          </View>

          {/* Privacy Section */}
          <Text style={styles.sectionTitle}>Privacy</Text>
          <View style={styles.section}>
            <SettingToggle
              icon="🟢"
              title="Show Online Status"
              value={showOnline}
              onValueChange={setShowOnline}
            />
            <View style={styles.settingItem}>
              <Text style={styles.settingIcon}>⏸️</Text>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Pause Profile</Text>
                <Text style={styles.settingSubtitle}>
                  {isPaused
                    ? 'Your profile is hidden from discovery'
                    : 'Temporarily hide your profile from discovery'}
                </Text>
              </View>
              {loadingPause ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Switch
                  value={isPaused}
                  onValueChange={handlePauseProfile}
                  trackColor={{false: '#ddd', true: colors.primary}}
                  thumbColor="#fff"
                />
              )}
            </View>
            <SettingItem
              icon="🚫"
              title="Blocked Users"
              onPress={() => navigation.navigate('BlockedUsers')}
            />
            <SettingItem
              icon="📋"
              title="Privacy Policy"
              onPress={() => navigation.navigate('Privacy')}
            />
            <SettingItem
              icon="📜"
              title="Terms of Service"
              onPress={() => navigation.navigate('Terms')}
            />
          </View>

          {/* Support Section */}
          <Text style={styles.sectionTitle}>Support</Text>
          <View style={styles.section}>
            <SettingItem
              icon="❓"
              title="Help Centre"
              onPress={() => navigation.navigate('HelpCentre')}
            />
            <SettingItem
              icon="🐛"
              title="Report a Problem"
              onPress={() => navigation.navigate('ReportProblem')}
            />
            <SettingItem
              icon="💌"
              title="Contact Us"
              subtitle="pryvo@traincapetech.in"
              onPress={() =>
                Alert.alert('Contact', 'Email us at pryvo@traincapetech.in')
              }
            />
          </View>

          {/* Subscription Section */}
          <Text style={styles.sectionTitle}>Subscription</Text>
          <View style={styles.section}>
            <SettingItem
              icon="💎"
              title="Upgrade to Premium"
              subtitle="Unlock all features"
              onPress={() => navigation.navigate('SubscriptionUpsell')}
            />
            <SettingItem
              icon="💳"
              title="Manage Subscription"
              subtitle={
                isPremium
                  ? 'View and manage your subscription'
                  : 'No active subscription'
              }
              onPress={() => navigation.navigate('SubscriptionManagement')}
            />
          </View>

          {/* Danger Zone */}
          <Text style={styles.sectionTitle}>Account Actions</Text>
          <View style={styles.section}>
            <SettingItem icon="🚪" title="Logout" onPress={handleLogout} />
            <Pressable
              style={styles.settingItem}
              onPress={handleLogoutAllDevices}
              disabled={loadingLogoutAll}>
              <Text style={styles.settingIcon}>📱</Text>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Logout from All Devices</Text>
                <Text style={styles.settingSubtitle}>
                  Sign out from all devices where you're logged in
                </Text>
              </View>
              {loadingLogoutAll ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={styles.chevron}>›</Text>
              )}
            </Pressable>
            <Pressable style={styles.dangerItem} onPress={handleDeleteAccount}>
              <Text style={styles.dangerIcon}>⚠️</Text>
              <Text style={styles.dangerText}>Delete Account</Text>
            </Pressable>
          </View>

          <View style={styles.appInfo}>
            <Text style={styles.appName}>Pryvo</Text>
            <Text style={styles.appVersion}>Version 1.0.0</Text>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  sectionTitle: {
    fontSize: 13,
    fontFamily: typography.fontFamilyBold,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  section: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  settingIcon: {
    fontSize: 20,
    marginRight: spacing.md,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontFamily: typography.fontFamilyMedium,
    color: '#1a1a1a',
  },
  settingSubtitle: {
    fontSize: 13,
    fontFamily: typography.fontFamilyRegular,
    color: '#999',
    marginTop: 2,
  },
  chevron: {
    fontSize: 24,
    color: '#ccc',
  },
  dangerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  dangerIcon: {
    fontSize: 20,
    marginRight: spacing.md,
  },
  dangerText: {
    fontSize: 16,
    fontFamily: typography.fontFamilyMedium,
    color: '#FF3B30',
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  appName: {
    fontSize: 16,
    fontFamily: typography.fontFamilyBold,
    color: '#1a1a1a',
  },
  appVersion: {
    fontSize: 13,
    fontFamily: typography.fontFamilyRegular,
    color: '#999',
    marginTop: 4,
  },
});

export default SettingsScreen;
