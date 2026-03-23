import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

const options = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

// Use for light interactions (e.g. typing, minor button presses)
export const triggerLightHaptic = () => {
  ReactNativeHapticFeedback.trigger('impactLight', options);
};

// Use for medium interactions (e.g. standard button presses, navigating)
export const triggerMediumHaptic = () => {
  ReactNativeHapticFeedback.trigger('impactMedium', options);
};

// Use for significant interactions (e.g. swiping, liking)
export const triggerHeavyHaptic = () => {
  ReactNativeHapticFeedback.trigger('impactHeavy', options);
};

// Use for success states (e.g. It's a match, payment successful, photo uploaded)
export const triggerSuccessHaptic = () => {
  ReactNativeHapticFeedback.trigger('notificationSuccess', options);
};

// Use for warnings or errors (e.g. unmatching, block user, error fetching)
export const triggerErrorHaptic = () => {
  ReactNativeHapticFeedback.trigger('notificationError', options);
};

// Use for prominent alerts (e.g. new message received in app)
export const triggerWarningHaptic = () => {
  ReactNativeHapticFeedback.trigger('notificationWarning', options);
};
