import React from 'react';
import {View, Text, StyleSheet, Modal, ActivityIndicator} from 'react-native';

const SandClockLoader = ({visible}) => {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.container}>
        <View style={styles.loaderBox}>
          <ActivityIndicator size="large" color="#FF4D67" />
          <Text style={styles.text}>perfect match is loading</Text>
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
  text: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
});
