import React, {useState, useEffect, useCallback, useRef} from 'react';
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
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {colors, typography, spacing} from '../../../theme';
import {getProfile} from '../../../services/profile/profileService';
import streakService from '../../../services/streakService';
import {initSocket} from '../../../services/socket';
import { usePhotoSocial } from '../../../hooks/usePhotoSocial';
import { photoSocialService } from '../../../services/photoSocialService';
import PhotoInteractionViewer from '../../../components/profile/PhotoInteractionViewer';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring 
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../../context/AuthContext';
import ThemeBackground from '../../../components/layout/ThemeBackground';

import {
  likeUser,
  getDailyLikeInfo,
} from '../../../services/swipeActions';
import MatchPopup from '../../../components/profile/MatchPopup.js';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

// ─── UserProfileViewScreen ────────────────────────────────────────────────────
// Displays another user's public profile. Mirrors ProfileScreen structure
// but removes self-profile controls (edit, settings, strength card, prompts).
// ─────────────────────────────────────────────────────────────────────────────

const UserProfileViewScreen = ({navigation, route}) => {
  const {userId, theirName, theirPhoto, theirAge} = route.params || {};
  const { profile: myProfile } = useAuth();

  const [profile, setProfile] = useState(null);
  const [streak, setStreak] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('gallery');
  const [interactionStatus, setInteractionStatus] = useState({
    isLiked: false,
    isMatched: false,
    hasChat: false,
  });
  const [isSendingLike, setIsSendingLike] = useState(false);
  const [matchInfo, setMatchInfo] = useState({
    visible: false,
    myPhoto: null,
    theirPhoto: null,
    theirName: '',
    theirAge: null,
    matchId: null,
  });
  const socketRef = useRef(null);
  const insets = useSafeAreaInsets();
  
  // Animation for button press
  const buttonScale = useSharedValue(1);
  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  // 📸 Social Interaction System
  const { photosStats, handleLike, handleComment } = usePhotoSocial(userId);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [viewerVisible, setViewerVisible] = useState(false);

  // Setup sockets and basic user info once
  useEffect(() => {
    let socket;
    const setup = async () => {
      try {
        const userData = await AsyncStorage.getItem('@pryvo_user');
        if (userData && userData !== 'undefined') {
          const user = JSON.parse(userData);
          const myId = user.id || user._id;
          setCurrentUserId(myId);

          socket = initSocket(myId);
          socketRef.current = socket;

          socket.on('streak:update', data => {
            const ids = [myId, userId].sort();
            const pairId = `${ids[0]}_${ids[1]}`;
            if (data.userPairId === pairId) {
              setStreak(prev => ({
                ...(prev || {}),
                streakCount: data.streakCount || data.count,
              }));
            }
          });
        }
      } catch (e) {
        console.error('[UserProfileViewScreen] Setup error:', e);
      }
    };

    setup();

    return () => {
      if (socket) socket.off('streak:update');
    };
  }, [userId]);

  // Refresh data on screen focus
  useFocusEffect(
    useCallback(() => {
      if (userId) {
        loadData();
      }
    }, [userId]),
  );

  const loadData = async () => {
    try {
      if (!profile) setLoading(true);

      // Ensure we have currentUserId for streak fetch
      let myId = currentUserId;
      if (!myId) {
        const userData = await AsyncStorage.getItem('@pryvo_user');
        if (userData && userData !== 'undefined') {
          const user = JSON.parse(userData);
          myId = user.id || user._id;
          setCurrentUserId(myId);
        }
      }

      console.log(
        `[UserProfileViewScreen] Fetching for myId: ${myId}, theirId: ${userId}`,
      );

      const [profileRes, streakRes] = await Promise.all([
        getProfile(userId),
        myId
          ? streakService.getStreakForPair(myId, userId)
          : Promise.resolve(null),
      ]);

      const profileData = profileRes?.profile || profileRes;
      console.log(
        '[UserProfileViewScreen] Profile matchScore:',
        profileData?.matchScore,
      );
      console.log('[UserProfileViewScreen] Streak data:', streakRes);

      setProfile(profileData);
      setStreak(streakRes);
      
      if (profileData?.interaction) {
        setInteractionStatus(profileData.interaction);
      }
    } catch (error) {
      console.error('[UserProfileViewScreen] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // ── Derived data ─────────────────────────────────────────────────────────────

  const formatJoinedDate = (dateString) => {
    if (!dateString) return '--';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '--';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const joinedDate = formatJoinedDate(profile?.createdAt || profile?.joinedAt);

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

  const bio = profile?.bio || profile?.profilePrompts?.aboutMe?.answer || null;

  const jobTitle = profile?.personalDetails?.jobTitle || null;
  const school = profile?.personalDetails?.school || null;

  const getZodiacIcon = sign => {
    const map = {
      aries: 'zodiac-aries',
      taurus: 'zodiac-taurus',
      gemini: 'zodiac-gemini',
      cancer: 'zodiac-cancer',
      virgo: 'zodiac-virgo',
      libra: 'zodiac-libra',
      scorpio: 'zodiac-scorpio',
      sagittarius: 'zodiac-sagittarius',
      capricorn: 'zodiac-capricorn',
      aquarius: 'zodiac-aquarius',
      pisces: 'zodiac-pisces',
      leo: 'zodiac-leo',
    };
    return map[sign?.toLowerCase()] || 'star-face';
  };

  // Only show basics that exist
  const basicsItems = [
    profile?.personalDetails?.height && {
      label: `${profile.personalDetails.height} cm`,
      icon: 'arrow-up-down',
    },
    profile?.personalDetails?.starSign && {
      label: profile.personalDetails.starSign,
      icon: getZodiacIcon(profile.personalDetails.starSign),
    },
    profile?.personalDetails?.educationLevel && {
      label: profile.personalDetails.educationLevel,
      icon: 'school-outline',
    },
    profile?.lifestyle?.religiousBeliefs && {
      label: profile.lifestyle.religiousBeliefs,
      icon: 'hands-pray',
    },
    profile?.lifestyle?.politicalBeliefs && {
      label: profile.lifestyle.politicalBeliefs,
      icon: 'scale-balance',
    },
    profile?.lifestyle?.drink && {
      label: profile.lifestyle.drink,
      icon: 'glass-wine',
    },
    profile?.lifestyle?.smokeTobacco && {
      label: profile.lifestyle.smokeTobacco,
      icon: 'smoking-off',
    },
  ].filter(Boolean);

  const datingIntention = profile?.datingPreferences?.datingIntention || null;

  const handleSendLike = async () => {
    if (!currentUserId || !userId || isSendingLike) return;

    try {
      setIsSendingLike(true);
      
      // Get current premium status
      const likeInfo = await getDailyLikeInfo(currentUserId);
      const isPremium = likeInfo?.isPremium || false;

      const res = await likeUser(currentUserId, userId, isPremium);
      
      if (res.success) {
        setInteractionStatus(prev => ({ ...prev, isLiked: true }));
        
        if (res.isMatch && res.match) {
          // It's a match!
          const myPhoto = myProfile?.media?.media?.[0]?.url || myProfile?.photos?.[0] || null;

          setMatchInfo({
            visible: true,
            myPhoto: myPhoto,
            theirPhoto: photos[0] || null,
            theirName: name,
            theirAge: age,
            matchId: res.match._id,
          });
          setInteractionStatus(prev => ({ ...prev, isMatched: true }));
        }
      }
    } catch (err) {
      console.error('[UserProfileViewScreen] Like error:', err);
      if (err?.limitReached) {
        Alert.alert(
          'Limit Reached',
          err.message || "You've reached your daily like limit. Come back tomorrow!"
        );
      } else {
        Alert.alert('Error', 'Failed to send like. Please try again.');
      }
    } finally {
      setIsSendingLike(false);
    }
  };

  const isOwner = currentUserId === userId;
  const showMatchButton = !isOwner && !interactionStatus.isMatched && !interactionStatus.hasChat;

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
      {/* Right Spacer for Header Balance (Transparent) */}
      <View style={styles.headerSpacer} />
    </View>
  );

  // ── Loading state ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <ThemeBackground>
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
          <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
          {renderHeader()}
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading profile…</Text>
          </View>
        </SafeAreaView>
      </ThemeBackground>
    );
  }

  // ── Main render ──────────────────────────────────────────────────────────────
  return (
    <ThemeBackground>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
        {renderHeader()}

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}>
          
          {/* 🔥 Hero Section: Centered Avatar with Overlapping Name (Redesigned) */}
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
                        color="#CCC"
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
                <Text style={styles.heroName}>
                  {name}
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
                {bio || 'Ready to explore matches...'}
              </Text>
            </View>

            {/* Combined CTA Block */}
            <View style={styles.actionButtonsRow}>
               {/* Main Match Button (Replaces Complete Profile placement) */}
               {showMatchButton && (
                  <View style={styles.matchButtonWrapper}>
                    <Animated.View style={animatedButtonStyle}>
                      <Pressable
                        disabled={interactionStatus.isLiked || isSendingLike}
                        onPressIn={() => (buttonScale.value = withSpring(0.96))}
                        onPressOut={() => (buttonScale.value = withSpring(1))}
                        onPress={handleSendLike}
                        style={styles.primaryCtaBtn}>
                        <LinearGradient
                          colors={interactionStatus.isLiked ? ['#F3F4F6', '#E5E7EB'] : [colors.primary, '#8E2DE2']}
                          start={{x: 0, y: 0}}
                          end={{x: 1, y: 0}}
                          style={styles.ctaGradient}>
                          <Icon
                            name={interactionStatus.isLiked ? "check-circle" : "heart"}
                            size={20}
                            color={interactionStatus.isLiked ? colors.textSecondary : "#FFF"}
                            style={{marginRight: 10}}
                          />
                          <Text style={[
                              styles.ctaText,
                              interactionStatus.isLiked && {color: colors.textSecondary}
                          ]}>
                            {isSendingLike ? '...' : (interactionStatus.isLiked ? 'Request Sent' : 'Send Match')}
                          </Text>
                        </LinearGradient>
                      </Pressable>
                    </Animated.View>
                  </View>
               )}
            </View>

            {/* Dating Intention Badge (Below main CTA) */}
            {datingIntention && (
              <View style={styles.intentWrapper}>
                <LinearGradient
                  colors={['rgba(142, 45, 226, 0.1)', 'rgba(74, 0, 224, 0.05)']}
                  style={styles.intentBadge}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 0}}>
                  <Icon
                    name="heart-flash"
                    size={14}
                    color={colors.primary}
                    style={{marginRight: 6}}
                  />
                  <Text style={[styles.intentBadgeText, {color: colors.primary}]}>
                    Looking for {datingIntention}
                  </Text>
                </LinearGradient>
              </View>
            )}
          </View>

          {/* 📊 Stats Row: Refined Hierarchy (Photos, Streak, Joined) */}
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{photos.length}</Text>
              <Text style={styles.statSublabel}>Photos</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>
                {streak?.streakCount || streak?.count || profile?.streakCount || 0}
                {'  '}
                <Text style={styles.statEmoji}>🔥</Text>
              </Text>
              <Text style={styles.statSublabel}>Streak</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statNumber} numberOfLines={1}>
                {joinedDate}
              </Text>
              <Text style={styles.statSublabel}>Joined</Text>
            </View>
          </View>

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
                size={22}
                color={activeTab === 'gallery' ? colors.primary : '#8E8E8E'}
              />
            </Pressable>
            <Pressable
              onPress={() => setActiveTab('details')}
              style={[
                styles.tabBtn,
                activeTab === 'details' && styles.activeTabBtn,
              ]}>
              <Icon
                name="account-details-outline"
                size={22}
                color={activeTab === 'details' ? colors.primary : '#8E8E8E'}
              />
            </Pressable>
          </View>

          {activeTab === 'gallery' ? (
            /* ── Photo Grid Tab ── */
            <View style={styles.photoGrid}>
              {photos.length > 0 ? (
                photos.map((uri, idx) => {
                  const pId = photoSocialService.generatePhotoId(uri);
                  const photoStats = photosStats[pId] || { likes: 0, commentsCount: 0, isLiked: false };
                  const isOwner = currentUserId === userId;

                  return (
                    <View key={idx} style={styles.gridPhotoWrapper}>
                      <Pressable
                        style={styles.gridPhoto}
                        onPress={() => {
                          setSelectedPhoto(uri);
                          setViewerVisible(true);
                        }}
                      >
                        <Image
                          source={{uri}}
                          style={styles.gridPhoto}
                          resizeMode="cover"
                        />
                        {/* 📸 Social interaction badges (mini) */}
                        {isOwner && (photoStats.likes > 0 || photoStats.commentsCount > 0) && (
                          <View style={styles.miniStatsOverlay}>
                            {photoStats.likes > 0 && (
                              <View style={styles.miniStat}>
                                <Icon name="heart" size={10} color="#fff" />
                                <Text style={styles.miniStatText}>{photoStats.likes}</Text>
                              </View>
                            )}
                            {photoStats.commentsCount > 0 && (
                              <View style={styles.miniStat}>
                                <Icon name="comment" size={10} color="#fff" />
                                <Text style={styles.miniStatText}>{photoStats.commentsCount}</Text>
                              </View>
                            )}
                          </View>
                        )}
                      </Pressable>
                    </View>
                  );
                })
              ) : (
                  <View style={styles.emptyGridPlaceholder}>
                      <Icon name="image-off-outline" size={48} color="#DDD" />
                      <Text style={styles.emptyGridText}>No photos shared yet</Text>
                  </View>
              )}
            </View>
          ) : (
            /* ── Details Tab (Mapped to ProfileScreen Grid Style) ── */
            <View style={styles.insightsWrapper}>
              
              {/* Work & Education */}
              {(jobTitle || school) && (
                  <View style={styles.basicsGridSection}>
                      <Text style={styles.insightSectionTitle}>Work & Education</Text>
                      <View style={styles.basicsGrid}>
                          {jobTitle && (
                              <View style={styles.basicGridItem}>
                                  <Icon name="briefcase-outline" size={18} color={colors.primary} />
                                  <Text style={styles.basicGridLabel}>{jobTitle}</Text>
                              </View>
                          )}
                          {school && (
                              <View style={styles.basicGridItem}>
                                  <Icon name="school-outline" size={18} color={colors.primary} />
                                  <Text style={styles.basicGridLabel}>{school}</Text>
                              </View>
                          )}
                      </View>
                  </View>
              )}

              {/* Basics Grid */}
              {basicsItems.length > 0 && (
                  <View style={styles.basicsGridSection}>
                      <Text style={styles.insightSectionTitle}>About Me</Text>
                      <View style={styles.basicsGrid}>
                          {basicsItems.map((item, idx) => (
                              <View key={idx} style={styles.basicGridItem}>
                                  <Icon name={item.icon} size={18} color={colors.primary} />
                                  <Text style={styles.basicGridLabel}>{item.label}</Text>
                              </View>
                          ))}
                      </View>
                  </View>
              )}

              {/* Prompts Section */}
              {profile?.profilePrompts && (
                  <View style={styles.promptsSection}>
                      {Object.values(profile.profilePrompts).filter(p => p.question && p.answer).map((prompt, idx) => (
                          <View key={idx} style={styles.promptCard}>
                              <Text style={styles.promptQuestion}>{prompt.question}</Text>
                              <Text style={styles.promptAnswer}>{prompt.answer}</Text>
                          </View>
                      ))}
                  </View>
              )}
            </View>
          )}
        </ScrollView>

        <MatchPopup
          visible={matchInfo.visible}
          myPhoto={matchInfo.myPhoto}
          theirPhoto={matchInfo.theirPhoto}
          theirName={matchInfo.theirName}
          onContinue={() => setMatchInfo(prev => ({...prev, visible: false}))}
          onMessage={() => {
              const { matchId, theirName, theirPhoto, theirAge } = matchInfo;
              const theirId = userId;
              setMatchInfo(prev => ({...prev, visible: false}));
              if (matchId && theirId) {
                navigation.navigate('ChatScreen', {
                  matchId, 
                  theirId, 
                  theirName, 
                  theirPhoto, 
                  theirAge
                });
              }
          }}
        />

        <PhotoInteractionViewer
          visible={viewerVisible}
          onClose={() => setViewerVisible(false)}
          photoUrl={selectedPhoto}
          targetUserId={userId}
          currentUserId={currentUserId}
          navigation={navigation}
        />
      </SafeAreaView>
    </ThemeBackground>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingBottom: 100,
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
    textTransform: 'lowercase',
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
  headerSpacer: {
    width: 44,
    height: 44,
  },
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
    marginTop: -16,
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
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  actionButtonsRow: {
    marginTop: 20,
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  matchButtonWrapper: {
    width: '100%',
    maxWidth: 320,
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 8,
  },
  primaryCtaBtn: {
    borderRadius: 30,
    width: '100%',
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
  },
  ctaText: {
    color: '#FFF',
    fontSize: 15,
    fontFamily: typography.fontFamilyBold,
  },
  intentWrapper: {
    marginTop: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  intentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.primary + '20',
  },
  intentBadgeText: {
    fontSize: 13,
    fontFamily: typography.fontFamilyBold,
    color: colors.primary,
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
    marginVertical: 12,
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
  statEmoji: {
    fontSize: 16,
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
    width: SCREEN_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyGridText: {
    marginTop: 12,
    fontSize: 14,
    color: '#999',
    fontFamily: typography.fontFamilyRegular,
    textAlign: 'center',
  },
  insightsWrapper: {
    paddingTop: 20,
    paddingBottom: 60,
  },
  insightSectionTitle: {
    fontSize: 14,
    fontFamily: typography.fontFamilyBold,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  basicsGridSection: {
    marginBottom: 28,
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
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    minWidth: (SCREEN_WIDTH - 52) / 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  basicGridLabel: {
    fontSize: 14,
    fontFamily: typography.fontFamilyMedium,
    color: '#374151',
    marginLeft: 10,
  },
  promptsSection: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  promptCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  promptQuestion: {
    fontSize: 12,
    fontFamily: typography.fontFamilyBold,
    color: '#9CA3AF',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  promptAnswer: {
    fontSize: 16,
    fontFamily: typography.fontFamilyMedium,
    color: '#1F2937',
    lineHeight: 24,
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

export default UserProfileViewScreen;
