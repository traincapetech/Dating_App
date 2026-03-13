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
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
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
import {getMatchDetails, scheduleDate} from '../../../services/matchService';
import DateSchedulerModal from '../components/DateSchedulerModal';
import giftService from '../../../services/giftService';
import GiftSelectionModal from '../../../components/chat/GiftSelectionModal';
import streakService from '../../../services/streakService';
import StreakBadge from '../../../components/common/StreakBadge';
import StreakWarningBanner from '../../../components/common/StreakWarningBanner';
import GiftReceiverAnimation from '../../../components/chat/GiftReceiverAnimation';
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

  // Date or Dissolve State
  const [matchDetails, setMatchDetails] = useState(null);
  const [showDateModal, setShowDateModal] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [streak, setStreak] = useState(null);
  const [showStreakWarning, setShowStreakWarning] = useState(false);
  const [showGiftAnimation, setShowGiftAnimation] = useState(false);
  const [receivedGiftForAnimation, setReceivedGiftForAnimation] = useState(null);

  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const socketRef = useRef(null);
  const lastTypingEmitRef = useRef(0);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!matchId) {
      console.log('⚠ No matchId → Skipping chat initialization');
      return;
    }

    initChat();

    // Enable screenshot blocking in chat
    ScreenshotPrevent.enabled(true);

    return () => {
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
      ScreenshotPrevent.enabled(false);
    };
  }, [matchId]);

  const initChat = async () => {
    try {
      const userData = await AsyncStorage.getItem('@pryvo_user');
      if (userData && userData !== 'undefined') {
        const user = JSON.parse(userData);
        setCurrentUserId(user.id);

        // Check if blocked
        const blockStatus = await checkIfBlocked(user.id, theirId);
        if (blockStatus.isBlocked) {
          setIsBlocked(true);
          setLoading(false);
          return;
        }

        // Load existing messages
        const data = await fetchMessages(matchId, user.id);
        setMessages(data || []);

        // Filter unseen messages for the current user
        const unseenMessages = (data || []).filter(
          m => m.receiverId === user.id && m.status !== 'seen'
        );

        if (unseenMessages.length > 0) {
          const unseenIds = unseenMessages.map(m => m._id);
          await markMessagesAsSeen(matchId, user.id);
          
          // Trigger Gift Animation for newly received (unseen) gifts
          const unseenGifts = unseenMessages.filter(m => m.mediaType === 'gift');
          if (unseenGifts.length > 0) {
            // Show animation for the most recent gift in the batch
            const latestGift = unseenGifts[unseenGifts.length - 1];
            if (latestGift.giftMetadata) {
              console.log('[ChatScreen] 🎁 Triggering animation for unseen gift:', latestGift.giftMetadata.slug);
              setReceivedGiftForAnimation({...latestGift.giftMetadata, isSender: false});
              setShowGiftAnimation(true);
            }
          }
        }

        // Fetch Match Details (Status & Expiration)
        const details = await getMatchDetails(matchId);
        setMatchDetails(details);

        // Fetch Streak Data
        try {
          const streakData = await streakService.getStreakForPair(
            user.id,
            theirId,
          );
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

        // Init socket
        const socket = initSocket(user.id);
        socketRef.current = socket;

        // Join chat room
        joinChatRoom(matchId, user.id);

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
              console.log('[ChatScreen] 🎁 Receiver gift animation for:', msg.giftMetadata?.slug);
              setReceivedGiftForAnimation({...msg.giftMetadata, isSender: false});
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

        // Real-time streak updates
        socket.on('streak:update', data => {
          const ourPairId = [user.id, theirId].sort().join('_');
          if (data.userPairId === ourPairId) {
            setStreak(data);
            setShowStreakWarning(false); // New activity clears the warning
          }
        });
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

  const handleSend = async () => {
    if ((!inputText.trim() && !uploadingMedia) || !currentUserId || sending)
      return;

    const text = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      const saved = await sendMessageApi({
        matchId,
        senderId: currentUserId,
        receiverId: theirId,
        text,
      });

      setMessages(prev => {
        // Avoid adding if already received via socket
        if (prev.some(m => m._id === saved._id)) return prev;
        return [...prev, saved];
      });
      scrollToBottom();

      // Stop typing indicator
      emitStopTyping(matchId, currentUserId);
    } catch (e) {
      console.log('Send message error', e);
      Alert.alert('Error', 'Failed to send message. Please try again.');
      setInputText(text); // Restore text on error
    } finally {
      setSending(false);
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

      if (result.didCancel || !result.assets?.[0]?.base64) return;

      setUploadingMedia(true);

      const imageBase64 = result.assets[0].base64;

      // Upload image
      const uploadResult = await uploadChatMedia(
        imageBase64,
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
          mediaType: 'image',
        });

        setMessages(prev => [...prev, saved]);
        scrollToBottom();
      } else {
        throw new Error('Failed to upload image');
      }
    } catch (e) {
      console.log('Image upload error', e);
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

      setMessages(prev => [...prev, saved]);
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
          setReceivedGiftForAnimation({...res.message.giftMetadata, isSender: true});
          setShowGiftAnimation(true);
        }
      }
    } catch (e) {
      console.log('Gift send error', e);
      Alert.alert('Error', e.message || 'Failed to send gift. Please try again.');
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
    Alert.alert(
      'Unmatch',
      "Are you sure you want to unmatch? This will remove this conversation and you won't be able to message each other anymore.",
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Unmatch',
          style: 'destructive',
          onPress: async () => {
            setUnmatching(true);
            try {
              await unmatchUser(matchId, currentUserId);
              Alert.alert('Unmatched', 'You have unmatched with this user.', [
                {text: 'OK', onPress: () => navigation.goBack()},
              ]);
            } catch (e) {
              console.log('Unmatch error', e);
              Alert.alert('Error', 'Failed to unmatch. Please try again.');
            } finally {
              setUnmatching(false);
            }
          },
        },
      ],
    );
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
    [matchId, currentUserId], // Add missing dependencies if needed, or keep generic
    [matchId, currentUserId], // Add missing dependencies if needed, or keep generic
  );

  const handleScheduleDate = async date => {
    if (!currentUserId || !matchId) return;

    setScheduling(true);
    try {
      const result = await scheduleDate(
        matchId,
        date,
        'Date scheduled via Pryvo',
        'in-person',
      );
      if (result.success) {
        setMatchDetails(prev => ({
          ...prev,
          status: 'secured',
          dateScheduled: date,
          expiresAt: null,
        }));
        setShowDateModal(false);
        Alert.alert(
          'Date Secured! 🎉',
          'The timer has stopped. Improve your Karma by showing up!',
        );

        // Optionally send a system message
        await sendMessageApi({
          matchId,
          senderId: currentUserId,
          receiverId: theirId,
          text: `📅 I've promised a date on ${new Date(
            date,
          ).toLocaleDateString()}! Let's meet!`,
        });
      }
    } catch (error) {
      console.error('Schedule date error:', error);
      Alert.alert('Error', 'Failed to schedule date');
    } finally {
      setScheduling(false);
    }
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
            onLongPress={() => (isMe ? handleDeleteMessage(item._id) : null)}
            delayLongPress={500}
            style={[
              styles.bubbleContainer,
              isMe ? styles.bubbleRight : styles.bubbleLeft,
            ]}>
            {isMe ? (
              <LinearGradient
                colors={[colors.primary, '#FF6B6B']}
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
          <Text style={[styles.giftMessageText, !isMe && styles.giftMessageTextThem]}>
            {(() => {
              const slug = item.giftMetadata.slug;
              if (isMe) return `You sent a ${item.giftMetadata.name}`;
              if (slug === 'rose') return 'A beautiful rose has been sent to you 🌹';
              if (slug === 'teddy-bear') return 'You received a cute teddy bear 🧸';
              if (slug === 'ring') return 'A sparkling ring just arrived for you 💍';
              if (slug === 'diamond') return 'You’ve been gifted a shining diamond 💎';
              if (slug === 'crown') return 'You’ve been crowned with a royal gift 👑';
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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

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

  return (<>
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <LinearGradient
            colors={['#fff', '#f8f8f8']}
            style={styles.headerBackground}
          />
          <View style={styles.headerContent}>
            <Pressable
              onPress={() => navigation.goBack()}
              style={styles.headerButton}>
              <Icon name="chevron-back" size={28} color={colors.textPrimary} />
            </Pressable>

            <View style={styles.headerTitleContainer}>
              <View style={styles.headerAvatar}>
                {theirPhoto ? (
                  <Image
                    source={{uri: theirPhoto}}
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: 20,
                    }}
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
                  {theirAge ? `, ${theirAge}` : ''}
                </Text>
                <View style={styles.headerSubRow}>
                  {matchDetails?.status === 'active' ? (
                    <View style={styles.onlineBadgeContainer}>
                      <View style={styles.onlineBadge} />
                      <Text style={styles.onlineText}>Online</Text>
                    </View>
                  ) : matchDetails?.status === 'secured' ? (
                    <Text style={[styles.onlineText, {color: '#4CAF50'}]}>
                      📅{' '}
                      {new Date(
                        matchDetails.dateScheduled,
                      ).toLocaleDateString()}
                    </Text>
                  ) : (
                    <Text style={[styles.onlineText, {color: colors.error}]}>
                      ⌛ Expired
                    </Text>
                  )}

                  {streak && streak.streakCount > 0 && (
                    <StreakBadge
                      count={streak.streakCount}
                      graceUsed={streak.graceUsed}
                    />
                  )}
                </View>
              </View>
            </View>

            <View style={styles.headerActions}>
              {matchDetails && matchDetails.status !== 'expired' && (
                <CountdownTimer
                  expiresAt={matchDetails.expiresAt}
                  status={matchDetails.status}
                />
              )}
              {matchDetails?.status === 'active' && (
                <Pressable
                  onPress={() => setShowDateModal(true)}
                  style={[
                    styles.headerActionButton,
                    {
                      backgroundColor: colors.primary,
                      borderRadius: 20,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      marginLeft: 8,
                    },
                  ]}>
                  <Text
                    style={{color: '#fff', fontWeight: 'bold', fontSize: 11}}>
                    Date
                  </Text>
                </Pressable>
              )}
              <Pressable
                onPress={() => setShowUnmatchModal(true)}
                style={styles.headerActionButton}>
                <Icon
                  name="heart-dislike-outline"
                  size={24}
                  color={colors.error}
                />
              </Pressable>
              <Pressable
                onPress={() => setShowReportModal(true)}
                style={styles.headerActionButton}>
                <Icon
                  name="ellipsis-vertical"
                  size={24}
                  color={colors.textPrimary}
                />
              </Pressable>
            </View>
          </View>
        </View>

        {showStreakWarning && streak?.lastActivityDate && (
          <StreakWarningBanner
            expiresAt={
              new Date(streak.lastActivityDate).getTime() + 24 * 60 * 60 * 1000
            }
            onDismiss={() => setShowStreakWarning(false)}
          />
        )}

        {/* Messages */}

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.messagesContainer}
          onContentSizeChange={scrollToBottom}
          onLayout={scrollToBottom}
        />

        {/* Typing indicator */}
        {typing && (
          <View style={styles.typingContainer}>
            <Text style={styles.typingText}>typing...</Text>
          </View>
        )}

        {/* Input */}
        <View
          style={[
            styles.inputContainer,
            {paddingBottom: (insets.bottom || 0) + spacing.sm},
          ]}>
          <Pressable
            style={styles.attachButton}
            onPress={handlePickImage}
            disabled={uploadingMedia}>
            {uploadingMedia ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Icon
                name="image-outline"
                size={24}
                color={colors.textSecondary}
              />
            )}
          </Pressable>

          <Pressable
            style={styles.attachButton}
            onPress={() => setShowGiftModal(true)}>
            <Icon
              name="gift-outline"
              size={24}
              color={colors.primary}
            />
          </Pressable>

          {matchDetails?.status === 'expired' ? (
            <View
              style={[
                styles.inputWrapper,
                {backgroundColor: '#f0f0f0', justifyContent: 'center'},
              ]}>
              <Text style={{color: colors.textSecondary, textAlign: 'center'}}>
                Chat expired. You missed the date!
              </Text>
            </View>
          ) : (
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Message..."
                placeholderTextColor={colors.textSecondary}
                value={inputText}
                onChangeText={onChangeText}
                multiline
                maxLength={1000}
              />
              <Pressable
                style={styles.iconButton}
                onPress={() => setShowEmojiPicker(true)}>
                <Icon
                  name="happy-outline"
                  size={24}
                  color={colors.textSecondary}
                />
              </Pressable>
            </View>
          )}

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

        {/* Date Scheduler Modal */}
        <DateSchedulerModal
          visible={showDateModal}
          onClose={() => setShowDateModal(false)}
          onSchedule={handleScheduleDate}
          loading={scheduling}
        />

        {/* Unmatch Modal */}
        <Modal
          visible={showUnmatchModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowUnmatchModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.unmatchModalContent}>
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
            </View>
          </View>
        </Modal>

        {/* Note: GiftReceiverAnimation is rendered via its own Modal below */}

        {/* Report Modal */}
        <Modal
          visible={showReportModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowReportModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
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
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
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
  </>);
};

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#fff'},
  container: {flex: 1, backgroundColor: '#f8f9fa'},
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },

  // Header
  headerContainer: {
    height: 70, // Increased height
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 5,
    zIndex: 10,
  },
  headerBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    justifyContent: 'space-between',
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.sm,
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
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4CAF50',
    marginRight: 4,
  },
  onlineText: {
    fontSize: 12,
    color: '#4CAF50',
    fontFamily: typography.fontFamilyMedium,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerButton: {
    padding: 8,
  },
  headerActionButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },

  // Messages
  messagesContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexGrow: 1,
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  dateSeparatorText: {
    fontSize: 12,
    color: '#999',
    backgroundColor: '#eee',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: 'hidden',
  },
  messageRow: {
    marginVertical: 4,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  rowLeft: {
    justifyContent: 'flex-start',
  },
  rowRight: {
    justifyContent: 'flex-end',
  },
  avatarContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 4,
  },
  avatarText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
  },
  bubbleContainer: {
    maxWidth: '75%',
    borderRadius: 20,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  bubbleRight: {
    borderBottomRightRadius: 4,
  },
  bubbleLeft: {
    borderBottomLeftRadius: 4,
  },
  bubbleGradient: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: 20,
    borderBottomRightRadius: 4,
  },
  bubbleContentThem: {
    backgroundColor: '#fff',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: 20,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#eee',
  },
  messageText: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 22,
  },
  messageTextThem: {
    color: '#1a1a1a',
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 4,
  },
  gifImage: {
    width: 250,
    height: 200,
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 4,
  },
  timeText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    marginRight: 4,
  },
  timeTextThem: {
    color: '#999',
  },
  statusContainer: {
    marginLeft: 2,
  },

  // Typing
  typingContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: 8,
    marginLeft: 36, // Align with bubble (avatar width + gap)
  },
  typingText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },

  // Input
  inputContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  attachButton: {
    padding: 8,
    marginRight: 8,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 24,
    paddingHorizontal: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  input: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    fontSize: 16,
    color: '#1a1a1a',
    maxHeight: 100,
  },
  iconButton: {
    padding: 6,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  sendButtonGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#f5f5f5',
    elevation: 0,
  },

  // Modal styles (keeping mostly same but refining)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    paddingBottom: spacing.xl + 20,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: typography.fontFamilyBold,
    color: '#1a1a1a',
    marginBottom: spacing.xs,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: spacing.lg,
  },
  reasonItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 8,
    backgroundColor: '#fafafa',
  },
  reasonItemSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  reasonText: {
    fontSize: 16,
    color: '#333',
  },
  reasonTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  descriptionInput: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    fontSize: 16,
    color: '#1a1a1a',
    backgroundColor: '#fafafa',
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: '600',
    fontSize: 16,
  },
  reportButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#E53935',
    alignItems: 'center',
    elevation: 2,
  },
  reportButtonDisabled: {
    backgroundColor: '#ffcdd2',
    elevation: 0,
  },
  reportButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  unmatchModalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    margin: 20,
    maxWidth: 400,
    alignSelf: 'center',
    elevation: 5,
  },
  unmatchButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.error,
    alignItems: 'center',
  },
  unmatchButtonDisabled: {
    opacity: 0.6,
  },
  unmatchButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  blockedText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  // Gift Styles
  giftMessageContainer: {
    padding: spacing.xs,
    alignItems: 'center',
    width: 150,
  },
  giftMessageImage: {
    width: 100,
    height: 100,
    marginBottom: spacing.xs,
  },
  giftMessageText: {
    color: '#fff',
    fontFamily: typography.fontFamilyBold,
    fontSize: 14,
    textAlign: 'center',
  },
  giftMessageTextThem: {
    color: colors.primary,
  },
});

export default ChatScreen;
