import React, {useState, useRef, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  Pressable,
  StatusBar,
  ActivityIndicator,
  Alert,
  ScrollView,
  Modal,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
} from 'react-native-reanimated';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';
import {colors, typography, spacing} from '../../../theme';
import LinearGradient from 'react-native-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import {getDiscoverProfiles} from '../../../services/profile/profileService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MatchPopup from '../../../components/profile/MatchPopup.js';
import {
  likeUser,
  passUser,
  getDailyLikeInfo,
  resetPasses,
} from '../../../services/swipeActions';
import {
  watchLocation,
  getCurrentLocation,
  reverseGeocode,
} from '../../../services/location/locationService';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {useLoading} from '../../../context/LoadingContext';

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - spacing.xl * 2;
const CARD_HEIGHT = SCREEN_HEIGHT * 0.76;
const SWIPE_THRESHOLD = 120;

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  // Check for invalid or 0 coordinates (often default values)
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  if (Math.abs(lat1) < 0.0001 && Math.abs(lon1) < 0.0001) return null;
  if (Math.abs(lat2) < 0.0001 && Math.abs(lon2) < 0.0001) return null;

  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return Math.round(d);
};

const deg2rad = deg => {
  return deg * (Math.PI / 180);
};

const HomeScreen = ({navigation}) => {
  const {setLoading: setGlobalLoading} = useLoading();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [photoIndex, setPhotoIndex] = useState({});
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoadingLocal] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [dailyLikeInfo, setDailyLikeInfo] = useState({
    count: 0,
    limit: 50,
    remaining: 50,
    isPremium: false,
  });
  const [swipeCount, setSwipeCount] = useState(0);
  const [showLikePopup, setShowLikePopup] = useState(false);
  const distancePresets = [
    {label: '1 - 10 km', value: 10},
    {label: '1 - 25 km', value: 25},
    {label: '1 - 50 km', value: 50},
    {label: '1 - 100 km', value: 100},
  ];
  const [maxDistance, setMaxDistance] = useState(distancePresets[2].value); // default 50 km
  const [selectedPreset, setSelectedPreset] = useState(
    distancePresets[2].value,
  );
  const [useDistanceFilter, setUseDistanceFilter] = useState(true);
  const DISTANCE_PREF_KEY = '@pryvo_distance_preferences';

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);

  const [matchPopup, setMatchPopup] = useState({
    visible: false,
    myPhoto: null,
    theirPhoto: null,
    matchId: null,
  });
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const init = async () => {
      let loc = null;
      // Try to get current location first
      try {
        loc = await getCurrentLocation();
        if (loc) {
          setCurrentLocation(loc);
        }
      } catch (e) {
        console.log('Error getting initial location:', e);
      }

      const needsReset = await AsyncStorage.getItem(
        '@pryvo_needs_profile_reset',
      );
      if (needsReset === 'true') {
        const userData = await AsyncStorage.getItem('@pryvo_user');
        if (userData && userData !== 'undefined') {
          try {
            const user = JSON.parse(userData);
            await resetPasses(user.id);
          } catch (e) {
            console.error('Error resetting passes on login:', e);
          }
        }
        await AsyncStorage.removeItem('@pryvo_needs_profile_reset');
      }

      const prefs = await loadDistancePrefs();
      await loadProfiles(
        prefs?.distance,
        prefs?.enabled ?? useDistanceFilter,
        loc,
      );
      await loadDailyLikeInfo();
    };
    init();

    // Watch for location changes and refresh profiles
    const locationWatcher = watchLocation(
      async location => {
        console.log('Location changed, refreshing profiles...', location);
        setCurrentLocation(location);

        // Reload profiles with current distance preferences
        const prefs = await loadDistancePrefs();
        await loadProfiles(
          prefs?.distance,
          prefs?.enabled ?? useDistanceFilter,
          location,
          true, // silent update for location changes
        );
      },
      {
        distanceFilter: 1000, // 1km minimum change
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      },
    );

    // Cleanup on unmount
    return () => {
      locationWatcher.stop();
    };
  }, []);

  const geocodeProfile = useCallback(
    async index => {
      const profile = profiles[index];
      if (!profile || profile.cityGeocoded) return;

      const lat = profile.latitude;
      const lng = profile.longitude;

      if (lat && lng) {
        // Check if current display location is coordinates or empty
        const isCoordinates =
          /^\s*[-+]?\d+(\.\d+)?\s*,\s*[-+]?\d+(\.\d+)?\s*$/.test(
            profile.location || '',
          );
        if (isCoordinates || !profile.city || profile.city === '') {
          const city = await reverseGeocode(lat, lng);
          if (city) {
            setProfiles(prev => {
              const next = [...prev];
              // Safety check in case profiles changed while geocoding
              if (next[index] && next[index].id === profile.id) {
                next[index] = {
                  ...next[index],
                  city: city,
                  cityGeocoded: true,
                };
              }
              return next;
            });
          } else {
            // Mark as geocoded even if it fails to avoid constant retries
            setProfiles(prev => {
              const next = [...prev];
              if (next[index]) next[index].cityGeocoded = true;
              return next;
            });
          }
        } else {
          setProfiles(prev => {
            const next = [...prev];
            if (next[index]) next[index].cityGeocoded = true;
            return next;
          });
        }
      }
    },
    [profiles],
  );

  useEffect(() => {
    if (profiles.length > 0) {
      // Geocode current and next 2 for smoothness
      [currentIndex, currentIndex + 1, currentIndex + 2].forEach(idx => {
        if (profiles[idx]) {
          geocodeProfile(idx);
        }
      });
    }
  }, [currentIndex, profiles.length, geocodeProfile]);

  const loadDailyLikeInfo = useCallback(async () => {
    try {
      const userData = await AsyncStorage.getItem('@pryvo_user');
      let userId = null;
      if (userData && userData !== 'undefined') {
        try {
          const user = JSON.parse(userData);
          const info = await getDailyLikeInfo(user.id, false);
          if (info.success) {
            setDailyLikeInfo({
              count: info.count || 0,
              limit: info.limit || 50,
              remaining: info.remaining || 50,
              isPremium: info.isPremium || false,
            });
          }
        } catch (e) {
          console.error('Failed to parse user data in HomeScreen:', e);
        }
      }
    } catch (error) {
      console.error('Error loading daily like info:', error);
    }
  }, []);

  const loadProfiles = useCallback(
    async (
      distanceOverride = null,
      distanceEnabled = useDistanceFilter,
      userLocationOverride = null,
      silent = false,
    ) => {
      try {
        setLoadingLocal(silent ? false : true);

        // Get current user ID
        const userData = await AsyncStorage.getItem('@pryvo_user');
        let excludeUserId = null;
        if (userData && userData !== 'undefined') {
          try {
            const user = JSON.parse(userData);
            excludeUserId = user.id;
            setCurrentUserId(user.id);
          } catch (e) {
            console.error(
              'Failed to parse user data in HomeScreen loadProfiles:',
              e,
            );
          }
        }

        // Load advanced filters if available
        let advancedFilters = null;
        try {
          const savedFilters = await AsyncStorage.getItem(
            '@pryvo_advanced_filters',
          );
          if (savedFilters && savedFilters !== 'undefined') {
            try {
              const parsed = JSON.parse(savedFilters);
              // Only include filters that have values
              const activeFilters = {};
              Object.keys(parsed).forEach(key => {
                if (parsed[key] !== null && parsed[key] !== undefined) {
                  activeFilters[key] = parsed[key];
                }
              });
              if (Object.keys(activeFilters).length > 0) {
                advancedFilters = activeFilters;
              }
            } catch (e) {
              console.error(
                'Failed to parse advanced filters in HomeScreen:',
                e,
              );
            }
          }
        } catch (error) {
          console.error('Error loading advanced filters:', error);
        }

        // Fetch profiles from backend
        const response = await getDiscoverProfiles(excludeUserId, {
          useMatching: false,
          maxDistance:
            distanceEnabled && (distanceOverride || maxDistance)
              ? distanceOverride || maxDistance
              : undefined,
          filters: advancedFilters,
          // useMatching: true,
          // minScore: 30,
          // sortBy: 'score',
        });

        console.log(
          '[HomeScreen] API Response:',
          JSON.stringify(response, null, 2),
        );

        const userLoc = userLocationOverride || currentLocation;

        if (response?.profiles) {
          const transformedProfiles = response.profiles
            .map(profile => {
              // Priority 1: Recalculate if we have both locations (client side trust)
              // Priority 2: Use backend distance (handle potential meters vs km)
              let distance = null;

              // Check for coordinates to recalculate
              const lat = parseFloat(
                profile.latitude ||
                  profile.location?.coordinates?.[1] ||
                  profile.basicInfo?.locationDetails?.lat,
              );
              const lon = parseFloat(
                profile.longitude ||
                  profile.location?.coordinates?.[0] ||
                  profile.basicInfo?.locationDetails?.lng,
              );

              if (userLoc && !isNaN(lat) && !isNaN(lon)) {
                distance = calculateDistance(
                  userLoc.latitude,
                  userLoc.longitude,
                  lat,
                  lon,
                );
              } else if (
                profile.distance !== undefined &&
                profile.distance !== null
              ) {
                // Fallback to backend distance
                let d = parseFloat(profile.distance);
                // Heuristic: if distance > 500, assume meters and convert to km
                if (d > 500) {
                  d = d / 1000;
                }
                distance = Math.round(d);
              }

              return {
                id: profile.userId || profile.id,
                userId: profile.userId,
                name: profile.name || 'Unknown',
                age: profile.age || null,
                distance: distance !== null ? `${distance}` : null,
                bio: profile.bio || '',
                interests: profile.interests || [],
                photos: profile.photos || [],
                matchPercentage: profile.matchScore
                  ? Math.round(profile.matchScore)
                  : null,
                matchScore: profile.matchScore || null,
                // Add extra fields for detailed view
                jobTitle: profile.personalDetails?.jobTitle || '',
                school: profile.personalDetails?.school || '',
                location: profile.basicInfo?.location || '',
                city: profile.basicInfo?.locationDetails?.city || '',
                gender: profile.basicInfo?.gender || '',
                height: profile.personalDetails?.height || '',
                drink: profile.lifestyle?.drink || '',
                smokeTobacco: profile.lifestyle?.smokeTobacco || '',
                smokeWeed: profile.lifestyle?.smokeWeed || '',
                religion: profile.lifestyle?.religiousBeliefs || '',
                politics: profile.lifestyle?.politicalBeliefs || '',
                datingIntention:
                  profile.datingPreferences?.datingIntention || '',
                relationshipType:
                  profile.datingPreferences?.relationshipType || '',
                latitude: parseFloat(
                  profile.latitude ||
                    profile.location?.coordinates?.[1] ||
                    profile.basicInfo?.locationDetails?.lat,
                ),
                longitude: parseFloat(
                  profile.longitude ||
                    profile.location?.coordinates?.[0] ||
                    profile.basicInfo?.locationDetails?.lng,
                ),
                // Add profile prompts
                prompts: [
                  profile.profilePrompts?.aboutMe,
                  profile.profilePrompts?.selfCare,
                  profile.profilePrompts?.gettingPersonal,
                ].filter(p => p && p.answer),
              };
            })
            .filter(profile => profile.photos && profile.photos.length > 0);

          console.log('RAW API COUNT:', response?.profiles?.length);
          console.log('AFTER TRANSFORM COUNT:', transformedProfiles.length);
          setProfiles(transformedProfiles);
          setCurrentIndex(0);
        } else {
          console.warn('[HomeScreen] No profiles in response:', response);
          setProfiles([]);
          setCurrentIndex(0);
        }
      } catch (error) {
        console.error('Error loading profiles:', error);
        Alert.alert('Error', 'Failed to load profiles. Please try again.');
      } finally {
        setLoadingLocal(false);
      }
    },
    [maxDistance, useDistanceFilter, currentLocation],
  );

  const loadDistancePrefs = async () => {
    try {
      const raw = await AsyncStorage.getItem(DISTANCE_PREF_KEY);
      if (raw && raw !== 'undefined') {
        try {
          const parsed = JSON.parse(raw);
          const distance = clampDistance(parsed.maxDistance ?? maxDistance);
          const enabled =
            typeof parsed.useDistanceFilter === 'boolean'
              ? parsed.useDistanceFilter
              : useDistanceFilter;
          const presetValue = parsed.selectedPreset || null;
          setMaxDistance(distance);
          setUseDistanceFilter(enabled);
          setSelectedPreset(presetValue);
          return {distance, enabled};
        } catch (e) {
          console.error(
            'Failed to parse distance preferences in HomeScreen:',
            e,
          );
        }
      }
      return null;
    } catch (error) {
      console.warn('Failed to load distance preferences', error);
      return null;
    }
  };

  const saveDistancePrefs = async (distance, enabled, presetValue) => {
    try {
      await AsyncStorage.setItem(
        DISTANCE_PREF_KEY,
        JSON.stringify({
          maxDistance: clampDistance(distance),
          useDistanceFilter: enabled,
          selectedPreset: presetValue,
        }),
      );
    } catch (error) {
      console.warn('Failed to save distance preferences', error);
    }
  };

  const clampDistance = value => Math.max(1, Math.min(100, value));

  const handleAdjustDistance = delta => {
    setMaxDistance(prev => {
      const next = clampDistance(prev + delta);
      setSelectedPreset(null);
      saveDistancePrefs(next, useDistanceFilter, null);
      loadProfiles(next, useDistanceFilter, null, false);
      return next;
    });
  };

  const handleSelectPreset = value => {
    setSelectedPreset(value);
    setMaxDistance(value);
    saveDistancePrefs(value, useDistanceFilter, value);
    loadProfiles(value, useDistanceFilter, null, false);
  };

  const handleToggleDistance = () => {
    setUseDistanceFilter(prev => {
      const next = !prev;
      saveDistancePrefs(maxDistance, next, selectedPreset);
      loadProfiles(undefined, next, null, false);
      return next;
    });
  };

  const currentProfile =
    currentIndex < profiles.length ? profiles[currentIndex] : null;

  const resetCardPosition = () => {
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    opacity.value = withTiming(1, {duration: 150});
  };

  const goToNextProfile = () => {
    setCurrentIndex(prev => prev + 1);
    translateX.value = 0;
    translateY.value = 0;
    opacity.value = 1;
  };

  const processSwipe = direction => {
    if (!currentProfile || !currentUserId) return;

    // Check daily like limit before allowing like
    if (direction === 'right' && dailyLikeInfo.remaining <= 0) {
      Alert.alert(
        'Daily Like Limit Reached',
        `You've reached your daily like limit of ${dailyLikeInfo.limit}. Come back tomorrow for more likes!`,
        [{text: 'OK'}],
      );
      return;
    }

    const likedUserId = currentProfile.userId;
    const myPhoto = profiles[currentIndex]?.photos?.[0];
    const theirPhoto = currentProfile.photos?.[0];

    // Only track likes (right swipes) for the popup
    if (direction === 'right') {
      // Increment swipe count only for likes
      const newSwipeCount = swipeCount + 1;
      setSwipeCount(newSwipeCount);

      // Show popup every 10 likes
      if (newSwipeCount % 10 === 0) {
        setShowLikePopup(true);
        setTimeout(() => {
          setShowLikePopup(false);
        }, 2000); // Show for 2 seconds
      }
    }

    // Animate card off screen IMMEDIATELY (don't wait for API)
    translateX.value = withTiming(
      direction === 'right' ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5,
      {duration: 250},
    );
    opacity.value = withTiming(0, {duration: 250}, () => {
      runOnJS(goToNextProfile)();
    });

    // Fire API call in background (don't block animation)
    if (direction === 'right') {
      likeUser(currentUserId, likedUserId, dailyLikeInfo.isPremium)
        .then(result => {
          // Update daily like info if returned
          let updatedInfo;
          if (result?.dailyLikeInfo) {
            updatedInfo = result.dailyLikeInfo;
            setDailyLikeInfo(updatedInfo);
          } else {
            // Fallback: decrement remaining
            updatedInfo = {
              ...dailyLikeInfo,
              count: dailyLikeInfo.count + 1,
              remaining: Math.max(0, dailyLikeInfo.remaining - 1),
            };
            setDailyLikeInfo(updatedInfo);
          }

          // Update popup text if it's showing
          if (showLikePopup) {
            // The popup will show the updated count from state
          }

          if (result?.isMatch && result?.match) {
            setMatchPopup({
              visible: true,
              myPhoto,
              theirPhoto,
              matchId: result.match._id,
            });
          }
        })
        .catch(err => {
          console.error('Like error:', err);
          if (err?.response?.status === 429 || err?.limitReached) {
            Alert.alert(
              'Daily Like Limit Reached',
              err?.message ||
                `You've reached your daily like limit. Come back tomorrow!`,
              [{text: 'OK'}],
            );
            // Reload daily like info
            loadDailyLikeInfo();
          }
        });
    } else {
      passUser(currentUserId, likedUserId).catch(err =>
        console.error('Pass error:', err),
      );
    }
  };

  const handleRewind = () => {
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : 0));
    translateX.value = 0;
    translateY.value = 0;
    opacity.value = 1;
  };

  const gesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate(event => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd(event => {
      if (event.translationX > SWIPE_THRESHOLD || event.velocityX > 500) {
        runOnJS(processSwipe)('right');
      } else if (
        event.translationX < -SWIPE_THRESHOLD ||
        event.velocityX < -500
      ) {
        runOnJS(processSwipe)('left');
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    const rotate =
      interpolate(
        translateX.value,
        [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
        [-15, 0, 15],
      ) + 'deg';

    return {
      transform: [
        {translateX: translateX.value},
        {translateY: translateY.value},
        {rotate: rotate},
      ],
      opacity: opacity.value,
    };
  });

  useFocusEffect(
    useCallback(() => {
      // Just update daily like info on focus, don't reload profiles
      // to avoid resetting currentIndex (fixes Rewind button disable issue)
      loadDailyLikeInfo();
    }, [loadDailyLikeInfo]),
  );

  // Removed the blocking loading screen so the main UI shell shows immediately while loading in background
  if (!currentProfile) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor={colors.background}
        />
        <View style={styles.header}>
          <Pressable
            onPress={() => navigation.navigate('Matches')}
            style={styles.headerIconButton}>
            <MaterialCommunityIcons
              name="heart"
              size={24}
              color={colors.primary}
            />
          </Pressable>
          <Text className="text-4xl font-mona-sans-semibold tracking-[2px] text-black">
            Pryvo
          </Text>
          <View style={styles.headerRight}>
            <Pressable
              onPress={() => navigation.navigate('Chats')}
              style={styles.headerIconButton}>
              <MaterialCommunityIcons
                name="chat"
                size={24}
                color={colors.textPrimary}
              />
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate('AdvancedFilters')}
              style={styles.headerIconButton}>
              <MaterialCommunityIcons
                name="filter-variant"
                size={24}
                color={colors.textPrimary}
              />
            </Pressable>
          </View>
        </View>

        <View style={styles.emptyContainer}>
          <View style={{marginBottom: 20}}>
            <MaterialCommunityIcons
              name="account-search"
              size={80}
              color={colors.primary}
            />
          </View>
          <Text style={styles.emptyTitle}>No more profiles</Text>
          <Text style={styles.emptySubtitle}>
            We've run out of people nearby. Try adjusting your distance or age
            fil ageters to see more people.
          </Text>
          <Pressable
            style={{
              marginTop: 30,
              backgroundColor: colors.primary,
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 24,
            }}
            onPress={async () => {
              setProfiles([]);
              setCurrentIndex(0);
              translateX.value = 0;
              translateY.value = 0;
              opacity.value = 1;
              if (currentUserId) {
                try {
                  await resetPasses(currentUserId);
                } catch (e) {
                  console.error('Failed to reset passes:', e);
                }
              }
              await loadProfiles();
            }}>
            <Text
              style={{
                color: 'white',
                fontFamily: typography.fontFamilyBold,
                fontSize: 16,
              }}>
              Refresh Profiles
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      className=""
      style={styles.safe}
      edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Header with Filter Icon */}
      <View className="" style={styles.header}>
        <Pressable
          onPress={() => navigation.navigate('Matches')}
          style={styles.headerIconButton}>
          <MaterialCommunityIcons
            name="heart"
            size={24}
            color={colors.primary}
          />
        </Pressable>
        <Text className="text-4xl font-mona-sans-semibold tracking-[2px] text-black">
          Pryvo
        </Text>
        <View style={styles.headerRight}>
          <Pressable
            onPress={() => navigation.navigate('Chats')}
            style={styles.headerIconButton}>
            <MaterialCommunityIcons
              name="chat"
              size={24}
              color={colors.textPrimary}
            />
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate('AdvancedFilters')}
            style={styles.headerIconButton}>
            <MaterialCommunityIcons
              name="filter-variant"
              size={24}
              color={colors.textPrimary}
            />
          </Pressable>
        </View>
      </View>

      {/* Card Stack */}
      <View style={styles.cardContainer}>
        {/* Next card (background) */}
        {currentIndex < profiles.length - 1 && (
          <View style={styles.nextCardPlaceholder}>
            <Image
              source={{uri: profiles[currentIndex + 1].photos[0]}}
              style={styles.mainPhoto}
              resizeMode="cover"
            />
            <View style={styles.nextCardOverlay} />
          </View>
        )}

        {/* Current card (swipeable) */}
        <GestureDetector gesture={gesture}>
          <Animated.View style={[styles.card, animatedStyle]}>
            <ScrollView
              style={{flex: 1}}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              scrollEventThrottle={16}>
              {/* 1. Main Photo with Name Overlay */}
              <View style={styles.mainPhotoContainer}>
                {currentProfile.photos && currentProfile.photos.length > 0 && (
                  <Image
                    source={{uri: currentProfile.photos[0]}}
                    style={styles.mainPhoto}
                    resizeMode="cover"
                  />
                )}

                <LinearGradient
                  colors={[
                    'transparent',
                    'rgba(0,0,0,0.4)',
                    'rgba(0,0,0,0.8)',
                    '#000000',
                  ]}
                  locations={[0, 0.5, 0.8, 1]}
                  style={styles.mainPhotoGradient}>
                  <View style={styles.mainPhotoInfo}>
                    <Text className="text-3xl font-mona-sans-regular  text-white">
                      {currentProfile.name}
                      {currentProfile.age ? `, (${currentProfile.age})` : ''}
                    </Text>
                    {(() => {
                      let dist = currentProfile.distance
                        ? parseFloat(currentProfile.distance)
                        : null;

                      // Recalculate distance if missing but we have coordinates
                      if (
                        dist === null &&
                        currentLocation &&
                        !isNaN(currentProfile.latitude) &&
                        !isNaN(currentProfile.longitude)
                      ) {
                        dist = calculateDistance(
                          currentLocation.latitude,
                          currentLocation.longitude,
                          currentProfile.latitude,
                          currentProfile.longitude,
                        );
                      }

                      const locationStr =
                        currentProfile.city || currentProfile.location || '';

                      // Improved coordinate detection: check for numeric format like "28.6074, 77.0819"
                      const isCoordinates =
                        /^\s*[-+]?\d+(\.\d+)?\s*,\s*[-+]?\d+(\.\d+)?\s*$/.test(
                          locationStr,
                        );

                      const displayLocation = isCoordinates
                        ? currentProfile.city || ''
                        : locationStr;

                      if (!displayLocation && (dist === null || dist < 0))
                        return null;

                      // For dating apps, huge distances (e.g. 12000km) look like a bug.
                      // We show "Far away" for anything over 1000km.
                      const distanceLabel =
                        dist !== null && dist > 0
                          ? dist > 1000
                            ? 'Far away'
                            : `${dist} km away`
                          : null;

                      const finalLocation = displayLocation || 'Nearby';

                      return (
                        <Text className="text-sm font-mona-sans-regular text-white">
                          📍 {finalLocation}
                          {distanceLabel ? ` • ${distanceLabel}` : ''}
                        </Text>
                      );
                    })()}
                  </View>
                </LinearGradient>
              </View>

              {/* 2. My Bio Card */}
              {(currentProfile.bio || currentProfile.datingIntention) && (
                <View style={styles.detailsSection}>
                  <Text style={styles.sectionHeader}>My bio</Text>
                  <Text style={styles.bioText}>
                    {currentProfile.bio ||
                      `Looking for ${
                        currentProfile.datingIntention || 'something special'
                      }!`}
                  </Text>
                </View>
              )}

              {/* 3. About Me Badges */}
              <View style={styles.detailsSection}>
                <Text style={styles.sectionHeader}>About me</Text>
                <View style={styles.badgeGrid}>
                  {currentProfile.height && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        📏 {currentProfile.height}
                        {currentProfile.height.includes('cm') ? '' : ' cm'}
                      </Text>
                    </View>
                  )}
                  {currentProfile.gender && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        👤 {currentProfile.gender}
                      </Text>
                    </View>
                  )}
                  {currentProfile.drink && currentProfile.drink !== 'No' && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        🍷 {currentProfile.drink}
                      </Text>
                    </View>
                  )}
                  {currentProfile.religion && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        ⛪ {currentProfile.religion}
                      </Text>
                    </View>
                  )}
                  {currentProfile.politics && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        ⚖️ {currentProfile.politics}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* 4. Second Photo (if available) */}
              {currentProfile.photos.length > 1 && (
                <View style={styles.secondaryPhotoContainer}>
                  <Image
                    source={{uri: currentProfile.photos[1]}}
                    style={styles.secondaryPhoto}
                    resizeMode="cover"
                  />
                </View>
              )}

              {/* 5. Prompt 1 (if available) */}
              {currentProfile.prompts && currentProfile.prompts[0] && (
                <View style={styles.promptSection}>
                  <Text style={styles.promptQuestion}>
                    {currentProfile.prompts[0].prompt || 'My bio'}
                  </Text>
                  <Text style={styles.promptAnswer}>
                    {currentProfile.prompts[0].answer}
                  </Text>
                </View>
              )}

              {/* 6. I'm looking for */}
              {(currentProfile.datingIntention ||
                currentProfile.relationshipType) && (
                <View style={styles.detailsSection}>
                  <Text style={styles.sectionHeader}>I'm looking for</Text>
                  <View style={[styles.badge, styles.intentionBadge]}>
                    <Text style={styles.intentionText}>
                      🔍{' '}
                      {currentProfile.datingIntention ||
                        currentProfile.relationshipType}
                    </Text>
                  </View>
                </View>
              )}

              {/* 7. My interests */}
              {currentProfile.interests &&
                currentProfile.interests.length > 0 && (
                  <View style={styles.detailsSection}>
                    <Text style={styles.sectionHeader}>My interests</Text>
                    <View style={styles.interestsContainer}>
                      {currentProfile.interests.map((interest, index) => (
                        <View key={index} style={styles.interestTag}>
                          <Text style={styles.interestText}>{interest}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

              {/* 8. Prompt 2 (if available) */}
              {currentProfile.prompts && currentProfile.prompts[1] && (
                <View style={styles.promptSection}>
                  <Text style={styles.promptQuestion}>
                    {currentProfile.prompts[1].prompt ||
                      'Things we can talk about'}
                  </Text>
                  <Text style={styles.promptAnswer}>
                    {currentProfile.prompts[1].answer}
                  </Text>
                </View>
              )}

              {/* 9. Work & Education */}
              {(currentProfile.jobTitle || currentProfile.school) && (
                <View style={styles.detailsSection}>
                  <Text style={styles.sectionHeader}>Work & Education</Text>
                  <View style={styles.workRow}>
                    {currentProfile.jobTitle && (
                      <Text style={styles.workText}>
                        💼 {currentProfile.jobTitle}
                      </Text>
                    )}
                    {currentProfile.school && (
                      <Text style={styles.workText}>
                        🎓 {currentProfile.school}
                      </Text>
                    )}
                  </View>
                </View>
              )}

              {/* 10. Third Photo (if available) */}
              {currentProfile.photos.length > 2 && (
                <View style={styles.secondaryPhotoContainer}>
                  <Image
                    source={{uri: currentProfile.photos[2]}}
                    style={styles.secondaryPhoto}
                    resizeMode="cover"
                  />
                </View>
              )}

              {/* 11. Remaining Photos (if available) */}
              {currentProfile.photos.length > 3 &&
                currentProfile.photos.slice(3).map((photo, idx) => (
                  <View key={idx} style={styles.secondaryPhotoContainer}>
                    <Image
                      source={{uri: photo}}
                      style={styles.secondaryPhoto}
                      resizeMode="cover"
                    />
                  </View>
                ))}
            </ScrollView>
          </Animated.View>
        </GestureDetector>
      </View>

      {/* Like Remaining Popup */}
      {showLikePopup && (
        <View style={styles.likePopupContainer}>
          <View style={styles.likePopup}>
            <Text style={styles.likePopupText}>
              {dailyLikeInfo.remaining} likes left
            </Text>
          </View>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        {/* Pass (Cancel) Icon */}
        <Pressable
          style={[styles.actionButton, styles.passButtonContainer]}
          onPress={() => processSwipe('left')}
          disabled={!currentProfile}>
          <MaterialCommunityIcons
            name="close"
            size={32}
            color="red"
            style={{opacity: !currentProfile ? 0.5 : 1}}
          />
        </Pressable>

        {/* Like Icon (Middle, Larger) */}
        <Pressable
          style={[
            styles.actionButton,
            styles.likeButtonContainer,
            styles.largeActionButton,
          ]}
          onPress={() => processSwipe('right')}
          disabled={dailyLikeInfo.remaining <= 0}>
          <MaterialCommunityIcons
            name="heart"
            size={48}
            color="#9411fa"
            style={{opacity: dailyLikeInfo.remaining <= 0 ? 0.5 : 1}}
          />
        </Pressable>

        {/* Rewind (Back) Icon */}
        <Pressable
          style={[styles.actionButton, styles.rewindButtonContainer]}
          onPress={handleRewind}
          disabled={currentIndex === 0}>
          <MaterialCommunityIcons
            name="undo"
            size={28}
            color="#F5B900"
            style={{opacity: currentIndex === 0 ? 0.5 : 1}}
          />
        </Pressable>
      </View>

      {/* Tinder-style Match Popup */}
      <MatchPopup
        visible={matchPopup.visible}
        profileA={matchPopup.myPhoto}
        profileB={matchPopup.theirPhoto}
        onContinue={() =>
          setMatchPopup(prev => ({
            ...prev,
            visible: false,
          }))
        }
        onMessage={() => {
          const matchId = matchPopup.matchId;
          const theirId = currentProfile?.userId;
          setMatchPopup(prev => ({
            ...prev,
            visible: false,
          }));
          if (matchId && theirId) {
            navigation.navigate('ChatScreen', {matchId, theirId});
          }
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
  },
  headerLogoGradient: {
    width: 170,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogoText: {
    fontFamily: typography.fontFamilyBold,
    letterSpacing: 1,
    fontSize: 32,
    color: '#000',
  },
  headerLogoMaskWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogoGradientBackground: {
    flex: 1,
    borderRadius: 999,
  },
  headerLogoMask: {
    backgroundColor: 'transparent',
    color: '#000',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterIcon: {
    fontSize: 16,
    fontFamily: typography.fontFamilyBold,
    color: colors.textSecondary,
  },
  filterBar: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  filterLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterTitle: {
    fontFamily: typography.fontFamilyBold,
    fontSize: typography.body.large,
    color: colors.textPrimary,
  },
  filterToggle: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterToggleActive: {
    borderColor: colors.primary,
    backgroundColor: colors.secondary,
  },
  filterToggleText: {
    fontFamily: typography.fontFamilyMedium,
    fontSize: typography.body.small,
    color: colors.textSecondary,
  },
  filterToggleTextActive: {
    color: colors.primary,
  },
  presetScroll: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 24,
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
  },
  mainPhotoContainer: {
    width: '100%',
    height: CARD_HEIGHT,
  },
  scrollContent: {
    paddingBottom: 110,
  },
  mainPhoto: {
    width: '100%',
    height: '100%',
  },
  mainPhotoGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    justifyContent: 'flex-end',
    padding: spacing.xl,
    paddingBottom: 80,
  },
  mainPhotoInfo: {
    gap: 2,
  },
  mainName: {
    fontSize: 28,
    fontFamily: typography.fontFamilyBold,
    color: '#fff',
  },
  mainLocation: {
    fontSize: 16,
    fontFamily: typography.fontFamilyMedium,
    color: 'rgba(255,255,255,0.9)',
  },
  detailsSection: {
    padding: spacing.xl,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionHeader: {
    fontSize: 18,
    fontFamily: typography.fontFamilyBold,
    color: '#000',
    marginBottom: spacing.md,
  },
  bioText: {
    fontSize: 16,
    fontFamily: typography.fontFamilyRegular,
    color: '#444',
    lineHeight: 24,
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  badgeText: {
    fontSize: 14,
    fontFamily: typography.fontFamilyMedium,
    color: '#333',
  },
  secondaryPhotoContainer: {
    width: '100%',
    height: CARD_HEIGHT * 0.8,
    marginVertical: spacing.sm,
  },
  secondaryPhoto: {
    width: '100%',
    height: '100%',
  },
  intentionBadge: {
    backgroundColor: colors.secondary,
    borderColor: colors.primary,
  },
  intentionText: {
    fontSize: 15,
    fontFamily: typography.fontFamilyBold,
    color: colors.primary,
  },
  workRow: {
    gap: spacing.sm,
  },
  workText: {
    fontSize: 15,
    fontFamily: typography.fontFamilyMedium,
    color: '#555',
  },
  nextCardPlaceholder: {
    position: 'absolute',
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 24,
    overflow: 'hidden',
    transform: [{scale: 0.92}, {translateY: 0}],
    opacity: 0.6,
  },
  nextCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  interestTag: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderWidth: 1,
    borderColor: colors.surface,
  },
  interestText: {
    fontSize: typography.body.small,
    fontFamily: typography.fontFamilyMedium,
    color: colors.textInverse,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.headings.h2,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: typography.body.large,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  promptSection: {
    padding: spacing.xl,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  promptQuestion: {
    fontSize: 14,
    fontFamily: typography.fontFamilyMedium,
    color: '#666',
    marginBottom: spacing.xs,
  },
  promptAnswer: {
    fontSize: 22,
    fontFamily: typography.fontFamilyBold,
    color: colors.primary,
    lineHeight: 30,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xl,
    position: 'absolute',
    // Sitting perfectly on the border line
    bottom: -5,
    left: 0,
    right: 0,
    zIndex: 999,
  },
  actionButton: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 12,
  },
  largeActionButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 15,
  },
  rewindButtonContainer: {
    backgroundColor: '#ffffff',
  },
  passButtonContainer: {
    // No extra styles needed
  },
  likeButtonContainer: {
    // No extra styles needed
  },
  passIcon: {
    fontSize: 24,
    color: 'red',
    fontWeight: 'bold',
  },
  likeIcon: {
    fontSize: 28,
  },
  likeButtonDisabled: {
    // Moved opacity to icons so the white background stays solid
  },
  likePopupContainer: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  likePopup: {
    backgroundColor: '#ca88fd',
    borderRadius: 20,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  likePopupText: {
    color: colors.surface,
    fontFamily: typography.fontFamilyBold,
    fontSize: typography.body.large,
  },
});

export default HomeScreen;
