/**
 * Safely parse JSON strings with error handling
 * @param {string} jsonString - The string to parse
 * @param {any} fallback - The fallback value if parsing fails (default: null)
 * @returns {any} - Parsed object or fallback
 */
export const safeParseJSON = (jsonString, fallback = null) => {
  if (!jsonString || jsonString === 'undefined' || jsonString === 'null') {
    return fallback;
  }
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn('[SafeUtils] JSON parse error:', error.message);
    return fallback;
  }
};

/**
 * Validate coordinates
 * @param {number|string} latitude
 * @param {number|string} longitude
 * @returns {boolean}
 */
export const validateCoordinates = (latitude, longitude) => {
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);

  if (isNaN(lat) || isNaN(lng)) return false;
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;
  // Check for 0,0 which is often used as a default/invalid value in some systems
  if (Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001) return false;

  return true;
};

/**
 * Decode base64 string for React Native
 * @param {string} input 
 * @returns {string}
 */
const atob = (input) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let str = String(input).replace(/=+$/, '');
  let output = '';
  if (str.length % 4 === 1) throw new Error("'atob' failed: The string to be decoded is not correctly encoded.");
  for (let bc = 0, bs, buffer, idx = 0; (buffer = str.charAt(idx++)); ~buffer && ((bs = bc % 4 ? bs * 64 + buffer : buffer), bc++ % 4) ? (output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)))) : 0) {
    buffer = chars.indexOf(buffer);
  }
  return output;
};

/**
 * Decode JWT token payload
 * @param {string} token - The JWT token
 * @returns {any} - Decoded payload or null
 */
export const decodeJWT = (token) => {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch (error) {
    console.warn('[SafeUtils] JWT decode error:', error.message);
    return null;
  }
};
