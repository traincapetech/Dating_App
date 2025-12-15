import React, { useEffect, useState, useRef, useCallback } from 'react';
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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchImageLibrary } from 'react-native-image-picker';
import { colors, typography, spacing } from '../../../theme';
import { 
  initSocket, 
  joinChatRoom, 
  leaveChatRoom, 
  emitTyping, 
  emitStopTyping,
  emitMessageSeen 
} from '../../../services/socket';
import { 
  fetchMessages, 
  sendMessageApi, 
  markMessagesAsSeen,
  uploadChatMedia,
  blockAndReportUser,
  checkIfBlocked
} from '../../../services/chatService';

const REPORT_REASONS = [
  { id: 'harassment', label: 'Harassment' },
  { id: 'spam', label: 'Spam' },
  { id: 'inappropriate_content', label: 'Inappropriate Content' },
  { id: 'fake_profile', label: 'Fake Profile' },
  { id: 'underage', label: 'Underage User' },
  { id: 'other', label: 'Other' },
];

const ChatScreen = ({ route, navigation }) => {
  const { matchId, theirId, theirName } = route.params || {};
  const [currentUserId, setCurrentUserId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState(null);
  const [reportDescription, setReportDescription] = useState('');
  const [uploadingMedia, setUploadingMedia] = useState(false);

  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const socketRef = useRef(null);
  const lastTypingEmitRef = useRef(0);

  useEffect(() => {
    if (!matchId) {
      console.log("⚠ No matchId → Skipping chat initialization");
      return;
    }

    initChat();

    return () => {
      if (socketRef.current) {
        leaveChatRoom(matchId);
        socketRef.current.off('receiveMessage');
        socketRef.current.off('typing');
        socketRef.current.off('stopTyping');
        socketRef.current.off('messagesSeen');
        socketRef.current.off('messageStatusUpdate');
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [matchId]);

  const initChat = async () => {
    try {
      const userData = await AsyncStorage.getItem('@pryvo_user');
      if (!userData) {
        navigation.goBack();
        return;
      }
      
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

      // Mark messages as seen
      const unseenMessages = (data || [])
        .filter(m => m.receiverId === user.id && m.status !== 'seen')
        .map(m => m._id);
      
      if (unseenMessages.length > 0) {
        await markMessagesAsSeen(matchId, user.id);
      }

      // Init socket
      const socket = initSocket(user.id);
      socketRef.current = socket;

      // Join chat room
      joinChatRoom(matchId, user.id);

      // Listen for new messages
      socket.on('receiveMessage', (msg) => {
        if (msg.matchId === matchId) {
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some(m => m._id === msg._id)) return prev;
            return [...prev, msg];
          });
          scrollToBottom();

          // Mark as seen immediately if it's for us
          if (msg.receiverId === user.id) {
            emitMessageSeen(matchId, user.id, [msg._id]);
          }
        }
      });

      // Listen for typing indicator
      socket.on('typing', ({ userId }) => {
        if (userId !== user.id) {
          setTyping(true);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setTyping(false), 3000);
        }
      });

      socket.on('stopTyping', ({ userId }) => {
        if (userId !== user.id) {
          setTyping(false);
        }
      });

      // Listen for messages seen
      socket.on('messagesSeen', ({ userId, messageIds, seenAt }) => {
        if (userId !== user.id) {
          setMessages((prev) => 
            prev.map(m => 
              messageIds.includes(m._id) 
                ? { ...m, status: 'seen', seenAt } 
                : m
            )
          );
        }
      });

      // Listen for message status updates
      socket.on('messageStatusUpdate', ({ messageId, status }) => {
        setMessages((prev) => 
          prev.map(m => m._id === messageId ? { ...m, status } : m)
        );
      });

    } catch (e) {
      console.log('Error initializing chat', e);
      if (e?.status === 403) {
        Alert.alert('Access Denied', e.message || 'You cannot access this chat');
        navigation.goBack();
      }
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = useCallback(() => {
    if (flatListRef.current && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const handleSend = async () => {
    if ((!inputText.trim() && !uploadingMedia) || !currentUserId || sending) return;

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

      setMessages((prev) => [...prev, saved]);
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
      const uploadResult = await uploadChatMedia(imageBase64, currentUserId, matchId);
      
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

        setMessages((prev) => [...prev, saved]);
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

  const onChangeText = (text) => {
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
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (e) {
      console.log('Block and report error', e);
      Alert.alert('Error', 'Failed to block user. Please try again.');
    }
  };

  const getStatusIcon = (message) => {
    if (message.senderId !== currentUserId) return null;
    
    switch (message.status) {
      case 'sent':
        return '✓';
      case 'delivered':
        return '✓✓';
      case 'seen':
        return '✓✓';
      default:
        return '○';
    }
  };

  const renderItem = ({ item }) => {
    const isMe = item.senderId === currentUserId;
    
    return (
      <View style={[styles.messageRow, isMe ? styles.rowRight : styles.rowLeft]}>
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
          {item.mediaUrl && (
            <Image 
              source={{ uri: item.mediaUrl }} 
              style={styles.messageImage}
              resizeMode="cover"
            />
          )}
          {item.text && (
            <Text style={[styles.messageText, !isMe && styles.messageTextThem]}>
              {item.text}
            </Text>
          )}
          <View style={styles.messageFooter}>
            <Text style={[styles.timeText, !isMe && styles.timeTextThem]}>
              {new Date(item.timestamp).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </Text>
            {isMe && (
              <Text style={[
                styles.statusText, 
                item.status === 'seen' && styles.statusSeen
              ]}>
                {getStatusIcon(item)}
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  };

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
        <Text style={styles.blockedText}>This conversation is no longer available</Text>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Text style={styles.backText}>{'<'} Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{theirName || 'Chat'}</Text>
        <Pressable onPress={() => setShowReportModal(true)} style={styles.headerButton}>
          <Text style={styles.moreText}>⋯</Text>
        </Pressable>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item._id}
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
      <View style={styles.inputContainer}>
        <Pressable 
          style={styles.mediaButton} 
          onPress={handlePickImage}
          disabled={uploadingMedia}
        >
          {uploadingMedia ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={styles.mediaButtonText}>📷</Text>
          )}
        </Pressable>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor={colors.textSecondary}
          value={inputText}
          onChangeText={onChangeText}
          multiline
          maxLength={1000}
        />
        <Pressable 
          style={[styles.sendButton, (!inputText.trim() || sending) && styles.sendButtonDisabled]} 
          onPress={handleSend}
          disabled={!inputText.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.sendText}>Send</Text>
          )}
        </Pressable>
      </View>

      {/* Report Modal */}
      <Modal
        visible={showReportModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Report & Block User</Text>
            <Text style={styles.modalSubtitle}>Why are you reporting this user?</Text>
            
            {REPORT_REASONS.map((reason) => (
              <TouchableOpacity
                key={reason.id}
                style={[
                  styles.reasonItem,
                  selectedReason === reason.id && styles.reasonItemSelected
                ]}
                onPress={() => setSelectedReason(reason.id)}
              >
                <Text style={[
                  styles.reasonText,
                  selectedReason === reason.id && styles.reasonTextSelected
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
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable 
                style={[styles.reportButton, !selectedReason && styles.reportButtonDisabled]} 
                onPress={handleBlockAndReport}
                disabled={!selectedReason}
              >
                <Text style={styles.reportButtonText}>Block & Report</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },

  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: colors.background,
  },
  headerButton: {
    padding: spacing.sm,
  },
  backText: {
    fontSize: 16,
    color: colors.primary,
  },
  headerTitle: {
    fontSize: typography.headings?.h4 || 18,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
  },
  moreText: {
    fontSize: 24,
    color: colors.textPrimary,
  },

  messagesContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexGrow: 1,
  },
  messageRow: {
    marginVertical: 4,
    flexDirection: 'row',
  },
  rowLeft: {
    justifyContent: 'flex-start',
  },
  rowRight: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 18,
  },
  bubbleMe: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleThem: {
    backgroundColor: '#eee',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    color: '#fff',
    fontSize: 16,
  },
  messageTextThem: {
    color: colors.textPrimary,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: spacing.xs,
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 4,
  },
  timeText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
  },
  timeTextThem: {
    color: colors.textSecondary,
  },
  statusText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginLeft: 4,
  },
  statusSeen: {
    color: '#4FC3F7',
  },

  typingContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: 4,
  },
  typingText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },

  inputContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    alignItems: 'flex-end',
    backgroundColor: colors.background,
  },
  mediaButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.xs,
  },
  mediaButtonText: {
    fontSize: 24,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    marginRight: spacing.sm,
    backgroundColor: '#fff',
    maxHeight: 100,
    fontSize: 16,
    color: colors.textPrimary,
  },
  sendButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendText: {
    color: '#fff',
    fontWeight: '600',
  },

  blockedText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  backButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    paddingBottom: spacing.xl + 20,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  reasonItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: spacing.sm,
  },
  reasonItemSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  reasonText: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  reasonTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  descriptionInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: spacing.md,
    marginTop: spacing.md,
    minHeight: 80,
    textAlignVertical: 'top',
    fontSize: 14,
    color: colors.textPrimary,
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  reportButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 8,
    backgroundColor: '#E53935',
    alignItems: 'center',
  },
  reportButtonDisabled: {
    backgroundColor: '#ccc',
  },
  reportButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default ChatScreen;
