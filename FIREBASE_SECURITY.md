# Firebase Security Configuration

## 🔴 CRITICAL SECURITY ISSUES TO FIX IMMEDIATELY

This document outlines the critical security vulnerabilities in the current Firebase implementation and provides step-by-step instructions to fix them.

---

## Issue C8: Firebase Credentials Exposed in .env File

### Current Problem
Firebase API keys and configuration are stored in plaintext in `.env` file, which could be:
- Committed to version control
- Exposed if repository becomes public
- Leaked through build artifacts

### Solution: Use EAS Secrets

1. **Install EAS CLI** (if not already installed):
   ```bash
   npm install -g eas-cli
   eas login
   ```

2. **Set environment secrets** in EAS:
   ```bash
   eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_API_KEY --value "your-api-key"
   eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN --value "your-auth-domain"
   eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_DATABASE_URL --value "your-database-url"
   eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_PROJECT_ID --value "your-project-id"
   eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET --value "your-storage-bucket"
   eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID --value "your-sender-id"
   eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_APP_ID --value "your-app-id"
   eas secret:create --scope project --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY --value "your-maps-key"
   ```

3. **Update .gitignore** to prevent .env from being committed:
   ```
   # Add to .gitignore
   .env
   .env.local
   .env.*.local
   ```

4. **If .env was already committed**, rotate ALL API keys:
   - Go to Firebase Console → Project Settings → General
   - Delete old API keys
   - Generate new ones
   - Update EAS secrets with new values

---

## Issue C9 & C10: No Firebase Security Rules or Authentication

### Current Problem
- Firebase Realtime Database has no security rules (or default rules allowing all access)
- No authentication implemented, anyone can read/write database

### Solution: Implement Firebase Security Rules

1. **Create `firebase.rules.json`** in project root:

```json
{
  "rules": {
    ".read": false,
    ".write": false,

    "locations": {
      "$shareCode": {
        ".read": "auth != null",
        ".write": "auth != null",
        ".validate": "newData.hasChildren(['encryptedData', 'timestamp', 'active', 'updateInterval', 'lastUpdate'])",

        "encryptedData": {
          ".validate": "newData.isString() && newData.val().length > 0"
        },
        "timestamp": {
          ".validate": "newData.isNumber() && newData.val() >= 0"
        },
        "active": {
          ".validate": "newData.isBoolean()"
        },
        "updateInterval": {
          ".validate": "newData.isNumber() && newData.val() >= 30 && newData.val() <= 3600"
        },
        "lastUpdate": {
          ".validate": "newData.isNumber()"
        }
      }
    },

    "journeys": {
      "$journeyId": {
        ".read": "auth != null && (
          root.child('journeys/' + $journeyId + '/participants/' + auth.uid).exists() ||
          root.child('journeys/' + $journeyId + '/creator').val() === auth.uid
        )",
        ".write": "auth != null && root.child('journeys/' + $journeyId + '/creator').val() === auth.uid",

        "creator": {
          ".validate": "newData.val() === auth.uid"
        },
        "participants": {
          "$participantId": {
            ".validate": "newData.isBoolean()"
          }
        },
        "events": {
          "$eventId": {
            ".validate": "newData.hasChildren(['geofenceId', 'eventType', 'timestamp', 'location'])",
            "eventType": {
              ".validate": "newData.val() === 'arrival' || newData.val() === 'departure'"
            }
          }
        }
      }
    },

    "users": {
      "$userId": {
        ".read": "auth != null && auth.uid === $userId",
        ".write": "auth != null && auth.uid === $userId",

        "expoPushToken": {
          ".validate": "newData.isString()"
        },
        "lastUpdated": {
          ".validate": "newData.isNumber()"
        }
      }
    }
  }
}
```

2. **Deploy Security Rules**:
   ```bash
   # Using Firebase CLI
   npm install -g firebase-tools
   firebase login
   firebase deploy --only database
   ```

   OR manually in Firebase Console:
   - Go to Realtime Database
   - Click "Rules" tab
   - Paste the rules
   - Click "Publish"

---

## Implement Firebase Authentication

### Why Authentication is Critical
Without authentication, anyone who discovers a share code can:
- Read location data
- Write fake location data
- Spam the database
- DOS attack the service

### Implementation Steps

1. **Enable Firebase Authentication**:
   - Go to Firebase Console → Authentication
   - Click "Get Started"
   - Enable "Anonymous" authentication (easiest for current setup)
   - Optionally enable "Email/Password" for future

2. **Update `services/firebase.js`**:

```javascript
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth, signInAnonymously } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

// Auto sign-in anonymously
signInAnonymously(auth).catch((error) => {
  console.error('Firebase auth error:', error);
});

export { app, database, auth };
```

3. **Add Auth State Listener** in App.js:

```javascript
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './services/firebase';

useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log('Firebase authenticated:', user.uid);
    } else {
      // Sign in anonymously if not authenticated
      signInAnonymously(auth);
    }
  });

  return unsubscribe;
}, []);
```

---

## Additional Security Enhancements

### 1. Enable App Check (Prevents Unauthorized API Access)

1. **In Firebase Console**:
   - Go to App Check
   - Click "Get Started"
   - Register your app
   - For iOS: Use App Attest
   - For Android: Use Play Integrity

2. **Install App Check**:
   ```bash
   npx expo install expo-app-check
   ```

3. **Configure in app.config.js**:
   ```javascript
   plugins: [
     [
       'expo-app-check',
       {
         provider: 'deviceCheck' // iOS
       }
     ]
   ]
   ```

### 2. Implement Rate Limiting

Add to security rules:
```json
{
  "rules": {
    "locations": {
      "$shareCode": {
        ".write": "auth != null &&
          !root.child('rate_limit/' + auth.uid).exists() ||
          now - root.child('rate_limit/' + auth.uid).val() > 1000"
      }
    },
    "rate_limit": {
      "$userId": {
        ".write": "auth.uid === $userId",
        ".validate": "newData.val() === now"
      }
    }
  }
}
```

### 3. Set Up Data Retention

Create Cloud Function to auto-delete old data:
```javascript
// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');

exports.cleanupOldSessions = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const db = admin.database();
    const now = Date.now();
    const fortyEightHours = 48 * 60 * 60 * 1000;

    const locationsRef = db.ref('locations');
    const snapshot = await locationsRef.once('value');

    const toDelete = [];
    snapshot.forEach((child) => {
      const data = child.val();
      if (!data.active && (now - data.lastUpdate > fortyEightHours)) {
        toDelete.push(child.ref.remove());
      }
    });

    await Promise.all(toDelete);
    console.log(`Deleted ${toDelete.length} old sessions`);
  });
```

---

## Security Checklist

Before deploying to production, ensure:

- [ ] All Firebase credentials moved to EAS Secrets
- [ ] .env file added to .gitignore
- [ ] If .env was committed, all API keys rotated
- [ ] Firebase Security Rules deployed
- [ ] Firebase Authentication enabled (at minimum Anonymous)
- [ ] App Check configured
- [ ] Rate limiting implemented
- [ ] Data retention/cleanup scheduled
- [ ] SSL/TLS used for all connections (Firebase handles this)
- [ ] Regular security audits scheduled

---

## Monitoring & Alerts

Set up Firebase monitoring:

1. **Usage Monitoring**:
   - Firebase Console → Usage & Billing
   - Set alerts for unusual activity

2. **Security Alerts**:
   - Enable Cloud Logging
   - Set up alerts for:
     - Failed authentication attempts
     - Unusual data access patterns
     - High write volume

3. **Error Tracking**:
   - Integrate Sentry or similar
   - Monitor Firebase connection errors

---

## Emergency Response Plan

If credentials are compromised:

1. **Immediately**:
   - Rotate all Firebase API keys
   - Change Firebase Security Rules to deny all access temporarily
   - Review audit logs

2. **Within 24 hours**:
   - Investigate extent of breach
   - Notify users if personal data accessed
   - Update all EAS secrets

3. **Long term**:
   - Review and strengthen security rules
   - Implement additional monitoring
   - Consider adding multi-factor authentication

---

## Contact

For security concerns, contact:
- Firebase Support: https://firebase.google.com/support/contact
- Expo Security: security@expo.dev

Last Updated: 2025-11-19
