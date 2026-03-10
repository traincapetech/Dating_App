import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import {useNavigationContainerRef} from '@react-navigation/native';
import {useSocket} from '../../context/SocketContext';
import {colors, spacing, shadow} from '../../theme';
import Icon from 'react-native-vector-icons/Ionicons';

const {width} = Dimensions.get('window');

/**
 * Global Notification Banner
 * Shows up automatically when a new message is received via Socket,
 * unless the user is already in that specific chat room.
 */
export const GlobalNotification = ({navigationRef}) => {
  const {lastMessage, setLastMessage} = useSocket();
  const [visible, setVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (lastMessage) {
      // 1. Check if user is currently in this specific chat
      const currentRoute = navigationRef.getCurrentRoute();
      const inChatWithSource =
        currentRoute?.name === 'ChatScreen' &&
        currentRoute?.params?.matchId === lastMessage.matchId;

      // 2. Only show if not in that chat and not own message
      // Note: Own messages also arrive via socket for multi-device sync
      const isOurMessage = lastMessage.senderId === undefined; // Check if it's from backend or simplified

      if (!inChatWithSource && lastMessage.senderId) {
        showNotification();
      }
    }
  }, [lastMessage]);

  const showNotification = () => {
    setVisible(true);
    Animated.spring(slideAnim, {
      toValue: 20, // Distance from top
      useNativeDriver: true,
      bounciness: 8,
    }).start();

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(hideNotification, 5000);
  };

  const hideNotification = () => {
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      setLastMessage(null); // Clear last message so it can show again
    });
  };

  const onPress = () => {
    if (lastMessage) {
      // Prepare chat params - Note: Ideally we should fetch their name/photo here
      // But for now we just go to the chat.
      navigationRef.navigate('ChatScreen', {
        matchId: lastMessage.matchId,
        theirId: lastMessage.senderId,
        theirName: 'New Contact', // Fallback
      });
      hideNotification();
    }
  };

  if (!visible || !lastMessage) return null;

  return (
    <Animated.View
      style={[styles.container, {transform: [{translateY: slideAnim}]}]}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.9}
        style={styles.content}>
        <View style={styles.iconCircle}>
          <Icon name="chatbubble" size={20} color="#fff" />
        </View>
        <View style={styles.textPart}>
          <Text style={styles.title} numberOfLines={1}>
            New Message
          </Text>
          <Text style={styles.body} numberOfLines={1}>
            {lastMessage.text || '📷 Sent a photo'}
          </Text>
        </View>
        <TouchableOpacity onPress={hideNotification} style={styles.closeBtn}>
          <Icon name="close" size={18} color="#999" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: spacing.md,
    right: spacing.md,
    zIndex: 9999,
    backgroundColor: '#fff',
    borderRadius: 16,
    ...shadow.medium,
    elevation: 10,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textPart: {
    flex: 1,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 14,
    color: colors.textPrimary,
  },
  body: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
});

export default GlobalNotification;
