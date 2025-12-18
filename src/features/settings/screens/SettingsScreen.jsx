import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Switch,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {colors, typography, spacing} from '../../../theme';

const SettingsScreen = () => {
  const navigation = useNavigation();
  const [notifications, setNotifications] = React.useState(true);
  const [showOnline, setShowOnline] = React.useState(true);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.multiRemove([
              '@pryvo_user',
              '@pryvo/token',
              '@pryvo/refreshToken',
            ]);
            navigation.reset({
              index: 0,
              routes: [{name: 'OnboardingIntro'}],
            });
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently deleted.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Contact Support', 'Please contact support@pryvo.app to delete your account.');
          },
        },
      ]
    );
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
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{width: 40}} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
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
            onPress={() => Alert.alert('Coming Soon', 'Email change feature coming soon')} 
          />
          <SettingItem 
            icon="🔒" 
            title="Password" 
            subtitle="Change your password"
            onPress={() => Alert.alert('Coming Soon', 'Password change feature coming soon')} 
          />
        </View>

        {/* Notifications Section */}
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.section}>
          <SettingToggle
            icon="🔔"
            title="Push Notifications"
            value={notifications}
            onValueChange={setNotifications}
          />
          <SettingToggle
            icon="💬"
            title="Message Notifications"
            value={notifications}
            onValueChange={setNotifications}
          />
          <SettingToggle
            icon="💕"
            title="Match Notifications"
            value={notifications}
            onValueChange={setNotifications}
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
          <SettingItem 
            icon="🚫" 
            title="Blocked Users" 
            onPress={() => Alert.alert('Coming Soon', 'Blocked users list coming soon')} 
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
            subtitle="support@pryvo.app"
            onPress={() => Alert.alert('Contact', 'Email us at support@pryvo.app')} 
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
            onPress={() => Alert.alert('Coming Soon', 'Subscription management coming soon')} 
          />
        </View>

        {/* Danger Zone */}
        <Text style={styles.sectionTitle}>Account Actions</Text>
        <View style={styles.section}>
          <SettingItem 
            icon="🚪" 
            title="Logout" 
            onPress={handleLogout} 
          />
          <Pressable style={styles.dangerItem} onPress={handleDeleteAccount}>
            <Text style={styles.dangerIcon}>⚠️</Text>
            <Text style={styles.dangerText}>Delete Account</Text>
          </Pressable>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appName}>Pryvo</Text>
          <Text style={styles.appVersion}>Version 1.0.0</Text>
        </View>

        <View style={{height: 100}} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
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
    color: '#999',
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
