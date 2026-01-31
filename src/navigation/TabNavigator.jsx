import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HomeScreen from '../features/discovery/screens/HomeScreen';
import LikesScreen from '../features/likes/screens/LikesScreen';
import ChatsScreen from '../features/messages/screens/ChatsScreen';
import ProfileScreen from '../features/profile/screens/ProfileScreen';
import SettingsScreen from '../features/settings/screens/SettingsScreen';
import { colors, typography } from '../theme';
import { getLikesCount } from '../services/swipeActions';

const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  const [likesCount, setLikesCount] = useState(0);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadLikesCount();
    // Refresh count every 30 seconds
    const interval = setInterval(loadLikesCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadLikesCount = async () => {
    try {
      const userData = await AsyncStorage.getItem('@pryvo_user');
      if (userData) {
        const user = JSON.parse(userData);
        const response = await getLikesCount(user.id);
        if (response.success) {
          setLikesCount(response.count || 0);
        }
      }
    } catch (error) {
      console.log('Error loading likes count:', error);
    }
  };

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
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 8,
          height: 60 + Math.max(insets.bottom - 8, 0),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: typography.fontFamilyMedium,
        },
      }}>
      <Tab.Screen
        name="Discover"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>🔥</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Likes"
        component={LikesScreen}
        listeners={{
          tabPress: () => loadLikesCount(),
        }}
        options={{
          tabBarIcon: ({ color, size }) => (
            <View>
              <Text style={{ fontSize: size, color }}>💕</Text>
              {likesCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {likesCount > 9 ? '9+' : likesCount}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Messages"
        component={ChatsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>💬</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>👤</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>⚙️</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    right: -8,
    top: -4,
    backgroundColor: colors.primary,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default TabNavigator;
