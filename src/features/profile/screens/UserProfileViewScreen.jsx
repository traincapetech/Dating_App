import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import {colors, typography, spacing} from '../../../theme';
import {getProfile} from '../../../services/profile/profileService';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const PHOTO_SIZE = (SCREEN_WIDTH - 4) / 3; // 3-column grid with 1px gaps

// ─── UserProfileViewScreen ────────────────────────────────────────────────────
// Displays another user's public profile. Mirrors ProfileScreen structure
// but removes self-profile controls (edit, settings, strength card, prompts).
// ─────────────────────────────────────────────────────────────────────────────

const UserProfileViewScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const {userId, theirName, theirPhoto, theirAge} = route.params || {};

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('gallery');

  useEffect(() => {
    if (userId) {
      loadProfile();
    }
  }, [userId]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await getProfile(userId);
      const profileData = response?.profile || response;
      setProfile(profileData);
    } catch (error) {
      console.error('[UserProfileViewScreen] Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  // ── Derived data (same field access pattern as ProfileScreen) ────────────────

  const photos =
    profile?.photos ||
    profile?.media?.media?.map(m => m.url).filter(Boolean) ||
    (theirPhoto ? [theirPhoto] : []);

  const firstName =
    profile?.basicInfo?.firstName ||
    profile?.basicInfo?.name ||
    profile?.name ||
    theirName ||
    '';
  const lastName = profile?.basicInfo?.lastName || '';
  const name = firstName
    ? lastName
      ? `${firstName} ${lastName}`
      : firstName
    : theirName || 'User';

  const age =
    profile?.age ||
    profile?.personalDetails?.age ||
    profile?.basicInfo?.age ||
    theirAge ||
    null;

  const bio =
    profile?.bio ||
    profile?.profilePrompts?.aboutMe?.answer ||
    null;

  const jobTitle = profile?.personalDetails?.jobTitle || null;
  const school = profile?.personalDetails?.school || null;

  const getZodiacIcon = sign => {
    const map = {
      aries: 'zodiac-aries', taurus: 'zodiac-taurus', gemini: 'zodiac-gemini',
      cancer: 'zodiac-cancer', leo: 'zodiac-leo', virgo: 'zodiac-virgo',
      libra: 'zodiac-libra', scorpio: 'zodiac-scorpio', sagittarius: 'zodiac-sagittarius',
      capricorn: 'zodiac-capricorn', aquarius: 'zodiac-aquarius', pisces: 'zodiac-pisces',
    };
    return map[sign?.toLowerCase()] || 'star-face';
  };

  // Only show basics that exist
  const basicsItems = [
    profile?.personalDetails?.height && {
      label: `${profile.personalDetails.height} cm`, icon: 'arrow-up-down',
    },
    profile?.personalDetails?.starSign && {
      label: profile.personalDetails.starSign,
      icon: getZodiacIcon(profile.personalDetails.starSign),
    },
    profile?.personalDetails?.educationLevel && {
      label: profile.personalDetails.educationLevel, icon: 'school-outline',
    },
    profile?.lifestyle?.religiousBeliefs && {
      label: profile.lifestyle.religiousBeliefs, icon: 'hands-pray',
    },
    profile?.lifestyle?.politicalBeliefs && {
      label: profile.lifestyle.politicalBeliefs, icon: 'scale-balance',
    },
    profile?.lifestyle?.drink && {
      label: profile.lifestyle.drink, icon: 'glass-wine',
    },
    profile?.lifestyle?.smokeTobacco && {
      label: profile.lifestyle.smokeTobacco, icon: 'smoking-off',
    },
  ].filter(Boolean);

  const datingIntention = profile?.datingPreferences?.datingIntention || null;

  // ── Header (shared between loading + main) ───────────────────────────────────
  const renderHeader = () => (
    <View style={styles.header}>
      <Pressable
        style={({pressed}) => [styles.headerIconBtn, pressed && {opacity: 0.6}]}
        onPress={() => navigation.goBack()}>
        <Icon name="chevron-left" size={28} color={colors.textPrimary} />
      </Pressable>
      <Text style={styles.headerTitle} numberOfLines={1}>
        {name.toLowerCase() || 'profile'}
      </Text>
      {/* Spacer */}
      <View style={styles.headerIconBtn} />
    </View>
  );

  // ── Loading state ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading profile…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Main render ──────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      {renderHeader()}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>

        {/* ── Profile Header Row (Avatar + Quick Stats) ── */}
        <View style={styles.profileHeaderRow}>
          {/* Avatar */}
          <View style={styles.avatarWrapper}>
            {photos.length > 0 ? (
              <Image source={{uri: photos[0]}} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Icon name="account" size={40} color="#CCC" />
              </View>
            )}
            {profile?.isActiveToday && <View style={styles.onlineDot} />}
          </View>

          {/* Quick stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{photos.length}</Text>
              <Text style={styles.statLabel}>Photos</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {profile?.stats?.likes ?? '—'}
              </Text>
              <Text style={styles.statLabel}>Likes</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {profile?.stats?.matches ?? '—'}
              </Text>
              <Text style={styles.statLabel}>Matches</Text>
            </View>
          </View>
        </View>

        {/* ── Name + Bio ── */}
        <View style={styles.bioSection}>
          <Text style={styles.nameText}>
            {name}{age ? `, ${age}` : ''}
          </Text>

          {(jobTitle || school) ? (
            <Text style={styles.occupationText}>
              {[jobTitle, school].filter(Boolean).join(' at ')}
            </Text>
          ) : null}

          {bio ? (
            <Text style={styles.bioText}>{bio}</Text>
          ) : null}
        </View>

        {/* ── Dating Intention Badge ── */}
        {datingIntention ? (
          <View style={styles.intentWrapper}>
            <LinearGradient
              colors={['#8E2DE2', '#4A00E0']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 0}}
              style={styles.intentBadge}>
              <Icon name="heart-flash" size={15} color="#FFF" style={{marginRight: 6}} />
              <Text style={styles.intentBadgeText}>
                Looking for {datingIntention}
              </Text>
            </LinearGradient>
          </View>
        ) : null}

        {/* ── Tabs ── */}
        <View style={styles.tabsWrapper}>
          <Pressable
            onPress={() => setActiveTab('gallery')}
            style={[styles.tabBtn, activeTab === 'gallery' && styles.activeTabBtn]}>
            <Icon
              name="grid"
              size={22}
              color={activeTab === 'gallery' ? colors.primary : '#8E8E8E'}
            />
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('details')}
            style={[styles.tabBtn, activeTab === 'details' && styles.activeTabBtn]}>
            <Icon
              name="account-details-outline"
              size={22}
              color={activeTab === 'details' ? colors.primary : '#8E8E8E'}
            />
          </Pressable>
        </View>

        {activeTab === 'gallery' ? (
          /* ── Photo Grid Tab ── */
          photos.length > 0 ? (
            <View style={styles.photoGrid}>
              {photos.map((uri, idx) => (
                <View key={idx} style={styles.photoCell}>
                  <Image source={{uri}} style={styles.gridPhoto} resizeMode="cover" />
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Icon name="image-off-outline" size={48} color="#DDD" />
              <Text style={styles.emptyStateText}>No photos to display</Text>
            </View>
          )
        ) : (
          /* ── Details Tab ── */
          <View style={styles.detailsSection}>

            {/* Work & Education card */}
            {(jobTitle || school) ? (
              <View style={styles.detailCard}>
                <Text style={styles.detailCardTitle}>Work & Education</Text>
                {jobTitle ? (
                  <View style={styles.detailRow}>
                    <Icon name="briefcase-outline" size={18} color={colors.primary} style={styles.detailIcon} />
                    <Text style={styles.detailText}>{jobTitle}</Text>
                  </View>
                ) : null}
                {school ? (
                  <View style={styles.detailRow}>
                    <Icon name="school-outline" size={18} color={colors.primary} style={styles.detailIcon} />
                    <Text style={styles.detailText}>{school}</Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* Basics card */}
            {basicsItems.length > 0 ? (
              <View style={styles.detailCard}>
                <Text style={styles.detailCardTitle}>My Basics</Text>
                <View style={styles.basicsGrid}>
                  {basicsItems.map((item, idx) => (
                    <View key={idx} style={styles.basicChip}>
                      <Icon name={item.icon} size={16} color={colors.primary} />
                      <Text style={styles.basicChipText}>{item.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Empty details */}
            {!jobTitle && !school && basicsItems.length === 0 ? (
              <View style={styles.emptyState}>
                <Icon name="information-outline" size={48} color="#DDD" />
                <Text style={styles.emptyStateText}>No additional details available</Text>
              </View>
            ) : null}

          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#EFEFEF',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontFamily: typography.fontFamilyBold,
    color: '#000',
    textTransform: 'lowercase',
    marginHorizontal: 4,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Loading ──────────────────────────────────────────────────────────────────
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textSecondary,
  },

  // ── Profile Header Row ───────────────────────────────────────────────────────
  profileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
  },
  avatarWrapper: {
    position: 'relative',
    width: 86,
    height: 86,
    marginRight: 20,
  },
  avatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    backgroundColor: '#FAFAFA',
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4ADE80',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  statsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontFamily: typography.fontFamilyBold,
    color: '#000',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: typography.fontFamilyRegular,
    color: '#8E8E8E',
    marginTop: 2,
  },
  statDivider: {
    width: 0.5,
    height: 28,
    backgroundColor: '#EFEFEF',
  },

  // ── Bio Section ──────────────────────────────────────────────────────────────
  bioSection: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  nameText: {
    fontSize: 17,
    fontFamily: typography.fontFamilyBold,
    color: '#262626',
    marginBottom: 2,
  },
  occupationText: {
    fontSize: 14,
    fontFamily: typography.fontFamilyRegular,
    color: '#8E8E8E',
    marginBottom: 6,
  },
  bioText: {
    fontSize: 14,
    fontFamily: typography.fontFamilyRegular,
    color: '#262626',
    lineHeight: 20,
  },

  // ── Dating Intention ─────────────────────────────────────────────────────────
  intentWrapper: {
    paddingHorizontal: 20,
    marginBottom: 14,
    marginTop: 4,
  },
  intentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    alignSelf: 'flex-start',
    ...Platform.select({
      ios: {shadowColor: '#8E2DE2', shadowOffset: {width: 0, height: 3}, shadowOpacity: 0.25, shadowRadius: 6},
      android: {elevation: 4},
    }),
  },
  intentBadgeText: {
    color: '#FFF',
    fontSize: 13,
    fontFamily: typography.fontFamilyBold,
  },

  // ── Tabs ─────────────────────────────────────────────────────────────────────
  tabsWrapper: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    borderTopColor: '#DBDBDB',
  },
  tabBtn: {
    flex: 1,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabBtn: {
    borderBottomColor: colors.primary,
  },

  // ── Photo Grid ───────────────────────────────────────────────────────────────
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 2,
  },
  photoCell: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    margin: 0.5,
    backgroundColor: '#F0F0F0',
  },
  gridPhoto: {
    width: '100%',
    height: '100%',
  },

  // ── Details Tab ──────────────────────────────────────────────────────────────
  detailsSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 14,
  },
  detailCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    padding: 18,
    borderWidth: 0.5,
    borderColor: '#EFEFEF',
    ...Platform.select({
      ios: {shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.04, shadowRadius: 6},
      android: {elevation: 1},
    }),
  },
  detailCardTitle: {
    fontSize: 13,
    fontFamily: typography.fontFamilyBold,
    color: '#8E8E8E',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailIcon: {
    marginRight: 10,
    width: 22,
  },
  detailText: {
    fontSize: 15,
    fontFamily: typography.fontFamilyMedium,
    color: '#262626',
    flex: 1,
  },
  basicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  basicChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 6,
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
  },
  basicChipText: {
    fontSize: 13,
    fontFamily: typography.fontFamilyMedium,
    color: '#374151',
  },

  // ── Empty State ──────────────────────────────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyStateText: {
    fontSize: 14,
    fontFamily: typography.fontFamilyRegular,
    color: '#AAAAAA',
    textAlign: 'center',
  },
});

export default UserProfileViewScreen;
