import React, { useEffect, useState, useRef } from 'react';
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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, typography, spacing } from '../../../theme';
import { initSocket } from '../../../services/socket';
import { fetchMessages, sendMessageApi } from '../../../services/chatService';




const ChatScreen = ({ route, navigation }) => {
  const { matchId, theirId } = route.params || {};
  const [currentUserId, setCurrentUserId] = useState(null);
  const [messages, setMessages] = useState([]); // oldest -> latest
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [typing, setTyping] = useState(false);

  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!matchId) {
      console.log("⚠ No matchId → Skipping fetchMessages");
      return;
    }
  
    loadMessages();
  }, [matchId]);
  
  useEffect(() => {
    const init = async () => {
      const userData = await AsyncStorage.getItem('@pryvo_user');
      if (!userData) return;
      const user = JSON.parse(userData);
      setCurrentUserId(user.id);

      // Load existing messages from API
      try {
        const data = await fetchMessages(matchId);
        setMessages(data || []);
      } catch (e) {
        console.log('Error loading messages', e);
      } finally {
        setLoading(false);
      }

      // Init socket
      const socket = initSocket();
      socketRef.current = socket;

      socket.emit('joinRoom', { matchId });

      socket.on('receiveMessage', (msg) => {
        // Only add if same room
        if (msg.matchId === matchId) {
          setMessages((prev) => [...prev, msg]);
          scrollToBottom();
        }
      });

      socket.on('typing', () => {
        setTyping(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setTyping(false), 2000);
      });
    };

    init();

    return () => {
      if (socketRef.current) {
        socketRef.current.off('receiveMessage');
        socketRef.current.off('typing');
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [matchId]);

  const scrollToBottom = () => {
    if (flatListRef.current) {
      setTimeout(
        () => flatListRef.current.scrollToEnd({ animated: true }),
        100
      );
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || !currentUserId) return;

    const text = inputText.trim();
    setInputText('');

    try {
      // Save in DB
      const saved = await sendMessageApi({
        matchId,
        senderId: currentUserId,
        receiverId: theirId,
        text,
      });

      // Emit over socket
      if (socketRef.current) {
        socketRef.current.emit('sendMessage', saved);
      }

      // Optimistically add
      setMessages((prev) => [...prev, saved]);
      scrollToBottom();
    } catch (e) {
      console.log('Send message error', e);
    }
  };

  const onChangeText = (text) => {
    setInputText(text);
    if (socketRef.current) {
      socketRef.current.emit('typing', matchId);
    }
  };

  const renderItem = ({ item }) => {
    const isMe = item.senderId === currentUserId;
    return (
      <View
        style={[
          styles.messageRow,
          isMe ? styles.rowRight : styles.rowLeft,
        ]}
      >
        <View
          style={[
            styles.bubble,
            isMe ? styles.bubbleMe : styles.bubbleThem,
          ]}
        >
          {item.text ? <Text style={styles.messageText}>{item.text}</Text> : null}
          {/* You can show time or seen here */}
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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      {/* Simple header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>{'<'} Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Chat</Text>
        <Pressable
          onPress={() =>
            console.log('Call button pressed (we will hook WebRTC here)')
          }
        >
          <Text style={styles.callText}>📞</Text>
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
      />

      {/* Typing indicator */}
      {typing && (
        <View style={styles.typingContainer}>
          <Text style={styles.typingText}>Typing...</Text>
        </View>
      )}

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={inputText}
          onChangeText={onChangeText}
        />
        <Pressable style={styles.sendButton} onPress={handleSend}>
          <Text style={styles.sendText}>Send</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backText: {
    fontSize: 16,
    color: colors.primary,
  },
  headerTitle: {
    fontSize: typography.headings.h4,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
  },
  callText: {
    fontSize: 20,
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
    color: colors.textInverse,
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
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    marginRight: spacing.sm,
    backgroundColor: '#fff',
  },
  sendButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.primary,
  },
  sendText: {
    color: colors.textInverse,
    fontWeight: '600',
  },
});

export default ChatScreen;
