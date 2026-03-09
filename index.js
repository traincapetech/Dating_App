// CRITICAL: Import ErrorUtils polyfill FIRST before anything else
import './errorutils-polyfill';

// IMPORTANT: react-native-gesture-handler must be imported AFTER polyfill
import 'react-native-gesture-handler';
import {enableScreens} from 'react-native-screens';

enableScreens();

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import messaging from '@react-native-firebase/messaging';
import {handleBackgroundMessage} from './src/services/notifications/backgroundHandler';

// Register background handler
messaging().setBackgroundMessageHandler(handleBackgroundMessage);

AppRegistry.registerComponent(appName, () => App);
