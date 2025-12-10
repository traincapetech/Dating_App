import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Alert,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {colors, typography, spacing} from '../../../theme';
import {clearTokens} from '../../../services/storage/tokenStorage';

const SettingsScreen = () => {
  const navigation = useNavigation();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearTokens();
              await AsyncStorage.removeItem('@pryvo_user');
              navigation.reset({
                index: 0,
                routes: [{name: 'SignIn'}],
              });
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  const SettingsSection = ({title, children}) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );

  const SettingsItem = ({title, subtitle, onPress, rightComponent, showArrow = true}) => (
    <Pressable
      style={styles.settingsItem}
      onPress={onPress}
      android_ripple={{color: colors.border}}>
      <View style={styles.settingsItemContent}>
        <View style={styles.settingsItemText}>
          <Text style={styles.settingsItemTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingsItemSubtitle}>{subtitle}</Text>}
        </View>
        {rightComponent || (showArrow && <Text style={styles.arrow}>›</Text>)}
      </View>
    </Pressable>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <SettingsSection title="Account">
        <SettingsItem
          title="Edit Profile"
          subtitle="Update your profile information"
          onPress={() => Alert.alert('Edit Profile', 'Coming soon')}
        />
        <SettingsItem
          title="Subscription"
          subtitle="Manage your subscription"
          onPress={() => Alert.alert('Subscription', 'Coming soon')}
        />
        <SettingsItem
          title="Payment Methods"
          subtitle="Add or update payment methods"
          onPress={() => Alert.alert('Payment Methods', 'Coming soon')}
        />
      </SettingsSection>

      <SettingsSection title="Preferences">
        <SettingsItem
          title="Notifications"
          subtitle="Manage notification settings"
          rightComponent={
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{false: colors.borderLight, true: colors.primary}}
            />
          }
          showArrow={false}
        />
        <SettingsItem
          title="Location Services"
          subtitle="Allow location access"
          rightComponent={
            <Switch
              value={locationEnabled}
              onValueChange={setLocationEnabled}
              trackColor={{false: colors.borderLight, true: colors.primary}}
            />
          }
          showArrow={false}
        />
        <SettingsItem
          title="Discovery Settings"
          subtitle="Adjust who you see"
          onPress={() => Alert.alert('Discovery Settings', 'Coming soon')}
        />
      </SettingsSection>

      <SettingsSection title="Support">
        <SettingsItem
          title="Help Center"
          subtitle="Get help and support"
          onPress={() => navigation.navigate('HelpCentre')}
        />
        <SettingsItem
          title="Report a Problem"
          subtitle="Report bugs or issues"
          onPress={() => navigation.navigate('ReportProblem')}
        />
        <SettingsItem
          title="Privacy Policy"
          subtitle="Read our privacy policy"
          onPress={() => navigation.navigate('Privacy')}
        />
        <SettingsItem
          title="Terms of Service"
          subtitle="Read our terms of service"
          onPress={() => navigation.navigate('Terms')}
        />
      </SettingsSection>

      <SettingsSection title="About">
        <SettingsItem
          title="App Version"
          subtitle="1.0.0"
          showArrow={false}
        />
        <SettingsItem
          title="Logout"
          subtitle="Sign out of your account"
          onPress={handleLogout}
        />
      </SettingsSection>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Made with ❤️ by Pryvo</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: typography.headings.h2,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
  },
  section: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.body.small,
    fontFamily: typography.fontFamilyBold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  settingsItem: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: spacing.xs,
    overflow: 'hidden',
  },
  settingsItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  settingsItemText: {
    flex: 1,
  },
  settingsItemTitle: {
    fontSize: typography.body.medium,
    fontFamily: typography.fontFamilyMedium,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  settingsItemSubtitle: {
    fontSize: typography.body.small,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textSecondary,
  },
  arrow: {
    fontSize: 24,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  footer: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  footerText: {
    fontSize: typography.body.small,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textSecondary,
  },
});

export default SettingsScreen;

