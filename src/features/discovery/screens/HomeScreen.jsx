import React, {useState, useEffect, useCallback} from 'react';
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
  FlatList,
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
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';
import {colors, typography, spacing} from '../../../theme';
import LinearGradient from 'react-native-linear-gradient';
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
import {useInitialLoad} from '../../../context/InitialLoadContext';
import FullScreenLoader from '../../../components/layout/FullScreenLoader';
import {usePhotoSocial} from '../../../hooks/usePhotoSocial';
import {photoSocialService} from '../../../services/photoSocialService';
import PhotoInteractionViewer from '../../../components/profile/PhotoInteractionViewer';
import {useAuth} from '../../../context/AuthContext';
import {triggerMediumHaptic} from '../../../utils/haptics';
import ThemeBackground from '../../../components/layout/ThemeBackground';


const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - spacing.xl * 2;
const CARD_HEIGHT = SCREEN_HEIGHT * 0.70;
const SWIPE_THRESHOLD = 120;

// ─── Utility ──────────────────────────────────────────────────────────────────

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  if (Math.abs(lat1) < 0.0001 && Math.abs(lon1) < 0.0001) return null;
  if (Math.abs(lat2) < 0.0001 && Math.abs(lon2) < 0.0001) return null;
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

const deg2rad = deg => deg * (Math.PI / 180);

// Easing worklets for react-native-reanimated withTiming
const easeOut = t => {
  'worklet';
  return 1 - (1 - t) * (1 - t);
};
const easeIn = t => {
  'worklet';
  return t * t;
};

// ─── ProfileModal ──────────────────────────────────────────────────────────────

const ProfileModal = ({
  visible,
  profile,
  onClose,
  currentLocation,
  currentUserId,
  navigation,
}) => {
  // Animation values
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  // 📸 Social Interaction Engagement for Modal
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [viewerVisible, setViewerVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      backdropOpacity.value = withTiming(1, {duration: 300, easing: easeOut});
      translateY.value = withSpring(0, {
        damping: 22,
        stiffness: 200,
        mass: 0.8,
      });
    } else {
      backdropOpacity.value = withTiming(0, {duration: 250});
      translateY.value = withTiming(SCREEN_HEIGHT, {
        duration: 300,
        easing: easeIn,
      });
    }
  }, [visible]);

  const modalAnimStyle = useAnimatedStyle(() => ({
    transform: [{translateY: translateY.value}],
  }));

  const backdropAnimStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  // 📝 DRAG TO CLOSE LOGIC
  const panGesture = Gesture.Pan()
    .onUpdate(event => {
      // Only allow dragging down
      if (event.translationY > 0) {
        translateY.value = event.translationY;
      }
    })
    .onEnd(event => {
      if (event.translationY > 150 || event.velocityY > 1000) {
        // Dragged enough or flicked fast -> CLOSE
        runOnJS(onClose)();
      } else {
        // Return to top
        translateY.value = withSpring(0, {damping: 20, stiffness: 150});
      }
    });

  if (!profile) return null;

  // Distance display logic
  const getDistanceLabel = () => {
    let dist = profile.distance ? parseFloat(profile.distance) : null;
    if (
      dist === null &&
      currentLocation &&
      !isNaN(profile.latitude) &&
      !isNaN(profile.longitude)
    ) {
      dist = calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        profile.latitude,
        profile.longitude,
      );
    }
    if (dist !== null && dist > 0) {
      return dist > 1000 ? 'Far away' : `${dist} km away`;
    }
    return null;
  };

  const locationStr = profile.city || profile.location || '';
  const isCoordinates = /^\s*[-+]?\d+(\.\d+)?\s*,\s*[-+]?\d+(\.\d+)?\s*$/.test(
    locationStr,
  );
  const displayLocation = isCoordinates ? profile.city || '' : locationStr;
  const distanceLabel = getDistanceLabel();
  let finalLocation = '';
  if (displayLocation) {
    finalLocation = displayLocation;
    if (distanceLabel) finalLocation += ` • ${distanceLabel}`;
  } else if (distanceLabel) {
    finalLocation = distanceLabel;
  }

  const allPhotos = profile.photos || [];

  // 📸 Integrated Social Engagement Hook for Home Modal
  const {photosStats, handleLike} = usePhotoSocial(profile.id || profile._id);

  const PhotoItem = ({photoUri, index}) => {
    const photoId = photoSocialService.generatePhotoId(photoUri);
    const stats = photosStats[photoId] || {
      likes: 0,
      commentsCount: 0,
      isLiked: false,
    };
    const isOwner = currentUserId === (profile.id || profile._id);

    const animatedStyle = useAnimatedStyle(() => {
      const inputOffset = index * SCREEN_HEIGHT * 0.62;
      const scale = interpolate(
        scrollY.value,
        [
          inputOffset - SCREEN_HEIGHT * 0.5,
          inputOffset,
          inputOffset + SCREEN_HEIGHT * 0.5,
        ],
        [0.95, 1, 0.95],
        'clamp',
      );
      return {transform: [{scale}]};
    });

    return (
      <Animated.View style={[modalStyles.photoCard, animatedStyle]}>
        <Image
          source={{uri: photoUri}}
          style={modalStyles.modalPhoto}
          resizeMode="cover"
        />

        {/* 📸 Social Overlay Buttons */}
        <View style={modalStyles.photoInteractionOverlay}>
          <Pressable
            style={modalStyles.interactionBtn}
            onPress={() => handleLike(photoUri)}>
            <MaterialCommunityIcons
              name={stats.isLiked ? 'heart' : 'heart-outline'}
              size={24}
              color={stats.isLiked ? '#FF2D55' : '#FFF'}
            />
            {isOwner && stats.likes > 0 && (
              <Text style={modalStyles.statText}>{stats.likes}</Text>
            )}
          </Pressable>

          <Pressable
            style={modalStyles.interactionBtn}
            onPress={() => {
              setSelectedPhoto(photoUri);
              setViewerVisible(true);
            }}>
            <MaterialCommunityIcons
              name="chat-processing-outline"
              size={24}
              color="#FFF"
            />
            {isOwner && stats.commentsCount > 0 && (
              <Text style={modalStyles.statText}>{stats.commentsCount}</Text>
            )}
          </Pressable>
        </View>
      </Animated.View>
    );
  };

  const InfoChip = ({icon, label}) =>
    label ? (
      <View style={modalStyles.chip}>
        <Text style={modalStyles.chipText}>
          {icon} {label}
        </Text>
      </View>
    ) : null;

  const scrollY = useSharedValue(0);
  const onScroll = event => {
    scrollY.value = event.nativeEvent.contentOffset.y;
  };

  const headerStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, SCREEN_HEIGHT * 0.4, SCREEN_HEIGHT * 0.5],
      [0, 0, 1],
    );
    return {opacity};
  });

  const photoSnapOffsets = allPhotos.map((_, i) => i * SCREEN_HEIGHT * 0.58);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}>
      {/* Backdrop */}
      <Animated.View style={[modalStyles.backdrop, backdropAnimStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View style={[modalStyles.sheet, modalAnimStyle]}>
        {/* Drag handle area (replaces pill / header for swipe-down) */}
        <GestureDetector gesture={panGesture}>
          <View style={modalStyles.gestureArea}>
            {/* Sticky Header Overlay */}
            <Animated.View style={[modalStyles.stickyHeader, headerStyle]}>
              <Text style={modalStyles.stickyHeaderText}>
                {profile.name}
                {profile.age ? `, ${profile.age}` : ''}
              </Text>
            </Animated.View>

            {/* Close pill */}
            <View style={modalStyles.pillWrapper}>
              <View style={modalStyles.pill} />
            </View>
          </View>
        </GestureDetector>

        <ScrollView
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          decelerationRate="fast"
          disableIntervalMomentum={true}
          bounces={false}
          overScrollMode="never"
          contentContainerStyle={modalStyles.scrollContent}>
          <Pressable style={{flex: 1}}>
            {/* ── Images ── */}
            <View style={modalStyles.imagesContainer}>
              <FlatList
                data={allPhotos}
                keyExtractor={(_, i) => `photo-${i}`}
                renderItem={({item, index}) => (
                  <PhotoItem photoUri={item} index={index} />
                )}
                scrollEnabled={false}
                pagingEnabled={false}
                ItemSeparatorComponent={() => <View style={{height: 12}} />}
              />
              {/* Overlay for first image info */}
              <View style={modalStyles.headerInfoCard}>
                <View style={modalStyles.headerInfoContent}>
                  {profile.isMostCompatible && (
                    <View style={modalStyles.compatibleBadge}>
                      <MaterialCommunityIcons
                        name="star"
                        size={12}
                        color="#FFF"
                      />
                      <Text style={modalStyles.compatibleText}>
                        MOST COMPATIBLE
                      </Text>
                    </View>
                  )}
                  <View style={modalStyles.nameRow}>
                    <Text style={modalStyles.modalName}>
                      {profile.name}
                      {profile.age ? `, ${profile.age}` : ''}
                    </Text>
                    {profile.matchPercentage ? (
                      <LinearGradient
                        colors={['#9411FA', '#E040C8']}
                        start={{x: 0, y: 0}}
                        end={{x: 1, y: 0}}
                        style={modalStyles.matchPercentageBadge}>
                        <Text style={modalStyles.matchPercentageText}>
                          {profile.matchPercentage}%
                        </Text>
                      </LinearGradient>
                    ) : null}
                  </View>
                  {profile.jobTitle ? (
                    <Text style={modalStyles.modalJobTitle}>
                      💼 {profile.jobTitle}
                    </Text>
                  ) : null}
                  {finalLocation ? (
                    <Text style={modalStyles.modalLocation}>
                      📍 {finalLocation}
                    </Text>
                  ) : null}
                </View>
              </View>
            </View>

            {/* ── Details Container ── */}
            <View style={modalStyles.detailsContainer}>
              {/* Personal Info */}
              {profile.height ||
              profile.gender ||
              profile.drink ||
              profile.religion ||
              profile.politics ? (
                <View style={modalStyles.profileSectionCard}>
                  <Text style={modalStyles.sectionLabel}>Personal Info</Text>
                  <View style={modalStyles.chipsRow}>
                    <InfoChip
                      icon="📏"
                      label={
                        profile.height
                          ? `${profile.height}${
                              profile.height.includes('cm') ? '' : ' cm'
                            }`
                          : null
                      }
                    />
                    <InfoChip icon="👤" label={profile.gender} />
                    <InfoChip
                      icon="🍷"
                      label={
                        profile.drink && profile.drink !== 'No'
                          ? profile.drink
                          : null
                      }
                    />
                    <InfoChip icon="⛪" label={profile.religion} />
                    <InfoChip icon="⚖️" label={profile.politics} />
                  </View>
                </View>
              ) : null}

              {/* Bio */}
              {profile.bio ? (
                <View style={modalStyles.profileSectionCard}>
                  <Text style={modalStyles.sectionLabel}>About</Text>
                  <Text style={modalStyles.bioText}>{profile.bio}</Text>
                </View>
              ) : null}

              {/* Looking For */}
              {profile.datingIntention || profile.relationshipType ? (
                <View style={modalStyles.profileSectionCard}>
                  <Text style={modalStyles.sectionLabel}>Looking For</Text>
                  <View style={modalStyles.intentionChip}>
                    <Text style={modalStyles.intentionText}>
                      {profile.datingIntention || profile.relationshipType}
                    </Text>
                  </View>
                </View>
              ) : null}

              {/* Interests */}
              {profile.interests && profile.interests.length > 0 ? (
                <View style={modalStyles.profileSectionCard}>
                  <Text style={modalStyles.sectionLabel}>Interests</Text>
                  <View style={modalStyles.tagsRow}>
                    {profile.interests.map((interest, i) => (
                      <View key={i} style={modalStyles.interestTag}>
                        <Text style={modalStyles.interestTagText}>
                          {interest}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              {/* Prompts */}
              {profile.prompts &&
                profile.prompts.length > 0 &&
                profile.prompts.map((prompt, i) =>
                  prompt && prompt.answer ? (
                    <View key={i} style={modalStyles.profileSectionCard}>
                      <Text style={modalStyles.sectionLabel}>
                        {prompt.prompt || 'My thoughts'}
                      </Text>
                      <Text style={modalStyles.promptAnswer}>
                        {prompt.answer}
                      </Text>
                    </View>
                  ) : null,
                )}

              {/* Work & Education */}
              {profile.jobTitle || profile.school ? (
                <View style={modalStyles.profileSectionCard}>
                  <Text style={modalStyles.sectionLabel}>Work & Education</Text>
                  <View style={modalStyles.workEduContent}>
                    {profile.jobTitle ? (
                      <Text style={modalStyles.workText}>
                        💼 {profile.jobTitle}
                      </Text>
                    ) : null}
                    {profile.school ? (
                      <Text style={modalStyles.workText}>
                        🎓 {profile.school}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ) : null}

              {/* Bottom close button */}
              <View style={modalStyles.closeButtonWrapper}>
                <Pressable
                  style={modalStyles.closeIconButton}
                  onPress={onClose}>
                  <MaterialCommunityIcons name="close" size={24} color="#555" />
                </Pressable>
              </View>
            </View>
          </Pressable>
        </ScrollView>

        <PhotoInteractionViewer
          visible={viewerVisible}
          onClose={() => setViewerVisible(false)}
          photoUrl={selectedPhoto}
          targetUserId={profile.id || profile._id}
          currentUserId={currentUserId}
          navigation={navigation}
        />
      </Animated.View>
    </Modal>
  );
};

// ─── HomeScreen ────────────────────────────────────────────────────────────────

const HomeScreen = ({navigation}) => {
  const {setLoading: setGlobalLoading} = useLoading();
  const {profile: myProfile} = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
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
  const [modalVisible, setModalVisible] = useState(false);
  const [isProfileFocused, setIsProfileFocused] = useState(false);
  const {visited, markVisited} = useInitialLoad();

  // Auto-hide focus after inactivity
  useEffect(() => {
    let timeout;
    if (isProfileFocused) {
      timeout = setTimeout(() => {
        setIsProfileFocused(false);
      }, 3000);
    }
    return () => clearTimeout(timeout);
  }, [isProfileFocused]);

  const distancePresets = [
    {label: '1 - 10 km', value: 10},
    {label: '1 - 25 km', value: 25},
    {label: '1 - 50 km', value: 50},
    {label: '1 - 100 km', value: 100},
  ];
  const [maxDistance, setMaxDistance] = useState(distancePresets[2].value);
  const [selectedPreset, setSelectedPreset] = useState(
    distancePresets[2].value,
  );
  const [useDistanceFilter, setUseDistanceFilter] = useState(true);
  const DISTANCE_PREF_KEY = '@pryvo_distance_preferences';

  // ── Swipe animation values ──────────────────────────────────────────────────
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);
  const focusValue = useSharedValue(0);

  useEffect(() => {
    focusValue.value = withTiming(isProfileFocused ? 1 : 0, {duration: 250});
  }, [isProfileFocused]);

  const [matchPopup, setMatchPopup] = useState({
    visible: false,
    myPhoto: null,
    theirPhoto: null,
    theirName: '',
    theirAge: null,
    matchId: null,
  });

  // ── Initialization ──────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      let loc = null;
      try {
        loc = await getCurrentLocation();
        if (loc) setCurrentLocation(loc);
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

    const locationWatcher = watchLocation(
      async location => {
        setCurrentLocation(location);
        const prefs = await loadDistancePrefs();
        await loadProfiles(
          prefs?.distance,
          prefs?.enabled ?? useDistanceFilter,
          location,
          true,
        );
      },
      {
        distanceFilter: 1000,
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      },
    );

    return () => {
      locationWatcher.stop();
    };
  }, []);

  // ── Geocoding ───────────────────────────────────────────────────────────────
  const geocodeProfile = useCallback(
    async index => {
      const profile = profiles[index];
      if (!profile || profile.cityGeocoded) return;
      const lat = profile.latitude;
      const lng = profile.longitude;
      if (lat && lng) {
        const isCoordinates =
          /^\s*[-+]?\d+(\.\d+)?\s*,\s*[-+]?\d+(\.\d+)?\s*$/.test(
            profile.location || '',
          );
        if (isCoordinates || !profile.city || profile.city === '') {
          const city = await reverseGeocode(lat, lng);
          setProfiles(prev => {
            const next = [...prev];
            if (next[index] && next[index].id === profile.id) {
              next[index] = {
                ...next[index],
                city: city || '',
                cityGeocoded: true,
              };
            }
            return next;
          });
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
      [currentIndex, currentIndex + 1, currentIndex + 2].forEach(idx => {
        if (profiles[idx]) geocodeProfile(idx);
      });
    }
  }, [currentIndex, profiles.length, geocodeProfile]);

  // ── Daily Like Info ─────────────────────────────────────────────────────────
  const loadDailyLikeInfo = useCallback(async () => {
    try {
      const userData = await AsyncStorage.getItem('@pryvo_user');
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

  // ── Load Profiles ───────────────────────────────────────────────────────────
  const loadProfiles = useCallback(
    async (
      distanceOverride = null,
      distanceEnabled = useDistanceFilter,
      userLocationOverride = null,
      silent = false,
    ) => {
      try {
        setLoadingLocal(silent ? false : true);
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

        let advancedFilters = null;
        try {
          const savedFilters = await AsyncStorage.getItem(
            '@pryvo_advanced_filters',
          );
          if (savedFilters && savedFilters !== 'undefined') {
            const parsed = JSON.parse(savedFilters);
            const activeFilters = {};
            Object.keys(parsed).forEach(key => {
              if (parsed[key] !== null && parsed[key] !== undefined) {
                activeFilters[key] = parsed[key];
              }
            });
            if (Object.keys(activeFilters).length > 0)
              advancedFilters = activeFilters;
          }
        } catch (error) {
          console.error('Error loading advanced filters:', error);
        }

        const response = await getDiscoverProfiles(excludeUserId, {
          useMatching: true,
          sortBy: 'score',
          minScore: 0,
          maxDistance:
            distanceEnabled && (distanceOverride || maxDistance)
              ? distanceOverride || maxDistance
              : undefined,
          filters: advancedFilters,
        });

        const userLoc = userLocationOverride || currentLocation;

        if (response?.profiles) {
          const transformedProfiles = response.profiles
            .map(profile => {
              let distance = null;
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
                let d = parseFloat(profile.distance);
                if (d > 500) d = d / 1000;
                distance = Math.round(d);
              }

              return {
                id: profile.userId || profile.id,
                userId: profile.userId,
                name: profile.name || profile.basicInfo?.firstName || 'Unknown',
                age:
                  profile.basicInfo?.age ||
                  profile.personalDetails?.age ||
                  profile.age ||
                  null,
                distance: distance !== null ? `${distance}` : null,
                bio: profile.bio || '',
                interests: profile.interests || [],
                photos: profile.photos || [],
                matchPercentage: profile.matchScore
                  ? Math.round(profile.matchScore)
                  : profile.matchPercentage || null,
                matchScore: profile.matchScore || null,
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
                prompts: [
                  profile.profilePrompts?.aboutMe,
                  profile.profilePrompts?.selfCare,
                  profile.profilePrompts?.gettingPersonal,
                ].filter(p => p && p.answer),
                isMostCompatible: profile.isMostCompatible || false,
              };
            })
            .filter(profile => profile.photos && profile.photos.length > 0);

          setProfiles(transformedProfiles);
          setCurrentIndex(0);
        } else {
          setProfiles([]);
          setCurrentIndex(0);
        }
      } catch (error) {
        console.error('Error loading profiles:', error);
        Alert.alert('Error', 'Failed to load profiles. Please try again.');
      } finally {
        setLoadingLocal(false);
        if (!visited.home) {
          markVisited('home');
        }
      }
    },
    [maxDistance, useDistanceFilter, currentLocation],
  );

  // ── Distance Prefs ──────────────────────────────────────────────────────────
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

  // ─ Unused distance handlers kept for compatibility ─
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

  // ── Swipe logic (unchanged) ─────────────────────────────────────────────────
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
    runOnJS(setIsProfileFocused)(false);
  };

  const processSwipe = async direction => {
    if (!currentProfile || !currentUserId) return;

    if (direction === 'right' && dailyLikeInfo.remaining <= 0) {
      Alert.alert(
        'Daily Like Limit Reached',
        `You've reached your daily like limit of ${dailyLikeInfo.limit}. Come back tomorrow for more likes!`,
        [{text: 'OK'}],
      );
      return;
    }

    const likedUserId = currentProfile.userId;
    const theirPhoto = currentProfile.photos?.[0];

    // Get MY photo from AuthContext profile
    const myPhoto =
      myProfile?.media?.media?.[0]?.url || myProfile?.photos?.[0] || null;

    if (direction === 'right') {
      const newSwipeCount = swipeCount + 1;
      setSwipeCount(newSwipeCount);
      if (newSwipeCount % 10 === 0) {
        setShowLikePopup(true);
        setTimeout(() => setShowLikePopup(false), 2000);
      }
    }

    // 🔥 Haptic feedback on swipe
    try {
      const {
        triggerHeavyHaptic,
        triggerSuccessHaptic,
      } = require('../../../utils/haptics');
      triggerHeavyHaptic();
    } catch (e) {}

    translateX.value = withTiming(
      direction === 'right' ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5,
      {duration: 250},
    );
    opacity.value = withTiming(0, {duration: 250}, () => {
      runOnJS(goToNextProfile)();
    });

    if (direction === 'right') {
      likeUser(currentUserId, likedUserId, dailyLikeInfo.isPremium)
        .then(result => {
          let updatedInfo;
          if (result?.dailyLikeInfo) {
            updatedInfo = result.dailyLikeInfo;
            setDailyLikeInfo(updatedInfo);
          } else {
            updatedInfo = {
              ...dailyLikeInfo,
              count: dailyLikeInfo.count + 1,
              remaining: Math.max(0, dailyLikeInfo.remaining - 1),
            };
            setDailyLikeInfo(updatedInfo);
          }
          if (result?.isMatch && result?.match) {
            // 🔥 Match success haptic!
            try {
              const {triggerSuccessHaptic} = require('../../../utils/haptics');
              triggerSuccessHaptic();
            } catch (e) {}

            setMatchPopup({
              visible: true,
              myPhoto,
              theirPhoto,
              theirName: currentProfile.name,
              theirAge: currentProfile.age,
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
                "You've reached your daily like limit. Come back tomorrow!",
              [{text: 'OK'}],
            );
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
    runOnJS(setIsProfileFocused)(false);
  };

  // ✨ Haptic feedback state for gesture threshold
  const hasTriggeredHaptic = useSharedValue(false);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate(event => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;

      // 📳 Trigger haptic when crossing the swipe threshold
      const absX = Math.abs(event.translationX);
      if (absX >= SWIPE_THRESHOLD && !hasTriggeredHaptic.value) {
        hasTriggeredHaptic.value = true;
        runOnJS(triggerMediumHaptic)();
      } else if (absX < SWIPE_THRESHOLD && hasTriggeredHaptic.value) {
        // Reset if they pull back
        hasTriggeredHaptic.value = false;
      }
    })
    .onEnd(event => {
      hasTriggeredHaptic.value = false; // Reset for next gesture
      
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

  // Tap gesture: opens profile modal — composed with pan so they don't conflict
  const tapGesture = Gesture.Tap()
    .maxDuration(300)
    .onEnd(() => {
      runOnJS(setIsProfileFocused)(!isProfileFocused);
    });

  // Pan has priority; tap only fires when no pan movement detected
  const gesture = Gesture.Exclusive(panGesture, tapGesture);

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
        {rotate},
      ],
      opacity: opacity.value,
    };
  });

  const focusOverlayStyle = useAnimatedStyle(() => ({
    opacity: focusValue.value,
    transform: [{scale: interpolate(focusValue.value, [0, 1], [0.9, 1])}],
  }));

  useFocusEffect(
    useCallback(() => {
      loadDailyLikeInfo();
    }, [loadDailyLikeInfo]),
  );

  // ── Shared header ───────────────────────────────────────────────────────────
  const renderHeader = () => {
    const userPhoto =
      myProfile?.media?.media?.[0]?.url || myProfile?.photos?.[0];

    return (
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.navigate('User')}
          style={[styles.avatarButton, {borderColor: colors.primary}]}>
          {userPhoto ? (
            <Image source={{uri: userPhoto}} style={styles.avatarImage} />
          ) : (
            <MaterialCommunityIcons name="account" size={24} color="#CCC" />
          )}
        </Pressable>

        <Text className="text-4xl font-mona-sans-semibold tracking-[2px] text-black">
          Pryvo
        </Text>

        <View style={styles.headerRight}>
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
    );
  };

  // ── Swipe Feedbacks Overlays ────────────────────────────────────────────────
  const likeOverlayStyle = useAnimatedStyle(() => {
    const opacityVal = interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD * 0.2, SWIPE_THRESHOLD],
      [0, 0, 1],
      'clamp',
    );
    const scaleVal = interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD],
      [0.9, 1.05],
      'clamp',
    );
    const transX = interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD],
      [60, 0],
      'clamp',
    );
    return {
      opacity: opacityVal,
      transform: [{scale: scaleVal}, {translateX: transX}],
    };
  });

  const rejectOverlayStyle = useAnimatedStyle(() => {
    const opacityVal = interpolate(
      translateX.value,
      [0, -SWIPE_THRESHOLD * 0.2, -SWIPE_THRESHOLD],
      [0, 0, 1],
      'clamp',
    );
    const scaleVal = interpolate(
      translateX.value,
      [0, -SWIPE_THRESHOLD],
      [0.9, 1.05],
      'clamp',
    );
    const transX = interpolate(
      translateX.value,
      [0, -SWIPE_THRESHOLD],
      [-60, 0],
      'clamp',
    );
    return {
      opacity: opacityVal,
      transform: [{scale: scaleVal}, {translateX: transX}],
    };
  });

  if (loading) {
    if (!visited.home) {
      return (
        <FullScreenLoader
          visible={true}
          message="Matching vibes, not just faces…"
        />
      );
    }
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor={colors.background}
        />
        {renderHeader()}
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.emptySubtitle, {marginTop: 16}]}>
            Finding profiles for you...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Empty state (REFINED 10/10 Polish) ───────────────────────────────────────
  if (!currentProfile) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor={colors.background}
        />
        {renderHeader()}
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <LinearGradient
              colors={['#7C3AED', '#C026D3']}
              style={StyleSheet.absoluteFill}
              borderRadius={60}
            />
            <MaterialCommunityIcons
              name="creation"
              size={60}
              color="#FFF"
            />
          </View>
          

          <Text style={styles.emptyTitle}>Discovery Complete!</Text>
          <Text style={styles.emptySubtitle}>
            You've seen all the amazing people nearby. We'll find more for you soon, or you can expand your search.
          </Text>

          <View style={styles.emptyOptions}>
             <Pressable
                style={styles.refreshButton}
                onPress={async () => {
                  setProfiles([]);
                  setCurrentIndex(0);
                  translateX.value = 0;
                  translateY.value = 0;
                  opacity.value = 1;
                  if (currentUserId) {
                    try {
                      await resetPasses(currentUserId);
                      triggerMediumHaptic();
                    } catch (e) {
                      console.error('Failed to reset passes:', e);
                    }
                  }
                  await loadProfiles();
                }}>
                <LinearGradient
                  colors={['#7C3AED', '#EC4899', '#F43F5E']}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 0}}
                  style={styles.refreshButtonGradient}>
                  <Text style={styles.refreshButtonText}>Refresh Discover</Text>
                </LinearGradient>
              </Pressable>

              <Pressable 
                onPress={() => navigation.navigate('AdvancedFilters')}
                style={styles.adjustFilterButton}>
                 <Text style={styles.adjustFilterText}>Adjust Filters</Text>
              </Pressable>
          </View>

          <View style={styles.discoveryTipCard}>
             <MaterialCommunityIcons name="lightbulb-on-outline" size={24} color="#7C3AED" />
             <View style={styles.tipTextContainer}>
                <Text style={styles.tipTitle}>Pro Tip</Text>
                <Text style={styles.tipDescription}>
                  Users who update their bio get 3x more matches. Why not polish yours while we find more people?
                </Text>
             </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── Distance label for card ─────────────────────────────────────────────────
  const getCardDistanceLabel = () => {
    let dist = currentProfile.distance
      ? parseFloat(currentProfile.distance)
      : null;
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
    const locationStr = currentProfile.city || currentProfile.location || '';
    const isCoordinates =
      /^\s*[-+]?\d+(\.\d+)?\s*,\s*[-+]?\d+(\.\d+)?\s*$/.test(locationStr);
    const displayLocation = isCoordinates
      ? currentProfile.city || ''
      : locationStr;
    const distLabel =
      dist !== null && dist > 0
        ? dist > 1000
          ? 'Far away'
          : `${dist} km away`
        : null;
    let final = '';
    if (displayLocation) {
      final = displayLocation;
      if (distLabel) final += ` • ${distLabel}`;
    } else if (distLabel) {
      final = distLabel;
    }
    return final;
  };

  const cardLocationLabel = getCardDistanceLabel();

  // ── Main render ─────────────────────────────────────────────────────────────
  return (
    <ThemeBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {renderHeader()}

      {/* Swipe Overlay Icons */}
      <Animated.View
        pointerEvents="none"
        style={[styles.swipeOverlay, styles.likeOverlay, likeOverlayStyle]}>
        <View style={styles.overlayIconWrapper}>
          <MaterialCommunityIcons name="heart" size={50} color="#00FFCA" />
        </View>
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[styles.swipeOverlay, styles.rejectOverlay, rejectOverlayStyle]}>
        <View style={styles.overlayIconWrapper}>
          <MaterialCommunityIcons name="close" size={50} color="#FF2D55" />
        </View>
      </Animated.View>

      {/* Card Stack */}
      <View style={styles.cardContainer}>
        {/* Next card (background preview) */}
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

        {/* Current swipeable card — tap opens modal, swipe triggers like/dislike */}
        <GestureDetector gesture={gesture}>
          <Animated.View style={[styles.card, animatedStyle]}>
            {/* Full-bleed first photo only */}
            <Image
              source={{uri: currentProfile.photos[0]}}
              style={styles.cardPhoto}
              resizeMode="cover"
            />

            {/* Badges */}
            {currentProfile.isMostCompatible && (
              <View style={styles.mostCompatibleBadge}>
                <MaterialCommunityIcons name="star" size={13} color="#FFF" />
                <Text style={styles.mostCompatibleText}>MOST COMPATIBLE</Text>
              </View>
            )}
            {currentProfile.matchPercentage && (
              <View style={styles.matchScoreBadge}>
                <Text style={styles.matchScoreText}>
                  {currentProfile.matchPercentage}% Match
                </Text>
              </View>
            )}

            {/* Tap-to-reveal focal button overlay */}
            <Animated.View
              style={[styles.focusOverlay, focusOverlayStyle]}
              pointerEvents={isProfileFocused ? 'auto' : 'none'}>
              <Pressable
                style={styles.viewProfileButton}
                onPress={() => {
                  setModalVisible(true);
                  setIsProfileFocused(false);
                }}>
                <Text style={styles.viewProfileButtonText}>View Profile</Text>
              </Pressable>
            </Animated.View>

            {/* Gradient info overlay */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.85)']}
              locations={[0.45, 0.72, 1]}
              style={styles.cardGradient}>
              <View style={styles.cardInfo}>
                {/* Name + age */}
                <Text style={styles.cardName}>
                  {currentProfile.name}
                  {currentProfile.age ? `, ${currentProfile.age}` : ''}
                </Text>

                {/* Short bio — 1 line */}
                {currentProfile.bio ? (
                  <Text
                    style={styles.cardBio}
                    numberOfLines={1}
                    ellipsizeMode="tail">
                    {currentProfile.bio}
                  </Text>
                ) : null}

                {/* Location */}
                {cardLocationLabel ? (
                  <Text style={styles.cardLocation}>
                    📍 {cardLocationLabel}
                  </Text>
                ) : null}
              </View>
            </LinearGradient>
          </Animated.View>
        </GestureDetector>
        {/* Floating Rewind Button - anchored to the card corner */}
        <Pressable
          style={styles.cardRewindButton}
          onPress={handleRewind}
          disabled={currentIndex === 0}>
          <MaterialCommunityIcons
            name="undo-variant"
            size={28}
            color="#F5B900"
            style={{opacity: currentIndex === 0 ? 0.4 : 1}}
          />
        </Pressable>
      </View>

      {/* Like Remaining Popup */}
      {showLikePopup && (
        <View style={styles.likePopupContainer}>
          <LinearGradient
            colors={['#9411FA', '#E040C8']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 0}}
            style={styles.likePopup}>
            <Text style={styles.likePopupText}>
              {dailyLikeInfo.remaining} likes left
            </Text>
          </LinearGradient>
        </View>
      )}


      {/* Match Popup */}
      <MatchPopup
        visible={matchPopup.visible}
        myPhoto={matchPopup.myPhoto}
        theirPhoto={matchPopup.theirPhoto}
        theirName={matchPopup.theirName}
        onContinue={() => setMatchPopup(prev => ({...prev, visible: false}))}
        onMessage={() => {
          const {matchId, theirName, theirPhoto, theirAge} = matchPopup;
          const theirId = currentProfile?.userId;
          setMatchPopup(prev => ({...prev, visible: false}));
          if (matchId && theirId) {
            navigation.navigate('ChatScreen', {
              matchId,
              theirId,
              theirName,
              theirPhoto,
              theirAge,
            });
          }
        }}
      />

      {/* Full-Screen Profile Modal */}
      <ProfileModal
        visible={modalVisible}
        profile={currentProfile}
        onClose={() => setModalVisible(false)}
        currentLocation={currentLocation}
        currentUserId={currentUserId}
        navigation={navigation}
      />
      </SafeAreaView>
    </ThemeBackground>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingBottom: 84, // Space for floating tab bar (64 height + 20 bottom)
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  avatarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 2,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  swipeOverlay: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.4,
    zIndex: 2000,
  },
  likeOverlay: {
    right: 40,
  },
  rejectOverlay: {
    left: 40,
  },
  overlayIconWrapper: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    // Removed shadow and elevation to prevent Android rendering artifacts during scale
  },
  cardContainer: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Card ──────────────────────────────────────────────────────────────────
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#111',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 14},
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 12,
  },
  cardPhoto: {
    ...StyleSheet.absoluteFillObject,
  },
  cardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 80,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  cardInfo: {
    gap: 4,
  },
  cardName: {
    fontSize: 30,
    fontFamily: typography.fontFamilyBold,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 4,
  },
  cardBio: {
    fontSize: 15,
    fontFamily: typography.fontFamilyRegular,
    color: 'rgba(255,255,255,0.88)',
    marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 3,
  },
  cardLocation: {
    fontSize: 13,
    fontFamily: typography.fontFamilyMedium,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  mostCompatibleBadge: {
    position: 'absolute',
    top: 18,
    left: 18,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366F1',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
    zIndex: 10,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  mostCompatibleText: {
    color: '#FFF',
    fontSize: 11,
    fontFamily: typography.fontFamilyBold,
    letterSpacing: 0.5,
  },
  matchScoreBadge: {
    position: 'absolute',
    top: 18,
    right: 18,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    zIndex: 10,
  },
  matchScoreText: {
    color: '#FFF',
    fontSize: 12,
    fontFamily: typography.fontFamilyBold,
  },
  expandHint: {
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderColor: 'rgba(255,255,255,0.25)',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    zIndex: 10,
  },
  expandHintText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontFamily: typography.fontFamilyMedium,
  },
  nextCardPlaceholder: {
    position: 'absolute',
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 24,
    overflow: 'hidden',
    transform: [{scale: 0.92}],
    opacity: 0.6,
  },
  mainPhoto: {
    width: '100%',
    height: '100%',
  },
  nextCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },

  // ── Empty / Loading ───────────────────────────────────────────────────────
  emptyContainer: {
    flex: 1,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  emptyIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  emptyTitle: {
    fontSize: 28,
    fontFamily: typography.fontFamilyBold,
    color: '#000',
    textAlign: 'center',
    marginBottom: 16,
  },
  emptySubtitle: {
    fontSize: 16,
    fontFamily: typography.fontFamilyMedium,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  emptyOptions: {
    width: '100%',
    gap: 16,
  },
  refreshButton: {
    width: '100%',
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
  },
  refreshButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontFamily: typography.fontFamilyBold,
  },
  adjustFilterButton: {
    width: '100%',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discoveryTipCard: {
    marginTop: 40,
    padding: 20,
    backgroundColor: '#FAFAFA',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    borderWidth: 1,
    borderColor: '#F1F1F1',
  },
  tipTextContainer: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 16,
    fontFamily: typography.fontFamilyBold,
    color: '#000',
    marginBottom: 4,
  },
  tipDescription: {
    fontSize: 13,
    fontFamily: typography.fontFamilyRegular,
    color: '#666',
    lineHeight: 18,
  },

  // ── Floating ──────────────────────────────────────────────────────────────
  cardRewindButton: {
    position: 'absolute',
    bottom: (SCREEN_HEIGHT - (100 + CARD_HEIGHT + 84)) / 2 + 10, // Dynamic centering offset + small pad
    right: (SCREEN_WIDTH - CARD_WIDTH) / 2 + 10,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
    zIndex: 3000,
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
    borderRadius: 20,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  likePopupText: {
    color: '#FFF',
    fontFamily: typography.fontFamilyBold,
    fontSize: typography.body.large,
  },
  focusOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  viewProfileButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 100,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  viewProfileButtonText: {
    fontSize: 15,
    fontFamily: typography.fontFamilyBold,
    color: '#111',
  },
});

// ─── Modal Styles ──────────────────────────────────────────────────────────────

const modalStyles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.93,
    backgroundColor: '#F8F9FA',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
  },
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: 'rgba(255,255,255,0.95)',
    zIndex: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F1F1',
  },
  stickyHeaderText: {
    color: '#111',
    fontSize: 16,
    fontFamily: typography.fontFamilyBold,
  },
  pillWrapper: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
    zIndex: 10,
    backgroundColor: '#F8F9FA',
  },
  gestureArea: {
    width: '100%',
    paddingTop: 12,
    paddingBottom: 20,
    zIndex: 30,
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  pill: {
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E5E7EB',
  },

  // Images
  imagesContainer: {
    paddingTop: 4,
  },
  photoCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    height: SCREEN_HEIGHT * 0.62,
    backgroundColor: '#FFF',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  modalPhoto: {
    width: '100%',
    height: '100%',
  },
  photoInteractionOverlay: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    gap: 15,
  },
  interactionBtn: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  statText: {
    color: '#FFF',
    fontSize: 12,
    marginTop: 2,
    fontFamily: typography.fontFamilyBold,
  },

  // Header Info Card (Floating over bottom of images)
  headerInfoCard: {
    marginTop: 16,
    marginHorizontal: 16,
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  headerInfoContent: {
    gap: 8,
  },
  compatibleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366F1',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
    gap: 4,
    marginBottom: 4,
  },
  compatibleText: {
    color: '#FFF',
    fontSize: 10,
    fontFamily: typography.fontFamilyBold,
    letterSpacing: 0.5,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalName: {
    fontSize: 28,
    fontFamily: typography.fontFamilyBold,
    color: '#111',
  },
  matchPercentageBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
  },
  matchPercentageText: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: typography.fontFamilyBold,
  },
  modalJobTitle: {
    fontSize: 16,
    fontFamily: typography.fontFamilyMedium,
    color: '#444',
  },
  modalLocation: {
    fontSize: 14,
    fontFamily: typography.fontFamilyRegular,
    color: '#666',
  },

  // Details
  scrollContent: {
    paddingTop: 12,
    paddingBottom: 40,
  },
  detailsContainer: {
    paddingHorizontal: 16,
    paddingTop: 4, // Ensures the first card (with marginTop 20) has exactly 24px total clearance from the header
    paddingBottom: 40,
  },
  profileSectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: typography.fontFamilyBold,
    color: '#9CA3AF',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  bioText: {
    fontSize: 16,
    fontFamily: typography.fontFamilyRegular,
    color: '#222',
    lineHeight: 24,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  interestTag: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  interestTagText: {
    fontSize: 14,
    fontFamily: typography.fontFamilyMedium,
    color: '#374151',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#F1F1F1',
  },
  chipText: {
    fontSize: 14,
    fontFamily: typography.fontFamilyMedium,
    color: '#4B5563',
  },
  intentionChip: {
    backgroundColor: '#FDF2F8',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#FCE7F3',
  },
  intentionText: {
    fontSize: 15,
    fontFamily: typography.fontFamilyBold,
    color: '#DB2777',
  },
  promptAnswer: {
    fontSize: 20,
    fontFamily: typography.fontFamilyRegular,
    color: '#111',
    lineHeight: 28,
  },
  workEduContent: {
    gap: 6,
  },
  workText: {
    fontSize: 16,
    fontFamily: typography.fontFamilyMedium,
    color: '#333',
  },
  closeButtonWrapper: {
    marginTop: 20,
    marginBottom: 40,
    alignItems: 'center',
  },
  closeIconButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F1F1F1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
});

export default HomeScreen;
