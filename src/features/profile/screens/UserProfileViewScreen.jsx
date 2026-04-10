import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  Dimensions,
  StatusBar,
  Platform,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import PremiumLoader from '../../../components/common/PremiumLoader';
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
import {usePhotoSocial} from '../../../hooks/usePhotoSocial';
import {photoSocialService} from '../../../services/photoSocialService';
import PhotoInteractionViewer from '../../../components/profile/PhotoInteractionViewer';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useAuth} from '../../../context/AuthContext';
import ThemeBackground from '../../../components/layout/ThemeBackground';

import {likeUser, getDailyLikeInfo} from '../../../services/swipeActions';
import {blockAndReportUser} from '../../../services/chatService';
import MatchPopup from '../../../components/profile/MatchPopup.js';
import {formatToTitleCase} from '../../../utils/safeUtils';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

const REPORT_REASONS = [
  {id: 'harassment', label: 'Harassment'},
  {id: 'spam', label: 'Spam'},
  {id: 'inappropriate_content', label: 'Inappropriate Content'},
  {id: 'fake_profile', label: 'Fake Profile'},
  {id: 'underage', label: 'Underage User'},
  {id: 'other', label: 'Other'},
];

const UserProfileViewScreen = ({navigation, route}) => {
  const {userId, theirName, theirPhoto, theirAge} = route.params || {};
  const {profile: myProfile} = useAuth();

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
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState(null);
  const [reportDescription, setReportDescription] = useState('');
  const socketRef = useRef(null);
  const insets = useSafeAreaInsets();

  const buttonScale = useSharedValue(1);
  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{scale: buttonScale.value}],
  }));

  // 📸 Social Interaction System
  const {photosStats, handleLike, handleComment} = usePhotoSocial(userId);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [viewerVisible, setViewerVisible] = useState(false);

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

  useFocusEffect(
    useCallback(() => {
      if (userId) loadData();
    }, [userId]),
  );

  const loadData = async () => {
    try {
      if (!profile) setLoading(true);
      let myId = currentUserId;
      if (!myId) {
        const userData = await AsyncStorage.getItem('@pryvo_user');
        if (userData && userData !== 'undefined') {
          const user = JSON.parse(userData);
          myId = user.id || user._id;
          setCurrentUserId(myId);
        }
      }
      const [profileRes, streakRes] = await Promise.all([
        getProfile(userId),
        myId ? streakService.getStreakForPair(myId, userId) : Promise.resolve(null),
      ]);
      const profileData = profileRes?.profile || profileRes;
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

  const formatJoinedDate = dateString => {
    if (!dateString) return '--';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '--';
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const joinedDate = formatJoinedDate(profile?.createdAt || profile?.joinedAt);
  const photos = profile?.photos || profile?.media?.media?.map(m => m.url).filter(Boolean) || (theirPhoto ? [theirPhoto] : []);
  const firstName = profile?.basicInfo?.firstName || profile?.basicInfo?.name || profile?.name || theirName || '';
  const lastName = profile?.basicInfo?.lastName || '';
  const name = firstName ? (lastName ? `${firstName} ${lastName}` : firstName) : theirName || 'User';
  const age = profile?.age || profile?.personalDetails?.age || profile?.basicInfo?.age || theirAge || null;
  const bio = profile?.bio || profile?.profilePrompts?.aboutMe?.answer || null;
  const jobTitle = profile?.personalDetails?.jobTitle || null;
  const school = profile?.personalDetails?.school || null;

  const getZodiacIcon = sign => {
    const map = { aries: 'zodiac-aries', taurus: 'zodiac-taurus', gemini: 'zodiac-gemini', cancer: 'zodiac-cancer', virgo: 'zodiac-virgo', libra: 'zodiac-libra', scorpio: 'zodiac-scorpio', sagittarius: 'zodiac-sagittarius', capricorn: 'zodiac-capricorn', aquarius: 'zodiac-aquarius', pisces: 'zodiac-pisces', leo: 'zodiac-leo' };
    return map[sign?.toLowerCase()] || 'star-face';
  };

  const basicsItems = [
    profile?.personalDetails?.height && { label: `${profile.personalDetails.height} cm`, icon: 'arrow-up-down' },
    profile?.personalDetails?.starSign && { label: profile.personalDetails.starSign, icon: getZodiacIcon(profile.personalDetails.starSign) },
    profile?.personalDetails?.educationLevel && { label: profile.personalDetails.educationLevel, icon: 'school-outline' },
    profile?.lifestyle?.religiousBeliefs && { label: profile.lifestyle.religiousBeliefs, icon: 'hands-pray' },
    profile?.lifestyle?.politicalBeliefs && { label: profile.lifestyle.politicalBeliefs, icon: 'scale-balance' },
    profile?.lifestyle?.drink && { label: profile.lifestyle.drink, icon: 'glass-wine' },
    profile?.lifestyle?.smokeTobacco && { label: profile.lifestyle.smokeTobacco, icon: 'smoking-off' },
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
        setInteractionStatus(prev => ({...prev, isLiked: true}));

        if (res.isMatch && res.match) {
          // It's a match!
          const myPhoto =
            myProfile?.media?.media?.[0]?.url || myProfile?.photos?.[0] || null;

          setMatchInfo({
            visible: true,
            myPhoto,
            theirPhoto: photos[0] || null,
            theirName: formatToTitleCase(name),
            theirAge: age,
            matchId: res.match._id,
          });
          setInteractionStatus(prev => ({...prev, isMatched: true}));
        }
      }
    } catch (err) {
      console.warn('[UserProfileViewScreen] Like Error:', err?.message);
      
      const isLimitError = 
        err?.response?.status === 429 || 
        err?.limitReached || 
        (err?.message && err.message.toLowerCase().includes('limit'));

      if (isLimitError) {
        Alert.alert(
          'Daily Limit reached',
          'Daily limit exceeded. Buy premium or try again tomorrow.',
        );
      } else {
        Alert.alert('Error', err?.message || 'Failed to send like. Please try again.');
      }
    } finally {
      setIsSendingLike(false);
    }
  };

  const handleBlockAndReport = async () => {
    if (!selectedReason) { Alert.alert('Error', 'Please select a reason'); return; }
    try {
      await blockAndReportUser({ blockerId: currentUserId, blockedId: userId, reason: selectedReason, description: reportDescription || null });
      setShowReportModal(false);
      Alert.alert('User Blocked', 'User has been blocked and reported.', [{text: 'OK', onPress: () => navigation.goBack()}]);
    } catch (e) {
      console.error('[UserProfileViewScreen] Block error', e);
      Alert.alert('Error', 'Failed to block user.');
    }
  };

  const isOwner = currentUserId === userId;
  const showMatchButton =
    !isOwner && !interactionStatus.isMatched && !interactionStatus.hasChat;

  const renderHeader = () => (
    <View style={styles.header}>
      <Pressable style={styles.headerIconBtn} onPress={() => navigation.goBack()}>
        <Icon name="chevron-left" size={28} color={colors.textPrimary} />
      </Pressable>
      <Text style={styles.headerTitle} numberOfLines={1}>
        Inside Their World 🌍
      </Text>
      {!isOwner ? (
        <Pressable style={styles.headerIconBtn} onPress={() => setShowReportModal(true)}>
          <Icon name="dots-vertical" size={24} color={colors.textPrimary} />
        </Pressable>
      ) : <View style={styles.headerSpacer} />}
    </View>
  );

  if (loading) return (
    <ThemeBackground>
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
        {renderHeader()}
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color={colors.primary} /></View>
      </SafeAreaView>
    </ThemeBackground>
  );

  return (
    <ThemeBackground>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar
          barStyle="dark-content"
          translucent
          backgroundColor="transparent"
        />
        {renderHeader()}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}>
          {/* 🔥 Hero Section: Centered Avatar with Overlapping Name (Redesigned) */}
          <View style={styles.heroSection}>
            <View style={styles.avatarGlowWrapper}>
              <LinearGradient colors={[colors.primary, '#E040C8']} style={styles.avatarGradientBorder}>
                <View style={styles.avatarInnerContainer}>
                  {photos.length > 0 ? (
                    <Image
                      source={{uri: photos[0]}}
                      style={styles.headerAvatar}
                    />
                  ) : (
                    <View style={styles.headerAvatarPlaceholder}>
                      <Icon name="account" size={48} color="#CCC" />
                    </View>
                  )}
                </View>
              </LinearGradient>
              {profile?.isActiveToday && <View style={styles.onlineStatusDot} />}
            </View>
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
              <Text style={styles.heroBio} numberOfLines={2}>{bio || 'Ready to explore matches...'}</Text>
            </View>
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
                        colors={
                          interactionStatus.isLiked
                            ? ['#F3F4F6', '#E5E7EB']
                            : [colors.primary, '#8E2DE2']
                        }
                        start={{x: 0, y: 0}}
                        end={{x: 1, y: 0}}
                        style={styles.ctaGradient}>
                        <Icon
                          name={
                            interactionStatus.isLiked ? 'check-circle' : 'heart'
                          }
                          size={20}
                          color={
                            interactionStatus.isLiked
                              ? colors.textSecondary
                              : '#FFF'
                          }
                          style={{marginRight: 10}}
                        />
                        <Text
                          style={[
                            styles.ctaText,
                            interactionStatus.isLiked && {
                              color: colors.textSecondary,
                            },
                          ]}>
                          {isSendingLike
                            ? '...'
                            : interactionStatus.isLiked
                            ? 'Request Sent'
                            : 'Send Match'}
                        </Text>
                      </LinearGradient>
                    </Pressable>
                  </Animated.View>
                </View>
              )}
            </View>
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
                  <Text
                    style={[styles.intentBadgeText, {color: colors.primary}]}>
                    Looking for {datingIntention}
                  </Text>
                </LinearGradient>
              </View>
            )}
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statBox}><Text style={styles.statNumber}>{photos.length}</Text><Text style={styles.statSublabel}>Photos</Text></View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>
                {streak?.streakCount ||
                  streak?.count ||
                  profile?.streakCount ||
                  0}
                {'  '}
                <Text style={styles.statEmoji}>🔥</Text>
              </Text>
              <Text style={styles.statSublabel}>Streak</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}><Text style={styles.statNumber}>{joinedDate}</Text><Text style={styles.statSublabel}>Joined</Text></View>
          </View>

          <View style={styles.tabsWrapper}>
            <Pressable onPress={() => setActiveTab('gallery')} style={[styles.tabBtn, activeTab === 'gallery' && styles.activeTabBtn]}>
              <Icon name="grid" size={22} color={activeTab === 'gallery' ? colors.primary : '#8E8E8E'} />
            </Pressable>
            <Pressable onPress={() => setActiveTab('details')} style={[styles.tabBtn, activeTab === 'details' && styles.activeTabBtn]}>
              <Icon name="account-details-outline" size={22} color={activeTab === 'details' ? colors.primary : '#8E8E8E'} />
            </Pressable>
          </View>

          {activeTab === 'gallery' ? (
            <View style={styles.photoGrid}>
              {photos.length > 0 ? (
                photos.map((uri, idx) => {
                  const pId = photoSocialService.generatePhotoId(uri);
                  const photoStats = photosStats[pId] || {
                    likes: 0,
                    commentsCount: 0,
                    isLiked: false,
                  };
                  const isOwner = currentUserId === userId;

                  return (
                    <View key={idx} style={styles.gridPhotoWrapper}>
                      <Pressable
                        style={styles.gridPhoto}
                        onPress={() => {
                          setSelectedPhoto(uri);
                          setViewerVisible(true);
                        }}>
                        <Image
                          source={{uri}}
                          style={styles.gridPhoto}
                          resizeMode="cover"
                        />
                        {/* 📸 Social interaction badges (mini) */}
                        {isOwner &&
                          (photoStats.likes > 0 ||
                            photoStats.commentsCount > 0) && (
                            <View style={styles.miniStatsOverlay}>
                              {photoStats.likes > 0 && (
                                <View style={styles.miniStat}>
                                  <Icon name="heart" size={10} color="#fff" />
                                  <Text style={styles.miniStatText}>
                                    {photoStats.likes}
                                  </Text>
                                </View>
                              )}
                              {photoStats.commentsCount > 0 && (
                                <View style={styles.miniStat}>
                                  <Icon name="comment" size={10} color="#fff" />
                                  <Text style={styles.miniStatText}>
                                    {photoStats.commentsCount}
                                  </Text>
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
            <View style={styles.insightsWrapper}>
              {(jobTitle || school) && (
                <View style={styles.basicsGridSection}>
                  <Text style={styles.insightSectionTitle}>
                    Work & Education
                  </Text>
                  <View style={styles.basicsGrid}>
                    {jobTitle && (
                      <View style={styles.basicGridItem}>
                        <Icon
                          name="briefcase-outline"
                          size={18}
                          color={colors.primary}
                        />
                        <Text style={styles.basicGridLabel}>{jobTitle}</Text>
                      </View>
                    )}
                    {school && (
                      <View style={styles.basicGridItem}>
                        <Icon
                          name="school-outline"
                          size={18}
                          color={colors.primary}
                        />
                        <Text style={styles.basicGridLabel}>{school}</Text>
                      </View>
                    )}
                  </View>
                </View>
              )}
              {basicsItems.length > 0 && (
                <View style={styles.basicsGridSection}>
                  <Text style={styles.insightSectionTitle}>About Me</Text>
                  <View style={styles.basicsGrid}>
                    {basicsItems.map((item, idx) => (
                      <View key={idx} style={styles.basicGridItem}>
                        <Icon
                          name={item.icon}
                          size={18}
                          color={colors.primary}
                        />
                        <Text style={styles.basicGridLabel}>{item.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
              {profile?.profilePrompts && (
                <View style={styles.promptsSection}>
                  {Object.values(profile.profilePrompts)
                    .filter(p => p.question && p.answer)
                    .map((prompt, idx) => (
                      <View key={idx} style={styles.promptCard}>
                        <Text style={styles.promptQuestion}>
                          {prompt.question}
                        </Text>
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
          theirAge={matchInfo.theirAge}
          onContinue={() => setMatchInfo(prev => ({...prev, visible: false}))}
          onMessage={() => {
            const {matchId, theirName, theirPhoto, theirAge} = matchInfo;
            const theirId = userId;
            setMatchInfo(prev => ({...prev, visible: false}));
            if (matchId && theirId) {
              navigation.navigate('ChatScreen', {
                matchId,
                theirId,
                theirName,
                theirPhoto,
                theirAge,
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

        <PremiumLoader
          visible={loading}
          text="Finding your perfect match💫"
          minDuration={600}
        />
        
        <Modal visible={showReportModal} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setShowReportModal(false)}>
          <Pressable style={styles.modalOverlayCentered} onPress={() => setShowReportModal(false)}>
            <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
              <Text style={styles.modalTitle}>Report & Block User</Text>
              <Text style={styles.modalSubtitle}>Why are you reporting this user?</Text>
              {REPORT_REASONS.map(reason => (
                <Pressable key={reason.id} style={[styles.reasonItem, selectedReason === reason.id && styles.reasonItemSelected]} onPress={() => setSelectedReason(reason.id)}>
                  <Text style={[styles.reasonText, selectedReason === reason.id && styles.reasonTextSelected]}>{reason.label}</Text>
                </Pressable>
              ))}
              <View style={styles.modalButtons}>
                <Pressable style={styles.cancelButton} onPress={() => { setShowReportModal(false); setSelectedReason(null); }}><Text style={styles.cancelButtonText}>Cancel</Text></Pressable>
                <Pressable style={[styles.reportButton, !selectedReason && styles.reportButtonDisabled]} onPress={handleBlockAndReport} disabled={!selectedReason}><Text style={styles.reportButtonText}>Submit</Text></Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
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
    width: 200,
    height: 200,
    borderRadius: 100,
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInnerContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 100,
    backgroundColor: '#FFF',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  headerAvatar: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  headerAvatarPlaceholder: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineStatusDot: {
    position: 'absolute',
    bottom: 15,
    right: 15,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#22C55E',
    borderWidth: 4,
    borderColor: '#FFF',
    zIndex: 3,
  },
  identityBlockOverlay: {
    marginTop: -40,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 30,
    padding: 24,
    width: SCREEN_WIDTH * 0.85,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  nameRowCentered: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  heroName: {
    fontSize: 26,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
    marginRight: 6,
  },
  verificationIcon: {
    marginLeft: 4,
  },
  heroBio: {
    fontSize: 15,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
    width: '100%',
    paddingHorizontal: 24,
  },
  matchButtonWrapper: {
    flex: 1,
    maxWidth: 240,
  },
  primaryCtaBtn: {
    borderRadius: 30,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  ctaText: {
    fontSize: 17,
    fontFamily: typography.fontFamilyBold,
    color: '#FFF',
  },
  intentWrapper: {
    marginTop: 24,
    alignItems: 'center',
  },
  intentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  intentBadgeText: {
    fontSize: 14,
    fontFamily: typography.fontFamilyBold,
    color: colors.primary,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    marginHorizontal: 20,
    backgroundColor: '#FFF',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 18,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  statEmoji: {
    fontSize: 16,
  },
  statSublabel: {
    fontSize: 12,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statDivider: {
    width: 1,
    height: '60%',
    backgroundColor: '#F3F4F6',
    alignSelf: 'center',
  },
  tabsWrapper: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginTop: 24,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabBtn: {
    borderBottomColor: colors.primary,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
  },
  gridPhotoWrapper: {
    width: SCREEN_WIDTH / 3 - 14,
    aspectRatio: 1,
    margin: 7,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  gridPhoto: {
    width: '100%',
    height: '100%',
  },
  emptyGridPlaceholder: {
    width: '100%',
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyGridText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textSecondary,
  },
  insightsWrapper: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  insightSectionTitle: {
    fontSize: 16,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
    marginBottom: 16,
    marginTop: 24,
  },
  basicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  basicGridItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  basicGridLabel: {
    marginLeft: 8,
    fontSize: 14,
    fontFamily: typography.fontFamilyMedium,
    color: colors.textPrimary,
  },
  promptsSection: {
    marginTop: 12,
  },
  promptCard: {
    backgroundColor: colors.primary + '08',
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  promptQuestion: {
    fontSize: 14,
    fontFamily: typography.fontFamilyBold,
    color: colors.primary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  promptAnswer: {
    fontSize: 20,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
    lineHeight: 28,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniStatsOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingVertical: 4,
    gap: 10,
  },
  miniStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  miniStatText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: typography.fontFamilyBold,
  },
  // Modal Styles
  modalOverlayCentered: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 30,
    padding: 30,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: typography.fontFamilyBold,
    color: '#000',
    textAlign: 'center',
    marginBottom: 12,
  },
  modalSubtitle: {
    fontSize: 15,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  reasonItem: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 15,
    backgroundColor: '#F9FAFB',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  reasonItemSelected: {
    backgroundColor: colors.primary + '10',
    borderColor: colors.primary,
  },
  reasonText: {
    fontSize: 15,
    fontFamily: typography.fontFamilyMedium,
    color: colors.textPrimary,
  },
  reasonTextSelected: {
    color: colors.primary,
    fontFamily: typography.fontFamilyBold,
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 15,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 15,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: typography.fontFamilyBold,
    color: colors.textSecondary,
  },
  reportButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 15,
    backgroundColor: '#EF4444',
    alignItems: 'center',
  },
  reportButtonDisabled: {
    backgroundColor: '#FCA5A5',
  },
  reportButtonText: {
    fontSize: 16,
    fontFamily: typography.fontFamilyBold,
    color: '#FFF',
  },
});

export default UserProfileViewScreen;
