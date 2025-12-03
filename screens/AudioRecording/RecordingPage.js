import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  Pressable, 
  Platform, 
  Alert, 
  StatusBar,
  Animated,
  Easing,
  Dimensions
} from 'react-native';
import PagerView from 'react-native-pager-view';
import { Audio } from 'expo-av';
// --- FIX: Import from 'legacy' to use getInfoAsync/moveAsync ---
import * as FileSystem from 'expo-file-system/legacy'; 
import Ionicons from '@expo/vector-icons/Ionicons';

// Import the SavedRecords component
import { SavedRecords } from './SavedRecords'; 

const CORAL_COLOR = '#FF6B6B';
const ACTIVE_BAR_COLOR = '#000000';
const INACTIVE_BAR_COLOR = '#E5E7EB';
const NUM_BARS = 35;

// Define the directory where SavedRecords looks for files
const RECORDINGS_DIR = FileSystem.documentDirectory + 'recordings/';

// --- Helper: Format Time (Display) ---
const formatTime = (millis) => {
  if (!millis) return '00.00.00';
  const minutes = Math.floor(millis / 60000);
  const seconds = Math.floor((millis % 60000) / 1000);
  const centiseconds = Math.floor((millis % 1000) / 10);
  return `${minutes.toString().padStart(2, '0')}.${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
};

// --- Component: Pulsing Ring ---
const PulseRing = ({ isRecording }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    let loop = null;
    if (isRecording) {
      const pulse = Animated.sequence([
        Animated.parallel([
          Animated.timing(scaleAnim, { toValue: 2.2, duration: 1200, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
          Animated.timing(opacityAnim, { toValue: 0.0, duration: 1200, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
        ]),
        Animated.parallel([
          Animated.timing(scaleAnim, { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 0.4, duration: 0, useNativeDriver: true }),
        ]),
      ]);
      loop = Animated.loop(pulse);
      loop.start();
    } else {
      scaleAnim.setValue(1);
      opacityAnim.setValue(0);
      if (loop) loop.stop();
    }
    return () => { if (loop) loop.stop(); };
  }, [isRecording]);

  return <Animated.View style={[styles.pulseRing, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]} />;
};

// --- Component: Audio Visualizer ---
const AudioVisualizer = ({ metering }) => {
  const [levels, setLevels] = useState(new Array(NUM_BARS).fill(-160));

  useEffect(() => {
    if (metering !== null && metering !== undefined) {
      setLevels((prev) => [...prev.slice(1), metering]);
    }
  }, [metering]);

  return (
    <View style={styles.visualizerContainer}>
      <View style={styles.visualizerAxis} />
      <View style={styles.waveformContainer}>
        {levels.map((level, index) => {
          const normalized = Math.max(0, level + 60); 
          const barHeight = Math.min(100, Math.max(6, normalized * 2.5)); 
          const isFocus = index > NUM_BARS / 3 && index < (NUM_BARS * 2) / 3;
          
          return (
            <View
              key={index}
              style={{
                width: 5,
                height: barHeight,
                backgroundColor: isFocus ? ACTIVE_BAR_COLOR : INACTIVE_BAR_COLOR,
                borderRadius: 3,
                marginHorizontal: 2,
              }}
            />
          );
        })}
      </View>
      
      <View style={[styles.trimHandleOverlay, { left: '15%' }]}>
         <View style={styles.handleLine} />
         <View style={styles.handleDot} />
      </View>
      <View style={[styles.trimHandleOverlay, { right: '15%' }]}>
         <View style={styles.handleLine} />
         <View style={styles.handleDot} />
      </View>
    </View>
  );
};

// --- Main Screen Component ---
export const RecordingPage = ({ navigation }) => {
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [durationMillis, setDurationMillis] = useState(0);
  const [metering, setMetering] = useState(-160);
  const [permissionResponse, requestPermission] = Audio.usePermissions();
  
  const pagerRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(0); 

  useEffect(() => {
    // Request permissions and setup audio mode on mount
    (async () => {
      try {
        if (permissionResponse?.status !== 'granted') {
          console.log('Requesting permission..');
          await requestPermission();
        }
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
        
        // Ensure the recordings directory exists
        const dirInfo = await FileSystem.getInfoAsync(RECORDINGS_DIR);
        if (!dirInfo.exists) {
          console.log("Creating recordings directory...");
          await FileSystem.makeDirectoryAsync(RECORDINGS_DIR, { intermediates: true });
        }
      } catch (error) {
        console.error("Failed to setup audio or directory", error);
      }
    })();
    
    return () => { if (recording) stopRecording(); };
  }, []);

  const startRecording = async () => {
    try {
      if (permissionResponse?.status !== 'granted') {
        const perm = await requestPermission();
        if (perm.status !== 'granted') {
          Alert.alert('Permission Required', 'Microphone access is needed.');
          return;
        }
      }
      
      if (recording) {
        await recording.stopAndUnloadAsync();
      }

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
        (status) => {
          setDurationMillis(status.durationMillis);
          if (status.metering !== undefined) setMetering(status.metering);
        },
        100
      );
      setRecording(newRecording);
      setIsRecording(true);
      setIsPaused(false);
    } catch (err) {
      console.error("Start recording error:", err);
      Alert.alert('Error', 'Could not start recording.');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    
    setIsRecording(false);
    setIsPaused(false);
    setMetering(-160);

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      
      // --- SAVE LOGIC STARTS HERE ---
      
      // 1. Generate filename matching SavedRecords.js format: H:M:S_M-D-YYYY.mp3
      const now = new Date();
      const datePart = `${now.getMonth() + 1}-${now.getDate()}-${now.getFullYear()}`;
      const timePart = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
      const fileName = `${timePart}_${datePart}.mp3`;
      const newPath = RECORDINGS_DIR + fileName;

      // 2. Move file from cache to permanent location
      await FileSystem.moveAsync({
        from: uri,
        to: newPath
      });
      
      console.log('File saved to:', newPath);
      setRecording(null);
      
      // 3. Swipe to SavedRecords page
      if(pagerRef.current) {
        // Small delay to ensure UI updates before swipe
        setTimeout(() => pagerRef.current.setPage(1), 100);
      }
      
    } catch (error) {
      console.error("Error saving file:", error);
      Alert.alert("Error", "Failed to save recording.");
    }
  };

  const togglePause = async () => {
    if (!recording) return;
    if (isPaused) {
      await recording.startAsync();
      setIsPaused(false);
    } else {
      await recording.pauseAsync();
      setIsPaused(true);
    }
  };

  const handleMainAction = () => {
    if (isRecording) togglePause();
    else startRecording();
  };

  const handleCancel = async () => {
    if (recording) {
      await recording.stopAndUnloadAsync();
      setRecording(null);
    }
    setIsRecording(false);
    setIsPaused(false);
    setDurationMillis(0);
    setMetering(-160);
  };

  const togglePage = () => {
     const nextPage = currentPage === 0 ? 1 : 0;
     pagerRef.current?.setPage(nextPage);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      
      {/* --- Common Header --- */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.iconButton}>
          <Ionicons name="menu-outline" size={28} color="#000" />
        </Pressable>
        
        <Text style={styles.headerTitle}>
            {currentPage === 0 ? "Voice Record" : "Recordings"}
        </Text>
        
        <View style={{ flexDirection: 'row' }}>
            <Pressable onPress={togglePage} style={[styles.iconButton, { marginRight: 4 }]}>
              <Ionicons 
                name={currentPage === 0 ? "list" : "mic-outline"} 
                size={26} 
                color="#333" 
              />
            </Pressable>
            <Pressable style={styles.iconButton}>
               <Ionicons name="settings-outline" size={24} color="#000" />
            </Pressable>
        </View>
      </View>

      {/* --- Swipeable Content Container --- */}
      <PagerView 
        ref={pagerRef}
        style={styles.pagerView} 
        initialPage={0}
        onPageSelected={(e) => setCurrentPage(e.nativeEvent.position)}
      >
        
        {/* --- PAGE 1: RECORDER --- */}
        <View key="1" style={styles.pageContainer}>
            <View style={styles.contentContainer}>
                
                <View style={styles.mainDisplayContainer}>
                    <PulseRing isRecording={isRecording && !isPaused} />
                    <View style={styles.microphoneContainer}>
                        <Ionicons name="mic" size={60} color="white" />
                    </View>
                    <Text style={styles.timerText}>{formatTime(durationMillis)}</Text>
                    <Text style={styles.statusText}>
                        {isRecording ? (isPaused ? "PAUSED" : "RECORDING...") : "READY TO RECORD"}
                    </Text>
                </View>

                <AudioVisualizer metering={metering} />

                <View style={styles.footerWrapper}>
                    <View style={styles.pillContainer}>
                        <Pressable style={styles.footerButton} onPress={handleCancel}>
                            <Ionicons name="close" size={28} color="#EF4444" />
                        </Pressable>

                        <Pressable style={styles.mainActionButton} onPress={handleMainAction}>
                            <Ionicons 
                                name={isRecording && !isPaused ? "pause" : "mic"} 
                                size={42} 
                                color="white" 
                            />
                        </Pressable>

                        <Pressable style={styles.footerButton} onPress={stopRecording}>
                            <Ionicons name="checkmark" size={28} color="#10B981" />
                        </Pressable>
                    </View>
                </View>
            </View>
        </View>

        {/* --- PAGE 2: SAVED RECORDS --- */}
        <View key="2" style={styles.pageContainer}>
             <SavedRecords navigation={navigation} />
        </View>

      </PagerView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: '#FFFFFF' 
  },
  pagerView: {
    flex: 1,
  },
  pageContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 15,
    backgroundColor: '#fff',
    zIndex: 10,
  },
  headerTitle: { 
    fontSize: 20, 
    fontWeight: '600', 
    color: '#333',
    letterSpacing: 0.5
  },
  iconButton: { 
    padding: 5 
  },
  contentContainer: { 
    flex: 1, 
    justifyContent: 'space-between', 
    paddingBottom: 50 
  },
  mainDisplayContainer: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginTop: 40,
    flex: 1,
  },
  pulseRing: { 
    position: 'absolute', 
    width: 120,
    height: 120, 
    borderRadius: 60, 
    backgroundColor: CORAL_COLOR, 
    zIndex: -1 
  },
  microphoneContainer: { 
    width: 120, 
    height: 120, 
    borderRadius: 60, 
    backgroundColor: CORAL_COLOR, 
    alignItems: 'center', 
    justifyContent: 'center', 
    shadowColor: CORAL_COLOR, 
    shadowOffset: { width: 0, height: 10 }, 
    shadowOpacity: 0.4, 
    shadowRadius: 20, 
    elevation: 15, 
    marginBottom: 40 
  },
  timerText: { 
    fontSize: 64, 
    fontWeight: '200', 
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', 
    color: '#111', 
    letterSpacing: -1,
  },
  statusText: { 
    marginTop: 10, 
    fontSize: 14, 
    color: '#9CA3AF', 
    letterSpacing: 2, 
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  visualizerContainer: { 
    height: 120, 
    width: '100%', 
    justifyContent: 'center', 
    alignItems: 'center', 
    position: 'relative',
    marginBottom: 20,
  },
  visualizerAxis: { 
    position: 'absolute', 
    width: '85%', 
    height: 2, 
    backgroundColor: '#E5E7EB',
    borderRadius: 1 
  },
  waveformContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    height: '100%' 
  },
  trimHandleOverlay: { 
    position: 'absolute', 
    height: '80%', 
    width: 20, 
    alignItems: 'center', 
    justifyContent: 'center',
  },
  handleLine: {
      width: 2,
      height: '100%',
      backgroundColor: '#333',
  },
  handleDot: { 
    width: 12, 
    height: 12, 
    borderRadius: 6, 
    backgroundColor: '#333', 
    position: 'absolute', 
    bottom: -6,
  },
  footerWrapper: {
      width: '100%',
      alignItems: 'center',
      paddingHorizontal: 20,
  },
  pillContainer: { 
    flexDirection: 'row', 
    backgroundColor: '#F3F4F6', 
    borderRadius: 50, 
    paddingVertical: 12, 
    paddingHorizontal: 30, 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    width: '100%', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 6, 
    elevation: 3 
  },
  footerButton: { 
    padding: 12,
    borderRadius: 20,
    backgroundColor: '#fff', 
  },
  mainActionButton: { 
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    backgroundColor: CORAL_COLOR, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginTop: -40, 
    borderWidth: 6, 
    borderColor: '#fff', 
    shadowColor: CORAL_COLOR, 
    shadowOffset: { width: 0, height: 8 }, 
    shadowOpacity: 0.4, 
    shadowRadius: 12, 
    elevation: 10, 
  },
});