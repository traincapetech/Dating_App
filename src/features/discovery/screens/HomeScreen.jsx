import React, {useState, useRef, useEffect, useCallback} from 'react';
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
} from '../../../services/swipeActions';
import {watchLocation} from '../../../services/location/locationService';

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
  const [selectedPreset, setSelectedPreset] = useState(
    distancePresets[2].value,
  );
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
      async location => {
        console.log('Location changed, refreshing profiles...', location);
        // Reload profiles with current distance preferences
        const prefs = await loadDistancePrefs();
        await loadProfiles(
          prefs?.distance,
          prefs?.enabled ?? useDistanceFilter,
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
    async (distanceOverride = null, distanceEnabled = useDistanceFilter) => {
      try {
        setLoading(true);

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
              // Add extra fields for detailed view
              jobTitle: profile.personalDetails?.jobTitle || '',
              school: profile.personalDetails?.school || '',
              location: profile.basicInfo?.location || '',
              gender: profile.basicInfo?.gender || '',
              height: profile.personalDetails?.height || '',
              drink: profile.lifestyle?.drink || '',
              smokeTobacco: profile.lifestyle?.smokeTobacco || '',
              smokeWeed: profile.lifestyle?.smokeWeed || '',
              religion: profile.lifestyle?.religiousBeliefs || '',
              politics: profile.lifestyle?.politicalBeliefs || '',
              datingIntention: profile.datingPreferences?.datingIntention || '',
              relationshipType:
                profile.datingPreferences?.relationshipType || '',
              // Add profile prompts
              prompts: [
                profile.profilePrompts?.aboutMe,
                profile.profilePrompts?.selfCare,
                profile.profilePrompts?.gettingPersonal,
              ].filter(p => p && p.answer),
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
    },
    [maxDistance, useDistanceFilter],
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

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const {dx, dy} = gestureState;
        // Only respond to horizontal swipes if movement is primarily horizontal
        // and exceeds a small jitter threshold (10)
        return Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.5;
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

  useFocusEffect(
    useCallback(() => {
      loadProfiles();
      loadDailyLikeInfo();
    }, [loadProfiles, loadDailyLikeInfo]),
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor={colors.background}
        />
        <View style={styles.container}>
          <View style={styles.emptyContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.emptySubtitle}>Loading profiles...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!currentProfile) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor={colors.background}
        />
        <View style={styles.container}>
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No more profiles</Text>
            <Text style={styles.emptySubtitle}>
              Check back later for more matches!
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Header with Filter Icon */}
      <View style={styles.header}>
        <View style={{width: 40}} />
        <Text style={styles.headerLogo}>Pryvo</Text>
        <Pressable
          onPress={() => navigation.navigate('AdvancedFilters')}
          style={styles.filterIconButton}>
          <Text style={styles.filterIcon}>Tune</Text>
        </Pressable>
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
          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
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
                colors={['transparent', 'rgba(0,0,0,0.7)']}
                style={styles.mainPhotoGradient}>
                <View style={styles.mainPhotoInfo}>
                  <Text style={styles.mainName}>
                    {currentProfile.name}
                    {currentProfile.age ? `, ${currentProfile.age}` : ''}
                  </Text>
                  {currentProfile.location && (
                    <Text style={styles.mainLocation}>
                      📍 {currentProfile.location}
                    </Text>
                  )}
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

            {/* Bottom Spacing */}
            <View style={{height: 100}} />
          </ScrollView>
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
      <View style={styles.actionButtons}>
        <Pressable
          style={[styles.actionButton, styles.passButtonContainer]}
          onPress={() => processSwipe('left')}>
          <Text style={styles.passIcon}>✕</Text>
        </Pressable>
        <Pressable
          style={[
            styles.actionButton,
            styles.likeButtonContainer,
            dailyLikeInfo.remaining <= 0 && styles.likeButtonDisabled,
          ]}
          onPress={() => processSwipe('right')}
          disabled={dailyLikeInfo.remaining <= 0}>
          <Text style={styles.likeIcon}>♥</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
  },
  headerLogo: {
    fontSize: 24,
    fontFamily: typography.fontFamilyBold,
    color: colors.primary,
  },
  filterIconButton: {
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
  mainPhoto: {
    width: '100%',
    height: '100%',
  },
  mainPhotoGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '30%',
    justifyContent: 'flex-end',
    padding: spacing.xl,
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
    paddingVertical: spacing.lg,
    backgroundColor: 'transparent',
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
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
  passButtonContainer: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
  },
  likeButtonContainer: {
    backgroundColor: '#FFD700', // Bumble Yellow/Gold
  },
  passIcon: {
    fontSize: 24,
    color: '#999',
    fontWeight: 'bold',
  },
  likeIcon: {
    fontSize: 28,
    color: '#fff',
  },
  likeButtonDisabled: {
    opacity: 0.5,
    backgroundColor: '#ccc',
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
