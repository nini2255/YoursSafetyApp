/**
 * Journey Service
 * Unified service that combines location sharing with geofence monitoring
 * Manages complete journey lifecycle from creation to completion
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ref, set, get, update, onValue, off } from 'firebase/database';
import { database } from './firebase';
import * as Location from 'expo-location';
import { startGeofenceMonitoring, stopGeofenceMonitoring } from './geofencingService';
import { startBackgroundLocationTracking, stopBackgroundLocationTracking } from './backgroundLocationService';
import { initializeGeofenceStates, syncUnsyncedEvents } from './arrivalDepartureService';
import { getGeofence } from './geofenceStorage';
import { encryptLocation } from '../utils/journeySharing/encryption';

const ACTIVE_JOURNEY_KEY = '@active_journey';
const JOURNEY_HISTORY_KEY = '@journey_history';

/**
 * Creates a new journey
 * @param {Object} config - Journey configuration
 * @param {string} config.name - Journey name/title
 * @param {string} config.destination - Destination name
 * @param {Array<string>} config.waypointGeofenceIds - Array of geofence IDs to use as waypoints
 * @param {boolean} config.shareLocation - Whether to share location during journey
 * @param {string} config.shareCode - Share code for location sharing (if sharing)
 * @param {string} config.password - Password for encryption (if sharing)
 * @param {number} config.updateInterval - Location update interval in seconds (if sharing)
 * @returns {Promise<Object>} Created journey object
 */
export async function createJourney(config) {
  try {
    // Validate required fields
    if (!config.name || !config.destination) {
      throw new Error('Journey name and destination are required');
    }

    // Generate unique journey ID
    const journeyId = `journey_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Get waypoint geofence details
    const waypoints = [];
    if (config.waypointGeofenceIds && config.waypointGeofenceIds.length > 0) {
      for (const geofenceId of config.waypointGeofenceIds) {
        const geofence = await getGeofence(geofenceId);
        if (geofence) {
          waypoints.push({
            geofenceId: geofence.id,
            name: geofence.name,
            latitude: geofence.latitude,
            longitude: geofence.longitude,
            radius: geofence.radius,
            arrived: false,
            departed: false,
            arrivalTime: null,
            departureTime: null,
            order: waypoints.length
          });
        }
      }
    }

    // Create journey object
    const journey = {
      id: journeyId,
      name: config.name,
      destination: config.destination,
      waypoints,
      shareLocation: config.shareLocation || false,
      shareCode: config.shareCode || null,
      password: config.password || null,
      updateInterval: config.updateInterval || 600,
      status: 'created', // created, active, paused, completed, cancelled
      createdAt: Date.now(),
      startedAt: null,
      completedAt: null,
      startLocation: null,
      currentLocation: null,
      locationHistory: [],
      events: [],
      totalDistance: 0
    };

    // Save to AsyncStorage
    await AsyncStorage.setItem(`@journey_${journeyId}`, JSON.stringify(journey));

    // Add to journey history
    const historyJson = await AsyncStorage.getItem(JOURNEY_HISTORY_KEY);
    const history = historyJson ? JSON.parse(historyJson) : [];
    history.unshift({ id: journeyId, name: config.name, createdAt: journey.createdAt });
    await AsyncStorage.setItem(JOURNEY_HISTORY_KEY, JSON.stringify(history));

    console.log('Journey created:', journeyId);
    return journey;
  } catch (error) {
    console.error('Error creating journey:', error);
    throw error;
  }
}

/**
 * Starts an active journey
 * @param {string} journeyId - Journey ID
 * @returns {Promise<void>}
 */
export async function startJourney(journeyId) {
  try {
    // Get journey
    const journey = await getJourney(journeyId);
    if (!journey) {
      throw new Error('Journey not found');
    }

    if (journey.status === 'active') {
      throw new Error('Journey is already active');
    }

    // Get current location
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High
    });

    const currentLocation = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      timestamp: Date.now()
    };

    // Update journey
    journey.status = 'active';
    journey.startedAt = Date.now();
    journey.startLocation = currentLocation;
    journey.currentLocation = currentLocation;
    journey.locationHistory = [currentLocation];

    // Save updated journey
    await AsyncStorage.setItem(`@journey_${journeyId}`, JSON.stringify(journey));

    // Set as active journey
    await AsyncStorage.setItem(ACTIVE_JOURNEY_KEY, JSON.stringify({
      journeyId: journey.id,
      startedAt: journey.startedAt
    }));

    // Initialize geofence states
    if (journey.waypoints.length > 0) {
      const geofences = journey.waypoints.map(wp => ({
        id: wp.geofenceId,
        name: wp.name,
        latitude: wp.latitude,
        longitude: wp.longitude,
        radius: wp.radius
      }));

      await initializeGeofenceStates(geofences, currentLocation);

      // Start geofence monitoring
      await startGeofenceMonitoring(geofences);
    }

    // Start location sharing if enabled
    if (journey.shareLocation && journey.shareCode && journey.password) {
      await startBackgroundLocationTracking({
        shareCode: journey.shareCode,
        password: journey.password,
        updateInterval: journey.updateInterval,
        autoStopTime: null, // Journey-based sharing has no auto-stop
        journeyId: journey.id
      });
    }

    // Sync journey to Firebase
    await syncJourneyToFirebase(journey);

    console.log('Journey started:', journeyId);
  } catch (error) {
    console.error('Error starting journey:', error);
    throw error;
  }
}

/**
 * Stops/pauses an active journey
 * @param {string} journeyId - Journey ID
 * @param {boolean} complete - Whether to complete (true) or just pause (false)
 * @returns {Promise<void>}
 */
export async function stopJourney(journeyId, complete = false) {
  try {
    // Get journey
    const journey = await getJourney(journeyId);
    if (!journey) {
      throw new Error('Journey not found');
    }

    // Stop geofence monitoring
    if (journey.waypoints.length > 0) {
      await stopGeofenceMonitoring();
    }

    // Stop location sharing
    if (journey.shareLocation) {
      await stopBackgroundLocationTracking();
    }

    // Update journey status
    journey.status = complete ? 'completed' : 'paused';
    if (complete) {
      journey.completedAt = Date.now();
    }

    // Save updated journey
    await AsyncStorage.setItem(`@journey_${journeyId}`, JSON.stringify(journey));

    // Clear active journey
    await AsyncStorage.removeItem(ACTIVE_JOURNEY_KEY);

    // Update Firebase
    await syncJourneyToFirebase(journey);

    console.log(`Journey ${complete ? 'completed' : 'paused'}:`, journeyId);
  } catch (error) {
    console.error('Error stopping journey:', error);
    throw error;
  }
}

/**
 * Updates journey location
 * @param {string} journeyId - Journey ID
 * @param {Object} location - Location data {latitude, longitude, timestamp}
 * @returns {Promise<void>}
 */
export async function updateJourneyLocation(journeyId, location) {
  try {
    const journey = await getJourney(journeyId);
    if (!journey || journey.status !== 'active') {
      return;
    }

    // Calculate distance from last location
    if (journey.currentLocation) {
      const distance = calculateDistance(
        journey.currentLocation.latitude,
        journey.currentLocation.longitude,
        location.latitude,
        location.longitude
      );
      journey.totalDistance += distance;
    }

    // Update location
    journey.currentLocation = location;
    journey.locationHistory.push(location);

    // Limit location history to last 1000 points
    if (journey.locationHistory.length > 1000) {
      journey.locationHistory = journey.locationHistory.slice(-1000);
    }

    // Save journey
    await AsyncStorage.setItem(`@journey_${journeyId}`, JSON.stringify(journey));

    // Update Firebase
    await updateJourneyLocationInFirebase(journeyId, location);
  } catch (error) {
    console.error('Error updating journey location:', error);
  }
}

/**
 * Records a waypoint event (arrival/departure)
 * @param {string} journeyId - Journey ID
 * @param {string} geofenceId - Geofence ID
 * @param {string} eventType - 'arrival' or 'departure'
 * @param {Object} location - Current location
 * @returns {Promise<void>}
 */
export async function recordWaypointEvent(journeyId, geofenceId, eventType, location) {
  try {
    const journey = await getJourney(journeyId);
    if (!journey) {
      return;
    }

    // Find waypoint
    const waypoint = journey.waypoints.find(wp => wp.geofenceId === geofenceId);
    if (!waypoint) {
      return;
    }

    // Update waypoint
    if (eventType === 'arrival') {
      waypoint.arrived = true;
      waypoint.arrivalTime = Date.now();
    } else if (eventType === 'departure') {
      waypoint.departed = true;
      waypoint.departureTime = Date.now();
    }

    // Add event to journey
    const event = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: eventType,
      waypointName: waypoint.name,
      geofenceId,
      location,
      timestamp: Date.now()
    };
    journey.events.push(event);

    // Save journey
    await AsyncStorage.setItem(`@journey_${journeyId}`, JSON.stringify(journey));

    // Sync to Firebase
    await syncJourneyEventToFirebase(journeyId, event);

    console.log(`Waypoint ${eventType} recorded:`, waypoint.name);
  } catch (error) {
    console.error('Error recording waypoint event:', error);
  }
}

/**
 * Gets a journey by ID
 * @param {string} journeyId - Journey ID
 * @returns {Promise<Object|null>} Journey object or null
 */
export async function getJourney(journeyId) {
  try {
    const journeyJson = await AsyncStorage.getItem(`@journey_${journeyId}`);
    return journeyJson ? JSON.parse(journeyJson) : null;
  } catch (error) {
    console.error('Error getting journey:', error);
    return null;
  }
}

/**
 * Gets the currently active journey
 * @returns {Promise<Object|null>} Active journey or null
 */
export async function getActiveJourney() {
  try {
    const activeJson = await AsyncStorage.getItem(ACTIVE_JOURNEY_KEY);
    if (!activeJson) {
      return null;
    }

    const active = JSON.parse(activeJson);
    return await getJourney(active.journeyId);
  } catch (error) {
    console.error('Error getting active journey:', error);
    return null;
  }
}

/**
 * Gets journey history
 * @returns {Promise<Array>} Array of journey summaries
 */
export async function getJourneyHistory() {
  try {
    const historyJson = await AsyncStorage.getItem(JOURNEY_HISTORY_KEY);
    return historyJson ? JSON.parse(historyJson) : [];
  } catch (error) {
    console.error('Error getting journey history:', error);
    return [];
  }
}

/**
 * Resumes an active journey on app restart
 * @returns {Promise<boolean>} True if journey was resumed
 */
export async function resumeActiveJourney() {
  try {
    const journey = await getActiveJourney();
    if (!journey || journey.status !== 'active') {
      return false;
    }

    console.log('Resuming active journey:', journey.id);

    // Resume geofence monitoring
    if (journey.waypoints.length > 0) {
      const geofences = journey.waypoints.map(wp => ({
        id: wp.geofenceId,
        name: wp.name,
        latitude: wp.latitude,
        longitude: wp.longitude,
        radius: wp.radius
      }));

      await startGeofenceMonitoring(geofences);
    }

    // Resume location sharing
    if (journey.shareLocation && journey.shareCode && journey.password) {
      await startBackgroundLocationTracking({
        shareCode: journey.shareCode,
        password: journey.password,
        updateInterval: journey.updateInterval,
        autoStopTime: null,
        journeyId: journey.id
      });
    }

    // Sync any unsynced events
    await syncUnsyncedEvents(journey.id);

    console.log('Journey resumed successfully');
    return true;
  } catch (error) {
    console.error('Error resuming journey:', error);
    return false;
  }
}

/**
 * Syncs journey to Firebase
 * @param {Object} journey - Journey object
 * @returns {Promise<void>}
 */
async function syncJourneyToFirebase(journey) {
  try {
    const journeyRef = ref(database, `journeys/${journey.id}`);

    // Create sanitized journey object for Firebase
    const firebaseJourney = {
      id: journey.id,
      name: journey.name,
      destination: journey.destination,
      status: journey.status,
      createdAt: journey.createdAt,
      startedAt: journey.startedAt,
      completedAt: journey.completedAt,
      shareCode: journey.shareCode,
      waypoints: journey.waypoints,
      currentLocation: journey.currentLocation,
      totalDistance: journey.totalDistance,
      lastUpdate: Date.now()
    };

    await set(journeyRef, firebaseJourney);
    console.log('Journey synced to Firebase:', journey.id);
  } catch (error) {
    console.error('Error syncing journey to Firebase:', error);
    // Don't throw - journey still works locally
  }
}

/**
 * Updates journey location in Firebase
 * @param {string} journeyId - Journey ID
 * @param {Object} location - Location data
 * @returns {Promise<void>}
 */
async function updateJourneyLocationInFirebase(journeyId, location) {
  try {
    const locationRef = ref(database, `journeys/${journeyId}/currentLocation`);
    await set(locationRef, {
      ...location,
      lastUpdate: Date.now()
    });
  } catch (error) {
    console.error('Error updating journey location in Firebase:', error);
  }
}

/**
 * Syncs journey event to Firebase
 * @param {string} journeyId - Journey ID
 * @param {Object} event - Event object
 * @returns {Promise<void>}
 */
async function syncJourneyEventToFirebase(journeyId, event) {
  try {
    const eventRef = ref(database, `journeys/${journeyId}/events/${event.id}`);
    await set(eventRef, event);
    console.log('Journey event synced to Firebase:', event.id);
  } catch (error) {
    console.error('Error syncing journey event to Firebase:', error);
  }
}

/**
 * Sets up a real-time listener for journey updates
 * @param {string} journeyId - Journey ID
 * @param {Function} callback - Callback function
 * @returns {Function} Unsubscribe function
 */
export function listenToJourney(journeyId, callback) {
  try {
    const journeyRef = ref(database, `journeys/${journeyId}`);

    const unsubscribe = onValue(journeyRef, (snapshot) => {
      if (snapshot.exists()) {
        callback({ journey: snapshot.val(), exists: true, error: null });
      } else {
        callback({ journey: null, exists: false, error: 'Journey not found' });
      }
    }, (error) => {
      console.error('Firebase listener error:', error);
      callback({ journey: null, exists: false, error: error.message });
    });

    // Return unsubscribe function
    return () => {
      off(journeyRef);
    };
  } catch (error) {
    console.error('Error setting up journey listener:', error);
    throw error;
  }
}

/**
 * Deletes a journey
 * @param {string} journeyId - Journey ID
 * @returns {Promise<void>}
 */
export async function deleteJourney(journeyId) {
  try {
    // Remove from storage
    await AsyncStorage.removeItem(`@journey_${journeyId}`);

    // Remove from history
    const historyJson = await AsyncStorage.getItem(JOURNEY_HISTORY_KEY);
    if (historyJson) {
      const history = JSON.parse(historyJson);
      const filtered = history.filter(j => j.id !== journeyId);
      await AsyncStorage.setItem(JOURNEY_HISTORY_KEY, JSON.stringify(filtered));
    }

    console.log('Journey deleted:', journeyId);
  } catch (error) {
    console.error('Error deleting journey:', error);
    throw error;
  }
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns {number} Distance in meters
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
