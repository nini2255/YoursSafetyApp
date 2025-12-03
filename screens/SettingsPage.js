import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Share,
  Alert,
  ActivityIndicator
} from 'react-native';
import { PageHeader } from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';
import { 
  MaterialIcons, 
  Ionicons, 
} from '@expo/vector-icons';
import { getAuth } from 'firebase/auth'; 
import AsyncStorage from '@react-native-async-storage/async-storage';

// IMPORT NEW SERVICES
import { registerForPushNotifications, saveUserToken } from '../services/expoPushService';

// Theme Colors
const mainColor = '#F87171';
const backgroundColor = '#FFF8F8';
const cardColor = '#FFFFFF';
const textColor = '#1F2937';
const subTextColor = '#6B7280';

export const SettingsPage = ({ navigation }) => {
  const authContext = useAuth();
  const [displayUserId, setDisplayUserId] = useState('Loading...');
  const [isSyncing, setIsSyncing] = useState(false); // New state for sync button

  // Robust ID Fetching Logic
  useEffect(() => {
    const fetchUserId = async () => {
      // 1. Try getting it from the Auth Context
      if (authContext?.user?.uid) {
        setDisplayUserId(authContext.user.uid);
        return;
      }

      // 2. Try getting it directly from Firebase (most reliable)
      try {
        const auth = getAuth();
        if (auth.currentUser?.uid) {
          setDisplayUserId(auth.currentUser.uid);
          return;
        }
      } catch (e) {
        console.log('Firebase auth check failed', e);
      }

      // 3. Try getting it from AsyncStorage (fallback)
      try {
        const storedId = await AsyncStorage.getItem('userId'); 
        if (storedId) {
          setDisplayUserId(storedId);
          return;
        }
      } catch (e) {}

      setDisplayUserId('Not Connected');
    };

    fetchUserId();
  }, [authContext]);

  const handleShareId = async () => {
    if (displayUserId === 'Not Connected' || displayUserId === 'Loading...') {
      Alert.alert("ID Not Found", "Could not retrieve your User ID. Please ensure you are logged in.");
      return;
    }
    
    try {
      await Share.share({
        message: `Hey! I'm setting up my safety app. Please link my User ID in your contact settings so I can send you automatic alerts: ${displayUserId}`,
        title: 'My Safety App User ID',
      });
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  // UPDATED: Manual Sync Function with better error handling
  const handleManualSync = async () => {
    if (displayUserId === 'Not Connected' || displayUserId === 'Loading...') {
        Alert.alert("Error", "You must be logged in to sync.");
        return;
    }

    setIsSyncing(true);
    try {
        console.log("Starting manual sync...");
        // 1. Get a fresh token (Throws specific error if fails)
        const token = await registerForPushNotifications();
        
        // 2. Force save to Firebase
        await saveUserToken(displayUserId, token);
        
        Alert.alert("Sync Successful", "✅ You are now visible on the safety network. Your contacts can now link this ID.");
        
    } catch (error) {
        console.error(error);
        // Show the REAL error message to the user
        Alert.alert("Sync Failed", error.message || "Unknown error occurred");
    } finally {
        setIsSyncing(false);
    }
  };

  const SettingItem = ({ icon, title, subtitle, onPress, danger = false }) => (
    <TouchableOpacity style={styles.itemContainer} onPress={onPress}>
      <View style={[styles.iconBox, { backgroundColor: danger ? '#FEE2E2' : '#FCE7F3' }]}>
        {icon}
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.itemTitle, danger && styles.dangerText]}>{title}</Text>
        {subtitle && <Text style={styles.itemSubtitle}>{subtitle}</Text>}
      </View>
      <MaterialIcons name="chevron-right" size={24} color="#D1D5DB" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <PageHeader title="Settings" onBack={() => navigation.goBack()} />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* User Identity Section */}
        <View style={styles.section}>
            <Text style={styles.sectionHeader}>MY SAFETY ID</Text>
            <View style={styles.idCard}>
                <View style={styles.idInfo}>
                    <Text style={styles.idLabel}>User ID</Text>
                    <Text style={styles.idValue} selectable>{displayUserId}</Text>
                    <Text style={styles.idHelper}>
                        Share this ID with your contacts so they can link you for automatic alerts.
                    </Text>
                </View>
                <View style={styles.buttonGroup}>
                    <TouchableOpacity 
                    style={[styles.shareButton, (displayUserId === 'Not Connected') && { opacity: 0.5 }]} 
                    onPress={handleShareId}
                    disabled={displayUserId === 'Not Connected'}
                    >
                        <Ionicons name="share-outline" size={20} color="white" />
                        <Text style={styles.shareButtonText}>Share</Text>
                    </TouchableOpacity>
                </View>
            </View>
            
            {/* Sync Button */}
            <TouchableOpacity 
                style={styles.syncButton} 
                onPress={handleManualSync}
                disabled={isSyncing || displayUserId === 'Not Connected'}
            >
                {isSyncing ? (
                    <ActivityIndicator size="small" color="#F87171" />
                ) : (
                    <>
                        <Ionicons name="cloud-upload-outline" size={20} color="#F87171" style={{marginRight: 8}} />
                        <Text style={styles.syncButtonText}>Sync Network Status</Text>
                    </>
                )}
            </TouchableOpacity>
            <Text style={styles.syncHelper}>
                Tap this if your contacts see "ID Not Found" errors.
            </Text>
        </View>

        {/* General Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>PREFERENCES</Text>
          <View style={styles.card}>
            <SettingItem 
              icon={<Ionicons name="person-outline" size={22} color={mainColor} />}
              title="Profile"
              subtitle="Edit name and personal details"
              onPress={() => navigation.navigate('UserProfileSettings')}
            />
            <View style={styles.divider} />
            <SettingItem 
              icon={<Ionicons name="people-outline" size={22} color={mainColor} />}
              title="Emergency Contacts"
              subtitle="Manage who gets notified"
              onPress={() => navigation.navigate('Contacts')}
            />
            <View style={styles.divider} />
             <SettingItem 
              icon={<Ionicons name="notifications-outline" size={22} color={mainColor} />}
              title="Fake Call Options"
              subtitle="Customize caller name and timing"
              onPress={() => navigation.navigate('FakeCallSettings')}
            />
          </View>
        </View>

        {/* Security & Data */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>SECURITY</Text>
          <View style={styles.card}>
            <SettingItem 
              icon={<MaterialIcons name="security" size={22} color={mainColor} />}
              title="Discreet Mode"
              subtitle="Customize panic triggers"
              onPress={() => navigation.navigate('DiscreetModeSettings')}
            />
            <View style={styles.divider} />
            <SettingItem 
              icon={<Ionicons name="cloud-upload-outline" size={22} color={mainColor} />}
              title="Backup & Restore"
              subtitle="Save your settings and contacts"
              onPress={() => navigation.navigate('BackupAndRestore')}
            />
          </View>
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <View style={styles.card}>
            <SettingItem 
              icon={<MaterialIcons name="logout" size={22} color="#EF4444" />}
              title="Log Out"
              onPress={authContext?.logout}
              danger
            />
          </View>
        </View>

        <Text style={styles.versionText}>Version 1.0.4</Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: backgroundColor,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: subTextColor,
    marginBottom: 10,
    marginLeft: 4,
    letterSpacing: 1,
  },
  card: {
    backgroundColor: cardColor,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  idCard: {
    backgroundColor: cardColor,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#FCE7F3',
  },
  idInfo: {
    flex: 1,
    marginRight: 12,
  },
  idLabel: {
    fontSize: 12,
    color: subTextColor,
    marginBottom: 2,
    fontWeight: '600',
  },
  idValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: textColor,
    marginBottom: 6,
  },
  idHelper: {
    fontSize: 11,
    color: subTextColor,
    lineHeight: 14,
  },
  buttonGroup: {
      justifyContent: 'center',
      alignItems: 'center',
  },
  shareButton: {
    backgroundColor: mainColor,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  shareButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
    marginLeft: 4,
  },
  syncButton: {
      marginTop: 12,
      backgroundColor: '#FEF2F2',
      borderRadius: 12,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: '#FECACA',
  },
  syncButtonText: {
      color: '#B91C1C',
      fontWeight: '600',
      fontSize: 14,
  },
  syncHelper: {
      fontSize: 11,
      color: subTextColor,
      textAlign: 'center',
      marginTop: 6,
      fontStyle: 'italic',
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: textColor,
    marginBottom: 2,
  },
  itemSubtitle: {
    fontSize: 13,
    color: subTextColor,
  },
  dangerText: {
    color: '#EF4444',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 72, 
  },
  versionText: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 10,
  },
});