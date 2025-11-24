import React, { useEffect } from 'react';
import { RecordingIcon, StopRecordingIcon } from '../../components/Icons'; 
import { View, Text, StyleSheet, SafeAreaView, Pressable, Alert } from 'react-native';
import {
  useAudioRecorder,
  AudioModule,
  RecordingPresets,
  useAudioRecorderState,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';

export const RecordAudio = () => {

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);
  const audioDirectory = FileSystem.documentDirectory + 'recordings/';

  // 1. Request permissions when the component mounts
  useEffect(() => {
    (async () => {
      try {
        const status = await AudioModule.requestRecordingPermissionsAsync();
        if (!status.granted) {
          Alert.alert('Permission Required', 'Permission to access microphone was denied');
        }
      } catch (error) {
        console.error('Error requesting permissions:', error);
      }
    })();
  }, []);

  const startRecording = async () => 
  {
    try {
      // 2. Check permissions again before starting
      const status = await AudioModule.getRecordingPermissionsAsync();
      if (!status.granted) {
        const newStatus = await AudioModule.requestRecordingPermissionsAsync();
        if (!newStatus.granted) {
          Alert.alert('Permission Required', 'Please enable microphone access to record audio.');
          return;
        }
      }

      console.log("Preparing to record");
      await audioRecorder.prepareToRecordAsync();
      console.log("prepared");
      
      // 3. Start recording
      // Note: Removed { forDuration: 10 } to allow manual stopping via the button
      audioRecorder.record(); 
      console.log("Recording started");
      
    } catch (error) {
      console.error("Failed to start recording:", error);
      Alert.alert("Error", "Failed to start recording.");
    }
  }

  const stopRecording = async () =>
  {
    try {
        await audioRecorder.stop();
        console.log("Recording stopped");
        
        const audioFileUri = getDate() + '.mp3';
        console.log("saving recording as: ", audioFileUri);
        console.log(audioRecorder.uri);
        
        const fileUri = audioRecorder.uri;
        const destinationUri = audioDirectory + audioFileUri;
        
        // Ensure the recordings directory exists
        await FileSystem.makeDirectoryAsync(audioDirectory, { intermediates: true });
        
        // Copy the file from temporary location to recordings directory
        await FileSystem.copyAsync({
            from: fileUri,
            to: destinationUri,
        });
        console.log("File saved to: ", destinationUri);
        
        // Delete the original temporary file (optional, but good for cleanup)
        // Note: Only delete if you are sure the copy succeeded
        await FileSystem.deleteAsync(fileUri, { idempotent: true }); 
        console.log("Temporary file deleted");
        
    } catch (error) {
        console.error("Error saving recording: ", error);
    }
  }

  const getDate = () => 
  {
    const date = new Date();
    const recordingDate = date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds() + '_' + (date.getMonth() + 1) + '-' + date.getDate() + '-' + date.getFullYear();
    console.log(recordingDate);
    return recordingDate;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.recordingButtonContainer}>
          <Pressable
            alignItems='center'
            onPress={() => recorderState.isRecording ? stopRecording() : startRecording()}
            style={({ pressed }) => [
              {
                opacity: pressed ? 0.5 : 1.0,
              },
              styles.recordingIcon,
            ]}
          >
            {recorderState.isRecording ?
              <StopRecordingIcon color='#F87171' height={200} width={200} /> 
              : 
              <RecordingIcon color='#F87171' height={200} width={200} />}
            <View style={styles.recordingButton}>
              <Text style={styles.recordingButtonText}> 
                { recorderState.isRecording ? 'Stop Recording' : 'Start Recording' }
              </Text> 
            </View>
          </Pressable>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  recordingButton: {
    backgroundColor: '#F87171', 
    borderRadius: 25,
    height: 50,
    marginTop: '20%',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    //marginBottom: 20,
  },
  recordingButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    paddingHorizontal: '20%',
  },
  recordingButtonContainer: {
    justifyContent: 'center',
    marginVertical: '50%',
    paddingHorizontal: '20%',
  },
  recordingIcon: {
    color: '#F87171',
    height: '100%',
    width: '100%',
    marginBottom: '20%',
  },
})