import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
// Use literal route names to avoid undefined values
import SplashScreen from '../features/onboarding/screens/SplashScreen.jsx';
import SignUpScreen from '../features/auth/screens/SignUpScreen.jsx';
import SignInScreen from '../features/auth/screens/SignInScreen.jsx';
import TermsScreen from '../features/onboarding/screens/static/TermsScreen.js';
import PrivacyScreen from '../features/onboarding/screens/static/PrivacyScreen.js'; 
import PhoneInputScreen from '../features/onboarding/screens/PhoneInputScreen.jsx';
import OTPVerificationScreen from '../features/onboarding/screens/OTPVerificationScreen.jsx';
import WelcomeScreen from '../features/onboarding/screens/WelcomeScreen.jsx';
import BasicInfoScreen from '../features/onboarding/screens/BasicInfoScreen.jsx';
import DatingPreferencesScreen from '../features/onboarding/screens/DatingPreferencesScreen.jsx';
import PersonalDetailsScreen from '../features/onboarding/screens/PersonalDetailsScreen.jsx';
import LifestyleScreen from '../features/onboarding/screens/LifestyleScreen.jsx';
import ProfilePromptsScreen from '../features/onboarding/screens/ProfilePromptsScreen.jsx';
import MediaUploadScreen from '../features/onboarding/screens/MediaUploadScreen.jsx';
import SubscriptionUpsellScreen from '../features/subscription/screens/SubscriptionUpsellScreen.jsx';
import HelpCentreScreen from '../features/settings/screens/HelpCentreScreen.jsx';
import ReportProblemScreen from '../features/settings/screens/ReportProblemScreen.jsx';
import TabNavigator from './TabNavigator';
import ChatsScreen from '../features/messages/screens/ChatsScreen.jsx';
import ChatScreen from '../features/messages/screens/ChatScreen.jsx';
import ProfileDetailsScreen from '../features/profile/screens/ProfileDetailsScreen.jsx';
import SettingsScreen from '../features/settings/screens/SettingsScreen.jsx';
import {colors, typography} from '../theme';

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
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="OnboardingIntro"
        screenOptions={{headerShown: false}}>
        <Stack.Screen
          name="OnboardingIntro"
          component={SplashScreen}
        />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
        <Stack.Screen name="SignIn" component={SignInScreen} />
        <Stack.Screen name="Terms" component={TermsScreen} />
        <Stack.Screen name="Privacy" component={PrivacyScreen} />  
        <Stack.Screen
          name="PhoneInput"
          component={PhoneInputScreen}
        />
        <Stack.Screen
          name="OTPVerification"
          component={OTPVerificationScreen}
        />
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen
          name="BasicInfo"
          component={BasicInfoScreen}
        />
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
        <Stack.Screen
          name="MediaUpload"
          component={MediaUploadScreen}
        />
        <Stack.Screen
          name="SubscriptionUpsell"
          component={SubscriptionUpsellScreen}
        />
        <Stack.Screen name="HomeTabs" component={TabNavigator} />
        <Stack.Screen name="Messages" component={ChatsScreen} />
        <Stack.Screen name="ChatScreen" component={ChatScreen} />
        <Stack.Screen name="ProfileDetails" component={ProfileDetailsScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="HelpCentre" component={HelpCentreScreen} />
        <Stack.Screen name="ReportProblem" component={ReportProblemScreen} />
      </Stack.Navigator>
    </NavigationContainer>
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
