import React, {useState, useEffect} from 'react';
import {Text, View, StyleSheet} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HomeScreen from '../features/discovery/screens/HomeScreen';
import LikesScreen from '../features/likes/screens/LikesScreen';
import ChatsScreen from '../features/messages/screens/ChatsScreen';
import ProfileDetailsScreen from '../features/profile/screens/ProfileDetailsScreen';
import ProfileScreen from '../features/profile/screens/ProfileScreen';
import {colors, typography} from '../theme';
import {getLikesCount} from '../services/swipeActions';
import {getUnreadConversationsCount} from '../services/chatService';
import {initSocket} from '../services/socket';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {useAuth} from '../context/AuthContext';
import {enableNotifications} from '../services/notifications';

const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  const {profile, user} = useAuth();
  const [likesCount, setLikesCount] = useState(0);
  const [unreadChatsCount, setUnreadChatsCount] = useState(0);
  const [userName, setUserName] = useState('User');
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadLikesCount();
    loadUnreadChatsCount();
    // Refresh counts every 30 seconds
    const interval = setInterval(() => {
      loadLikesCount();
      loadUnreadChatsCount();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let nameToSet = 'User';
    if (profile) {
      const firstName =
        profile?.basicInfo?.firstName ||
        profile?.basicInfo?.name ||
        profile?.name;
      if (firstName) {
        nameToSet = firstName;
      }
    }
    if (nameToSet === 'User' && user?.fullName) {
      nameToSet = user.fullName.split(' ')[0] || 'User';
    }
    setUserName(nameToSet);
  }, [profile, user]);

  // Register for push notifications and real-time badge updates on mount
  useEffect(() => {
    let boundSocket = null;

    // Defined outside initializeUser so the cleanup return can reference it
    const handleNewMessage = () => {
      // A message arrived — immediately refresh the unread conversations badge
      loadUnreadChatsCount();
    };

    const initializeUser = async () => {
      try {
        const userData = await AsyncStorage.getItem('@pryvo_user');
        if (userData && userData !== 'undefined') {
          const user = JSON.parse(userData);
          await enableNotifications(user.id);

          // Attach to the app-wide singleton socket
          const socket = initSocket(user.id);
          socket.on('receiveMessage', handleNewMessage);
          boundSocket = socket;
        }
      } catch (error) {
        console.log('Failed to initialize user on TabNavigator:', error);
      }
    };
    initializeUser();

    return () => {
      // Pass the handler reference so we only remove OUR listener,
      // leaving ChatsScreen's receiveMessage listener untouched.
      if (boundSocket) {
        boundSocket.off('receiveMessage', handleNewMessage);
      }
    };
  }, []);

  const loadLikesCount = async () => {
    try {
      const userData = await AsyncStorage.getItem('@pryvo_user');
      if (userData && userData !== 'undefined') {
        let user;
        try {
          user = JSON.parse(userData);
        } catch (e) {
          console.error('Failed to parse user data in TabNavigator:', e);
          return;
        }
        const response = await getLikesCount(user.id);
        if (response.success) {
          setLikesCount(response.count || 0);
        }
      }
    } catch (error) {
      console.log('Error loading likes count:', error);
    }
  };

  const loadUnreadChatsCount = async () => {
    try {
      const userData = await AsyncStorage.getItem('@pryvo_user');
      if (userData && userData !== 'undefined') {
        let user;
        try {
          user = JSON.parse(userData);
        } catch (e) {
          return;
        }
        const count = await getUnreadConversationsCount(user.id);
        setUnreadChatsCount(count || 0);
      }
    } catch (error) {
      console.log('Error loading unread chats count:', error);
    }
  };

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        // tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,

          paddingBottom: Math.max(insets.bottom, 10),
          paddingTop: 8,
          height: 60 + Math.max(insets.bottom - 8, 0),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: typography.fontFamilyMedium,
        },
      }}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({color, size}) => (
            <MaterialCommunityIcons
              name="home"
              size={25}
              color={color}
              style={styles.inputIcon}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Matches"
        component={LikesScreen}
        listeners={{
          tabPress: () => loadLikesCount(),
        }}
        options={{
          tabBarIcon: ({color, size}) => (
            <View>
              <MaterialCommunityIcons
                name="heart"
                size={25}
                color={color}
                style={styles.inputIcon}
              />
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
        name="Chats"
        component={ChatsScreen}
        listeners={{
          tabPress: () => loadUnreadChatsCount(),
        }}
        options={{
          tabBarIcon: ({color, size}) => (
            <View>
              <MaterialCommunityIcons
                name="chat"
                size={25}
                color={color}
                style={styles.inputIcon}
              />
              {unreadChatsCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadChatsCount > 9 ? '9+' : unreadChatsCount}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="User"
        component={ProfileScreen}
        options={{
          tabBarLabel: userName,
          tabBarIcon: ({color, size}) => (
            <MaterialCommunityIcons
              name="account-circle"
              size={25}
              color={color}
              style={styles.inputIcon}
            />
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
  inputIcon: {
    fontWeight: 'bold',
  },
});

export default TabNavigator;
