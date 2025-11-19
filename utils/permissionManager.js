/**
 * Permission Manager
 * FIX C1, H1, H2: Comprehensive permission handling with:
 * - Permission state persistence
 * - User feedback on denial
 * - Re-request flow
 * - Permission status tracking
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { Alert, Linking, Platform } from 'react-native';

const PERMISSIONS_KEY = '@location_permissions_status';

/**
 * Gets stored permission status
 * FIX C1: Permission persistence
 */
export async function getStoredPermissionStatus() {
  try {
    const statusJson = await AsyncStorage.getItem(PERMISSIONS_KEY);
    return statusJson ? JSON.parse(statusJson) : null;
  } catch (error) {
    console.error('Error getting stored permission status:', error);
    return null;
  }
}

/**
 * Saves permission status to AsyncStorage
 * FIX C1: Permission persistence
 */
export async function savePermissionStatus(status) {
  try {
    await AsyncStorage.setItem(PERMISSIONS_KEY, JSON.stringify({
      foreground: status.foreground,
      background: status.background,
      lastChecked: Date.now(),
      lastRequested: status.lastRequested || Date.now()
    }));
  } catch (error) {
    console.error('Error saving permission status:', error);
  }
}

/**
 * Requests location permissions with user feedback
 * FIX H1, H2: Comprehensive permission request flow
 *
 * @param {Object} options - {requestBackground: boolean, showRationale: boolean}
 * @returns {Promise<Object>} {foreground, background, success}
 */
export async function requestLocationPermissions(options = {}) {
  const { requestBackground = true, showRationale = true } = options;

  try {
    // Check current status first
    const currentStatus = await Location.getForegroundPermissionsAsync();

    // FIX H2: Show rationale if previously denied and user is trying again
    if (showRationale && currentStatus.status === 'denied' && currentStatus.canAskAgain === false) {
      return await showPermissionDeniedDialog();
    }

    // Request foreground permission
    const foregroundResult = await Location.requestForegroundPermissionsAsync();

    if (foregroundResult.status !== 'granted') {
      // FIX H1: User feedback on denial
      Alert.alert(
        'Location Permission Required',
        'YOURS needs access to your location to provide safety features like journey sharing and geofencing. Please grant location permission in settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() }
        ]
      );

      await savePermissionStatus({
        foreground: foregroundResult.status,
        background: 'denied'
      });

      return {
        foreground: foregroundResult.status,
        background: 'denied',
        success: false
      };
    }

    // Request background permission if needed
    let backgroundResult = { status: 'not_requested' };
    if (requestBackground) {
      backgroundResult = await Location.requestBackgroundPermissionsAsync();

      if (backgroundResult.status !== 'granted') {
        // FIX H1: User feedback for background permission
        Alert.alert(
          'Background Location Permission',
          'For the best experience, YOURS needs "Always Allow" location access to:\n\n• Track your journey when the app is closed\n• Detect arrival/departure at safety zones\n• Share your location with trusted contacts\n\nYou can change this in Settings.',
          [
            { text: 'Maybe Later', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
      }
    }

    // Save permission status
    await savePermissionStatus({
      foreground: foregroundResult.status,
      background: backgroundResult.status,
      lastRequested: Date.now()
    });

    return {
      foreground: foregroundResult.status,
      background: backgroundResult.status,
      success: foregroundResult.status === 'granted'
    };
  } catch (error) {
    console.error('Error requesting location permissions:', error);
    return {
      foreground: 'denied',
      background: 'denied',
      success: false
    };
  }
}

/**
 * Shows dialog when permission is permanently denied
 * FIX H2: Re-request flow for denied permissions
 */
async function showPermissionDeniedDialog() {
  return new Promise((resolve) => {
    Alert.alert(
      'Location Permission Denied',
      `YOURS cannot function without location access. To enable:\n\n${Platform.OS === 'ios'
        ? '1. Open Settings\n2. Tap YOURS\n3. Tap Location\n4. Select "While Using the App" or "Always"'
        : '1. Open Settings\n2. Tap Apps\n3. Tap YOURS\n4. Tap Permissions\n5. Tap Location\n6. Select "Allow all the time"'
      }`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => resolve({
            foreground: 'denied',
            background: 'denied',
            success: false
          })
        },
        {
          text: 'Open Settings',
          onPress: () => {
            Linking.openSettings();
            resolve({
              foreground: 'denied',
              background: 'denied',
              success: false
            });
          }
        }
      ]
    );
  });
}

/**
 * Checks if permissions need to be re-requested
 * FIX C1: Smart permission checking
 *
 * @returns {Promise<boolean>} True if permissions should be requested
 */
export async function shouldRequestPermissions() {
  try {
    const stored = await getStoredPermissionStatus();

    if (!stored) {
      return true; // Never requested
    }

    // Check if stored status is outdated (older than 7 days)
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - stored.lastChecked > sevenDaysMs) {
      return true;
    }

    // Check actual current status
    const current = await Location.getForegroundPermissionsAsync();

    // Request if current status doesn't match stored or if denied
    if (current.status !== stored.foreground || current.status === 'denied') {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error checking if should request permissions:', error);
    return true;
  }
}

/**
 * Gets comprehensive permission status
 * @returns {Promise<Object>} Permission status details
 */
export async function getPermissionStatus() {
  try {
    const foreground = await Location.getForegroundPermissionsAsync();
    const background = await Location.getBackgroundPermissionsAsync();
    const stored = await getStoredPermissionStatus();

    return {
      foreground: {
        status: foreground.status,
        canAskAgain: foreground.canAskAgain,
        granted: foreground.status === 'granted'
      },
      background: {
        status: background.status,
        canAskAgain: background.canAskAgain,
        granted: background.status === 'granted'
      },
      stored,
      allGranted: foreground.status === 'granted' && background.status === 'granted'
    };
  } catch (error) {
    console.error('Error getting permission status:', error);
    return {
      foreground: { status: 'undetermined', canAskAgain: true, granted: false },
      background: { status: 'undetermined', canAskAgain: true, granted: false },
      stored: null,
      allGranted: false
    };
  }
}

/**
 * Shows appropriate permission prompt based on current state
 * FIX H1, H2: Context-aware permission requests
 *
 * @param {string} feature - Feature name for context (e.g., 'Journey Sharing', 'Geofencing')
 */
export async function requestPermissionsForFeature(feature) {
  const status = await getPermissionStatus();

  if (status.allGranted) {
    return { success: true, status };
  }

  // Show feature-specific rationale
  return new Promise((resolve) => {
    Alert.alert(
      `Location Access for ${feature}`,
      `To use ${feature}, YOURS needs access to your location.\n\nYour privacy is important - location data is encrypted and only shared with people you choose.`,
      [
        {
          text: 'Not Now',
          style: 'cancel',
          onPress: () => resolve({ success: false, status })
        },
        {
          text: 'Grant Access',
          onPress: async () => {
            const result = await requestLocationPermissions({
              requestBackground: true,
              showRationale: false
            });
            resolve({ success: result.success, status: result });
          }
        }
      ]
    );
  });
}
