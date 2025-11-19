import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { getLocationSettings, addLocationPing } from './locationHistoryStorage';

const LOCATION_HISTORY_TASK_NAME = 'location-history-tracking';

/**
 * Background task definition for Location History tracking
 * FIX C2: Added missing task definition that was causing feature to be non-functional
 */
TaskManager.defineTask(LOCATION_HISTORY_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Location History background task error:', error);
    return;
  }

  if (data) {
    try {
      const { locations } = data;
      const location = locations[0];

      if (!location) {
        return;
      }

      // Check if tracking is still enabled
      const settings = await getLocationSettings();
      if (!settings.enabled) {
        console.log('Location History disabled, stopping tracking');
        await stopLocationHistoryTracking();
        return;
      }

      // FIX C13: Validate location accuracy before recording
      if (location.coords.accuracy > 100) {
        console.warn('Location accuracy too poor:', location.coords.accuracy, 'meters');
        return;
      }

      // Add location to history
      await addLocationPing(
        location.coords.latitude,
        location.coords.longitude
      );

      console.log('Location History: Ping recorded successfully');
    } catch (err) {
      console.error('Error in Location History background task:', err);
    }
  }
});

/**
 * Start background location tracking for Location History
 */
export const startLocationHistoryTracking = async () => {
  try {
    // Check if tracking is already running
    const isTracking = await TaskManager.isTaskRegisteredAsync(LOCATION_HISTORY_TASK_NAME);
    if (isTracking) {
      console.log('Location History tracking is already running');
      return true;
    }

    // Get current settings
    const settings = await getLocationSettings();
    const updateIntervalMs = settings.updateInterval * 60 * 1000; // Convert minutes to milliseconds

    // FIX C3: Request permissions instead of just checking
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
      console.error('Foreground location permission not granted');
      return false;
    }

    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') {
      console.error('Background location permission not granted');
      return false;
    }

    // Start background location updates
    // FIX M28: Added distance filter to reduce battery drain
    await Location.startLocationUpdatesAsync(LOCATION_HISTORY_TASK_NAME, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: updateIntervalMs,
      distanceInterval: 10, // FIX M28: Add 10m threshold to reduce excessive updates
      foregroundService: {
        notificationTitle: 'Location History Tracking',
        notificationBody: 'Recording your location for safety',
        notificationColor: '#F472B6',
      },
      pausesUpdatesAutomatically: false,
      activityType: Location.ActivityType.Other,
      showsBackgroundLocationIndicator: true,
    });

    console.log('Location History tracking started successfully');
    return true;
  } catch (error) {
    console.error('Error starting Location History tracking:', error);
    return false;
  }
};

/**
 * Stop background location tracking for Location History
 */
export const stopLocationHistoryTracking = async () => {
  try {
    const isTracking = await TaskManager.isTaskRegisteredAsync(LOCATION_HISTORY_TASK_NAME);
    if (isTracking) {
      await Location.stopLocationUpdatesAsync(LOCATION_HISTORY_TASK_NAME);
      console.log('Location History tracking stopped successfully');
    }
    return true;
  } catch (error) {
    console.error('Error stopping Location History tracking:', error);
    return false;
  }
};

/**
 * Check if location tracking is currently running
 */
export const isLocationHistoryTrackingActive = async () => {
  try {
    return await TaskManager.isTaskRegisteredAsync(LOCATION_HISTORY_TASK_NAME);
  } catch (error) {
    console.error('Error checking tracking status:', error);
    return false;
  }
};

/**
 * Update tracking interval (stop and restart with new interval)
 */
export const updateTrackingInterval = async (newIntervalMinutes) => {
  try {
    const isTracking = await isLocationHistoryTrackingActive();
    if (isTracking) {
      await stopLocationHistoryTracking();
      // Settings will be updated by the caller before this function is called
      await startLocationHistoryTracking();
      return true;
    }
    return true;
  } catch (error) {
    console.error('Error updating tracking interval:', error);
    return false;
  }
};
