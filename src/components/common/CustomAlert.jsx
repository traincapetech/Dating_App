import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { Modal, View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { colors, typography, spacing, shadow } from '../../theme';

const CustomAlertComponent = forwardRef((props, ref) => {
  const [visible, setVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: '',
    message: '',
    buttons: [],
    options: {},
  });

  useImperativeHandle(ref, () => ({
    show: (title, message, buttons, options) => {
      setAlertConfig({ title, message, buttons, options });
      setVisible(true);
    },
    hide: () => {
      setVisible(false);
    }
  }));

  if (!visible) return null;

  const { title, message, buttons, options } = alertConfig;
  
  // Default to a single OK button if none provided
  const renderButtons = buttons && buttons.length > 0 ? buttons : [{ text: 'OK', onPress: () => {} }];

  const handlePress = (button) => {
    setVisible(false);
    if (button.onPress) {
      // Small timeout to allow modal to close before executing action
      setTimeout(() => {
        button.onPress();
      }, 50);
    }
  };

  const cancelable = options?.cancelable ?? false;
  
  const handleBackdropPress = () => {
    if (cancelable) {
      if (options?.onDismiss) {
        options.onDismiss();
      }
      setVisible(false);
    }
  };

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
      onRequestClose={handleBackdropPress}
    >
      <Pressable 
        style={styles.overlay} 
        onPress={handleBackdropPress}
        disabled={!cancelable}
      >
        <Pressable style={styles.alertContainer} disabled={true}>
          <View style={styles.alertBox}>
            {title ? <Text style={styles.title}>{title}</Text> : null}
            {message ? <Text style={styles.message}>{message}</Text> : null}
            
            <View style={[
              styles.buttonContainer,
              renderButtons.length > 2 && { justifyContent: 'space-between' }
            ]}>
              {renderButtons.map((btn, index) => {
                const isCancel = btn.style === 'cancel';
                const isDestructive = btn.style === 'destructive';
                const isMany = renderButtons.length > 2;
                
                return (
                  <Pressable
                    key={index}
                    style={({ pressed }) => [
                      styles.button,
                      isCancel ? styles.buttonCancel : 
                      isDestructive ? styles.buttonDestructive : 
                      styles.buttonPrimary,
                      isMany && { flex: 1, paddingHorizontal: 4 },
                      pressed && styles.buttonPressed
                    ]}
                    onPress={() => handlePress(btn)}
                  >
                    <Text 
                      style={[
                        styles.buttonText,
                        isMany && { fontSize: 10, letterSpacing: 0.5 },
                        isCancel ? styles.buttonTextCancel : 
                        isDestructive ? styles.buttonTextDestructive : 
                        styles.buttonTextPrimary
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {btn.text ? String(btn.text).toUpperCase() : 'OK'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  alertContainer: {
    width: '100%',
    maxWidth: 320,
    ...shadow.large,
  },
  alertBox: {
    backgroundColor: '#9E69C0', // Requested purple background
    borderTopLeftRadius: 0,
    borderTopRightRadius: 40,
    borderBottomRightRadius: 0,
    borderBottomLeftRadius: 40,
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 20, // Extra space so button is never clipped
    // overflow: 'hidden' was REMOVED — it was clipping the OK button!
  },
  title: {
    fontSize: 22,
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
    color: '#FFFFFF', // High contrast white
    textAlign: 'left',
    marginBottom: 10,
    fontWeight: '900',
  },
  message: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Regular' : 'sans-serif',
    color: 'rgba(255, 255, 255, 0.9)', // High contrast soft white
    textAlign: 'left',
    marginBottom: 28,
    lineHeight: 22,
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: '100%',
    gap: 12,
  },
  button: {
    paddingHorizontal: 32,
    paddingVertical: 13,
    borderRadius: 30, // Pill shape
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 110,
    borderWidth: 2,
  },
  buttonPrimary: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderColor: '#FFFFFF',
  },
  buttonCancel: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderColor: 'rgba(255,255,255,0.4)',
  },
  buttonDestructive: {
    backgroundColor: 'rgba(255, 59, 48, 0.8)',
    borderColor: '#FF3B30',
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  buttonTextPrimary: {
    color: '#FFFFFF', // White text on translucent pill
  },
  buttonTextDestructive: {
    color: '#FFFFFF', // White text on red background
  },
  buttonTextCancel: {
    color: '#FFFFFF', // White text on translucent cancel button
  }
});

export default CustomAlertComponent;