import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  FlatList,
  StyleSheet
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { ref, onValue, off } from 'firebase/database';
import { database } from '../../services/firebase';
import { decryptLocation } from '../../utils/journeySharing/encryption';
import { getSession, moveToEndedSessions, deleteEndedSession, saveActiveSession } from '../../utils/journeySharing/storage';
import { isSharerOffline, getTimeSinceUpdate } from '../../services/firebaseService';

const TrackingDetailPage = ({ route, navigation }) => {
  // Support both navigation prop pattern and direct prop pattern
  const sessionId = route?.params?.sessionId;
  const onBack = navigation ? () => navigation.goBack() : () => {};

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mapRegion, setMapRegion] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);

  useEffect(() => {
    if (!sessionId) {
      console.error('[TrackingDetail] No sessionId provided');
      Alert.alert('Error', 'No session ID provided');
      if (navigation) navigation.goBack();
      return;
    }
    console.log('[TrackingDetail] Loading session:', sessionId);
    loadSession();
  }, [sessionId]);

  // Set up Firebase real-time listener for location updates
  useEffect(() => {
    if (!session || !session.shareCode || !session.active) {
      console.log('[Firebase Listener] No active session, skipping listener setup');
      return;
    }

    console.log('[Firebase Listener] Setting up real-time listener for:', session.shareCode);

    const locationRef = ref(database, `locations/${session.shareCode}`);

    // Set up real-time listener
    const unsubscribe = onValue(
      locationRef,
      (snapshot) => {
        console.log('[Firebase Listener] Update received');

        if (!snapshot.exists()) {
          console.log('[Firebase Listener] No data exists - session may have ended');
          return;
        }

        const data = snapshot.val();
        console.log('[Firebase Listener] Firebase data:', {
          active: data.active,
          hasEncryptedData: !!data.encryptedData,
          lastUpdate: data.lastUpdate
        });

        // Check if session has ended
        if (!data.active) {
          console.log('[Firebase Listener] Session has ended');
          // Update session to inactive
          setSession(prev => ({
            ...prev,
            active: false
          }));
          return;
        }

        try {
          // Decrypt location
          const location = decryptLocation(
            data.encryptedData,
            session.password,
            session.shareCode
          );

          console.log('[Firebase Listener] ✓ Location decrypted:', location);

          // Update session with new location
          setSession(prev => {
            // Check if this location is already in history
            const exists = prev.locationHistory?.some(
              loc => loc.timestamp === location.timestamp
            );

            if (exists) {
              console.log('[Firebase Listener] Location already in history, skipping');
              return {
                ...prev,
                lastUpdate: data.lastUpdate
              };
            }

            console.log('[Firebase Listener] Adding new location to history');
            const newHistory = [...(prev.locationHistory || []), location];

            // Save updated session to storage
            const updatedSession = {
              ...prev,
              locationHistory: newHistory,
              lastUpdate: data.lastUpdate
            };
            saveActiveSession(updatedSession).catch(err =>
              console.error('[Firebase Listener] Error saving to storage:', err)
            );

            return updatedSession;
          });

          // Update map region to show new location
          setMapRegion({
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421
          });

        } catch (error) {
          console.error('[Firebase Listener] ❌ Error decrypting location:', error);
        }
      },
      (error) => {
        console.error('[Firebase Listener] ❌ Firebase listener error:', error);
      }
    );

    // Cleanup listener when component unmounts or session changes
    return () => {
      console.log('[Firebase Listener] Cleaning up listener');
      off(locationRef);
    };
  }, [session?.shareCode, session?.password, session?.active]);

  const loadSession = async () => {
    try {
      console.log('[TrackingDetail] Fetching session from storage:', sessionId);
      const sessionData = await getSession(sessionId);

      if (!sessionData) {
        console.error('[TrackingDetail] Session not found in storage');
        Alert.alert(
          'Session Not Found',
          'This tracking session was not found. It may have been deleted or never created.',
          [{ text: 'OK', onPress: onBack }]
        );
        return;
      }

      console.log('[TrackingDetail] Session loaded successfully:', {
        id: sessionData.id,
        displayName: sessionData.displayName,
        isActive: sessionData.isActive,
        hasLocationHistory: !!sessionData.locationHistory,
        locationCount: sessionData.locationHistory?.length || 0
      });

      setSession(sessionData);

      // Set initial map region
      if (sessionData.locationHistory && sessionData.locationHistory.length > 0) {
        const latestLocation = sessionData.locationHistory[sessionData.locationHistory.length - 1];
        console.log('[TrackingDetail] Setting initial map region:', latestLocation);
        setMapRegion({
          latitude: latestLocation.latitude,
          longitude: latestLocation.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421
        });
      } else {
        console.log('[TrackingDetail] No location history available yet');
      }

      setLoading(false);
    } catch (error) {
      console.error('[TrackingDetail] Error loading session:', error);
      console.error('[TrackingDetail] Error details:', {
        message: error.message,
        stack: error.stack
      });
      Alert.alert(
        'Error',
        `Failed to load session: ${error.message || 'Unknown error'}`,
        [{ text: 'OK', onPress: onBack }]
      );
    }
  };

  const handleStopTracking = () => {
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
              await moveToEndedSessions(sessionId);
              Alert.alert('Success', `Stopped tracking ${session.displayName}`);
              onBack();
            } catch (error) {
              console.error('Error stopping tracking:', error);
              Alert.alert('Error', 'Failed to stop tracking');
            }
          }
        }
      ]
    );
  };

  const handleDeleteHistory = () => {
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
              await deleteEndedSession(sessionId);
              Alert.alert('Success', 'History deleted');
              onBack();
            } catch (error) {
              console.error('Error deleting history:', error);
              Alert.alert('Error', 'Failed to delete history');
            }
          }
        }
      ]
    );
  };

  const handleFitAllPoints = () => {
    if (!session || !session.locationHistory || session.locationHistory.length === 0) {
      return;
    }

    const locations = session.locationHistory;
    const latitudes = locations.map(l => l.latitude);
    const longitudes = locations.map(l => l.longitude);

    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLng = Math.min(...longitudes);
    const maxLng = Math.max(...longitudes);

    const midLat = (minLat + maxLat) / 2;
    const midLng = (minLng + maxLng) / 2;

    const deltaLat = (maxLat - minLat) * 1.5; // Add 50% padding
    const deltaLng = (maxLng - minLng) * 1.5;

    setMapRegion({
      latitude: midLat,
      longitude: midLng,
      latitudeDelta: Math.max(deltaLat, 0.01),
      longitudeDelta: Math.max(deltaLng, 0.01)
    });
  };

  const handleCenterOnCurrent = () => {
    if (!session || !session.locationHistory || session.locationHistory.length === 0) {
      return;
    }

    const latestLocation = session.locationHistory[session.locationHistory.length - 1];
    setMapRegion({
      latitude: latestLocation.latitude,
      longitude: latestLocation.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01
    });
  };

  const handleLocationPress = (location) => {
    setSelectedLocation(location);
    setMapRegion({
      latitude: location.latitude,
      longitude: location.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01
    });
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getDurationString = (startTime, endTime) => {
    const duration = endTime - startTime;
    const minutes = Math.floor(duration / 60000);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      const remainingMins = minutes % 60;
      return `${hours}h ${remainingMins}m`;
    }
    return `${minutes} minutes`;
  };

  const getSessionDuration = () => {
    if (!session || !session.locationHistory || session.locationHistory.length < 2) {
      return '0 minutes';
    }

    const firstLocation = session.locationHistory[0];
    const lastLocation = session.locationHistory[session.locationHistory.length - 1];

    return getDurationString(firstLocation.timestamp, lastLocation.timestamp);
  };

  const isOffline = () => {
    if (!session || !session.isActive) return false;
    return isSharerOffline(session.lastUpdate, session.updateInterval);
  };

  const renderTimelineItem = ({ item, index }) => {
    const isFirst = index === 0;
    const isLast = index === session.locationHistory.length - 1;

    return (
      <TouchableOpacity
        style={styles.timelineItem}
        onPress={() => handleLocationPress(item)}
      >
        <View style={styles.timelineMarker}>
          <View style={[
            styles.timelinePin,
            isLast && styles.timelinePinCurrent
          ]} />
          {!isFirst && <View style={styles.timelineLine} />}
        </View>
        <View style={styles.timelineContent}>
          <Text style={styles.timelineTitle}>
            {isLast && session.isActive ? 'Current Location' : 'Location'}
          </Text>
          <Text style={styles.timelineTimestamp}>
            {formatTimestamp(item.timestamp)}
            {isLast && session.isActive && ` (${getTimeSinceUpdate(item.timestamp)})`}
          </Text>
          <Text style={styles.timelineCoordinates}>
            {item.latitude.toFixed(6)}, {item.longitude.toFixed(6)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading || !session) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Loading...</Text>
        </View>
      </View>
    );
  }

  const hasLocations = session.locationHistory && session.locationHistory.length > 0;
  const coordinates = hasLocations ? session.locationHistory.map(l => ({
    latitude: l.latitude,
    longitude: l.longitude
  })) : [];

  const latestLocation = hasLocations ? session.locationHistory[session.locationHistory.length - 1] : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tracking {session.displayName}</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Map Section */}
        <View style={styles.mapContainer}>
          {hasLocations && mapRegion ? (
            <MapView
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              region={mapRegion}
              onRegionChangeComplete={setMapRegion}
            >
              {/* Route line */}
              {coordinates.length > 1 && (
                <Polyline
                  coordinates={coordinates}
                  strokeColor="#F472B6"
                  strokeWidth={3}
                />
              )}

              {/* Location markers */}
              {session.locationHistory.map((location, index) => {
                const isLatest = index === session.locationHistory.length - 1;
                return (
                  <Marker
                    key={index}
                    coordinate={{
                      latitude: location.latitude,
                      longitude: location.longitude
                    }}
                    pinColor={isLatest ? '#F472B6' : '#6B7280'}
                    title={isLatest && session.isActive ? 'Current Location' : `Location ${index + 1}`}
                    description={formatTimestamp(location.timestamp)}
                  />
                );
              })}
            </MapView>
          ) : (
            <View style={styles.noMapPlaceholder}>
              <Text style={styles.noMapText}>No location data available</Text>
            </View>
          )}

          {/* Map controls */}
          {hasLocations && (
            <View style={styles.mapControls}>
              <TouchableOpacity style={styles.mapButton} onPress={handleCenterOnCurrent}>
                <Text style={styles.mapButtonText}>📍 Current</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.mapButton} onPress={handleFitAllPoints}>
                <Text style={styles.mapButtonText}>🗺️ Fit All</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Session Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SESSION INFO</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status:</Text>
            <View style={styles.infoValueContainer}>
              {session.isActive ? (
                <>
                  {isOffline() ? (
                    <>
                      <Text style={styles.statusIcon}>⚠️</Text>
                      <Text style={styles.infoValue}>May be offline</Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.statusIcon}>🟢</Text>
                      <Text style={styles.infoValue}>Active</Text>
                    </>
                  )}
                </>
              ) : (
                <>
                  <Text style={styles.statusIcon}>❌</Text>
                  <Text style={styles.infoValue}>Session ended</Text>
                </>
              )}
            </View>
          </View>

          {session.isActive && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Last update:</Text>
              <Text style={styles.infoValue}>
                {session.lastUpdate ? getTimeSinceUpdate(session.lastUpdate) : 'Unknown'}
              </Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Duration:</Text>
            <Text style={styles.infoValue}>{getSessionDuration()}</Text>
          </View>

          {session.isActive && session.updateInterval && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Updates every:</Text>
              <Text style={styles.infoValue}>{session.updateInterval / 60} minutes</Text>
            </View>
          )}

          {isOffline() && (
            <View style={styles.offlineWarning}>
              <Text style={styles.offlineWarningIcon}>⚠️</Text>
              <Text style={styles.offlineWarningText}>
                No updates for {getTimeSinceUpdate(session.lastUpdate)}{'\n'}
                Last known location shown above. They may be in an area with poor network connection or their phone may be off. This may not be a cause for concern.
                {session.updateInterval && `\n\nExpected update interval: ${session.updateInterval / 60} minutes`}
              </Text>
            </View>
          )}
        </View>

        {/* Location Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>LOCATION TIMELINE</Text>

          {hasLocations ? (
            <View style={styles.timelineContainer}>
              <FlatList
                data={[...session.locationHistory].reverse()}
                renderItem={renderTimelineItem}
                keyExtractor={(item, index) => `location-${index}`}
                scrollEnabled={false}
              />
            </View>
          ) : (
            <Text style={styles.noLocationsText}>No location history available</Text>
          )}
        </View>

        {/* Actions */}
        <View style={styles.section}>
          {session.isActive ? (
            <TouchableOpacity
              style={styles.stopTrackingButton}
              onPress={handleStopTracking}
            >
              <Text style={styles.stopTrackingButtonText}>Stop Tracking</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.deleteHistoryButton}
              onPress={handleDeleteHistory}
            >
              <Text style={styles.deleteHistoryButtonText}>Delete History</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const { width } = Dimensions.get('window');

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
  mapContainer: {
    height: 400,
    backgroundColor: '#F3F4F6',
    position: 'relative'
  },
  map: {
    ...StyleSheet.absoluteFillObject
  },
  noMapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  noMapText: {
    fontSize: 16,
    color: '#6B7280'
  },
  mapControls: {
    position: 'absolute',
    top: 16,
    right: 16,
    gap: 8
  },
  mapButton: {
    backgroundColor: 'white',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  mapButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151'
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6B7280',
    letterSpacing: 1,
    marginBottom: 16
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    alignItems: 'center'
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280'
  },
  infoValueContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151'
  },
  statusIcon: {
    fontSize: 16,
    marginRight: 4
  },
  offlineWarning: {
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 8,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    flexDirection: 'row'
  },
  offlineWarningIcon: {
    fontSize: 20,
    marginRight: 8
  },
  offlineWarningText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    lineHeight: 18
  },
  timelineContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16
  },
  timelineMarker: {
    width: 30,
    alignItems: 'center',
    position: 'relative'
  },
  timelinePin: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#6B7280',
    borderWidth: 2,
    borderColor: '#fff',
    zIndex: 2
  },
  timelinePinCurrent: {
    backgroundColor: '#F472B6',
    width: 16,
    height: 16,
    borderRadius: 8
  },
  timelineLine: {
    position: 'absolute',
    top: -16,
    left: '50%',
    marginLeft: -1,
    width: 2,
    height: 32,
    backgroundColor: '#D1D5DB'
  },
  timelineContent: {
    flex: 1,
    paddingLeft: 12
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4
  },
  timelineTimestamp: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2
  },
  timelineCoordinates: {
    fontSize: 11,
    color: '#9CA3AF',
    fontFamily: 'monospace'
  },
  noLocationsText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingVertical: 32
  },
  stopTrackingButton: {
    backgroundColor: '#F472B6',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center'
  },
  stopTrackingButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff'
  },
  deleteHistoryButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center'
  },
  deleteHistoryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff'
  }
};

export default TrackingDetailPage;
