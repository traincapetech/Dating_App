// CRITICAL: Set up ErrorUtils IMMEDIATELY before any imports
// This must execute synchronously at module load time
(function() {
  'use strict';
  // Import error-guard synchronously to set up ErrorUtils
  try {
    require('@react-native/js-polyfills/error-guard');
  } catch (e) {
    // Silently fail if error-guard not available
  }
})();

// Now import polyfills and app code
import './src/utils/gestureHandlerPolyfill';
import './src/utils/cryptoPolyfill';
import 'react-native-gesture-handler';
import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);
