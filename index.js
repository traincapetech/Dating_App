// CRITICAL: Import ErrorUtils polyfill FIRST before anything else
import './errorutils-polyfill.js';

// IMPORTANT: react-native-gesture-handler must be imported AFTER polyfill
import 'react-native-gesture-handler';
import {enableScreens} from 'react-native-screens';

enableScreens();
import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);

