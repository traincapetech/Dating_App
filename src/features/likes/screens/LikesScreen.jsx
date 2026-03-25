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
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useFocusEffect} from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import {colors, typography, spacing} from '../../../theme';
import {getLikesReceived, likeUser} from '../../../services/swipeActions';
import {fetchMatches} from '../../../services/chatService';
import {useLoading} from '../../../context/LoadingContext';
import {useInitialLoad} from '../../../context/InitialLoadContext';
import FullScreenLoader from '../../../components/layout/FullScreenLoader';
import MatchPopup from '../../../components/profile/MatchPopup';
import {useAuth} from '../../../context/AuthContext';

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
  const [likesCount, setLikesCount] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
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
        const [likesResponse, matchesResponse] = await Promise.all([
          getLikesReceived(user.id, true),
          fetchMatches(user.id),
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

  const currentMatchesList = isExpanded ? matches : matches.slice(0, 4);

  const renderLikerItem = ({item}) => (
    <Pressable style={styles.cardUnified}>
      <Image source={{uri: item.photo || `https://ui-avatars.com/api/?background=6A0DAD&color=fff&name=${item.name || 'U'}`}} style={styles.cardAvatarUnified} />
      <View style={styles.cardInfoUnified}>
        <Text style={styles.cardNameUnified}>{item.name}{item.age ? `, ${item.age}` : ''}</Text>
        <Text style={styles.cardSubtextUnified}>Liked your profile</Text>
      </View>
      <Pressable style={styles.matchBtnUnified} onPress={() => handleLikeBack(item.senderId)}>
        <LinearGradient colors={['#6A0DAD', '#9370DB']} style={styles.btnGradientUnified}>
           <Text style={styles.btnTextUnified}>❤️ Match</Text>
        </LinearGradient>
      </Pressable>
    </Pressable>
  );

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
    <SafeAreaView style={styles.containerUnified} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient colors={['#FFFFFF', '#FDFDFF']} style={styles.fullGradientUnified}>
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
            ListEmptyComponent={!loading && likes.length === 0 ? <EmptyStateUnified icon="✨" title="No new likes" subtitle="Keep swiping to find your pair!" /> : null}
            contentContainerStyle={styles.listScrollPaddingUnified}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); loadLikes();}} tintColor="#6A0DAD" />}
          />
        </Animated.View>
      </LinearGradient>
      
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  containerUnified: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  mainTitleStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mainHeaderTitleUnified: {
    fontSize: 30, // Dominant
    fontFamily: typography.fontFamilyBold,
    color: '#6A0DAD', // Purple Branding
    fontWeight: '900',
    letterSpacing: -1,
    textShadowColor: 'rgba(106, 13, 221, 0.12)',
    textShadowOffset: {width: 0, height: 4},
    textShadowRadius: 8,
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
    marginHorizontal: 20,
    marginVertical: 10,
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
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
