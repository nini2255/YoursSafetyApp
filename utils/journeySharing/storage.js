import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveSecureData, getSecureData, deleteSecureData, migrateToSecureStore } from '../securePasswordStorage';

const STORAGE_KEYS = {
  ACTIVE_SESSIONS: '@journey_sharing_active_sessions',
  ENDED_SESSIONS: '@journey_sharing_ended_sessions',
  SHARING_SESSION: '@journey_sharing_my_session',
  SHARING_CONFIG: '@journey_sharing_config'
};

/**
 * Storage for tracking sessions (listener side)
 */

/**
 * Saves an active tracking session
 * @param {Object} session - Session data
 * @returns {Promise<void>}
 */
export async function saveActiveSession(session) {
  try {
    const sessionsJson = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_SESSIONS);
    const sessions = sessionsJson ? JSON.parse(sessionsJson) : [];

    // Check if session already exists
    const existingIndex = sessions.findIndex(s => s.id === session.id);
    if (existingIndex >= 0) {
      sessions[existingIndex] = session;
    } else {
      sessions.push(session);
    }

    await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_SESSIONS, JSON.stringify(sessions));
  } catch (error) {
    console.error('Error saving active session:', error);
    throw new Error('Failed to save active session');
  }
}

/**
 * Gets all active tracking sessions
 * @returns {Promise<Array>} Array of active sessions
 */
export async function getActiveSessions() {
  try {
    const sessionsJson = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_SESSIONS);
    return sessionsJson ? JSON.parse(sessionsJson) : [];
  } catch (error) {
    console.error('Error getting active sessions:', error);
    return [];
  }
}

/**
 * Removes a session from active sessions
 * @param {string} sessionId - The session ID to remove
 * @returns {Promise<void>}
 */
export async function removeActiveSession(sessionId) {
  try {
    const sessionsJson = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_SESSIONS);
    const sessions = sessionsJson ? JSON.parse(sessionsJson) : [];

    const filteredSessions = sessions.filter(s => s.id !== sessionId);

    await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_SESSIONS, JSON.stringify(filteredSessions));
  } catch (error) {
    console.error('Error removing active session:', error);
    throw new Error('Failed to remove active session');
  }
}

/**
 * Adds a location point to a session's history
 * @param {string} sessionId - The session ID
 * @param {Object} location - Location data {latitude, longitude, timestamp}
 * @returns {Promise<void>}
 */
export async function addLocationToHistory(sessionId, location) {
  try {
    const sessionsJson = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_SESSIONS);
    const sessions = sessionsJson ? JSON.parse(sessionsJson) : [];

    const sessionIndex = sessions.findIndex(s => s.id === sessionId);
    if (sessionIndex >= 0) {
      if (!sessions[sessionIndex].locationHistory) {
        sessions[sessionIndex].locationHistory = [];
      }
      sessions[sessionIndex].locationHistory.push(location);
      sessions[sessionIndex].lastUpdate = Date.now();

      await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_SESSIONS, JSON.stringify(sessions));
    }
  } catch (error) {
    console.error('Error adding location to history:', error);
  }
}

/**
 * Moves a session from active to ended
 * @param {string} sessionId - The session ID
 * @returns {Promise<void>}
 */
export async function moveToEndedSessions(sessionId) {
  try {
    // Get the session from active sessions
    const activeJson = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_SESSIONS);
    const activeSessions = activeJson ? JSON.parse(activeJson) : [];

    const session = activeSessions.find(s => s.id === sessionId);
    if (!session) {
      return;
    }

    // Remove from active
    await removeActiveSession(sessionId);

    // Add to ended sessions
    session.endTime = Date.now();
    session.duration = session.endTime - (session.startTime || Date.now());

    const endedJson = await AsyncStorage.getItem(STORAGE_KEYS.ENDED_SESSIONS);
    const endedSessions = endedJson ? JSON.parse(endedJson) : [];

    endedSessions.unshift(session); // Add to beginning

    await AsyncStorage.setItem(STORAGE_KEYS.ENDED_SESSIONS, JSON.stringify(endedSessions));
  } catch (error) {
    console.error('Error moving session to ended:', error);
    throw new Error('Failed to move session to ended');
  }
}

/**
 * Gets all ended sessions
 * @returns {Promise<Array>} Array of ended sessions
 */
export async function getEndedSessions() {
  try {
    const sessionsJson = await AsyncStorage.getItem(STORAGE_KEYS.ENDED_SESSIONS);
    return sessionsJson ? JSON.parse(sessionsJson) : [];
  } catch (error) {
    console.error('Error getting ended sessions:', error);
    return [];
  }
}

/**
 * Deletes an ended session permanently
 * @param {string} sessionId - The session ID to delete
 * @returns {Promise<void>}
 */
export async function deleteEndedSession(sessionId) {
  try {
    const sessionsJson = await AsyncStorage.getItem(STORAGE_KEYS.ENDED_SESSIONS);
    const sessions = sessionsJson ? JSON.parse(sessionsJson) : [];

    const filteredSessions = sessions.filter(s => s.id !== sessionId);

    await AsyncStorage.setItem(STORAGE_KEYS.ENDED_SESSIONS, JSON.stringify(filteredSessions));
  } catch (error) {
    console.error('Error deleting ended session:', error);
    throw new Error('Failed to delete ended session');
  }
}

/**
 * Gets a specific session (active or ended)
 * @param {string} sessionId - The session ID
 * @returns {Promise<Object|null>} The session or null
 */
export async function getSession(sessionId) {
  try {
    // Check active sessions first
    const activeJson = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_SESSIONS);
    const activeSessions = activeJson ? JSON.parse(activeJson) : [];
    const activeSession = activeSessions.find(s => s.id === sessionId);
    if (activeSession) {
      return { ...activeSession, isActive: true };
    }

    // Check ended sessions
    const endedJson = await AsyncStorage.getItem(STORAGE_KEYS.ENDED_SESSIONS);
    const endedSessions = endedJson ? JSON.parse(endedJson) : [];
    const endedSession = endedSessions.find(s => s.id === sessionId);
    if (endedSession) {
      return { ...endedSession, isActive: false };
    }

    return null;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}

/**
 * Storage for sharing sessions (sharer side)
 */

/**
 * Saves the current sharing session
 * @param {Object} session - Session data
 * @returns {Promise<void>}
 */
export async function saveSharingSession(session) {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.SHARING_SESSION, JSON.stringify(session));
  } catch (error) {
    console.error('Error saving sharing session:', error);
    throw new Error('Failed to save sharing session');
  }
}

/**
 * Gets the current sharing session
 * @returns {Promise<Object|null>} The sharing session or null
 */
export async function getSharingSession() {
  try {
    const sessionJson = await AsyncStorage.getItem(STORAGE_KEYS.SHARING_SESSION);
    return sessionJson ? JSON.parse(sessionJson) : null;
  } catch (error) {
    console.error('Error getting sharing session:', error);
    return null;
  }
}

/**
 * Clears the current sharing session
 * @returns {Promise<void>}
 */
export async function clearSharingSession() {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.SHARING_SESSION);
  } catch (error) {
    console.error('Error clearing sharing session:', error);
    throw new Error('Failed to clear sharing session');
  }
}

/**
 * Saves sharing configuration (code, password, settings)
 * @param {Object} config - Configuration data
 * @returns {Promise<void>}
 */
export async function saveSharingConfig(config) {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.SHARING_CONFIG, JSON.stringify(config));
  } catch (error) {
    console.error('Error saving sharing config:', error);
    throw new Error('Failed to save sharing config');
  }
}

/**
 * Gets the saved sharing configuration
 * @returns {Promise<Object|null>} The configuration or null
 */
export async function getSharingConfig() {
  try {
    const configJson = await AsyncStorage.getItem(STORAGE_KEYS.SHARING_CONFIG);
    return configJson ? JSON.parse(configJson) : null;
  } catch (error) {
    console.error('Error getting sharing config:', error);
    return null;
  }
}

/**
 * Clears all journey sharing data
 * @returns {Promise<void>}
 */
export async function clearAllData() {
  try {
    await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
  } catch (error) {
    console.error('Error clearing all data:', error);
    throw new Error('Failed to clear all data');
  }
}
