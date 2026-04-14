/**
 * AuthContext.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Authentication context with NO onboarding redirection.
 * Login ALWAYS goes to HomeTabs if the user is authenticated.
 * Profile completion is calculated purely for display (non-blocking).
 */
import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {getAccessToken} from '../services/storage/tokenStorage';
import {getProfile} from '../services/profile/profileService';
import {AppRoute} from '../constants/routes';

const AuthContext = createContext();

const KEYS = {
  USER: '@pryvo_user',
  PROFILE_CACHE: '@pryvo_profile_cache',
  TOKEN: '@pryvo/token',
  REFRESH: '@pryvo/refresh',
};

async function fetchProfileWithRetry(userId, maxRetries = 2) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await getProfile(userId);
      return response?.profile || response;
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        await new Promise(res => setTimeout(res, 1000 * (attempt + 1)));
      }
    }
  }
  console.warn('[AuthContext] Profile fetch failed after retries:', lastError?.message);
  return null;
}

export const AuthProvider = ({children}) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [completionRate, setCompletionRate] = useState(0);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);

  const isAppReady = !authLoading && !profileLoading;

  // ── Complete onboarding ───────────────────────────────────────────────────
  const completeOnboarding = useCallback(async () => {
    if (!user?.id) return;
    try {
      await AsyncStorage.setItem(`@pryvo_has_seen_onboarding_${user.id}`, 'true');
      setHasSeenOnboarding(true);
    } catch (e) {
      console.error('[AuthContext] Error marking onboarding complete:', e);
    }
  }, [user]);

  // ── Profile completion score (display-only, never blocks navigation) ──────
  const calculateCompletion = useCallback(p => {
    if (!p) return;
    let score = 0;
    const total = 6;
    if (p.basicInfo?.firstName && p.basicInfo?.dob) score += 1;
    if (p.profilePrompts?.aboutMe?.answer || p.bio) score += 1;
    if (p.personalDetails?.height || p.personalDetails?.jobTitle) score += 1;
    if (p.lifestyle?.drink || p.lifestyle?.smokeTobacco) score += 1;
    if (p.datingPreferences?.whoToDate?.length > 0) score += 1;
    const mediaCount =
      p.media?.media?.filter(m => m?.url)?.length || p.photos?.length || 0;
    if (mediaCount >= 5) score += 1;
    else if (mediaCount > 0) score += 0.5;
    setCompletionRate(Math.round((score / total) * 100));
  }, []);

  // ── Load and cache profile ─────────────────────────────────────────────────
  const loadProfile = useCallback(
    async userId => {
      setProfileLoading(true);
      try {
        const cached = await AsyncStorage.getItem(KEYS.PROFILE_CACHE);
        if (cached) {
          try {
            const cachedProfile = JSON.parse(cached);
            if (cachedProfile?.userId === userId) {
              setProfile(cachedProfile);
              calculateCompletion(cachedProfile);
            }
          } catch (_) {}
        }

        const freshProfile = await fetchProfileWithRetry(userId);
        if (freshProfile) {
          setProfile(freshProfile);
          calculateCompletion(freshProfile);
          await AsyncStorage.setItem(KEYS.PROFILE_CACHE, JSON.stringify(freshProfile));
        }
        return freshProfile;
      } catch (error) {
        console.error('[AuthContext] loadProfile error:', error);
        return null;
      } finally {
        setProfileLoading(false);
      }
    },
    [calculateCompletion],
  );

  // ── Cold-start: check session + onboarding state ─────────────────────────
  useEffect(() => {
    const initAuth = async () => {
      try {
        const [token, storedUser] = await Promise.all([
          getAccessToken(),
          AsyncStorage.getItem(KEYS.USER),
        ]);

        if (token && storedUser) {
          let parsedUser;
          try {
            parsedUser = JSON.parse(storedUser);
          } catch (_) {
            setAuthLoading(false);
            return;
          }
          setUser(parsedUser);
          
          // Load user-specific onboarding status
          const status = await AsyncStorage.getItem(`@pryvo_has_seen_onboarding_${parsedUser.id}`);
          setHasSeenOnboarding(status === 'true');

          await loadProfile(parsedUser.id);
        }
      } catch (error) {
        console.error('[AuthContext] Init error:', error);
      } finally {
        setAuthLoading(false);
      }
    };
    initAuth();
  }, [loadProfile]);

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = useCallback(
    async userData => {
      if (!userData) return null;
      await AsyncStorage.setItem(KEYS.USER, JSON.stringify(userData));
      setUser(userData);

      // Check onboarding status on login
      const status = await AsyncStorage.getItem(`@pryvo_has_seen_onboarding_${userData.id}`);
      setHasSeenOnboarding(status === 'true');

      const freshProfile = await loadProfile(userData.id);
      return freshProfile;
    },
    [loadProfile],
  );

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    await AsyncStorage.multiRemove([
      KEYS.TOKEN,
      KEYS.REFRESH,
      KEYS.USER,
      KEYS.PROFILE_CACHE,
    ]);
    // NOTE: We do NOT clear @pryvo_has_seen_onboarding on logout
    // because that flag is per-device/user and meant to persist.
    setUser(null);
    setProfile(null);
    setCompletionRate(0);
  }, []);

  // ── Update profile in context + cache ──────────────────────────────────────
  const updateProfileState = useCallback(
    newProfile => {
      setProfile(newProfile);
      calculateCompletion(newProfile);
      AsyncStorage.setItem(KEYS.PROFILE_CACHE, JSON.stringify(newProfile)).catch(
        () => {},
      );
    },
    [calculateCompletion],
  );

  // ── Navigation Flow Logic ──────────────────────────────────────────────────
  const getNextOnboardingScreen = useCallback((userOverride = null, onboardingOverride = null) => {
    const activeUser = userOverride || user;
    if (!activeUser) return AppRoute.Welcome;

    const seenOnboarding = onboardingOverride !== null ? onboardingOverride : hasSeenOnboarding;

    // IF hasSeenOnboarding === false → navigate to FIRST onboarding screen
    if (!seenOnboarding) {
      return AppRoute.Welcome;
    }

    // ELSE → navigate to Home
    return AppRoute.HomeTabs;
  }, [user, hasSeenOnboarding]);

  const value = {
    user,
    profile,
    authLoading,
    profileLoading,
    loading: authLoading,
    isAppReady,
    completionRate,
    hasSeenOnboarding,
    completeOnboarding,
    login,
    logout,
    loadProfile,
    updateProfileState,
    getNextOnboardingScreen,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
