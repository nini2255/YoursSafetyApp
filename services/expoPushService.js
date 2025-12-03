import * as Notifications from 'expo-notifications';
import { ref, set, get, update } from 'firebase/database';
import { database } from './firebase';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotifications() {
  try {
    // Debug logs to see what the device is reporting
    console.log("Debug - Device Info:", {
        isDevice: Constants.isDevice,
        model: Constants.deviceName,
        platform: Platform.OS
    });

    // FIX: Removed the error throw. We now just log a warning and PROCEED.
    if (!Constants.isDevice) {
      console.warn("⚠️ Constants.isDevice returned false. Proceeding anyway because you are on a physical device.");
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      throw new Error('Permission not granted for push notifications. Please enable them in settings.');
    }

    // Attempt to get the token
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: '4454e141-2909-4013-ae2d-51a4623c7a0f',
    });

    console.log("✅ Generated Token:", token.data);
    return token.data;
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    // Throw the real error (like "SenderId mismatch" or "Missing Permissions") so we can see it
    throw error;
  }
}

export async function saveUserToken(userId, token, userData = {}) {
  try {
    await update(ref(database, `users/${userId}`), {
      expoPushToken: token,
      ...userData,
      lastUpdated: Date.now(),
    });
    console.log(`Token saved for user ${userId}`);
    return true;
  } catch (error) {
    console.error('Error saving user token:', error);
    throw error;
  }
}

export async function getUserToken(userId) {
  try {
    const snapshot = await get(ref(database, `users/${userId}`));
    return snapshot.exists() ? snapshot.val().expoPushToken : null;
  } catch (error) {
    console.error('Error getting user token:', error);
    return null;
  }
}

export async function sendBulkPushNotifications(tokens, title, body, data = {}) {
  const messages = tokens.map(token => ({
    to: token,
    sound: 'default',
    title,
    body,
    data,
    priority: 'high',
  }));

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });
    return await response.json();
  } catch (error) {
    console.error('Error sending push notifications:', error);
    throw error;
  }
}