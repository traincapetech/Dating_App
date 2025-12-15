import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {colors, typography, spacing} from '../../../theme';
import {getProfile} from '../../../services/profile/profileService';

const ProfileScreen = () => {
  const navigation = useNavigation();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      
      // Get current user ID
      const userData = await AsyncStorage.getItem('@pryvo_user');
      let currentUserId = null;
      
      if (userData) {
        const user = JSON.parse(userData);
        currentUserId = user.id;
        setUserId(user.id);
      } else {
        // Try to get from token
        const token = await AsyncStorage.getItem('@pryvo/token');
        if (token) {
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
        Alert.alert('Error', 'User ID not found. Please sign in again.');
        return;
      }

      const response = await getProfile(currentUserId);
      console.log('[ProfileScreen] Profile response:', JSON.stringify(response, null, 2));
      
      // API returns {profile: data} or just data
      const profileData = response?.profile || response;
      
      if (!profileData) {
        Alert.alert('No Profile', 'Profile not found. Please complete your profile setup.');
        return;
      }
      setProfile(profileData);
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.emptyText}>No profile found</Text>
        <Pressable 
          style={[styles.actionButton, {marginTop: spacing.lg, paddingHorizontal: spacing.xl}]}
          onPress={() => navigation.navigate('BasicInfo')}>
          <Text style={styles.actionButtonText}>Complete Profile</Text>
        </Pressable>
      </View>
    );
  }

  // Use enriched fields from backend, with fallbacks to original structure
  const photos = profile.photos || profile.media?.media?.map(m => m.url).filter(Boolean) || [];
  
  // Build name from available fields
  const firstName = profile.name || profile.basicInfo?.firstName || profile.basicInfo?.name || '';
  const lastName = profile.basicInfo?.lastName || '';
  const name = firstName 
    ? (lastName ? `${firstName} ${lastName}` : firstName)
    : 'Complete Your Profile';
  
  const age = profile.age || profile.personalDetails?.age || profile.basicInfo?.age || null;
  const bio = profile.bio || profile.profilePrompts?.bio || profile.basicInfo?.bio || '';
  const interests = profile.interests || profile.lifestyle?.interests || [];
  
  // Get other profile details
  const location = profile.basicInfo?.location || profile.location || null;
  const occupation = profile.personalDetails?.occupation || profile.occupation || null;
  const education = profile.personalDetails?.education || profile.education || null;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Profile</Text>
        <Pressable
          style={styles.editButton}
          onPress={() => {
            // Navigate to edit profile screen
            Alert.alert('Edit Profile', 'Edit profile feature coming soon');
          }}>
          <Text style={styles.editButtonText}>Edit</Text>
        </Pressable>
      </View>

      {/* Profile Photo */}
      {photos.length > 0 ? (
        <View style={styles.photoContainer}>
          <Image source={{uri: photos[0]}} style={styles.mainPhoto} resizeMode="cover" />
        </View>
      ) : (
        <View style={styles.photoPlaceholder}>
          <Text style={styles.photoPlaceholderText}>📷</Text>
          <Text style={styles.photoPlaceholderLabel}>Add a photo</Text>
        </View>
      )}

      {/* Name and Age */}
      <View style={styles.nameContainer}>
        <Text style={styles.name}>
          {name}{age ? `, ${age}` : ''}
        </Text>
        {(location || occupation) && (
          <View style={styles.infoRow}>
            {location && <Text style={styles.infoText}>📍 {location}</Text>}
            {occupation && <Text style={styles.infoText}>💼 {occupation}</Text>}
          </View>
        )}
      </View>

      {/* Bio */}
      {bio ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About Me</Text>
          <Text style={styles.bio}>{bio}</Text>
        </View>
      ) : (
        <View style={styles.section}>
          <View style={styles.emptySection}>
            <Text style={styles.emptySectionText}>Add a bio to tell others about yourself</Text>
          </View>
        </View>
      )}

      {/* Photos Grid */}
      {photos.length > 1 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photos</Text>
          <View style={styles.photosGrid}>
            {photos.slice(1).map((photo, index) => (
              <Image
                key={index}
                source={{uri: photo}}
                style={styles.photoThumbnail}
                resizeMode="cover"
              />
            ))}
          </View>
        </View>
      )}

      {/* Interests */}
      {interests.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Interests</Text>
          <View style={styles.interestsContainer}>
            {interests.map((interest, index) => (
              <View key={index} style={styles.interestTag}>
                <Text style={styles.interestText}>{interest}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Interests</Text>
          <View style={styles.emptySection}>
            <Text style={styles.emptySectionText}>Add interests to find better matches</Text>
          </View>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <Pressable
          style={styles.actionButton}
          onPress={() => navigation.navigate('SubscriptionUpsell')}>
          <Text style={styles.actionButtonText}>💎 Upgrade to Premium</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: typography.headings.h2,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
  },
  editButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  editButtonText: {
    fontSize: typography.body.medium,
    fontFamily: typography.fontFamilyMedium,
    color: colors.primary,
  },
  photoContainer: {
    width: '100%',
    height: 400,
    backgroundColor: colors.surface,
  },
  mainPhoto: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    width: '100%',
    height: 300,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  photoPlaceholderText: {
    fontSize: 64,
    marginBottom: spacing.sm,
  },
  photoPlaceholderLabel: {
    fontSize: typography.body.medium,
    fontFamily: typography.fontFamilyMedium,
    color: colors.textSecondary,
  },
  nameContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  name: {
    fontSize: typography.headings.h2,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
  },
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  infoText: {
    fontSize: typography.body.medium,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textSecondary,
  },
  emptySection: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  emptySectionText: {
    fontSize: typography.body.medium,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.headings.h3,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  bio: {
    fontSize: typography.body.medium,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  photoThumbnail: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: colors.surface,
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
    backgroundColor: colors.secondary,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  interestText: {
    fontSize: typography.body.small,
    fontFamily: typography.fontFamilyMedium,
    color: colors.primary,
  },
  actionsContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  actionButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 14,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: typography.body.large,
    fontFamily: typography.fontFamilyBold,
    color: colors.textInverse,
  },
  emptyText: {
    fontSize: typography.body.large,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
});

export default ProfileScreen;

