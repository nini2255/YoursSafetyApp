import React, { useState, useEffect } from 'react';
// ADDED Platform to imports below:
import { View, Text, StyleSheet, TouchableOpacity, Alert, Switch, Platform } from 'react-native';
import { PageHeader } from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';
import * as Notifications from 'expo-notifications';

// --- IMPORT NOTIFICATION SERVICE ---
import { showSafetyBanner, hideSafetyBanner } from '../services/NotificationActionService';

export const SettingsPage = ({ navigation }) => {
  const { logout } = useAuth();
  const [isBannerActive, setIsBannerActive] = useState(false);

  // Optional: Check if notifications are currently active when page loads
  useEffect(() => {
    checkNotificationStatus();
  }, []);

  const checkNotificationStatus = async () => {
    const displayed = await Notifications.getPresentedNotificationsAsync();
    // Check if our specific safety category notification is currently displayed
    const isSafetyShowing = displayed.some(n => n.request.content.categoryIdentifier === 'SAFETY_CONTROL_BANNER');
    setIsBannerActive(isSafetyShowing);
  };

  const handleLogout = () => {
    try {
      // Ensure banner is removed on logout
      hideSafetyBanner();
      logout();
    } catch (e) {
      console.warn('Logout failed', e);
      Alert.alert('Error', 'Could not log out');
    }
  };

  // --- NEW: Handler for the Safety Banner Toggle ---
  const toggleSafetyBanner = async (value) => {
    // Optimistically update UI state
    setIsBannerActive(value);
    
    try {
      if (value) {
        await showSafetyBanner();
         // Optional feedback
         if (Platform.OS === 'android') {
             // You could add ToastAndroid here if desired
         }
      } else {
        await hideSafetyBanner();
      }
    } catch (error) {
      console.error("Failed to toggle banner:", error);
      Alert.alert("Error", "Could not update safety banner state.");
      // Revert state on failure
      setIsBannerActive(!value);
    }
  };

  return (
    <View style={styles.fullPage}>
      <PageHeader title="Settings" onBack={() => navigation.goBack()} />
      <View style={styles.pageContainer}>
        
        {/* --- NEW: Safety Banner Toggle Row --- */}
        <View style={styles.toggleContainer}>
            <Text style={styles.toggleLabel}>Active Safety Banner</Text>
            <Switch style={styles.toggleSwitch}
                trackColor={{ false: "#E5E7EB", true: "#FEE2E2" }}
                thumbColor={isBannerActive ? "#EF4444" : Platform.OS === 'ios'? "#E5E7EB" : "#9CA3AF"}
                ios_backgroundColor="#E5E7EB"
                onValueChange={toggleSafetyBanner}
                value={isBannerActive}
            />
        </View>
        <Text style={styles.helperText}>
            Shows a persistent notification to quickly trigger Panic or Fake Call from outside the app.
        </Text>

        <TouchableOpacity 
          style={styles.buttonStyle} 
          onPress={() => navigation.navigate('UserProfileSettings')}
        >
             <Text style={styles.linkText}>User Profile</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.buttonStyle} 
          onPress={() => navigation.navigate('FakeCallSettings')}
        >
          <Text style={styles.linkText}>Fake Call Settings</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.buttonStyle} 
          onPress={() => navigation.navigate('DiscreetMode')}
        >
          <Text style={styles.linkText}>Discreet Mode</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.buttonStyle} 
          onPress={() => navigation.navigate('BackupAndRestore')}
        >
          <Text style={styles.linkText}>Backup & Restore</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.buttonStyle, { marginTop: 24 }]} 
          onPress={handleLogout}
        >
          <Text style={[styles.linkText, { color: '#EF4444', borderColor: '#FECACA' }]}>Log out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
    toggleSwitch: {
      
    },
    fullPage: {
        flex: 1,
        backgroundColor: '#FFF8F8', 
    },
    pageContainer: {
        flex: 1,
        alignItems: 'center',
        padding: 20,
    },
    buttonStyle: {
        width: '100%', 
        marginBottom: 15, 
    },
    linkText: {
        fontSize: 18,
        color: '#F87171',
        padding: 15,
        borderWidth: 1,
        borderColor: '#FEE2E2',
        borderRadius: 8,
        textAlign: 'center',
        backgroundColor: 'white', 
    },
    /* toggleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        padding: 15,
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#FEE2E2',
        borderRadius: 8,
        marginBottom: 5,
    }, */
    toggleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: '',
        width: '100%',
        padding: 15,
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#FEE2E2',
        borderRadius: 8,
        marginBottom: 5,
    },
    toggleLabel: {
        fontSize: 18,
        color: '#4B5563',
        fontWeight: '500',
    },
    helperText: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'left',
        width: '100%',
        marginBottom: 25,
        paddingHorizontal: 4,
    }
});