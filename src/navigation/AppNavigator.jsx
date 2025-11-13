import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {AppRoute} from '../constants/routes';
import SplashScreen from '../features/onboarding/screens/SplashScreen.jsx';
import SignUpScreen from '../features/auth/screens/SignUpScreen.jsx';
import SignInScreen from '../features/auth/screens/SignInScreen.jsx';
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
        <Stack.Screen
          name={AppRoute.PhoneInput}
          component={PlaceholderScreen}
        />
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
