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

const AuthContext = createContext({});

export const AuthProvider = ({children}) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const logout = useCallback(async () => {
    console.log('[AuthContext] Logging out');
    await clearTokens();
    await AsyncStorage.removeItem('@pryvo_user');
    setUser(null);
    setProfile(null);
  }, []);

  const loadProfile = useCallback(
    async userId => {
      setProfileLoading(true);
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
        // If the session is invalid (401), we should log out locally
        if (error.status === 401) {
          console.log('[AuthContext] Session invalid (401) - logging out');
          await logout();
        }
        // 404 just means no profile exists yet, which is fine for new users
        if (error.status === 404) {
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

  const getNextOnboardingScreen = useCallback(() => {
    if (!user) return AppRoute.SignIn;

    console.log('[AuthContext] Determining next screen. Profile state:', {
      hasProfile: !!profile,
      hasBasicInfo: !!profile?.basicInfo,
      isVerified: profile?.isVerified,
      hasDatingPrefs: !!profile?.datingPreferences,
      hasPersonalDetails: !!profile?.personalDetails,
      hasLifestyle: !!profile?.lifestyle,
      hasPrompts: !!profile?.profilePrompts,
      mediaCount: profile?.media?.media?.length || 0,
    });

    // Check if basic info is complete
    if (
      !profile ||
      !profile.basicInfo ||
      !profile.basicInfo.firstName ||
      !profile.basicInfo.lastName ||
      !profile.basicInfo.dob ||
      !profile.isVerified ||
      !profile.basicInfo.locationDetails ||
      !profile.basicInfo.gender
    ) {
      console.log('[AuthContext] Basic info incomplete');
      return AppRoute.BasicInfo;
    }

    // Check if dating preferences are complete
    if (
      !profile.datingPreferences ||
      !profile.datingPreferences.whoToDate ||
      profile.datingPreferences.whoToDate.length === 0
    ) {
      console.log('[AuthContext] Dating preferences incomplete');
      return AppRoute.DatingPreferences;
    }

    // Check if personal details are complete
    if (!profile.personalDetails || !profile.personalDetails.height) {
      console.log('[AuthContext] Personal details incomplete');
      return AppRoute.PersonalDetails;
    }

    // Check if lifestyle is complete
    if (!profile.lifestyle || !profile.lifestyle.drink) {
      console.log('[AuthContext] Lifestyle incomplete');
      return AppRoute.Lifestyle;
    }

    // Check if profile prompts are complete
    if (
      !profile.profilePrompts ||
      !profile.profilePrompts.aboutMe ||
      !profile.profilePrompts.aboutMe.question
    ) {
      console.log('[AuthContext] Profile prompts incomplete');
      return AppRoute.ProfilePrompts;
    }

    // Check if media is uploaded (at least 5)
    if (
      !profile.media ||
      !profile.media.media ||
      profile.media.media.length < 5
    ) {
      console.log('[AuthContext] Media incomplete');
      return AppRoute.MediaUpload;
    }

    console.log('[AuthContext] All steps complete, going to Home');
    // Default to home if everything looks done
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
        getNextOnboardingScreen,
      }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
