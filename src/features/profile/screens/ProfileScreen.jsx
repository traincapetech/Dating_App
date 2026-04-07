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
import {decodeJWT, formatToTitleCase} from '../../../utils/safeUtils';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {colors, typography, spacing} from '../../../theme';
import {getProfile} from '../../../services/profile/profileService';
import {useLoading} from '../../../context/LoadingContext';
import {useInitialLoad} from '../../../context/InitialLoadContext';
import FullScreenLoader from '../../../components/layout/FullScreenLoader';
import ThemeBackground from '../../../components/layout/ThemeBackground';
import {useAuth} from '../../../context/AuthContext';
import {usePhotoSocial} from '../../../hooks/usePhotoSocial';
import {photoSocialService} from '../../../services/photoSocialService';
import PhotoInteractionViewer from '../../../components/profile/PhotoInteractionViewer';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

const ProfileScreen = () => {
  const navigation = useNavigation();
  const {setLoading: setGlobalLoading} = useLoading();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState(null);
  const [activeTab, setActiveTab] = useState('gallery'); // gallery or insights

  // 📸 Social Interaction Engagement
  const {photosStats} = usePhotoSocial(userId);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [viewerVisible, setViewerVisible] = useState(false);

  const {visited, markVisited} = useInitialLoad();

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
            const payload = decodeJWT(token);
            currentUserId = payload?.userId || payload?.id;
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
      if (!visited.profile) {
        markVisited('profile');
      }
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadProfile();
  };

  const {
    profile: contextProfile, 
    user: contextUser, 
    completionRate
  } = useAuth();

  const completionPercentage = completionRate;

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
  const prompts = profile?.profilePrompts
    ? Object.values(profile.profilePrompts).filter(p => p.question && p.answer)
    : [];

  const getZodiacIcon = sign => {
    switch (sign?.toLowerCase()) {
      case 'aries':
        return 'zodiac-aries';
      case 'taurus':
        return 'zodiac-taurus';
      case 'gemini':
        return 'zodiac-gemini';
      case 'cancer':
        return 'zodiac-cancer';
      case 'leo':
        return 'zodiac-leo';
      case 'virgo':
        return 'zodiac-virgo';
      case 'libra':
        return 'zodiac-libra';
      case 'scorpio':
        return 'zodiac-scorpio';
      case 'sagittarius':
        return 'zodiac-sagittarius';
      case 'capricorn':
        return 'zodiac-capricorn';
      case 'aquarius':
        return 'zodiac-aquarius';
      case 'pisces':
        return 'zodiac-pisces';
      default:
        return 'star-face';
    }
  };

  const basicsItems = [
    {
      label: profile?.personalDetails?.height
        ? `${profile.personalDetails.height} cm`
        : null,
      icon: 'arrow-up-down',
      visible: !!profile?.personalDetails?.height,
    },
    {
      label: profile?.personalDetails?.starSign,
      icon: getZodiacIcon(profile?.personalDetails?.starSign),
      visible: !!profile?.personalDetails?.starSign,
    },
    {
      label: profile?.personalDetails?.educationLevel,
      icon: 'school-outline',
      visible: !!profile?.personalDetails?.educationLevel,
    },
    {
      label: profile?.lifestyle?.religiousBeliefs,
      icon: 'hands-pray',
      visible: !!profile?.lifestyle?.religiousBeliefs,
    },
    {
      label: profile?.lifestyle?.drink,
      icon: 'glass-wine',
      visible: !!profile?.lifestyle?.drink,
    },
    {
      label: profile?.lifestyle?.smokeTobacco,
      icon: 'smoking-off',
      visible: !!profile?.lifestyle?.smokeTobacco,
    },
  ].filter(b => b.visible);

  if (loading && !visited.profile) {
    return <FullScreenLoader visible={true} message="Setting up your space…" />;
  }

  return (
    <ThemeBackground>
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
            <Pressable
              style={styles.headerIconBtn}
              onPress={() => navigation.navigate('Wallet')}>
              <Icon
                name="wallet-outline"
                size={24}
                color={colors.textPrimary}
              />
            </Pressable>
            <Text style={styles.headerTitle} numberOfLines={1}>
               My Persona ✨
            </Text>
            <View style={styles.headerActions}>
              <Pressable
                style={styles.headerIconBtn}
                onPress={() => navigation.navigate('Settings')}>
                <Icon name="menu" size={26} color={colors.textPrimary} />
              </Pressable>
            </View>
          </View>

          {/* Hero Section: Centered Avatar with Overlapping Name */}
          <View style={styles.heroSection}>
            <View style={styles.avatarGlowWrapper}>
              <LinearGradient
                colors={[colors.primary, '#E040C8']}
                style={styles.avatarGradientBorder}>
                <View style={styles.avatarInnerContainer}>
                  {photos.length > 0 ? (
                    <Image
                      source={{uri: photos[0]}}
                      style={styles.headerAvatar}
                    />
                  ) : (
                    <View style={styles.headerAvatarPlaceholder}>
                      <Icon
                        name="account"
                        size={48}
                        color={colors.textTertiary}
                      />
                    </View>
                  )}
                </View>
              </LinearGradient>
              {profile?.isActiveToday && (
                <View style={styles.onlineStatusDot} />
              )}
            </View>

            {/* User Identity block with Overlap */}
            <View style={styles.identityBlockOverlay}>
              <View style={styles.nameRowCentered}>
                <Text style={styles.heroName} numberOfLines={1}>
                  {formatToTitleCase(name)}
                  {age ? `, ${age}` : ''}
                </Text>
                <Icon
                  name="check-decagram"
                  size={20}
                  color={colors.primary}
                  style={styles.verificationIcon}
                />
              </View>
              <Text style={styles.heroBio} numberOfLines={2}>
                {profile?.bio ||
                  profile?.profilePrompts?.aboutMe?.answer ||
                  'Express yourself with a bio...'}
              </Text>
            </View>

            {/* Primary CTA: Dating Intention */}
            {profile?.datingPreferences?.datingIntention && (
              <Pressable style={styles.primaryCtaBtn}>
                <LinearGradient
                  colors={[colors.primary, '#8E2DE2']}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 0}}
                  style={styles.ctaGradient}>
                  <Icon
                    name="heart-flash"
                    size={18}
                    color="#FFF"
                    style={{marginRight: 8}}
                  />
                  <Text style={styles.ctaText}>
                    Looking for {profile.datingPreferences.datingIntention}
                  </Text>
                </LinearGradient>
              </Pressable>
            )}
          </View>

          {/* Stats Row: Refined Hierarchy */}
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>
                {profile?.stats?.likes || 0}
              </Text>
              <Text style={styles.statSublabel}>Likes</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>
                {profile?.stats?.matches || 0}
              </Text>
              <Text style={styles.statSublabel}>Matches</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>
                {profile?.stats?.views >= 1000
                  ? `${(profile.stats.views / 1000).toFixed(1)}k`
                  : profile?.stats?.views || 0}
              </Text>
              <Text style={styles.statSublabel}>Views</Text>
            </View>
          </View>

          {/* Profile Strength Strategy (Floating Card) */}
          {completionPercentage < 100 && (
            <Pressable
              onPress={() => navigation.navigate('ProfileDetails', {userId})}
              style={styles.floatingStrengthCard}>
              <View style={styles.strengthCardBody}>
                <View style={styles.strengthContent}>
                  <View style={styles.strengthTextRow}>
                    <Text style={styles.strengthStatusText}>
                      Profile Strength:{' '}
                      <Text style={{color: colors.primary}}>
                        {completionPercentage}%
                      </Text>
                    </Text>
                    <Icon name="lightning-bolt" size={16} color="#F59E0B" />
                  </View>
                  <Text style={styles.strengthHint}>
                    Add more details to find your perfect match
                  </Text>
                </View>
                <View style={styles.strengthProgressContainer}>
                  <View style={styles.strengthProgressBg}>
                    <View
                      style={[
                        styles.strengthProgressFill,
                        {width: `${completionPercentage}%`},
                      ]}
                    />
                  </View>
                </View>
                <View style={styles.strengthChevronCircle}>
                  <Icon name="chevron-right" size={20} color={colors.primary} />
                </View>
              </View>
            </Pressable>
          )}

          {/* Tabs Selection */}
          <View style={styles.tabsWrapper}>
            <Pressable
              onPress={() => setActiveTab('gallery')}
              style={[
                styles.tabBtn,
                activeTab === 'gallery' && styles.activeTabBtn,
              ]}>
              <Ionicons
                name="grid-outline"
                size={22}
                color={activeTab === 'gallery' ? colors.primary : '#A1A1AA'}
              />
            </Pressable>
            <Pressable
              onPress={() => setActiveTab('insights')}
              style={[
                styles.tabBtn,
                activeTab === 'insights' && styles.activeTabBtn,
              ]}>
              <Ionicons
                name="list-outline"
                size={24}
                color={activeTab === 'insights' ? colors.primary : '#A1A1AA'}
              />
            </Pressable>
          </View>

          {activeTab === 'gallery' ? (
            /* Media Grid */
            <View style={styles.gridContainer}>
              {photos.length > 0 ? (
                <View style={styles.photoGrid}>
                  {photos.map((photo, index) => {
                    const photoId = photoSocialService.generatePhotoId(photo);
                    const stats = photosStats[photoId] || {
                      likes: 0,
                      commentsCount: 0,
                    };
                    return (
                      <Pressable
                        key={index}
                        style={styles.gridPhotoWrapper}
                        onPress={() => {
                          setSelectedPhoto(photo);
                          setViewerVisible(true);
                        }}>
                        <Image source={{uri: photo}} style={styles.gridPhoto} />
                        {/* 📸 Social Notification Badges for Owner */}
                        {(stats.likes > 0 || stats.commentsCount > 0) && (
                          <View style={styles.miniStatsOverlay}>
                            {stats.likes > 0 && (
                              <View style={styles.miniStat}>
                                <Icon name="heart" size={12} color="#fff" />
                                <Text style={styles.miniStatText}>
                                  {stats.likes}
                                </Text>
                              </View>
                            )}
                            {stats.commentsCount > 0 && (
                              <View style={styles.miniStat}>
                                <Icon name="comment" size={12} color="#fff" />
                                <Text style={styles.miniStatText}>
                                  {stats.commentsCount}
                                </Text>
                              </View>
                            )}
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <Pressable
                  style={styles.emptyGridPlaceholder}
                  onPress={() =>
                    navigation.navigate('ProfileDetails', {userId})
                  }>
                  <Icon
                    name="camera-plus-outline"
                    size={40}
                    color={colors.textTertiary}
                  />
                  <Text style={styles.emptyGridText}>
                    Add photos to showcase your vibe
                  </Text>
                </Pressable>
              )}
            </View>
          ) : (
            /* Insights / Prompts & Music Section */
            <View style={styles.insightsWrapper}>
              {/* My Basics Grid */}
              {basicsItems.length > 0 && (
                <View style={styles.basicsGridSection}>
                  <Text style={styles.insightSectionTitle}>My Basics</Text>
                  <View style={styles.basicsGrid}>
                    {basicsItems.map((item, idx) => (
                      <View key={idx} style={styles.basicGridItem}>
                        <Icon
                          name={item.icon}
                          size={20}
                          color={colors.primary}
                        />
                        <Text style={styles.basicGridLabel}>{item.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {prompts.length > 0 && (
                <View style={styles.promptsSection}>
                  {prompts.map((prompt, idx) => (
                    <View key={idx} style={styles.promptCard}>
                      <Text style={styles.promptQuestion}>
                        {prompt.question}
                      </Text>
                      <Text style={styles.promptAnswer}>{prompt.answer}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Music Mockup Section */}
              <View style={styles.musicSection}>
                <View style={styles.musicHeader}>
                  <Icon name="spotify" size={24} color="#1DB954" />
                  <Text style={styles.musicTitle}>My Anthem</Text>
                </View>
                <View style={styles.musicCard}>
                  <Image
                    source={{
                      uri: 'https://i.scdn.co/image/ab67616d0000b27341e3093952945d81232c9676',
                    }}
                    style={styles.albumArt}
                  />
                  <View style={styles.musicInfo}>
                    <Text style={styles.songName}>Starboy</Text>
                    <Text style={styles.artistName}>
                      The Weeknd • Daft Punk
                    </Text>
                  </View>
                  <Icon name="play-circle" size={32} color={colors.primary} />
                </View>
              </View>
            </View>
          )}

          <View style={styles.footerInfo}>
            <Text style={styles.versionText}>Pryvo Version 1.0.0</Text>
          </View>
        </ScrollView>

        <PhotoInteractionViewer
          visible={viewerVisible}
          onClose={() => setViewerVisible(false)}
          photoUrl={selectedPhoto}
          targetUserId={userId}
          currentUserId={userId}
          navigation={navigation}
        />
      </SafeAreaView>
    </ThemeBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingBottom: 100, // Safe padding for floating tab bar
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: typography.fontFamilyBold,
    color: '#000',
  },
  headerIconBtn: {
    padding: 4,
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
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  avatarContainer: {
    flex: 1,
  },
  avatarWrapper: {
    position: 'relative',
    width: 86,
    height: 86,
  },
  avatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  avatarPlaceholder: {
    backgroundColor: '#FAFAFA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  miniBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: typography.fontFamilyBold,
  },
  onlineIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4ADE80',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  statsRow: {
    flex: 2.5,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontFamily: typography.fontFamilyBold,
    color: '#000',
  },
  statLabel: {
    fontSize: 13,
    fontFamily: typography.fontFamilyRegular,
    color: '#262626',
  },
  // ── HERO REDESIGN STYLES ──
  heroSection: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 24,
  },
  avatarGlowWrapper: {
    padding: 4,
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 12},
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 15,
    zIndex: 2,
  },
  avatarGradientBorder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInnerContainer: {
    width: 114,
    height: 114,
    borderRadius: 57,
    backgroundColor: '#FFF',
    padding: 2,
    overflow: 'hidden',
  },
  headerAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 55,
  },
  headerAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineStatusDot: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#22C55E',
    borderWidth: 3,
    borderColor: '#FFF',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  identityBlockOverlay: {
    alignItems: 'center',
    marginTop: -16, // Overlap effect
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 5,
    zIndex: 1,
    minWidth: '60%',
  },
  nameRowCentered: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroName: {
    fontSize: 24,
    fontFamily: typography.fontFamilyBold,
    color: '#111',
  },
  verificationIcon: {
    marginTop: 2,
  },
  heroBio: {
    fontSize: 13,
    fontFamily: typography.fontFamilyRegular,
    color: '#71717A',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  primaryCtaBtn: {
    marginTop: 20,
    borderRadius: 30,
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
  },
  ctaText: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: typography.fontFamilyBold,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    paddingVertical: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontFamily: typography.fontFamilyBold,
    color: '#111',
  },
  statSublabel: {
    fontSize: 12,
    fontFamily: typography.fontFamilyMedium,
    color: '#9CA3AF',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#F3F4F6',
  },
  floatingStrengthCard: {
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  strengthCardBody: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  strengthContent: {
    flex: 1,
  },
  strengthTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  strengthStatusText: {
    fontSize: 15,
    fontFamily: typography.fontFamilyBold,
    color: '#111',
  },
  strengthHint: {
    fontSize: 12,
    fontFamily: typography.fontFamilyRegular,
    color: '#888',
    marginTop: 2,
  },
  strengthProgressContainer: {
    width: 60,
    height: 8,
    marginHorizontal: 15,
  },
  strengthProgressBg: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  strengthProgressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  strengthChevronCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  intentWrapper: {
    paddingHorizontal: 20,
    marginBottom: 16,
    marginTop: 8,
  },
  intentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    alignSelf: 'flex-start',
    shadowColor: '#8E2DE2',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  intentBadgeText: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: typography.fontFamilyBold,
  },
  tabsWrapper: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    borderTopColor: '#DBDBDB',
    marginTop: 10,
  },
  tabBtn: {
    flex: 1,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabBtn: {
    borderBottomColor: colors.primary,
  },
  insightsWrapper: {
    paddingTop: 16,
  },
  musicSection: {
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 20,
  },
  musicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  musicTitle: {
    fontSize: 16,
    fontFamily: typography.fontFamilyBold,
    color: '#262626',
  },
  musicCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  albumArt: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  musicInfo: {
    flex: 1,
    marginLeft: 12,
  },
  songName: {
    fontSize: 15,
    fontFamily: typography.fontFamilyBold,
    color: '#262626',
  },
  artistName: {
    fontSize: 13,
    fontFamily: typography.fontFamilyRegular,
    color: '#8E8E8E',
    marginTop: 2,
  },
  insightSectionTitle: {
    fontSize: 16,
    fontFamily: typography.fontFamilyBold,
    color: '#262626',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  basicsGridSection: {
    marginBottom: 24,
  },
  basicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
  },
  basicGridItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    minWidth: (SCREEN_WIDTH - 60) / 2,
  },
  basicGridLabel: {
    fontSize: 14,
    fontFamily: typography.fontFamilyMedium,
    color: '#262626',
    marginLeft: 8,
  },
  promptsSection: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  promptCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  promptQuestion: {
    fontSize: 13,
    fontFamily: typography.fontFamilyBold,
    color: '#8E8E8E',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  promptAnswer: {
    fontSize: 16,
    fontFamily: typography.fontFamilyMedium,
    color: '#262626',
    lineHeight: 22,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryActionBtn: {
    backgroundColor: colors.primary,
  },
  primaryActionBtnText: {
    color: '#FFF',
    fontFamily: typography.fontFamilyBold,
    fontSize: 14,
  },
  secondaryActionBtn: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#DBDBDB',
  },
  secondaryActionBtnText: {
    color: '#262626',
    fontFamily: typography.fontFamilyBold,
    fontSize: 14,
  },
  gridContainer: {
    marginTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: '#DBDBDB',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridPhotoWrapper: {
    width: SCREEN_WIDTH / 3,
    height: SCREEN_WIDTH / 3,
    padding: 1,
  },
  gridPhoto: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  emptyGridPlaceholder: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyGridText: {
    textAlign: 'center',
    marginTop: 12,
    fontSize: 14,
    color: '#8E8E8E',
    fontFamily: typography.fontFamilyRegular,
  },
  footerInfo: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  versionText: {
    paddingVertical: 20,
    textAlign: 'center',
    color: '#999',
    fontSize: 12,
  },
  miniStatsOverlay: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
  },
  miniStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  miniStatText: {
    color: '#FFF',
    fontSize: 10,
    fontFamily: typography.fontFamilyBold,
  },
});

export default ProfileScreen;
