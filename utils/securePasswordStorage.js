/**
 * Secure Password Storage Utility
 * Wraps expo-secure-store for secure password/sensitive data storage
 * Falls back to AsyncStorage with warning if SecureStore is unavailable
 */

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const USE_SECURE_STORE = true; // Set to false to force AsyncStorage (for testing)

/**
 * Saves a password or sensitive data securely
 * @param {string} key - Storage key
 * @param {string} value - Value to store
 * @returns {Promise<void>}
 */
export async function saveSecureData(key, value) {
  try {
    if (USE_SECURE_STORE) {
      await SecureStore.setItemAsync(key, value);
      console.log(`Secure data saved: ${key}`);
    } else {
      console.warn(`SecureStore disabled, using AsyncStorage for ${key} - NOT SECURE FOR PRODUCTION`);
      await AsyncStorage.setItem(key, value);
    }
  } catch (error) {
    console.error(`Error saving secure data for ${key}:`, error);
    // Fallback to AsyncStorage if SecureStore fails
    console.warn(`Falling back to AsyncStorage for ${key} - NOT SECURE`);
    await AsyncStorage.setItem(key, value);
  }
}

/**
 * Retrieves secure data
 * @param {string} key - Storage key
 * @returns {Promise<string|null>} Retrieved value or null
 */
export async function getSecureData(key) {
  try {
    if (USE_SECURE_STORE) {
      const value = await SecureStore.getItemAsync(key);
      return value;
    } else {
      const value = await AsyncStorage.getItem(key);
      return value;
    }
  } catch (error) {
    console.error(`Error getting secure data for ${key}:`, error);
    // Try AsyncStorage as fallback
    try {
      return await AsyncStorage.getItem(key);
    } catch (fallbackError) {
      console.error(`Fallback also failed for ${key}:`, fallbackError);
      return null;
    }
  }
}

/**
 * Deletes secure data
 * @param {string} key - Storage key
 * @returns {Promise<void>}
 */
export async function deleteSecureData(key) {
  try {
    if (USE_SECURE_STORE) {
      await SecureStore.deleteItemAsync(key);
    } else {
      await AsyncStorage.removeItem(key);
    }
    console.log(`Secure data deleted: ${key}`);
  } catch (error) {
    console.error(`Error deleting secure data for ${key}:`, error);
    // Try AsyncStorage as fallback
    try {
      await AsyncStorage.removeItem(key);
    } catch (fallbackError) {
      console.error(`Fallback delete also failed for ${key}:`, fallbackError);
    }
  }
}

/**
 * Migrates existing password from AsyncStorage to SecureStore
 * @param {string} key - Storage key
 * @returns {Promise<boolean>} True if migrated successfully
 */
export async function migrateToSecureStore(key) {
  try {
    // Check if already in SecureStore
    const secureValue = await SecureStore.getItemAsync(key);
    if (secureValue) {
      console.log(`${key} already in SecureStore`);
      return true;
    }

    // Get from AsyncStorage
    const asyncValue = await AsyncStorage.getItem(key);
    if (!asyncValue) {
      console.log(`No data to migrate for ${key}`);
      return false;
    }

    // Move to SecureStore
    await SecureStore.setItemAsync(key, asyncValue);

    // Remove from AsyncStorage
    await AsyncStorage.removeItem(key);

    console.log(`Successfully migrated ${key} to SecureStore`);
    return true;
  } catch (error) {
    console.error(`Error migrating ${key} to SecureStore:`, error);
    return false;
  }
}
