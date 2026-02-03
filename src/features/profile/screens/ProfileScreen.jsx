import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {colors, typography, spacing} from '../../../theme';
import {getProfile} from '../../../services/profile/profileService';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

const ProfileScreen = () => {
  const navigation = useNavigation();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState(null);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, []),
  );

  const loadProfile = async () => {
    try {
      if (!refreshing) setLoading(true);

      const userData = await AsyncStorage.getItem('@pryvo_user');
      let currentUserId = null;

      if (userData && userData !== 'undefined') {
        try {
          const user = JSON.parse(userData);
          currentUserId = user.id;
          setUserId(user.id);
        } catch (e) {
          console.error('Failed to parse user data in profile screen:', e);
        }
      } else {
        const token = await AsyncStorage.getItem('@pryvo/token');
        if (token && token !== 'undefined') {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            currentUserId = payload.userId || payload.id;
            setUserId(currentUserId);
          } catch (e) {
            console.error('Failed to decode token:', e);
          }
        }
      }

      if (!currentUserId) {
        return;
      }

      const response = await getProfile(currentUserId);
      const profileData = response?.profile || response;
      setProfile(profileData);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadProfile();
  };

  // Calculate profile completion percentage
  const calculateCompletion = () => {
    if (!profile) return 0;
    let score = 0;
    const total = 7;

    // Check photos
    if (profile.photos?.length > 0 || profile.media?.media?.length > 0) score++;

    // Check name (from enriched profile or basicInfo)
    if (profile.name || profile.basicInfo?.firstName) score++;

    // Check bio (from enriched profile, profilePrompts.aboutMe.answer, profilePrompts.bio, or basicInfo.bio)
    const bio =
      profile.bio ||
      profile.profilePrompts?.aboutMe?.answer ||
      profile.profilePrompts?.bio ||
      profile.basicInfo?.bio;
    if (bio && bio.trim().length > 0) score++;

    // Check interests
    const interests = profile.interests || profile.lifestyle?.interests || [];
    if (interests.length > 0) score++;

    // Check age (from enriched profile, personalDetails, or DOB)
    if (profile.age || profile.personalDetails?.age || profile.basicInfo?.dob)
      score++;

    // Check location
    if (profile.basicInfo?.location) score++;

    // Check dating preferences
    if (profile.datingPreferences?.whoToDate?.length > 0) score++;

    return Math.round((score / total) * 100);
  };

  const completionPercentage = calculateCompletion();

  // Extract profile data
  const photos =
    profile?.photos ||
    profile?.media?.media?.map(m => m.url).filter(Boolean) ||
    [];
  const firstName =
    profile?.name ||
    profile?.basicInfo?.firstName ||
    profile?.basicInfo?.name ||
    '';
  const lastName = profile?.basicInfo?.lastName || '';
  const name = firstName
    ? lastName
      ? `${firstName} ${lastName}`
      : firstName
    : 'Add Name';
  const age =
    profile?.age ||
    profile?.personalDetails?.age ||
    profile?.basicInfo?.age ||
    null;
  const bio = profile?.bio || profile?.profilePrompts?.bio || '';
  const location = profile?.basicInfo?.location || '';
  const interests = profile?.interests || profile?.lifestyle?.interests || [];

  if (loading && !refreshing) {
    return (
      <SafeAreaView
        style={[styles.container, styles.centerContent]}
        edges={['top', 'left', 'right']}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.flex}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
          />
        }>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.headerIcons}>
            <Pressable
              style={styles.iconButton}
              onPress={() => navigation.navigate('Settings')}>
              <Text style={styles.iconText}>⚙️</Text>
            </Pressable>
          </View>
        </View>

        {/* Profile Card - Main */}
        <Pressable
          style={styles.profileCard}
          onPress={() => navigation.navigate('ProfileDetails', {userId})}>
          <View style={styles.profileHeader}>
            {/* Photo */}
            <View style={styles.photoWrapper}>
              {photos.length > 0 ? (
                <Image source={{uri: photos[0]}} style={styles.profilePhoto} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Text style={styles.photoPlaceholderIcon}>👤</Text>
                </View>
              )}
              {completionPercentage < 100 && (
                <View style={styles.completionBadge}>
                  <Text style={styles.completionText}>
                    {completionPercentage}%
                  </Text>
                </View>
              )}
            </View>

            {/* Name and Info */}
            <View style={styles.profileInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.profileName}>
                  {name}
                  {age ? `, ${age}` : ''}
                </Text>
                {completionPercentage === 100 && (
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedText}>✓</Text>
                  </View>
                )}
              </View>
              {location && (
                <Text style={styles.locationText}>📍 {location}</Text>
              )}
              {bio ? (
                <Text style={styles.bioText} numberOfLines={2}>
                  {bio}
                </Text>
              ) : (
                <Text style={styles.bioPlaceholder}>
                  Add a bio to tell others about yourself
                </Text>
              )}
            </View>
          </View>

          {/* Completion Progress Bar */}
          {completionPercentage < 100 && (
            <View style={styles.progressSection}>
              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBar,
                    {width: `${completionPercentage}%`},
                  ]}
                />
              </View>
              <Pressable
                style={styles.completeButton}
                onPress={() => navigation.navigate('ProfileDetails', {userId})}>
                <Text style={styles.completeButtonText}>
                  Complete your profile
                </Text>
              </Pressable>
            </View>
          )}
        </Pressable>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Pressable
            style={styles.actionCard}
            onPress={() => navigation.navigate('ProfileDetails', {userId})}>
            <View style={styles.actionIcon}>
              <Text style={styles.actionIconText}>✏️</Text>
            </View>
            <Text style={styles.actionText}>Edit Profile</Text>
          </Pressable>
          <Pressable
            style={styles.actionCard}
            onPress={() => navigation.navigate('Settings')}>
            <View style={styles.actionIcon}>
              <Text style={styles.actionIconText}>⚙️</Text>
            </View>
            <Text style={styles.actionText}>Settings</Text>
          </Pressable>
        </View>

        {/* Profile Preview Section */}
        <View style={styles.previewSection}>
          <Text style={styles.sectionTitle}>Your Profile</Text>

          {/* Photos Preview */}
          {photos.length > 0 && (
            <View style={styles.photosPreview}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.photosScrollContent}>
                {photos.slice(0, 6).map((photo, index) => (
                  <Image
                    key={index}
                    source={{uri: photo}}
                    style={styles.previewPhoto}
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {/* Interests Preview */}
          {interests.length > 0 && (
            <View style={styles.interestsPreview}>
              <Text style={styles.previewLabel}>Interests</Text>
              <View style={styles.interestsContainer}>
                {interests.slice(0, 6).map((interest, index) => (
                  <View key={index} style={styles.interestTag}>
                    <Text style={styles.interestText}>{interest}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Empty State */}
          {photos.length === 0 && interests.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateEmoji}>📸</Text>
              <Text style={styles.emptyStateText}>
                Add photos and interests to get more matches
              </Text>
              <Pressable
                style={styles.emptyStateButton}
                onPress={() => navigation.navigate('ProfileDetails', {userId})}>
                <Text style={styles.emptyStateButtonText}>Get Started</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Help Section */}
        <Pressable
          style={styles.helpCard}
          onPress={() => navigation.navigate('HelpCentre')}>
          <Text style={styles.helpTitle}>🆘 Need Help?</Text>
          <Text style={styles.helpText}>
            Share your concern or report an issue. We're here to help.
          </Text>
        </Pressable>

        <View style={{height: spacing.xl}} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 18,
  },
  profileCard: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: 20,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  profileHeader: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  photoWrapper: {
    position: 'relative',
  },
  profilePhoto: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.backgroundSecondary,
  },
  photoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholderIcon: {
    fontSize: 36,
    color: colors.textTertiary,
  },
  completionBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.background,
  },
  completionText: {
    color: colors.textInverse,
    fontSize: 10,
    fontFamily: typography.fontFamilyBold,
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  profileName: {
    fontSize: 20,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
  },
  verifiedBadge: {
    backgroundColor: colors.success,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedText: {
    color: colors.textInverse,
    fontSize: 12,
    fontFamily: typography.fontFamilyBold,
  },
  locationText: {
    fontSize: 14,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  bioText: {
    fontSize: 14,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  bioPlaceholder: {
    fontSize: 14,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
  progressSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  completeButton: {
    backgroundColor: colors.primary,
    borderRadius: 25,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    alignSelf: 'flex-start',
  },
  completeButtonText: {
    fontSize: 14,
    fontFamily: typography.fontFamilyBold,
    color: colors.textInverse,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  actionCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  actionIconText: {
    fontSize: 20,
  },
  actionText: {
    fontSize: 12,
    fontFamily: typography.fontFamilyMedium,
    color: colors.textPrimary,
  },
  previewSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  photosPreview: {
    marginBottom: spacing.md,
  },
  photosScrollContent: {
    gap: spacing.sm,
  },
  previewPhoto: {
    width: 100,
    height: 100,
    borderRadius: 12,
    marginRight: spacing.sm,
    backgroundColor: colors.backgroundSecondary,
  },
  interestsPreview: {
    marginBottom: spacing.md,
  },
  previewLabel: {
    fontSize: 14,
    fontFamily: typography.fontFamilyMedium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  interestTag: {
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  interestText: {
    fontSize: 12,
    fontFamily: typography.fontFamilyMedium,
    color: colors.primary,
  },
  emptyState: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 16,
    padding: spacing.xl,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  emptyStateEmoji: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyStateText: {
    fontSize: 14,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  emptyStateButton: {
    backgroundColor: colors.primary,
    borderRadius: 25,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  emptyStateButtonText: {
    fontSize: 14,
    fontFamily: typography.fontFamilyBold,
    color: colors.textInverse,
  },
  helpCard: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  helpTitle: {
    fontSize: 16,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  helpText: {
    fontSize: 14,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});

export default ProfileScreen;
