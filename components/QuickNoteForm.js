import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Dimensions
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Audio, Video } from 'expo-av';
import { Ionicons } from '@expo/vector-icons'; // Ensure you have this installed

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

const NOTE_COLORS = [
  '#FFFFFF', '#FEE2E2', '#FEF3C7', '#DCFCE7',
  '#DBEAFE', '#F3E8FF', '#FFEDD5', '#FDF2F8',
];

export const QuickNoteForm = ({ visible, entry, onClose, onSave, initialMode = 'edit' }) => {
  const [isEditing, setIsEditing] = useState(initialMode === 'edit');
  const [content, setContent] = useState('');
  const [selectedColor, setSelectedColor] = useState(NOTE_COLORS[0]);
  const [attachments, setAttachments] = useState([]);
  const [recording, setRecording] = useState();
  const [isSaving, setIsSaving] = useState(false);
  
  // Full Screen Media State
  const [fullScreenMedia, setFullScreenMedia] = useState(null);

  useEffect(() => {
    if (visible) {
      if (entry) {
        setContent(entry.notes || '');
        setSelectedColor(entry.color || NOTE_COLORS[0]);
        setAttachments(entry.attachments || []);
        setIsEditing(initialMode === 'edit');
      } else {
        // New Entry
        setContent('');
        setSelectedColor(NOTE_COLORS[0]);
        setAttachments([]);
        setIsEditing(true);
      }
      setRecording(undefined);
      setIsSaving(false);
      setFullScreenMedia(null);
    }
  }, [visible, entry, initialMode]);

  const handleSave = async () => {
    if (!content.trim() && attachments.length === 0) {
      onClose();
      return;
    }
    setIsSaving(true);
    await onSave({
      title: 'Quick Note',
      notes: content,
      color: selectedColor,
      attachments: attachments,
      type: 'quick_note',
      date: entry ? entry.date : new Date().toISOString(),
    });
    setIsSaving(false);
    onClose();
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All, // Allow videos too
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled) {
      const type = result.assets[0].type === 'video' ? 'video' : 'image';
      setAttachments([...attachments, { uri: result.assets[0].uri, type }]);
    }
  };

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') return Alert.alert('Permission needed');
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    setRecording(undefined);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setAttachments([...attachments, { uri, type: 'audio' }]);
  };

  const removeAttachment = (index) => {
    const newAtts = [...attachments];
    newAtts.splice(index, 1);
    setAttachments(newAtts);
  };

  const handleAttachmentPress = async (att) => {
    if (att.type === 'image' || att.type === 'video') {
      setFullScreenMedia(att);
    } else if (att.type === 'audio') {
      try {
        const { sound } = await Audio.Sound.createAsync({ uri: att.uri });
        await sound.playAsync();
      } catch (e) {
        Alert.alert("Error", "Could not play audio");
      }
    }
  };

  // --- Renderers ---

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={onClose} style={styles.headerBtnWrapper}>
        <Text style={styles.headerBtn}>
          {isEditing && !entry ? 'Cancel' : 'Close'}
        </Text>
      </TouchableOpacity>
      
      <Text style={styles.headerTitle}>
        {entry ? (isEditing ? 'Editing Note' : 'View Note') : 'New Note'}
      </Text>

      <TouchableOpacity 
        onPress={isEditing ? handleSave : () => setIsEditing(true)} 
        disabled={isSaving}
        style={styles.headerBtnWrapper}
      >
        <Text style={[styles.headerBtn, { fontWeight: 'bold', color: isEditing ? '#10B981' : '#F472B6' }]}>
          {isEditing ? 'Save' : 'Edit'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderContent = () => (
    <ScrollView style={styles.contentContainer}>
      {isEditing ? (
        <TextInput
          style={styles.input}
          multiline
          placeholder="Type your note here..."
          value={content}
          onChangeText={setContent}
          textAlignVertical="top"
        />
      ) : (
        <Text style={styles.viewText}>{content || "No text content"}</Text>
      )}
      
      <View style={styles.attachmentsGrid}>
        {attachments.map((att, index) => (
          <TouchableOpacity 
            key={index} 
            style={styles.attachmentWrapper}
            onPress={() => handleAttachmentPress(att)}
            disabled={isEditing} // Only open full screen in view mode
          >
            {att.type === 'image' ? (
              <Image source={{ uri: att.uri }} style={styles.attachmentImage} />
            ) : att.type === 'video' ? (
               <View style={[styles.attachmentImage, {backgroundColor: 'black', justifyContent: 'center', alignItems: 'center'}]}>
                  <Text style={{fontSize: 30}}>▶️</Text>
               </View>
            ) : (
              <View style={styles.audioPlaceholder}>
                <Text>🎤 Audio</Text>
              </View>
            )}
            
            {/* Remove button only in Edit Mode */}
            {isEditing && (
              <TouchableOpacity style={styles.removeBtn} onPress={() => removeAttachment(index)}>
                <Text style={styles.removeBtnText}>✕</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={[styles.modalContent, { backgroundColor: selectedColor }]}>
              <TouchableOpacity activeOpacity={1} style={{ flex: 1 }}>
                
                {renderHeader()}
                {renderContent()}

                {/* Footer Controls (Only visible in Edit Mode) */}
                {isEditing && (
                  <View style={styles.footer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorPicker}>
                      {NOTE_COLORS.map(color => (
                        <TouchableOpacity
                          key={color}
                          style={[
                            styles.colorCircle, 
                            { backgroundColor: color }, 
                            selectedColor === color && styles.colorSelected
                          ]}
                          onPress={() => setSelectedColor(color)}
                        />
                      ))}
                    </ScrollView>
                    
                    <View style={styles.toolbar}>
                      <TouchableOpacity onPress={pickImage} style={styles.toolBtn}>
                        <Text style={{fontSize:20}}>📷</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={recording ? stopRecording : startRecording} style={[styles.toolBtn, recording && styles.recordingBtn]}>
                        <Text style={{fontSize:20}}>{recording ? '⏹️' : '🎤'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </KeyboardAvoidingView>

      {/* Full Screen Media Viewer */}
      <Modal visible={!!fullScreenMedia} transparent={true} animationType="fade" onRequestClose={() => setFullScreenMedia(null)}>
        <View style={styles.fullScreenContainer}>
          <TouchableOpacity style={styles.fullScreenClose} onPress={() => setFullScreenMedia(null)}>
            <Text style={styles.fullScreenCloseText}>✕</Text>
          </TouchableOpacity>
          {fullScreenMedia?.type === 'image' && (
            <Image source={{ uri: fullScreenMedia.uri }} style={styles.fullScreenImage} resizeMode="contain" />
          )}
          {fullScreenMedia?.type === 'video' && (
            <Video 
              source={{ uri: fullScreenMedia.uri }} 
              style={styles.fullScreenImage} 
              useNativeControls 
              resizeMode="contain" 
              shouldPlay 
            />
          )}
        </View>
      </Modal>
    </Modal>
  );
};

const styles = StyleSheet.create({
  keyboardView: { flex: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { 
    height: '85%', 
    borderTopLeftRadius: 20, 
    borderTopRightRadius: 20, 
    padding: 20, 
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1, 
    shadowRadius: 10, 
    elevation: 5 
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, alignItems: 'center' },
  headerBtnWrapper: { padding: 5 },
  headerBtn: { fontSize: 16, color: '#4B5563' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  contentContainer: { flex: 1 },
  input: { fontSize: 18, color: '#374151', minHeight: 150, textAlignVertical: 'top', paddingTop: 0 },
  viewText: { fontSize: 18, color: '#374151', lineHeight: 26 },
  attachmentsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 15 },
  attachmentWrapper: { width: 100, height: 100, marginRight: 10, marginBottom: 10, borderRadius: 8, overflow: 'hidden', position: 'relative' },
  attachmentImage: { width: '100%', height: '100%' },
  audioPlaceholder: { flex: 1, backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' },
  removeBtn: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.6)', width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  removeBtnText: { color: 'white', fontSize: 12, fontWeight: 'bold', marginTop: -2 },
  footer: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderColor: '#F3F4F6' },
  colorPicker: { flexDirection: 'row', marginBottom: 15, maxHeight: 40 },
  colorCircle: { width: 30, height: 30, borderRadius: 15, marginRight: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  colorSelected: { borderWidth: 2, borderColor: '#4B5563' },
  toolbar: { flexDirection: 'row' },
  toolBtn: { padding: 10, marginRight: 10, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.5)' },
  recordingBtn: { backgroundColor: '#FECACA' },
  
  // Full Screen Styles
  fullScreenContainer: { flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' },
  fullScreenClose: { position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10 },
  fullScreenCloseText: { color: 'white', fontSize: 30, fontWeight: 'bold' },
  fullScreenImage: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.8 },
});