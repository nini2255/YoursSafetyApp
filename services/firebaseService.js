import { database } from './firebase';
import { ref, set, get, onValue, off, update, remove } from 'firebase/database';
import { encryptLocation, decryptLocation } from '../utils/journeySharing/encryption';

/**
 * Checks if a share code is available (not currently in use)
 * @param {string} shareCode - The share code to check
 * @returns {Promise<boolean>} True if available, false if already in use
 */
export async function checkShareCodeAvailability(shareCode) {
  try {
    const locationRef = ref(database, `locations/${shareCode}`);
    const snapshot = await get(locationRef);

    if (!snapshot.exists()) {
      return true; // Code is available
    }

    const data = snapshot.val();
    // Code is available if session is inactive or expired
    if (!data.active) {
      return true;
    }

    // Check if session has expired (48 hours after lastUpdate for inactive sessions)
    const now = Date.now();
    const fortyEightHours = 48 * 60 * 60 * 1000;
    if (data.lastUpdate && (now - data.lastUpdate) > fortyEightHours && !data.active) {
      return true;
    }

    return false; // Code is currently in use
  } catch (error) {
    console.error('Error checking share code availability:', error);
    throw new Error('Failed to check share code availability');
  }
}

/**
 * Pushes an encrypted location update to Firebase
 * @param {string} shareCode - The share code
 * @param {Object} location - Location object {latitude, longitude, timestamp}
 * @param {string} password - The password for encryption
 * @param {number} updateInterval - Update interval in seconds
 * @returns {Promise<void>}
 */
export async function pushLocationUpdate(shareCode, location, password, updateInterval) {
  try {
    const encryptedData = encryptLocation(location, password, shareCode);
    const locationRef = ref(database, `locations/${shareCode}`);

    const data = {
      encryptedData,
      timestamp: location.timestamp || Date.now(),
      active: true,
      updateInterval,
      lastUpdate: Date.now()
    };

    await set(locationRef, data);
    console.log('Location update pushed successfully');
  } catch (error) {
    console.error('Error pushing location update:', error);
    throw new Error('Failed to push location update');
  }
}

/**
 * Ends a sharing session
 * @param {string} shareCode - The share code
 * @returns {Promise<void>}
 */
export async function endSharingSession(shareCode) {
  try {
    const locationRef = ref(database, `locations/${shareCode}`);

    await update(locationRef, {
      active: false,
      lastUpdate: Date.now()
    });

    console.log('Sharing session ended');
  } catch (error) {
    console.error('Error ending sharing session:', error);
    throw new Error('Failed to end sharing session');
  }
}

/**
 * Fetches and decrypts the latest location for a share code
 * @param {string} shareCode - The share code
 * @param {string} password - The password for decryption
 * @returns {Promise<Object>} Location data and metadata
 */
export async function fetchLocation(shareCode, password) {
  console.log('[Firebase] fetchLocation called for:', shareCode);
  try {
    const locationRef = ref(database, `locations/${shareCode}`);
    console.log('[Firebase] Fetching from path:', `locations/${shareCode}`);

    const snapshot = await get(locationRef);
    console.log('[Firebase] Snapshot exists:', snapshot.exists());

    if (!snapshot.exists()) {
      console.log('[Firebase] ERROR: Share code not found');
      throw new Error('Share code not found');
    }

    const data = snapshot.val();
    console.log('[Firebase] Data received:', {
      hasEncryptedData: !!data.encryptedData,
      active: data.active,
      lastUpdate: data.lastUpdate,
      encryptedDataLength: data.encryptedData?.length
    });

    // Decrypt the location
    console.log('[Firebase] Attempting to decrypt location...');
    const location = decryptLocation(data.encryptedData, password, shareCode);
    console.log('[Firebase] ✓ Decryption successful:', location);

    return {
      location,
      active: data.active,
      lastUpdate: data.lastUpdate,
      updateInterval: data.updateInterval,
      timestamp: data.timestamp
    };
  } catch (error) {
    console.error('[Firebase] ERROR in fetchLocation:', error.message);
    if (error.message === 'Share code not found') {
      throw error;
    }
    if (error.message.includes('Invalid password')) {
      throw new Error('Invalid password');
    }
    console.error('[Firebase] Full error:', error);
    throw new Error('Failed to fetch location data');
  }
}

/**
 * Sets up a real-time listener for location updates
 * @param {string} shareCode - The share code to listen to
 * @param {string} password - The password for decryption
 * @param {Function} callback - Callback function called with decrypted data
 * @returns {Function} Unsubscribe function to stop listening
 */
export function listenToLocation(shareCode, password, callback) {
  try {
    const locationRef = ref(database, `locations/${shareCode}`);

    const unsubscribe = onValue(locationRef, (snapshot) => {
      try {
        if (!snapshot.exists()) {
          callback({
            error: 'Session not found',
            exists: false
          });
          return;
        }

        const data = snapshot.val();

        // Try to decrypt the location
        try {
          const location = decryptLocation(data.encryptedData, password, shareCode);

          callback({
            location,
            active: data.active,
            lastUpdate: data.lastUpdate,
            updateInterval: data.updateInterval,
            timestamp: data.timestamp,
            exists: true,
            error: null
          });
        } catch (decryptError) {
          callback({
            error: 'Invalid password or corrupted data',
            exists: true,
            active: data.active
          });
        }
      } catch (error) {
        console.error('Error in location listener callback:', error);
        callback({
          error: 'Failed to process location update',
          exists: false
        });
      }
    }, (error) => {
      console.error('Firebase listener error:', error);
      callback({
        error: 'Connection error',
        exists: false
      });
    });

    // Return unsubscribe function
    return () => {
      off(locationRef);
    };
  } catch (error) {
    console.error('Error setting up location listener:', error);
    throw new Error('Failed to set up location listener');
  }
}

/**
 * Validates authentication by attempting to fetch and decrypt data
 * @param {string} shareCode - The share code
 * @param {string} password - The password
 * @returns {Promise<boolean>} True if authentication successful
 */
export async function validateAuthentication(shareCode, password) {
  try {
    await fetchLocation(shareCode, password);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Deletes a location sharing session from Firebase
 * @param {string} shareCode - The share code to delete
 * @returns {Promise<void>}
 */
export async function deleteLocationSession(shareCode) {
  console.log('[DeleteSession] Deleting location session:', shareCode);
  console.log('[DeleteSession] Firebase path:', `locations/${shareCode}`);

  try {
    const locationRef = ref(database, `locations/${shareCode}`);

    // Check if it exists before deletion
    console.log('[DeleteSession] Checking if session exists...');
    const beforeSnapshot = await get(locationRef);
    console.log('[DeleteSession] Session exists before delete:', beforeSnapshot.exists());

    if (beforeSnapshot.exists()) {
      console.log('[DeleteSession] Session data before delete:', beforeSnapshot.val());
    }

    // Use remove() instead of set(null) for proper deletion
    console.log('[DeleteSession] Calling remove()...');
    await remove(locationRef);
    console.log('[DeleteSession] ✅ remove() completed');

    // Verify deletion
    console.log('[DeleteSession] Verifying deletion...');
    const afterSnapshot = await get(locationRef);
    console.log('[DeleteSession] Session exists after delete:', afterSnapshot.exists());

    if (afterSnapshot.exists()) {
      console.error('[DeleteSession] ❌ ERROR: Session still exists after deletion!');
      console.error('[DeleteSession] Remaining data:', afterSnapshot.val());
      throw new Error('Session still exists after deletion attempt');
    }

    console.log('[DeleteSession] ✅ Location session deleted successfully');
  } catch (error) {
    console.error('[DeleteSession] ❌ Error deleting location session:', error);
    console.error('[DeleteSession] Error type:', error.constructor.name);
    console.error('[DeleteSession] Error message:', error.message);
    console.error('[DeleteSession] Error code:', error.code);
    console.error('[DeleteSession] Full error:', error);
    throw new Error(`Failed to delete location session: ${error.message}`);
  }
}

/**
 * Checks if a sharer is offline based on last update time
 * @param {number} lastUpdate - Last update timestamp
 * @param {number} updateInterval - Expected update interval in seconds
 * @returns {boolean} True if likely offline
 */
export function isSharerOffline(lastUpdate, updateInterval) {
  const now = Date.now();
  const timeSinceUpdate = now - lastUpdate;
  const expectedInterval = updateInterval * 1000; // Convert to ms
  const threshold = expectedInterval * 2; // 2x the update interval

  return timeSinceUpdate > threshold;
}

/**
 * Gets time since last update in human-readable format
 * @param {number} lastUpdate - Last update timestamp
 * @returns {string} Human-readable time string
 */
export function getTimeSinceUpdate(lastUpdate) {
  const now = Date.now();
  const diff = now - lastUpdate;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else {
    return 'just now';
  }
}
