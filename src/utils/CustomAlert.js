import { Alert as NativeAlert } from 'react-native';

let customAlertRef = null;
const originalAlert = NativeAlert.alert;

export const setCustomAlertRef = (ref) => {
  customAlertRef = ref;
};

// Monkey patch native alert to globally intercept all alerts in the app without touching individual files
NativeAlert.alert = function(title, message, buttons, options) {
  if (customAlertRef) {
    customAlertRef.show(title, message, buttons, options);
  } else {
    console.warn('CustomAlert reference not found. Falling back to native Alert.');
    originalAlert(title, message, buttons, options);
  }
};

export const CustomAlert = {
  alert: NativeAlert.alert,
};

export default CustomAlert;