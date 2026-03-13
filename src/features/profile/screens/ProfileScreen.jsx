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
import {useInitialLoad} from '../../../context/InitialLoadContext';
import FullScreenLoader from '../../../components/layout/FullScreenLoader';
import { usePhotoSocial } from '../../../hooks/usePhotoSocial';
import { photoSocialService } from '../../../services/photoSocialService';
import PhotoInteractionViewer from '../../../components/profile/PhotoInteractionViewer';
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
  const [activeTab, setActiveTab] = useState('gallery'); // gallery or insights
  
  // 📸 Social Interaction Engagement
  const { photosStats } = usePhotoSocial(userId);
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
      if (!visited.profile) {
        markVisited('profile');
      }
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
    return (
      <FullScreenLoader 
        visible={true} 
        message="Setting up your space…" 
      />
    );
  }

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
          <Pressable
            style={styles.headerIconBtn}
            onPress={() => navigation.navigate('ProfileDetails', {userId})}>
            <Icon
              name="plus-box-outline"
              size={26}
              color={colors.textPrimary}
            />
          </Pressable>
          <Text style={styles.headerTitle}>
            {firstName.toLowerCase() || 'profile'}
          </Text>
          <View style={styles.headerActions}>
            <Pressable
              style={styles.headerIconBtn}
              onPress={() => navigation.navigate('Wallet')}>
              <Icon name="wallet-outline" size={26} color={colors.textPrimary} />
            </Pressable>
            <Pressable
              style={styles.headerIconBtn}
              onPress={() => navigation.navigate('Settings')}>
              <Icon name="menu" size={26} color={colors.textPrimary} />
            </Pressable>
          </View>
        </View>

        {/* Profile Header (Avatar + Stats) */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarWrapper}>
              {photos.length > 0 ? (
                <Image source={{uri: photos[0]}} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Icon name="account" size={40} color={colors.textTertiary} />
                </View>
              )}
              {completionPercentage < 100 && (
                <LinearGradient
                  colors={[colors.primary, '#8E2DE2']}
                  style={styles.miniBadge}>
                  <Text style={styles.miniBadgeText}>
                    {completionPercentage}%
                  </Text>
                </LinearGradient>
              )}
              {profile?.isActiveToday && (
                <View style={styles.onlineIndicator} />
              )}
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile?.stats?.likes || 0}</Text>
              <Text style={styles.statLabel}>Likes</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {profile?.stats?.matches || 0}
              </Text>
              <Text style={styles.statLabel}>Matches</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {profile?.stats?.views >= 1000
                  ? `${(profile.stats.views / 1000).toFixed(1)}k`
                  : profile?.stats?.views || 0}
              </Text>
              <Text style={styles.statLabel}>Views</Text>
            </View>
          </View>
        </View>

        {/* Profile Strength Card (Bumble Style) */}
        {completionPercentage < 100 && (
          <Pressable
            onPress={() => navigation.navigate('ProfileDetails', {userId})}
            style={styles.strengthCard}>
            <LinearGradient
              colors={[colors.primary + '15', colors.primary + '05']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.strengthGradient}>
              <View style={styles.strengthHeader}>
                <View style={styles.strengthTextCol}>
                  <Text style={styles.strengthTitle}>
                    Profile Strength: {completionPercentage}%
                  </Text>
                  <Text style={styles.strengthSubtitle}>
                    Add photos for 3x more matches!
                  </Text>
                </View>
                <Icon name="chevron-right" size={24} color={colors.primary} />
              </View>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {width: `${completionPercentage}%`},
                  ]}
                />
              </View>
            </LinearGradient>
          </Pressable>
        )}

        {/* Bio Section */}
        <View style={styles.bioSection}>
          <Text style={styles.nameLabel}>
            {name}
            {age ? `, ${age}` : ''}
            {'  '}
            <Icon name="check-decagram" size={18} color={colors.primary} />
          </Text>

          {profile?.personalDetails?.jobTitle ||
          profile?.personalDetails?.school ? (
            <Text style={styles.occupationText}>
              {[
                profile?.personalDetails?.jobTitle,
                profile?.personalDetails?.school,
              ]
                .filter(Boolean)
                .join(' at ')}
            </Text>
          ) : null}

          <Text style={styles.bioText}>
            {profile?.bio ||
              profile?.profilePrompts?.aboutMe?.answer ||
              'Add a bio to express yourself...'}
          </Text>

          {/* Interests Chips */}
          {(profile?.interests || profile?.lifestyle?.interests || []).length >
            0 && (
            <View style={styles.interestsRow}>
              {(profile?.interests || profile?.lifestyle?.interests || [])
                .slice(0, 8)
                .map((interest, idx) => (
                  <View key={idx} style={styles.interestTag}>
                    <Text style={styles.interestTagText}>
                      #{interest.toLowerCase()}
                    </Text>
                  </View>
                ))}
            </View>
          )}

        {/* Credits/Wallet Balance Card (Integrated) */}
        <Pressable
          onPress={() => navigation.navigate('Wallet')}
          style={styles.walletShortcutCard}>
          <LinearGradient
            colors={['#FFD700' + '20', '#FFA500' + '10']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={styles.walletGradient}>
            <View style={styles.walletHeaderInfo}>
              <View style={styles.walletIconContainer}>
                <Icon name="piggy-bank" size={24} color="#DAA520" />
              </View>
              <View style={styles.walletTextCol}>
                <Text style={styles.walletTitle}>My Credits</Text>
                <Text style={styles.walletSubtitle}>
                  {profile?.credits || 0} Pryvo Credits
                </Text>
              </View>
              <Pressable
                style={styles.addCreditsBtn}
                onPress={() => navigation.navigate('Wallet')}>
                <Text style={styles.addCreditsText}>Buy More</Text>
              </Pressable>
            </View>
          </LinearGradient>
        </Pressable>
        </View>

        {/* Dating Intention Badge (Integrated) */}
        {profile?.datingPreferences?.datingIntention && (
          <View style={styles.intentWrapper}>
            <LinearGradient
              colors={['#8E2DE2', '#4A00E0']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 0}}
              style={styles.intentBadge}>
              <Icon
                name="heart-flash"
                size={16}
                color="#FFF"
                style={{marginRight: 6}}
              />
              <Text style={styles.intentBadgeText}>
                Looking for {profile.datingPreferences.datingIntention}
              </Text>
            </LinearGradient>
          </View>
        )}

        {/* Tabs Selection */}
        <View style={styles.tabsWrapper}>
          <Pressable
            onPress={() => setActiveTab('gallery')}
            style={[
              styles.tabBtn,
              activeTab === 'gallery' && styles.activeTabBtn,
            ]}>
            <Icon
              name="grid"
              size={24}
              color={activeTab === 'gallery' ? colors.primary : '#8E8E8E'}
            />
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('insights')}
            style={[
              styles.tabBtn,
              activeTab === 'insights' && styles.activeTabBtn,
            ]}>
            <Icon
              name="account-details-outline"
              size={24}
              color={activeTab === 'insights' ? colors.primary : '#8E8E8E'}
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
                  const stats = photosStats[photoId] || { likes: 0, commentsCount: 0 };
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
                              <Text style={styles.miniStatText}>{stats.likes}</Text>
                            </View>
                          )}
                          {stats.commentsCount > 0 && (
                            <View style={styles.miniStat}>
                              <Icon name="comment" size={12} color="#fff" />
                              <Text style={styles.miniStatText}>{stats.commentsCount}</Text>
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
                onPress={() => navigation.navigate('ProfileDetails', {userId})}>
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
                      <Icon name={item.icon} size={20} color={colors.primary} />
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
                    <Text style={styles.promptQuestion}>{prompt.question}</Text>
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
                  <Text style={styles.artistName}>The Weeknd • Daft Punk</Text>
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
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#EFEFEF',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: typography.fontFamilyBold,
    color: '#000',
    textTransform: 'lowercase',
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
  bioSection: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  nameLabel: {
    fontSize: 16,
    fontFamily: typography.fontFamilyBold,
    color: '#262626',
    marginBottom: 2,
  },
  occupationText: {
    fontSize: 14,
    fontFamily: typography.fontFamilyRegular,
    color: '#8E8E8E',
    marginBottom: 4,
  },
  bioText: {
    fontSize: 14,
    fontFamily: typography.fontFamilyRegular,
    color: '#262626',
    lineHeight: 18,
  },
  interestsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 6,
  },
  interestTag: {
    backgroundColor: colors.primary + '10',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  interestTagText: {
    fontSize: 12,
    fontFamily: typography.fontFamilyBold,
    color: colors.primary,
  },
  strengthCard: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 10,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.primary + '20',
  },
  strengthGradient: {
    padding: 16,
  },
  strengthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  strengthTextCol: {
    flex: 1,
  },
  strengthTitle: {
    fontSize: 15,
    fontFamily: typography.fontFamilyBold,
    color: '#000',
  },
  strengthSubtitle: {
    fontSize: 12,
    fontFamily: typography.fontFamilyRegular,
    color: '#666',
    marginTop: 2,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
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
