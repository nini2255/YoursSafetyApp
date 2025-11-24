import 'react-native-gesture-handler';
import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Text,
  Alert,
} from 'react-native';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { VolumeManager } from 'react-native-volume-manager';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AppHeader } from './components/AppHeader';
import { SideMenu } from './components/SideMenu';

// --- CONTEXT PROVIDERS ---
import { AuthProvider, useAuth } from './context/AuthContext';
import { JournalProvider } from './context/JournalContext';
import { EmergencyContactsProvider } from './context/EmergencyContactsContext';
import { AutofillProvider } from './context/AutofillContext';

import { JournalIcon, AlertIcon, TimerIcon, SettingsIcon } from './components/Icons';

// Login/Signup Screens
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';

// Core App Screens
import { HomePage } from './screens/HomePage';
import SecondaryHomeScreen from './screens/SecondaryHomeScreen';
import { JournalPage } from './screens/JournalPage';
import { PanicPage } from './screens/PanicPage';
import { TimerPage } from './screens/TimerPage';
import { SettingsPage } from './screens/SettingsPage';
import { ContactsPage } from './screens/ContactsPage';
import { FakeCallScreen } from './screens/FakeCallScreen';
import DiscreetModeSettingsPage from './screens/DiscreetModeSettingsPage';
import SudokuScreen from './screens/SudokuScreen';
import FakeCallSettingsPage from './screens/FakeCallSettingsPage';
import BackupAndRestorePage from './screens/BackupAndRestorePage';
import UserProfileSettingsPage from './screens/UserProfileSettingsPage';

//geofence
import GeofenceManagementPage from './screens/GeofenceManagementPage';
import CreateGeofencePage from './screens/CreateGeofencePage';
import { registerForPushNotifications, saveUserToken } from './services/expoPushService';
import { getActiveGeofences } from './services/geofenceStorage';
import { startGeofenceMonitoring } from './services/geofencingService';

// Journey Sharing Screens
import JourneySharingPageV2 from './components/JourneySharing/JourneySharingPageV2';
import TrackAFriendPage from './components/JourneySharing/TrackAFriendPage';
import TrackingDetailPage from './components/JourneySharing/TrackingDetailPage';
import LocationHistoryPage from './components/LocationHistoryPage';

// --- NOTIFICATION SERVICE ---
import { 
  registerSafetyNotificationActions, 
  addNotificationActionListener 
} from './services/NotificationActionService';

const Stack = createStackNavigator();

export default function App() {
  return (
    <AuthProvider>
      <AutofillProvider>
        <EmergencyContactsProvider>
          <JournalProvider>
            <AppContent />
          </JournalProvider>
        </EmergencyContactsProvider>
      </AutofillProvider>
    </AuthProvider>
  );
}

function AppContent() {
  const { user, isLoggedIn, isLoading } = useAuth();
  const navigationRef = useNavigationContainerRef();

  // --- App State ---
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [isFakeCallActive, setFakeCallActive] = useState(false);
  const [showSudoku, setShowSudoku] = useState(false);
  const [twoFingerTriggerEnabled, setTwoFingerTriggerEnabled] = useState(false);
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);
  const twoFingerTimer = useRef(null);
  const touchCount = useRef(null);
  const initialTouchPositions = useRef([]);
  const volumeHoldTimeout = useRef(null);
  const lastVolume = useRef(null);

  // --- Lifted State for Fake Call Settings ---
  const [callerName, setCallerName] = useState('Tech Maniac');
  const [screenHoldEnabled, setScreenHoldEnabled] = useState(true);
  const [volumeHoldEnabled, setVolumeHoldEnabled] = useState(true);
  const [screenHoldDuration, setScreenHoldDuration] = useState(10);
  const [volumeHoldDuration, setVolumeHoldDuration] = useState(5);

  const settingsRef = useRef({
    isFakeCallActive,
    volumeHoldEnabled,
    volumeHoldDuration,
  });

  // --- MOVED BLOCK ---
  // --- Initialize geofencing, push notifications, and resume active journey ---
  useEffect(() => {
    const initializeServices = async () => {
      try {
        // Register push notifications
        const token = await registerForPushNotifications();
        if (token) {
          let userId = await AsyncStorage.getItem('userId');
          if (!userId) {
            userId = `user_${Date.now()}`;
            await AsyncStorage.setItem('userId', userId);
          }
          await saveUserToken(userId, token);
        }

        // Resume active journey if exists
        const { resumeActiveJourney } = require('./services/journeyService');
        const journeyResumed = await resumeActiveJourney();
        if (journeyResumed) {
          console.log('Active journey resumed on app restart');
        }

        // Initialize geofencing
        const activeGeofences = await getActiveGeofences();
        if (activeGeofences.length > 0) {
          await startGeofenceMonitoring(activeGeofences);
          console.log(`Geofence monitoring started for ${activeGeofences.length} geofences`);
        }

        // Setup notifications
        const { setupLocationNotifications } = require('./services/backgroundLocationService');
        await setupLocationNotifications();

        // Setup offline queue listener
        const { setupQueueListener } = require('./utils/offlineQueue');
        const unsubscribeQueue = setupQueueListener();

        // Store unsubscribe function for cleanup
        return () => {
          if (unsubscribeQueue) {
            unsubscribeQueue();
          }
        };
      } catch (error) {
        console.error('Error initializing services:', error);
      }
    };
    initializeServices();
  }, []);
  // --- END OF MOVED BLOCK ---

  useEffect(() => {
    settingsRef.current = {
      isFakeCallActive,
      volumeHoldEnabled,
      volumeHoldDuration,
    };
  }, [isFakeCallActive, volumeHoldEnabled, volumeHoldDuration]);

  // --- IMPROVED NOTIFICATION LISTENER SETUP ---
  useEffect(() => {
    registerSafetyNotificationActions();

    const subscription = addNotificationActionListener({
        // Callback for Fake Call
        onFakeCall: () => {
           if (navigationRef.isReady()) {
               navigationRef.navigate('Home');
               setTimeout(() => {
                   setFakeCallActive(true);
               }, 100);
           }
        },
        // Callback for Panic
        onPanic: () => {
            if (navigationRef.isReady()) {
                navigationRef.navigate('Panic');
            }
        },
        // Callback for Timer
        onTimer: () => {
             if (navigationRef.isReady()) {
                navigationRef.navigate('Timer');
            }
        },
        navigation: navigationRef
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // --- Load/Reset settings based on user login status ---
  useEffect(() => {
    if (user?.email) {
      loadFakeCallSettings(user.email);
      checkDiscreetModeSettings(user.email);
    } else {
      setCallerName('Tech Maniac');
      setScreenHoldEnabled(true);
      setVolumeHoldEnabled(true);
      setScreenHoldDuration(10);
      setVolumeHoldDuration(5);
      setShowSudoku(false);
      setTwoFingerTriggerEnabled(false);
      setIsEmergencyMode(false);
    }
  }, [user]);

  // --- Volume listener effect ---
  useEffect(() => {
    VolumeManager.enable(true);
    const volumeListener = VolumeManager.addVolumeListener(result => {
      const {
        isFakeCallActive: isFakeCallActiveNow,
        volumeHoldEnabled: isVolumeHoldEnabledNow,
        volumeHoldDuration: currentVolumeHoldDuration,
      } = settingsRef.current;

      if (!isVolumeHoldEnabledNow || isFakeCallActiveNow) return;

      const currentVolume = result.volume;
      const isVolumeUpPress =
        (lastVolume.current !== null && currentVolume > lastVolume.current) ||
        (currentVolume === 1.0 && lastVolume.current === 1.0);

      if (isVolumeUpPress) {
        if (!volumeHoldTimeout.current) {
          volumeHoldTimeout.current = setTimeout(() => {
            setFakeCallActive(() => true);
            clearTimeout(volumeHoldTimeout.current);
            volumeHoldTimeout.current = null;
          }, currentVolumeHoldDuration * 1000);
        }
      } else {
        if (volumeHoldTimeout.current) {
          clearTimeout(volumeHoldTimeout.current);
          volumeHoldTimeout.current = null;
        }
      }
      lastVolume.current = currentVolume;
    });

    return () => {
      volumeListener.remove();
      if (volumeHoldTimeout.current) {
        clearTimeout(volumeHoldTimeout.current);
      }
    };
  }, []);

  const loadFakeCallSettings = async (email) => {
    try {
      const keys = [
        `@${email}_fake_call_caller_name`,
        `@${email}_fake_call_screen_hold_enabled`,
        `@${email}_fake_call_volume_hold_enabled`,
        `@${email}_fake_call_screen_hold_duration`,
        `@${email}_fake_call_volume_hold_duration`,
      ];
      const settings = await AsyncStorage.multiGet(keys);
      
      setCallerName(settings[0][1] || 'Tech Maniac');
      setScreenHoldEnabled(settings[1][1] === null ? true : settings[1][1] === 'true');
      setVolumeHoldEnabled(settings[2][1] === null ? true : settings[2][1] === 'true');
      setScreenHoldDuration(settings[3][1] ? parseInt(settings[3][1], 10) : 10);
      setVolumeHoldDuration(settings[4][1] ? parseInt(settings[4][1], 10) : 5);
    } catch (error) {
      console.error('Error loading fake call settings:', error);
    }
  };

  const checkDiscreetModeSettings = async (email) => {
    try {
      const keys = [
        `@${email}_discreet_mode_enabled`,
        `@${email}_sudoku_screen_enabled`,
        `@${email}_two_finger_trigger_enabled`,
      ];
      const [discreetMode, sudokuScreen, twoFinger] = await Promise.all([
        AsyncStorage.getItem(keys[0]),
        AsyncStorage.getItem(keys[1]),
        AsyncStorage.getItem(keys[2]),
      ]);

      if (discreetMode === 'true' && sudokuScreen === 'true') {
        setShowSudoku(true);
      } else {
        setShowSudoku(false); 
      }
      setTwoFingerTriggerEnabled(twoFinger === 'true');
    } catch (error) {
      console.error('Error checking discreet mode settings:', error);
      setShowSudoku(false);
    }
  };
  
  const onSaveFakeCallSettings = async (email, newSettings) => {
     try {
        await AsyncStorage.multiSet([
            [`@${email}_fake_call_caller_name`, newSettings.callerName],
            [`@${email}_fake_call_screen_hold_enabled`, String(newSettings.screenHoldEnabled)],
            [`@${email}_fake_call_volume_hold_enabled`, String(newSettings.volumeHoldEnabled)],
            [`@${email}_fake_call_screen_hold_duration`, String(newSettings.screenHoldDuration)],
            [`@${email}_fake_call_volume_hold_duration`, String(newSettings.volumeHoldDuration)],
        ]);
        setCallerName(newSettings.callerName);
        setScreenHoldEnabled(newSettings.screenHoldEnabled);
        setVolumeHoldEnabled(newSettings.volumeHoldEnabled);
        setScreenHoldDuration(newSettings.screenHoldDuration);
        setVolumeHoldDuration(newSettings.volumeHoldDuration);
     } catch (error) {
        console.error("Failed to save fake call settings", error);
        Alert.alert('Error', 'Failed to save settings.');
     }
  };

  const handleBypassSuccess = () => {
    setShowSudoku(false);
    setIsEmergencyMode(false);
  };

  const onTouchStart = e => {
    if (!twoFingerTriggerEnabled || showSudoku) return;
    touchCount.current = e.nativeEvent.touches.length;
    if (touchCount.current === 2) {
      initialTouchPositions.current = e.nativeEvent.touches.map(touch => ({
        x: touch.pageX,
        y: touch.pageY,
      }));
      twoFingerTimer.current = setTimeout(() => {
        triggerEmergencySudoku();
      }, 1000);
    } else {
      if (twoFingerTimer.current) {
        clearTimeout(twoFingerTimer.current);
        twoFingerTimer.current = null;
      }
    }
  };

  const onTouchMove = e => {
    if (!twoFingerTriggerEnabled || !twoFingerTimer.current) return;
    const currentTouches = e.nativeEvent.touches;
    if (currentTouches.length !== 2) {
      clearTimeout(twoFingerTimer.current);
      twoFingerTimer.current = null;
      return;
    }
    let maxMovement = 0;
    for (let i = 0; i < 2; i++) {
      if (initialTouchPositions.current[i]) {
        const dx = currentTouches[i].pageX - initialTouchPositions.current[i].x;
        const dy = currentTouches[i].pageY - initialTouchPositions.current[i].y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        maxMovement = Math.max(maxMovement, distance);
      }
    }
    if (maxMovement > 30) {
      clearTimeout(twoFingerTimer.current);
      twoFingerTimer.current = null;
    }
  };

  const onTouchEnd = e => {
    if (!twoFingerTriggerEnabled) return;
    if (twoFingerTimer.current) {
      clearTimeout(twoFingerTimer.current);
      twoFingerTimer.current = null;
    }
  };

  const triggerEmergencySudoku = () => {
    setIsEmergencyMode(true);
    setShowSudoku(true);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer ref={navigationRef}>
        <View
          style={styles.touchContainer}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <Stack.Navigator
            initialRouteName={isLoggedIn ? 'Home' : 'Login'}
            screenOptions={{ headerShown: false }}
          >
            {isLoggedIn ? (
              <>
                <Stack.Screen name="Home">
                  {props => (
                    <SafeAreaView style={styles.container}>
                      <StatusBar barStyle="dark-content" backgroundColor="#FEF2F2" />
                      {!isFakeCallActive && !showSudoku && (
                        <AppHeader onMenuPress={() => setMenuOpen(true)} title="Yours" />
                      )}
                      <View style={styles.contentArea}>
                        {isFakeCallActive ? (
                          <FakeCallScreen
                            onEndCall={() => setFakeCallActive(false)}
                            callerName={callerName}
                          />
                        ) : showSudoku ? (
                          <SudokuScreen
                            onBypassSuccess={handleBypassSuccess}
                            isEmergencyMode={isEmergencyMode}
                          />
                        ) : (
                          <HomePage
                            {...props}
                            onFakeCall={() => setFakeCallActive(true)}
                            screenHoldEnabled={screenHoldEnabled}
                            screenHoldDuration={screenHoldDuration}
                            onNavigateToJournal={() => props.navigation.navigate('Journal')}
                            onOpenMenu={() => setMenuOpen(true)}
                            onTriggerSudoku={() => setShowSudoku(true)}
                          />
                        )}
                      </View>
                      
                      {!isFakeCallActive && !showSudoku && (
                        <View style={styles.bottomNav}>
                          <TouchableOpacity onPress={() => props.navigation.navigate('Journal')} style={styles.navButton}>
                            <JournalIcon />
                            <Text style={styles.navButtonText}>Journal</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => props.navigation.navigate('Panic')} style={styles.navButton}>
                            <AlertIcon />
                            <Text style={styles.navButtonText}>Panic</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => props.navigation.navigate('Timer')} style={styles.navButton}>
                            <TimerIcon />
                            <Text style={styles.navButtonText}>Timer</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => props.navigation.navigate('Settings')} style={styles.navButton}>
                            <SettingsIcon />
                            <Text style={styles.navButtonText}>Settings</Text>
                          </TouchableOpacity>
                        </View>
                      )}

                      <SideMenu
                        isOpen={isMenuOpen}
                        onClose={() => setMenuOpen(false)}
                        onNavigate={page => {
                          setMenuOpen(false);
                          props.navigation.navigate(page);
                        }}
                      />
                    </SafeAreaView>
                  )}
                </Stack.Screen>

                <Stack.Screen
                  name="SecondaryHome"
                  component={SecondaryHomeScreen}
                  options={{
                    headerShown: false,
                    presentation: 'modal',
                    animation: 'slide_from_bottom',
                  }}
                />

                <Stack.Screen name="Journal" component={JournalPage} />
                <Stack.Screen name="Panic" component={PanicPage} />
                <Stack.Screen name="Timer" component={TimerPage} />
                <Stack.Screen name="Settings" component={SettingsPage} />
                <Stack.Screen name="Contacts" component={ContactsPage} />
                
                <Stack.Screen name="FakeCallSettings">
                  {props => (
                    <FakeCallSettingsPage
                      {...props}
                      settings={{
                        callerName,
                        screenHoldEnabled,
                        volumeHoldEnabled,
                        screenHoldDuration,
                        volumeHoldDuration,
                      }}
                      onSave={newSettings => {
                        if (user?.email) {
                          onSaveFakeCallSettings(user.email, newSettings);
                        }
                      }}
                    />
                  )}
                </Stack.Screen>
                
                <Stack.Screen name="BackupAndRestore" component={BackupAndRestorePage} />
                <Stack.Screen name="DiscreetMode" component={DiscreetModeSettingsPage} />
                <Stack.Screen name="UserProfileSettings" component={UserProfileSettingsPage} />

                <Stack.Screen name="JourneySharing" component={JourneySharingPageV2} />
                <Stack.Screen name="TrackAFriend" component={TrackAFriendPage} />
                <Stack.Screen name="TrackingDetail" component={TrackingDetailPage} />
                <Stack.Screen name="LocationHistory" component={LocationHistoryPage} />
                  <Stack.Screen name="GeofenceManagement" component={GeofenceManagementPage} />

                <Stack.Screen name="CreateGeofence" component={CreateGeofencePage} />
              </>
            ) : (
              <>
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="Signup" component={SignupScreen} />
              </>
            )}
          </Stack.Navigator>
        </View>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F8',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  touchContainer: {
    flex: 1,
  },
  contentArea: {
    flex: 1,
  },
  bottomNav: {
    height: 80,
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#FFE4E6',
    backgroundColor: 'white',
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonText: {
    fontSize: 12,
    color: '#4B5563',
    marginTop: 4,
  },
});