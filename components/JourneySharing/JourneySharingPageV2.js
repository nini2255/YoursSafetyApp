import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
  ActivityIndicator,
  Clipboard,
  Platform,
  AppState
} from 'react-native';
import * as Location from 'expo-location';
import * as SMS from 'expo-sms';
import { checkShareCodeAvailability, pushLocationUpdate } from '../../services/firebaseService';
import { validateShareCode, validatePassword as validatePasswordFormat } from '../../utils/journeySharing/validation';
import {
  startBackgroundLocationTracking,
  stopBackgroundLocationTracking,
  getSharingStatus,
  extendSharingSession
  // setupLocationNotifications // REMOVED: Notification support temporarily disabled
} from '../../services/backgroundLocationService';
import { getSharingConfig, saveSharingConfig } from '../../utils/journeySharing/storage';
import { getActiveSessions } from '../../utils/journeySharing/storage';

const JourneySharingPageV2 = ({ navigation }) => {
  // Share location state
  const [isSharingActive, setIsSharingActive] = useState(false);
  const [shareCode, setShareCode] = useState('');
  const [password, setPassword] = useState('');
  const [updateInterval, setUpdateInterval] = useState(600); // 10 minutes in seconds
  const [autoStopDuration, setAutoStopDuration] = useState(86400); // 24 hours in seconds
  const [showPassword, setShowPassword] = useState(false);
  const [codeAvailable, setCodeAvailable] = useState(null);
  const [checkingCode, setCheckingCode] = useState(false);
  const [loading, setLoading] = useState(false);

  // Active session state
  const [activeSession, setActiveSession] = useState(null);
  const [nextUpdateCountdown, setNextUpdateCountdown] = useState(0);

  // Tracking sessions state
  const [activeTracks, setActiveTracks] = useState([]);

  // Foreground update interval ref
  const updateIntervalRef = useRef(null);

  // Load saved config and check if sharing is active
  useEffect(() => {
    loadSavedConfig();
    checkSharingStatus();
    loadActiveTrackingSessions();
    // setupLocationNotifications(); // REMOVED: Notification support temporarily disabled
  }, []);

  // Countdown timer for next update
  useEffect(() => {
    if (isSharingActive && activeSession) {
      const interval = setInterval(() => {
        const now = Date.now();
        const timeSinceUpdate = now - (activeSession.lastUpdateTime || now);
        const timeUntilNext = (activeSession.updateInterval * 1000) - timeSinceUpdate;
        setNextUpdateCountdown(Math.max(0, Math.floor(timeUntilNext / 1000)));
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isSharingActive, activeSession]);

  // Foreground location updates - pushes location while app is in foreground
  useEffect(() => {
    if (!isSharingActive || !activeSession) {
      // Clean up interval if sharing stops
      if (updateIntervalRef.current) {
        console.log('[Foreground] Clearing location update interval');
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
      return;
    }

    console.log('[Foreground] Setting up location update interval');
    console.log('[Foreground] Update interval:', activeSession.updateInterval, 'seconds');

    // Push location immediately
    pushLocationNow();

    // Set up interval for regular updates
    const intervalMs = activeSession.updateInterval * 1000;
    updateIntervalRef.current = setInterval(() => {
      console.log('[Foreground] Interval triggered - pushing location update');
      pushLocationNow();
    }, intervalMs);

    // Cleanup on unmount or when sharing stops
    return () => {
      if (updateIntervalRef.current) {
        console.log('[Foreground] Cleaning up location update interval');
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
    };
  }, [isSharingActive, activeSession]);

  // App state change handler - push update when returning to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      console.log('[AppState] App state changed to:', nextAppState);

      if (nextAppState === 'active' && isSharingActive && activeSession) {
        console.log('[AppState] App came to foreground - pushing location update');
        pushLocationNow();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isSharingActive, activeSession]);

  const pushLocationNow = async () => {
    if (!activeSession) {
      console.log('[PushLocation] No active session, skipping');
      return;
    }

    try {
      console.log('[PushLocation] Getting current location...');
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });

      const locationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: Date.now()
      };

      console.log('[PushLocation] Location obtained:', locationData);
      console.log('[PushLocation] Pushing to Firebase...');

      await pushLocationUpdate(
        activeSession.shareCode,
        locationData,
        activeSession.password,
        activeSession.updateInterval
      );

      console.log('[PushLocation] ✅ Location update successful');

      // Update session last update time
      setActiveSession(prev => ({
        ...prev,
        lastUpdateTime: Date.now()
      }));

    } catch (error) {
      console.error('[PushLocation] ❌ Error pushing location:', error);
    }
  };

  const loadSavedConfig = async () => {
    try {
      const config = await getSharingConfig();
      if (config) {
        setShareCode(config.shareCode || '');
        setPassword(config.password || '');
        setUpdateInterval(config.updateInterval || 600);
        setAutoStopDuration(config.autoStopDuration || 86400);
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }
  };

  const checkSharingStatus = async () => {
    try {
      const status = await getSharingStatus();
      if (status && status.active) {
        setIsSharingActive(true);
        setActiveSession(status);
      } else {
        setIsSharingActive(false);
        setActiveSession(null);
      }
    } catch (error) {
      console.error('Error checking sharing status:', error);
    }
  };

  const loadActiveTrackingSessions = async () => {
    try {
      const sessions = await getActiveSessions();
      setActiveTracks(sessions.slice(0, 3)); // Show only first 3
    } catch (error) {
      console.error('Error loading active tracks:', error);
    }
  };

  const handleShareCodeChange = async (code) => {
    setShareCode(code);
    setCodeAvailable(null);

    if (code.length >= 6) {
      setCheckingCode(true);
      try {
        const validation = validateShareCode(code);
        if (!validation.valid) {
          setCodeAvailable(false);
          setCheckingCode(false);
          return;
        }

        const available = await checkShareCodeAvailability(code);
        setCodeAvailable(available);
      } catch (error) {
        console.error('Error checking code:', error);
      } finally {
        setCheckingCode(false);
      }
    }
  };

  const handleStartSharing = async () => {
    try {
      // Validate inputs
      const codeValidation = validateShareCode(shareCode);
      if (!codeValidation.valid) {
        Alert.alert('Invalid Share Code', codeValidation.error);
        return;
      }

      const passwordValidation = validatePasswordFormat(password);
      if (!passwordValidation.valid) {
        Alert.alert('Invalid Password', passwordValidation.error);
        return;
      }

      // Check code availability
      const available = await checkShareCodeAvailability(shareCode);
      if (!available) {
        Alert.alert('Share Code Taken', 'This share code is already in use. Please choose a different code.');
        return;
      }

      setLoading(true);

      // Calculate auto-stop time
      const autoStopTime = autoStopDuration === 0 ? null : Date.now() + (autoStopDuration * 1000);

      // Save config
      await saveSharingConfig({
        shareCode,
        password,
        updateInterval,
        autoStopDuration
      });

      // Start background location tracking
      await startBackgroundLocationTracking({
        shareCode,
        password,
        updateInterval,
        autoStopTime
      });

      // Update UI
      setIsSharingActive(true);
      await checkSharingStatus();

      Alert.alert('Success', 'Location sharing started successfully!');
    } catch (error) {
      console.error('Error starting sharing:', error);
      Alert.alert('Error', error.message || 'Failed to start location sharing');
    } finally {
      setLoading(false);
    }
  };

  const handleStopSharing = async () => {
    Alert.alert(
      'Stop Sharing Location?',
      'Active listeners will be notified that you\'ve stopped sharing your location.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Stop Sharing',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await stopBackgroundLocationTracking();
              setIsSharingActive(false);
              setActiveSession(null);
              Alert.alert('Success', 'Location sharing stopped');
            } catch (error) {
              console.error('Error stopping sharing:', error);
              Alert.alert('Error', 'Failed to stop location sharing');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleCopyShareInfo = () => {
    const message = `Track my location on YOURS app:\nCode: ${shareCode}\nPassword: ${password}\n\nDownload YOURS: [app store link]`;
    Clipboard.setString(message);
    Alert.alert('Copied!', 'Share code and password copied to clipboard');
  };

  const handleShareViaSMS = async () => {
    try {
      const isAvailable = await SMS.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Error', 'SMS is not available on this device');
        return;
      }

      const message = `Track my location on YOURS app:\nCode: ${shareCode}\nPassword: ${password}\n\nDownload YOURS: [app store link]`;

      await SMS.sendSMSAsync([], message);
    } catch (error) {
      console.error('Error sharing via SMS:', error);
      Alert.alert('Error', 'Failed to open SMS');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes} minutes`;
  };

  const getAutoStopLabel = () => {
    if (autoStopDuration === 0) return 'Never';
    const hours = autoStopDuration / 3600;
    if (hours >= 24) {
      const days = hours / 24;
      return `${days} day${days > 1 ? 's' : ''}`;
    }
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  };

  // Render "Track A Friend" section
  const renderTrackAFriendSection = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>TRACK A FRIEND</Text>
      </View>
      {activeTracks.length > 0 ? (
        <>
          {activeTracks.map((track) => (
            <View key={track.id} style={styles.trackCard}>
              <Text style={styles.trackIcon}>📍</Text>
              <View style={styles.trackInfo}>
                <Text style={styles.trackName}>{track.displayName}</Text>
                <Text style={styles.trackStatus}>
                  Last update: {track.lastUpdate ? getTimeSinceUpdate(track.lastUpdate) : 'Just now'}
                </Text>
              </View>
              <View style={styles.trackActions}>
                <TouchableOpacity
                  style={styles.trackButton}
                  onPress={() => navigation.navigate('TrackingDetail', { sessionId: track.id })}
                >
                  <Text style={styles.trackButtonText}>View</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          <TouchableOpacity
            style={styles.trackAFriendButton}
            onPress={() => navigation.navigate('TrackAFriend')}
          >
            <Text style={styles.trackAFriendButtonText}>Track Another Friend →</Text>
          </TouchableOpacity>
        </>
      ) : (
        <TouchableOpacity
          style={styles.trackAFriendButtonLarge}
          onPress={() => navigation.navigate('TrackAFriend')}
        >
          <Text style={styles.trackAFriendIcon}>📍</Text>
          <Text style={styles.trackAFriendButtonText}>Track Someone's Location</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // Render share location section (inactive state)
  const renderShareLocationInactive = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>SHARE YOUR LOCATION</Text>
      </View>

      <Text style={styles.blurb}>
        Share Your Location allows friends and family with the YOURS app to see your real-time location.
        They'll need your share code and password to access your location.{'\n\n'}
        Your location is end-to-end encrypted and only stored temporarily on secure servers.
      </Text>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Share Code</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={shareCode}
            onChangeText={handleShareCodeChange}
            placeholder="my-location-code"
            placeholderTextColor="#9CA3AF" // *** MODIFIED: Added placeholder color ***
            autoCapitalize="none"
            autoCorrect={false}
          />
          {checkingCode && <ActivityIndicator size="small" color="#F472B6" />}
          {!checkingCode && codeAvailable !== null && (
            <Text style={codeAvailable ? styles.codeAvailable : styles.codeTaken}>
              {codeAvailable ? '✓ Available' : '✗ Taken'}
            </Text>
          )}
        </View>
        <Text style={styles.helperText}>Friends will use this code to find you</Text>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Password</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={password}
            onChangeText={setPassword}
            placeholder="Enter password"
            placeholderTextColor="#9CA3AF" // *** MODIFIED: Added placeholder color ***
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Text style={styles.showHideText}>{showPassword ? 'Hide' : 'Show'}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.helperText}>Used to encrypt your location data</Text>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Send location updates every:</Text>
        <View style={styles.pickerRow}>
          {[60, 300, 600, 900, 1800].map((interval) => (
            <TouchableOpacity
              key={interval}
              style={[
                styles.pickerButton,
                updateInterval === interval && styles.pickerButtonActive
              ]}
              onPress={() => setUpdateInterval(interval)}
            >
              <Text style={[
                styles.pickerButtonText,
                updateInterval === interval && styles.pickerButtonTextActive
              ]}>
                {interval / 60} min
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.helperText}>More frequent = more battery usage</Text>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Automatically stop after:</Text>
        <View style={styles.pickerRow}>
          {[3600, 7200, 14400, 28800, 43200, 86400, 0].map((duration) => {
            const label = duration === 0 ? 'Never' : duration / 3600 + 'h';
            return (
              <TouchableOpacity
                key={duration}
                style={[
                  styles.pickerButton,
                  autoStopDuration === duration && styles.pickerButtonActive
                ]}
                onPress={() => setAutoStopDuration(duration)}
              >
                <Text style={[
                  styles.pickerButtonText,
                  autoStopDuration === duration && styles.pickerButtonTextActive
                ]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.helperText}>Session will end automatically after this time</Text>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.secondaryButton, { flex: 1, marginRight: 5 }]}
          onPress={handleCopyShareInfo}
          disabled={!shareCode || !password}
        >
          <Text style={styles.secondaryButtonText}>Copy Share Info</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.secondaryButton, { flex: 1, marginLeft: 5 }]}
          onPress={handleShareViaSMS}
          disabled={!shareCode || !password}
        >
          <Text style={styles.secondaryButtonText}>Share via SMS</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.warningBox}>
        <Text style={styles.warningIcon}>📊</Text>
        <Text style={styles.warningTitle}>Data Usage Notice</Text>
        <Text style={styles.warningText}>
          Sharing your location uses cellular/WiFi data to send encrypted updates to the server.
          Estimated usage: ~1-5 MB per hour depending on update frequency.
        </Text>
      </View>

      <View style={styles.warningBox}>
        <Text style={styles.warningIcon}>🔋</Text>
        <Text style={styles.warningTitle}>Battery Usage Notice</Text>
        <Text style={styles.warningText}>
          Continuous GPS tracking will drain your battery faster than normal.
          More frequent updates (&lt; 10 minutes) significantly increase battery consumption.
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.startButton, (!shareCode || !password || codeAvailable === false) && styles.startButtonDisabled]}
        onPress={handleStartSharing}
        disabled={!shareCode || !password || codeAvailable === false || loading}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.startButtonText}>Start Sharing Location</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  // Render share location section (active state)
  const renderShareLocationActive = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>SHARE YOUR LOCATION</Text>
      </View>

      <View style={styles.activeStatusBanner}>
        <Text style={styles.activeStatusIcon}>🟢</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.activeStatusTitle}>Sharing Active</Text>
          <Text style={styles.activeStatusCode}>Code: {activeSession?.shareCode}</Text>
        </View>
        <TouchableOpacity style={styles.copyButton} onPress={handleCopyShareInfo}>
          <Text style={styles.copyButtonText}>Copy</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sessionInfo}>
        <View style={styles.sessionInfoRow}>
          <Text style={styles.sessionInfoLabel}>Started:</Text>
          <Text style={styles.sessionInfoValue}>
            {activeSession?.startTime ? new Date(activeSession.startTime).toLocaleString() : 'Just now'}
          </Text>
        </View>
        <View style={styles.sessionInfoRow}>
          <Text style={styles.sessionInfoLabel}>Next update:</Text>
          <Text style={styles.sessionInfoValue}>{formatTime(nextUpdateCountdown)}</Text>
        </View>
        <View style={styles.sessionInfoRow}>
          <Text style={styles.sessionInfoLabel}>Updates every:</Text>
          <Text style={styles.sessionInfoValue}>{formatDuration(activeSession?.updateInterval || 600)}</Text>
        </View>
        <View style={styles.sessionInfoRow}>
          <Text style={styles.sessionInfoLabel}>Auto-stops:</Text>
          <Text style={styles.sessionInfoValue}>
            {activeSession?.autoStopTime ? new Date(activeSession.autoStopTime).toLocaleTimeString() : 'Never'}
          </Text>
        </View>
      </View>

      <View style={styles.privacyReminder}>
        <Text style={styles.privacyIcon}>🔒</Text>
        <Text style={styles.privacyText}>
          Your location is encrypted. Only people with your share code and password can see your location.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.stopButton}
        onPress={handleStopSharing}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.stopButtonText}>Stop Sharing</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const getTimeSinceUpdate = (timestamp) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} min ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {/* *** MODIFIED: Use navigation.goBack() *** */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Journey Sharing</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        {renderTrackAFriendSection()}

        <View style={styles.divider} />

        {isSharingActive ? renderShareLocationActive() : renderShareLocationInactive()}
      </ScrollView>
    </View>
  );
};

// Styles (to be added to App.js styles or imported)
const styles = {
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5'
  },
  backButton: {
    marginRight: 16
  },
  backButtonText: {
    fontSize: 24,
    color: '#374151'
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000'
  },
  scrollView: {
    flex: 1
  },
  section: {
    padding: 20
  },
  sectionHeader: {
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6B7280',
    letterSpacing: 1
  },
  divider: {
    height: 8,
    backgroundColor: '#F3F4F6'
  },
  blurb: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 20
  },
  formGroup: {
    marginBottom: 20
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    flex: 1,
    color: '#000000',
    backgroundColor: '#FFFFFF'
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4
  },
  codeAvailable: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600'
  },
  codeTaken: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600'
  },
  showHideText: {
    fontSize: 14,
    color: '#F472B6',
    fontWeight: '600',
    paddingHorizontal: 8
  },
  pickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  pickerButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#fff'
  },
  pickerButtonActive: {
    backgroundColor: '#F472B6',
    borderColor: '#F472B6'
  },
  pickerButtonText: {
    fontSize: 14,
    color: '#374151'
  },
  pickerButtonTextActive: {
    color: '#fff',
    fontWeight: '600'
  },
  buttonRow: {
    flexDirection: 'row',
    marginBottom: 16
  },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F472B6',
    backgroundColor: '#fff',
    alignItems: 'center'
  },
  secondaryButtonText: {
    fontSize: 14,
    color: '#F472B6',
    fontWeight: '600'
  },
  warningBox: {
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B'
  },
  warningIcon: {
    fontSize: 20,
    marginBottom: 4
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 4
  },
  warningText: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 18
  },
  startButton: {
    backgroundColor: '#F472B6',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8
  },
  startButtonDisabled: {
    backgroundColor: '#D1D5DB'
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff'
  },
  trackAFriendButtonLarge: {
    backgroundColor: '#F9FAFB',
    padding: 24,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  trackAFriendIcon: {
    fontSize: 32,
    marginBottom: 8
  },
  trackAFriendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F472B6'
  },
  trackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  trackIcon: {
    fontSize: 24,
    marginRight: 12
  },
  trackInfo: {
    flex: 1
  },
  trackName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2
  },
  trackStatus: {
    fontSize: 12,
    color: '#6B7280'
  },
  trackActions: {
    flexDirection: 'row',
    gap: 8
  },
  trackButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: '#F472B6'
  },
  trackButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600'
  },
  trackAFriendButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F472B6'
  },
  activeStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#D1FAE5',
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981'
  },
  activeStatusIcon: {
    fontSize: 24,
    marginRight: 12
  },
  activeStatusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#065F46'
  },
  activeStatusCode: {
    fontSize: 14,
    color: '#065F46'
  },
  copyButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#10B981'
  },
  copyButtonText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600'
  },
  sessionInfo: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16
  },
  sessionInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  sessionInfoLabel: {
    fontSize: 14,
    color: '#6B7280'
  },
  sessionInfoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151'
  },
  privacyReminder: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#E0E7FF',
    borderRadius: 8,
    marginBottom: 16
  },
  privacyIcon: {
    fontSize: 20,
    marginRight: 12
  },
  privacyText: {
    flex: 1,
    fontSize: 12,
    color: '#3730A3',
    lineHeight: 18
  },
  stopButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center'
  },
  stopButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff'
  }
};

export default JourneySharingPageV2;