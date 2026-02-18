import React from 'react';
import {View, Text, StyleSheet, Modal} from 'react-native';
import LottieView from 'lottie-react-native';

const SandClockLoader = ({visible}) => {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.container}>
        <View style={styles.loaderBox}>
          <LottieView
            source={require('../assets/animations/hourglass.json')}
            autoPlay
            loop
            style={styles.animation}
          />
          <Text style={styles.text}>Perfect Match Loading...</Text>
        </View>
      </View>
    </Modal>
  );
};

export default SandClockLoader;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderBox: {
    backgroundColor: 'white',
    borderRadius: 20,
    paddingVertical: 30,
    paddingHorizontal: 40,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  animation: {
    width: 150,
    height: 150,
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
});
