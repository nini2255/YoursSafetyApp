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
  KeyboardAvoidingView
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Audio, Video } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { MoodSelection } from './MoodSelection'; 

const SCREEN_WIDTH = Dimensions.get('window').width;

const predefinedActivityTags = [
  'family', 'friends', 'date', 'exercise', 'sport', 'relax', 'movies',
  'gaming', 'reading', 'cleaning', 'sleep early', 'eat healthy', 'shopping'
];

// --- Custom Calendar Component ---
const CustomCalendar = ({ selectedDate, onSelectDate }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate || Date.now()));
  const [viewMode, setViewMode] = useState('day'); // 'day', 'month', 'year'

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  
  // Generate 101 years centered on current year
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
      {/* Header */}
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

      {/* View Switcher */}
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

      {/* Body */}
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

export const JournalEntryForm = ({ visible, entry, onClose, onSave, templateData }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const [date, setDate] = useState(new Date());
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [recording, setRecording] = useState();

  // Tags
  const [selectedMood, setSelectedMood] = useState(null);
  const [location, setLocation] = useState('');
  const [selectedActivityTags, setSelectedActivityTags] = useState([]);
  const [customTagInput, setCustomTagInput] = useState('');

  const soundRef = useRef(new Audio.Sound());

  useEffect(() => {
    if (visible) {
      setCurrentStep(0);
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
  }, [entry, templateData, visible]);

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

  // --- Media Handlers ---
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

  // Upload Audio File
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

  const playSound = async (uri) => {
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
      setAttachments(prev => prev.filter(att => att.uri !== uri));
    }
  };

  const renderAttachments = () => {
    return attachments.map((att, index) => (
      <View key={index} style={styles.attachmentPreviewContainer}>
        {att.type === 'image' && <Image source={{ uri: att.uri }} style={styles.previewImage} resizeMode="cover" />}
        {att.type === 'video' && <Video source={{ uri: att.uri }} style={styles.previewVideo} useNativeControls resizeMode="contain" />}
        {att.type === 'audio' && (
          <TouchableOpacity style={styles.audioButton} onPress={() => playSound(att.uri)}>
            <Text style={styles.audioButtonText}>Play Audio: {att.uri.split('/').pop()}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => removeAttachment(att.uri)} style={styles.removeAttButton}>
           <Text style={styles.removeAttButtonText}>X</Text>
        </TouchableOpacity>
      </View>
    ));
  };

  // --- Step Navigation ---
  const goNext = () => {
    if (currentStep < 3) setCurrentStep(currentStep + 1);
  };
  const goBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  // --- Tag Helpers ---
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

  // --- Render Steps (Containers managed individually) ---

  // Step 1: Calendar (Uses View, avoids ScrollView conflict with List)
  const renderStepWhen = () => (
    <View style={[styles.stepContainer, { flex: 1 }]}>
      <Text style={styles.stepTitle}>When did this happen?</Text>
      <Text style={styles.stepSubtitle}>Tap the month or year to jump</Text>
      <CustomCalendar selectedDate={date} onSelectDate={setDate} />
      <View style={styles.dateDisplay}>
        <Text style={styles.dateDisplayText}>
          Selected: {date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </Text>
      </View>
    </View>
  );

  // Step 2: Location (Uses ScrollView)
  const renderStepWhere = () => (
    <ScrollView style={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.stepContainer}>
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

  // Step 3: Tags (Uses ScrollView)
  const renderStepWhoWhat = () => (
    <ScrollView style={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.stepContainer}>
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

  // Step 4: Journal (Uses ScrollView with flexGrow for full screen writing)
  const renderStepJournal = () => (
    <View style={[styles.stepContainer, { flex: 1, paddingBottom: 0 }]}>
      <Text style={styles.stepTitle}>Write your entry</Text>
      <TextInput
        style={styles.input}
        placeholder="Title (Required)"
        placeholderTextColor="#9CA3AF"
        value={title}
        onChangeText={setTitle}
        maxLength={100}
      />
      {/* Full Screen Text Input */}
      <TextInput
        style={[styles.input, styles.fullScreenInput]} 
        placeholder="Start writing..."
        placeholderTextColor="#9CA3AF"
        value={notes}
        onChangeText={setNotes}
        multiline={true}
        textAlignVertical="top"
      />
      
      <View style={styles.mediaButtonsContainer}>
        <TouchableOpacity style={styles.mediaButton} onPress={() => handlePickMedia('image')}>
          <Text style={styles.mediaButtonText}>Image</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.mediaButton} onPress={() => handlePickMedia('video')}>
          <Text style={styles.mediaButtonText}>Video</Text>
        </TouchableOpacity>
        
        {/* New Upload Audio Button */}
        <TouchableOpacity style={styles.mediaButton} onPress={handlePickAudio}>
          <Text style={styles.mediaButtonText}>Upload Audio</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.mediaButton} onPress={recording ? stopRecording : startRecording}>
          <Text style={styles.mediaButtonText}>{recording ? 'Stop Rec' : 'Rec Audio'}</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.attachmentList}>
        {renderAttachments()}
      </View>
    </View>
  );

  const steps = [renderStepWhen, renderStepWhere, renderStepWhoWhat, renderStepJournal];

  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={styles.fullScreenContainer}>
        {/* Header */}
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Text style={styles.headerButtonText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.progressText}>Step {currentStep + 1} of 4</Text>
          <View style={styles.headerButton} /> 
        </View>

        {/* Content - No wrapper ScrollView here to prevent nesting errors */}
        <View style={{flex: 1}}>
            {steps[currentStep]()}
        </View>

        {/* Footer Actions */}
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
      borderBottomColor: '#E5E7EB',
    },
    headerButton: {
      padding: 5,
      minWidth: 60,
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
    // Main scrolling container styles for individual steps
    scrollContent: {
        flex: 1,
    },
    scrollContentContainer: {
        flexGrow: 1,
        paddingHorizontal: 20,
    },
    stepContainer: {
      marginTop: 20,
      paddingBottom: 40,
      paddingHorizontal: 20, // Added padding here since parent ScrollView no longer has it
    },
    stepTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#1F2937',
      marginBottom: 8,
      textAlign: 'center',
    },
    stepSubtitle: {
      fontSize: 16,
      color: '#6B7280',
      textAlign: 'center',
      marginBottom: 24,
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
    fullScreenInput: {
      flex: 1, 
      minHeight: 250,
      textAlignVertical: 'top',
      marginBottom: 20,
    },
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

    // --- CALENDAR STYLES ---
    calendarContainer: {
      backgroundColor: '#fff',
      borderRadius: 12,
      padding: 10,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      minHeight: 400, 
      flex: 1, // Allow calendar to grow
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
      width: '22%', // Adjusted for 4 columns
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

    // --- OTHER STYLES ---
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
    mediaButtonsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap', 
        justifyContent: 'space-around',
        marginBottom: 20,
        marginTop: 10,
    },
    mediaButton: {
        backgroundColor: '#E5E7EB',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 6,
        marginBottom: 8, 
        minWidth: '22%',
        alignItems: 'center',
    },
    mediaButtonText: {
        color: '#1F2937',
        fontWeight: '600',
        fontSize: 12,
    },
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
});