import React, {createContext, useState, useContext, useEffect, useMemo, useCallback} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {getAccessToken} from '../services/storage/tokenStorage';
import {getProfile} from '../services/profile/profileService';
import {AppRoute} from '../constants/routes';

const AuthContext = createContext();

export const AuthProvider = ({children}) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completionRate, setCompletionRate] = useState(0);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = await getAccessToken();
        const storedUser = await AsyncStorage.getItem('@pryvo_user');
        
        if (token && storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          // Load profile if user exists
          await loadProfile(parsedUser.id);
        }
      } catch (error) {
        console.error('[AuthContext] Init error:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const loadProfile = async (userId) => {
    try {
      const response = await getProfile(userId);
      const p = response?.profile || response;
      setProfile(p);
      
      // Update completion rate when profile loads
      if (p) {
        calculateCompletion(p);
      }
      return p;
    } catch (error) {
      console.error('[AuthContext] Load profile error:', error);
      return null;
    }
  };

  const calculateCompletion = (p) => {
    if (!p) return;
    
    let score = 0;
    let total = 6; // Basic, Prompts, Details, Lifestyle, Dating, Media

    if (p.basicInfo?.firstName && p.basicInfo?.dob) score += 1;
    if (p.profilePrompts?.aboutMe?.answer || p.bio) score += 1;
    if (p.personalDetails?.height || p.personalDetails?.jobTitle) score += 1;
    if (p.lifestyle?.drink || p.lifestyle?.smoke) score += 1;
    if (p.datingPreferences?.whoToDate?.length > 0) score += 1;
    
    const mediaCount = (p.media?.media?.length || 0) || (p.photos?.length || 0);
    if (mediaCount >= 5) score += 1;
    else if (mediaCount > 0) score += 0.5;

    const rate = Math.round((score / total) * 100);
    setCompletionRate(rate);
  };

  const login = async (userData, token) => {
    await AsyncStorage.setItem('@pryvo/token', token);
    await AsyncStorage.setItem('@pryvo_user', JSON.stringify(userData));
    setUser(userData);
    const p = await loadProfile(userData.id);
    return { user: userData, profile: p };
  };

  const logout = async () => {
    await AsyncStorage.multiRemove(['@pryvo/token', '@pryvo/refresh', '@pryvo_user']);
    setUser(null);
    setProfile(null);
  };

  const updateProfileState = (newProfile) => {
    setProfile(newProfile);
    calculateCompletion(newProfile);
  };

  const getNextOnboardingScreen = useCallback(() => {
    if (!user) return AppRoute.Welcome;
    
    // Use fresh profile data
    const p = profile;

    // 1. CORE BASIC INFO (Name, Age, Location, Gender)
    // These are the ONLY pages we block the user on.
    if (
      !p ||
      !p.basicInfo ||
      !p.basicInfo.firstName ||
      !p.basicInfo.dob ||
      !p.basicInfo.gender ||
      !p.basicInfo.locationDetails
    ) {
      console.log('[AuthContext] CORE Basic info incomplete (Name/DOB/Location/Gender)');
      return AppRoute.BasicInfo;
    }

    // 2. CORE MEDIA (At least one photo)
    // We let them through with just 1 photo, though we remind them later to add 5.
    const mediaCount = (p?.media?.media?.length || 0) || (p?.photos?.length || 0);
    if (mediaCount < 1) {
      console.log('[AuthContext] CORE Media incomplete (need at least 1)');
      return AppRoute.MediaUpload;
    }

    // Everything else (PersonalDetails, Lifestyle, ProfilePrompts, etc.)
    // is secondary and does NOT block the user from swiping.
    console.log('[AuthContext] Core checks passed -> HomeTabs');
    return AppRoute.HomeTabs;
  }, [user, profile]);

  const value = {
    user,
    profile,
    loading,
    completionRate,
    login,
    logout,
    loadProfile,
    updateProfileState,
    getNextOnboardingScreen,
    isAuthenticated: !!user && !!profile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
