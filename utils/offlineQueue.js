/**
 * Offline Queue Service
 * FIX C12: Implements offline queue for location updates
 *
 * This service provides:
 * - Queuing of failed location updates
 * - Automatic retry when connection restored
 * - Network state monitoring
 * - Queue size management
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { pushLocationUpdate } from '../services/firebaseService';

const QUEUE_KEY = '@offline_location_queue';
const MAX_QUEUE_SIZE = 100;
const MAX_RETRIES = 3;

/**
 * Adds a location update to the offline queue
 *
 * @param {string} shareCode - Share code
 * @param {Object} location - Location data
 * @param {string} password - Password for encryption
 * @param {number} updateInterval - Update interval in seconds
 */
export async function queueLocationUpdate(shareCode, location, password, updateInterval) {
  try {
    const queue = await getQueue();

    // FIX M32: Limit queue size to prevent storage overflow
    if (queue.length >= MAX_QUEUE_SIZE) {
      console.warn('Queue full, removing oldest entry');
      queue.shift();
    }

    const queueItem = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      shareCode,
      location,
      password,
      updateInterval,
      queuedAt: Date.now(),
      retries: 0
    };

    queue.push(queueItem);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));

    console.log('Location update queued:', queueItem.id);

    // Try to process immediately
    processQueue();

    return queueItem.id;
  } catch (error) {
    console.error('Error queuing location update:', error);
    throw error;
  }
}

/**
 * Processes the offline queue, attempting to sync queued updates
 * FIX C12: Implements retry logic for failed updates
 */
export async function processQueue() {
  try {
    // FIX H10: Check network connectivity before processing
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      console.log('No network connection, queue processing skipped');
      return { processed: 0, failed: 0 };
    }

    const queue = await getQueue();
    if (queue.length === 0) {
      return { processed: 0, failed: 0 };
    }

    console.log(`Processing offline queue: ${queue.length} items`);
    const failed = [];
    let processedCount = 0;

    for (const item of queue) {
      try {
        await pushLocationUpdate(
          item.shareCode,
          item.location,
          item.password,
          item.updateInterval
        );

        console.log(`Queue item ${item.id} synced successfully`);
        processedCount++;
      } catch (error) {
        console.error(`Failed to sync queue item ${item.id}:`, error);

        // FIX C12: Retry logic with max retries
        if (item.retries < MAX_RETRIES) {
          item.retries++;
          failed.push(item);
          console.log(`Queue item ${item.id} will be retried (attempt ${item.retries}/${MAX_RETRIES})`);
        } else {
          console.warn(`Queue item ${item.id} exceeded max retries, dropping`);
        }
      }
    }

    // Update queue with only failed items
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(failed));

    console.log(`Queue processing complete: ${processedCount} processed, ${failed.length} remaining`);
    return { processed: processedCount, failed: failed.length };
  } catch (error) {
    console.error('Error processing queue:', error);
    return { processed: 0, failed: 0 };
  }
}

/**
 * Gets the current queue
 * @returns {Promise<Array>} Queue items
 */
async function getQueue() {
  try {
    const queueJson = await AsyncStorage.getItem(QUEUE_KEY);
    return queueJson ? JSON.parse(queueJson) : [];
  } catch (error) {
    console.error('Error getting queue:', error);
    return [];
  }
}

/**
 * Clears the entire queue
 */
export async function clearQueue() {
  try {
    await AsyncStorage.removeItem(QUEUE_KEY);
    console.log('Offline queue cleared');
  } catch (error) {
    console.error('Error clearing queue:', error);
  }
}

/**
 * Gets the current queue size
 * @returns {Promise<number>} Number of items in queue
 */
export async function getQueueSize() {
  try {
    const queue = await getQueue();
    return queue.length;
  } catch (error) {
    console.error('Error getting queue size:', error);
    return 0;
  }
}

/**
 * Gets queue statistics
 * @returns {Promise<Object>} Queue stats
 */
export async function getQueueStats() {
  try {
    const queue = await getQueue();
    return {
      size: queue.length,
      oldestItem: queue.length > 0 ? queue[0].queuedAt : null,
      newestItem: queue.length > 0 ? queue[queue.length - 1].queuedAt : null,
      totalRetries: queue.reduce((sum, item) => sum + item.retries, 0)
    };
  } catch (error) {
    console.error('Error getting queue stats:', error);
    return {
      size: 0,
      oldestItem: null,
      newestItem: null,
      totalRetries: 0
    };
  }
}

/**
 * FIX H10: Sets up network listener to automatically process queue when connection restored
 * Also syncs unsynced journey events
 * @returns {Function} Unsubscribe function
 */
export function setupQueueListener() {
  console.log('Setting up offline queue network listener');

  const unsubscribe = NetInfo.addEventListener(async state => {
    console.log('Network state changed:', state.isConnected ? 'connected' : 'disconnected');

    if (state.isConnected) {
      console.log('Network connected, processing offline queue and syncing events');

      // Process offline location queue
      await processQueue();

      // Sync unsynced journey events
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const { syncUnsyncedEvents } = require('../services/arrivalDepartureService');
        const { getActiveJourney } = require('../services/journeyService');

        const journey = await getActiveJourney();
        if (journey) {
          const syncedCount = await syncUnsyncedEvents(journey.id);
          if (syncedCount > 0) {
            console.log(`Synced ${syncedCount} unsynced events`);
          }
        }
      } catch (error) {
        console.error('Error syncing unsynced events:', error);
      }
    }
  });

  // Process queue immediately if online
  NetInfo.fetch().then(async state => {
    if (state.isConnected) {
      await processQueue();

      // Sync events on startup if online
      try {
        const { syncUnsyncedEvents } = require('../services/arrivalDepartureService');
        const { getActiveJourney } = require('../services/journeyService');

        const journey = await getActiveJourney();
        if (journey) {
          const syncedCount = await syncUnsyncedEvents(journey.id);
          if (syncedCount > 0) {
            console.log(`Synced ${syncedCount} unsynced events on startup`);
          }
        }
      } catch (error) {
        console.error('Error syncing events on startup:', error);
      }
    }
  });

  return unsubscribe;
}

/**
 * Removes old queue items (older than 24 hours)
 * FIX M32: Cleanup to prevent storage overflow
 */
export async function cleanOldQueueItems() {
  try {
    const queue = await getQueue();
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;

    const filtered = queue.filter(item => (now - item.queuedAt) < twentyFourHours);

    if (filtered.length < queue.length) {
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
      console.log(`Cleaned ${queue.length - filtered.length} old queue items`);
    }
  } catch (error) {
    console.error('Error cleaning old queue items:', error);
  }
}
