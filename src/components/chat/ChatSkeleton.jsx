import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { spacing } from '../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ChatSkeleton = () => {
  const animatedValue = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 0.7,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [animatedValue]);

  const renderBubble = (isMe, widthPercent, index) => (
    <View key={index} style={[styles.messageRow, isMe ? styles.rowRight : styles.rowLeft]}>
      <Animated.View 
        style={[
          styles.bubble, 
          isMe ? styles.bubbleRight : styles.bubbleLeft,
          { 
            opacity: animatedValue, 
            width: SCREEN_WIDTH * widthPercent,
            // Vary height slightly for organic feel
            height: index % 3 === 0 ? 40 : index % 3 === 1 ? 55 : 44
          }
        ]} 
      />
    </View>
  );

  return (
    <View style={styles.container}>
      {renderBubble(false, 0.55, 0)}
      {renderBubble(true, 0.4, 1)}
      {renderBubble(false, 0.7, 2)}
      {renderBubble(false, 0.35, 3)}
      {renderBubble(true, 0.6, 4)}
      {renderBubble(false, 0.5, 5)}
      {renderBubble(true, 0.3, 6)}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    paddingTop: 20,
  },
  messageRow: {
    marginBottom: spacing.lg,
  },
  rowLeft: {
    alignSelf: 'flex-start',
  },
  rowRight: {
    alignSelf: 'flex-end',
  },
  bubble: {
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.4)', // Works well with lavender theme
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  bubbleLeft: {
    borderBottomLeftRadius: 4,
  },
  bubbleRight: {
    borderBottomRightRadius: 4,
    backgroundColor: 'rgba(124, 58, 237, 0.2)', // Light primary color for sender
  },
});

export default ChatSkeleton;
