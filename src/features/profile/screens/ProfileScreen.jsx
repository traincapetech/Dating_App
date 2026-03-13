import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  RefreshControl,
  Dimensions,
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {colors, typography, spacing} from '../../../theme';
import {getProfile} from '../../../services/profile/profileService';
import {useLoading} from '../../../context/LoadingContext';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

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
    : 'New User';
  const age =
    profile?.age ||
    profile?.personalDetails?.age ||
    profile?.basicInfo?.age ||
    null;
  const location = profile?.basicInfo?.location || 'Add your location';

  const renderMenuItem = (
    icon,
    title,
    subtitle,
    onPress,
    iconColor = colors.primary,
    bgColor = colors.primary + '15',
  ) => (
    <Pressable style={styles.menuItem} onPress={onPress}>
      <View style={[styles.menuIconContainer, {backgroundColor: bgColor}]}>
        <Icon name={icon} size={24} color={iconColor} />
      </View>
      <View style={styles.menuTextContainer}>
        <Text style={styles.menuTitle}>{title}</Text>
        {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
      </View>
      <Icon name="chevron-right" size={24} color={colors.textTertiary} />
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
          />
        }>
        {/* Top Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Account</Text>
          <View style={styles.headerActions}>
            <Pressable
              style={styles.headerBtn}
              onPress={() => navigation.navigate('Settings')}>
              <Icon name="cog-outline" size={24} color={colors.textPrimary} />
            </Pressable>
          </View>
        </View>

        {/* Centered Identity Section */}
        <View style={styles.identitySection}>
          <View style={styles.avatarWrapper}>
            {photos.length > 0 ? (
              <Image source={{uri: photos[0]}} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Icon name="account" size={50} color={colors.textTertiary} />
              </View>
            )}

            {/* Completion or Verfied Badge */}
            {completionPercentage === 100 ? (
              <View style={[styles.badge, {backgroundColor: '#10B981'}]}>
                <Icon name="check-decagram" size={16} color="#FFF" />
              </View>
            ) : (
              <LinearGradient
                colors={[colors.primary, '#8E2DE2']}
                style={styles.badge}>
                <Text style={styles.badgeText}>{completionPercentage}%</Text>
              </LinearGradient>
            )}
          </View>

          <Text style={styles.profileName}>
            {name}
            {age ? `, ${age}` : ''}
          </Text>
          <View style={styles.locationRow}>
            <Icon
              name="map-marker-outline"
              size={16}
              color={colors.textSecondary}
            />
            <Text style={styles.locationText}>{location}</Text>
          </View>
        </View>

        {/* Quick Stats Grid */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Icon
              name="heart-multiple"
              size={28}
              color="#EF4444"
              style={styles.statIcon}
            />
            <Text style={styles.statValue}>12</Text>
            <Text style={styles.statLabel}>Likes</Text>
          </View>
          <View style={styles.statCard}>
            <Icon
              name="account-heart"
              size={28}
              color="#8B5CF6"
              style={styles.statIcon}
            />
            <Text style={styles.statValue}>5</Text>
            <Text style={styles.statLabel}>Matches</Text>
          </View>
          <View style={styles.statCard}>
            <Icon
              name="lightning-bolt"
              size={28}
              color="#F59E0B"
              style={styles.statIcon}
            />
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Boosts</Text>
          </View>
        </View>

        {/* Subscription Hub */}
        <Pressable style={styles.premiumCard}>
          <LinearGradient
            colors={['#1F2937', '#111827']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={styles.premiumGradient}>
            <View style={styles.premiumHeader}>
              <Icon name="crown" size={24} color="#FBBF24" />
              <Text style={styles.premiumTitle}>Pryvo Gold</Text>
            </View>
            <Text style={styles.premiumDesc}>
              Unlock who liked you, advanced filters, and unlimited swipes to
              find your perfect match faster.
            </Text>
            <View style={styles.premiumBtn}>
              <Text style={styles.premiumBtnText}>Upgrade Now</Text>
            </View>
          </LinearGradient>
        </Pressable>

        {/* Structured Menu */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Profile & Preferences</Text>
          <View style={styles.menuCard}>
            {renderMenuItem(
              'account-edit',
              'Edit Profile',
              'Photos, bio, and interests',
              () => navigation.navigate('ProfileDetails', {userId}),
              colors.primary,
              colors.primary + '15',
            )}
            {renderMenuItem(
              'tune-variant',
              'Match Preferences',
              'Age, distance, and more',
              () => navigation.navigate('Settings'),
              '#8B5CF6',
              '#8B5CF615',
            )}
          </View>
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Safety & Support</Text>
          <View style={styles.menuCard}>
            {renderMenuItem(
              'shield-check',
              'Safety Centre',
              'Guidelines and resources',
              () => navigation.navigate('ReportProblem'),
              '#10B981',
              '#10B98115',
            )}
            <View style={styles.menuDivider} />
            {renderMenuItem(
              'help-circle',
              'Help & Centre',
              'FAQs and contact support',
              () => navigation.navigate('HelpCentre'),
              '#F59E0B',
              '#F59E0B15',
            )}
            <View style={styles.menuDivider} />
            {renderMenuItem(
              'cog',
              'App Settings',
              'Notifications, emails, account',
              () => navigation.navigate('Settings'),
              '#6B7280',
              '#F3F4F6',
            )}
          </View>
        </View>

        <View style={styles.footerInfo}>
          <Text style={styles.versionText}>Pryvo Version 1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFB',
  },
  scrollContent: {
    paddingBottom: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: typography.fontFamilyBold,
    color: '#111827',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerBtn: {
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 50,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  identitySection: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  avatarPlaceholder: {
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: typography.fontFamilyBold,
  },
  profileName: {
    fontSize: 26,
    fontFamily: typography.fontFamilyBold,
    color: '#111827',
    marginBottom: 6,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    fontSize: 15,
    fontFamily: typography.fontFamilyMedium,
    color: '#6B7280',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 30,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 20,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.05,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
  },
  statIcon: {
    marginBottom: 8,
  },
  statValue: {
    fontSize: 22,
    fontFamily: typography.fontFamilyBold,
    color: '#111827',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 13,
    fontFamily: typography.fontFamilyMedium,
    color: '#6B7280',
  },
  premiumCard: {
    marginHorizontal: 20,
    marginBottom: 32,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  premiumGradient: {
    padding: 24,
  },
  premiumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  premiumTitle: {
    fontSize: 22,
    fontFamily: typography.fontFamilyBold,
    color: '#FFFFFF',
  },
  premiumDesc: {
    fontSize: 14,
    fontFamily: typography.fontFamilyRegular,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 22,
    marginBottom: 20,
  },
  premiumBtn: {
    backgroundColor: '#FBBF24',
    alignSelf: 'flex-start',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 100,
  },
  premiumBtnText: {
    fontSize: 15,
    fontFamily: typography.fontFamilyBold,
    color: '#78350F',
  },
  menuSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: typography.fontFamilyBold,
    color: '#4B5563',
    marginBottom: 12,
    marginLeft: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.03,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  menuIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontFamily: typography.fontFamilyBold,
    color: '#1F2937',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 13,
    fontFamily: typography.fontFamilyRegular,
    color: '#6B7280',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 84, // Align with text
  },
  footerInfo: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  versionText: {
    fontSize: 13,
    fontFamily: typography.fontFamilyMedium,
    color: '#9CA3AF',
  },
});

export default ProfileScreen;
