import React, { useRef, useEffect, useState } from 'react'; // ADDED useEffect, useState
import { View, Text, TouchableOpacity, StyleSheet, Alert, Animated, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as SMS from 'expo-sms';
import { useEmergencyContacts } from '../context/EmergencyContactsContext';
import { MenuIcon } from '../components/Icons';
import AsyncStorage from '@react-native-async-storage/async-storage'; // ADDED AsyncStorage

const DEFAULT_PANIC_DURATION = 3000; // 3 seconds in ms

export const PanicPage = ({ navigation }) => {
  const { contacts } = useEmergencyContacts();
  const [pressDuration, setPressDuration] = useState(DEFAULT_PANIC_DURATION); // ADDED state
  const pressTimeout = useRef(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;

  // ADDED effect to load setting
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Fetch the duration (stored in seconds) and convert to milliseconds
        const duration = await AsyncStorage.getItem('@panic_press_duration');
        if (duration !== null) {
          // Use stored value * 1000, fall back to default if parsing fails
          const loadedDuration = parseInt(duration, 10);
          if (!isNaN(loadedDuration) && loadedDuration > 0) {
            setPressDuration(loadedDuration * 1000);
          }
        }
      } catch (e) {
        console.error("Failed to load panic press duration:", e);
      }
    };
    loadSettings();
  }, []); //

  // Animation for the button itself (slight pulse)
  const buttonPulseAnimation = Animated.loop(
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.05,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ])
  );

  // Animation for the surrounding waves
  const wavePulseAnimation = Animated.loop(
    Animated.timing(waveAnim, {
      toValue: 1,
      duration: 1500, // Duration for the wave to expand and fade
      useNativeDriver: true,
    })
  );

  const handlePressIn = () => {
    buttonPulseAnimation.start();
    wavePulseAnimation.start();
    pressTimeout.current = setTimeout(() => {
      triggerPanicAlert();
    }, pressDuration); // USE DYNAMIC DURATION
  };

  const handlePressOut = () => {
    // Stop and reset all animations
    buttonPulseAnimation.stop();
    wavePulseAnimation.stop();
    scaleAnim.setValue(1);
    waveAnim.setValue(0);

    if (pressTimeout.current) {
      clearTimeout(pressTimeout.current);
    }
  };

  const triggerPanicAlert = async () => {
    if (contacts.length === 0) {
      Alert.alert(
        'No Emergency Contacts',
        'Please add emergency contacts in the settings to use the panic button.'
      );
      return;
    }

    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Permission to access location was denied.');
      return;
    }
    try {
      let location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      const message = `Emergency! I need help. My current location is: https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
      const recipients = contacts.map(c => c.phone);

      const isAvailable = await SMS.isAvailableAsync();
      if (isAvailable) {
        const { result } = await SMS.sendSMSAsync(recipients, message);
        console.log('SMS sending result:', result);
      } else {
        Alert.alert('SMS Not Available', 'SMS is not available on this device.');
      }
    } catch (error) {
      console.error("Failed to get location or send alert:", error);
      Alert.alert('Error', 'Could not get your location or send SMS. Please try again.');
    }
  };

  // Interpolate the wave animation for multiple concentric circles
  const createWaveStyle = (startScale, endScale, startOpacity) => ({
    ...styles.wave,
    transform: [
      {
        scale: waveAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [startScale, endScale],
        }),
      },
    ],
    opacity: waveAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [startOpacity, 0],
    }),
  });

  // Calculate duration in seconds for display, defaulting to 3
  const displayDuration = Math.round(pressDuration / 1000) || 3;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      <View style={styles.fullPage}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <MenuIcon color="#C70039" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Emergency</Text>
          {Platform.OS === 'android' ? <Image
            source={{ uri: 'https://placehold.co/40x40/F8C8DC/333333?text=U' }}
            style={styles.profileImage}
          /> : <></>}
        </View>

        <View style={styles.pageContainer}>
          {/* Placeholder for background elements from the image */}
          <View style={styles.backgroundDecor}>
            <Text style={styles.backgroundIcon}>☀️</Text>
            <Text style={styles.backgroundIcon}>☁️</Text>
          </View>

          <View style={styles.content}>
            <View style={styles.sosButtonContainer}>
              <Animated.View style={createWaveStyle(1, 1.8, 0.3)} />
              <Animated.View style={createWaveStyle(1, 2.4, 0.2)} />
              <Animated.View style={createWaveStyle(1, 3.0, 0.1)} />
              <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <TouchableOpacity
                  style={styles.sosButton}
                  onPressIn={handlePressIn}
                  onPressOut={handlePressOut}
                  activeOpacity={0.8}
                >
                  <Text style={styles.sosButtonText}>SOS</Text>
                  {/* USE DYNAMIC DURATION FOR DISPLAY */}
                  <Text style={styles.sosButtonSubtext}>Press for {displayDuration} seconds</Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
            <Text style={styles.calmText}>KEEP CALM!</Text>
            <Text style={styles.panicSubtext}>
              This will alert your emergency contacts and share your location.
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  fullPage: {
    flex: 1,
    backgroundColor: '#F8F9FA'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
/*      paddingTop: 50, // SafeAreaView might be better
 */     paddingBottom: 10,
    backgroundColor: '#F8F9FA'
  },
  headerIcon: {
    padding: 8,
    justifyContent: 'flex-start',
    position: 'absolute',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#C70039',
    letterSpacing: 1,
    textAlign: 'center',
    paddingRight: 24, // to offset menu icon
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  pageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  backgroundDecor: {
    position: 'absolute',
    top: '10%',
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    opacity: 0.2,
  },
  backgroundIcon: {
    fontSize: 60,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  sosButtonContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 200,
    height: 200,
    marginBottom: 40,
  },
  wave: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 69, 58, 0.5)',
  },
  sosButton: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#FF453A',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    borderWidth: 5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  sosButtonText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 2,
  },
  sosButtonSubtext: {
    fontSize: 14,
    color: 'white',
    marginTop: 4,
  },
  calmText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FF453A',
    textAlign: 'center',
    marginBottom: 12,
  },
  panicSubtext: {
    fontSize: 16,
    color: '#6C757D',
    textAlign: 'center',
    maxWidth: '80%',
  },
});