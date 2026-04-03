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
import {AppRoute} from '../constants/routes';
import {useInitialLoad} from './InitialLoadContext';

const AuthContext = createContext({});

export const AuthProvider = ({children}) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [pendingIntent, setPendingIntent] = useState(null); // { type, userId, ... }
  const {resetVisited} = useInitialLoad();

  const logout = useCallback(async () => {
    console.log('[AuthContext] Logging out');
    await clearTokens();
    await AsyncStorage.removeItem('@pryvo_user');
    setUser(null);
    setProfile(null);
    resetVisited();
  }, [resetVisited]);

  const loadProfile = useCallback(
    async userId => {
      setProfileLoading(true);
      try {
        console.log('[AuthContext] Fetching profile for:', userId);
        const data = await getProfile(userId);
        if (data?.profile) {
          console.log('[AuthContext] Profile loaded successfully');
          setProfile(data.profile);
          return data.profile;
        }
      } catch (error) {
        const status =
          typeof error?.status === 'number' ? error.status : undefined;
        console.error('[AuthContext] Error loading profile:', {
          message: error?.message,
          status,
          isNetworkError: !!error?.isNetworkError,
          path: error?.path,
          baseUrl: error?.baseUrl,
          method: error?.method,
          originalMessage: error?.originalError?.message,
        });
        // If the session is invalid (401), we should log out locally
        if (status === 401) {
          console.log('[AuthContext] Session invalid (401) - logging out');
          await logout();
        }
        // 404 just means no profile exists yet, which is fine for new users
        if (status === 404) {
          console.log('[AuthContext] No profile found (404) - user may be new');
        }
      } finally {
        setProfileLoading(false);
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
    return null;
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

  /**
   * Calculates the profile completion percentage
   * This is used to guide the user to fill 'optional' details without blocking their journey.
   */
  const calculateProfileCompletion = useCallback((manualProfile) => {
    const p = manualProfile || profile;
    if (!p) return 0;
    
    let score = 0;
    const totalWeight = 100;
    
    // Core (50%)
    if (p.basicInfo?.firstName && p.basicInfo?.dob) score += 20;
    if (p.datingPreferences?.whoToDate?.length > 0) score += 15;
    if (p.media?.media?.length >= 1) score += 15;
    
    // Secondary/Detailed (50%)
    if (p.personalDetails?.height) score += 10;
    if (p.lifestyle?.drink) score += 10;
    if (p.profilePrompts?.aboutMe?.question) score += 10;
    if (p.media?.media?.length >= 5) score += 20; // Reaching the recommended photo count
    
    return Math.min(score, totalWeight);
  }, [profile]);

  /**
   * Determines the absolute NECESSARY next step.
   * This logic now only blocks for 'Core' data needed to show the user to others.
   * Everything else is handled as 'Optional' via profile completion.
   */
  const getNextOnboardingScreen = useCallback((manualUser, manualProfile) => {
    const u = manualUser || user;
    const p = manualProfile || profile;

    if (!u) return AppRoute.SignIn;

    console.log('[AuthContext] Determining next core screen. Profile state:', {
      hasProfile: !!p,
      mediaCount: p?.media?.media?.length || 0,
    });

    // 1. CORE BASIC INFO (Name, Age, Location, Gender, Identity)
    // We check if the absolute essentials exist.
    if (
      !p ||
      !p.basicInfo ||
      !p.basicInfo.firstName ||
      !p.basicInfo.dob ||
      !p.basicInfo.locationDetails || // Changed from locationDetails.coordinates
      !p.basicInfo.gender
    ) {
      console.log('[AuthContext] CORE Basic info incomplete (Name/DOB/Location/Gender)');
      return AppRoute.BasicInfo;
    }

    // 2. CORE DATING INTENT (Who do you want to see?)
    // This allows the app to function. Optional if we want to be even more permissive.
    if (
      !p.datingPreferences ||
      !p.datingPreferences.whoToDate ||
      p.datingPreferences.whoToDate.length === 0
    ) {
      console.log('[AuthContext] CORE Dating preferences missing');
      return AppRoute.DatingPreferences;
    }

    // 3. CORE MEDIA (At least one photo)
    const mediaCount = (p?.media?.media?.length || 0) || (p?.photos?.length || 0);
    if (mediaCount < 1) {
      console.log('[AuthContext] CORE Media incomplete (need at least 1)');
      return AppRoute.MediaUpload;
    }

    // EVERYTHING ELSE (Height, Lifestyle, Prompts, extra photos) 
    // is now considered 'Secondary' and won't block the user from the app.
    console.log('[AuthContext] Core stats complete. Redirecting to Home.');
    return AppRoute.HomeTabs;
  }, [user, profile]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isAuthenticated: !!user,
        loading,
        profileLoading,
        login,
        logout,
        setProfile,
        loadProfile,
        pendingIntent,
        setPendingIntent,
        getNextOnboardingScreen,
        calculateProfileCompletion,
        completionRate: calculateProfileCompletion(),
      }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
