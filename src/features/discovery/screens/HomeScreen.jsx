import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  Pressable,
  StatusBar,
  Animated,
  ActivityIndicator,
  Alert,
  PanResponder,
  ScrollView,
  Modal,
} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors, typography, spacing} from '../../../theme';
import LinearGradient from 'react-native-linear-gradient';
import {getDiscoverProfiles} from '../../../services/profile/profileService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MatchPopup from '../../../components/profile/MatchPopup.js';
import { likeUser, passUser, getDailyLikeInfo } from '../../../services/swipeActions';
import { watchLocation } from '../../../services/location/locationService';

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - spacing.xl * 2;
const CARD_HEIGHT = SCREEN_HEIGHT * 0.7;
const SWIPE_THRESHOLD = 120;

const HomeScreen = ({navigation}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [photoIndex, setPhotoIndex] = useState({});
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
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
  const [selectedPreset, setSelectedPreset] = useState(distancePresets[2].value);
  const [useDistanceFilter, setUseDistanceFilter] = useState(true);
  const DISTANCE_PREF_KEY = '@pryvo_distance_preferences';

  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const [matchPopup, setMatchPopup] = useState({
    visible: false,
    myPhoto: null,
    theirPhoto: null,
    matchId: null,
  });
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const init = async () => {
      const prefs = await loadDistancePrefs();
      await loadProfiles(prefs?.distance, prefs?.enabled ?? useDistanceFilter);
      await loadDailyLikeInfo();
    };
    init();

    // Watch for location changes and refresh profiles
    const locationWatcher = watchLocation(
      async (location) => {
        console.log('Location changed, refreshing profiles...', location);
        // Reload profiles with current distance preferences
        const prefs = await loadDistancePrefs();
        await loadProfiles(prefs?.distance, prefs?.enabled ?? useDistanceFilter);
      },
      {
        distanceFilter: 1000, // 1km minimum change
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      }
    );

    // Cleanup on unmount
    return () => {
      locationWatcher.stop();
    };
  }, []);

  const loadDailyLikeInfo = async () => {
    try {
      const userData = await AsyncStorage.getItem('@pryvo_user');
      if (!userData) return;
      
      const user = JSON.parse(userData);
      const info = await getDailyLikeInfo(user.id, false); // TODO: Check premium status
      if (info.success) {
        setDailyLikeInfo({
          count: info.count || 0,
          limit: info.limit || 50,
          remaining: info.remaining || 50,
          isPremium: info.isPremium || false,
        });
      }
    } catch (error) {
      console.error('Error loading daily like info:', error);
    }
  };

  const loadProfiles = async (
    distanceOverride = null,
    distanceEnabled = useDistanceFilter,
  ) => {
    try {
      setLoading(true);

      // Get current user ID
      const userData = await AsyncStorage.getItem('@pryvo_user');
      let excludeUserId = null;
      if (userData) {
        const user = JSON.parse(userData);
        excludeUserId = user.id;
        setCurrentUserId(user.id);
      }

      // Fetch profiles from backend
      const response = await getDiscoverProfiles(excludeUserId, {
        useMatching: false,
        maxDistance:
          distanceEnabled && (distanceOverride || maxDistance)
            ? distanceOverride || maxDistance
            : undefined,
        // useMatching: true,
        // minScore: 30,
        // sortBy: 'score',
      });

      console.log(
        '[HomeScreen] API Response:',
        JSON.stringify(response, null, 2),
      );

      if (response?.profiles) {
        const transformedProfiles = response.profiles
          .map(profile => ({
            id: profile.userId || profile.id,
            userId: profile.userId,
            name: profile.name || 'Unknown',
            age: profile.age || null,
            distance: profile.distance
              ? `${Math.round(profile.distance)}`
              : null,
            bio: profile.bio || '',
            interests: profile.interests || [],
            photos: profile.photos || [],
            matchPercentage: profile.matchScore
              ? Math.round(profile.matchScore)
              : null,
            matchScore: profile.matchScore || null,
          }))
          .filter(profile => profile.photos && profile.photos.length > 0);

        console.log(
          `[HomeScreen] Loaded ${transformedProfiles.length} profiles`,
        );
        setProfiles(transformedProfiles);
      } else {
        console.warn('[HomeScreen] No profiles in response:', response);
        setProfiles([]);
      }
    } catch (error) {
      console.error('Error loading profiles:', error);
      Alert.alert('Error', 'Failed to load profiles. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadDistancePrefs = async () => {
    try {
      const raw = await AsyncStorage.getItem(DISTANCE_PREF_KEY);
      if (!raw) {
        return null;
      }
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
      loadProfiles(next, useDistanceFilter);
      return next;
    });
  };

  const handleSelectPreset = value => {
    setSelectedPreset(value);
    setMaxDistance(value);
    saveDistancePrefs(value, useDistanceFilter, value);
    loadProfiles(value, useDistanceFilter);
  };

  const handleToggleDistance = () => {
    setUseDistanceFilter(prev => {
      const next = !prev;
      saveDistancePrefs(maxDistance, next, selectedPreset);
      loadProfiles(undefined, next);
      return next;
    });
  };

  const currentProfile = profiles[currentIndex];

  const resetCardPosition = () => {
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const goToNextProfile = () => {
    setCurrentIndex(prev => prev + 1);
    translateX.setValue(0);
    translateY.setValue(0);
    opacity.setValue(1);
  };

  const processSwipe = (direction) => {
    if (!currentProfile || !currentUserId) return;

    // Check daily like limit before allowing like
    if (direction === 'right' && dailyLikeInfo.remaining <= 0) {
      Alert.alert(
        'Daily Like Limit Reached',
        `You've reached your daily like limit of ${dailyLikeInfo.limit}. Come back tomorrow for more likes!`,
        [{ text: 'OK' }]
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
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: direction === 'right' ? SCREEN_WIDTH : -SCREEN_WIDTH,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      goToNextProfile();
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
              err?.message || `You've reached your daily like limit. Come back tomorrow!`,
              [{ text: 'OK' }]
            );
            // Reload daily like info
            loadDailyLikeInfo();
          }
        });
    } else {
      passUser(currentUserId, likedUserId)
        .catch(err => console.error('Pass error:', err));
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const {dx, dy} = gestureState;
        // Only respond to horizontal swipes
        return Math.abs(dx) > 5 && Math.abs(dx) > Math.abs(dy);
      },
      onPanResponderGrant: () => {
        // Stop any ongoing animations when touch starts
        translateX.stopAnimation();
        translateY.stopAnimation();
      },
      onPanResponderMove: Animated.event(
        [
          null,
          {
            dx: translateX,
            dy: translateY,
          },
        ],
        {useNativeDriver: false},
      ),
      onPanResponderRelease: (_, gestureState) => {
        const {dx, vx} = gestureState;
        // Swipe if threshold met OR velocity is high enough
        if (dx > SWIPE_THRESHOLD || vx > 0.5) {
          processSwipe('right');
        } else if (dx < -SWIPE_THRESHOLD || vx < -0.5) {
          processSwipe('left');
        } else {
          resetCardPosition();
        }
      },
    }),
  ).current;

  const rotateInterpolate = translateX.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ['-15deg', '0deg', '15deg'],
  });

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.emptySubtitle}>Loading profiles...</Text>
        </View>
      </View>
    );
  }

  if (!currentProfile) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No more profiles</Text>
          <Text style={styles.emptySubtitle}>
            Check back later for more matches!
          </Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Card Stack */}
      <View style={styles.cardContainer}>
        {/* Next card (background) */}
        {currentIndex < profiles.length - 1 &&
          profiles[currentIndex + 1]?.photos?.[0] && (
            <View style={[styles.card, styles.nextCard]}>
              <Image
                source={{uri: profiles[currentIndex + 1].photos[0]}}
                style={styles.cardImage}
                resizeMode="cover"
              />
            </View>
          )}

        {/* Current card (swipeable) */}
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.card,
            {
              transform: [
                {translateX},
                {translateY},
                {rotate: rotateInterpolate},
              ],
              opacity,
            },
          ]}>
          {currentProfile.photos && currentProfile.photos.length > 0 && (
            <Image
              source={{
                uri: currentProfile.photos[photoIndex[currentIndex] || 0],
              }}
              style={styles.cardImage}
              resizeMode="cover"
            />
          )}

          {/* Photo indicator */}
          {currentProfile.photos.length > 1 && (
            <Pressable
              style={styles.photoIndicator}
              onPress={() => {
                const currentPhotoIndex = photoIndex[currentIndex] || 0;
                const nextIndex =
                  (currentPhotoIndex + 1) % currentProfile.photos.length;
                setPhotoIndex(prev => ({
                  ...prev,
                  [currentIndex]: nextIndex,
                }));
              }}>
              {currentProfile.photos.map((_, index) => {
                const currentPhotoIndex = photoIndex[currentIndex] || 0;
                return (
                  <View
                    key={index}
                    style={[
                      styles.indicatorDot,
                      index === currentPhotoIndex && styles.indicatorDotActive,
                    ]}
                  />
                );
              })}
            </Pressable>
          )}

          {/* Gradient overlay */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.gradientOverlay}>
            <View style={styles.cardContent}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>
                  {currentProfile.name}
                  {currentProfile.age ? `, ${currentProfile.age}` : ''}
                </Text>
                {currentProfile.distance && (
                  <Text style={styles.distance}>
                    {currentProfile.distance} km away
                  </Text>
                )}
              </View>

              {currentProfile.bio && (
                <Text style={styles.bio} numberOfLines={2}>
                  {currentProfile.bio}
                </Text>
              )}

              {currentProfile.interests &&
                currentProfile.interests.length > 0 && (
                  <View style={styles.interestsContainer}>
                    {currentProfile.interests.map((interest, index) => (
                      <View key={index} style={styles.interestTag}>
                        <Text style={styles.interestText}>{interest}</Text>
                      </View>
                    ))}
                  </View>
                )}
            </View>
          </LinearGradient>
        </Animated.View>
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
      <View style={[styles.actionButtons, {paddingBottom: spacing.md}]}>
        <Pressable
          style={[styles.actionButton, styles.passButton]}
          onPress={() => processSwipe('left')}>
          <Text style={styles.actionButtonText}>✕</Text>
        </Pressable>
        <Pressable
          style={[
            styles.actionButton,
            styles.likeButton,
            dailyLikeInfo.remaining <= 0 && styles.likeButtonDisabled,
          ]}
          onPress={() => processSwipe('right')}
          disabled={dailyLikeInfo.remaining <= 0}>
          <Text style={[styles.actionButtonText, {color: '#fff'}]}>♥</Text>
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
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    shadowColor: '#DB2D0B',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
  },
  nextCard: {
    position: 'absolute',
    transform: [{scale: 0.95}],
    opacity: 0.5,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  photoIndicator: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  indicatorDot: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 2,
  },
  indicatorDotActive: {
    backgroundColor: colors.surface,
  },
  gradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '50%',
    justifyContent: 'flex-end',
    padding: spacing.xl,
  },
  cardContent: {
    gap: spacing.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  name: {
    fontSize: typography.headings.h3,
    fontFamily: typography.fontFamilyBold,
    color: colors.textInverse,
  },
  distance: {
    fontSize: typography.body.medium,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textInverse,
    opacity: 0.9,
  },
  bio: {
    fontSize: typography.body.medium,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textInverse,
    opacity: 0.9,
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
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xl * 2,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
  },
  actionButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  passButton: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: '#FF6B6B',
  },
  likeButton: {
    backgroundColor: colors.primary,
  },
  likeButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  actionButtonText: {
    fontSize: 28,
    color: '#FF6B6B',
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
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
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
