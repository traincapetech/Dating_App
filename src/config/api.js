import {Platform} from 'react-native';

// API Configuration
// For local development on physical device:
// 1. Find your computer's IP address (run: ipconfig on Windows or ifconfig on Mac/Linux)
// 2. Make sure your phone and computer are on the same WiFi network
// 3. Replace 'YOUR_COMPUTER_IP' below with your actual IP (e.g., '192.168.1.100')
// 4. Make sure your backend server is running on port 3000
// 5. Make sure your computer's firewall allows connections on port 3000

// For production:
// Replace with your deployed backend URL (e.g., 'https://pryvo-server.onrender.com')
const PRODUCTION_API_URL = 'https://dating-app-backend-19lb.onrender.com/api';
const PRODUCTION_SOCKET_URL = 'https://dating-app-backend-19lb.onrender.com';

// For local development - replace with your computer's IP address
// Used for physical device connections on the same WiFi network
const LOCAL_API_URL = 'http://192.168.1.159:3000/api';
const LOCAL_SOCKET_URL = 'http://192.168.1.159:3000';

// Android emulator uses 10.0.2.2 to access the host machine's localhost
const EMULATOR_API_URL = 'http://10.0.2.2:3000/api';
const EMULATOR_SOCKET_URL = 'http://10.0.2.2:3000';

// Set to true for production, false for local development
const IS_PRODUCTION = true;

// Set to true when testing on Android EMULATOR, false for physical device on WiFi
// Switch this to false when running on a real physical Android device
const IS_ANDROID_EMULATOR = false;

// Stripe Configuration
export const STRIPE_PUBLISHABLE_KEY = IS_PRODUCTION 
  ? 'pk_live_your_live_key_here' // REPLACE WITH LIVE KEY IN PRODUCTION
  : 'pk_test_51RNq3aQ0qRbELDrXrWQtGUARFShAyk2osAsJOFT9Cj2lvamEsGnRqqHdrwKhkMHFkqmt2OqeX91FDQfPdWK4FHSH00Xi0LTJft';

export const STRIPE_MERCHANT_ID = 'merchant.com.pryvo';

// Auto-detect for Android (Emulator or Physical Device)
const getApiBaseUrl = () => {
  if (IS_PRODUCTION) {
    return PRODUCTION_API_URL;
  }

  if (Platform.OS === 'android') {
    // Emulator: use 10.0.2.2 (maps to host machine localhost)
    // Physical device: use your computer's WiFi IP (192.168.1.159)
    return IS_ANDROID_EMULATOR ? EMULATOR_API_URL : LOCAL_API_URL;
  }

  if (Platform.OS === 'ios') {
    return 'http://localhost:3000/api';
  }

  return LOCAL_API_URL;
};

const getSocketUrl = () => {
  if (IS_PRODUCTION) {
    return PRODUCTION_SOCKET_URL;
  }

  if (Platform.OS === 'android') {
    return IS_ANDROID_EMULATOR ? EMULATOR_SOCKET_URL : LOCAL_SOCKET_URL;
  }

  if (Platform.OS === 'ios') {
    return 'http://localhost:3000';
  }

  return LOCAL_SOCKET_URL;
};

export const API_BASE_URL = getApiBaseUrl();
export const SOCKET_URL = getSocketUrl();

export default {
  API_BASE_URL,
  SOCKET_URL,
  IS_PRODUCTION,
  STRIPE_PUBLISHABLE_KEY,
  STRIPE_MERCHANT_ID,
};
