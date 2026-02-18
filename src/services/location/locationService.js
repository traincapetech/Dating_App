import Geolocation from 'react-native-geolocation-service';
import {Platform, PermissionsAndroid, AppState} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/client';

const LOCATION_KEY = '@pryvo_last_location';
const MIN_DISTANCE_CHANGE = 1000; // 1km in meters

// Request location permissions
export async function requestLocationPermission() {
  try {
    if (Platform.OS === 'android') {
      if (Platform.Version >= 23) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message:
              'Pryvo needs access to your location to find matches nearby.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          return false;
        }
      }
    }
    return true;
  } catch (error) {
    console.error('Error requesting location permission:', error);
    return false;
  }
}

// Check if location permission is granted
export async function checkLocationPermission() {
  try {
    if (Platform.OS === 'android') {
      if (Platform.Version >= 23) {
        const granted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );
        return granted;
      }
      return true;
    }
    // iOS permission is checked via getCurrentPosition
    return true;
  } catch (error) {
    console.error('Error checking location permission:', error);
    return false;
  }
}

// Get current location
export async function getCurrentLocation() {
  try {
    const hasPermission = await checkLocationPermission();
    if (!hasPermission) {
      const granted = await requestLocationPermission();
      if (!granted) {
        throw new Error('Location permission not granted');
      }
    }

    const position = await new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      });
    });

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: position.timestamp,
    };
  } catch (error) {
    console.error('Error getting current location:', error);
    throw error;
  }
}

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
}

// Update user location on backend
export async function updateUserLocation(latitude, longitude) {
  try {
    const userData = await AsyncStorage.getItem('@pryvo_user');
    let user;
    if (userData && userData !== 'undefined') {
      try {
        user = JSON.parse(userData);
      } catch (e) {
        console.error('Failed to parse user data in location service:', e);
        return {success: false, message: 'Invalid user data'};
      }
    } else {
      return {success: false, message: 'User not found'};
    }
    const userId = user.id;

    // Update location in profile
    const response = await apiClient.put(`/profile/update`, {
      userId,
      basicInfo: {
        locationDetails: {
          lat: latitude,
          lng: longitude,
          source: 'gps',
          timestamp: Date.now(),
        },
      },
    });

    return {success: true, data: response};
  } catch (error) {
    console.error('Error updating user location:', error);
    return {success: false, message: error.message};
  }
}

// Check if location has changed significantly
export async function hasLocationChanged(latitude, longitude) {
  try {
    const lastLocationStr = await AsyncStorage.getItem(LOCATION_KEY);
    if (!lastLocationStr || lastLocationStr === 'undefined') {
      return true; // First time or invalid, consider it changed
    }

    let lastLocation;
    try {
      lastLocation = JSON.parse(lastLocationStr);
    } catch (e) {
      console.error('Failed to parse last location:', e);
      return true;
    }
    const distance = calculateDistance(
      lastLocation.latitude,
      lastLocation.longitude,
      latitude,
      longitude,
    );

    return distance >= MIN_DISTANCE_CHANGE;
  } catch (error) {
    console.error('Error checking location change:', error);
    return true; // On error, assume changed
  }
}

// Save last known location
export async function saveLastLocation(latitude, longitude) {
  try {
    await AsyncStorage.setItem(
      LOCATION_KEY,
      JSON.stringify({
        latitude,
        longitude,
        timestamp: Date.now(),
      }),
    );
  } catch (error) {
    console.error('Error saving last location:', error);
  }
}

// Watch location changes
export function watchLocation(onLocationChange, options = {}) {
  let watchId = null;
  let isWatching = false;

  const {
    enableHighAccuracy = true,
    timeout = 15000,
    maximumAge = 10000,
    distanceFilter = MIN_DISTANCE_CHANGE,
  } = options;

  const startWatching = async () => {
    if (isWatching) return;

    const hasPermission = await checkLocationPermission();
    if (!hasPermission) {
      const granted = await requestLocationPermission();
      if (!granted) {
        console.warn('Location permission not granted, cannot watch location');
        return;
      }
    }

    isWatching = true;
    watchId = Geolocation.watchPosition(
      async position => {
        const {latitude, longitude} = position.coords;
        const changed = await hasLocationChanged(latitude, longitude);

        if (changed) {
          // Update location on backend
          await updateUserLocation(latitude, longitude);
          await saveLastLocation(latitude, longitude);

          // Notify callback
          if (onLocationChange) {
            onLocationChange({
              latitude,
              longitude,
              accuracy: position.coords.accuracy,
              timestamp: position.timestamp,
            });
          }
        }
      },
      error => {
        console.error('Location watch error:', error);
        isWatching = false;
      },
      {
        enableHighAccuracy,
        timeout,
        maximumAge,
        distanceFilter,
      },
    );
  };

  const stopWatching = () => {
    if (watchId !== null) {
      Geolocation.clearWatch(watchId);
      watchId = null;
      isWatching = false;
    }
  };

  // Handle app state changes
  const handleAppStateChange = nextAppState => {
    if (nextAppState === 'active' && !isWatching) {
      startWatching();
    } else if (nextAppState !== 'active' && isWatching) {
      stopWatching();
    }
  };

  // Start watching when app is active
  const currentAppState = AppState.currentState;
  if (currentAppState === 'active') {
    startWatching();
  }

  // Listen to app state changes
  const subscription = AppState.addEventListener(
    'change',
    handleAppStateChange,
  );

  return {
    start: startWatching,
    stop: () => {
      stopWatching();
      subscription?.remove();
    },
  };
}
// Reverse geocoding to get city name from coordinates
export async function reverseGeocode(lat, lng) {
  try {
    // Using Google Geocoding API for reverse geocoding
    const apiKey = 'AIzaSyDD9uRgqIVB8roh8-ob-AZiiXoFocAExvY';
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}&language=en`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results.length > 0) {
      // Extract city/locality from results
      const result = data.results[0];
      const addressComponents = result.address_components;

      // Find city/locality
      let city = null;
      for (const component of addressComponents) {
        if (
          component.types.includes('locality') ||
          component.types.includes('administrative_area_level_1')
        ) {
          city = component.long_name;
          break;
        }
      }

      // Fallback to formatted address
      if (!city) {
        city = result.formatted_address.split(',')[0];
      }

      return city;
    }
    return null;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
}
