// rafaelanunez/yoursapp/yoursApp-notification/components/JournalEntryForm.js

import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  Modal, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  ScrollView, 
  Image,
  Platform // Added for status bar handling
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'
import * as ImagePicker from 'expo-image-picker';
import { Audio, Video } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy'; // Use legacy for deleteAsync
import { DeleteIcon } from './Icons'; // Assuming you have a DeleteIcon in Icons.js
import { MoodSelection } from './MoodSelection'; // Import the new MoodSelection component

// Predefined activity tags, similar to your example image
const predefinedActivityTags = [
  'family', 'friends', 'date', 'exercise', 'sport', 'relax', 'movies',
  'gaming', 'reading', 'cleaning', 'sleep early', 'eat healthy', 'shopping'
];

export const JournalEntryForm = ({ visible, entry, onClose, onSave, templateData }) => {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [recording, setRecording] = useState();

  // --- NEW STATE FOR TAGS ---
  const [selectedMood, setSelectedMood] = useState(null); // e.g., 'rad', 'good', 'meh', 'bad', 'awful'
  const [location, setLocation] = useState('');
  const [selectedActivityTags, setSelectedActivityTags] = useState([]);
  const [customTagInput, setCustomTagInput] = useState(''); // For adding new custom tags

  const soundRef = useRef(new Audio.Sound());

  useEffect(() => {
    // Populate form when entry/template changes or modal becomes visible
    if (visible) {
      if (entry) {
        setTitle(entry.title || '');
        setNotes(entry.notes || '');
        setAttachments(entry.attachments || []);
        // --- Load existing tags ---
        setSelectedMood(entry.mood || null);
        setLocation(entry.location || '');
        setSelectedActivityTags(entry.activityTags || []);
      } else if (templateData) {
        setTitle(templateData.title || '');
        setNotes(templateData.notes || '');
        setAttachments([]);
        // --- Reset tags for template ---
        setSelectedMood(templateData.mood || null);
        setLocation(templateData.location || '');
        setSelectedActivityTags(templateData.activityTags || []);
      } else {
        // Clear all fields for a new entry
        setTitle('');
        setNotes('');
        setAttachments([]);
        // --- Clear tags for new entry ---
        setSelectedMood(null);
        setLocation('');
        setSelectedActivityTags([]);
        setCustomTagInput('');
      }
    }
  }, [entry, templateData, visible]);

  useEffect(() => {
    // Unload the sound object when the component unmounts
    return () => {
      soundRef.current.unloadAsync();
    };
  }, []);

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert('Title Required', 'Please provide a title for your entry.');
      return;
    }
    // --- Pass new tag data to onSave ---
    onSave({ 
      title: title.trim(), 
      notes: notes.trim(), 
      attachments,
      mood: selectedMood,
      location: location.trim(),
      activityTags: selectedActivityTags,
    });
    onClose(); 
  };

  // --- Media Handlers ---

  const handlePickMedia = async (mediaType) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need permission to access your media library.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: mediaType === 'image' 
        ? ImagePicker.MediaTypeOptions.Images 
        : ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      try {
        // --- Copy file to permanent storage ---
        const tempUri = result.assets[0].uri;
        const fileType = tempUri.split('.').pop();
        const newName = `${Date.now()}.${fileType}`;
        const newPath = FileSystem.documentDirectory + newName;
        
        await FileSystem.copyAsync({
          from: tempUri,
          to: newPath
        });

        const newAttachment = {
          uri: newPath, // <-- Use the permanent path
          type: mediaType,
        };
        setAttachments(prev => [...prev, newAttachment]);
      } catch (err) {
        console.error("Error copying file to permanent storage:", err);
        Alert.alert("Error", "Failed to save attachment.");
      }
    }
  };

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need permission to use the microphone.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
         Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    setRecording(undefined);
    await recording.stopAndUnloadAsync();
    
    try {
      // --- Copy file to permanent storage ---
      const tempUri = recording.getURI(); 
      const newName = `${Date.now()}_recording.m4a`;
      const newPath = FileSystem.documentDirectory + newName;
      
      await FileSystem.copyAsync({
        from: tempUri,
        to: newPath
      });

      const newAttachment = {
        uri: newPath, // <-- Use the permanent path
        type: 'audio',
      };
      setAttachments(prev => [...prev, newAttachment]);
    } catch (err) {
      console.error("Error copying audio file:", err);
      Alert.alert("Error", "Failed to save audio recording.");
    }
  };

  const playSound = async (uri) => {
    try {
      // --- Set audio mode to playback (fixes issue after recording) ---
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      await soundRef.current.unloadAsync(); 
      await soundRef.current.loadAsync({ uri });
      await soundRef.current.playAsync();
    } catch (error) {
      console.error("Failed to play sound", error);
      Alert.alert("Error", "Could not play audio file.");
    }
  };

  const removeAttachment = async (uri) => {
    try {
      // --- Remove from device storage ---
      await FileSystem.deleteAsync(uri, { idempotent: true });
      
      // Remove from state
      setAttachments(prev => prev.filter(att => att.uri !== uri));
    } catch (err) {
      console.error("Error removing attachment:", err);
      // Still remove from state even if file deletion fails
      setAttachments(prev => prev.filter(att => att.uri !== uri));
    }
  };

  // --- Render full attachments ---
  const renderAttachments = () => {
    return attachments.map((att, index) => (
      <View key={index} style={styles.attachmentPreviewContainer}>
        {att.type === 'image' && (
          <Image source={{ uri: att.uri }} style={styles.previewImage} resizeMode="cover" />
        )}
        {att.type === 'video' && (
          <Video
            source={{ uri: att.uri }}
            style={styles.previewVideo}
            useNativeControls
            resizeMode="contain"
          />
        )}
        {att.type === 'audio' && (
          <TouchableOpacity style={styles.audioButton} onPress={() => playSound(att.uri)}>
            <Text style={styles.audioButtonText}>Play Audio: {att.uri.split('/').pop()}</Text>
          </TouchableOpacity>
        )}
        {/* Remove Button */}
        <TouchableOpacity onPress={() => removeAttachment(att.uri)} style={styles.removeAttButton}>
           {/* You can replace this Text with your <DeleteIcon /> if you prefer */}
           <Text style={styles.removeAttButtonText}>X</Text>
        </TouchableOpacity>
      </View>
    ));
  };

  // --- Toggle activity tag selection ---
  const toggleActivityTag = (tag) => {
    setSelectedActivityTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  // --- Add custom tag ---
  const addCustomTag = () => {
    const trimmedTag = customTagInput.trim().toLowerCase();
    if (trimmedTag && !selectedActivityTags.includes(trimmedTag) && !predefinedActivityTags.includes(trimmedTag)) {
      setSelectedActivityTags(prev => [...prev, trimmedTag]);
      setCustomTagInput(''); // Clear input
    } else if (trimmedTag) {
      Alert.alert('Tag Exists', 'This tag has already been added.');
      setCustomTagInput('');
    }
  };

  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={styles.fullScreenContainer}>
        
        <Text style={styles.formTitle}>
          {entry ? 'Edit Journal Entry' : 'New Journal Entry'}
        </Text>

        <ScrollView style={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Mood Selection */}
          <Text style={styles.sectionHeader}>How are you feeling?</Text>
          <MoodSelection 
            selectedMood={selectedMood} 
            onSelectMood={setSelectedMood} 
          />

          {/* Location Input */}
          <Text style={styles.sectionHeader}>Where did this happen?</Text>
          <TextInput
            style={styles.input}
            placeholder="Location (e.g., Home, Park, Work)"
            placeholderTextColor="#9CA3AF"
            value={location}
            onChangeText={setLocation}
            maxLength={100}
          />

          {/* Activity Tags */}
          <Text style={styles.sectionHeader}>What have you been up to?</Text>
          <View style={styles.tagsContainer}>
            {/* Combine predefined and unique custom tags */}
            {[...predefinedActivityTags, ...selectedActivityTags.filter(tag => !predefinedActivityTags.includes(tag))].map((tag) => (
              <TouchableOpacity
                key={tag}
                style={[
                  styles.tagButton,
                  selectedActivityTags.includes(tag) && styles.tagButtonSelected,
                ]}
                onPress={() => toggleActivityTag(tag)}
              >
                <Text style={[
                  styles.tagButtonText,
                  selectedActivityTags.includes(tag) && styles.tagButtonTextSelected,
                ]}>{tag}</Text>
              </TouchableOpacity>
            ))}
            {/* Custom Tag Input */}
            <View style={styles.customTagInputContainer}>
              <TextInput
                style={styles.customTagInput}
                placeholder="Add new tag"
                placeholderTextColor="#9CA3AF"
                value={customTagInput}
                onChangeText={setCustomTagInput}
                onSubmitEditing={addCustomTag} // Allow adding on submit
                returnKeyType="done"
                maxLength={30}
              />
              <TouchableOpacity style={styles.addTagButton} onPress={addCustomTag}>
                <Text style={styles.addTagButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Entry Details */}
          <Text style={styles.sectionHeader}>Entry Details</Text>
          <TextInput
            style={styles.input}
            placeholder="Title"
            placeholderTextColor="#9CA3AF"
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />

          <TextInput
            style={[styles.input, { height: 200, textAlignVertical: 'top' }]}
            placeholder="Add notes..."
            placeholderTextColor="#9CA3AF"
            value={notes}
            onChangeText={setNotes}
            multiline={true}
          />

          {/* Media Buttons */}
          <View style={styles.mediaButtonsContainer}>
            <TouchableOpacity style={styles.mediaButton} onPress={() => handlePickMedia('image')}>
              <Text style={styles.mediaButtonText}>Add Image</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.mediaButton} onPress={() => handlePickMedia('video')}>
              <Text style={styles.mediaButtonText}>Add Video</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.mediaButton} onPress={recording ? stopRecording : startRecording}>
              <Text style={styles.mediaButtonText}>{recording ? 'Stop Recording' : 'Record Audio'}</Text>
            </TouchableOpacity>
          </View>

          {/* Attachment List */}
          <View style={styles.attachmentList}>
            {attachments.length > 0 && (
                <Text style={styles.attachmentsHeader}>Attachments</Text>
            )}
            {renderAttachments()}
          </View>

        </ScrollView>

        {/* Form Actions (Cancel/Save) */}
        <View style={styles.formActions}>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>

      </SafeAreaView>
    </Modal>
  );
};

// --- Full StyleSheet ---
const styles = StyleSheet.create({
    fullScreenContainer: {
        flex: 1,
        backgroundColor: 'white',
        paddingTop: Platform.OS === 'android' ? 25 : 0, // Handle Android status bar
    },
    scrollContent: {
        flex: 1,
        paddingHorizontal: 20,
    },
    formTitle: {
      fontSize: 24, 
      fontWeight: 'bold',
      marginTop: 16, 
      marginBottom: 24,
      textAlign: 'center',
      color: '#333',
    },
    sectionHeader: { 
      fontSize: 18,
      fontWeight: 'bold',
      color: '#333',
      marginBottom: 12,
      marginTop: 20,
    },
    formActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: '#E5E7EB',
      backgroundColor: 'white', 
    },
    input: {
      borderWidth: 1,
      borderColor: '#D1D5DB',
      padding: 12,
      borderRadius: 8,
      marginBottom: 16,
      fontSize: 16,
      color: '#1F2937',
    },
    cancelButton: {
      paddingVertical: 12,
      paddingHorizontal: 20,
    },
    cancelButtonText: {
      color: '#4B5563',
      fontSize: 16,
      fontWeight: '600',
    },
    saveButton: {
      backgroundColor: '#F472B6',
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 8,
      marginLeft: 8,
    },
    saveButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: 'bold',
    },
    mediaButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 20,
        marginTop: 10,
    },
    mediaButton: {
        backgroundColor: '#E5E7EB',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 6,
    },
    mediaButtonText: {
        color: '#1F2937',
        fontWeight: '600'
    },
    attachmentList: {
        marginBottom: 16,
    },
    attachmentsHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
    },
    attachmentPreviewContainer: {
        position: 'relative',
        marginBottom: 16,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#000',
    },
    previewImage: {
        width: '100%',
        height: 250,
    },
    previewVideo: {
        width: '100%',
        height: 250,
    },
    audioButton: {
        backgroundColor: '#F472B6',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    audioButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    },
    removeAttButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.6)',
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    removeAttButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },

    // --- TAGGING STYLES ---
    tagsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: 20,
    },
    tagButton: {
      backgroundColor: '#E5E7EB',
      borderRadius: 20,
      paddingVertical: 8,
      paddingHorizontal: 12,
      marginRight: 8,
      marginBottom: 8,
    },
    tagButtonSelected: {
      backgroundColor: '#F472B6', 
    },
    tagButtonText: {
      color: '#4B5563',
      fontSize: 14,
      textTransform: 'capitalize',
    },
    tagButtonTextSelected: {
      color: 'white',
      fontWeight: 'bold',
    },
    customTagInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
      marginTop: 10, 
    },
    customTagInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: '#D1D5DB',
      padding: 10,
      borderRadius: 8,
      fontSize: 14,
      marginRight: 8,
      color: '#1F2937',
    },
    addTagButton: {
      backgroundColor: '#F472B6',
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    addTagButtonText: {
      color: 'white',
      fontSize: 24,
      lineHeight: 24, 
      fontWeight: 'bold',
      paddingBottom: 2, // Adjust vertical centering
    },
});