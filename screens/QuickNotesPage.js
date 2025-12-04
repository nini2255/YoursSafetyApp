import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Image, 
  Alert, 
  Modal, 
  FlatList,
  Platform,
  Share,
  Linking
} from 'react-native';
import { useJournal } from '../context/JournalContext';
import { useEmergencyContacts } from '../context/EmergencyContactsContext';
import { QuickNoteForm } from '../components/QuickNoteForm';
import { PageHeader } from '../components/PageHeader';
import { Audio } from 'expo-av';

export const QuickNotesPage = ({ navigation }) => {
  const { entries, addEntry, updateEntry, deleteEntry } = useJournal();
  const { contacts: emergencyContacts } = useEmergencyContacts();
  
  const [formVisible, setFormVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [formMode, setFormMode] = useState('edit');

  // Menu State
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);

  // Filter for quick notes
  const quickNotes = entries
    .filter(e => e.type === 'quick_note')
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const leftColumn = [];
  const rightColumn = [];
  quickNotes.forEach((note, index) => {
    if (index % 2 === 0) leftColumn.push(note);
    else rightColumn.push(note);
  });

  const handleSave = async (data) => {
    if (editingEntry) {
      await updateEntry(editingEntry.id, data);
    } else {
      await addEntry(data);
    }
  };

  const playAudio = async (uri) => {
    try {
      const { sound } = await Audio.Sound.createAsync({ uri });
      await sound.playAsync();
    } catch (e) {
      Alert.alert("Error", "Could not play audio");
    }
  };

  // --- Interaction Handlers ---

  const handleNotePress = (note) => {
    setEditingEntry(note);
    setFormMode('view'); // Open in View Mode
    setFormVisible(true);
  };

  const handleNoteLongPress = (note) => {
    setSelectedNote(note);
    setMenuVisible(true);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this note?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: () => {
            deleteEntry(selectedNote.id);
            setMenuVisible(false);
          } 
        }
      ]
    );
  };

  // --- Sharing Logic ---

  const getShareMessage = (note) => {
    let message = `Quick Note - ${new Date(note.date).toLocaleDateString()}\n\n`;
    if (note.notes) message += note.notes;
    return message;
  };

  const shareViaSMS = async (contact) => {
    const message = getShareMessage(selectedNote);
    const separator = Platform.OS === 'ios' ? '&' : '?';
    const url = `sms:${contact.phone}${separator}body=${encodeURIComponent(message)}`;
    
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
        setMenuVisible(false);
      } else {
        Alert.alert('Error', 'SMS is not supported on this device.');
      }
    } catch (err) {
      Alert.alert('Error', 'Could not open messaging app.');
    }
  };

  const shareViaSystem = async () => {
    try {
      const message = getShareMessage(selectedNote);
      await Share.share({
        message: message,
        title: 'Quick Note'
      });
      setMenuVisible(false);
    } catch (error) {
      Alert.alert('Error', 'Share failed.');
    }
  };

  const renderNote = (note) => (
    <TouchableOpacity
      key={note.id}
      style={[styles.card, { backgroundColor: note.color || '#FFFFFF' }]}
      onPress={() => handleNotePress(note)}
      onLongPress={() => handleNoteLongPress(note)}
      activeOpacity={0.8}
    >
      <Text style={styles.dateText}>
        {new Date(note.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
      </Text>
      {note.notes ? <Text style={styles.noteText} numberOfLines={6}>{note.notes}</Text> : null}
      
      <View style={styles.attachmentsRow}>
        {note.attachments && note.attachments.map((att, idx) => (
          att.type === 'image' ? (
            <Image key={idx} source={{ uri: att.uri }} style={styles.previewImg} />
          ) : (
            <TouchableOpacity key={idx} onPress={() => playAudio(att.uri)} style={styles.audioBadge}>
              <Text style={{fontSize:10}}>🎤</Text>
            </TouchableOpacity>
          )
        ))}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <PageHeader title="Quick Notes" onBack={() => navigation.goBack()} />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.masonryContainer}>
          <View style={styles.column}>{leftColumn.map(renderNote)}</View>
          <View style={styles.column}>{rightColumn.map(renderNote)}</View>
        </View>
      </ScrollView>

      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => { setEditingEntry(null); setFormMode('edit'); setFormVisible(true); }}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <QuickNoteForm
        visible={formVisible}
        entry={editingEntry}
        initialMode={formMode}
        onClose={() => setFormVisible(false)}
        onSave={handleSave}
      />

      {/* Long Press Menu Modal */}
      <Modal visible={menuVisible} transparent={true} animationType="slide" onRequestClose={() => setMenuVisible(false)}>
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setMenuVisible(false)}>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>Note Options</Text>
            
            <View style={styles.shareSection}>
              <Text style={styles.sectionHeader}>Share to Contact</Text>
              {emergencyContacts.length > 0 ? (
                <FlatList
                  data={emergencyContacts}
                  keyExtractor={item => item.id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={styles.contactItem} onPress={() => shareViaSMS(item)}>
                      <View style={styles.contactAvatar}>
                        <Text style={styles.contactInitial}>{item.name.charAt(0)}</Text>
                      </View>
                      <Text style={styles.contactName} numberOfLines={1}>{item.name}</Text>
                    </TouchableOpacity>
                  )}
                />
              ) : (
                <Text style={styles.emptyContacts}>No emergency contacts.</Text>
              )}
            </View>

            <TouchableOpacity style={styles.menuOption} onPress={shareViaSystem}>
              <Text style={styles.menuOptionText}>📤 Share via...</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuOption} onPress={handleDelete}>
              <Text style={[styles.menuOptionText, { color: '#EF4444' }]}>🗑️ Delete Note</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setMenuVisible(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F8' },
  scrollContent: { padding: 10 },
  masonryContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  column: { width: '48%' },
  card: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  dateText: { fontSize: 10, color: '#9CA3AF', marginBottom: 4, fontWeight: 'bold' },
  noteText: { fontSize: 14, color: '#374151', lineHeight: 20 },
  attachmentsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  previewImg: { width: 40, height: 40, borderRadius: 4, marginRight: 4, marginBottom: 4, backgroundColor: '#eee' },
  audioBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.05)', justifyContent: 'center', alignItems: 'center', marginRight: 4 },
  fab: {
    position: 'absolute', bottom: 24, right: 20, width: 56, height: 56,
    borderRadius: 28, backgroundColor: '#818CF8', justifyContent: 'center', alignItems: 'center', elevation: 8
  },
  fabText: { color: 'white', fontSize: 30, lineHeight: 34 },

  // Menu Modal Styles
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  menuContent: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  menuTitle: { fontSize: 20, fontWeight: 'bold', color: '#1F2937', marginBottom: 15, textAlign: 'center' },
  shareSection: { marginBottom: 20 },
  sectionHeader: { fontSize: 14, fontWeight: '600', color: '#6B7280', marginBottom: 10 },
  contactItem: { alignItems: 'center', marginRight: 15, width: 60 },
  contactAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', marginBottom: 5 },
  contactInitial: { fontSize: 20, fontWeight: 'bold', color: '#4B5563' },
  contactName: { fontSize: 12, color: '#374151' },
  emptyContacts: { fontSize: 14, color: '#9CA3AF', fontStyle: 'italic' },
  menuOption: { paddingVertical: 15, borderBottomWidth: 1, borderColor: '#F3F4F6' },
  menuOptionText: { fontSize: 16, color: '#374151', fontWeight: '500' },
  cancelBtn: { marginTop: 15, alignItems: 'center', paddingVertical: 10 },
  cancelBtnText: { color: '#6B7280', fontSize: 16, fontWeight: '600' }
});