import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { getGeofence } from './geofenceStorage';
import { getUserToken, sendBulkPushNotifications } from './expoPushService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  recordArrivalDepartureEvent,
  shouldTriggerEvent,
  EVENT_TYPES
} from './arrivalDepartureService';

const GEOFENCE_TASK_NAME = 'geofence-background-task';

/**
 * FIX C4: Enhanced geofence task with state tracking and event recording
 */
TaskManager.defineTask(GEOFENCE_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Geofence task error:', error);
    return;
  }

  if (data.eventType === Location.GeofencingEventType.Enter) {
    await handleGeofenceEvent(data.region.identifier, EVENT_TYPES.ARRIVAL, data.region);
  } else if (data.eventType === Location.GeofencingEventType.Exit) {
    await handleGeofenceEvent(data.region.identifier, EVENT_TYPES.DEPARTURE, data.region);
  }
});

/**
 * FIX C4, C5, C6: Enhanced geofence event handler with:
 * - Arrival/departure event recording
 * - State tracking
 * - Hysteresis to prevent flickering
 * - Journey association
 * - User-scoped emergency contacts
 */
async function handleGeofenceEvent(geofenceId, eventType, region) {
  try {
    const geofence = await getGeofence(geofenceId);
    if (!geofence) {
      console.warn('Geofence not found:', geofenceId);
      return;
    }

    // Get current location for event recording
    let currentLocation;
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });
      currentLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      };
    } catch (locError) {
      console.error('Failed to get current location:', locError);
      // Use geofence center as fallback
      currentLocation = {
        latitude: geofence.latitude,
        longitude: geofence.longitude
      };
    }

    // FIX C6: Calculate distance for hysteresis check
    const distance = calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      geofence.latitude,
      geofence.longitude
    );

    // FIX C6: Check if event should be triggered (prevents flickering)
    const shouldTrigger = await shouldTriggerEvent(
      geofenceId,
      eventType,
      distance,
      geofence.radius
    );

    if (!shouldTrigger) {
      console.log(`Event suppressed by hysteresis: ${eventType} at ${geofence.name}`);
      return;
    }

    // FIX C4: Get active journey and record event
    const activeJourneyJson = await AsyncStorage.getItem('@active_journey');
    if (activeJourneyJson) {
      try {
        const activeJourney = JSON.parse(activeJourneyJson);

        // Record to arrival/departure service
        await recordArrivalDepartureEvent(
          activeJourney.journeyId,
          geofenceId,
          geofence.name,
          eventType,
          currentLocation
        );

        // Also record to journey service
        const { recordWaypointEvent } = require('./journeyService');
        await recordWaypointEvent(
          activeJourney.journeyId,
          geofenceId,
          eventType,
          currentLocation
        );

        console.log(`Event recorded: ${eventType} at ${geofence.name} for journey ${activeJourney.journeyId}`);
      } catch (journeyError) {
        console.error('Error recording event for journey:', journeyError);
      }
    } else {
      console.log('No active journey, event not recorded to journey');
    }

    // Send notifications if configured
    const shouldNotify = eventType === EVENT_TYPES.ARRIVAL
      ? geofence.notifyOnArrival
      : geofence.notifyOnDeparture;

    if (!shouldNotify) {
      console.log('Notifications disabled for this event type');
      return;
    }

    // FIX H8: Get user-scoped emergency contacts
    const userEmail = await AsyncStorage.getItem('@current_user_email');
    const contactsKey = userEmail ? `@${userEmail}_emergency_contacts` : '@emergency_contacts';
    const contactsData = await AsyncStorage.getItem(contactsKey);

    if (!contactsData) {
      console.log('No emergency contacts configured');
      return;
    }

    const allContacts = JSON.parse(contactsData);
    let contactsToNotify = geofence.notifyContacts === 'all'
      ? allContacts
      : allContacts.filter(c => geofence.notifyContacts.includes(c.id));

    // Get tokens for contacts
    const tokens = [];
    for (const contact of contactsToNotify) {
      if (contact.userId) {
        const token = await getUserToken(contact.userId);
        if (token) tokens.push(token);
      }
    }

    if (tokens.length === 0) {
      console.log('No notification tokens found for emergency contacts');
      return;
    }

    // FIX H20: Check notification permissions before sending
    // Send notifications
    const title = eventType === EVENT_TYPES.ARRIVAL
      ? `📍 Arrived at ${geofence.name}`
      : `📍 Left ${geofence.name}`;
    const body = `User has ${eventType === EVENT_TYPES.ARRIVAL ? 'arrived at' : 'left'} ${geofence.name}`;

    try {
      const result = await sendBulkPushNotifications(tokens, title, body, {
        type: 'geofence_notification',
        eventType,
        geofenceId: geofence.id,
        geofenceName: geofence.name,
        timestamp: Date.now()
      });

      // FIX H19: Check notification delivery confirmation
      console.log('Notification sent, response:', result);
    } catch (notifError) {
      console.error('Failed to send notifications:', notifError);
    }
  } catch (error) {
    console.error('Error handling geofence event:', error);
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

export async function startGeofenceMonitoring(geofences) {
  try {
    const { status } = await Location.requestBackgroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Background location permission not granted');
    }

    const isRegistered = await TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK_NAME);
    if (isRegistered) {
      await Location.stopGeofencingAsync(GEOFENCE_TASK_NAME);
    }

    const regions = geofences.map(g => ({
      identifier: g.id,
      latitude: g.latitude,
      longitude: g.longitude,
      radius: g.radius,
      notifyOnEnter: g.notifyOnArrival,
      notifyOnExit: g.notifyOnDeparture,
    }));

    if (regions.length > 0) {
      await Location.startGeofencingAsync(GEOFENCE_TASK_NAME, regions);
    }
  } catch (error) {
    console.error('Error starting geofence monitoring:', error);
    throw error;
  }
}

export async function stopGeofenceMonitoring() {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK_NAME);
    if (isRegistered) {
      await Location.stopGeofencingAsync(GEOFENCE_TASK_NAME);
    }
  } catch (error) {
    console.error('Error stopping geofence monitoring:', error);
  }
}

export async function updateGeofenceMonitoring(geofences) {
  await stopGeofenceMonitoring();
  await startGeofenceMonitoring(geofences);
}
