/**
 * Arrival/Departure Event Tracking Service
 * FIX C4, C7: Complete implementation of arrival/departure event detection and tracking
 *
 * This service provides:
 * - Event recording (arrival/departure at geofences)
 * - Local persistence in AsyncStorage
 * - Firebase synchronization
 * - Geofence state management
 * - Event deduplication
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ref, set, get } from 'firebase/database';
import { database } from './firebase';

export const EVENT_TYPES = {
  ARRIVAL: 'arrival',
  DEPARTURE: 'departure'
};

const GEOFENCE_STATES_KEY = '@geofence_states';

/**
 * Records an arrival or departure event
 * FIX C4: Complete event tracking implementation
 *
 * @param {string} journeyId - The journey ID this event belongs to
 * @param {string} geofenceId - The geofence ID
 * @param {string} geofenceName - Human-readable geofence name
 * @param {string} eventType - 'arrival' or 'departure'
 * @param {Object} location - {latitude, longitude}
 * @returns {Promise<Object|null>} The created event or null if duplicate
 */
export async function recordArrivalDepartureEvent(
  journeyId,
  geofenceId,
  geofenceName,
  eventType,
  location
) {
  try {
    // Create event object
    const event = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      journeyId,
      geofenceId,
      geofenceName,
      eventType,
      timestamp: Date.now(),
      location: {
        latitude: location.latitude,
        longitude: location.longitude
      },
      synced: false
    };

    // Store locally
    const key = `@journey_${journeyId}_events`;
    const eventsJson = await AsyncStorage.getItem(key);
    const events = eventsJson ? JSON.parse(eventsJson) : [];

    // FIX M6: Check for duplicate events (within 1 minute window)
    const isDuplicate = events.some(e =>
      e.geofenceId === geofenceId &&
      e.eventType === eventType &&
      (Date.now() - e.timestamp) < 60000
    );

    if (isDuplicate) {
      console.log(`Duplicate ${eventType} event detected for geofence ${geofenceId}, skipping`);
      return null;
    }

    // Add to events array
    events.push(event);
    await AsyncStorage.setItem(key, JSON.stringify(events));

    console.log(`Event recorded: ${eventType} at ${geofenceName}`);

    // Sync to Firebase
    try {
      await syncEventToFirebase(journeyId, event);
      event.synced = true;

      // Update local storage with sync status
      const updatedEvents = events.map(e => e.id === event.id ? event : e);
      await AsyncStorage.setItem(key, JSON.stringify(updatedEvents));
    } catch (syncError) {
      console.error('Failed to sync event to Firebase:', syncError);
      // Event is still stored locally, will be synced later
    }

    // FIX C5: Update geofence state
    await updateGeofenceState(geofenceId, eventType, location);

    return event;
  } catch (error) {
    console.error('Error recording arrival/departure event:', error);
    throw error;
  }
}

/**
 * Syncs an event to Firebase
 * @param {string} journeyId - Journey ID
 * @param {Object} event - Event object
 */
async function syncEventToFirebase(journeyId, event) {
  try {
    const eventRef = ref(database, `journeys/${journeyId}/events/${event.id}`);
    await set(eventRef, {
      ...event,
      synced: true,
      syncedAt: Date.now()
    });
    console.log(`Event ${event.id} synced to Firebase`);
  } catch (error) {
    console.error('Error syncing event to Firebase:', error);
    throw error;
  }
}

/**
 * FIX C5: Updates and persists geofence state (inside/outside)
 *
 * @param {string} geofenceId - Geofence ID
 * @param {string} eventType - 'arrival' or 'departure'
 * @param {Object} location - Current location
 */
export async function updateGeofenceState(geofenceId, eventType, location) {
  try {
    const statesJson = await AsyncStorage.getItem(GEOFENCE_STATES_KEY);
    const states = statesJson ? JSON.parse(statesJson) : {};

    states[geofenceId] = {
      inside: eventType === EVENT_TYPES.ARRIVAL,
      lastEvent: Date.now(),
      lastEventType: eventType,
      lastLocation: location
    };

    await AsyncStorage.setItem(GEOFENCE_STATES_KEY, JSON.stringify(states));
    console.log(`Geofence state updated: ${geofenceId} - ${eventType === EVENT_TYPES.ARRIVAL ? 'inside' : 'outside'}`);
  } catch (error) {
    console.error('Error updating geofence state:', error);
  }
}

/**
 * Gets the current state of a geofence
 *
 * @param {string} geofenceId - Geofence ID
 * @returns {Promise<Object>} State object {inside, lastEvent, lastEventType, lastLocation}
 */
export async function getGeofenceState(geofenceId) {
  try {
    const statesJson = await AsyncStorage.getItem(GEOFENCE_STATES_KEY);
    const states = statesJson ? JSON.parse(statesJson) : {};
    return states[geofenceId] || {
      inside: false,
      lastEvent: null,
      lastEventType: null,
      lastLocation: null
    };
  } catch (error) {
    console.error('Error getting geofence state:', error);
    return {
      inside: false,
      lastEvent: null,
      lastEventType: null,
      lastLocation: null
    };
  }
}

/**
 * FIX C5: Initializes geofence states when journey starts
 * Determines if user is already inside any geofences
 *
 * @param {Array} geofences - Array of geofence objects
 * @param {Object} currentLocation - Current user location {latitude, longitude}
 */
export async function initializeGeofenceStates(geofences, currentLocation) {
  try {
    const states = {};

    for (const geofence of geofences) {
      const distance = calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        geofence.latitude,
        geofence.longitude
      );

      const isInside = distance <= geofence.radius;

      states[geofence.id] = {
        inside: isInside,
        lastEvent: Date.now(),
        lastEventType: isInside ? EVENT_TYPES.ARRIVAL : null,
        lastLocation: currentLocation
      };

      console.log(`Geofence ${geofence.name}: ${isInside ? 'inside' : 'outside'} (${Math.round(distance)}m)`);
    }

    await AsyncStorage.setItem(GEOFENCE_STATES_KEY, JSON.stringify(states));
    console.log('Geofence states initialized for', geofences.length, 'geofences');
  } catch (error) {
    console.error('Error initializing geofence states:', error);
  }
}

/**
 * Calculates distance between two coordinates using Haversine formula
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

/**
 * Gets all events for a journey
 *
 * @param {string} journeyId - Journey ID
 * @returns {Promise<Array>} Array of event objects
 */
export async function getJourneyEvents(journeyId) {
  try {
    const key = `@journey_${journeyId}_events`;
    const eventsJson = await AsyncStorage.getItem(key);
    return eventsJson ? JSON.parse(eventsJson) : [];
  } catch (error) {
    console.error('Error getting journey events:', error);
    return [];
  }
}

/**
 * Syncs all unsynced events to Firebase
 *
 * @param {string} journeyId - Journey ID
 * @returns {Promise<number>} Number of events synced
 */
export async function syncUnsyncedEvents(journeyId) {
  try {
    const events = await getJourneyEvents(journeyId);
    const unsyncedEvents = events.filter(e => !e.synced);

    let syncedCount = 0;
    for (const event of unsyncedEvents) {
      try {
        await syncEventToFirebase(journeyId, event);
        event.synced = true;
        syncedCount++;
      } catch (error) {
        console.error(`Failed to sync event ${event.id}:`, error);
      }
    }

    // Update local storage
    if (syncedCount > 0) {
      const key = `@journey_${journeyId}_events`;
      await AsyncStorage.setItem(key, JSON.stringify(events));
    }

    return syncedCount;
  } catch (error) {
    console.error('Error syncing unsynced events:', error);
    return 0;
  }
}

/**
 * FIX C6: Checks if an event should be triggered based on hysteresis
 * Prevents flickering on geofence boundaries
 *
 * @param {string} geofenceId - Geofence ID
 * @param {string} newEventType - Proposed event type
 * @param {number} distanceFromCenter - Distance from geofence center in meters
 * @param {number} radius - Geofence radius in meters
 * @returns {Promise<boolean>} True if event should be triggered
 */
export async function shouldTriggerEvent(geofenceId, newEventType, distanceFromCenter, radius) {
  try {
    const state = await getGeofenceState(geofenceId);

    // FIX C6: Implement 20% hysteresis zone
    const hysteresisBuffer = radius * 0.2;
    const innerRadius = radius - hysteresisBuffer;
    const outerRadius = radius + hysteresisBuffer;

    // If no previous event, trigger based on current position
    if (!state.lastEventType) {
      return distanceFromCenter <= radius;
    }

    // If currently inside
    if (state.inside) {
      // Only trigger departure if well outside (beyond outer radius)
      if (newEventType === EVENT_TYPES.DEPARTURE) {
        return distanceFromCenter > outerRadius;
      }
      return false; // Already inside, don't trigger arrival
    } else {
      // Currently outside
      // Only trigger arrival if well inside (within inner radius)
      if (newEventType === EVENT_TYPES.ARRIVAL) {
        return distanceFromCenter < innerRadius;
      }
      return false; // Already outside, don't trigger departure
    }
  } catch (error) {
    console.error('Error checking event trigger:', error);
    return false;
  }
}

/**
 * Clears all geofence states
 */
export async function clearGeofenceStates() {
  try {
    await AsyncStorage.removeItem(GEOFENCE_STATES_KEY);
    console.log('Geofence states cleared');
  } catch (error) {
    console.error('Error clearing geofence states:', error);
  }
}

/**
 * Deletes all events for a journey
 * @param {string} journeyId - Journey ID
 */
export async function deleteJourneyEvents(journeyId) {
  try {
    const key = `@journey_${journeyId}_events`;
    await AsyncStorage.removeItem(key);
    console.log(`Events deleted for journey ${journeyId}`);
  } catch (error) {
    console.error('Error deleting journey events:', error);
  }
}
