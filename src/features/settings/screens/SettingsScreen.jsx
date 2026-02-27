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
  Dimensions,
} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {colors, typography, spacing} from '../../../theme';
import {
  pauseProfile,
  updateOnlineStatus,
} from '../../../services/profile/profileService';
import {logoutFromAllDevices} from '../../../services/auth/authService';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

const SettingsScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
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
          const {getProfile} = await import(
            '../../../services/profile/profileService'
          );
          const response = await getProfile(user.id);
          if (response?.profile) {
            setIsPaused(response.profile.isPaused || false);
            // Default showOnlineStatus to true if it undefined
            setShowOnline(response.profile.showOnlineStatus !== false);
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

  const SettingItem = ({
    icon,
    iconColor,
    title,
    subtitle,
    onPress,
    isLast,
    rightElement,
  }) => (
    <Pressable
      style={[styles.settingItem, isLast && styles.lastItem]}
      onPress={onPress}>
      <View style={[styles.iconContainer, {backgroundColor: iconColor + '15'}]}>
        <MaterialCommunityIcons name={icon} size={22} color={iconColor} />
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {rightElement || (
        <MaterialCommunityIcons name="chevron-right" size={24} color="#CCC" />
      )}
    </Pressable>
  );

  const SettingToggle = ({
    icon,
    iconColor,
    title,
    value,
    onValueChange,
    isLast,
  }) => (
    <View style={[styles.settingItem, isLast && styles.lastItem]}>
      <View style={[styles.iconContainer, {backgroundColor: iconColor + '15'}]}>
        <MaterialCommunityIcons name={icon} size={22} color={iconColor} />
      </View>
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
            <MaterialCommunityIcons
              name="arrow-left"
              size={28}
              color={colors.textPrimary}
            />
          </Pressable>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={{width: 40}} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{paddingBottom: insets.bottom + 120}}>
          {/* Premium Card */}
          {!isPremium && (
            <Pressable
              onPress={() => navigation.navigate('SubscriptionUpsell')}
              style={styles.premiumCardContainer}>
              <LinearGradient
                colors={[colors.primary, '#6A11CB']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={styles.premiumCard}>
                <View style={styles.premiumInfo}>
                  <Text style={styles.premiumTitle}>Upgrade to Premium</Text>
                  <Text style={styles.premiumSubtitle}>
                    See who liked you, unlimited likes & more!
                  </Text>
                </View>
                <View style={styles.premiumBadge}>
                  <MaterialCommunityIcons
                    name="crown"
                    size={32}
                    color="#FFD700"
                  />
                </View>
              </LinearGradient>
            </Pressable>
          )}

          {/* Account Section */}
          <Text style={styles.sectionLabel}>Account</Text>
          <View style={styles.card}>
            <SettingItem
              icon="account-edit"
              iconColor="#4A90E2"
              title="Edit Profile"
              onPress={() => navigation.navigate('ProfileDetails')}
            />
            <SettingItem
              icon="email-outline"
              iconColor="#50C878"
              title="Email"
              subtitle="Change your email address"
              onPress={() => navigation.navigate('ChangeEmail')}
            />
            <SettingItem
              icon="lock-outline"
              iconColor="#FF9500"
              title="Password"
              subtitle="Change your password"
              isLast={true}
              onPress={() => navigation.navigate('ChangePassword')}
            />
          </View>

          {/* Discovery & Navigation */}
          <Text style={styles.sectionLabel}>Discovery</Text>
          <View style={styles.card}>
            <SettingItem
              icon="map-marker-distance"
              iconColor="#FF2D55"
              title="Distance Filter"
              subtitle="Adjust your search radius"
              onPress={() => navigation.navigate('DistanceFilter')}
            />
            <SettingItem
              icon="tune-vertical"
              iconColor="#9411FA"
              title="Advanced Filters"
              subtitle={isPremium ? 'Preferences set' : 'Unlock with Premium'}
              isLast={true}
              onPress={() => navigation.navigate('AdvancedFilters')}
            />
          </View>

          {/* Notifications Section */}
          <Text style={styles.sectionLabel}>Notifications</Text>
          <View style={styles.card}>
            <SettingItem
              icon="bell-ring-outline"
              iconColor="#007AFF"
              title="Push Notifications"
              subtitle="Likes, matches, and messages"
              isLast={true}
              onPress={() => navigation.navigate('NotificationPreferences')}
            />
          </View>

          {/* Privacy Section */}
          <Text style={styles.sectionLabel}>Privacy & Visibility</Text>
          <View style={styles.card}>
            <SettingToggle
              icon="eye-outline"
              iconColor="#AF52DE"
              title="Show Online Status"
              value={showOnline}
              onValueChange={async val => {
                setShowOnline(val); // optimistic update
                try {
                  const response = await updateOnlineStatus(val);
                  if (!response?.success) {
                    setShowOnline(!val); // revert on failure
                    Alert.alert('Error', 'Failed to update online status.');
                  }
                } catch (e) {
                  setShowOnline(!val);
                  Alert.alert('Error', 'Failed to save preference.');
                }
              }}
            />
            <View style={styles.settingItem}>
              <View
                style={[styles.iconContainer, {backgroundColor: '#FFCC0015'}]}>
                <MaterialCommunityIcons
                  name="pause"
                  size={22}
                  color="#FFCC00"
                />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Pause Profile</Text>
                <Text style={styles.settingSubtitle}>
                  {isPaused ? 'Hidden from discovery' : 'Hide from discovery'}
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
              icon="account-cancel-outline"
              iconColor="#FF3B30"
              title="Blocked Users"
              onPress={() => navigation.navigate('BlockedUsers')}
            />
            <SettingItem
              icon="shield-check-outline"
              iconColor="#8E8E93"
              title="Privacy Policy"
              onPress={() => navigation.navigate('Privacy')}
            />
            <SettingItem
              icon="file-document-outline"
              iconColor="#8E8E93"
              title="Terms of Service"
              isLast={true}
              onPress={() => navigation.navigate('Terms')}
            />
          </View>

          {/* Support Section */}
          <Text style={styles.sectionLabel}>Support</Text>
          <View style={styles.card}>
            <SettingItem
              icon="help-circle-outline"
              iconColor="#4A90E2"
              title="Help Centre"
              onPress={() => navigation.navigate('HelpCentre')}
            />
            <SettingItem
              icon="alert-circle-outline"
              iconColor="#FF9500"
              title="Report a Problem"
              onPress={() => navigation.navigate('ReportProblem')}
            />
            <SettingItem
              icon="email-edit-outline"
              iconColor="#50C878"
              title="Contact Us"
              isLast={true}
              onPress={() =>
                Alert.alert('Contact', 'Email us at pryvo@traincapetech.in')
              }
            />
          </View>

          {/* Subscription Section */}
          <Text style={styles.sectionLabel}>Subscription</Text>
          <View style={styles.card}>
            <SettingItem
              icon="crown-outline"
              iconColor="#FFD700"
              title="Upgrade to Premium"
              subtitle="Unlock all features"
              onPress={() => navigation.navigate('SubscriptionUpsell')}
            />
            <SettingItem
              icon="credit-card-outline"
              iconColor="#4A90E2"
              title="Manage Subscription"
              subtitle={isPremium ? 'Active' : 'No active subscription'}
              isLast={true}
              onPress={() => navigation.navigate('SubscriptionManagement')}
            />
          </View>

          {/* Actions Section */}
          <Text style={styles.sectionLabel}>Actions</Text>
          <View style={styles.card}>
            <SettingItem
              icon="logout-variant"
              iconColor="#8E8E93"
              title="Log Out"
              onPress={handleLogout}
            />
            <SettingItem
              icon="cellphone-off"
              iconColor="#8E8E93"
              title="Log Out from All Devices"
              onPress={handleLogoutAllDevices}
              rightElement={
                loadingLogoutAll ? (
                  <ActivityIndicator size="small" color="#999" />
                ) : null
              }
            />
            <Pressable
              style={[styles.dangerItem, styles.lastItem]}
              onPress={() => navigation.navigate('DeleteAccount')}>
              <View
                style={[
                  styles.iconContainer,
                  {backgroundColor: colors.reject + '15'},
                ]}>
                <MaterialCommunityIcons
                  name="delete-outline"
                  size={22}
                  color={colors.reject}
                />
              </View>
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
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
  },
  premiumCardContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  premiumCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.xl,
    borderRadius: 20,
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  premiumInfo: {
    flex: 1,
  },
  premiumTitle: {
    color: '#FFF',
    fontSize: 20,
    fontFamily: typography.fontFamilyBold,
    marginBottom: 4,
  },
  premiumSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
    fontFamily: typography.fontFamilyRegular,
  },
  premiumBadge: {
    marginLeft: spacing.md,
  },
  sectionLabel: {
    fontSize: 13,
    fontFamily: typography.fontFamilyBold,
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    paddingHorizontal: spacing.xl + 4,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  card: {
    backgroundColor: '#FFF',
    marginHorizontal: spacing.lg,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md + 4,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  lastItem: {
    borderBottomWidth: 0,
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
  dangerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md + 4,
    paddingHorizontal: spacing.lg,
  },
  dangerText: {
    fontSize: 16,
    fontFamily: typography.fontFamilySemiBold,
    color: colors.reject,
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  appName: {
    fontSize: 16,
    fontFamily: typography.fontFamilyBold,
    color: '#CCC',
  },
  appVersion: {
    fontSize: 13,
    fontFamily: typography.fontFamilyRegular,
    color: '#DDD',
    marginTop: 4,
  },
});

export default SettingsScreen;
