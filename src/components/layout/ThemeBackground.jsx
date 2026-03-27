import React from 'react';
import { StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

/**
 * Global Background Wrapper for Premium Theme
 * Soft lavender/purple watercolor gradient
 */
const ThemeBackground = ({ children, style, colors = ['#f3e8ff', '#e9d5ff', '#d8b4fe'] }) => {
  return (
    <LinearGradient
      colors={colors}
      style={[styles.container, style]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {children}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default ThemeBackground;
