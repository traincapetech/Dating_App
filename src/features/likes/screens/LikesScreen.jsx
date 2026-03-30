import React, {useEffect, useState, useCallback, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Animated,
  Platform,
  StatusBar,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useFocusEffect} from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import {colors, typography, spacing} from '../../../theme';
import {getLikesReceived, likeUser, rejectLike} from '../../../services/swipeActions';
import {fetchMatches, fetchPreviousInteractions} from '../../../services/chatService';
import {useLoading} from '../../../context/LoadingContext';
import {useInitialLoad} from '../../../context/InitialLoadContext';
import FullScreenLoader from '../../../components/layout/FullScreenLoader';
import MatchPopup from '../../../components/profile/MatchPopup';
import {useAuth} from '../../../context/AuthContext';
import ThemeBackground from '../../../components/layout/ThemeBackground';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

/**
 * 🌠 MatchesScreen: PREMIUM PURPLE BRANDING
 * Engineered for elite visual hierarchy and modern dating app aesthetics.
 */

// --- Reusable Internal Components ---

const MatchAvatar = ({item, onPress}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.avatarWrapperUnified}>
      <Animated.View style={{transform: [{scale: scaleAnim}], alignItems: 'center'}}>
        <View style={styles.avatarGlowUnified}>
          <LinearGradient
            colors={['#6A0DAD', '#B19CD9']} // Purple Glow Branding
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={styles.ringUnified}>
            <Image
              source={{
                uri: item.theirPhoto || `https://ui-avatars.com/api/?background=6A0DAD&color=fff&name=${item.theirName || 'U'}`,
              }}
              style={styles.imageUnified}
            />
          </LinearGradient>
          <View style={styles.onlineStatusUnified}>
             <View style={styles.onlineDotUnified} />
          </View>
        </View>
        <Text style={styles.nameUnified} numberOfLines={1}>
          {item.theirName?.split(' ')[0]}
        </Text>
      </Animated.View>
    </Pressable>
  );
};

const SectionHeaderUnified = ({title, isSubsection, showSeeAll, onPressSeeAll, isExpanded}) => (
  <View style={[styles.headerRowUnified, isSubsection && {marginTop: 18, marginBottom: 12}]}>
    <Text style={isSubsection ? styles.subsectionTitleUnified : styles.mainHeaderTitleUnified}>
      {title}
    </Text>
    {showSeeAll && (
      <Pressable onPress={onPressSeeAll} style={styles.seeAllBtnUnified}>
        <Text style={styles.seeAllTextUnified}>
          {isExpanded ? 'Less' : 'See All →'}
        </Text>
      </Pressable>
    )}
  </View>
);

const EmptyStateUnified = ({icon, title, subtitle}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, {toValue: 1, duration: 800, useNativeDriver: true}).start();
  }, []);

  return (
    <Animated.View style={[styles.emptyContainerUnified, {opacity: fadeAnim}]}>
      <View style={styles.emptyIconCircleUnified}>
        <Text style={styles.emptyEmojiUnified}>{icon || '💜'}</Text>
      </View>
      <Text style={styles.emptyTitleUnified}>{title}</Text>
      <Text style={styles.emptySubtitleUnified}>{subtitle}</Text>
    </Animated.View>
  );
};

// --- Main Screen ---

const LikesScreen = ({navigation}) => {
  const {profile: myProfile} = useAuth();
  const [likes, setLikes] = useState([]);
  const [matches, setMatches] = useState([]);
  const [previousInteractions, setPreviousInteractions] = useState([]);
  const [likesCount, setLikesCount] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPreviousExpanded, setIsPreviousExpanded] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isPremiumRequired, setIsPremiumRequired] = useState(false);
  const {visited, markVisited} = useInitialLoad();
  
  const [matchPopup, setMatchPopup] = useState({
    visible: false,
    myPhoto: null,
    theirPhoto: null,
    theirName: '',
    theirAge: null,
    matchId: null,
    theirId: null,
  });

  const screenFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(screenFadeAnim, {toValue: 1, duration: 500, useNativeDriver: true}).start();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadLikes();
    }, []),
  );

  const loadLikes = async () => {
    try {
      if (!likes.length && !matches.length && !refreshing) {
        setLoading(true);
      }
      const userData = await AsyncStorage.getItem('@pryvo_user');
      if (userData && userData !== 'undefined') {
        const user = JSON.parse(userData);
        setCurrentUserId(user.id);
        const [likesResponse, matchesResponse, previousResponse] = await Promise.all([
          getLikesReceived(user.id, true),
          fetchMatches(user.id),
          fetchPreviousInteractions(user.id),
        ]);
        if (likesResponse.success) {
          setLikes(likesResponse.likes || []);
          setLikesCount(likesResponse.count || 0);
          setIsPremiumRequired(likesResponse.isPremiumRequired || false);
        }
        if (matchesResponse.success) {
          const sorted = (matchesResponse.matches || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          setMatches(sorted);
        }
        if (previousResponse.success) {
          setPreviousInteractions(previousResponse.matches || []);
        }
      }
    } catch (error) {
      console.log('Error loading likes:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      if (!visited.matches) markVisited('matches');
    }
  };

  const handleLikeBack = async likerId => {
    try {
      const result = await likeUser(currentUserId, likerId);
      if (result.isMatch) {
         const matchedUser = likes.find(l => l.senderId === likerId);
         setMatchPopup({
           visible: true,
           myPhoto: myProfile?.media?.media?.[0]?.url || myProfile?.photos?.[0],
           theirPhoto: matchedUser?.photo || result?.match?.matchedUserPhoto,
           theirName: matchedUser?.name || result?.match?.matchedUserName,
           theirAge: matchedUser?.age || result?.match?.matchedUserAge,
           matchId: result.match._id,
           theirId: likerId,
         });
         loadLikes();
      }
    } catch (e) {
      console.log('Match error:', e);
    }
  };

  const handleRejectLike = async likerId => {
    try {
      // Optimistically remove from UI immediately
      setLikes(prev => prev.filter(l => l.senderId !== likerId));
      setLikesCount(prev => Math.max(0, prev - 1));
      await rejectLike(currentUserId, likerId);
    } catch (e) {
      console.log('Reject error:', e);
      // Reload to restore accurate state if request failed
      loadLikes();
    }
  };

  const currentMatchesList = isExpanded ? matches : matches.slice(0, 4);

  const renderLikerItem = ({item}) => {
    const handleTeaserPress = () => {
      Alert.alert(
        'Premium Feature 💎',
        'Upgrade to Premium to see who liked you and match with them!',
        [
          {text: 'Not Now', style: 'cancel'},
          {
            text: 'Get Premium',
            onPress: () => navigation.navigate('Settings'),
            style: 'default',
          },
        ],
      );
    };

    return (
      <Pressable
        style={styles.cardUnified}
        onPress={isPremiumRequired ? handleTeaserPress : null}>
        <Image
          source={{
            uri:
              item.photo ||
              `https://ui-avatars.com/api/?background=6A0DAD&color=fff&name=${
                item.name || 'U'
              }`,
          }}
          style={styles.cardAvatarUnified}
          blurRadius={isPremiumRequired ? 25 : 0}
        />
        <View style={styles.cardInfoUnified}>
          <Text style={styles.cardNameUnified}>
            {isPremiumRequired ? 'Someone' : item.name}
            {!isPremiumRequired && item.age ? `, ${item.age}` : ''}
          </Text>
          <Text style={styles.cardSubtextUnified}>Liked your profile</Text>
        </View>
        <View style={styles.actionBtnsUnified}>
          <Pressable
            style={styles.rejectBtnUnified}
            onPress={
              isPremiumRequired
                ? handleTeaserPress
                : () => handleRejectLike(item.senderId)
            }>
            <Text style={styles.rejectBtnTextUnified}>✕</Text>
          </Pressable>
          <Pressable
            style={styles.matchBtnUnified}
            onPress={
              isPremiumRequired
                ? handleTeaserPress
                : () => handleLikeBack(item.senderId)
            }>
            <LinearGradient
              colors={['#6A0DAD', '#9370DB']}
              style={styles.btnGradientUnified}>
              <Text style={styles.btnTextUnified}>❤️ Match</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </Pressable>
    );
  };

  const renderHeaderUnified = () => (
    <View style={styles.headerWrapperUnified}>
      {/* 🧬 NEW MATCHES (Subsection) */}
      {matches.length > 0 && (
        <View style={styles.sectionUnified}>
          <SectionHeaderUnified
            title="NEW MATCHES"
            isSubsection={true}
            showSeeAll={matches.length > 4}
            isExpanded={isExpanded}
            onPressSeeAll={() => setIsExpanded(!isExpanded)}
          />
          <FlatList
            horizontal
            data={currentMatchesList}
            keyExtractor={item => item._id}
            renderItem={({item}) => (
              <MatchAvatar
                item={item}
                onPress={() => navigation.navigate('ChatScreen', {
                  matchId: item._id, theirId: item.theirId, theirName: item.theirName, theirPhoto: item.theirPhoto
                })}
              />
            )}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.matchesScrollContent}
          />
          <View style={styles.dividerUnified} />
        </View>
      )}

      {/* 🕰️ PREVIOUS INTERACTIONS (Requirement #4) */}
      {previousInteractions.length > 0 && (
        <View style={styles.sectionUnified}>
          <SectionHeaderUnified
            title="PREVIOUS INTERACTIONS"
            isSubsection={true}
            showSeeAll={previousInteractions.length > 4}
            isExpanded={isPreviousExpanded}
            onPressSeeAll={() => setIsPreviousExpanded(!isPreviousExpanded)}
          />
          <FlatList
            horizontal
            data={isPreviousExpanded ? previousInteractions : previousInteractions.slice(0, 4)}
            keyExtractor={item => `prev-${item._id}`}
            renderItem={({item}) => (
              <MatchAvatar
                item={item}
                onPress={() => {
                  // Redirect to Home/Swipe Screen (Requirement #5)
                  navigation.navigate('HomeTabs', { 
                    screen: 'Accueil',
                    params: { targetUserId: item.theirId }
                  });
                }}
              />
            )}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.matchesScrollContent}
          />
          <View style={styles.dividerUnified} />
        </View>
      )}

      {/* 🧩 PEOPLE WHO LIKED YOU HEADER */}
      <View style={styles.likesHeaderUnified}>
        <Text style={styles.subsectionTitleUnified}>PEOPLE WHO LIKED YOU</Text>
      </View>
    </View>
  );

  if (loading && !visited.matches) {
    return <FullScreenLoader visible={true} message="Syncing with your stars…" />;
  }

  return (
    <ThemeBackground>
      <SafeAreaView style={styles.containerUnified} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        <Animated.View style={[styles.flexFullUnified, {opacity: screenFadeAnim}]}>
          {/* Main Dominant Header */}
          <View style={styles.mainActionBarUnified}>
            <View style={styles.mainTitleStack}>
              <Text style={styles.mainHeaderTitleUnified}>Matches</Text>
              {likesCount > 0 && (
                <View style={styles.countBadgeUnified}>
                  <Text style={styles.countTextUnified}>{likesCount}</Text>
                </View>
              )}
            </View>
          </View>

          {/* List */}
          <FlatList
            data={likes}
            keyExtractor={(item, index) => item._id || item.senderId || index.toString()}
            renderItem={renderLikerItem}
            ListHeaderComponent={renderHeaderUnified}
            ListEmptyComponent={!loading && likes.length === 0 ? <EmptyStateUnified icon="✨" title="No new Matches" subtitle="Keep swiping to find your pair!" /> : null}
            contentContainerStyle={styles.listScrollPaddingUnified}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); loadLikes();}} tintColor="#6A0DAD" />}
          />
        </Animated.View>
      </SafeAreaView>
      
      <MatchPopup
        visible={matchPopup.visible}
        myPhoto={matchPopup.myPhoto}
        theirPhoto={matchPopup.theirPhoto}
        theirName={matchPopup.theirName}
        onContinue={() => setMatchPopup(prev => ({...prev, visible: false}))}
        onMessage={() => {
          const {matchId, theirId, theirName, theirPhoto} = matchPopup;
          setMatchPopup(prev => ({...prev, visible: false}));
          navigation.navigate('ChatScreen', {matchId, theirId, theirName, theirPhoto});
        }}
      />
    </ThemeBackground>
  );
};

const styles = StyleSheet.create({
  containerUnified: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingBottom: 84, // Space for floating tab bar
  },
  fullGradientUnified: {
    flex: 1,
  },
  flexFullUnified: {
    flex: 1,
  },
  mainActionBarUnified: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  mainTitleStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mainHeaderTitleUnified: {
    fontSize: 30, // Dominant
    fontFamily: typography.fontFamilyBold,
    color: '#1f1f1f', // Premium dark
    fontWeight: '900',
    letterSpacing: -1,
  },
  countBadgeUnified: {
    marginLeft: 14,
    backgroundColor: '#6A0DAD',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
  },
  countTextUnified: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  listScrollPaddingUnified: {
    paddingBottom: 40,
  },
  headerWrapperUnified: {
    marginTop: 16,
  },
  sectionUnified: {
    marginBottom: 10,
  },
  headerRowUnified: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  subsectionTitleUnified: {
    fontSize: 14, // Smaller subsection
    fontFamily: typography.fontFamilyBold,
    color: '#666666', // Muted gray
    letterSpacing: 1.5, // Elegant
    fontWeight: '700',
  },
  seeAllBtnUnified: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  seeAllTextUnified: {
    fontSize: 13,
    color: '#6A0DAD',
    fontWeight: '600',
  },
  matchesScrollContent: {
    paddingLeft: 20,
    paddingRight: 10,
    paddingVertical: 10,
  },
  avatarWrapperUnified: {
    marginRight: 20, // Better spacing
    width: 80,
  },
  avatarGlowUnified: {
    position: 'relative',
    padding: 3,
    shadowColor: '#6A0DAD',
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  ringUnified: {
    width: 78,
    height: 78,
    borderRadius: 39,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageUnified: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  onlineStatusUnified: {
    position: 'absolute',
    bottom: 3,
    right: 3,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineDotUnified: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2ECC71',
  },
  nameUnified: {
    marginTop: 8,
    fontSize: 13,
    color: '#333333', // Darker
    fontWeight: '600',
    textAlign: 'center',
  },
  dividerUnified: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.03)',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 4,
  },
  likesHeaderUnified: {
    paddingHorizontal: 20,
    marginTop: 14,
    marginBottom: 10,
  },
  cardUnified: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  cardAvatarUnified: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F7F7FB',
  },
  cardInfoUnified: {
    flex: 1,
    marginLeft: 16,
  },
  cardNameUnified: {
    fontSize: 17,
    fontFamily: typography.fontFamilyBold,
    color: '#1A1A1A',
    fontWeight: '700',
  },
  cardSubtextUnified: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  matchBtnUnified: {
    borderRadius: 30,
    overflow: 'hidden',
  },
  actionBtnsUnified: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rejectBtnUnified: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectBtnTextUnified: {
    fontSize: 15,
    color: '#8E8E93',
    fontWeight: 'bold',
    lineHeight: 18,
  },
  btnGradientUnified: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  btnTextUnified: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  emptyContainerUnified: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  emptyIconCircleUnified: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FDF7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyEmojiUnified: {
    fontSize: 40,
  },
  emptyTitleUnified: {
    fontSize: 20,
    fontFamily: typography.fontFamilyBold,
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitleUnified: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default LikesScreen;