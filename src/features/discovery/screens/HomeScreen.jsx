import React, {useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  Pressable,
  StatusBar,
  Animated,
} from 'react-native';
import {colors, typography, spacing} from '../../../theme';
import LinearGradient from 'react-native-linear-gradient';

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - spacing.xl * 2;
const CARD_HEIGHT = SCREEN_HEIGHT * 0.7;
const SWIPE_THRESHOLD = 120;

const HomeScreen = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [photoIndex, setPhotoIndex] = useState({});
  
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  // Mock profiles data
  const profiles = [
    {
      id: '1',
      name: 'Emma',
      age: 25,
      distance: 2,
      bio: 'Love hiking, coffee, and good conversations ☕🏔️',
      interests: ['Travel', 'Photography', 'Yoga'],
      photos: [
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
        'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400',
      ],
    },
    {
      id: '2',
      name: 'Sophia',
      age: 27,
      distance: 5,
      bio: 'Foodie | Adventurer | Dog Mom 🐕',
      interests: ['Cooking', 'Music', 'Fitness'],
      photos: [
        'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400',
      ],
    },
    {
      id: '3',
      name: 'Olivia',
      age: 24,
      distance: 3,
      bio: 'Artist seeking someone to explore the city with 🎨',
      interests: ['Art', 'Movies', 'Dancing'],
      photos: [
        'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400',
      ],
    },
  ];

  const currentProfile = profiles[currentIndex];

  const handleSwipe = direction => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: direction === 'right' ? SCREEN_WIDTH : -SCREEN_WIDTH,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(rotate, {
        toValue: direction === 'right' ? 1 : -1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentIndex(prev => prev + 1);
      translateX.setValue(0);
      translateY.setValue(0);
      rotate.setValue(0);
      opacity.setValue(1);

      if (currentIndex >= profiles.length - 1) {
        // No more profiles
        console.log('No more profiles');
      }
    });
  };

  const rotateInterpolate = rotate.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-15deg', '0deg', '15deg'],
  });

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
      
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.headerButton}>
          <Text style={styles.headerIcon}>🔥</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Pryvo</Text>
        <Pressable style={styles.headerButton}>
          <Text style={styles.headerIcon}>💬</Text>
        </Pressable>
      </View>

      {/* Card Stack */}
      <View style={styles.cardContainer}>
        {/* Next card (background) */}
        {currentIndex < profiles.length - 1 && (
          <View style={[styles.card, styles.nextCard]}>
            <Image
              source={{uri: profiles[currentIndex + 1].photos[0]}}
              style={styles.cardImage}
              resizeMode="cover"
            />
          </View>
        )}

        {/* Current card */}
          <Animated.View
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
            <Image
              source={{uri: currentProfile.photos[photoIndex[currentIndex] || 0]}}
              style={styles.cardImage}
              resizeMode="cover"
            />
            
            {/* Photo indicator */}
            {currentProfile.photos.length > 1 && (
              <Pressable
                style={styles.photoIndicator}
                onPress={() => {
                  const currentPhotoIndex = photoIndex[currentIndex] || 0;
                  const nextIndex = (currentPhotoIndex + 1) % currentProfile.photos.length;
                  setPhotoIndex(prev => ({...prev, [currentIndex]: nextIndex}));
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
                    {currentProfile.name}, {currentProfile.age}
                  </Text>
                  <Text style={styles.distance}>
                    {currentProfile.distance} km away
                  </Text>
                </View>
                
                {currentProfile.bio && (
                  <Text style={styles.bio} numberOfLines={2}>
                    {currentProfile.bio}
                  </Text>
                )}

                {currentProfile.interests && currentProfile.interests.length > 0 && (
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
          onPress={() => handleSwipe('left')}>
          <Text style={styles.actionButtonIcon}>✕</Text>
        </Pressable>
        <Pressable
          style={[styles.actionButton, styles.superLikeButton]}>
          <Text style={styles.actionButtonIcon}>⭐</Text>
        </Pressable>
        <Pressable
          style={[styles.actionButton, styles.likeButton]}
          onPress={() => handleSwipe('right')}>
          <Text style={styles.actionButtonIcon}>♥</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIcon: {
    fontSize: 24,
  },
  headerTitle: {
    fontSize: typography.headings.h2,
    fontFamily: typography.fontFamilyBold,
    color: colors.primary,
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
    shadowColor: '#000',
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
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    gap: spacing.lg,
  },
  actionButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  passButton: {
    backgroundColor: colors.surface,
  },
  likeButton: {
    backgroundColor: colors.primary,
  },
  superLikeButton: {
    backgroundColor: colors.accent,
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  actionButtonIcon: {
    fontSize: 32,
    color: colors.surface,
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
});

export default HomeScreen;
