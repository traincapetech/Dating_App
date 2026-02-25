import React from 'react';
import { View, Text, Image, StyleSheet, Modal, Pressable } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

const MatchPopup = ({ visible, profileA, profileB, onContinue, onMessage }) => {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <LinearGradient
        colors={['#000000c0', '#000000e0']}
        style={styles.container}
      >
        <Text style={styles.title}>It's a Match! ❤️</Text>

        <View style={styles.imagesContainer}>
          <Image source={{ uri: profileA }} style={styles.photo} />
          <Image source={{ uri: profileB }} style={styles.photo} />
        </View>

        <Text style={styles.subtitle}>
          You and each other have liked each other.
        </Text>

        <Pressable style={styles.chatButton} onPress={onMessage}>
          <Text style={styles.chatButtonText}>Send a Message</Text>
        </Pressable>

        <Pressable onPress={onContinue} style={styles.keepSwiping}>
          <Text style={styles.keepSwipingText}>Keep Swiping</Text>
        </Pressable>
      </LinearGradient>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontSize: 34, color: '#fff', fontWeight: '700', marginBottom: 20 },
  subtitle: { fontSize: 16, color: '#ddd', marginTop: 10, textAlign: 'center' },
  imagesContainer: { flexDirection: 'row', gap: 20 },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#fff',
  },
  chatButton: {
    width: '70%',
    backgroundColor: '#FF4D6D',
    paddingVertical: 14,
    borderRadius: 30,
    marginTop: 30,
  },
  chatButtonText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    fontWeight: '600',
  },
  keepSwiping: { marginTop: 15 },
  keepSwipingText: { color: '#fff', fontSize: 16, opacity: 0.8 },
});

export default MatchPopup;
