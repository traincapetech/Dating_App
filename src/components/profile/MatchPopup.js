import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Modal,
  Pressable,
  Dimensions,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

const MatchPopup = ({
  visible,
  myPhoto,
  theirPhoto,
  theirName,
  onContinue,
  onMessage,
}) => {
  // ── Investigation Logs ──────────────────────────────────────────────────────
  if (visible) {
    console.log('[MatchPopup] Rendering Match Modal');
    console.log('[MatchPopup] myPhoto (Current User):', myPhoto);
    console.log('[MatchPopup] theirPhoto (Matched User):', theirPhoto);
    console.log('[MatchPopup] theirName:', theirName);
  }

  // ── Defensive Image Source Handling ──────────────────────────────────────────
  const getSource = (photo, fallbackName = 'U') => {
    if (!photo) return { uri: `https://ui-avatars.com/api/?background=667eea&color=fff&name=${fallbackName}` };
    
    if (typeof photo === 'string' && photo.trim().length > 0) {
      return { uri: photo };
    }
    
    if (Array.isArray(photo) && photo.length > 0) {
      const first = photo[0];
      if (typeof first === 'string') return { uri: first };
      if (first?.url) return { uri: first.url };
      return { uri: `https://ui-avatars.com/api/?background=667eea&color=fff&name=${fallbackName}` };
    }

    if (photo && typeof photo === 'object' && photo.url) {
      return { uri: photo.url };
    }

    return { uri: `https://ui-avatars.com/api/?background=667eea&color=fff&name=${fallbackName}` };
  };

  return (
    <Modal 
      visible={visible} 
      transparent 
      animationType="fade"
      onRequestClose={onContinue}>
      <View style={styles.overlay}>
        <LinearGradient
          colors={['rgba(0,0,0,0.85)', 'rgba(0,0,0,0.95)']}
          style={styles.container}>
          
          <Text style={styles.title}>It's a Match! ❤️</Text>

          <View style={styles.imagesContainer}>
            <View style={styles.photoWrapper}>
                <Image source={getSource(myPhoto, 'Me')} style={styles.photo} />
            </View>
            <View style={styles.photoWrapper}>
                <Image source={getSource(theirPhoto, theirName?.[0] || 'T')} style={styles.photo} />
            </View>
          </View>

          <Text 
            style={styles.subtitle}
            numberOfLines={2}
            adjustsFontSizeToFit>
            You and {theirName || 'each other'} like each other.
          </Text>

          <View style={styles.buttonContainer}>
            <Pressable style={styles.chatButton} onPress={onMessage}>
              <LinearGradient
                colors={['#FF4D6D', '#FF758F']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 0}}
                style={styles.gradient}>
                <Text style={styles.chatButtonText}>Send a Message</Text>
              </LinearGradient>
            </Pressable>

            <Pressable onPress={onContinue} style={styles.keepSwiping}>
              <Text style={styles.keepSwipingText}>Keep Swiping</Text>
            </Pressable>
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: SCREEN_WIDTH * 0.9,
    paddingVertical: 40,
    paddingHorizontal: 20,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    color: '#fff',
    fontFamily: Platform.OS === 'ios' ? 'system' : 'Roboto',
    fontWeight: '800',
    marginBottom: 30,
    textAlign: 'center',
  },
  imagesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
    gap: 24, // Space between avatars
  },
  photoWrapper: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.3,
        shadowRadius: 10,
      },
      android: {elevation: 10},
    }),
  },
  photo: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: '#fff',
  },
  subtitle: {
    fontSize: 18,
    color: '#fff',
    marginTop: 16,
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '500',
    paddingHorizontal: 10,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 24,
  },
  chatButton: {
    width: '85%',
    height: 52,
    marginTop: 10,
    shadowColor: '#FF4D6D',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  gradient: {
    flex: 1,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  keepSwiping: {
    marginTop: 20,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  keepSwipingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    opacity: 0.9,
  },
});

export default MatchPopup;