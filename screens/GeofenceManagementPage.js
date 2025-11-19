import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, Switch } from 'react-native';
import { PageHeader } from '../components/PageHeader';
import { EditIcon, DeleteIcon } from '../components/Icons';
import { getAllGeofences, deleteGeofence, saveGeofence, getActiveGeofences } from '../services/geofenceStorage';
import { updateGeofenceMonitoring } from '../services/geofencingService';
import Svg, { Path, Circle } from 'react-native-svg';

const LocationIcon = ({ color = '#555' }) => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
      fill={color}
    />
  </Svg>
);

export default function GeofenceManagementPage({ navigation }) {
  const [geofences, setGeofences] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGeofences();
  }, []);

  const loadGeofences = async () => {
    try {
      const data = await getAllGeofences();
      setGeofences(Object.values(data));
    } catch (error) {
      console.error('Error loading geofences:', error);
      Alert.alert('Error', 'Failed to load geofences');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (geofence) => {
    try {
      const updatedGeofence = { ...geofence, active: !geofence.active };
      await saveGeofence(updatedGeofence);
      await loadGeofences();

      // Update monitoring
      const activeGeofences = await getActiveGeofences();
      await updateGeofenceMonitoring(activeGeofences);
    } catch (error) {
      console.error('Error toggling geofence:', error);
      Alert.alert('Error', 'Failed to update geofence');
    }
  };

  const handleEdit = (geofence) => {
    // FIX: Route is 'CreateGeofence', pass geofenceId via route params
    navigation.navigate('CreateGeofence', { geofenceId: geofence.id });
  };

  const handleDelete = (geofence) => {
    Alert.alert(
      'Delete Geofence',
      `Are you sure you want to delete "${geofence.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteGeofence(geofence.id);
              await loadGeofences();

              // Update monitoring
              const activeGeofences = await getActiveGeofences();
              await updateGeofenceMonitoring(activeGeofences);
            } catch (error) {
              console.error('Error deleting geofence:', error);
              Alert.alert('Error', 'Failed to delete geofence');
            }
          }
        }
      ]
    );
  };

  const handleAddNew = () => {
    navigation.navigate('CreateGeofence');
  };

  if (loading) {
    return (
      <View style={styles.fullPage}>
        <PageHeader title="Geofence Alerts" onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <Text>Loading geofences...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.fullPage}>
      <PageHeader title="Geofence Alerts" onBack={() => navigation.goBack()} />

      <View style={styles.container}>
        {geofences.length === 0 ? (
          <View style={styles.emptyState}>
            <LocationIcon color="#D1D5DB" />
            <Text style={styles.emptyStateText}>No location alerts yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Set up geofences to receive notifications when you arrive or leave locations
            </Text>
          </View>
        ) : (
          <FlatList
            data={geofences}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.geofenceCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.iconContainer}>
                    <LocationIcon color="#F9A8D4" />
                  </View>
                  <View style={styles.geofenceInfo}>
                    <Text style={styles.geofenceName}>{item.name}</Text>
                    <Text style={styles.geofenceRadius}>Radius: {item.radius}m</Text>
                  </View>
                  <Switch
                    value={item.active}
                    onValueChange={() => handleToggleActive(item)}
                    trackColor={{ false: '#D1D5DB', true: '#F9A8D4' }}
                    thumbColor={item.active ? '#fff' : '#f4f3f4'}
                  />
                </View>

                <View style={styles.notifySettings}>
                  <Text style={styles.settingLabel}>Notifications:</Text>
                  {item.notifyOnArrival && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>On Arrival</Text>
                    </View>
                  )}
                  {item.notifyOnDeparture && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>On Departure</Text>
                    </View>
                  )}
                </View>

                <View style={styles.contactsInfo}>
                  <Text style={styles.settingLabel}>
                    Notifying: {item.notifyContacts === 'all' ? 'All Emergency Contacts' : `${Array.isArray(item.notifyContacts) ? item.notifyContacts.length : 0} Contact(s)`}
                  </Text>
                </View>

                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleEdit(item)}
                  >
                    <EditIcon />
                    <Text style={styles.actionText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDelete(item)}
                  >
                    <DeleteIcon />
                    <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      <TouchableOpacity style={styles.floatingActionButton} onPress={handleAddNew}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  fullPage: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  container: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  emptyStateSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  geofenceCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  geofenceInfo: {
    flex: 1,
  },
  geofenceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  geofenceRadius: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  notifySettings: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  settingLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginRight: 8,
  },
  badge: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginTop: 4,
  },
  badgeText: {
    fontSize: 12,
    color: '#F9A8D4',
    fontWeight: '500',
  },
  contactsInfo: {
    marginBottom: 12,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
  },
  actionText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#555',
    fontWeight: '500',
  },
  deleteText: {
    color: '#EF4444',
  },
  floatingActionButton: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F9A8D4',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: {
    color: 'white',
    fontSize: 30,
    lineHeight: 34,
  },
});
