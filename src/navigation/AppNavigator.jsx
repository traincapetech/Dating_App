import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {
  NavigationContainer,
  useNavigationContainerRef,
  DefaultTheme,
} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
// Use literal route names to avoid undefined values
import SplashScreen from '../features/onboarding/screens/SplashScreen.jsx';
import SignUpScreen from '../features/auth/screens/SignUpScreen.jsx';
import SignInScreen from '../features/auth/screens/SignInScreen.jsx';
import ForgotPasswordScreen from '../features/auth/screens/ForgotPasswordScreen.jsx';
import ResetPasswordScreen from '../features/auth/screens/ResetPasswordScreen.jsx';
import TermsScreen from '../features/onboarding/screens/static/TermsScreen.js';
import PrivacyScreen from '../features/onboarding/screens/static/PrivacyScreen.js';
import PhoneInputScreen from '../features/onboarding/screens/PhoneInputScreen.jsx';
import OTPVerificationScreen from '../features/onboarding/screens/OTPVerificationScreen.jsx';
import WelcomeScreen from '../features/onboarding/screens/WelcomeScreen.jsx';
import BasicInfoScreen from '../features/onboarding/screens/BasicInfoScreen.jsx';
import DatingPreferencesScreen from '../features/onboarding/screens/DatingPreferencesScreen.jsx';
import LifestyleScreen from '../features/onboarding/screens/LifestyleScreen.jsx';
import ProfilePromptsScreen from '../features/onboarding/screens/ProfilePromptsScreen.jsx';
import MediaUploadScreen from '../features/onboarding/screens/MediaUploadScreen.jsx';
import PersonalDetailsScreen from '../features/onboarding/screens/PersonalDetailsScreen.jsx';
import SubscriptionUpsellScreen from '../features/subscription/screens/SubscriptionUpsellScreen.jsx';
import HelpCentreScreen from '../features/settings/screens/HelpCentreScreen.jsx';
import ReportProblemScreen from '../features/settings/screens/ReportProblemScreen.jsx';
import TabNavigator from './TabNavigator';
import ChatsScreen from '../features/messages/screens/ChatsScreen.jsx';
import ChatScreen from '../features/messages/screens/ChatScreen.jsx';
import StreakLeaderboardScreen from '../features/messages/screens/StreakLeaderboardScreen.jsx';
import ProfileDetailsScreen from '../features/profile/screens/ProfileDetailsScreen.jsx';
import WalletScreen from '../features/profile/screens/WalletScreen.jsx';
import SettingsScreen from '../features/settings/screens/SettingsScreen.jsx';
import ChangeEmailScreen from '../features/settings/screens/ChangeEmailScreen.jsx';
import ChangePasswordScreen from '../features/settings/screens/ChangePasswordScreen.jsx';
import BlockedUsersScreen from '../features/settings/screens/BlockedUsersScreen.jsx';
import DeleteAccountScreen from '../features/settings/screens/DeleteAccountScreen.jsx';
import DistanceFilterScreen from '../features/settings/screens/DistanceFilterScreen.jsx';
import NotificationPreferencesScreen from '../features/settings/screens/NotificationPreferencesScreen.jsx';
import SubscriptionManagementScreen from '../features/settings/screens/SubscriptionManagementScreen.jsx';
import BoostProfileScreen from '../features/settings/screens/BoostProfileScreen.jsx';
import AdvancedFiltersScreen from '../features/settings/screens/AdvancedFiltersScreen.jsx';
import CategoryHelpScreen from '../features/settings/screens/CategoryHelpScreen.jsx';
import UserProfileViewScreen from '../features/profile/screens/UserProfileViewScreen.jsx';
import {colors, typography} from '../theme';
import {setupNotificationHandlers, setupTokenRefreshListener, enableNotifications} from '../services/notifications/notificationService';
import {useEffect} from 'react';
import {SocketProvider} from '../context/SocketContext';
import GlobalNotification from '../components/layout/GlobalNotification';

const Stack = createNativeStackNavigator();

const PlaceholderScreen = ({route}) => {
  return (
    <View style={styles.placeholderContainer}>
      <Text style={styles.placeholderTitle}>{route.name}</Text>
      <Text style={styles.placeholderSubtitle}>Screen coming soon</Text>
    </View>
  );
};

const AppNavigator = () => {
  const navigationRef = useNavigationContainerRef();

  useEffect(() => {
    // Wait for navigation to be ready
    if (navigationRef.isReady()) {
      const unsubscribeHandlers = setupNotificationHandlers(navigationRef);
      const unsubscribeRefresh = setupTokenRefreshListener();

      return () => {
        if (unsubscribeHandlers) unsubscribeHandlers();
        if (unsubscribeRefresh) unsubscribeRefresh();
      };
    }
  }, [navigationRef]);

  const transparentTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: 'transparent',
      card: 'transparent',
      border: 'transparent',
      primary: '#7c3aed',
      text: '#1a1a1a',
    },
  };

  return (
    <SocketProvider>
      <NavigationContainer ref={navigationRef} theme={transparentTheme}>
        <Stack.Navigator
          initialRouteName="OnboardingIntro"
          screenOptions={{headerShown: false}}>
          <Stack.Screen name="OnboardingIntro" component={SplashScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
          <Stack.Screen name="SignIn" component={SignInScreen} />
          <Stack.Screen
            name="ForgotPassword"
            component={ForgotPasswordScreen}
          />
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
          <Stack.Screen name="Terms" component={TermsScreen} />
          <Stack.Screen name="Privacy" component={PrivacyScreen} />
          <Stack.Screen name="PhoneInput" component={PhoneInputScreen} />
          <Stack.Screen
            name="OTPVerification"
            component={OTPVerificationScreen}
          />
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="BasicInfo" component={BasicInfoScreen} />
          <Stack.Screen
            name="DatingPreferences"
            component={DatingPreferencesScreen}
          />
          <Stack.Screen
            name="PersonalDetails"
            component={PersonalDetailsScreen}
          />
          <Stack.Screen name="Lifestyle" component={LifestyleScreen} />
          <Stack.Screen
            name="ProfilePrompts"
            component={ProfilePromptsScreen}
          />
          <Stack.Screen name="MediaUpload" component={MediaUploadScreen} />
          <Stack.Screen
            name="SubscriptionUpsell"
            component={SubscriptionUpsellScreen}
          />
          <Stack.Screen name="HomeTabs" component={TabNavigator} />
          <Stack.Screen name="Messages" component={ChatsScreen} />
          <Stack.Screen name="ChatScreen" component={ChatScreen} />
          <Stack.Screen
            name="StreakLeaderboard"
            component={StreakLeaderboardScreen}
          />
          <Stack.Screen
            name="ProfileDetails"
            component={ProfileDetailsScreen}
          />
          <Stack.Screen name="Wallet" component={WalletScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="ChangeEmail" component={ChangeEmailScreen} />
          <Stack.Screen
            name="ChangePassword"
            component={ChangePasswordScreen}
          />
          <Stack.Screen name="BlockedUsers" component={BlockedUsersScreen} />
          <Stack.Screen name="DeleteAccount" component={DeleteAccountScreen} />
          <Stack.Screen
            name="DistanceFilter"
            component={DistanceFilterScreen}
          />
          <Stack.Screen
            name="NotificationPreferences"
            component={NotificationPreferencesScreen}
          />
          <Stack.Screen
            name="SubscriptionManagement"
            component={SubscriptionManagementScreen}
          />
          <Stack.Screen name="BoostProfile" component={BoostProfileScreen} />
          <Stack.Screen
            name="AdvancedFilters"
            component={AdvancedFiltersScreen}
          />
          <Stack.Screen name="HelpCentre" component={HelpCentreScreen} />
          <Stack.Screen name="CategoryHelp" component={CategoryHelpScreen} />
          <Stack.Screen name="ReportProblem" component={ReportProblemScreen} />
          <Stack.Screen name="UserProfileView" component={UserProfileViewScreen} />
        </Stack.Navigator>
        {/* Modern, non-intrusive global notification banner */}
        <GlobalNotification navigationRef={navigationRef} />
      </NavigationContainer>
    </SocketProvider>
  );
};

const styles = StyleSheet.create({
  placeholderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 24,
  },
  placeholderTitle: {
    fontSize: typography.headings.h2,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
  },
  placeholderSubtitle: {
    marginTop: 8,
    fontSize: typography.body.medium,
    color: colors.textSecondary,
  },
});

export default AppNavigator;