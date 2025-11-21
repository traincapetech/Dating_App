import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {AppRoute} from '../constants/routes';
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
import HomeScreen from '../features/discovery/screens/HomeScreen.jsx';
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
        initialRouteName={AppRoute.OnboardingIntro}
        screenOptions={{headerShown: false}}>
        <Stack.Screen
          name={AppRoute.OnboardingIntro}
          component={SplashScreen}
        />
        <Stack.Screen name={AppRoute.SignUp} component={SignUpScreen} />
        <Stack.Screen name={AppRoute.SignIn} component={SignInScreen} />
        <Stack.Screen name={AppRoute.Terms} component={TermsScreen} />
        <Stack.Screen name={AppRoute.Privacy} component={PrivacyScreen} />  
        <Stack.Screen
          name={AppRoute.PhoneInput}
          component={PhoneInputScreen}
        />
        <Stack.Screen
          name={AppRoute.OTPVerification}
          component={OTPVerificationScreen}
        />
        <Stack.Screen name={AppRoute.Welcome} component={WelcomeScreen} />
        <Stack.Screen
          name={AppRoute.BasicInfo}
          component={BasicInfoScreen}
        />
        <Stack.Screen
          name={AppRoute.DatingPreferences}
          component={DatingPreferencesScreen}
        />
        <Stack.Screen
          name={AppRoute.PersonalDetails}
          component={PersonalDetailsScreen}
        />
        <Stack.Screen name={AppRoute.Lifestyle} component={LifestyleScreen} />
        <Stack.Screen
          name={AppRoute.ProfilePrompts}
          component={ProfilePromptsScreen}
        />
        <Stack.Screen
          name={AppRoute.MediaUpload}
          component={MediaUploadScreen}
        />
        <Stack.Screen
          name={AppRoute.SubscriptionUpsell}
          component={SubscriptionUpsellScreen}
        />
        <Stack.Screen name={AppRoute.HomeTabs} component={HomeScreen} />
        <Stack.Screen name={AppRoute.Messages} component={PlaceholderScreen} />
        <Stack.Screen name={AppRoute.Settings} component={PlaceholderScreen} />
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
