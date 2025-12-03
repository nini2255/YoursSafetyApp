# YoursApp - Comprehensive UML & System Design Documentation

## 1. System Context Diagram

```
                            ┌──────────────────────┐
                            │   External Users     │
                            │  - Safety Seekers    │
                            │  - Friends/Contacts  │
                            │  - Emergency Services│
                            └──────────┬───────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                  │
                    ▼                  ▼                  ▼
            ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
            │ YoursApp     │   │   Firebase   │   │  Expo        │
            │  Mobile      │◄─►│  Realtime DB │   │  Notifications
            │  Application │   │   & Auth     │   │  & Location  │
            └──────────────┘   └──────────────┘   └──────────────┘
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
    ┌────────┐ ┌────────┐ ┌──────────┐
    │Device  │ │Contact │ │Location  │
    │Storage │ │API     │ │Services  │
    │AsyncSt │ │(Expo)  │ │(Expo)    │
    └────────┘ └────────┘ └──────────┘
```

**System Boundaries:**
- **YoursApp**: Mobile safety & wellness application
- **External Systems**: Firebase (backend), Expo services (push, location), Device APIs
- **Users**: App users, emergency contacts, and system integrations
- **Data Flow**: Bidirectional communication with Firebase, one-way device API access

---

## 2. UML Class Diagram - Principal System Objects

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                            App.js                                   │
│                         (Entry Point)                               │
└────────────────────────────┬────────────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
    ┌─────────┐         ┌─────────┐       ┌─────────┐
    │  Auth   │         │ Journal │       │Emergency│
    │Context  │         │Context  │       │Contacts │
    │Provider │         │Provider │       │Provider │
    └────┬────┘         └────┬────┘       └────┬────┘
         │                   │                   │
         └───────────────────┼───────────────────┘
                             │
                    ┌────────▼────────┐
                    │   AppContent    │
                    │   (Navigation)  │
                    └────────┬────────┘
```

## Context Providers (State Management)

```
┌────────────────────────┐
│   AuthContext          │
├────────────────────────┤
│ Properties:            │
│ - user                 │
│ - isLoggedIn           │
│ - isLoading            │
│                        │
│ Methods:               │
│ - signup()             │
│ - login()              │
│ - logout()             │
│ - migrateOldData()     │
└────────────────────────┘

┌────────────────────────┐
│   JournalContext       │
├────────────────────────┤
│ Properties:            │
│ - entries[]            │
│ - isLoading            │
│                        │
│ Methods:               │
│ - addEntry()           │
│ - updateEntry()        │
│ - deleteEntry()        │
│ - loadEntries()        │
│ - saveEntries()        │
└────────────────────────┘

┌──────────────────────────────┐
│ EmergencyContactsContext     │
├──────────────────────────────┤
│ Properties:                  │
│ - contacts[]                 │
│ - isLoading                  │
│                              │
│ Methods:                     │
│ - addContact()               │
│ - deleteContact()            │
│ - updateContact()            │
│ - loadContacts()             │
└──────────────────────────────┘

┌────────────────────────┐
│   AutofillContext      │
├────────────────────────┤
│ Properties:            │
│ - people[]             │
│ - locations[]          │
│                        │
│ Methods:               │
│ - addPerson()          │
│ - addLocation()        │
│ - deletePerson()       │
│ - deleteLocation()     │
└────────────────────────┘
```

## Screen Components

```
┌──────────────────────────────────────────────────────────────┐
│                     Navigation Stack                         │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Authentication Screens:                                     │
│  ├─ LoginScreen                                              │
│  └─ SignupScreen                                             │
│                                                              │
│  Main Application Screens:                                   │
│  ├─ HomePage                 (Main entry screen)             │
│  ├─ SecondaryHomeScreen                                      │
│  ├─ JournalPage              (View/Create journal entries)   │
│  ├─ PanicPage                (Emergency panic button)        │
│  ├─ TimerPage                (Timer functionality)           │
│  ├─ SettingsPage             (App settings)                  │
│  ├─ ContactsPage             (Emergency contacts)            │
│  ├─ FakeCallScreen           (Fake call feature)             │
│  ├─ FakeCallSettingsPage     (Configure fake calls)          │
│  ├─ DiscreetModeSettingsPage (Discreet mode config)          │
│  ├─ SudokuScreen             (Sudoku puzzle)                 │
│  ├─ BackupAndRestorePage     (Data backup/restore)           │
│  ├─ UserProfileSettingsPage  (User profile)                  │
│  ├─ GeofenceManagementPage   (Manage geofences)              │
│  └─ CreateGeofencePage       (Create new geofence)           │
│                                                              │
│  Journey Sharing Screens:                                    │
│  ├─ JourneySharingPageV2     (Share journey with contacts)   │
│  ├─ TrackAFriendPage         (Track friend's location)       │
│  ├─ TrackingDetailPage       (Detailed tracking info)        │
│  └─ LocationHistoryPage      (View location history)         │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## Service Layer

```
┌─────────────────────────────────────┐
│    Firebase Service                 │
├─────────────────────────────────────┤
│ Properties:                         │
│ - app (Firebase app instance)       │
│ - database (Realtime Database)      │
│                                     │
│ Usage:                              │
│ - User data persistence             │
│ - Journey sharing data              │
│ - Real-time location updates        │
└─────────────────────────────────────┘

┌──────────────────────────────────────────┐
│    Geofencing Service                    │
├──────────────────────────────────────────┤
│ Components:                              │
│ - geofenceStorage.js                     │
│ - geofencingService.js                   │
│ - geofenceStorage_impl.js                │
│                                          │
│ Functionality:                           │
│ - Create/manage geofences                │
│ - Monitor geofence entry/exit            │
│ - Store geofence data locally            │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│    Background Location Service           │
├──────────────────────────────────────────┤
│ Components:                              │
│ - backgroundLocationService.js           │
│ - backgroundLocationService_impl.js      │
│                                          │
│ Functionality:                           │
│ - Track location in background           │
│ - Periodic location updates              │
│ - Location history management            │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│    Notification Service                  │
├──────────────────────────────────────────┤
│ - NotificationActionService              │
│ - expoPushService.js                     │
│                                          │
│ Functionality:                           │
│ - Send push notifications                │
│ - Handle notification actions            │
│ - Register safety notification actions   │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│    Journey Sharing Service               │
├──────────────────────────────────────────┤
│ Components:                              │
│ - encryption.js & encryption_impl.js     │
│ - storage.js & storage_impl.js           │
│ - validation.js & validation_impl.js     │
│                                          │
│ Functionality:                           │
│ - Encrypt shared journey data            │
│ - Store sharing sessions                 │
│ - Validate shared data                   │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│    Location History Service              │
├──────────────────────────────────────────┤
│ Components:                              │
│ - locationHistoryStorage.js              │
│ - locationHistoryStorage_impl.js         │
│ - locationHistoryTracker.js              │
│ - locationHistoryTracker_impl.js         │
│                                          │
│ Functionality:                           │
│ - Store location history                 │
│ - Track location over time               │
│ - Retrieve historical data               │
└──────────────────────────────────────────┘
```

## Component Architecture

```
┌──────────────────────────────┐
│    UI Components             │
├──────────────────────────────┤
│ - AppHeader                  │
│ - SideMenu                   │
│ - Icons (Icon collection)    │
│ - PageHeader                 │
│                              │
│ Modal Components:            │
│ - ContactFormModal           │
│ - ContactImportModal         │
│ - JournalTemplateModal       │
│                              │
│ Form Components:             │
│ - IncidentReportForm         │
│ - JournalEntryForm           │
│ - MoodSelection              │
│                              │
│ Journey Sharing:             │
│ - JourneySharingPageV2       │
│ - TrackAFriendPage           │
│ - TrackingDetailPage         │
│ - LocationHistoryPage        │
└──────────────────────────────┘
```

## Data Storage Architecture

```
┌─────────────────────────────────────────┐
│       AsyncStorage (Local)              │
├─────────────────────────────────────────┤
│ User-Specific Keys:                     │
│ - @{email}_journal_entries              │
│ - @{email}_emergency_contacts           │
│ - @{email}_autofill_people              │
│ - @{email}_autofill_locations           │
│ - @{email}_fake_call_caller_name        │
│ - @{email}_fake_call_settings           │
│ - @{email}_discreet_mode_enabled        │
│ - @{email}_sudoku_screen_enabled        │
│ - @{email}_bypass_code                  │
│ - @{email}_two_finger_trigger_enabled   │
│                                         │
│ Application Keys:                       │
│ - @current_user_email                   │
│ - Geofence data                         │
│ - Location history                      │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│    Firebase Realtime Database           │
├─────────────────────────────────────────┤
│ - Journey sharing sessions              │
│ - Real-time location updates            │
│ - User credentials (encrypted)          │
│ - Shared location data                  │
└─────────────────────────────────────────┘
```

## Key Application Features

```
┌─────────────────────────────────────────────────┐
│            Security Features                    │
├─────────────────────────────────────────────────┤
│ ✓ Discreet Mode                                 │
│ ✓ Fake Call System                              │
│ ✓ Sudoku Screen (disguise)                      │
│ ✓ Two-Finger Trigger                            │
│ ✓ Volume Hold Detection                         │
│ ✓ Panic Mode                                    │
│ ✓ Emergency Contact System                      │
│ ✓ Bypass Code                                   │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│           Location Features                     │
├─────────────────────────────────────────────────┤
│ ✓ Background Location Tracking                  │
│ ✓ Geofence Management                           │
│ ✓ Location History                              │
│ ✓ Journey Sharing (encrypted)                   │
│ ✓ Friend Tracking                               │
│ ✓ Real-time Location Updates                    │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│         Journal Features                        │
├─────────────────────────────────────────────────┤
│ ✓ Create/Edit/Delete Entries                    │
│ ✓ Journal Templates                             │
│ ✓ Mood Tracking                                 │
│ ✓ Date-based Organization                       │
│ ✓ User-specific Storage                         │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│         Utility Features                        │
├─────────────────────────────────────────────────┤
│ ✓ Timer                                         │
│ ✓ Backup & Restore                              │
│ ✓ Contact Management                            │
│ ✓ Push Notifications                            │
│ ✓ Autofill Suggestions                          │
└─────────────────────────────────────────────────┘
```

## Data Flow Example: User Authentication

```
LoginScreen/SignupScreen
        │
        ▼
  AuthContext
    (login/signup)
        │
        ├──→ Firebase Auth
        │
        └──→ AsyncStorage
            (store credentials)
        │
        ▼
   AppContent
   (renders based on isLoggedIn state)
        │
        ├──→ MainAppScreens (if logged in)
        └──→ AuthScreens (if not logged in)
```

## Data Flow Example: Journal Entry Creation

```
JournalEntryForm
        │
        ▼
    User Input
        │
        ▼
  JournalContext.addEntry()
        │
        ▼
  AsyncStorage.setItem()
  (@{email}_journal_entries)
        │
        ▼
  JournalContext State Updated
        │
        ▼
  JournalPage Re-renders
  (displays new entry)
```

## Data Flow Example: Journey Sharing

```
JourneySharingPageV2
        │
        ├──→ encryption.encrypt()
        │
        ├──→ journeySharing/storage.save()
        │
        ├──→ Firebase DB (real-time)
        │
        └──→ TrackAFriendPage (other user)
            │
            ├──→ encryption.decrypt()
            │
            ├──→ locationHistoryTracker
            │
            └──→ TrackingDetailPage
                (display tracked location)
```

## Platform Stack

```
┌─────────────────────────┐
│    React Native         │ (Framework)
├─────────────────────────┤
│  @react-navigation      │ (Navigation)
│  expo                   │ (Development platform)
│  firebase               │ (Backend)
│  expo-notifications     │ (Push notifications)
│  expo-location          │ (Location services)
│  expo-contacts          │ (Contact management)
│  react-native-maps      │ (Mapping)
│  AsyncStorage           │ (Local storage)
│  crypto-js              │ (Encryption)
└─────────────────────────┘
```

---

## 3. Subsystem Models

### 3.1 Authentication & User Management Subsystem

```
┌────────────────────────────────────────────────────────────┐
│      Authentication & User Management Subsystem            │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────────┐         ┌──────────────┐               │
│  │ LoginScreen  │────────►│  AuthContext │               │
│  └──────────────┘         │              │               │
│                           │  - signup()  │               │
│  ┌──────────────┐         │  - login()   │◄──────────┐  │
│  │SignupScreen  │────────►│  - logout()  │           │  │
│  └──────────────┘         │  - migrate() │           │  │
│                           └──────┬───────┘           │  │
│                                  │                   │  │
│                                  ▼                   │  │
│                         ┌──────────────────┐         │  │
│                         │  Firebase Auth   │         │  │
│                         │  (Email/Password)│         │  │
│                         └──────┬───────────┘         │  │
│                                │                     │  │
│                 ┌──────────────┴─────────────────┐   │  │
│                 ▼                                ▼   │  │
│         ┌───────────────┐          ┌───────────────┐ │  │
│         │ AsyncStorage  │          │ Firebase DB   │ │  │
│         │(User Prefs)   │          │(Credentials)  │ │  │
│         └───────────────┘          └───────────────┘ │  │
│                                                      │  │
│         ┌─────────────────────────────────────────┐ │  │
│         │ Data Migration Service                  │ │  │
│         │ - Migrate user data on new login        │ │  │
│         │ - Separate per-user storage keys        │ │  │
│         └─────────────────────────────────────────┘ │  │
│                                                      │  │
└──────────────────────────────────────────────────────┘  │
  └──────────────────────────────────────────────────────┘
```

### 3.2 Location Services Subsystem

```
┌────────────────────────────────────────────────────────────┐
│              Location Services Subsystem                   │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────────────────────────────────────────────┐    │
│  │   Background Location Service                    │    │
│  │   - Continuous location tracking                 │    │
│  │   - Runs in background                           │    │
│  └──────────────┬───────────────────────────────────┘    │
│                 │                                         │
│    ┌────────────┼────────────┬───────────────┐           │
│    │            │            │               │           │
│    ▼            ▼            ▼               ▼           │
│ ┌────────┐ ┌────────────┐ ┌────────────┐ ┌──────────┐  │
│ │Location│ │Geofence    │ │Journey     │ │Location  │  │
│ │History │ │Monitoring  │ │Sharing     │ │History   │  │
│ │Tracker │ │Service     │ │Encryption  │ │Storage   │  │
│ └────┬───┘ └────┬───────┘ └────┬───────┘ └────┬─────┘  │
│      │          │              │              │         │
│      └──────────┼──────────────┼──────────────┘         │
│                 │              │                        │
│                 ▼              ▼                        │
│         ┌──────────────────────────────┐               │
│         │  AsyncStorage (Local Cache)   │               │
│         │  - Geofence definitions       │               │
│         │  - Location history           │               │
│         │  - Sharing sessions           │               │
│         └──────────────┬────────────────┘               │
│                        │                                │
│                        ▼                                │
│         ┌──────────────────────────────┐               │
│         │   Firebase Realtime DB        │               │
│         │   - Live location updates     │               │
│         │   - Journey data (encrypted)  │               │
│         └──────────────────────────────┘               │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### 3.3 Safety Features Subsystem

```
┌────────────────────────────────────────────────────────────┐
│              Safety Features Subsystem                     │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────────────────────────────────────────────┐    │
│  │   Panic Mode (Emergency Alert)                   │    │
│  │   - Instant alert to emergency contacts          │    │
│  │   - Automatic location sharing                   │    │
│  │   - Push notifications                           │    │
│  └──────────────┬──────────────────────────────────┘    │
│                 │                                        │
│  ┌──────────────────────────────────────────────────┐    │
│  │   Discreet Mode (Disguise)                       │    │
│  │   - Sudoku screen as decoy                       │    │
│  │   - Two-finger trigger                           │    │
│  │   - Fake call system                             │    │
│  └──────────────┬──────────────────────────────────┘    │
│                 │                                        │
│  ┌──────────────────────────────────────────────────┐    │
│  │   Access Control                                 │    │
│  │   - Bypass code                                  │    │
│  │   - Volume hold detection                        │    │
│  │   - Screen hold detection                        │    │
│  └──────────────┬──────────────────────────────────┘    │
│                 │                                        │
│                 ▼                                        │
│    ┌────────────────────────────────────┐               │
│    │  Notification Service              │               │
│    │  - Send alerts                     │               │
│    │  - Handle notification actions     │               │
│    │  - Emergency contact notification  │               │
│    └────────────────────────────────────┘               │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### 3.4 Data Management Subsystem

```
┌────────────────────────────────────────────────────────────┐
│            Data Management Subsystem                       │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────────────────────────────────────────────┐    │
│  │   Context Providers (State Management)           │    │
│  │                                                  │    │
│  │  ├─ AuthContext                                  │    │
│  │  ├─ JournalContext                               │    │
│  │  ├─ EmergencyContactsContext                     │    │
│  │  └─ AutofillContext                              │    │
│  └──────────────┬──────────────────────────────────┘    │
│                 │                                        │
│                 ▼                                        │
│  ┌──────────────────────────────────────────────────┐    │
│  │   Local Storage Layer (AsyncStorage)             │    │
│  │                                                  │    │
│  │  User-specific storage keys:                     │    │
│  │  @{email}_journal_entries                        │    │
│  │  @{email}_emergency_contacts                     │    │
│  │  @{email}_autofill_people                        │    │
│  │  @{email}_autofill_locations                     │    │
│  │  @{email}_*_settings                             │    │
│  └──────────────┬──────────────────────────────────┘    │
│                 │                                        │
│                 ▼                                        │
│  ┌──────────────────────────────────────────────────┐    │
│  │   Firebase Backend                               │    │
│  │                                                  │    │
│  │  ├─ Real-time Database                           │    │
│  │  ├─ Authentication                               │    │
│  │  ├─ Cloud Storage (backup/restore)               │    │
│  │  └─ Cloud Functions (optional future)            │    │
│  └──────────────────────────────────────────────────┘    │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 4. State Machine Models

### 4.1 User Authentication State Machine

```
                    ┌─────────────────┐
                    │    NOT_LOGGED_IN │◄─────────────┐
                    └────────┬─────────┘              │
                             │                        │
                    ┌────────▼──────────┐      ┌──────┴──────┐
                    │ User enters email │      │ logout() or │
                    │ and password       │      │ session exp │
                    └────────┬──────────┘      └─────────────┘
                             │
                    ┌────────▼──────────────┐
                    │ AUTHENTICATING_USER   │
                    │ (validating with FB)  │
                    └────────┬──────────────┘
                             │
                    ┌────────▴──────────────┐
                    │                       │
         ┌──────────▼──────────┐  ┌────────▼──────────────┐
         │ AUTH_FAILED         │  │ AUTH_SUCCESS          │
         │ (invalid creds)     │  │ - Load user data      │
         └──────┬──────────────┘  │ - Migrate old data    │
                │                 │ - Set user context    │
                └─────────┬────────┴─────────┬────────────┘
                          │                  │
                 ┌────────▼────────┐  ┌──────▼────────────┐
                 │ NOT_LOGGED_IN   │  │ LOGGED_IN         │
                 │ (error message) │  │ (access granted)  │
                 └─────────────────┘  └───────────────────┘
```

### 4.2 Safety Mode State Machine

```
┌──────────────────┐
│  NORMAL_MODE     │
│  - Regular UI    │
│  - Full access   │
└────────┬─────────┘
         │
         │ Two-finger trigger / Panic button
         │
         ▼
┌──────────────────────┐
│  EMERGENCY_MODE      │
│  - Alert contacts    │◄──────────────┐
│  - Share location    │               │
│  - Sound/vibration   │               │
└────────┬─────────────┘               │
         │                             │
         │ User cancels or timeout    │
         │                             │
         └────────────────────────────┘


Alternative: DISCREET_MODE

┌──────────────────┐
│  NORMAL_MODE     │
└────────┬─────────┘
         │
         │ Two-finger press (held) / Volume button
         │
         ▼
┌──────────────────────┐
│  DISCREET_MODE       │
│  - Show Sudoku       │
│  - Lock regular app  │
│  - Background loc    │
└────────┬─────────────┘
         │
         │ Enter bypass code / Timeout
         │
         ▼
┌──────────────────┐
│  NORMAL_MODE     │
└──────────────────┘
```

### 4.3 Location Tracking State Machine

```
┌──────────────────────┐
│  TRACKING_IDLE       │
│  - App in foreground │
└────────┬─────────────┘
         │
         │ App enters background
         │
         ▼
┌──────────────────────────────────┐
│  BACKGROUND_TRACKING             │
│  - Location updates: every 1km    │
│  - or time interval: 5 min        │
└────────┬─────────────────────────┘
         │
         │ Journey sharing enabled
         │
         ▼
┌──────────────────────────────────┐
│  SHARING_ACTIVE                  │
│  - Real-time location updates     │
│  - Encrypted data to Firebase     │
│  - Notify friend's device         │
└────────┬─────────────────────────┘
         │
         │ Geofence triggered
         │
         ▼
┌──────────────────────────────────┐
│  GEOFENCE_ALERT                  │
│  - Send notification              │
│  - Log event                      │
│  - Execute action (if set)        │
└────────┬─────────────────────────┘
         │
         │ Resume tracking
         │
         ▼
┌──────────────────────────────────┐
│  BACKGROUND_TRACKING             │
└──────────────────────────────────┘
```

---

## 5. Sequence Diagrams

### 5.1 User Login Sequence

```
User         LoginScreen      AuthContext      Firebase         AsyncStorage
 │                │                │              │                  │
 │─ Enter Creds──►│                │              │                  │
 │                │─ login(email)─►│              │                  │
 │                │                │─ Auth Req───►│                  │
 │                │                │◄─ Response──│                  │
 │                │                │              │                  │
 │                │ ◄─ Login OK ────│              │                  │
 │                │                │              │                  │
 │                │─ Load User Data│──────────────────────────────────►│
 │                │                │◄─ All Keys ─────────────────────│
 │                │                │              │                  │
 │                │─ Migrate Data──│              │                  │
 │                │   (if needed)   │              │                  │
 │                │                │              │                  │
 │                │─ Set User in───│              │                  │
 │                │   AuthContext   │              │                  │
 │                │◄─ Ready ────────│              │                  │
 │◄─ Navigate──to │                │              │                  │
 │   Home Screen  │                │              │                  │
 │                │                │              │                  │
```

### 5.2 Journal Entry Creation Sequence

```
User         JournalForm      JournalContext     AsyncStorage      Firebase
 │                │                │                 │                │
 │─ Fill Form───►│                │                 │                │
 │─ Submit ──────►│                │                 │                │
 │                │─ addEntry()───►│                 │                │
 │                │                │                 │                │
 │                │                │─ Generate ID────│                │
 │                │                │─ Set Date ──────│                │
 │                │                │─ Sort Entries──│                │
 │                │                │                 │                │
 │                │                │─ Save to Async─►│                │
 │                │                │   (@{email}_    │                │
 │                │                │    journal)     │                │
 │                │                │◄─ Saved ───────│                │
 │                │                │                 │                │
 │                │◄─ Entry Saved──│                 │                │
 │                │                │                 │                │
 │                │─ Update State──│                 │                │
 │◄─ Refresh UI──│                │                 │                │
 │   (show entry) │                │                 │                │
 │                │                │                 │                │
 │  (Optional)    │                │                 │                │
 │─ Share Entry──►│─ Sync to FB───────────────────────────────────────►│
 │                │                │                 │                │
```

### 5.3 Journey Sharing Sequence

```
Sharer       JourneySharingUI  Encryption    Firebase    LocationTracker    Friend
  │                │                │            │              │              │
  │─ Enable Sharing►│                │            │              │              │
  │                │─ Start Tracking────────────────────────────►│              │
  │                │                │            │              │              │
  │                │  ◄─ Location ──┼────────────┼──────────────│              │
  │                │                │            │              │              │
  │                │─ Encrypt Data─►│            │              │              │
  │                │                │─ Send to──►│              │              │
  │                │                │   Firebase │              │              │
  │                │                │            │              │              │
  │                │                │            │─ Notify────────────────────►│
  │                │                │            │  Share Code  │              │
  │                │                │            │              │              │
  │                │ ◄─ Sharing Code────────────◄───────────────────────────  │
  │◄─ Share Code───│                │            │              │              │
  │                │                │            │              │              │
  │  (User shares  │                │            │              │              │
  │   code via SMS)                  │            │              │              │
  │                                  │            │              │              │
  │                                  │            │              │  User Enters │
  │                                  │            │              │  Share Code  │
  │                                  │            │              ◄──────────────│
  │                                  │            │              │              │
  │                                  │            │  ◄─Validate ─┼──────────────│
  │                                  │            │   & Send Loc │              │
  │                                  │            │              │              │
  │                                  │            │◄─ Decrypt ───│──────────────│
  │                                  │            │              │              │
  │                                  │            │─ Location───────────────────►│
  │                                  │            │  (encrypted)  │              │
  │                                  │            │              │              │
  │                                  │            │ (Repeating   │              │
  │                                  │            │  for duration) │             │
  │                                  │            │              │              │
```

### 5.4 Emergency Alert Sequence

```
User            HomePage      PanicMode    Notification    Firebase       Contacts
 │                 │              │            │              │              │
 │─ Press Panic──►│              │            │              │              │
 │   Button       │              │            │              │              │
 │                │─ Trigger───►│            │              │              │
 │                │   Emergency │            │              │              │
 │                │              │            │              │              │
 │                │   ┌─────────►│            │              │              │
 │                │   │ Sound    │            │              │              │
 │                │   │ Vibration│            │              │              │
 │                │   │ Status   │            │              │              │
 │                │   └─────────┘            │              │              │
 │                │              │            │              │              │
 │                │              ├─ Get Contacts             │              │
 │                │              │  & Location               │              │
 │                │              │            │              │              │
 │                │              │─ Send Alert─────────────►│              │
 │                │              │   (location, time)        │              │
 │                │              │            │              │              │
 │                │              │            │─ Encrypt ──│              │
 │                │              │            │   & Store  │              │
 │                │              │            │            │              │
 │                │              │            │─ Notify ─────────────────►│
 │                │              │            │   Contact App            │
 │                │              │            │            │              │
 │                │              │            │            │  Push Alert  │
 │                │              │            │            │              │
 │                │              │            │            │              │
 │  (User cancels)│              │            │              │              │
 │─ Cancel Alert─►│              │            │              │              │
 │                │─ Stop ──────►│            │              │              │
 │                │              │            │              │              │
```

---

## 6. Observer Design Pattern Implementation

### 6.1 Observer Pattern Architecture

```
┌────────────────────────────────────────────────────────────┐
│     Observer Design Pattern in YoursApp                    │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────────────────────────────────────────────┐    │
│  │          Subject (Observable State)              │    │
│  │                                                  │    │
│  │  Context Providers act as Subjects:             │    │
│  │  - AuthContext                                   │    │
│  │  - JournalContext                                │    │
│  │  - EmergencyContactsContext                      │    │
│  │  - AutofillContext                               │    │
│  └────────┬───────────────────────────────────────┘    │
│           │ (Notifies subscribers on state change)      │
│           │                                             │
│  ┌────────┴──────────────────────────────────────────┐  │
│  │                                                    │  │
│  ▼         ▼         ▼         ▼         ▼            │  │
│ Observer Observer Observer Observer Observer        │  │
│  (Comp)  (Screen)  (Service) (Hook)   (UI)          │  │
│  │         │         │         │        │            │  │
│  │         │         │         │        │            │  │
│  ▼         ▼         ▼         ▼        ▼            │  │
│ HomePage LoginScreen AppHeader useJournal JournalPage│  │
│         TrackingDetailPage                           │  │
│         (etc.)                                        │  │
│                                                    │  │
└────────────────────────────────────────────────────────┘
```

### 6.2 Detailed Observer Pattern Explanation

**Subject (Observable)**: Context Providers
- **AuthContext** (AuthProvider)
  ```javascript
  State:
    - user: User object
    - isLoggedIn: boolean
    - isLoading: boolean
  
  Notifies observers when:
    - User successfully logs in
    - User logs out
    - Session expires
    - Data migration completes
  ```

**Observers**: React Components using Context Hooks
- Components that call `useAuth()`, `useJournal()`, etc.
- When context state changes, all observing components re-render

**Update Mechanism**: React Context API + Hooks
```javascript
// How the pattern works:

// 1. Define Observable (Subject)
const AuthContext = createContext();

// 2. Create Provider (Observable Factory)
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // When state changes, all subscribers are notified
  return (
    <AuthContext.Provider value={{ user, isLoggedIn }}>
      {children}
    </AuthContext.Provider>
  );
};

// 3. Create Hook (Observer Interface)
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be within AuthProvider');
  return context;
};

// 4. Subscribe (Observe)
function HomePage() {
  const { user, isLoggedIn } = useAuth(); // Subscribe to AuthContext
  // HomePage automatically re-renders when user or isLoggedIn changes
  return <View>{isLoggedIn ? <Dashboard /> : <LoginPrompt />}</View>;
}
```

### 6.3 Multi-Observer Example: User Authentication Flow

```
Login Scenario: User logs in → Multiple observers notified

1. User clicks login
2. AuthContext.login() called
3. Firebase authenticates
4. AuthContext updates state:
   - user = { email, uid, ... }
   - isLoggedIn = true
   - isLoading = false

5. All observers notified:
   
   Observer 1: AppContent Screen
   ├─ Re-renders
   └─ Routes to main app (HomePage)
   
   Observer 2: HomePage Component
   ├─ Re-renders
   ├─ Now has access to user data
   └─ Shows personalized content
   
   Observer 3: JournalContext (embedded observer)
   ├─ Listens to AuthContext
   ├─ Sets storage key = @{email}_journal_entries
   └─ Loads user-specific journal entries
   
   Observer 4: EmergencyContactsContext
   ├─ Listens to AuthContext
   ├─ Sets storage key = @{email}_emergency_contacts
   └─ Loads user's emergency contacts
   
   Observer 5: AppHeader Component
   ├─ Re-renders
   ├─ Displays user email/name
   └─ Shows logout button
   
   Observer 6: Background Location Service
   ├─ Checks user is logged in
   ├─ Starts monitoring geofences
   └─ Begins location tracking
```

### 6.4 Location Update Observer Pattern

```
Real-Time Location Updates (Journey Sharing):

Subject: backgroundLocationService
Observers: 
  - locationHistoryTracker (store location)
  - JourneySharingPageV2 (display on map)
  - Firebase sync service (upload to DB)
  - Geofence checker (test boundaries)

Update Flow:
1. Device triggers location update (every 1km or 5 min)
2. backgroundLocationService notifies all observers
3. Each observer handles the update:
   
   locationHistoryTracker:
   └─ Stores in AsyncStorage + Firebase
   
   JourneySharingPageV2:
   └─ Updates map marker in real-time
   
   Firebase sync:
   └─ Encrypts & sends to database
   
   Geofence checker:
   └─ Tests if location crosses geofence boundaries
      └─ If crossed, notifies Emergency system
```

### 6.5 Benefits of Observer Pattern in YoursApp

```
✓ Loose Coupling
  - Components don't depend on each other
  - Only depend on context interface
  - Easy to add/remove observers

✓ Centralized State Management
  - Single source of truth
  - Predictable state updates
  - Easier debugging

✓ Automatic Synchronization
  - All observers updated simultaneously
  - No manual state passing
  - UI stays in sync with app state

✓ Scalability
  - Adding new observers doesn't affect existing ones
  - Components can observe multiple subjects
  - Easy to test in isolation

✓ Reactive Programming
  - Components react to state changes
  - No polling needed
  - Real-time updates automatically handled
```

---

## 7. Component Reuse & Design for Reusability

### 7.1 Current Reuse Strategies

#### A. Context-Based State Reuse

```
AuthContext
├─ Used by: LoginScreen, HomePage, SettingsPage, 
│            AppContent, JournalContext, 
│            EmergencyContactsContext, 
│            BackgroundLocationService
└─ Provides: User authentication state globally

JournalContext
├─ Used by: JournalPage, HomePage, 
│            (any feature needing journal access)
└─ Provides: Journal entries CRUD operations

EmergencyContactsContext
├─ Used by: ContactsPage, PanicPage, 
│            NotificationService,
│            EmergencyAlertService
└─ Provides: Emergency contacts management

AutofillContext
├─ Used by: ContactFormModal, IncidentReportForm,
│            JournalEntryForm, Any form component
└─ Provides: Autofill data suggestions
```

#### B. Service-Based Reuse

```
Firebase Service (firebase.js)
├─ Imported by: AuthContext, NotificationService,
│                JourneySharingService,
│                BackupAndRestoreService
└─ Provides: Single Firebase instance (singleton pattern)

NotificationActionService
├─ Used by: App.js, PanicPage, GeofenceService,
│            JourneyService
└─ Provides: Unified notification handling

Geofencing Service
├─ Uses: geofenceStorage, geofencingService,
│        locationHistoryTracker
└─ Provides: Centralized geofence management

Journey Sharing Service
├─ Uses: encryption, storage, validation
├─ Used by: JourneySharingPageV2, TrackAFriendPage
└─ Provides: Encrypted data sharing
```

#### B. Component-Based Reuse

```
Icon Components (Icons.js)
├─ Exported: JournalIcon, AlertIcon, TimerIcon, 
│             SettingsIcon, (extensible)
├─ Used by: Multiple screens for consistent icons
└─ Benefit: Centralized icon management

PageHeader Component
├─ Used by: JournalPage, SettingsPage,
│            ContactsPage, (any page needing header)
└─ Benefit: Consistent page styling

AppHeader Component
├─ Used by: Main app layout
└─ Benefit: Persistent header across screens

SideMenu Component
├─ Used by: Main app layout
└─ Benefit: Navigation menu reuse
```

### 7.2 Design for Reuse - Implementation Pattern

#### A. Service Layer Abstraction

```javascript
// Pattern: Interface + Implementation Separation

// 1. Define Interface (Contract)
// services/journeySharing/encryption.js
export const encrypt = (data, key) => {
  // Abstract interface
};

export const decrypt = data => {
  // Abstract interface
};

// 2. Implement Interface
// services/journeySharing/encryption_impl.js
import CryptoJS from 'crypto-js';

export const encrypt = (data, key) => {
  return CryptoJS.AES.encrypt(JSON.stringify(data), key).toString();
};

export const decrypt = (encryptedData) => {
  const decrypted = CryptoJS.AES.decrypt(encryptedData, key);
  return JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
};

// 3. Use Interface
// components/JourneySharing/JourneySharingPageV2.js
import { encrypt } from '../../services/journeySharing/encryption';

const shareJourney = async () => {
  const encrypted = encrypt(locationData, shareCode);
  // Send encrypted data...
};

// 4. Can swap implementation without changing usage
// Easy to test with mock implementations
```

#### B. Context Provider Reuse Pattern

```javascript
// Pattern: Create custom hooks for easy access

// 1. Define Context
const JournalContext = createContext();

// 2. Create Hook (easy access + error handling)
export const useJournal = () => {
  const context = useContext(JournalContext);
  if (!context) {
    throw new Error('useJournal must be used within JournalProvider');
  }
  return context;
};

// 3. Reuse anywhere within provider tree
function JournalPage() {
  const { entries, addEntry, deleteEntry } = useJournal();
  // Use context data...
}

function JournalTemplateModal() {
  const { entries, updateEntry } = useJournal();
  // Reuse same context...
}

// Benefits:
// - No prop drilling
// - Easy to find all usages with IDE search
// - Clear what data is needed
// - Automatic re-render on context change
```

#### C. Utility Function Reuse

```javascript
// Pattern: Export pure functions from utils

// utils/dateFormatter.js
export const formatDate = (date) => new Date(date).toLocaleDateString();
export const formatTime = (date) => new Date(date).toLocaleTimeString();
export const sortByDate = (items) => items.sort((a, b) => 
  new Date(b.date) - new Date(a.date)
);

// Used across multiple screens
// JournalPage.js
import { sortByDate, formatDate } from '../utils/dateFormatter';
// GeofenceManagementPage.js
import { sortByDate } from '../utils/dateFormatter';
```

### 7.3 External Reusability - How to Reuse YoursApp Components

#### A. Export Reusable Components

```javascript
// Current: Components are screen-specific
// screens/JournalPage.js (not easily reusable)

// To enable external reuse, create shared components:
// components/JournalView.js
export const JournalView = ({ entries, onAddEntry, onDeleteEntry }) => {
  return (
    // Reusable journal list display
  );
};

// components/JournalForm.js
export const JournalEntryForm = ({ onSubmit, template }) => {
  return (
    // Reusable form component
  );
};

// Now other apps can import:
// import { JournalView, JournalEntryForm } from 'yours-app';
```

#### B. Extract Context Providers for External Use

```javascript
// Make providers exportable
// context/index.js
export { AuthProvider, useAuth } from './AuthContext';
export { JournalProvider, useJournal } from './JournalContext';
export { EmergencyContactsProvider, useEmergencyContacts } from 
  './EmergencyContactsContext';
export { AutofillProvider, useAutofill } from './AutofillContext';

// External app can use:
// import { JournalProvider, useJournal } from 'yours-app';
// 
// function MyApp() {
//   return (
//     <JournalProvider>
//       <MyComponent />
//     </JournalProvider>
//   );
// }
```

#### C. Extract Services as NPM Package

```javascript
// Create separate package: @yours-app/journey-sharing
// 
// export:
//   - encryption service
//   - storage service
//   - validation service
//
// Other apps can:
// npm install @yours-app/journey-sharing
//
// import { encryptJourney, shareSession } from 
//   '@yours-app/journey-sharing';
```

### 7.4 Reuse Opportunities & Recommendations

```
High Priority (Easy Wins):
├─ Extract PageHeader as reusable component
├─ Extract AppHeader/SideMenu as layout components
├─ Create Icon component library
├─ Extract all utility functions to utils/
└─ Create custom hooks library (useLocationTracking, etc.)

Medium Priority:
├─ Extract form components (JournalForm, IncidentForm, etc.)
├─ Create modal component library
├─ Extract notification service as package
├─ Create geofence service as package
└─ Export context providers for external use

High Value (Strategic):
├─ Create @yours-app/journey-sharing package
├─ Create @yours-app/location-services package
├─ Create @yours-app/safety-features package
├─ Document component APIs for external developers
└─ Create Storybook for component showcase

Current Reuse Strengths:
✓ Good service layer separation
✓ Context providers for state management
✓ Clear component organization
✓ Modular geofencing system

Recommended Improvements:
- Add TypeScript for better external API contracts
- Create component storybook for documentation
- Extract more business logic to services
- Add JSDoc comments to all public APIs
- Create example apps showing component usage
- Publish reusable packages to npm
```

---

## Summary

**YoursApp** demonstrates strong architectural principles:

1. **System Context**: Mobile app with Firebase backend integration
2. **Principal Objects**: Context providers manage state, services handle business logic
3. **Subsystems**: Modular architecture for Auth, Location, Safety, Data Management
4. **State Machines**: Clear state transitions for Auth, Safety, and Location tracking
5. **Sequence Flows**: Well-documented interactions between components
6. **Observer Pattern**: React Context API implements pub-sub for reactive updates
7. **Reusability**: 
   - Strong internal reuse through contexts and services
   - Ready for external component library extraction
   - Services can be packaged as independent npm packages
   - Potential for multi-app ecosystem
