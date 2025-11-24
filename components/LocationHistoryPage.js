import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Modal,
  TextInput,
  Alert,
  Platform,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import Svg, { Path, Circle } from 'react-native-svg';
import {
  getLocationSettings,
  saveLocationSettings,
  getLocationHistory,
  getLocationLabels,
  addLocationLabel,
  removeLocationLabel,
  clearLocationHistory,
  filterLocationsByTimeframe,
  formatDuration,
  calculateDistance,
} from '../utils/locationHistoryStorage';
import {
  startLocationHistoryTracking,
  stopLocationHistoryTracking,
  updateTrackingInterval,
  isLocationHistoryTrackingActive,
} from '../utils/locationHistoryTracker';

// Icons
const CloseIcon = ({ color = '#333' }) => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Path d="M18 6L6 18" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M6 6L18 18" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const MapPinIcon = ({ color = '#555', size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21 10C21 17 12 23 12 23C12 23 3 17 3 10C3 7.61305 3.94821 5.32387 5.63604 3.63604C7.32387 1.94821 9.61305 1 12 1C14.3869 1 16.6761 1.94821 18.364 3.63604C20.0518 5.32387 21 7.61305 21 10Z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M12 13C13.6569 13 15 11.6569 15 10C15 8.34315 13.6569 7 12 7C10.3431 7 9 8.34315 9 10C9 11.6569 10.3431 13 12 13Z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const SettingsIcon = ({ color = '#555' }) => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth="2" />
  </Svg>
);

const ChevronDownIcon = ({ color = '#555' }) => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <Path
      d="M7 10L12 15L17 10"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const EditIcon = ({ color = '#555' }) => (
  <Svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <Path
      d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M18.5 2.49998C18.8978 2.10216 19.4374 1.87866 20 1.87866C20.5626 1.87866 21.1022 2.10216 21.5 2.49998C21.8978 2.89781 22.1213 3.43737 22.1213 3.99998C22.1213 4.56259 21.8978 5.10216 21.5 5.49998L12 15L8 16L9 12L18.5 2.49998Z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const TrashIcon = ({ color = '#EF4444' }) => (
  <Svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 6H5H21"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// *** MODIFIED: Added navigation prop ***
const LocationHistoryPage = ({ navigation }) => {
  // State management
  const [settings, setSettings] = useState(null);
  const [locationHistory, setLocationHistory] = useState([]);
  const [filteredHistory, setFilteredHistory] = useState([]);
  const [labels, setLabels] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showDisclosure, setShowDisclosure] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showTimeframePicker, setShowTimeframePicker] = useState(false);
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [labelInput, setLabelInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [trackingStatus, setTrackingStatus] = useState('inactive');
  const mapRef = useRef(null);

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  // Filter history when timeframe changes
  useEffect(() => {
    if (locationHistory.length > 0) {
      const filtered = filterLocationsByTimeframe(
        locationHistory,
        selectedTimeframe,
        customStartDate,
        customEndDate
      );
      setFilteredHistory(filtered);
    }
  }, [locationHistory, selectedTimeframe, customStartDate, customEndDate]);

  // Get current location
  useEffect(() => {
    getCurrentLocation();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [settingsData, historyData, labelsData] = await Promise.all([
        getLocationSettings(),
        getLocationHistory(),
        getLocationLabels(),
      ]);

      setSettings(settingsData);
      setLocationHistory(historyData);
      setLabels(labelsData);

      // Check tracking status
      // FIX: Don't automatically restart tracking on load, just check if it's running
      if (settingsData.enabled) {
        const isTracking = await isLocationHistoryTrackingActive();
        if (isTracking) {
          setTrackingStatus('active');
        } else {
          // Tracking is supposed to be enabled but isn't running
          // This can happen after app restart - set to inactive and let user toggle
          setTrackingStatus('inactive');
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load location history data');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setCurrentLocation(location.coords);
      }
    } catch (error) {
      console.error('Error getting current location:', error);
    }
  };

  const handleToggleTracking = async (value) => {
    if (value && !settings.enabled) {
      // Show disclosure dialog first
      setShowDisclosure(true);
    } else if (!value && settings.enabled) {
      // Disable tracking
      await stopLocationHistoryTracking();
      const updatedSettings = { ...settings, enabled: false };
      await saveLocationSettings(updatedSettings);
      setSettings(updatedSettings);
      setTrackingStatus('inactive');
      Alert.alert('Location History Disabled', 'Location tracking has been turned off.');
    }
  };

  const handleAcceptDisclosure = async () => {
    setShowDisclosure(false);

    // Request permissions
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();

    if (foregroundStatus !== 'granted') {
      Alert.alert(
        'Permission Denied',
        'Location permission is required for Location History. Please enable it in your device settings.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Request background permission
    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();

    if (backgroundStatus !== 'granted') {
      Alert.alert(
        'Background Permission Required',
        'Location History requires "Always" location permission to track in the background. Please enable it in your device settings.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Enable tracking
    const updatedSettings = { ...settings, enabled: true };
    await saveLocationSettings(updatedSettings);
    setSettings(updatedSettings);

    // Start background tracking
    try {
      const trackingStarted = await startLocationHistoryTracking();
      if (trackingStarted) {
        setTrackingStatus('active');
        Alert.alert(
          'Location History Enabled',
          'Background location tracking is now active. Your location will be recorded every ' +
            settings.updateInterval +
            ' minutes.'
        );
      } else {
        // If tracking didn't start but permissions were granted, it might already be running
        // Set to active anyway since permissions are confirmed
        setTrackingStatus('active');
        console.log('Location tracking may already be running');
      }
    } catch (error) {
      console.error('Error starting location tracking:', error);
      setTrackingStatus('inactive');
      Alert.alert(
        'Error',
        'An unexpected error occurred while starting location tracking. Please try again.'
      );
    }
  };

  const handleUpdateInterval = async (interval) => {
    const updatedSettings = { ...settings, updateInterval: interval };
    await saveLocationSettings(updatedSettings);
    setSettings(updatedSettings);

    // Restart tracking with new interval if currently active
    if (settings.enabled) {
      await updateTrackingInterval(interval);
    }

    if (interval < 5) {
      Alert.alert(
        'Battery Warning',
        'Updates every ' +
          interval +
          ' minutes will significantly drain your battery. Consider using a longer interval or keeping your device charged.'
      );
    }
  };

  const handleAutoDelete = async (period) => {
    const updatedSettings = { ...settings, autoDeletePeriod: period };
    await saveLocationSettings(updatedSettings);
    setSettings(updatedSettings);
  };

  const handleMarkerPress = (location) => {
    setSelectedLocation(location);
    setLabelInput(location.label || '');
    setShowLabelModal(true);
  };

  const handleSaveLabel = async () => {
    if (!labelInput.trim()) {
      Alert.alert('Error', 'Please enter a label');
      return;
    }

    await addLocationLabel(
      selectedLocation.latitude,
      selectedLocation.longitude,
      labelInput.trim()
    );

    // Reload data
    await loadData();
    setShowLabelModal(false);
    setLabelInput('');
    setSelectedLocation(null);
  };

  const handleQuickLabel = async (label) => {
    await addLocationLabel(selectedLocation.latitude, selectedLocation.longitude, label);
    await loadData();
    setShowLabelModal(false);
    setSelectedLocation(null);
  };

  const handleRemoveLabel = async () => {
    if (!selectedLocation.label) {
      Alert.alert('No Label', 'This location does not have a label.');
      return;
    }

    Alert.alert(
      'Remove Label',
      `Remove label "${selectedLocation.label}"? (Location history will remain)`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await addLocationLabel(
              selectedLocation.latitude,
              selectedLocation.longitude,
              null
            );
            await loadData();
            setShowLabelModal(false);
            setSelectedLocation(null);
          },
        },
      ]
    );
  };

  const handleClearHistory = () => {
    setShowClearModal(true);
  };

  const handleConfirmClear = async (timeframe) => {
    setShowClearModal(false);

    Alert.alert(
      'Confirm Clear History',
      `Are you sure you want to delete location history for ${timeframe}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearLocationHistory(
              timeframe,
              timeframe === 'custom' ? customStartDate : null,
              timeframe === 'custom' ? customEndDate : null
            );
            await loadData();
            Alert.alert('Success', `Location history cleared for ${timeframe}`);
          },
        },
      ]
    );
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          {/* *** MODIFIED: Use navigation.goBack() *** */}
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Location History</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F472B6" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          {/* *** MODIFIED: Use navigation.goBack() *** */}
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
             <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Location History</Text>
        </View>

        {/* Master Toggle */}
        <View style={styles.toggleSection}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleTextContainer}>
              <Text style={styles.toggleLabel}>Enable Location History</Text>
              {settings.enabled && trackingStatus === 'active' && (
                <Text style={styles.trackingActive}>🟢 Tracking Active</Text>
              )}
              {settings.enabled && trackingStatus === 'permission_denied' && (
                <Text style={styles.trackingInactive}>⚠️ Permission Required</Text>
              )}
            </View>
            <Switch
              value={settings.enabled}
              onValueChange={handleToggleTracking}
              trackColor={{ false: '#D1D5DB', true: '#F9A8D4' }}
              thumbColor={settings.enabled ? '#F472B6' : '#F3F4F6'}
            />
          </View>
        </View>

        {/* Battery Warning */}
        <View style={styles.batteryWarning}>
          <Text style={styles.batteryWarningTitle}>🔋 Battery Usage Notice</Text>
          <Text style={styles.batteryWarningText}>
            Continuous location tracking uses GPS and will drain your battery faster than normal.
            More frequent updates (&lt; 10 minutes) will significantly impact battery life.
          </Text>
        </View>

        {/* Timeframe Filter */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Timeframe</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowTimeframePicker(!showTimeframePicker)}
          >
            <Text style={styles.pickerButtonText}>
              {selectedTimeframe === 'today'
                ? 'Today'
                : selectedTimeframe === 'yesterday'
                ? 'Yesterday'
                : selectedTimeframe === 'week'
                ? 'This Week'
                : selectedTimeframe === 'month'
                ? 'This Month'
                : 'Custom Range'}
            </Text>
            <ChevronDownIcon />
          </TouchableOpacity>

          {showTimeframePicker && (
            <View style={styles.pickerDropdown}>
              {['today', 'yesterday', 'week', 'month', 'custom'].map((tf) => (
                <TouchableOpacity
                  key={tf}
                  style={styles.pickerOption}
                  onPress={() => {
                    setSelectedTimeframe(tf);
                    setShowTimeframePicker(false);
                  }}
                >
                  <Text style={styles.pickerOptionText}>
                    {tf === 'today'
                      ? 'Today'
                      : tf === 'yesterday'
                      ? 'Yesterday'
                      : tf === 'week'
                      ? 'This Week'
                      : tf === 'month'
                      ? 'This Month'
                      : 'Custom Range'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {selectedTimeframe === 'custom' && (
            <View style={styles.customDateContainer}>
              <TextInput
                style={styles.dateInput}
                placeholder="Start Date (YYYY-MM-DD)"
                placeholderTextColor="#9CA3AF" // *** MODIFIED: Added placeholder color ***
                value={customStartDate}
                onChangeText={setCustomStartDate}
              />
              <TextInput
                style={styles.dateInput}
                placeholder="End Date (YYYY-MM-DD)"
                placeholderTextColor="#9CA3AF" // *** MODIFIED: Added placeholder color ***
                value={customEndDate}
                onChangeText={setCustomEndDate}
              />
            </View>
          )}
        </View>

        {/* Map View - FIX: Show map even when no history, use current location */}
        {(filteredHistory.length > 0 || currentLocation) && (
          <View style={styles.mapContainer}>
            <MapView
              ref={mapRef}
              style={styles.map}
              provider={PROVIDER_GOOGLE}
              initialRegion={{
                latitude: filteredHistory.length > 0
                  ? filteredHistory[0].latitude
                  : currentLocation?.latitude || 37.78825,
                longitude: filteredHistory.length > 0
                  ? filteredHistory[0].longitude
                  : currentLocation?.longitude || -122.4324,
                latitudeDelta: 0.0922,
                longitudeDelta: 0.0421,
              }}
            >
              {/* Current Location */}
              {currentLocation && (
                <Marker
                  coordinate={{
                    latitude: currentLocation.latitude,
                    longitude: currentLocation.longitude,
                  }}
                  title="You are here"
                  pinColor="#3B82F6"
                />
              )}

              {/* Historical Locations */}
              {filteredHistory.map((location, index) => (
                <Marker
                  key={location.id}
                  coordinate={{
                    latitude: location.latitude,
                    longitude: location.longitude,
                  }}
                  title={location.label || 'Location'}
                  description={
                    location.duration > 0
                      ? `Duration: ${formatDuration(location.duration)}`
                      : formatTimestamp(location.timestamp)
                  }
                  onPress={() => handleMarkerPress(location)}
                  pinColor="#F472B6"
                />
              ))}

              {/* Route Polyline */}
              {filteredHistory.length > 1 && (
                <Polyline
                  coordinates={filteredHistory.map((loc) => ({
                    latitude: loc.latitude,
                    longitude: loc.longitude,
                  }))}
                  strokeColor="#F472B6"
                  strokeWidth={2}
                />
              )}
            </MapView>
          </View>
        )}

        {/* FIX: Only show empty state if no map is displayed */}
        {filteredHistory.length === 0 && !currentLocation && (
          <View style={styles.emptyState}>
            <MapPinIcon size={48} color="#D1D5DB" />
            <Text style={styles.emptyStateText}>
              No location history for selected timeframe
            </Text>
            {!settings.enabled && (
              <Text style={styles.emptyStateSubtext}>
                Enable Location History above to start tracking
              </Text>
            )}
          </View>
        )}

        {/* Timeline View */}
        {filteredHistory.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Timeline</Text>
            {filteredHistory
              .slice()
              .reverse()
              .map((location, index) => (
                <TouchableOpacity
                  key={location.id}
                  style={styles.timelineItem}
                  onPress={() => handleMarkerPress(location)}
                >
                  <View style={styles.timelineIconContainer}>
                    <MapPinIcon size={20} color="#F472B6" />
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineLabel}>
                      {location.label || 'Unlabeled Location'}
                    </Text>
                    {location.duration > 0 && (
                      <Text style={styles.timelineDuration}>
                        {formatDuration(location.duration)}
                      </Text>
                    )}
                    <Text style={styles.timelineTime}>
                      {formatTimestamp(location.timestamp)}
                      {location.endTimestamp &&
                        ` - ${formatTimestamp(location.endTimestamp)}`}
                    </Text>
                    <Text style={styles.timelineDate}>{formatDate(location.timestamp)}</Text>
                  </View>
                </TouchableOpacity>
              ))}
          </View>
        )}

        {/* Settings Section */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.settingsToggle}
            onPress={() => setShowSettings(!showSettings)}
          >
            <Text style={styles.sectionTitle}>Settings</Text>
            <ChevronDownIcon />
          </TouchableOpacity>

          {showSettings && (
            <View style={styles.settingsContent}>
              {/* Update Interval */}
              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Location Update Interval</Text>
                <View style={styles.intervalButtons}>
                  {[1, 5, 10, 15, 30, 60].map((interval) => (
                    <TouchableOpacity
                      key={interval}
                      style={[
                        styles.intervalButton,
                        settings.updateInterval === interval && styles.intervalButtonActive,
                      ]}
                      onPress={() => handleUpdateInterval(interval)}
                    >
                      <Text
                        style={[
                          styles.intervalButtonText,
                          settings.updateInterval === interval &&
                            styles.intervalButtonTextActive,
                        ]}
                      >
                        {interval} min
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Auto-Delete */}
              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Auto-delete history older than:</Text>
                <View style={styles.autoDeleteButtons}>
                  {[
                    { label: 'Never', value: 'never' },
                    { label: '7 days', value: '7days' },
                    { label: '30 days', value: '30days' },
                    { label: '90 days', value: '90days' },
                    { label: '6 months', value: '180days' },
                    { label: '1 year', value: '365days' },
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.autoDeleteButton,
                        settings.autoDeletePeriod === option.value &&
                          styles.autoDeleteButtonActive,
                      ]}
                      onPress={() => handleAutoDelete(option.value)}
                    >
                      <Text
                        style={[
                          styles.autoDeleteButtonText,
                          settings.autoDeletePeriod === option.value &&
                            styles.autoDeleteButtonTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.settingHint}>
                  Old location data will be automatically deleted. Your location labels will be
                  preserved.
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Clear History Button */}
        <TouchableOpacity style={styles.clearButton} onPress={handleClearHistory}>
          <TrashIcon />
          <Text style={styles.clearButtonText}>Clear Location History</Text>
        </TouchableOpacity>

        {/* Export/Backup Placeholders (Disabled) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Export & Backup (Coming Soon)</Text>
          <TouchableOpacity style={styles.disabledButton} disabled>
            <Text style={styles.disabledButtonText}>Export to CSV</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.disabledButton} disabled>
            <Text style={styles.disabledButtonText}>Backup to Cloud</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Disclosure Modal */}
      <Modal
        visible={showDisclosure}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDisclosure(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowDisclosure(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Location History Tracking</Text>
            <Text style={styles.modalText}>
              This feature continuously tracks your location in the background to create a
              detailed record of where you've been. This can be valuable evidence for legal
              proceedings or safety situations.
            </Text>
            <Text style={styles.modalBullet}>
              • Your location data is stored locally on your device
            </Text>
            <Text style={styles.modalBullet}>
              • Location tracking uses GPS and will impact battery life
            </Text>
            <Text style={styles.modalBullet}>• You can delete your history at any time</Text>
            <Text style={styles.modalBullet}>• You control when tracking is on or off</Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={() => setShowDisclosure(false)}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonConfirm}
                onPress={handleAcceptDisclosure}
              >
                <Text style={styles.modalButtonConfirmText}>Enable</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Label Modal */}
      <Modal
        visible={showLabelModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLabelModal(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowLabelModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Label this location</Text>

            <TextInput
              style={styles.labelInput}
              placeholder="Enter custom label"
              placeholderTextColor="#9CA3AF" // *** MODIFIED: Added placeholder color ***
              value={labelInput}
              onChangeText={setLabelInput}
            />

            <Text style={styles.quickLabelTitle}>Quick labels:</Text>
            <View style={styles.quickLabels}>
              {['Home', 'Work', 'School', 'Gym', "Friend's House", 'Restaurant'].map(
                (label) => (
                  <TouchableOpacity
                    key={label}
                    style={styles.quickLabelButton}
                    onPress={() => handleQuickLabel(label)}
                  >
                    <Text style={styles.quickLabelText}>{label}</Text>
                  </TouchableOpacity>
                )
              )}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={() => setShowLabelModal(false)}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              {selectedLocation?.label && (
                <TouchableOpacity
                  style={styles.modalButtonRemove}
                  onPress={handleRemoveLabel}
                >
                  <Text style={styles.modalButtonRemoveText}>Remove</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.modalButtonConfirm} onPress={handleSaveLabel}>
                <Text style={styles.modalButtonConfirmText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Clear History Modal */}
      <Modal
        visible={showClearModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowClearModal(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowClearModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Clear Location History</Text>
            <Text style={styles.modalText}>Choose what to delete:</Text>

            <View style={styles.clearOptions}>
              {['today', 'yesterday', 'week', 'month', 'all'].map((tf) => (
                <TouchableOpacity
                  key={tf}
                  style={styles.clearOptionButton}
                  onPress={() => handleConfirmClear(tf)}
                >
                  <Text style={styles.clearOptionText}>
                    {tf === 'today'
                      ? 'Today'
                      : tf === 'yesterday'
                      ? 'Yesterday'
                      : tf === 'week'
                      ? 'This Week'
                      : tf === 'month'
                      ? 'This Month'
                      : 'All History'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.warningText}>
              ⚠️ Warning: This action cannot be undone. Your location labels will be preserved.
            </Text>

            <TouchableOpacity
              style={styles.modalButtonCancel}
              onPress={() => setShowClearModal(false)}
            >
              <Text style={styles.modalButtonCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F8',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    marginRight: 16,
  },
  backButtonText: {
    color: '#F472B6',
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  toggleSection: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleTextContainer: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  trackingActive: {
    fontSize: 12,
    color: '#10B981',
    marginTop: 4,
  },
  trackingInactive: {
    fontSize: 12,
    color: '#F59E0B',
    marginTop: 4,
  },
  batteryWarning: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  batteryWarningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 4,
  },
  batteryWarningText: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 18,
  },
  section: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  pickerButtonText: {
    fontSize: 14,
    color: '#1F2937',
  },
  pickerDropdown: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  pickerOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  pickerOptionText: {
    fontSize: 14,
    color: '#1F2937',
  },
  customDateContainer: {
    marginTop: 12,
  },
  dateInput: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    marginBottom: 8,
    fontSize: 14,
  },
  mapContainer: {
    height: 300,
    marginBottom: 8,
    backgroundColor: '#F3F4F6',
  },
  map: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    padding: 48,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
  timelineItem: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  timelineIconContainer: {
    marginRight: 12,
    paddingTop: 2,
  },
  timelineContent: {
    flex: 1,
  },
  timelineLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  timelineDuration: {
    fontSize: 14,
    color: '#F472B6',
    marginBottom: 2,
  },
  timelineTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  timelineDate: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  settingsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingsContent: {
    marginTop: 12,
  },
  settingItem: {
    marginBottom: 20,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  intervalButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  intervalButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  intervalButtonActive: {
    backgroundColor: '#F472B6',
    borderColor: '#F472B6',
  },
  intervalButtonText: {
    fontSize: 14,
    color: '#1F2937',
  },
  intervalButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  autoDeleteButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  autoDeleteButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  autoDeleteButtonActive: {
    backgroundColor: '#F472B6',
    borderColor: '#F472B6',
  },
  autoDeleteButtonText: {
    fontSize: 13,
    color: '#1F2937',
  },
  autoDeleteButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  settingHint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
    fontStyle: 'italic',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    margin: 16,
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
    marginLeft: 8,
  },
  disabledButton: {
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    marginBottom: 8,
    opacity: 0.6,
  },
  disabledButtonText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  modalText: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 12,
    lineHeight: 20,
  },
  modalBullet: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 8,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
    gap: 12,
  },
  modalButtonCancel: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  modalButtonCancelText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  modalButtonConfirm: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#F472B6',
  },
  modalButtonConfirmText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  modalButtonRemove: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
  },
  modalButtonRemoveText: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '600',
  },
  labelInput: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    fontSize: 14,
    marginBottom: 16,
  },
  quickLabelTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  quickLabels: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  quickLabelButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  quickLabelText: {
    fontSize: 13,
    color: '#1F2937',
  },
  clearOptions: {
    marginVertical: 16,
  },
  clearOptionButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    marginBottom: 8,
  },
  clearOptionText: {
    fontSize: 14,
    color: '#1F2937',
    textAlign: 'center',
  },
  warningText: {
    fontSize: 12,
    color: '#DC2626',
    marginBottom: 16,
    textAlign: 'center',
  },
});

export default LocationHistoryPage;