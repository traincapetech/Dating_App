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
