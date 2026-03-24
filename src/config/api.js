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
// Example: 'http://192.168.1.100:3000/api'
// Auto-detected IP: 192.168.1.65 (Updated by Antigravity)
const LOCAL_API_URL = 'http://192.168.1.65:3000/api';
const LOCAL_SOCKET_URL = 'http://192.168.1.65:3000';

// Set to true for production, false for local development
const IS_PRODUCTION = false;

// Logging moved below after variables are defined

// Auto-detect for Android emulator
const getApiBaseUrl = () => {
  if (IS_PRODUCTION) {
    return PRODUCTION_API_URL;
  }
  // For Android physical device, use LOCAL_API_URL
  // If using emulator, uncomment the block below:
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000/api';
  }

  // For Android physical device, use LOCAL_API_URL
  // If using emulator, uncomment the block below:
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000/api';
  }

  // For iOS simulator, use localhost
  if (Platform.OS === 'ios') {
    return 'http://localhost:3000/api';
  }

  // For physical device, use the configured IP
  return LOCAL_API_URL;
};

const getSocketUrl = () => {
  if (IS_PRODUCTION) {
    return PRODUCTION_SOCKET_URL;
  }

  // NOTE: If using an Android Emulator, uncomment the line below:
  if (Platform.OS === 'android') return 'http://10.0.2.2:3000';

  // For iOS simulator, use localhost
  if (Platform.OS === 'ios') {
    return 'http://localhost:3000';
  }

  // For physical device, use the configured IP
  return LOCAL_SOCKET_URL;
};

export const API_BASE_URL = getApiBaseUrl();
export const SOCKET_URL = getSocketUrl();

console.log(`[Config] API_BASE_URL: ${API_BASE_URL}`);
console.log(`[Config] SOCKET_URL: ${SOCKET_URL}`);

export default {
  API_BASE_URL,
  SOCKET_URL,
  IS_PRODUCTION,
};
