import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Vibration, Alert, Animated } from 'react-native';
import { Audio } from 'expo-av';
import * as Location from 'expo-location';
import * as SMS from 'expo-sms';
import { useEmergencyContacts } from '../context/EmergencyContactsContext';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import {
  PhoneIcon,
  RecordIcon,
  HoldIcon,
  BluetoothIcon,
  SpeakerIcon,
  MuteIcon,
  KeypadIcon,
} from '../components/Icons';

// Ringtone keys and default asset
const RINGTONE_URI_KEY = '@fake_call_ringtone_uri'; 
const DEFAULT_RINGTONE_ASSET = require('../assets/sounds/ringtone.mp3'); 
const DEFAULT_RINGTONE_PATH = '../assets/sounds/ringtone.mp3';

// In-call action button component
const InCallButton = ({ icon, text, onPress, isActive }) => (
  <TouchableOpacity style={styles.inCallButton} onPress={onPress}>
    <View style={[styles.inCallIconContainer, isActive && styles.inCallButtonActive]}>
      {icon}
    </View>
    <Text style={styles.inCallButtonText}>{text}</Text>
  </TouchableOpacity>
);

// Keypad component
const Keypad = ({ onKeyPress, onHide }) => {
  const buttons = [
    '1', '2', '3',
    '4', '5', '6',
    '7', '8', '9',
    '*', '0', '#',
  ];

  return (
    <View style={styles.keypadContainer}>
      <View style={styles.keypadGrid}>
        {buttons.map((char) => (
          <TouchableOpacity key={char} style={styles.keypadButton} onPress={() => onKeyPress(char)}>
            <Text style={styles.keypadButtonText}>{char}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity onPress={onHide}>
        <Text style={styles.keypadHideText}>Hide</Text>
      </TouchableOpacity>
    </View>
  );
};

export const FakeCallScreen = ({ onEndCall, callerName }) => {
  const [callState, setCallState] = useState('incoming');
  const [timer, setTimer] = useState(0);
  const [isKeypadVisible, setKeypadVisible] = useState(false);
  const [keypadInput, setKeypadInput] = useState('');
  const [activeButtons, setActiveButtons] = useState({
    speaker: false,
    mute: false,
    record: false,
    hold: false,
    bluetooth: false,
  });
  // State for dynamically loaded ringtone source
  const [ringtoneSource, setRingtoneSource] = useState(DEFAULT_RINGTONE_ASSET);
  // State to track if the ringtone setting has been loaded
  const [isRingtoneSettingsLoaded, setIsRingtoneSettingsLoaded] = useState(false); 

  const { contacts } = useEmergencyContacts();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  // We use a ref to track the currently playing sound to ensure we can always reach it for cleanup
  const soundRef = useRef(null);
  const navigation = useNavigation();

  // Load custom ringtone URI from AsyncStorage on mount
  useEffect(() => {
    const loadRingtone = async () => {
        try {
            const storedUri = await AsyncStorage.getItem(RINGTONE_URI_KEY);
            if (storedUri && storedUri !== DEFAULT_RINGTONE_PATH) {
                setRingtoneSource({ uri: storedUri });
            } else {
                setRingtoneSource(DEFAULT_RINGTONE_ASSET);
            }
        } catch (e) {
            console.error("Failed to load ringtone URI:", e);
            setRingtoneSource(DEFAULT_RINGTONE_ASSET);
        } finally {
            setIsRingtoneSettingsLoaded(true); 
        }
    };
    loadRingtone();
  }, []);

  // Pulsating animation for incoming call
  useEffect(() => {
    if (callState === 'incoming') {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.1, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }
  }, [callState, pulseAnim]);

  // Secret SOS trigger
  useEffect(() => {
    if (keypadInput.endsWith('505')) {
      triggerPanicAlert();
      setKeypadInput('');
      Alert.alert('Panic Activated', 'Your location has been sent to your emergency contacts.');
    }
  }, [keypadInput]);

  // --- MAIN FIX: Robust Audio Logic with Cancellation Check ---
  useEffect(() => {
    // 1. isCancelled flag tracks if this specific effect run has been cleaned up.
    let isCancelled = false;
    let soundObject = null;

    const playIncomingSound = async () => {
        // If settings aren't loaded yet, don't play default to avoid glitches
        if (!isRingtoneSettingsLoaded) return;

        try {
            // Configure audio session
            await Audio.setAudioModeAsync({ 
                playsInSilentModeIOS: true, 
                allowsRecordingIOS: false, 
                staysActiveInBackground: false, 
                shouldDuckAndroid: true 
            });
            
            // Create the sound. This is asynchronous and takes time.
            const { sound } = await Audio.Sound.createAsync(
                ringtoneSource,
                { isLooping: true }
            );

            // 2. CRITICAL CHECK: 
            // If the user answered, declined, or the component unmounted/remounted 
            // *while* we were waiting for 'createAsync', isCancelled will be true.
            if (isCancelled) {
                // We MUST unload immediately and NOT play.
                await sound.unloadAsync(); 
                return;
            }

            // If we are safe, assign the sound to our refs and play.
            soundObject = sound;
            soundRef.current = sound;
            
            await sound.playAsync();
            Vibration.vibrate([400, 1000], true);

        } catch (error) {
            if (!isCancelled) {
                console.warn("Could not play ringtone:", error);
            }
        }
    };

    if (callState === 'incoming') {
        playIncomingSound();
    } else {
        // If state is NOT incoming (e.g. answered/ended), we don't start sound.
        // The cleanup function below handles stopping any existing sound.
    }

    // Cleanup function: runs when component unmounts OR when callState/settings change.
    return () => {
        isCancelled = true; // Mark this run as cancelled immediately
        Vibration.cancel();

        // Stop and unload the sound object created in this effect
        if (soundObject) {
            soundObject.stopAsync().catch(() => {});
            soundObject.unloadAsync().catch(() => {});
        }
        
        // Also ensure global ref is cleared and unloaded if it exists
        if (soundRef.current) {
             soundRef.current.unloadAsync().catch(() => {});
             soundRef.current = null;
        }
    };
  }, [callState, ringtoneSource, isRingtoneSettingsLoaded]); 


  // --- Call Timer Logic ---
  useEffect(() => {
    let interval;
    if (callState === 'answered') {
      interval = setInterval(() => setTimer(prev => prev + 1), 1000);
    } 
    return () => clearInterval(interval);
  }, [callState]);

  // --- End Call Logic ---
  useEffect(() => {
      if (callState === 'ended') {
        const timerId = setTimeout(() => {
            onEndCall?.();
            try {
            navigation.setParams({ triggerFakeCall: false, triggerSudoku: false });
            } catch (e) {
            console.warn('Could not reset navigation params', e);
            }
        }, 2000);
        return () => clearTimeout(timerId);
      }
  }, [callState]);

  // Handlers - just update state. The useEffect above handles the audio stop automatically.
  const handleDecline = () => setCallState('ended');
  const handleAccept = () => setCallState('answered');

  const toggleButton = (button) => {
    setActiveButtons(prev => ({ ...prev, [button]: !prev[button] }));
  };

  const formatTime = () => {
    const minutes = Math.floor(timer / 60).toString().padStart(2, '0');
    const seconds = (timer % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  const triggerPanicAlert = async () => {
    if (contacts.length === 0) {
      Alert.alert('No Emergency Contacts', 'Please add emergency contacts to use this feature.');
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
      const message = `Emergency! I need help. My location: https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
      const recipients = contacts.map(c => c.phone);
      const isAvailable = await SMS.isAvailableAsync();
      if (isAvailable) {
        await SMS.sendSMSAsync(recipients, message);
      } else {
        Alert.alert('SMS Not Available', 'SMS is not available on this device.');
      }
    } catch (error) {
      console.error("Failed to send alert:", error);
      Alert.alert('Error', 'Could not get location or send SMS.');
    }
  };

  const renderIncomingCall = () => (
    <View style={[styles.container, styles.gradient]}>
      <View style={styles.header}><Text style={styles.headerText}>Incoming call</Text></View>
      <View style={styles.callerInfoContainer}>
        <Text style={styles.callerName}>{callerName}</Text>
        <Text style={styles.callerSubtext}>Mobile</Text>
        <Image source={{ uri: `https://placehold.co/100x100/eab308/000000?text=${callerName.substring(0,2)}` }} style={styles.avatar} />
      </View>
      <View style={styles.actionsContainer}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity style={[styles.callButton, styles.declineButton]} onPress={handleDecline}>
            <PhoneIcon style={{ transform: [{ rotate: '135deg' }] }} />
          </TouchableOpacity>
        </Animated.View>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity style={[styles.callButton, styles.acceptButton]} onPress={handleAccept}>
            <PhoneIcon />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );

  const renderAnsweredCall = () => (
    <View style={[styles.container, styles.gradient]}>
      <View style={styles.header}><Text style={styles.headerText}>{formatTime()}</Text></View>
      <View style={styles.callerInfoContainer}>
        <Text style={styles.callerName}>{callerName}</Text>
        <Text style={styles.callerSubtext}>Mobile</Text>
        <Image source={{ uri: `https://placehold.co/100x100/eab308/000000?text=${callerName.substring(0,2)}` }} style={styles.avatar} />
        {isKeypadVisible && <Text style={styles.keypadDisplay}>{keypadInput}</Text>}
      </View>
      <View style={styles.inCallActions}>
        {isKeypadVisible ? (
          <Keypad onKeyPress={(char) => setKeypadInput(prev => prev + char)} onHide={() => setKeypadVisible(false)} />
        ) : (
          <>
            <View style={styles.inCallRow}>
              <InCallButton icon={<RecordIcon />} text="Record" onPress={() => toggleButton('record')} isActive={activeButtons.record} />
              <InCallButton icon={<HoldIcon />} text="Hold call" onPress={() => toggleButton('hold')} isActive={activeButtons.hold} />
              <InCallButton icon={<BluetoothIcon />} text="Bluetooth" onPress={() => toggleButton('bluetooth')} isActive={activeButtons.bluetooth} />
            </View>
            <View style={styles.inCallRow}>
              <InCallButton icon={<SpeakerIcon />} text="Speaker" onPress={() => toggleButton('speaker')} isActive={activeButtons.speaker} />
              <InCallButton icon={<MuteIcon />} text="Mute" onPress={() => toggleButton('mute')} isActive={activeButtons.mute} />
              <InCallButton icon={<KeypadIcon />} text="Keypad" onPress={() => setKeypadVisible(true)} />
            </View>
          </>
        )}
        <TouchableOpacity style={[styles.callButton, styles.declineButton, { marginTop: 30 }]} onPress={handleDecline}>
          <PhoneIcon style={{ transform: [{ rotate: '135deg' }] }} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEndedCall = () => (
    <View style={[styles.container, { backgroundColor: '#111' }]}>
      <View style={styles.callerInfoContainer}>
        <Text style={styles.callerName}>{callerName}</Text>
        <Text style={[styles.callerSubtext, { color: 'red', marginTop: 10, fontSize: 18 }]}>Call ended</Text>
      </View>
    </View>
  );

  if (callState === 'incoming') return renderIncomingCall();
  if (callState === 'answered') return renderAnsweredCall();
  if (callState === 'ended') return renderEndedCall();
  return null;
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between', paddingTop: 60, paddingBottom: 80 },
  gradient: { backgroundColor: '#343a40' },
  header: { alignItems: 'center' },
  headerText: { color: 'white', fontSize: 18 },
  callerInfoContainer: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  callerName: { fontSize: 38, color: 'white', fontWeight: '400' },
  callerSubtext: { fontSize: 18, color: '#ccc', marginTop: 4 },
  avatar: { width: 120, height: 120, borderRadius: 60, marginTop: 40 },
  actionsContainer: { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
  callButton: { width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center' },
  declineButton: { backgroundColor: '#e63946' },
  acceptButton: { backgroundColor: '#2a9d8f' },
  inCallActions: { width: '100%', paddingHorizontal: 20, alignItems: 'center' },
  inCallRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginBottom: 20 },
  inCallButton: { alignItems: 'center', width: 80 },
  inCallIconContainer: { backgroundColor: 'rgba(255, 255, 255, 0.2)', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
  inCallButtonActive: { backgroundColor: '#007bff' },
  inCallButtonText: { color: 'white', marginTop: 8 },
  keypadContainer: { width: '100%', alignItems: 'center' },
  keypadGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', width: 300 },
  keypadButton: { width: 80, height: 80, borderRadius: 40, margin: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.2)' },
  keypadButtonText: { color: 'white', fontSize: 32 },
  keypadHideText: { color: 'white', fontSize: 18, marginTop: 20 },
  keypadDisplay: { color: 'white', fontSize: 24, height: 30, marginTop: 10 },
});