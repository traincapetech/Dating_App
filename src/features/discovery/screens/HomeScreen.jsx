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
} from 'react-native';
import {colors, typography, spacing} from '../../../theme';
import LinearGradient from 'react-native-linear-gradient';
import {getDiscoverProfiles} from '../../../services/profile/profileService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MatchPopup from '../../../components/profile/MatchPopup.js';
import { likeUser, passUser } from '../../../services/swipeActions';

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

  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const [matchPopup, setMatchPopup] = useState({
    visible: false,
    myPhoto: null,
    theirPhoto: null,
    matchId: null,
  });

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
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

    const likedUserId = currentProfile.userId;
    const myPhoto = profiles[currentIndex]?.photos?.[0];
    const theirPhoto = currentProfile.photos?.[0];

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
      likeUser(currentUserId, likedUserId)
        .then(result => {
          if (result?.isMatch && result?.match) {
            setMatchPopup({
              visible: true,
              myPhoto,
              theirPhoto,
              matchId: result.match._id,
            });
          }
        })
        .catch(err => console.error('Like error:', err));
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
    <View style={styles.container}>
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

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <Pressable
          style={[styles.actionButton, styles.passButton]}
          onPress={() => processSwipe('left')}>
          <Text style={styles.actionButtonText}>✕</Text>
        </Pressable>
        <Pressable
          style={[styles.actionButton, styles.likeButton]}
          onPress={() => processSwipe('right')}>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  actionButtonText: {
    fontSize: 28,
    color: '#FF6B6B',
  },
});

export default HomeScreen;
