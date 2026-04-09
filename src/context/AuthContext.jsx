/**
 * AuthContext.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Refactored with:
 *  - onboardingStep as the single source of truth for navigation gating
 *  - profileLoading state (distinct from authLoading)
 *  - Profile caching in AsyncStorage (instant reads on cold start)
 *  - Profile fetch retry logic (up to 2 retries)
 *  - Fallback to profile-field checks for legacy users without onboardingStep
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

// ─── AsyncStorage keys ───────────────────────────────────────────────────────
const KEYS = {
  USER: '@pryvo_user',
  PROFILE_CACHE: '@pryvo_profile_cache',
  TOKEN: '@pryvo/token',
  REFRESH: '@pryvo/refresh',
};

// ─── Utility: derive onboarding step from profile fields (legacy fallback) ───
function deriveStepFromProfile(profile) {
  if (!profile) return 'BASIC_INFO';
  const b = profile.basicInfo || {};
  const hasName = b.firstName || b.name;
  const hasDob = b.dob || b.birthDate;
  const hasGender = !!b.gender;
  const hasLocation =
    (b.locationDetails?.lat && b.locationDetails?.lng) ||
    b.location ||
    (profile.location?.coordinates?.[0] !== 0 &&
      profile.location?.coordinates?.[1] !== 0);

  if (!hasName || !hasDob || !hasGender || !hasLocation) return 'BASIC_INFO';

  const dp = profile.datingPreferences || {};
  if (!dp.whoToDate?.length) return 'DATING_PREFERENCES';

  const pd = profile.personalDetails || {};
  if (!pd.height && !pd.jobTitle && !pd.educationLevel) return 'PERSONAL_DETAILS';

  const ls = profile.lifestyle || {};
  if (!ls.drink && !ls.smokeTobacco && (!ls.interests || ls.interests.length === 0)) return 'LIFESTYLE';

  const pp = profile.profilePrompts || {};
  if (!pp.aboutMe?.answer && !pp.bio && Object.keys(pp).length <= 2) return 'PROFILE_PROMPTS';

  const mediaCount = profile.media?.media?.filter(m => m?.url)?.length || profile.photos?.length || 0;
  if (mediaCount < 1) return 'MEDIA';

  return 'COMPLETE';
}

// ─── Utility: resolve AppRoute from onboardingStep ───────────────────────────
function stepToRoute(step) {
  switch (step) {
    case 'BASIC_INFO':
      return AppRoute.BasicInfo;
    case 'DATING_PREFERENCES':
      return AppRoute.DatingPreferences;
    case 'PERSONAL_DETAILS':
      return AppRoute.PersonalDetails;
    case 'LIFESTYLE':
      return AppRoute.Lifestyle;
    case 'PROFILE_PROMPTS':
      return AppRoute.ProfilePrompts;
    case 'MEDIA':
      return AppRoute.MediaUpload;
    case 'COMPLETE':
    default:
      return AppRoute.HomeTabs;
  }
}

// ─── Utility: fetch profile with up to `maxRetries` retries ──────────────────
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

// ─── Provider ────────────────────────────────────────────────────────────────
export const AuthProvider = ({children}) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);   // Session check
  const [profileLoading, setProfileLoading] = useState(false); // Profile API call
  const [completionRate, setCompletionRate] = useState(0);

  // isAppReady: true only when BOTH the session AND profile are fully resolved
  const isAppReady = !authLoading && !profileLoading;

  // ── Completion rate ────────────────────────────────────────────────────────
  const calculateCompletion = useCallback((p) => {
    if (!p) return;
    let score = 0;
    const total = 6;
    if (p.basicInfo?.firstName && p.basicInfo?.dob) score += 1;
    if (p.profilePrompts?.aboutMe?.answer || p.bio) score += 1;
    if (p.personalDetails?.height || p.personalDetails?.jobTitle) score += 1;
    if (p.lifestyle?.drink || p.lifestyle?.smoke) score += 1;
    if (p.datingPreferences?.whoToDate?.length > 0) score += 1;
    const mediaCount = p.media?.media?.filter(m => m?.url)?.length || p.photos?.length || 0;
    if (mediaCount >= 5) score += 1;
    else if (mediaCount > 0) score += 0.5;
    setCompletionRate(Math.round((score / total) * 100));
  }, []);

  // ── Load and cache profile ─────────────────────────────────────────────────
  const loadProfile = useCallback(async (userId) => {
    setProfileLoading(true);
    try {
      // First: serve cached profile instantly (no onboarding flash)
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

      // Then: fetch fresh data from API with retry
      const freshProfile = await fetchProfileWithRetry(userId);
      if (freshProfile) {
        setProfile(freshProfile);
        calculateCompletion(freshProfile);
        
        // [ONBOARDING SYNC]
        // If the profile includes a fresh onboardingStep, sync it back to the user object.
        if (freshProfile.onboardingStep) {
          setUser(prev => {
            const next = prev ? { ...prev, onboardingStep: freshProfile.onboardingStep } : null;
            if (next) AsyncStorage.setItem(KEYS.USER, JSON.stringify(next)).catch(() => {});
            return next;
          });
        }

        // Update cache
        await AsyncStorage.setItem(KEYS.PROFILE_CACHE, JSON.stringify(freshProfile));
      }
      return freshProfile;
    } catch (error) {
      console.error('[AuthContext] loadProfile error:', error);
      return null;
    } finally {
      setProfileLoading(false);
    }
  }, [calculateCompletion]);

  // ── Cold-start session initialization ──────────────────────────────────────
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
            return; // Corrupt data — stay on splash
          }

          // [RESUME PROTECTION]
          // If the user hasn't finished onboarding, do not auto-login on cold start. 
          // This forces a login check and prevents bypassing the splash buttons.
          if (parsedUser.onboardingStep && parsedUser.onboardingStep !== 'COMPLETE') {
            const keysToClear = [KEYS.TOKEN, KEYS.REFRESH, KEYS.USER, KEYS.PROFILE_CACHE];
            await AsyncStorage.multiRemove(keysToClear);
            setAuthLoading(false);
            return;
          }

          setUser(parsedUser);
          // Load profile (serves cache instantly, then fetches fresh)
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
  // Called after signIn/signUp API responses.
  // `userData` comes from the server and now includes `onboardingStep`.
  const login = useCallback(async (userData) => {
    if (!userData) return null;
    await AsyncStorage.setItem(KEYS.USER, JSON.stringify(userData));
    setUser(userData);
    // Load profile in background (serves cache if available)
    const freshProfile = await loadProfile(userData.id);
    return freshProfile;
  }, [loadProfile]);

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    await AsyncStorage.multiRemove([
      KEYS.TOKEN,
      KEYS.REFRESH,
      KEYS.USER,
      KEYS.PROFILE_CACHE,
    ]);
    setUser(null);
    setProfile(null);
    setCompletionRate(0);
  }, []);

  // ── Update profile in context + cache ──────────────────────────────────────
  const updateProfileState = useCallback((newProfile) => {
    setProfile(newProfile);
    calculateCompletion(newProfile);
    AsyncStorage.setItem(KEYS.PROFILE_CACHE, JSON.stringify(newProfile)).catch(() => {});
  }, [calculateCompletion]);

  // ── Navigation gating (single source of truth) ─────────────────────────────
  // Priority: user.onboardingStep → profile-field derivation (legacy fallback)
  // Accepts optional freshUser/freshProfile to avoid React state race conditions.
  const getNextOnboardingScreen = useCallback(
    (freshUser = null, freshProfile = null) => {
      const u = freshUser || user;
      const p = freshProfile || profile;

      if (!u) return AppRoute.Welcome;

      // 1. Use onboardingStep from user object (set by server — most reliable)
      if (u.onboardingStep) {
        const route = stepToRoute(u.onboardingStep);
        console.log(
          `[AuthContext] onboardingStep=${u.onboardingStep} → ${route}`,
        );
        return route;
      }

      // 2. Legacy fallback: derive from profile fields
      // ONLY run this if we have a profile loaded. Never assume BASIC_INFO
      // just because profile is null (it may still be loading).
      if (p !== null) {
        const derivedStep = deriveStepFromProfile(p);
        console.log(
          `[AuthContext] (legacy) derivedStep=${derivedStep} → ${stepToRoute(derivedStep)}`,
        );
        return stepToRoute(derivedStep);
      }

      // 3. If profile is null AND onboardingStep is unknown → do not redirect to onboarding.
      //    Return HomeTabs as a safe default (user will see empty state or retry).
      console.warn(
        '[AuthContext] Cannot determine onboardingStep (profile null, no stored step). Defaulting to HomeTabs.',
      );
      return AppRoute.HomeTabs;
    },
    [user, profile],
  );

  const value = {
    user,
    profile,
    authLoading,
    profileLoading,
    loading: authLoading, // backward compat alias
    isAppReady,
    completionRate,
    login,
    logout,
    loadProfile,
    updateProfileState,
    getNextOnboardingScreen,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
