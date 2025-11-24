import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import { pushLocationUpdate, endSharingSession, deleteLocationSession } from './firebaseService';
import { getSharingSession, saveSharingSession, clearSharingSession } from '../utils/journeySharing/storage';
import { queueLocationUpdate } from '../utils/offlineQueue';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCATION_TASK_NAME = 'JOURNEY_SHARING_BACKGROUND_LOCATION';

/**
 * Defines the background location task
 * This task runs in the background and pushes location updates to Firebase
 */
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }

  if (data) {
    try {
      const { locations } = data;
      const location = locations[0];

      if (!location) {
        return;
      }

      // FIX C13: Validate location accuracy before processing
      if (location.coords.accuracy > 100) {
        console.warn('Location accuracy too poor:', location.coords.accuracy, 'meters - skipping update');
        return;
      }

      // Get the current sharing session or active journey
      const session = await getSharingSession();
      const activeJourneyJson = await AsyncStorage.getItem('@active_journey');

      if ((!session || !session.active) && !activeJourneyJson) {
        console.log('No active sharing session or journey, stopping background location');
        await stopBackgroundLocationTracking();
        return;
      }

      // If no sharing session but journey exists, just continue tracking
      if (!session || !session.active) {
        // Update journey location only
        if (activeJourneyJson) {
          const activeJourney = JSON.parse(activeJourneyJson);
          // Import dynamically to avoid circular dependency
          const { updateJourneyLocation } = require('./journeyService');
          const locationData = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            timestamp: location.timestamp || Date.now(),
            accuracy: location.coords.accuracy
          };
          await updateJourneyLocation(activeJourney.journeyId, locationData);
        }
        return;
      }

      // Check if session has auto-stopped
      if (session.autoStopTime && Date.now() >= session.autoStopTime) {
        console.log('Auto-stop time reached, ending session');
        await handleAutoStop(session);
        return;
      }

      // Prepare location data
      const locationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: location.timestamp || Date.now(),
        accuracy: location.coords.accuracy
      };

      // FIX C12, H4: Push to Firebase with offline queue fallback
      try {
        await pushLocationUpdate(
          session.shareCode,
          locationData,
          session.password,
          session.updateInterval
        );
        console.log('Background location update pushed successfully');
      } catch (pushError) {
        console.error('Failed to push location update:', pushError);
        // FIX C12: Queue for offline retry
        await queueLocationUpdate(
          session.shareCode,
          locationData,
          session.password,
          session.updateInterval
        );
        console.log('Location update queued for retry');
      }

      // Update session last update time
      session.lastUpdateTime = Date.now();
      await saveSharingSession(session);

    } catch (err) {
      console.error('Error in background location task:', err);
    }
  }
});

/**
 * Starts background location tracking for sharing
 * @param {Object} config - Configuration {shareCode, password, updateInterval (in seconds), autoStopTime}
 * @returns {Promise<void>}
 */
export async function startBackgroundLocationTracking(config) {
  try {
    // Request location permissions
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
      throw new Error('Foreground location permission not granted');
    }

    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') {
      console.warn('Background location permission not granted. Sharing may not work when app is closed.');
    }

    // Save session info
    const session = {
      shareCode: config.shareCode,
      password: config.password,
      updateInterval: config.updateInterval,
      autoStopTime: config.autoStopTime,
      active: true,
      startTime: Date.now(),
      lastUpdateTime: Date.now()
    };
    await saveSharingSession(session);

    // Get initial location and push it
    const initialLocation = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High
    });

    const locationData = {
      latitude: initialLocation.coords.latitude,
      longitude: initialLocation.coords.longitude,
      timestamp: initialLocation.timestamp || Date.now()
    };

    await pushLocationUpdate(
      config.shareCode,
      locationData,
      config.password,
      config.updateInterval
    );

    // FIX H5, M28: Start background location updates with optimized settings
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.Balanced, // FIX H5: Changed from High to reduce battery drain
      timeInterval: config.updateInterval * 1000, // Convert seconds to milliseconds
      distanceInterval: 10, // FIX H5: Add 10m threshold to reduce excessive updates
      deferredUpdatesInterval: config.updateInterval * 1000,
      foregroundService: {
        notificationTitle: 'YOURS - Sharing Location',
        notificationBody: `Updates every ${config.updateInterval / 60} minutes`,
        notificationColor: '#F472B6'
      },
      pausesUpdatesAutomatically: false,
      activityType: Location.ActivityType.Other,
      showsBackgroundLocationIndicator: true
    });

    console.log('Background location tracking started');

  } catch (error) {
    console.error('Error starting background location tracking:', error);
    throw error;
  }
}

/**
 * Stops background location tracking
 * @param {boolean} endSession - Whether to end the Firebase session
 * @returns {Promise<void>}
 */
export async function stopBackgroundLocationTracking(endSession = true) {
  console.log('=== STOP BACKGROUND LOCATION TRACKING CALLED ===');
  console.log('[StopTracking] Parameters:', { endSession });

  try {
    // Stop location updates
    console.log('[StopTracking] Checking if location task is registered...');
    const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
    console.log('[StopTracking] Task registered:', isRegistered);

    if (isRegistered) {
      console.log('[StopTracking] Stopping location updates...');
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      console.log('[StopTracking] ✅ Location updates stopped');
    } else {
      console.log('[StopTracking] No task to stop');
    }

    // Delete Firebase session if requested
    if (endSession) {
      console.log('[StopTracking] End session requested - fetching session data...');
      const session = await getSharingSession();
      console.log('[StopTracking] Session data:', session ? {
        shareCode: session.shareCode,
        startTime: session.startTime,
        active: session.active
      } : 'null');

      if (session && session.shareCode) {
        console.log('[StopTracking] Deleting Firebase location session for code:', session.shareCode);
        try {
          await deleteLocationSession(session.shareCode);
          console.log('[StopTracking] ✅ Share code freed successfully:', session.shareCode);

          // Verify deletion
          console.log('[StopTracking] Verifying deletion from Firebase...');
          const { ref, get } = require('firebase/database');
          const { database } = require('./firebase');
          const locationRef = ref(database, `locations/${session.shareCode}`);
          const verifySnapshot = await get(locationRef);
          console.log('[StopTracking] Verification - code still exists:', verifySnapshot.exists());
          if (verifySnapshot.exists()) {
            console.warn('[StopTracking] ⚠️ WARNING: Code still exists after deletion!');
            console.warn('[StopTracking] Remaining data:', verifySnapshot.val());
          }
        } catch (deleteError) {
          console.error('[StopTracking] ❌ Error deleting location session:', deleteError);
          console.error('[StopTracking] Error details:', {
            message: deleteError.message,
            code: deleteError.code,
            stack: deleteError.stack
          });
          // Don't throw - continue with cleanup even if delete fails
        }
      } else {
        console.log('[StopTracking] No session or shareCode to delete');
      }
    } else {
      console.log('[StopTracking] endSession=false, skipping Firebase cleanup');
    }

    // Clear local storage
    console.log('[StopTracking] Clearing local session storage...');
    await clearSharingSession();
    console.log('[StopTracking] ✅ Local session cleared');

    console.log('=== STOP TRACKING COMPLETED SUCCESSFULLY ===');

  } catch (error) {
    console.error('=== STOP TRACKING ERROR ===');
    console.error('[StopTracking] Error type:', error.constructor.name);
    console.error('[StopTracking] Error message:', error.message);
    console.error('[StopTracking] Error code:', error.code);
    console.error('[StopTracking] Full error:', error);
    console.error('[StopTracking] Stack:', error.stack);
    throw error;
  }
}

/**
 * Handles auto-stop when time limit is reached
 * @param {Object} session - The sharing session
 * @returns {Promise<void>}
 */
async function handleAutoStop(session) {
  try {
    // End the session in Firebase
    await endSharingSession(session.shareCode);

    // Stop background tracking
    await stopBackgroundLocationTracking(false);

    // Send notification
    await sendAutoStopNotification();

    console.log('Auto-stop completed');
  } catch (error) {
    console.error('Error handling auto-stop:', error);
  }
}

/**
 * Sends a notification when auto-stop occurs
 * @returns {Promise<void>}
 */
async function sendAutoStopNotification() {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      console.log('Notification permission not granted, skipping notification');
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Location sharing has ended',
        body: 'Your session has expired',
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH
      },
      trigger: null // Send immediately
    });
    console.log('Auto-stop notification sent');
  } catch (error) {
    console.error('Error sending auto-stop notification:', error);
    // Don't throw - notification failure shouldn't break the flow
  }
}

/**
 * Checks if background location tracking is currently running
 * @returns {Promise<boolean>}
 */
export async function isBackgroundLocationTracking() {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
    if (!isRegistered) {
      return false;
    }

    const session = await getSharingSession();
    return session && session.active;
  } catch (error) {
    console.error('Error checking background location status:', error);
    return false;
  }
}

/**
 * Gets the current sharing session status
 * @returns {Promise<Object|null>} Session info or null
 */
export async function getSharingStatus() {
  try {
    const session = await getSharingSession();
    if (!session || !session.active) {
      return null;
    }

    // Check if auto-stop time has passed
    if (session.autoStopTime && Date.now() >= session.autoStopTime) {
      return null;
    }

    return session;
  } catch (error) {
    console.error('Error getting sharing status:', error);
    return null;
  }
}

/**
 * Extends the sharing session by adding more time
 * @param {number} additionalMinutes - Minutes to add
 * @returns {Promise<void>}
 */
export async function extendSharingSession(additionalMinutes) {
  try {
    const session = await getSharingSession();
    if (!session || !session.active) {
      throw new Error('No active sharing session');
    }

    if (!session.autoStopTime) {
      throw new Error('Session has no auto-stop time set');
    }

    const additionalMs = additionalMinutes * 60 * 1000;
    session.autoStopTime += additionalMs;

    await saveSharingSession(session);
    console.log(`Session extended by ${additionalMinutes} minutes`);
  } catch (error) {
    console.error('Error extending sharing session:', error);
    throw error;
  }
}

/**
 * Sets up location update notifications
 * Foreground service notification is automatically handled by expo-location's foregroundService option
 * This sets up the notification handler for other notifications
 */
export async function setupLocationNotifications() {
  try {
    await Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Notification permission not granted');
      return false;
    }

    console.log('Notification setup completed successfully');
    return true;
  } catch (error) {
    console.error('Error setting up location notifications:', error);
    return false;
  }
}
