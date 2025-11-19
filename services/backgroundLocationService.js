import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
// import * as Notifications from 'expo-notifications'; // REMOVED: Notification support temporarily disabled
import { pushLocationUpdate, endSharingSession } from './firebaseService';
import { getSharingSession, saveSharingSession, clearSharingSession } from '../utils/journeySharing/storage';
import { queueLocationUpdate } from '../utils/offlineQueue';

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

      // Get the current sharing session
      const session = await getSharingSession();
      if (!session || !session.active) {
        console.log('No active sharing session, stopping background location');
        await stopBackgroundLocationTracking();
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
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
    if (isRegistered) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      console.log('Background location tracking stopped');
    }

    if (endSession) {
      const session = await getSharingSession();
      if (session && session.shareCode) {
        await endSharingSession(session.shareCode);
      }
    }

    await clearSharingSession();

  } catch (error) {
    console.error('Error stopping background location tracking:', error);
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

    // TODO: Notification feature - implement later when notifications are working
    // await sendAutoStopNotification();
    console.log('Auto-stop notification would appear here');

    console.log('Auto-stop completed');
  } catch (error) {
    console.error('Error handling auto-stop:', error);
  }
}

/**
 * Sends a notification when auto-stop occurs
 * TEMPORARILY DISABLED - Notification support will be re-enabled later
 * @returns {Promise<void>}
 */
// async function sendAutoStopNotification() {
//   try {
//     const { status } = await Notifications.getPermissionsAsync();
//     if (status !== 'granted') {
//       return;
//     }

//     await Notifications.scheduleNotificationAsync({
//       content: {
//         title: 'Location sharing has ended',
//         body: 'Your session has expired',
//         sound: true,
//         priority: Notifications.AndroidNotificationPriority.HIGH
//       },
//       trigger: null // Send immediately
//     });
//   } catch (error) {
//     console.error('Error sending auto-stop notification:', error);
//   }
// }

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
 * Sets up location update notifications (Android foreground service notification)
 * TEMPORARILY DISABLED - Notification support will be re-enabled later
 * Foreground service notification is automatically handled by expo-location's foregroundService option
 */
export async function setupLocationNotifications() {
  // TODO: Re-enable notification setup when Expo Go notification issues are resolved
  // For now, foreground service notification (Android) is handled by expo-location
  console.log('Notification setup skipped - using expo-location foreground service only');

  // try {
  //   await Notifications.setNotificationHandler({
  //     handleNotification: async () => ({
  //       shouldShowAlert: true,
  //       shouldPlaySound: false,
  //       shouldSetBadge: false,
  //     }),
  //   });

  //   const { status: existingStatus } = await Notifications.getPermissionsAsync();
  //   let finalStatus = existingStatus;

  //   if (existingStatus !== 'granted') {
  //     const { status } = await Notifications.requestPermissionsAsync();
  //     finalStatus = status;
  //   }

  //   if (finalStatus !== 'granted') {
  //     console.warn('Notification permission not granted');
  //   }
  // } catch (error) {
  //   console.error('Error setting up location notifications:', error);
  // }
}
