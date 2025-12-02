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
  SafeAreaView,
  Platform,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  BackHandler,
  ActivityIndicator
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Audio, Video } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { MoodSelection } from './MoodSelection'; 

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

const predefinedActivityTags = [
  'family', 'friends', 'date', 'exercise', 'sport', 'relax', 'movies',
  'gaming', 'reading', 'cleaning', 'sleep early', 'eat healthy', 'shopping'
];

// --- Custom Calendar Component (Unchanged) ---
const CustomCalendar = ({ selectedDate, onSelectDate }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate || Date.now()));
  const [viewMode, setViewMode] = useState('day'); 

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  
  const currentYear = new Date().getFullYear();
  const years = Array.from({length: 101}, (_, i) => currentYear - 50 + i);

  const daysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (month, year) => new Date(year, month, 1).getDay();

  const changeMonth = (increment) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + increment);
    setCurrentMonth(newMonth);
  };

  const handleMonthSelect = (monthIndex) => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(monthIndex);
    setCurrentMonth(newDate);
    setViewMode('day');
  };

  const handleYearSelect = (year) => {
    const newDate = new Date(currentMonth);
    newDate.setFullYear(year);
    setCurrentMonth(newDate);
    setViewMode('day');
  };

  const renderDays = () => {
    const days = [];
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const totalDays = daysInMonth(month, year);
    const startDay = firstDayOfMonth(month, year);

    for (let i = 0; i < startDay; i++) {
      days.push(<View key={`empty-${i}`} style={styles.calendarDay} />);
    }

    for (let i = 1; i <= totalDays; i++) {
      const date = new Date(year, month, i);
      const isSelected = selectedDate && 
        date.toDateString() === new Date(selectedDate).toDateString();
      const isToday = date.toDateString() === new Date().toDateString();

      days.push(
        <TouchableOpacity 
          key={i} 
          style={[
            styles.calendarDay, 
            isSelected && styles.calendarDaySelected,
            !isSelected && isToday && styles.calendarDayToday
          ]} 
          onPress={() => onSelectDate(date)}
        >
          <Text style={[
            styles.calendarDayText, 
            isSelected && styles.calendarDayTextSelected
          ]}>{i}</Text>
        </TouchableOpacity>
      );
    }
    return <View style={styles.daysGrid}>{days}</View>;
  };

  const renderMonths = () => (
    <View style={styles.selectionGrid}>
      {months.map((m, index) => (
        <TouchableOpacity 
          key={m} 
          style={[
            styles.selectionItem,
            currentMonth.getMonth() === index && styles.selectionItemSelected
          ]} 
          onPress={() => handleMonthSelect(index)}
        >
          <Text style={[
            styles.selectionItemText,
            currentMonth.getMonth() === index && styles.selectionItemTextSelected
          ]}>{m.substring(0, 3)}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderYears = () => (
    <FlatList
      data={years}
      keyExtractor={(item) => item.toString()}
      numColumns={4}
      contentContainerStyle={styles.yearListContainer}
      showsVerticalScrollIndicator={true}
      renderItem={({ item }) => (
        <TouchableOpacity 
          style={[
            styles.selectionItem,
            currentMonth.getFullYear() === item && styles.selectionItemSelected
          ]}
          onPress={() => handleYearSelect(item)}
        >
          <Text style={[
            styles.selectionItemText,
            currentMonth.getFullYear() === item && styles.selectionItemTextSelected
          ]}>{item}</Text>
        </TouchableOpacity>
      )}
    />
  );

  return (
    <View style={styles.calendarContainer}>
      <View style={styles.calendarHeader}>
        {viewMode === 'day' && (
          <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthNavButton}>
            <Text style={styles.monthNavText}>{'<'}</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity style={styles.headerTitleButton} onPress={() => setViewMode(viewMode === 'day' ? 'month' : 'day')}>
          <Text style={styles.monthTitle}>
            {viewMode === 'year' 
              ? 'Select Year' 
              : viewMode === 'month' 
                ? 'Select Month' 
                : currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </Text>
          {viewMode === 'day' && <Text style={styles.dropdownIcon}>▼</Text>}
        </TouchableOpacity>

        {viewMode === 'day' && (
          <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthNavButton}>
            <Text style={styles.monthNavText}>{'>'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {viewMode !== 'day' && (
        <View style={styles.modeSwitchContainer}>
          <TouchableOpacity 
            style={[styles.modeSwitchBtn, viewMode === 'month' && styles.modeSwitchBtnActive]}
            onPress={() => setViewMode('month')}
          >
            <Text style={[styles.modeSwitchText, viewMode === 'month' && styles.modeSwitchTextActive]}>Months</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.modeSwitchBtn, viewMode === 'year' && styles.modeSwitchBtnActive]}
            onPress={() => setViewMode('year')}
          >
            <Text style={[styles.modeSwitchText, viewMode === 'year' && styles.modeSwitchTextActive]}>Years</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.calendarBody}>
        {viewMode === 'day' && (
          <>
            <View style={styles.weekDaysRow}>
              {['S','M','T','W','T','F','S'].map((day, idx) => (
                <Text key={idx} style={styles.weekDayText}>{day}</Text>
              ))}
            </View>
            {renderDays()}
          </>
        )}
        {viewMode === 'month' && renderMonths()}
        {viewMode === 'year' && renderYears()}
      </View>
    </View>
  );
};

export const JournalEntryForm = ({ visible, entry, onClose, onSave, templateData, initialStep = 0, initialMode = 'edit' }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isReaderMode, setIsReaderMode] = useState(initialMode === 'read');

  const [date, setDate] = useState(new Date());
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [recording, setRecording] = useState();

  // Media Preview States
  const [previewMedia, setPreviewMedia] = useState(null); // { type, uri }
  
  // Audio Player States
  const [audioPlayerVisible, setAudioPlayerVisible] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [currentAudioUri, setCurrentAudioUri] = useState(null);

  // Tags
  const [selectedMood, setSelectedMood] = useState(null);
  const [location, setLocation] = useState('');
  const [selectedActivityTags, setSelectedActivityTags] = useState([]);
  const [customTagInput, setCustomTagInput] = useState('');

  const soundRef = useRef(new Audio.Sound());

  // Handle Hardware Back Button
  useEffect(() => {
    const backAction = () => {
      if (previewMedia) {
        setPreviewMedia(null);
        return true;
      }
      if (visible) {
        if (audioPlayerVisible) {
            closeAudioPlayer(); // Optional: close player on back
        }
        onClose();
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [visible, onClose, previewMedia, audioPlayerVisible]);

  useEffect(() => {
    if (visible) {
      setCurrentStep(initialStep || 0);
      setIsReaderMode(initialMode === 'read');
      setPreviewMedia(null);
      setAudioPlayerVisible(false);

      if (entry) {
        setDate(entry.date ? new Date(entry.date) : new Date());
        setTitle(entry.title || '');
        setNotes(entry.notes || '');
        setAttachments(entry.attachments || []);
        setSelectedMood(entry.mood || null);
        setLocation(entry.location || '');
        setSelectedActivityTags(entry.activityTags || []);
      } else if (templateData) {
        setDate(new Date());
        setTitle(templateData.title || '');
        setNotes(templateData.notes || '');
        setAttachments([]);
        setSelectedMood(templateData.mood || null);
        setLocation(templateData.location || '');
        setSelectedActivityTags(templateData.activityTags || []);
      } else {
        setDate(new Date());
        setTitle('');
        setNotes('');
        setAttachments([]);
        setSelectedMood(null);
        setLocation('');
        setSelectedActivityTags([]);
        setCustomTagInput('');
      }
    }
  }, [entry, templateData, visible, initialStep, initialMode]);

  useEffect(() => {
    return () => {
      soundRef.current.unloadAsync();
    };
  }, []);

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert('Title Required', 'Please provide a title for your entry.');
      return;
    }
    onSave({ 
      date: date.toISOString(),
      title: title.trim(), 
      notes: notes.trim(), 
      attachments,
      mood: selectedMood,
      location: location.trim(),
      activityTags: selectedActivityTags,
    });
    onClose(); 
  };

  // --- Media Logic ---
  
  const handleAttachmentPress = (att) => {
    if (!isReaderMode) return; // Only preview in reader mode (or you can allow in edit too)

    if (att.type === 'image' || att.type === 'video') {
        setPreviewMedia(att);
    } else if (att.type === 'audio') {
        initAudioPlayer(att.uri);
    }
  };

  const initAudioPlayer = async (uri) => {
      try {
          if (currentAudioUri !== uri) {
            await soundRef.current.unloadAsync();
            await soundRef.current.loadAsync({ uri });
            setCurrentAudioUri(uri);
          }
          setAudioPlayerVisible(true);
          await soundRef.current.playAsync();
          setIsPlayingAudio(true);
          
          soundRef.current.setOnPlaybackStatusUpdate((status) => {
              if (status.didJustFinish) {
                  setIsPlayingAudio(false);
                  soundRef.current.setPositionAsync(0);
              }
          });
      } catch (error) {
          console.error("Audio Play Error", error);
          Alert.alert("Error", "Could not play audio.");
      }
  };

  const toggleAudioPlayPause = async () => {
      if (isPlayingAudio) {
          await soundRef.current.pauseAsync();
          setIsPlayingAudio(false);
      } else {
          await soundRef.current.playAsync();
          setIsPlayingAudio(true);
      }
  };

  const closeAudioPlayer = async () => {
      await soundRef.current.unloadAsync();
      setAudioPlayerVisible(false);
      setIsPlayingAudio(false);
      setCurrentAudioUri(null);
  };

  const handlePickMedia = async (mediaType) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Permission to access media library is required.');
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
      saveAttachment(result.assets[0].uri, mediaType);
    }
  };

  const handlePickAudio = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        saveAttachment(result.assets[0].uri, 'audio');
      }
    } catch (err) {
      console.error("Error picking audio:", err);
      Alert.alert("Error", "Failed to select audio file.");
    }
  };

  const saveAttachment = async (uri, type) => {
    try {
      const fileType = uri.split('.').pop();
      const newName = `${Date.now()}.${fileType}`;
      const newPath = FileSystem.documentDirectory + newName;
      await FileSystem.copyAsync({ from: uri, to: newPath });
      setAttachments(prev => [...prev, { uri: newPath, type }]);
    } catch (err) {
      console.error("Error copying file:", err);
      Alert.alert("Error", "Failed to save attachment.");
    }
  }

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Permission to access microphone is required.');
        return;
      }
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
    try {
      const tempUri = recording.getURI(); 
      const newName = `${Date.now()}_recording.m4a`;
      const newPath = FileSystem.documentDirectory + newName;
      await FileSystem.copyAsync({ from: tempUri, to: newPath });
      setAttachments(prev => [...prev, { uri: newPath, type: 'audio' }]);
    } catch (err) {
      console.error("Error saving audio:", err);
    }
  };

  // Simple play for edit mode (no mini player)
  const playSoundEditMode = async (uri) => {
    try {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
      await soundRef.current.unloadAsync(); 
      await soundRef.current.loadAsync({ uri });
      await soundRef.current.playAsync();
    } catch (error) {
      Alert.alert("Error", "Could not play audio file.");
    }
  };

  const removeAttachment = async (uri) => {
    try {
      await FileSystem.deleteAsync(uri, { idempotent: true });
      setAttachments(prev => prev.filter(att => att.uri !== uri));
    } catch (err) {
      setAttachments(prev => prev.filter(att => prev.filter(att => att.uri !== uri)));
    }
  };

  const renderAttachments = (readonly = false) => {
    return attachments.map((att, index) => (
      <View key={index} style={styles.attachmentPreviewContainer}>
        <TouchableOpacity 
            activeOpacity={readonly ? 0.8 : 1}
            onPress={() => readonly ? handleAttachmentPress(att) : null}
            style={{width: '100%'}}
        >
            {att.type === 'image' && (
                <Image source={{ uri: att.uri }} style={styles.previewImage} resizeMode="cover" />
            )}
            {att.type === 'video' && (
                <View pointerEvents="none">
                    <Video source={{ uri: att.uri }} style={styles.previewVideo} resizeMode="cover" />
                    <View style={styles.videoOverlayIcon}>
                        <Text style={{fontSize: 30}}>▶️</Text>
                    </View>
                </View>
            )}
            {att.type === 'audio' && (
                readonly ? (
                    <View style={styles.audioPlaceholder}>
                        <Text style={styles.audioPlaceholderText}>▶️ Tap to listen to Audio</Text>
                    </View>
                ) : (
                    <TouchableOpacity style={styles.audioButton} onPress={() => playSoundEditMode(att.uri)}>
                        <Text style={styles.audioButtonText}>Play Audio: {att.uri.split('/').pop()}</Text>
                    </TouchableOpacity>
                )
            )}
        </TouchableOpacity>

        {!readonly && (
          <TouchableOpacity onPress={() => removeAttachment(att.uri)} style={styles.removeAttButton}>
             <Text style={styles.removeAttButtonText}>X</Text>
          </TouchableOpacity>
        )}
      </View>
    ));
  };

  const goNext = () => {
    if (currentStep < 3) setCurrentStep(currentStep + 1);
  };
  const goBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const toggleActivityTag = (tag) => {
    setSelectedActivityTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };
  const addCustomTag = () => {
    const trimmedTag = customTagInput.trim().toLowerCase();
    if (trimmedTag && !selectedActivityTags.includes(trimmedTag) && !predefinedActivityTags.includes(trimmedTag)) {
      setSelectedActivityTags(prev => [...prev, trimmedTag]);
      setCustomTagInput('');
    }
  };

  // --- Render Steps ---

  const renderStepWhen = () => (
    <View style={[styles.stepContainer, { flex: 1, paddingHorizontal: 20 }]}>
      <Text style={styles.stepTitle}>When did this happen?</Text>
      <CustomCalendar selectedDate={date} onSelectDate={setDate} />
      <View style={styles.dateDisplay}>
        <Text style={styles.dateDisplayText}>
          {date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </Text>
      </View>
    </View>
  );

  const renderStepWhere = () => (
    <ScrollView style={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={[styles.stepContainer, { paddingHorizontal: 20 }]}>
        <Text style={styles.stepTitle}>Where were you?</Text>
        <TextInput
            style={styles.input}
            placeholder="e.g., Home, Central Park, Office"
            placeholderTextColor="#9CA3AF"
            value={location}
            onChangeText={setLocation}
            maxLength={100}
            autoFocus={true}
        />
        </View>
    </ScrollView>
  );

  const renderStepWhoWhat = () => (
    <ScrollView style={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={[styles.stepContainer, { paddingHorizontal: 20 }]}>
        <Text style={styles.stepTitle}>How are you feeling?</Text>
        <MoodSelection selectedMood={selectedMood} onSelectMood={setSelectedMood} />
        
        <Text style={[styles.stepTitle, {marginTop: 30}]}>What have you been up to?</Text>
        <View style={styles.tagsContainer}>
            {[...predefinedActivityTags, ...selectedActivityTags.filter(tag => !predefinedActivityTags.includes(tag))].map((tag) => (
            <TouchableOpacity
                key={tag}
                style={[styles.tagButton, selectedActivityTags.includes(tag) && styles.tagButtonSelected]}
                onPress={() => toggleActivityTag(tag)}
            >
                <Text style={[styles.tagButtonText, selectedActivityTags.includes(tag) && styles.tagButtonTextSelected]}>{tag}</Text>
            </TouchableOpacity>
            ))}
            <View style={styles.customTagInputContainer}>
            <TextInput
                style={styles.customTagInput}
                placeholder="Add new tag"
                placeholderTextColor="#9CA3AF"
                value={customTagInput}
                onChangeText={setCustomTagInput}
                onSubmitEditing={addCustomTag}
                returnKeyType="done"
            />
            <TouchableOpacity style={styles.addTagButton} onPress={addCustomTag}>
                <Text style={styles.addTagButtonText}>+</Text>
            </TouchableOpacity>
            </View>
        </View>
        </View>
    </ScrollView>
  );

  const renderStepJournal = () => (
    <View style={{ flex: 1 }}>
      <ScrollView 
        style={styles.scrollContent} 
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.minimalDateText}>
          {date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
        </Text>

        {isReaderMode ? (
          <>
            <Text style={styles.readerTitle}>{title}</Text>
            <Text style={styles.readerBody}>{notes}</Text>
          </>
        ) : (
          <>
            <TextInput
              style={styles.minimalTitleInput}
              placeholder="Title"
              placeholderTextColor="#D1D5DB"
              value={title}
              onChangeText={setTitle}
              maxLength={100}
              returnKeyType="next"
            />
            
            <TextInput
              style={styles.minimalBodyInput} 
              placeholder="Start writing..."
              placeholderTextColor="#D1D5DB"
              value={notes}
              onChangeText={setNotes}
              multiline={true}
              textAlignVertical="top"
              scrollEnabled={false}
              autoFocus={!isReaderMode && currentStep === 3}
            />
          </>
        )}
        
        <View style={styles.attachmentList}>
          {renderAttachments(isReaderMode)}
        </View>
      </ScrollView>

      {!isReaderMode && (
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
        >
          <View style={styles.minimalToolbar}>
            <TouchableOpacity style={styles.toolbarButton} onPress={() => handlePickMedia('image')}>
              <Text style={styles.toolbarButtonText}>Image</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.toolbarButton} onPress={() => handlePickMedia('video')}>
              <Text style={styles.toolbarButtonText}>Video</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.toolbarButton} onPress={handlePickAudio}>
              <Text style={styles.toolbarButtonText}>Audio</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.toolbarButton, recording && styles.recordingButton]} 
              onPress={recording ? stopRecording : startRecording}
            >
              <Text style={[styles.toolbarButtonText, recording && {color: 'white'}]}>
                {recording ? 'Stop' : 'Rec'}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* Mini Audio Player Overlay */}
      {audioPlayerVisible && (
          <View style={styles.miniPlayerContainer}>
              <View style={styles.miniPlayerContent}>
                  <Text style={styles.miniPlayerTitle}>Audio Playing</Text>
                  <TouchableOpacity onPress={toggleAudioPlayPause} style={styles.miniPlayerControl}>
                      <Text style={styles.miniPlayerControlText}>{isPlayingAudio ? '⏸ Pause' : '▶️ Play'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={closeAudioPlayer} style={styles.miniPlayerClose}>
                      <Text style={styles.miniPlayerCloseText}>Close</Text>
                  </TouchableOpacity>
              </View>
          </View>
      )}
    </View>
  );

  const steps = [renderStepWhen, renderStepWhere, renderStepWhoWhat, renderStepJournal];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.fullScreenContainer}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Text style={styles.headerButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          {currentStep === 3 ? (
             <Text style={styles.progressText}>Entry</Text>
          ) : (
             <Text style={styles.progressText}>Step {currentStep + 1} of 4</Text>
          )}
          
          <View style={styles.headerButton}>
            {currentStep === 3 ? (
              isReaderMode ? (
                <TouchableOpacity onPress={() => setIsReaderMode(false)}>
                   <Text style={[styles.headerButtonText, {color: '#F472B6', fontWeight: '600'}]}>Edit</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={handleSave}>
                   <Text style={[styles.headerButtonText, {color: '#10B981', fontWeight: 'bold'}]}>Save</Text>
                </TouchableOpacity>
              )
            ) : null}
          </View>
        </View>

        <View style={{flex: 1}}>
            {steps[currentStep]()}
        </View>

        {currentStep !== 3 && (
          <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
          >
              <View style={styles.formActions}>
              {currentStep > 0 ? (
                  <TouchableOpacity style={styles.navButtonSecondary} onPress={goBack}>
                  <Text style={styles.navButtonTextSecondary}>Back</Text>
                  </TouchableOpacity>
              ) : <View />}

              {currentStep < 3 ? (
                  <TouchableOpacity style={styles.navButtonPrimary} onPress={goNext}>
                  <Text style={styles.navButtonTextPrimary}>Next</Text>
                  </TouchableOpacity>
              ) : (
                  <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                  <Text style={styles.saveButtonText}>Save Entry</Text>
                  </TouchableOpacity>
              )}
              </View>
          </KeyboardAvoidingView>
        )}

        {/* Full Screen Media Modal */}
        <Modal visible={!!previewMedia} transparent={true} animationType="fade" onRequestClose={() => setPreviewMedia(null)}>
            <View style={styles.fullScreenMediaContainer}>
                <TouchableOpacity style={styles.fullScreenCloseButton} onPress={() => setPreviewMedia(null)}>
                    <Text style={styles.fullScreenCloseText}>✕</Text>
                </TouchableOpacity>
                {previewMedia?.type === 'image' && (
                    <Image source={{ uri: previewMedia.uri }} style={styles.fullScreenImage} resizeMode="contain" />
                )}
                {previewMedia?.type === 'video' && (
                    <Video source={{ uri: previewMedia.uri }} style={styles.fullScreenVideo} useNativeControls resizeMode="contain" shouldPlay />
                )}
            </View>
        </Modal>

      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
    fullScreenContainer: {
        flex: 1,
        backgroundColor: 'white',
        paddingTop: Platform.OS === 'android' ? 25 : 0,
    },
    headerBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 15,
      borderBottomWidth: 1,
      borderBottomColor: '#F3F4F6', 
    },
    headerButton: {
      padding: 5,
      minWidth: 60,
      alignItems: 'flex-end', 
    },
    headerButtonText: {
      color: '#6B7280',
      fontSize: 16,
    },
    progressText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#374151',
    },
    scrollContent: {
        flex: 1,
    },
    stepContainer: {
      marginTop: 20,
      paddingBottom: 20,
    },
    stepTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#1F2937',
      marginBottom: 8,
      textAlign: 'center',
    },
    // --- Clean Minimal Styles for Writing ---
    minimalDateText: {
      fontSize: 13,
      color: '#9CA3AF',
      fontWeight: '600',
      marginBottom: 10,
      marginTop: 20,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    minimalTitleInput: {
      fontSize: 28,
      fontWeight: 'bold',
      color: '#1F2937',
      marginBottom: 16,
      padding: 0,
      backgroundColor: 'transparent',
    },
    minimalBodyInput: {
      fontSize: 18,
      color: '#374151',
      lineHeight: 28,
      padding: 0,
      textAlignVertical: 'top',
      backgroundColor: 'transparent',
      minHeight: 300, 
      marginBottom: 20, 
    },
    readerTitle: {
      fontSize: 28,
      fontWeight: 'bold',
      color: '#1F2937',
      marginBottom: 16,
    },
    readerBody: {
      fontSize: 18,
      color: '#374151',
      lineHeight: 28,
      marginBottom: 20,
    },
    minimalToolbar: {
      flexDirection: 'row',
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: '#F3F4F6',
      justifyContent: 'flex-start',
      backgroundColor: 'white',
      paddingHorizontal: 20,
    },
    toolbarButton: {
      marginRight: 10,
      paddingVertical: 8,
      paddingHorizontal: 14,
      backgroundColor: '#F3F4F6',
      borderRadius: 20, 
    },
    recordingButton: {
      backgroundColor: '#EF4444',
    },
    toolbarButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: '#4B5563',
    },
    // Attachment Styles
    attachmentList: {
        marginBottom: 16,
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
    videoOverlayIcon: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        justifyContent: 'center', alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)'
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
    audioPlaceholder: {
        backgroundColor: '#F3F4F6',
        padding: 20,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB'
    },
    audioPlaceholderText: {
        color: '#374151',
        fontWeight: '600',
        fontSize: 16
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
    
    // Mini Player
    miniPlayerContainer: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        backgroundColor: '#1F2937',
        borderRadius: 12,
        padding: 16,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    miniPlayerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    miniPlayerTitle: {
        color: 'white',
        fontWeight: 'bold',
        flex: 1,
    },
    miniPlayerControl: {
        paddingHorizontal: 15,
    },
    miniPlayerControlText: {
        color: '#F472B6',
        fontWeight: 'bold',
        fontSize: 16,
    },
    miniPlayerClose: {
        paddingLeft: 10,
    },
    miniPlayerCloseText: {
        color: '#9CA3AF',
        fontSize: 12,
    },

    // Full Screen Media
    fullScreenMediaContainer: {
        flex: 1,
        backgroundColor: 'black',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullScreenCloseButton: {
        position: 'absolute',
        top: 40,
        right: 20,
        padding: 10,
        zIndex: 20,
    },
    fullScreenCloseText: {
        color: 'white',
        fontSize: 30,
        fontWeight: 'bold',
    },
    fullScreenImage: {
        width: '100%',
        height: '100%',
    },
    fullScreenVideo: {
        width: '100%',
        height: '100%',
    },

    // Form Action Buttons (Previous steps)
    formActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: '#E5E7EB',
      backgroundColor: 'white',
    },
    navButtonPrimary: {
      backgroundColor: '#F472B6',
      paddingVertical: 14,
      paddingHorizontal: 32,
      borderRadius: 30,
    },
    navButtonTextPrimary: {
      color: 'white',
      fontSize: 18,
      fontWeight: 'bold',
    },
    navButtonSecondary: {
      backgroundColor: '#E5E7EB',
      paddingVertical: 14,
      paddingHorizontal: 32,
      borderRadius: 30,
    },
    navButtonTextSecondary: {
      color: '#374151',
      fontSize: 18,
      fontWeight: '600',
    },
    saveButton: {
      backgroundColor: '#10B981',
      paddingVertical: 14,
      paddingHorizontal: 32,
      borderRadius: 30,
    },
    saveButtonText: {
      color: 'white',
      fontSize: 18,
      fontWeight: 'bold',
    },
    input: {
      borderWidth: 1,
      borderColor: '#D1D5DB',
      padding: 16,
      borderRadius: 12,
      fontSize: 18,
      color: '#1F2937',
      backgroundColor: '#F9FAFB',
      marginTop: 10,
    },
    // Calendar styles reused from previous
    calendarContainer: {
      backgroundColor: '#fff',
      borderRadius: 12,
      padding: 10,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      minHeight: 400, 
      flex: 1,
    },
    calendarHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
      paddingHorizontal: 10,
    },
    headerTitleButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 8,
      backgroundColor: '#F3F4F6',
      borderRadius: 8,
    },
    dropdownIcon: {
      fontSize: 12,
      color: '#F472B6',
      marginLeft: 6,
    },
    modeSwitchContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginBottom: 10,
    },
    modeSwitchBtn: {
      paddingVertical: 6,
      paddingHorizontal: 15,
      borderRadius: 20,
      marginHorizontal: 5,
      backgroundColor: '#F3F4F6',
    },
    modeSwitchBtnActive: {
      backgroundColor: '#F472B6',
    },
    modeSwitchText: {
      color: '#4B5563',
      fontSize: 14,
    },
    modeSwitchTextActive: {
      color: 'white',
      fontWeight: 'bold',
    },
    monthNavButton: {
      padding: 10,
    },
    monthNavText: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#F472B6',
    },
    monthTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#333',
    },
    calendarBody: {
      flex: 1,
    },
    weekDaysRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginBottom: 5,
    },
    weekDayText: {
      width: 35,
      textAlign: 'center',
      fontWeight: 'bold',
      color: '#9CA3AF',
    },
    daysGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    calendarDay: {
      width: (SCREEN_WIDTH - 80) / 7, 
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 5,
    },
    calendarDayToday: {
      borderWidth: 1,
      borderColor: '#F472B6',
      borderRadius: 20,
    },
    calendarDaySelected: {
      backgroundColor: '#F472B6',
      borderRadius: 20,
    },
    calendarDayText: {
      fontSize: 16,
      color: '#374151',
    },
    calendarDayTextSelected: {
      color: 'white',
      fontWeight: 'bold',
    },
    selectionGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      padding: 10,
    },
    yearListContainer: {
      alignItems: 'center',
      paddingBottom: 20,
    },
    selectionItem: {
      width: '22%', 
      paddingVertical: 12,
      marginVertical: 5,
      backgroundColor: '#F9FAFB',
      borderRadius: 8,
      alignItems: 'center',
      marginHorizontal: '1.5%',
    },
    selectionItemSelected: {
      backgroundColor: '#F472B6',
    },
    selectionItemText: {
      fontSize: 14,
      color: '#374151',
    },
    selectionItemTextSelected: {
      color: 'white',
      fontWeight: 'bold',
    },
    dateDisplay: {
      marginTop: 20,
      alignItems: 'center',
    },
    dateDisplayText: {
      fontSize: 18,
      color: '#F472B6',
      fontWeight: 'bold',
    },
    tagsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
    },
    tagButton: {
      backgroundColor: '#E5E7EB',
      borderRadius: 20,
      paddingVertical: 10,
      paddingHorizontal: 16,
      margin: 6,
    },
    tagButtonSelected: {
      backgroundColor: '#F472B6', 
    },
    tagButtonText: {
      color: '#4B5563',
      fontSize: 16,
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
      marginTop: 15,
      justifyContent: 'center',
    },
    customTagInput: {
      borderWidth: 1,
      borderColor: '#D1D5DB',
      padding: 10,
      borderRadius: 8,
      fontSize: 16,
      width: '60%',
      marginRight: 8,
      color: '#1F2937',
    },
    addTagButton: {
      backgroundColor: '#F472B6',
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
    },
    addTagButtonText: {
      color: 'white',
      fontSize: 24,
      fontWeight: 'bold',
      marginTop: -2,
    },
});