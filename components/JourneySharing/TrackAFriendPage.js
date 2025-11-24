import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator
} from 'react-native';
import { fetchLocation, listenToLocation } from '../../services/firebaseService';
import { validateShareCode, validatePassword as validatePasswordFormat, rateLimiter } from '../../utils/journeySharing/validation';
import {
  saveActiveSession,
  getActiveSessions,
  getEndedSessions,
  moveToEndedSessions,
  deleteEndedSession,
  addLocationToHistory
} from '../../utils/journeySharing/storage';

const TrackAFriendPage = ({ onBack, onNavigate }) => {
  // Store active listeners to clean them up
  const activeListenersRef = useRef({});
  const [shareCode, setShareCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [activeSessions, setActiveSessions] = useState([]);
  const [endedSessions, setEndedSessions] = useState([]);

  useEffect(() => {
    loadSessions();

    // Cleanup all listeners on unmount
    return () => {
      console.log('Cleaning up all Firebase listeners');
      Object.values(activeListenersRef.current).forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
      activeListenersRef.current = {};
    };
  }, []);

  const loadSessions = async () => {
    try {
      const active = await getActiveSessions();
      const ended = await getEndedSessions();
      setActiveSessions(active);
      setEndedSessions(ended);
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const handleStartTracking = async () => {
    console.log('=== START TRACKING BUTTON PRESSED ===');
    console.log('Share code:', shareCode);
    console.log('Password:', password ? '(provided)' : '(empty)');

    try {
      // Validate inputs
      console.log('Step 1: Validating inputs...');
      const codeValidation = validateShareCode(shareCode);
      if (!codeValidation.valid) {
        console.log('ERROR: Invalid share code:', codeValidation.error);
        Alert.alert('Invalid Share Code', codeValidation.error);
        return;
      }

      const passwordValidation = validatePasswordFormat(password);
      if (!passwordValidation.valid) {
        console.log('ERROR: Invalid password format:', passwordValidation.error);
        Alert.alert('Invalid Password', passwordValidation.error);
        return;
      }

      // Check rate limiting
      console.log('Step 2: Checking rate limits...');
      const rateLimit = rateLimiter.checkRateLimit(shareCode);
      if (rateLimit.limited) {
        console.log('ERROR: Rate limited');
        Alert.alert(
          'Too Many Attempts',
          `Too many failed attempts. Please try again in ${rateLimit.remainingMinutes} minutes.`
        );
        return;
      }

      setLoading(true);
      console.log('Step 3: Fetching and authenticating...');

      // Try to authenticate
      try {
        const data = await fetchLocation(shareCode, password);
        console.log('✓ Authentication successful!');
        console.log('Received data:', {
          hasLocation: !!data.location,
          active: data.active,
          lastUpdate: data.lastUpdate
        });

        // Success - record successful attempt
        rateLimiter.recordAttempt(shareCode, true);

        console.log('Step 4: Prompting for display name...');
        // Prompt for display name - using Alert.alert for Android compatibility
        promptForDisplayName(shareCode, password, data);

      } catch (error) {
        console.error('=== AUTHENTICATION FAILED ===');
        console.error('Error message:', error.message);
        console.error('Full error:', error);

        // Failed - record failed attempt
        rateLimiter.recordAttempt(shareCode, false);

        if (error.message === 'Share code not found') {
          Alert.alert('Not Found', 'Share code not found. Please check the code and try again.');
        } else if (error.message === 'Invalid password') {
          Alert.alert('Invalid Password', 'Invalid share code or password. Please try again.');
        } else {
          Alert.alert('Error', error.message || 'Failed to authenticate');
        }
      }

    } catch (error) {
      console.error('=== UNEXPECTED ERROR IN TRACKING FLOW ===');
      console.error('Error:', error);
      Alert.alert('Error', 'Failed to start tracking');
    } finally {
      setLoading(false);
      console.log('Loading state set to false');
    }
  };

  const promptForDisplayName = (shareCode, password, initialData) => {
    console.log('promptForDisplayName called');

    // Note: Alert.prompt is iOS-only. Using Alert.alert for cross-platform compatibility.
    // For a custom name, we'll use the share code as default and let users rename in settings.
    Alert.alert(
      'Start Tracking?',
      `You will start tracking this person's location.\n\nDisplay name: ${shareCode}\n\nYou can view their location on the map in real-time.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {
            console.log('User cancelled tracking');
            setLoading(false);
          }
        },
        {
          text: 'Start Tracking',
          onPress: async () => {
            console.log('User confirmed - starting tracking session');
            try {
              await startTrackingSession(shareCode, password, shareCode, initialData);
              console.log('✓ Tracking session started successfully!');
            } catch (error) {
              console.error('Error in startTrackingSession:', error);
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const startTrackingSession = async (shareCode, password, displayName, initialData) => {
    console.log('=== STARTING TRACKING SESSION ===');
    console.log('Session params:', {
      shareCode,
      displayName,
      hasLocation: !!initialData.location,
      active: initialData.active
    });

    try {
      const sessionId = `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log('Generated session ID:', sessionId);

      const session = {
        id: sessionId,
        shareCode,
        password, // Store encrypted in production
        displayName,
        startTime: Date.now(),
        lastUpdate: initialData.lastUpdate,
        updateInterval: initialData.updateInterval,
        locationHistory: initialData.location ? [initialData.location] : [],
        active: initialData.active
      };

      console.log('Step 5: Saving session to storage...');
      await saveActiveSession(session);
      console.log('✓ Session saved successfully');

      // Set up real-time listener
      console.log('Step 6: Setting up real-time listener...');
      setupRealtimeListener(session);
      console.log('✓ Real-time listener set up');

      console.log('Step 7: Showing success message...');
      Alert.alert('Success', `Now tracking ${displayName}!`);

      // Clear form
      console.log('Step 8: Clearing form...');
      setShareCode('');
      setPassword('');

      // Reload sessions
      console.log('Step 9: Reloading sessions...');
      await loadSessions();
      console.log('✓ Sessions reloaded');

      console.log('=== TRACKING SESSION STARTED SUCCESSFULLY ===');

    } catch (error) {
      console.error('=== ERROR IN startTrackingSession ===');
      console.error('Error message:', error.message);
      console.error('Full error:', error);
      Alert.alert('Error', 'Failed to start tracking session');
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeListener = (session) => {
    // Clean up existing listener if any
    if (activeListenersRef.current[session.id]) {
      activeListenersRef.current[session.id]();
      delete activeListenersRef.current[session.id];
    }

    const unsubscribe = listenToLocation(
      session.shareCode,
      session.password,
      async (data) => {
        if (data.error) {
          console.error('Listener error:', data.error);
          return;
        }

        if (!data.exists) {
          // Session deleted or doesn't exist
          await handleSessionEnded(session.id);
          // Clean up listener
          if (activeListenersRef.current[session.id]) {
            activeListenersRef.current[session.id]();
            delete activeListenersRef.current[session.id];
          }
          return;
        }

        if (!data.active) {
          // Session ended by sharer
          await handleSessionEnded(session.id);
          // Clean up listener
          if (activeListenersRef.current[session.id]) {
            activeListenersRef.current[session.id]();
            delete activeListenersRef.current[session.id];
          }
          return;
        }

        // Update location history
        if (data.location) {
          await addLocationToHistory(session.id, data.location);
        }
      }
    );

    // Store unsubscribe function for cleanup
    activeListenersRef.current[session.id] = unsubscribe;
    console.log(`Real-time listener set up for session ${session.id}`);
  };

  const handleSessionEnded = async (sessionId) => {
    try {
      await moveToEndedSessions(sessionId);
      await loadSessions();

      // Show notification
      // In production, use expo-notifications
      Alert.alert('Session Ended', 'The person has stopped sharing their location.');
    } catch (error) {
      console.error('Error handling session end:', error);
    }
  };

  const handleStopTracking = (session) => {
    Alert.alert(
      `Stop Tracking ${session.displayName}?`,
      'You won\'t receive any more location updates. Location history will be preserved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Stop Tracking',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clean up listener first
              if (activeListenersRef.current[session.id]) {
                activeListenersRef.current[session.id]();
                delete activeListenersRef.current[session.id];
                console.log(`Listener cleaned up for session ${session.id}`);
              }

              await moveToEndedSessions(session.id);
              await loadSessions();
              Alert.alert('Success', `Stopped tracking ${session.displayName}`);
            } catch (error) {
              console.error('Error stopping tracking:', error);
              Alert.alert('Error', 'Failed to stop tracking');
            }
          }
        }
      ]
    );
  };

  const handleDeleteHistory = (session) => {
    Alert.alert(
      'Delete Tracking History?',
      `This will permanently delete:\n• Location history for ${session.displayName}\n• Route traveled\n• All session data\n\nThis cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEndedSession(session.id);
              await loadSessions();
              Alert.alert('Success', 'History deleted');
            } catch (error) {
              console.error('Error deleting history:', error);
              Alert.alert('Error', 'Failed to delete history');
            }
          }
        }
      ]
    );
  };

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

  const formatDuration = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      const remainingMins = minutes % 60;
      return `${hours}h ${remainingMins}m`;
    }
    return `${minutes} minutes`;
  };

  const renderActiveSession = (session) => {
    const isOffline = session.lastUpdate && session.updateInterval &&
      (Date.now() - session.lastUpdate) > (session.updateInterval * 2000);

    return (
      <View key={session.id} style={styles.sessionCard}>
        <Text style={styles.sessionIcon}>📍</Text>
        <View style={styles.sessionInfo}>
          <Text style={styles.sessionName}>{session.displayName}</Text>
          <Text style={styles.sessionStatus}>
            Last update: {getTimeSinceUpdate(session.lastUpdate)}
          </Text>
          {isOffline && (
            <Text style={styles.offlineWarning}>⚠️ May be offline</Text>
          )}
        </View>
        <View style={styles.sessionActions}>
          <TouchableOpacity
            style={styles.viewButton}
            onPress={() => onNavigate && onNavigate('TrackingDetail', session.id)}
          >
            <Text style={styles.viewButtonText}>View Map</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.stopButton}
            onPress={() => handleStopTracking(session)}
          >
            <Text style={styles.stopButtonText}>Stop</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEndedSession = (session) => {
    const endTime = session.endTime ? new Date(session.endTime) : new Date();
    const duration = session.duration || 0;

    return (
      <View key={session.id} style={styles.sessionCard}>
        <Text style={styles.sessionIcon}>📍</Text>
        <View style={styles.sessionInfo}>
          <Text style={styles.sessionName}>{session.displayName}</Text>
          <Text style={styles.sessionStatus}>
            Session ended {getTimeSinceUpdate(session.endTime)}
          </Text>
          <Text style={styles.sessionDuration}>
            Duration: {formatDuration(duration)}
          </Text>
        </View>
        <View style={styles.sessionActions}>
          <TouchableOpacity
            style={styles.viewButton}
            onPress={() => onNavigate && onNavigate('TrackingDetail', session.id)}
          >
            <Text style={styles.viewButtonText}>View History</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteHistory(session)}
          >
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Track A Friend</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>START TRACKING</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Friend's Share Code</Text>
            <TextInput
              style={styles.input}
              value={shareCode}
              onChangeText={setShareCode}
              placeholder="Enter share code"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Text style={styles.showHideText}>{showPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.startTrackingButton, (!shareCode || !password) && styles.startTrackingButtonDisabled]}
            onPress={handleStartTracking}
            disabled={!shareCode || !password || loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.startTrackingButtonText}>Start Tracking</Text>
            )}
          </TouchableOpacity>

          <View style={styles.dataNotice}>
            <Text style={styles.dataNoticeIcon}>📊</Text>
            <Text style={styles.dataNoticeText}>
              Receiving real-time location updates uses cellular/WiFi data. Estimated usage: ~1-3 MB per hour.
              The app will listen for updates in the background.
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {activeSessions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ACTIVE TRACKING SESSIONS</Text>
            {activeSessions.map(renderActiveSession)}
          </View>
        )}

        {activeSessions.length === 0 && (
          <View style={styles.section}>
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>📍</Text>
              <Text style={styles.emptyStateText}>Not tracking anyone yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Enter a share code above to start tracking a friend's location in real-time.
              </Text>
            </View>
          </View>
        )}

        {endedSessions.length > 0 && (
          <>
            <View style={styles.divider} />
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>TRACKING HISTORY</Text>
              {endedSessions.map(renderEndedSession)}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
};

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
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6B7280',
    letterSpacing: 1,
    marginBottom: 16
  },
  divider: {
    height: 8,
    backgroundColor: '#F3F4F6'
  },
  formGroup: {
    marginBottom: 16
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#000000',
    backgroundColor: '#FFFFFF'
  },
  showHideText: {
    fontSize: 14,
    color: '#F472B6',
    fontWeight: '600',
    paddingHorizontal: 8,
    marginLeft: 8
  },
  startTrackingButton: {
    backgroundColor: '#F472B6',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8
  },
  startTrackingButtonDisabled: {
    backgroundColor: '#D1D5DB'
  },
  startTrackingButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff'
  },
  dataNotice: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    marginTop: 16
  },
  dataNoticeIcon: {
    fontSize: 16,
    marginRight: 8
  },
  dataNoticeText: {
    flex: 1,
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  sessionIcon: {
    fontSize: 28,
    marginRight: 12
  },
  sessionInfo: {
    flex: 1
  },
  sessionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4
  },
  sessionStatus: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2
  },
  sessionDuration: {
    fontSize: 12,
    color: '#6B7280'
  },
  offlineWarning: {
    fontSize: 12,
    color: '#F59E0B',
    marginTop: 2
  },
  sessionActions: {
    gap: 8
  },
  viewButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#F472B6'
  },
  viewButtonText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600'
  },
  stopButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#F472B6'
  },
  stopButtonText: {
    fontSize: 12,
    color: '#F472B6',
    fontWeight: '600'
  },
  deleteButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#EF4444'
  },
  deleteButtonText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600'
  },
  emptyState: {
    alignItems: 'center',
    padding: 32
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20
  }
};

export default TrackAFriendPage;
