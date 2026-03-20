import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  TouchableOpacity,
  Animated
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { usePhotoSocial } from '../../hooks/usePhotoSocial';
import { photoSocialService } from '../../services/photoSocialService';
import { colors, typography, spacing } from '../../theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * 🌠 PhotoInteractionViewer: DARK PREMIUM Social Experience
 * Replicates ChatScreen navigation logic and introduces glassmorphism aesthetics.
 */
const PhotoInteractionViewer = ({ 
  visible, 
  onClose, 
  photoUrl, 
  targetUserId, 
  currentUserId,
  navigation // Passed from parent screens (REUSE ChatScreen Logic)
}) => {
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState(null);

  // Animation values
  const likeScale = useRef(new Animated.Value(1)).current;

  // 📹 Handle Real-Time Interaction (Comments)
  const handleInteraction = useCallback((data) => {
    if (data.type === 'comment' && data.photoUrl === photoUrl) {
      setComments(prev => {
        const exists = prev.some(c => c._id === data.interactionId);
        if (exists) return prev;
        
        const newComment = {
          _id: data.interactionId,
          text: data.text,
          senderId: { 
            _id: data.senderId, 
            name: data.senderName || 'Someone', 
            photo: data.senderPhoto || '' 
          },
          createdAt: data.createdAt
        };
        return [newComment, ...prev];
      });
    }
  }, [photoUrl]);

  const { photosStats, handleLike, handleComment } = usePhotoSocial(targetUserId, handleInteraction);
  const photoId = photoSocialService.generatePhotoId(photoUrl);
  const stats = photosStats[photoId] || { likes: 0, commentsCount: 0, isLiked: false };

  const isOwner = currentUserId === targetUserId;

  const loadComments = useCallback(async (isInitial = false) => {
    if (!photoUrl || !visible) return;
    try {
      setLoadingComments(true);
      const res = await photoSocialService.getPhotoDetails(photoUrl, isInitial ? null : cursor);
      if (res.success) {
        setComments(prev => {
          const fetched = res.comments.map(c => ({
            ...c,
            senderId: {
                ...c.senderId,
                name: c.senderId?.fullName || c.senderId?.name || 'Someone'
            }
          }));
          const newList = isInitial ? fetched : [...prev, ...fetched];
          return Array.from(new Map(newList.map(c => [c._id, c])).values());
        });
        setHasMore(res.hasMore);
        if (res.comments.length > 0) {
          setCursor(res.comments[res.comments.length - 1].createdAt);
        }
      }
    } catch (err) {
      console.error('[PhotoInteractionViewer] Load Error:', err);
    } finally {
      setLoadingComments(false);
    }
  }, [photoUrl, visible, cursor]);

  useEffect(() => {
    if (visible) {
      loadComments(true);
    } else {
      setComments([]);
      setCursor(null);
    }
  }, [visible, photoUrl, loadComments]);

  const onToggleLike = () => {
    Animated.sequence([
      Animated.timing(likeScale, { toValue: 1.3, duration: 100, useNativeDriver: true }),
      Animated.spring(likeScale, { toValue: 1, friction: 3, useNativeDriver: true })
    ]).start();
    handleLike(photoUrl);
  };

  const onSubmitComment = async () => {
    if (!commentText.trim()) return;
    try {
      const res = await handleComment(photoUrl, commentText);
      setCommentText('');
      if (res.success && res.comment) {
        setComments(prev => {
          const exists = prev.some(c => c._id === res.comment._id);
          if (exists) return prev;
          return [{
            ...res.comment,
            senderId: { _id: currentUserId, name: 'You', photo: '' }
          }, ...prev];
        });
      }
    } catch (err) {
      console.error('[PhotoInteractionViewer] Comment Post Error:', err);
    }
  };

  /**
   * 🔗 REUSE ChatScreen Logic: Exactly replicate how profiles are opened
   * Robust ID retrieval to handle both populated and unpopulated cases.
   */
  const openUserProfile = (rawSender) => {
    // Determine the ID: could be a string (unpopulated) or object (populated)
    const userId = typeof rawSender === 'string' ? rawSender : (rawSender?._id || rawSender?.id || rawSender?.userId);
    
    console.log("[PhotoInteractionViewer] openUserProfile triggered for:", userId);
    
    if (!userId || !navigation) {
      console.warn("[PhotoInteractionViewer] userId or navigation missing", { userId, nav: !!navigation });
      return;
    }

    // ❗ CRITICAL: Modals are top-level and cover navigation screens.
    // Dismiss the viewer before pushing the profile screen.
    if (onClose) onClose();

    setTimeout(() => {
      navigation.navigate('UserProfileView', { userId });
    }, 150);
  };

  const renderComment = ({ item }) => {
    const sender = item.senderId;
    const isMe = sender?._id === currentUserId;

    return (
      <View style={styles.commentItem}>
        <TouchableOpacity 
          style={styles.avatarGlow}
          onPress={() => openUserProfile(sender)}
        >
          {sender?.photo ? (
            <Image source={{ uri: sender.photo }} style={styles.commentAvatar} />
          ) : (
            <View style={[styles.commentAvatar, styles.commentAvatarPlaceholder]}>
              <Text style={styles.avatarInitial}>
                {isMe ? 'Y' : (sender?.name || 'S').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        <View style={styles.commentContent}>
          <TouchableOpacity onPress={() => openUserProfile(sender)}>
            <Text style={styles.commentAuthor}>{isMe ? 'You' : (sender?.name || 'Someone')}</Text>
          </TouchableOpacity>
          <Text style={styles.commentText}>{item.text || item.message}</Text>
          <Text style={styles.commentTime}>
            {new Date(item.createdAt).toLocaleDateString([], { hour: '2-digit', minute: '2-digit'})}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <StatusBar barStyle="light-content" backgroundColor="#0F0F1A" />
      <LinearGradient 
        colors={['#0F0F1A', '#1A1A2E', '#16213E']} 
        style={styles.mainWrapper}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={styles.content}
        >
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={onClose} style={styles.iconBtn}>
              <MaterialCommunityIcons name="chevron-down" size={32} color="#FFF" />
            </Pressable>
            <Text style={styles.headerTitle}>Moments</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Premium Card Photo */}
          <View style={styles.cardContainer}>
            <View style={styles.imageCard}>
              <Image source={{ uri: photoUrl }} style={styles.cardImage} resizeMode="cover" />
              <LinearGradient 
                colors={['transparent', 'rgba(15,15,26,0.8)']} 
                style={styles.cardGradient} 
              />
              
              <View style={styles.cardActions}>
                <Animated.View style={{ transform: [{ scale: likeScale }] }}>
                  <Pressable style={styles.cardActionBtn} onPress={onToggleLike}>
                    <MaterialCommunityIcons 
                      name={stats.isLiked ? "heart" : "heart-outline"} 
                      size={28} 
                      color={stats.isLiked ? "#FF4D6D" : "#FFF"} 
                    />
                    {isOwner && <Text style={styles.cardActionText}>{stats.likes}</Text>}
                  </Pressable>
                </Animated.View>
                {isOwner && (
                  <View style={[styles.cardActionBtn, { marginLeft: 10 }]}>
                    <MaterialCommunityIcons name="comment-outline" size={24} color="#FFF" />
                    <Text style={styles.cardActionText}>{stats.commentsCount}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Social Section */}
          <View style={styles.feedSection}>
            <Text style={styles.sectionTitle}>
              {isOwner ? 'Interactions on your Moment' : 'Shared Reactions'}
            </Text>
            <FlatList
              data={comments}
              keyExtractor={(item) => `${item._id}-${item.createdAt}`}
              renderItem={renderComment}
              contentContainerStyle={styles.scrollList}
              onEndReached={() => hasMore && loadComments()}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={() => (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyTitle}>Be the first to interact ✨</Text>
                  <Text style={styles.emptySubTitle}>Start a conversation or react to this moment</Text>
                </View>
              )}
              ListFooterComponent={() => loadingComments && <ActivityIndicator color="#FF4D6D" />}
            />
          </View>

          {/* Bottom Interaction Bar */}
          {!isOwner && (
            <View style={styles.bottomBar}>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Say something meaningful..."
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={commentText}
                  onChangeText={setCommentText}
                  maxLength={200}
                />
                <TouchableOpacity style={styles.sendIcon} onPress={onSubmitComment}>
                  <MaterialCommunityIcons name="send" size={26} color="#FF4D6D" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </KeyboardAvoidingView>
      </LinearGradient>
    </Modal>
  );
};

const styles = StyleSheet.create({
  mainWrapper: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  header: {
    height: 60,
    marginTop: Platform.OS === 'ios' ? 44 : 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontFamily: typography.fontFamilyBold,
    letterSpacing: 0.8,
  },
  iconBtn: {
    padding: 5,
  },
  placeholder: {
    width: 40,
  },
  cardContainer: {
    height: SCREEN_HEIGHT * 0.4,
    paddingHorizontal: 20,
    marginTop: 10,
  },
  imageCard: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cardImage: {
    flex: 1,
  },
  cardGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  cardActions: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  cardActionText: {
    color: '#FFF',
    marginLeft: 6,
    fontSize: 14,
    fontFamily: typography.fontFamilyBold,
  },
  feedSection: {
    flex: 1,
    marginTop: 25,
    paddingHorizontal: 20,
    paddingBottom: 90,
  },
  sectionTitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontFamily: typography.fontFamilyBold,
    marginBottom: 18,
    letterSpacing: 0.5,
  },
  scrollList: {
    paddingBottom: 20,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  avatarGlow: {
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#FF4D6D',
    padding: 2,
    marginRight: 14,
    alignSelf: 'flex-start',
    shadowColor: '#FF4D6D',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
  },
  commentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333',
  },
  commentAvatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2A2A3A',
  },
  avatarInitial: {
    color: '#FF4D6D',
    fontSize: 18,
    fontFamily: typography.fontFamilyBold,
  },
  commentContent: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  commentAuthor: {
    color: '#FF4D6D',
    fontSize: 13,
    fontFamily: typography.fontFamilyBold,
    marginBottom: 4,
  },
  commentText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontFamily: typography.fontFamilyRegular,
    lineHeight: 20,
  },
  commentTime: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 8,
    textAlign: 'right',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0F0F1A',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    paddingTop: 15,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 25,
    paddingLeft: 18,
    paddingRight: 8,
    height: 52,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  input: {
    flex: 1,
    color: '#FFF',
    fontSize: 15,
    fontFamily: typography.fontFamilyRegular,
  },
  sendIcon: {
    padding: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 80, // Slightly more space for the clean version
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18, // Slightly larger for premium feel
    fontFamily: typography.fontFamilyBold,
    color: '#FFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubTitle: {
    color: 'rgba(255,255,255,0.6)', // Slightly more visible
    fontSize: 14,
    fontFamily: typography.fontFamilyRegular,
    textAlign: 'center',
    lineHeight: 22,
  }
});

export default PhotoInteractionViewer;
