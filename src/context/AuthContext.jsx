import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {getAccessToken, clearTokens} from '../services/storage/tokenStorage';
import {getProfile} from '../services/profile/profileService';

const AuthContext = createContext({});

export const AuthProvider = ({children}) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(async () => {
    console.log('[AuthContext] Logging out');
    await clearTokens();
    await AsyncStorage.removeItem('@pryvo_user');
    setUser(null);
    setProfile(null);
  }, []);

  const loadProfile = useCallback(
    async userId => {
      try {
        console.log('[AuthContext] Fetching profile for:', userId);
        const data = await getProfile(userId);
        if (data?.profile) {
          console.log('[AuthContext] Profile loaded successfully');
          setProfile(data.profile);
          return true;
        }
      } catch (error) {
        console.error('[AuthContext] Error loading profile:', error);
        // If the user OR profile is not found (401/404), we should log out locally
        if (error.status === 401 || error.status === 404) {
          console.log('[AuthContext] Session invalid (401/404) - logging out');
          await logout();
        }
      }
      return false;
    },
    [logout],
  );

  const login = async userData => {
    console.log('[AuthContext] Login called with user:', userData?.id);
    setUser(userData);
    if (userData?.id) {
      return await loadProfile(userData.id);
    }
    return false;
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = await getAccessToken();
        const storedUser = await AsyncStorage.getItem('@pryvo_user');

        console.log('[AuthContext] Initializing auth state...', {
          hasToken: !!token,
          hasUser: !!storedUser,
        });

        if (token && storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          await loadProfile(parsedUser.id);
        }
      } catch (error) {
        console.error('[AuthContext] Initialization error:', error);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, [loadProfile]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isAuthenticated: !!user,
        loading,
        login,
        logout,
        setProfile,
        loadProfile,
      }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
