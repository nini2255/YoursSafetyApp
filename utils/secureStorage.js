/**
 * Secure Storage Utility
 * FIX C11, H13: Provides encryption for sensitive data stored in AsyncStorage
 *
 * Uses AES-256-CBC encryption for:
 * - Emergency contacts
 * - Location history
 * - Any other PII that needs protection
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoJS from 'crypto-js';
import * as Crypto from 'expo-crypto';

// Encryption key derivation
const STORAGE_ENCRYPTION_SALT = 'YOURS_SECURE_STORAGE_V1';
const PBKDF2_ITERATIONS = 10000;

/**
 * Gets or generates a device-specific encryption key
 * FIX C11: Secure key generation for local data encryption
 */
async function getDeviceEncryptionKey() {
  const KEY_STORAGE = '@device_encryption_key';

  try {
    // Try to retrieve existing key
    let key = await AsyncStorage.getItem(KEY_STORAGE);

    if (!key) {
      // Generate new random key
      const randomBytes = Crypto.getRandomBytes(32);
      key = Array.from(randomBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      // Store for future use
      await AsyncStorage.setItem(KEY_STORAGE, key);
      console.log('Generated new device encryption key');
    }

    return key;
  } catch (error) {
    console.error('Error getting device encryption key:', error);
    throw new Error('Failed to get encryption key');
  }
}

/**
 * Encrypts data for secure storage
 *
 * @param {any} data - Data to encrypt (will be JSON stringified)
 * @param {string} customKey - Optional custom key (uses device key if not provided)
 * @returns {Promise<string>} Encrypted data string
 */
export async function encryptForStorage(data, customKey = null) {
  try {
    const key = customKey || await getDeviceEncryptionKey();
    const dataString = JSON.stringify(data);

    // Generate random IV
    const ivBytes = Crypto.getRandomBytes(16);
    const ivWordArray = CryptoJS.lib.WordArray.create(Array.from(ivBytes));

    // Derive encryption key
    const derivedKey = CryptoJS.PBKDF2(key, STORAGE_ENCRYPTION_SALT, {
      keySize: 256 / 32,
      iterations: PBKDF2_ITERATIONS
    });

    // Encrypt
    const encrypted = CryptoJS.AES.encrypt(dataString, derivedKey, {
      iv: ivWordArray,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });

    // Return IV + encrypted data
    const result = {
      iv: ivWordArray.toString(CryptoJS.enc.Base64),
      data: encrypted.toString(),
      version: 1
    };

    return JSON.stringify(result);
  } catch (error) {
    console.error('Error encrypting data for storage:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypts data from secure storage
 *
 * @param {string} encryptedData - Encrypted data string
 * @param {string} customKey - Optional custom key (uses device key if not provided)
 * @returns {Promise<any>} Decrypted data (parsed from JSON)
 */
export async function decryptFromStorage(encryptedData, customKey = null) {
  try {
    if (!encryptedData || typeof encryptedData !== 'string') {
      throw new Error('Invalid encrypted data');
    }

    const key = customKey || await getDeviceEncryptionKey();

    // Parse encrypted payload
    const payload = JSON.parse(encryptedData);
    if (!payload.iv || !payload.data) {
      throw new Error('Missing IV or data in encrypted payload');
    }

    // Derive decryption key
    const derivedKey = CryptoJS.PBKDF2(key, STORAGE_ENCRYPTION_SALT, {
      keySize: 256 / 32,
      iterations: PBKDF2_ITERATIONS
    });

    const iv = CryptoJS.enc.Base64.parse(payload.iv);

    // Decrypt
    const decrypted = CryptoJS.AES.decrypt(payload.data, derivedKey, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });

    const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);

    if (!decryptedString) {
      throw new Error('Decryption failed');
    }

    return JSON.parse(decryptedString);
  } catch (error) {
    console.error('Error decrypting data from storage:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Securely stores data in AsyncStorage with encryption
 * FIX C11: Encrypted storage for emergency contacts and other sensitive data
 *
 * @param {string} key - Storage key
 * @param {any} data - Data to store
 * @param {boolean} encrypt - Whether to encrypt (default: true)
 */
export async function securelyStore(key, data, encrypt = true) {
  try {
    if (encrypt) {
      const encrypted = await encryptForStorage(data);
      await AsyncStorage.setItem(key, encrypted);
      console.log(`Data securely stored at key: ${key}`);
    } else {
      await AsyncStorage.setItem(key, JSON.stringify(data));
      console.log(`Data stored (unencrypted) at key: ${key}`);
    }
  } catch (error) {
    console.error('Error securely storing data:', error);
    throw error;
  }
}

/**
 * Securely retrieves data from AsyncStorage with decryption
 *
 * @param {string} key - Storage key
 * @param {boolean} encrypted - Whether data is encrypted (default: true)
 * @returns {Promise<any>} Retrieved data or null if not found
 */
export async function securelyRetrieve(key, encrypted = true) {
  try {
    const data = await AsyncStorage.getItem(key);

    if (!data) {
      return null;
    }

    if (encrypted) {
      try {
        return await decryptFromStorage(data);
      } catch (decryptError) {
        console.error('Failed to decrypt data, returning null:', decryptError);
        return null;
      }
    } else {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error securely retrieving data:', error);
    return null;
  }
}

/**
 * Migrates unencrypted data to encrypted storage
 * FIX C11: Migration utility for existing unencrypted data
 *
 * @param {string} key - Storage key
 * @returns {Promise<boolean>} True if migration successful
 */
export async function migrateToEncryptedStorage(key) {
  try {
    const data = await AsyncStorage.getItem(key);

    if (!data) {
      return false;
    }

    // Check if already encrypted (has IV and data fields)
    try {
      const parsed = JSON.parse(data);
      if (parsed.iv && parsed.data && parsed.version) {
        console.log(`Data at ${key} is already encrypted`);
        return true;
      }
    } catch (e) {
      // Not JSON or not encrypted format
    }

    // Migrate to encrypted
    const unencryptedData = JSON.parse(data);
    await securelyStore(key, unencryptedData, true);

    console.log(`Migrated ${key} to encrypted storage`);
    return true;
  } catch (error) {
    console.error('Error migrating to encrypted storage:', error);
    return false;
  }
}

/**
 * Checks storage quota usage
 * FIX M32: Storage quota management
 *
 * @returns {Promise<Object>} {totalSize, estimatedLimit, percentageUsed}
 */
export async function checkStorageQuota() {
  try {
    const keys = await AsyncStorage.getAllKeys();
    let totalSize = 0;

    for (const key of keys) {
      const value = await AsyncStorage.getItem(key);
      if (value) {
        totalSize += value.length;
      }
    }

    const estimatedLimit = 6 * 1024 * 1024; // 6MB typical limit
    const percentageUsed = (totalSize / estimatedLimit) * 100;

    return {
      totalSize,
      totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
      estimatedLimit,
      percentageUsed: percentageUsed.toFixed(2),
      keysCount: keys.length
    };
  } catch (error) {
    console.error('Error checking storage quota:', error);
    return {
      totalSize: 0,
      totalSizeMB: 0,
      estimatedLimit: 0,
      percentageUsed: 0,
      keysCount: 0
    };
  }
}

/**
 * Cleans up old data based on key pattern and age
 * FIX L8, M32: Automatic cleanup of old data
 *
 * @param {string} keyPattern - Regex pattern for keys to check
 * @param {number} maxAgeMs - Maximum age in milliseconds
 */
export async function cleanupOldData(keyPattern, maxAgeMs) {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const pattern = new RegExp(keyPattern);
    const matchingKeys = keys.filter(key => pattern.test(key));

    let cleanedCount = 0;
    const now = Date.now();

    for (const key of matchingKeys) {
      try {
        const data = await securelyRetrieve(key, true);

        if (data && data.timestamp) {
          const age = now - data.timestamp;

          if (age > maxAgeMs) {
            await AsyncStorage.removeItem(key);
            cleanedCount++;
          }
        }
      } catch (error) {
        console.error(`Error processing key ${key}:`, error);
      }
    }

    console.log(`Cleaned up ${cleanedCount} old items matching pattern: ${keyPattern}`);
    return cleanedCount;
  } catch (error) {
    console.error('Error cleaning up old data:', error);
    return 0;
  }
}
