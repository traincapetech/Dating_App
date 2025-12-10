import React from 'react';
import {Text} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import HomeScreen from '../features/discovery/screens/HomeScreen';
import MessagesScreen from '../features/messages/screens/MessagesScreen';
import ProfileScreen from '../features/profile/screens/ProfileScreen';
import SettingsScreen from '../features/settings/screens/SettingsScreen';
import {colors, typography} from '../theme';

const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: typography.fontFamilyMedium,
        },
      }}>
      <Tab.Screen
        name="Discover"
        component={HomeScreen}
        options={{
          tabBarIcon: ({color, size}) => (
            <Text style={{fontSize: size, color}}>🔥</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
        options={{
          tabBarIcon: ({color, size}) => (
            <Text style={{fontSize: size, color}}>💬</Text>
          ),
          tabBarBadge: null, // Can add badge count here
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({color, size}) => (
            <Text style={{fontSize: size, color}}>👤</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({color, size}) => (
            <Text style={{fontSize: size, color}}>⚙️</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default TabNavigator;

