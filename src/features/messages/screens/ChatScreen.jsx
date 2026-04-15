import React, {useEffect, useState, useRef, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Alert,
  Modal,
  TouchableOpacity,
  StatusBar,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import ThemeBackground from '../../../components/layout/ThemeBackground';
import Icon from 'react-native-vector-icons/Ionicons';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {launchImageLibrary} from 'react-native-image-picker';
import EmojiPicker from 'rn-emoji-keyboard';
import GifPicker from '../../../components/chat/GifPicker';
import ScreenshotPrevent from 'react-native-screenshot-prevent';
import {colors, typography, spacing} from '../../../theme';
import {
  initSocket,
  joinChatRoom,
  leaveChatRoom,
  emitTyping,
  emitStopTyping,
  emitMessageSeen,
} from '../../../services/socket';
import {
  fetchMessages,
  sendMessageApi,
  markMessagesAsSeen,
  uploadChatMedia,
  blockAndReportUser,
  checkIfBlocked,
  unmatchUser,
  deleteMessageApi,
} from '../../../services/chatService';
import CountdownTimer from '../components/CountdownTimer';
import {getMatchDetails} from '../../../services/matchService';
import giftService from '../../../services/giftService';
import GiftSelectionModal from '../../../components/chat/GiftSelectionModal';
import streakService from '../../../services/streakService';
import StreakBadge from '../../../components/common/StreakBadge';
import StreakWarningBanner from '../../../components/common/StreakWarningBanner';
import GiftReceiverAnimation from '../../../components/chat/GiftReceiverAnimation';
import IcebreakerSuggestions from '../../../components/chat/IcebreakerSuggestions';
import ChatSkeleton from '../../../components/chat/ChatSkeleton';
import giftImages from '../../../assets/images/gifts';

const REPORT_REASONS = [
  {id: 'harassment', label: 'Harassment'},
  {id: 'spam', label: 'Spam'},
  {id: 'inappropriate_content', label: 'Inappropriate Content'},
  {id: 'fake_profile', label: 'Fake Profile'},
  {id: 'underage', label: 'Underage User'},
  {id: 'other', label: 'Other'},
];

const ChatScreen = ({route, navigation}) => {
  const {matchId, theirId, theirName, theirPhoto, theirAge} =
    route.params || {};
  const [currentUserId, setCurrentUserId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showUnmatchModal, setShowUnmatchModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState(null);
  const [reportDescription, setReportDescription] = useState('');
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [unmatching, setUnmatching] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [showFullScreenImage, setShowFullScreenImage] = useState(false);
  const [fullScreenImageUrl, setFullScreenImageUrl] = useState(null);
  const [showSkeleton, setShowSkeleton] = useState(false);

  // Date or Dissolve State
  const [matchDetails, setMatchDetails] = useState(null);
  const [streak, setStreak] = useState(null);
  const [showStreakWarning, setShowStreakWarning] = useState(false);
  const [showGiftAnimation, setShowGiftAnimation] = useState(false);
  const [receivedGiftForAnimation, setReceivedGiftForAnimation] =
    useState(null);
  const [isUserOnlineNow, setIsUserOnlineNow] = useState(false);

  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const socketRef = useRef(null);
  const lastTypingEmitRef = useRef(0);
  const insets = useSafeAreaInsets();
  const isMounted = useRef(true);

  useEffect(() => {
    if (!matchId) {
      console.log('⚠ No matchId → Skipping chat initialization');
      return;
    }

    isMounted.current = true;
    initChat();

    // Enable screenshot blocking in chat
    if (
      ScreenshotPrevent?.enabled &&
      typeof ScreenshotPrevent.enabled === 'function'
    ) {
      ScreenshotPrevent.enabled(true);
    }

    return () => {
      isMounted.current = false;
      if (socketRef.current) {
        leaveChatRoom(matchId);
        socketRef.current.off('receiveMessage');
        socketRef.current.off('typing');
        socketRef.current.off('stopTyping');
        socketRef.current.off('messagesSeen');
        socketRef.current.off('messageStatusUpdate');
        socketRef.current.off('streak:update');
      }

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      // Disable screenshot blocking when leaving chat
      if (
        ScreenshotPrevent?.enabled &&
        typeof ScreenshotPrevent.enabled === 'function'
      ) {
        ScreenshotPrevent.enabled(false);
      }
    };
  }, [matchId]);
  
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => setShowSkeleton(true), 250);
      return () => clearTimeout(timer);
    } else {
      setShowSkeleton(false);
    }
  }, [loading]);

  const initChat = async () => {
    console.log('[ChatScreen] Initializing chat for matchId:', matchId);
    try {
      const userData = await AsyncStorage.getItem('@pryvo_user');
      if (!isMounted.current) return;
      
      if (userData && userData !== 'undefined') {
        const user = JSON.parse(userData);
        setCurrentUserId(user.id);
        console.log('[ChatScreen] Current User ID:', user.id);

        // Check if blocked
        const blockStatus = await checkIfBlocked(user.id, theirId);
        if (!isMounted.current) return;
        
        console.log('[ChatScreen] Block status:', blockStatus);
        if (blockStatus.isBlocked) {
          setIsBlocked(true);
          setLoading(false);
          return;
        }

        // Load existing messages
        const data = await fetchMessages(matchId, user.id);
        if (!isMounted.current) return;
        console.log('[ChatScreen] Messages fetched:', data?.length || 0);
        setMessages(data || []);

        // Filter unseen messages for the current user
        const unseenMessages = (data || []).filter(
          m => m.receiverId === user.id && m.status !== 'seen',
        );

        if (unseenMessages.length > 0) {
          const unseenIds = unseenMessages.map(m => m._id);
          await markMessagesAsSeen(matchId, user.id);
          if (!isMounted.current) return;

          // Trigger Gift Animation for newly received (unseen) gifts
          const unseenGifts = unseenMessages.filter(
            m => m.mediaType === 'gift',
          );
          if (unseenGifts.length > 0) {
            // Show animation for the most recent gift in the batch
            const latestGift = unseenGifts[unseenGifts.length - 1];
            if (latestGift.giftMetadata) {
              console.log(
                '[ChatScreen] 🎁 Triggering animation for unseen gift:',
                latestGift.giftMetadata.slug,
              );
              setReceivedGiftForAnimation({
                ...latestGift.giftMetadata,
                isSender: false,
              });
              setShowGiftAnimation(true);
            }
          }
        }

        // Fetch Match Details (Status & Expiration)
        const details = await getMatchDetails(matchId);
        if (!isMounted.current) return;
        setMatchDetails(details);

        // Fetch Streak Data
        try {
          const streakData = await streakService.getStreakForPair(
            user.id,
            theirId,
          );
          if (!isMounted.current) return;
          if (streakData) {
            setStreak(streakData);
            // Check for streak warning (if 20h+ passed)
            if (streakData.lastActivityDate) {
              const lastActivity = new Date(streakData.lastActivityDate);
              const now = new Date();
              const diffInHours = (now - lastActivity) / (1000 * 60 * 60);
              if (diffInHours >= 20 && diffInHours < 24) {
                setShowStreakWarning(true);
              }
            }
          }
        } catch (err) {
          console.warn('[ChatScreen] Streak fetch silently failed:', err);
        }

        // Init socket
        if (!isMounted.current) return;
        const socket = initSocket(user.id);
        socketRef.current = socket;

        // Listen for new messages
        socket.on('receiveMessage', msg => {
          if (msg.matchId === matchId) {
            setMessages(prev => {
              // Avoid duplicates
              if (prev.some(m => m._id === msg._id)) return prev;
              return [...prev, msg];
            });
            scrollToBottom();

            // Trigger Gift Animation only for the RECEIVER via socket
            // (Sender animation is triggered directly in handleSendGift after API response)
            if (msg.mediaType === 'gift' && msg.senderId !== user.id) {
              console.log(
                '[ChatScreen] 🎁 Receiver gift animation for:',
                msg.giftMetadata?.slug,
              );
              setReceivedGiftForAnimation({
                ...msg.giftMetadata,
                isSender: false,
              });
              setShowGiftAnimation(true);
            }

            // Mark as seen immediately if it's for us
            if (msg.receiverId === user.id) {
              emitMessageSeen(matchId, user.id, [msg._id]);
            }
          }
        });

        // Listen for typing indicator
        socket.on('typing', ({userId}) => {
          if (userId !== user.id) {
            setTyping(true);
            if (typingTimeoutRef.current)
              clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => setTyping(false), 3000);
          }
        });

        socket.on('stopTyping', ({userId}) => {
          if (userId !== user.id) {
            setTyping(false);
          }
        });

        // Listen for messages seen
        socket.on('messagesSeen', ({userId, seenAt}) => {
          // If the other user saw our messages
          if (userId !== user.id) {
            setMessages(prev =>
              prev.map(m =>
                // Mark all messages sent by us (current user) as seen
                m.senderId === user.id && m.status !== 'seen'
                  ? {...m, status: 'seen', seenAt}
                  : m,
              ),
            );
          }
        });

        socket.on('messageStatusUpdate', ({messageId, status}) => {
          setMessages(prev =>
            prev.map(m => (m._id === messageId ? {...m, status} : m)),
          );
        });

        // Listen for user status changed
        socket.on('userStatusChanged', data => {
          if (data.userId === theirId) {
            setIsUserOnlineNow(data.status === 'online');
          }
        });

        // Real-time streak updates
        socket.on('streak:update', data => {
          const ourPairId = [user.id, theirId].sort().join('_');
          if (data.userPairId === ourPairId) {
            setStreak(data);
            setShowStreakWarning(false); // New activity clears the warning
          }
        });

        // Join chat room AFTER listeners are set
        joinChatRoom(matchId, user.id);
      } else {
        navigation.goBack();
      }
    } catch (e) {
      console.log('Error initializing chat', e);
      if (e?.status === 403) {
        Alert.alert(
          'Access Denied',
          e.message || 'You cannot access this chat',
        );
        navigation.goBack();
      }
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = useCallback(() => {
    if (flatListRef.current && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({animated: true});
      }, 100);
    }
  }, [messages.length]);

  const sendMessage = async textToSubmit => {
    if (!textToSubmit?.trim() || !currentUserId || sending) return false;

    setSending(true);
    try {
      const saved = await sendMessageApi({
        matchId,
        senderId: currentUserId,
        receiverId: theirId,
        text: textToSubmit.trim(),
      });

      setMessages(prev => {
        if (prev.some(m => m._id === saved._id)) return prev;
        return [...prev, saved];
      });
      scrollToBottom();
      emitStopTyping(matchId, currentUserId);
      return true;
    } catch (e) {
      console.log('Send message error', e);
      if (e.status === 400) {
        Alert.alert('Caution', e.message || 'Please keep the conversation respectful.');
      } else {
        Alert.alert('Error', 'Failed to send message. Please try again.');
      }
      return false;
    } finally {
      setSending(false);
    }
  };

  const handleSend = async () => {
    if ((!inputText.trim() && !uploadingMedia) || !currentUserId || sending)
      return;

    const text = inputText.trim();
    setInputText('');
    const success = await sendMessage(text);
    if (!success) {
      setInputText(text); // Restore text on error
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.7,
        maxWidth: 1200,
        maxHeight: 1200,
        includeBase64: true,
      });

      if (
        result.didCancel ||
        !result.assets?.[0]?.uri ||
        !result.assets?.[0]?.base64
      )
        return;

      setSelectedMedia({
        uri: result.assets[0].uri,
        base64: result.assets[0].base64,
        type: 'image',
      });
      setShowPreviewModal(true);
    } catch (e) {
      console.log('Image picker error', e);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const confirmSendMedia = async () => {
    if (!selectedMedia || uploadingMedia) return;

    try {
      setUploadingMedia(true);
      setShowPreviewModal(false);

      // Upload image
      const uploadResult = await uploadChatMedia(
        selectedMedia.base64,
        currentUserId,
        matchId,
      );

      if (uploadResult.success && uploadResult.mediaUrl) {
        // Send message with media
        const saved = await sendMessageApi({
          matchId,
          senderId: currentUserId,
          receiverId: theirId,
          text: null,
          mediaUrl: uploadResult.mediaUrl,
          mediaType: selectedMedia.type,
        });

        setMessages(prev => {
          // Avoid duplicates (if already received via socket)
          if (prev.some(m => m._id === saved._id)) return prev;
          return [...prev, saved];
        });
        scrollToBottom();
        setSelectedMedia(null);
      } else {
        throw new Error('Failed to upload image');
      }
    } catch (e) {
      console.log('Media send error', e);
      Alert.alert('Error', 'Failed to send image. Please try again.');
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleSelectGif = async gifUrl => {
    if (!currentUserId || sending) return;

    setSending(true);
    try {
      // Send GIF as media message
      const saved = await sendMessageApi({
        matchId,
        senderId: currentUserId,
        receiverId: theirId,
        text: null,
        mediaUrl: gifUrl,
        mediaType: 'gif',
      });

      setMessages(prev => {
        // Avoid adding if already received via socket
        if (prev.some(m => m._id === saved._id)) return prev;
        return [...prev, saved];
      });
      scrollToBottom();
      setShowGifPicker(false);
    } catch (e) {
      console.log('GIF send error', e);
      Alert.alert('Error', 'Failed to send GIF. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleSendGift = async gift => {
    if (!currentUserId || sending) return;

    setSending(true);
    try {
      const res = await giftService.sendGiftApi({
        matchId,
        senderId: currentUserId,
        receiverId: theirId,
        giftId: gift._id,
      });

      if (res.success) {
        setMessages(prev => {
          if (prev.some(m => m._id === res.message._id)) return prev;
          return [...prev, res.message];
        });
        scrollToBottom();
        // Immediately show sender-side animation (don't wait for socket)
        if (res.message?.giftMetadata) {
          setReceivedGiftForAnimation({
            ...res.message.giftMetadata,
            isSender: true,
          });
          setShowGiftAnimation(true);
        }
      }
    } catch (e) {
      console.log('Gift send error', e);
      Alert.alert(
        'Error',
        e.message || 'Failed to send gift. Please try again.',
      );
    } finally {
      setSending(false);
    }
  };

  const handleEmojiSelect = emoji => {
    setInputText(prev => prev + emoji.emoji);
    setShowEmojiPicker(false);
  };

  const onChangeText = text => {
    setInputText(text);

    // Throttle typing events (max once per second)
    const now = Date.now();
    if (now - lastTypingEmitRef.current > 1000) {
      emitTyping(matchId, currentUserId);
      lastTypingEmitRef.current = now;
    }

    // Clear previous timeout and set new one for stop typing
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      emitStopTyping(matchId, currentUserId);
    }, 2000);
  };

  const handleBlockAndReport = async () => {
    if (!selectedReason) {
      Alert.alert('Error', 'Please select a reason');
      return;
    }

    try {
      await blockAndReportUser({
        blockerId: currentUserId,
        blockedId: theirId,
        matchId,
        reason: selectedReason,
        description: reportDescription || null,
      });

      setShowReportModal(false);
      Alert.alert(
        'User Blocked',
        'The user has been blocked and reported. You will no longer receive messages from them.',
        [{text: 'OK', onPress: () => navigation.goBack()}],
      );
    } catch (e) {
      console.log('Block and report error', e);
      Alert.alert('Error', 'Failed to block user. Please try again.');
    }
  };

  const handleUnmatch = async () => {
    try {
      setUnmatching(true);
      await unmatchUser(matchId, currentUserId);
      setShowUnmatchModal(false);
      Alert.alert('Unmatched', 'You have unmatched with this user.', [
        {text: 'OK', onPress: () => navigation.goBack()},
      ]);
    } catch (e) {
      console.log('Unmatch error', e);
      Alert.alert('Error', 'Failed to unmatch. Please try again.');
    } finally {
      setUnmatching(false);
    }
  };

  const handleDeleteMessage = useCallback(
    async messageId => {
      console.log('[ChatScreen] Deleting message:', messageId);
      Alert.alert(
        'Delete Message',
        'Are you sure you want to delete this message?',
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                // Optimistic update
                setMessages(prev => prev.filter(m => m._id !== messageId));

                console.log('[ChatScreen] Sending delete request to API...');
                const result = await deleteMessageApi(messageId, currentUserId);
                console.log('[ChatScreen] Delete result:', result);

                if (result.success) {
                  console.log('Message deleted successfully');
                } else {
                  console.warn('Failed to delete message:', result);
                  Alert.alert(
                    'Error',
                    result.message || 'Failed to delete message',
                  );
                  // Revert if needed (fetching messages again would be safer)
                  initChat();
                }
              } catch (error) {
                console.error('Error deleting message:', error);
                Alert.alert('Error', 'Failed to delete message');
                // Revert if needed (fetching messages again would be safer)
                initChat();
              }
            },
          },
        ],
      );
    },
    [matchId, currentUserId],
  );

  const handleViewProfile = () => {
    if (!theirId) return;
    navigation.navigate('UserProfileView', {
      userId: theirId,
      theirName,
      theirPhoto,
      theirAge,
    });
  };

  const handleOpenImage = url => {
    if (!url) return;
    setFullScreenImageUrl(url);
    setShowFullScreenImage(true);
  };

  const getStatusIcon = status => {
    switch (status) {
      case 'sent':
        return (
          <Icon name="checkmark" size={16} color="rgba(255,255,255,0.7)" />
        );
      case 'delivered':
        return (
          <Icon name="checkmark-done" size={16} color="rgba(255,255,255,0.7)" />
        );
      case 'seen':
        return <Icon name="checkmark-done" size={16} color="#4FC3F7" />;
      default:
        return (
          <Icon name="time-outline" size={16} color="rgba(255,255,255,0.7)" />
        );
    }
  };

  const formatMessageDate = date => {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString([], {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const renderDateSeparator = (currMessage, prevMessage) => {
    if (!prevMessage) return true;
    const currDate = new Date(currMessage.timestamp).toDateString();
    const prevDate = new Date(prevMessage.timestamp).toDateString();
    return currDate !== prevDate;
  };

  const renderItem = ({item, index}) => {
    const isMe = item.senderId === currentUserId;
    const isGif = item.mediaType === 'gif';
    const isGift = item.mediaType === 'gift';
    const showDateSeparator = renderDateSeparator(item, messages[index - 1]);

    return (
      <View>
        {showDateSeparator && (
          <View style={styles.dateSeparator}>
            <Text style={styles.dateSeparatorText}>
              {formatMessageDate(item.timestamp)}
            </Text>
          </View>
        )}

        <View
          style={[styles.messageRow, isMe ? styles.rowRight : styles.rowLeft]}>
          {!isMe && (
            <View style={styles.avatarContainer}>
              {theirPhoto ? (
                <Image
                  source={{uri: theirPhoto}}
                  style={{width: 32, height: 32, borderRadius: 16}}
                />
              ) : (
                <Text style={styles.avatarText}>{theirName?.[0] || '?'}</Text>
              )}
            </View>
          )}

            <Pressable
            onPress={() =>
              item.mediaUrl ? handleOpenImage(item.mediaUrl) : null
            }
            onLongPress={() => (isMe ? handleDeleteMessage(item._id) : null)}
            delayLongPress={500}
            style={[
              styles.bubbleContainer,
              isMe ? styles.bubbleRight : styles.bubbleLeft,
            ]}>
            {isMe ? (
              <LinearGradient
                colors={['#8E2DE2', '#4A00E0']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={styles.bubbleGradient}>
                {renderBubbleContent(item, isMe, isGif, isGift)}
              </LinearGradient>
            ) : (
              <View style={styles.bubbleContentThem}>
                {renderBubbleContent(item, isMe, isGif, isGift)}
              </View>
            )}
          </Pressable>
        </View>
      </View>
    );
  };

  const renderBubbleContent = (item, isMe, isGif, isGift) => (
    <>
      {isGift && item.giftMetadata ? (
        <View style={styles.giftMessageContainer}>
          <Image
            source={giftImages[item.giftMetadata.slug]}
            style={styles.giftMessageImage}
            resizeMode="contain"
          />
          <Text
            style={[
              styles.giftMessageText,
              !isMe && styles.giftMessageTextThem,
            ]}>
            {(() => {
              const slug = item.giftMetadata.slug;
              if (isMe) return `You sent a ${item.giftMetadata.name}`;
              if (slug === 'rose')
                return 'A beautiful rose has been sent to you 🌹';
              if (slug === 'teddy-bear')
                return 'You received a cute teddy bear 🧸';
              if (slug === 'ring')
                return 'A sparkling ring just arrived for you 💍';
              if (slug === 'diamond')
                return 'You’ve been gifted a shining diamond 💎';
              if (slug === 'crown')
                return 'You’ve been crowned with a royal gift 👑';
              return `You received a ${item.giftMetadata.name}`;
            })()}
          </Text>
        </View>
      ) : item.mediaUrl ? (
        <Image
          source={{uri: item.mediaUrl}}
          style={[styles.messageImage, isGif && styles.gifImage]}
          resizeMode={isGif ? 'contain' : 'cover'}
        />
      ) : null}
      {item.text && (
        <Text style={[styles.messageText, !isMe && styles.messageTextThem]}>
          {item.text}
        </Text>
      )}
      <View style={styles.messageFooter}>
        <Text style={[styles.timeText, !isMe && styles.timeTextThem]}>
          {new Date(item.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
        {isMe && (
          <View style={styles.statusContainer}>
            {getStatusIcon(item.status)}
          </View>
        )}
      </View>
    </>
  );

  // No early return for loading to ensure instant screen rendering

  if (isBlocked) {
    return (
      <View style={styles.center}>
        <Text style={styles.blockedText}>
          This conversation is no longer available
        </Text>
        <Pressable
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ThemeBackground>
      <SafeAreaView style={styles.safe} edges={['left', 'right']}>
        <StatusBar
          translucent
          backgroundColor="transparent"
          barStyle="dark-content"
        />
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}>
          {/* Header */}
          <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
            <View style={styles.headerBackground} />
            <View style={styles.headerContent}>
              <Pressable
                onPress={() => navigation.goBack()}
                style={({pressed}) => ({
                  opacity: pressed ? 0.7 : 1,
                  padding: spacing.xs,
                })}>
                <Icon name="chevron-back" size={28} color="#1a1a1a" />
              </Pressable>

              {/* Header title: plain View owns flex:1 layout, Pressable inside */}
              <View style={styles.headerTitleContainer}>
                <Pressable
                  onPress={handleViewProfile}
                  style={styles.headerTitlePressable}>
                  <View style={styles.headerAvatar}>
                    {theirPhoto ? (
                      <Image
                        source={{uri: theirPhoto}}
                        style={{width: 40, height: 40, borderRadius: 20}}
                      />
                    ) : (
                      <Text style={styles.headerAvatarText}>
                        {theirName?.[0] || '?'}
                      </Text>
                    )}
                  </View>
                  <View style={styles.headerInfo}>
                    <Text style={styles.headerTitle} numberOfLines={1}>
                      {theirName || 'Chat'}
                    </Text>
                    <View style={styles.headerSubRow}>
                      {isUserOnlineNow ? (
                        <View style={styles.onlineBadgeContainer}>
                          <View style={styles.onlineBadge} />
                          <Text style={styles.onlineText}>Online</Text>
                        </View>
                      ) : (
                        <Text style={styles.offlineText}>Offline</Text>
                      )}
                      {streak && (
                        <StreakBadge count={streak.count} size="small" />
                      )}
                    </View>
                  </View>
                </Pressable>
              </View>

              <View style={styles.headerActions}>
                <Pressable
                  onPress={() => setShowUnmatchModal(true)}
                  style={({pressed}) => ({
                    opacity: pressed ? 0.7 : 1,
                    marginRight: spacing.sm,
                  })}>
                  <Icon
                    name="heart-dislike-outline"
                    size={24}
                    color={colors.error}
                  />
                </Pressable>
                <Pressable
                  onPress={() => setShowReportModal(true)}
                  style={({pressed}) => ({
                    opacity: pressed ? 0.7 : 1,
                  })}>
                  <Icon
                    name="ellipsis-vertical"
                    size={24}
                    color={colors.textSecondary}
                  />
                </Pressable>
              </View>
            </View>
          </View>

          {/* Streak Warning Banner */}
          {showStreakWarning && streak && (
            <StreakWarningBanner
              hoursRemaining={
                24 - (Date.now() - new Date(streak.lastActivityDate)) / 3600000
              }
            />
          )}

          {/* Countdown & Match Info */}
          {matchDetails && (
            <View style={styles.timerBadge}>
              <CountdownTimer
                expiresAt={matchDetails.expiresAt}
                status={matchDetails.status}
              />
            </View>
          )}

          {/* Messages Container with Asynchronous Data Handling */}
          <View style={{flex: 1}}>
            {showSkeleton && messages.length === 0 ? (
              <ChatSkeleton />
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    renderItem={renderItem}
                    keyExtractor={item => item._id}
                    contentContainerStyle={styles.messagesList}
                    onContentSizeChange={scrollToBottom}
                    onLayout={scrollToBottom}
                    showsVerticalScrollIndicator={false}
                />
            )}
          </View>

          {/* Typing Indicator */}
          {typing && (
            <View style={styles.typingContainer}>
              <Text style={styles.typingText}>{theirName} is typing...</Text>
            </View>
          )}

          {/* Icebreaker suggestions - only shown if no messages yet */}
          <IcebreakerSuggestions
            targetUserId={theirId}
            matchId={matchId}
            onSelect={sendMessage}
            visible={messages.length === 0}
          />

          {/* Input Area */}
          <View
            style={[
              styles.inputContainer,
              {paddingBottom: insets.bottom || spacing.md},
            ]}>
            <View style={styles.inputWrapper}>
              <Pressable
                style={styles.iconButton}
                onPress={() => setShowEmojiPicker(true)}>
                <Icon
                  name="happy-outline"
                  size={24}
                  color={colors.textSecondary}
                />
              </Pressable>

              <Pressable
                style={styles.iconButton}
                onPress={() => setShowGifPicker(true)}>
                <Icon
                  name="images-outline"
                  size={24}
                  color={colors.textSecondary}
                />
              </Pressable>

              <Pressable
                style={styles.iconButton}
                onPress={() => setShowGiftModal(true)}>
                <Icon name="gift-outline" size={24} color={colors.primary} />
              </Pressable>

              <TextInput
                style={styles.input}
                placeholder="Type a message..."
                placeholderTextColor="#999"
                value={inputText}
                onChangeText={onChangeText}
                multiline
                maxLength={1000}
              />

              <Pressable
                style={styles.iconButton}
                onPress={handlePickImage}
                disabled={uploadingMedia}>
                <Icon
                  name="camera-outline"
                  size={24}
                  color={colors.textSecondary}
                />
              </Pressable>
            </View>

            <Pressable
              style={[
                styles.sendButton,
                (!inputText.trim() || sending) && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={!inputText.trim() || sending}>
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <LinearGradient
                  colors={[colors.primary, '#FF6B6B']}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 1}}
                  style={styles.sendButtonGradient}>
                  <Icon
                    name="send"
                    size={20}
                    color="#fff"
                    style={{marginLeft: 2}}
                  />
                </LinearGradient>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>

        {/* Emoji Picker */}
        <EmojiPicker
          onEmojiSelected={handleEmojiSelect}
          open={showEmojiPicker}
          onClose={() => setShowEmojiPicker(false)}
        />

        {/* GIF Picker */}
        <GifPicker
          visible={showGifPicker}
          onSelect={handleSelectGif}
          onClose={() => setShowGifPicker(false)}
        />

        {/* Gift Selection Modal */}
        <GiftSelectionModal
          visible={showGiftModal}
          onClose={() => setShowGiftModal(false)}
          onSend={handleSendGift}
          userId={currentUserId}
        />

        {/* Unmatch Modal */}
        <Modal
          visible={showUnmatchModal}
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => setShowUnmatchModal(false)}>
          <Pressable
            style={styles.modalOverlayCentered}
            onPress={() => setShowUnmatchModal(false)}>
            <Pressable
              style={styles.unmatchModalContent}
              onPress={e => e.stopPropagation()}>
              <Text style={styles.modalTitle}>Unmatch</Text>
              <Text style={styles.modalSubtitle}>
                Are you sure you want to unmatch with {theirName || 'this user'}
                ? This will remove your conversation and you won't be able to
                message each other anymore.
              </Text>
              <View style={styles.modalButtons}>
                <Pressable
                  style={styles.cancelButton}
                  onPress={() => setShowUnmatchModal(false)}
                  disabled={unmatching}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.unmatchButton,
                    unmatching && styles.unmatchButtonDisabled,
                  ]}
                  onPress={handleUnmatch}
                  disabled={unmatching}>
                  {unmatching ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.unmatchButtonText}>Unmatch</Text>
                  )}
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Report Modal */}
        <Modal
          visible={showReportModal}
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => setShowReportModal(false)}>
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowReportModal(false)}>
            <Pressable
              style={styles.modalContent}
              onPress={e => e.stopPropagation()}>
              <Text style={styles.modalTitle}>Report & Block User</Text>
              <Text style={styles.modalSubtitle}>
                Why are you reporting this user?
              </Text>

              {REPORT_REASONS.map(reason => (
                <TouchableOpacity
                  key={reason.id}
                  style={[
                    styles.reasonItem,
                    selectedReason === reason.id && styles.reasonItemSelected,
                  ]}
                  onPress={() => setSelectedReason(reason.id)}>
                  <Text
                    style={[
                      styles.reasonText,
                      selectedReason === reason.id && styles.reasonTextSelected,
                    ]}>
                    {reason.label}
                  </Text>
                </TouchableOpacity>
              ))}

              <TextInput
                style={styles.descriptionInput}
                placeholder="Additional details (optional)"
                placeholderTextColor={colors.textSecondary}
                value={reportDescription}
                onChangeText={setReportDescription}
                multiline
                maxLength={500}
              />

              <View style={styles.modalButtons}>
                <Pressable
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowReportModal(false);
                    setSelectedReason(null);
                    setReportDescription('');
                  }}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.reportButton,
                    !selectedReason && styles.reportButtonDisabled,
                  ]}
                  onPress={handleBlockAndReport}
                  disabled={!selectedReason}>
                  <Text style={styles.reportButtonText}>Block & Report</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Media Preview Modal */}
        <Modal
          visible={showPreviewModal}
          transparent
          animationType="slide"
          statusBarTranslucent
          onRequestClose={() => setShowPreviewModal(false)}>
          <View style={styles.previewOverlay}>
            <View style={styles.previewHeader}>
              <Pressable
                onPress={() => setShowPreviewModal(false)}
                style={styles.previewCloseButton}>
                <Icon name="close" size={28} color="#fff" />
              </Pressable>
              <Text style={styles.previewTitleText}>Preview Image</Text>
              <View style={{width: 40}} />
            </View>

            <View style={styles.previewImageContainer}>
              {selectedMedia?.uri && (
                <Image
                  source={{uri: selectedMedia.uri}}
                  style={styles.fullPreviewImage}
                  resizeMode="contain"
                />
              )}
            </View>

            <View style={styles.previewFooter}>
              <TouchableOpacity
                style={styles.previewCancelButton}
                onPress={() => setShowPreviewModal(false)}>
                <Text style={styles.previewCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.previewSendButton}
                onPress={confirmSendMedia}>
                <LinearGradient
                  colors={[colors.primary, '#FF6B6B']}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 1}}
                  style={styles.previewSendGradient}>
                  <Text style={styles.previewSendText}>Send Image</Text>
                  <Icon size={18} color="#fff" style={{marginLeft: 8}} />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Full Screen Image Viewer Modal */}
        <Modal
          visible={showFullScreenImage}
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => setShowFullScreenImage(false)}>
          <View style={styles.fullImageOverlay}>
            <SafeAreaView style={styles.fullImageHeader}>
              <Pressable
                onPress={() => setShowFullScreenImage(false)}
                style={styles.fullImageCloseButton}>
                <Icon name="close" size={30} color="#fff" />
              </Pressable>
            </SafeAreaView>
            <View style={styles.fullImageContainer}>
              {fullScreenImageUrl && (
                <Image
                  source={{uri: fullScreenImageUrl}}
                  style={styles.fullImage}
                  resizeMode="contain"
                />
              )}
            </View>
          </View>
        </Modal>
      </SafeAreaView>

      {/* Gift Receiver Animation - rendered OUTSIDE SafeAreaView so it
          is never clipped by KeyboardAvoidingView on Android */}
      <GiftReceiverAnimation
        visible={showGiftAnimation}
        gift={receivedGiftForAnimation}
        onComplete={() => {
          setShowGiftAnimation(false);
          setReceivedGiftForAnimation(null);
        }}
      />
    </ThemeBackground>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },

  // Header
  headerContainer: {
    width: '100%',
    zIndex: 10,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  headerBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.3)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    height: 70,
    justifyContent: 'space-between',
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  headerTitlePressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  headerSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: '#eee',
  },
  headerAvatarText: {
    fontSize: 18,
    fontFamily: typography.fontFamilyBold,
    color: colors.primary,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: typography.fontFamilyBold,
    color: '#1a1a1a',
  },
  onlineBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ade80',
    marginRight: 4,
  },
  onlineText: {
    fontSize: 11,
    color: '#4ade80',
    fontFamily: typography.fontFamilyMedium,
  },
  offlineText: {
    fontSize: 11,
    color: colors.textTertiary,
    fontFamily: typography.fontFamilyMedium,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Messages
  messagesList: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  dateSeparatorText: {
    fontSize: 12,
    fontFamily: typography.fontFamilyMedium,
    color: '#666',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    overflow: 'hidden',
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    maxWidth: '85%',
  },
  rowLeft: {
    alignSelf: 'flex-start',
  },
  rowRight: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  avatarContainer: {
    marginRight: spacing.xs,
    alignSelf: 'flex-end',
    marginBottom: 4,
  },
  avatarText: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#eee',
    textAlign: 'center',
    lineHeight: 32,
    fontSize: 14,
    fontFamily: typography.fontFamilyBold,
    color: colors.primary,
  },
  bubbleContainer: {
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 2,
  },
  bubbleLeft: {
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    borderBottomLeftRadius: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  bubbleRight: {
    borderBottomRightRadius: 4,
  },
  bubbleGradient: {
    backgroundColor: 'rgba(124, 58, 237, 0.75)',
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 22,
    borderBottomRightRadius: 4,
  },
  bubbleContentThem: {
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  messageText: {
    fontSize: 15,
    fontFamily: typography.fontFamilyRegular,
    color: '#fff',
    lineHeight: 20,
  },
  messageTextThem: {
    color: '#1a1a1a',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  timeText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    marginRight: 4,
  },
  timeTextThem: {
    color: colors.textTertiary,
  },
  statusContainer: {
    marginLeft: 2,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 4,
  },
  gifImage: {
    width: 150,
    height: 150,
  },

  // Input Area
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(255, 255, 255, 0.5)',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 4,
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.7)',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: spacing.xs,
    fontSize: 15,
    fontFamily: typography.fontFamilyRegular,
    color: '#1a1a1a',
  },
  iconButton: {
    padding: 8,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Typing
  typingContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
  },
  typingText: {
    fontSize: 12,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalOverlayCentered: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  unmatchModalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: typography.fontFamilyBold,
    color: '#1a1a1a',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textSecondary,
    marginBottom: 24,
    lineHeight: 20,
  },
  reasonItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  reasonItemSelected: {
    backgroundColor: colors.primary + '10',
    borderColor: colors.primary,
  },
  reasonText: {
    fontSize: 15,
    fontFamily: typography.fontFamilyMedium,
    color: '#1a1a1a',
  },
  reasonTextSelected: {
    color: colors.primary,
    fontFamily: typography.fontFamilyBold,
  },
  descriptionInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 12,
    height: 100,
    textAlignVertical: 'top',
    fontSize: 14,
    color: '#1a1a1a',
    marginTop: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#eee',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    fontSize: 15,
    fontFamily: typography.fontFamilyBold,
    color: '#666',
  },
  reportButton: {
    flex: 2,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  reportButtonDisabled: {
    opacity: 0.5,
  },
  reportButtonText: {
    fontSize: 15,
    fontFamily: typography.fontFamilyBold,
    color: '#fff',
  },
  unmatchButton: {
    flex: 2,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#ff4b4b',
  },
  unmatchButtonDisabled: {
    opacity: 0.5,
  },
  unmatchButtonText: {
    fontSize: 15,
    fontFamily: typography.fontFamilyBold,
    color: '#fff',
  },
  blockedText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 20,
    textAlign: 'center',
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 24,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  timerBadge: {
    alignSelf: 'center',
    marginTop: spacing.sm,
  },

  // Gifts in chat
  giftMessageContainer: {
    alignItems: 'center',
    padding: 8,
  },
  giftMessageImage: {
    width: 60,
    height: 60,
    marginBottom: 8,
  },
  giftMessageText: {
    fontSize: 14,
    fontFamily: typography.fontFamilyBold,
    color: '#fff',
    textAlign: 'center',
  },
  giftMessageTextThem: {
    color: colors.primary,
  },

  // Media Preview Modal Styles
  previewOverlay: {
    flex: 1,
    backgroundColor: '#000',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
  },
  previewCloseButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewTitleText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: typography.fontFamilyBold,
  },
  previewImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullPreviewImage: {
    width: Dimensions.get('window').width,
    height: '100%',
  },
  previewFooter: {
    flexDirection: 'row',
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 50 : 30,
    backgroundColor: 'rgba(0,0,0,0.5)',
    gap: 16,
  },
  previewCancelButton: {
    flex: 1,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 27,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  previewCancelText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: typography.fontFamilyBold,
  },
  previewSendButton: {
    flex: 2,
    height: 54,
    borderRadius: 27,
    overflow: 'hidden',
  },
  previewSendGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewSendText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: typography.fontFamilyBold,
  },

  // Full Screen Image Styles
  fullImageOverlay: {
    flex: 1,
    backgroundColor: '#000',
  },
  fullImageHeader: {
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 20,
  },
  fullImageCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: Dimensions.get('window').width,
    height: '100%',
  },
});

export default ChatScreen;