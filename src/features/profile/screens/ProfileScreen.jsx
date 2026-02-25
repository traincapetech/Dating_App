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
import {useLoading} from '../../../context/LoadingContext';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

const ProfileScreen = () => {
  const navigation = useNavigation();
  const {setLoading: setGlobalLoading} = useLoading();
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
      // Only show local loading if data is not already present and it's not a refresh
      if (!profile && !refreshing) {
        setLoading(true);
      }

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

    if (profile.photos?.length > 0 || profile.media?.media?.length > 0) score++;
    if (profile.name || profile.basicInfo?.firstName) score++;
    const bio =
      profile.bio ||
      profile.profilePrompts?.aboutMe?.answer ||
      profile.profilePrompts?.bio ||
      profile.basicInfo?.bio;
    if (bio && bio.trim().length > 0) score++;
    const interests = profile.interests || profile.lifestyle?.interests || [];
    if (interests.length > 0) score++;
    if (profile.age || profile.personalDetails?.age || profile.basicInfo?.dob)
      score++;
    if (profile.basicInfo?.location) score++;
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
    profile?.basicInfo?.firstName ||
    profile?.basicInfo?.name ||
    profile?.name ||
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

  // Removed the local ActivityIndicator block so the UI structure is visible instantly
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.flex}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
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
          <Pressable
            style={styles.settingsButton}
            onPress={() => navigation.navigate('Settings')}>
            <Icon name="cog-outline" size={26} color={colors.textPrimary} />
          </Pressable>
        </View>

        {/* Profile Card - Main */}
        <View style={styles.cardContainer}>
          <Pressable
            style={styles.profileCard}
            onPress={() => navigation.navigate('ProfileDetails', {userId})}>
            <View style={styles.profileHeader}>
              {/* Photo Section */}
              <View style={styles.photoContainer}>
                <View style={styles.photoInner}>
                  {photos.length > 0 ? (
                    <Image
                      source={{uri: photos[0]}}
                      style={styles.profilePhoto}
                    />
                  ) : (
                    <View style={styles.photoPlaceholder}>
                      <Icon
                        name="account"
                        size={40}
                        color={colors.textTertiary}
                      />
                    </View>
                  )}
                  {completionPercentage < 100 && (
                    <LinearGradient
                      colors={[colors.primary, '#8E2DE2']}
                      style={styles.completionBadge}>
                      <Text style={styles.completionText}>
                        {completionPercentage}%
                      </Text>
                    </LinearGradient>
                  )}
                </View>
              </View>

              {/* Info Section */}
              <View style={styles.profileInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.profileName} numberOfLines={1}>
                    {name}
                    {age ? `, ${age}` : ''}
                  </Text>
                  {completionPercentage === 100 && (
                    <Icon
                      name="check-decagram"
                      size={20}
                      color={colors.primary}
                    />
                  )}
                </View>

                {location ? (
                  <View style={styles.locationRow}>
                    <Icon
                      name="map-marker-outline"
                      size={14}
                      color={colors.textSecondary}
                    />
                    <Text style={styles.locationText}>{location}</Text>
                  </View>
                ) : null}

                <Text style={styles.bioPreview} numberOfLines={2}>
                  {bio || 'Tell the world who you are...'}
                </Text>
              </View>

              <Icon
                name="chevron-right"
                size={24}
                color={colors.textTertiary}
              />
            </View>

            {/* Profile Completion Bar */}
            {completionPercentage < 100 && (
              <View style={styles.progressSection}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>Profile Strength</Text>
                  <Text style={styles.progressValue}>
                    {completionPercentage}%
                  </Text>
                </View>
                <View style={styles.progressBarBg}>
                  <LinearGradient
                    colors={[colors.primary, '#8E2DE2']}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 0}}
                    style={[
                      styles.progressBarFill,
                      {width: `${completionPercentage}%`},
                    ]}
                  />
                </View>
                <Pressable
                  style={styles.completeBtn}
                  onPress={() =>
                    navigation.navigate('ProfileDetails', {userId})
                  }>
                  <LinearGradient
                    colors={[colors.primary, '#8E2DE2']}
                    style={styles.completeBtnGradient}>
                    <Text style={styles.completeBtnText}>Complete Profile</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            )}
          </Pressable>
        </View>

        {/* Action Grid */}
        <View style={styles.actionGrid}>
          <Pressable
            style={styles.gridItem}
            onPress={() => navigation.navigate('ProfileDetails', {userId})}>
            <View style={[styles.gridIconBox, {backgroundColor: '#F3E8FF'}]}>
              <Icon name="pencil-outline" size={24} color={colors.primary} />
            </View>
            <Text style={styles.gridText}>Edit Profile</Text>
          </Pressable>

          <Pressable
            style={styles.gridItem}
            onPress={() => navigation.navigate('Settings')}>
            <View style={[styles.gridIconBox, {backgroundColor: '#E0F2FE'}]}>
              <Icon name="shield-check-outline" size={24} color="#0284C7" />
            </View>
            <Text style={styles.gridText}>Safety</Text>
          </Pressable>

          <Pressable
            style={styles.gridItem}
            onPress={() => navigation.navigate('HelpCentre')}>
            <View style={[styles.gridIconBox, {backgroundColor: '#FEF3C7'}]}>
              <Icon name="help-circle-outline" size={24} color="#D97706" />
            </View>
            <Text style={styles.gridText}>Help</Text>
          </Pressable>
        </View>

        {/* Content Sections */}
        <View style={styles.contentSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Profile Preview</Text>
            <Pressable
              onPress={() => navigation.navigate('ProfileDetails', {userId})}>
              <Text style={styles.seeAllText}>Manage</Text>
            </Pressable>
          </View>

          {photos.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.photoScroll}>
              {photos.map((url, idx) => (
                <Image
                  key={idx}
                  source={{uri: url}}
                  style={styles.scrollPhoto}
                />
              ))}
              <Pressable
                style={styles.addPhotoCard}
                onPress={() => navigation.navigate('ProfileDetails', {userId})}>
                <Icon name="plus" size={30} color={colors.textTertiary} />
                <Text style={styles.addPhotoText}>Add</Text>
              </Pressable>
            </ScrollView>
          ) : (
            <View style={styles.emptyPhotos}>
              <Icon
                name="camera-outline"
                size={32}
                color={colors.textTertiary}
              />
              <Text style={styles.emptyText}>
                Add photos to get more likes!
              </Text>
            </View>
          )}

          {interests.length > 0 && (
            <View style={styles.interestSection}>
              <Text style={styles.subTitle}>Interests</Text>
              <View style={styles.tagContainer}>
                {interests.slice(0, 8).map((tag, idx) => (
                  <View key={idx} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Bottom Banner */}
        <LinearGradient
          colors={['#1e1e2e', '#111119']}
          style={styles.premiumBanner}>
          <View style={styles.premiumContent}>
            <View>
              <Text style={styles.premiumTitle}>Pryvo Gold</Text>
              <Text style={styles.premiumDesc}>Get unlimited likes & more</Text>
            </View>
            <Pressable style={styles.upgradeBtn}>
              <Text style={styles.upgradeText}>Upgrade</Text>
            </Pressable>
          </View>
        </LinearGradient>

        <View style={{height: 100}} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFD',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 15,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  settingsButton: {
    padding: 8,
  },
  cardContainer: {
    paddingHorizontal: 20,
    marginBottom: 25,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.05,
    shadowRadius: 15,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  photoContainer: {
    marginRight: 15,
  },
  photoInner: {
    position: 'relative',
    padding: 3,
    borderRadius: 45,
    backgroundColor: '#F3E8FF',
  },
  profilePhoto: {
    width: 75,
    height: 75,
    borderRadius: 38,
  },
  photoPlaceholder: {
    width: 75,
    height: 75,
    borderRadius: 38,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  completionBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  completionText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  profileInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  locationText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  bioPreview: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 18,
  },
  progressSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  progressValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 15,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  completeBtn: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  completeBtnGradient: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  completeBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  actionGrid: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 30,
  },
  gridItem: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 15,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.03,
    shadowRadius: 8,
  },
  gridIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  gridText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  contentSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  seeAllText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  photoScroll: {
    flexDirection: 'row',
  },
  scrollPhoto: {
    width: 100,
    height: 125,
    borderRadius: 16,
    marginRight: 12,
    backgroundColor: '#F3F4F6',
  },
  addPhotoCard: {
    width: 100,
    height: 125,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  addPhotoText: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textTertiary,
  },
  emptyPhotos: {
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  emptyText: {
    marginTop: 10,
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  interestSection: {
    marginTop: 25,
  },
  subTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 12,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  premiumBanner: {
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 24,
    marginTop: 10,
  },
  premiumContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  premiumTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  premiumDesc: {
    color: '#A1A1AA',
    fontSize: 13,
    marginTop: 2,
  },
  upgradeBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 14,
  },
  upgradeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default ProfileScreen;
