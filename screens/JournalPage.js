import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  TextInput,
  LayoutAnimation,
  Platform,
  UIManager,
  Dimensions,
  FlatList,
  Modal,
  Share,
  Linking
} from 'react-native';
import { useJournal } from '../context/JournalContext';
import { useEmergencyContacts } from '../context/EmergencyContactsContext'; // Import Emergency Contacts
import { PageHeader } from '../components/PageHeader';
import { JournalTemplateModal } from '../components/JournalTemplateModal';
import { JournalEntryForm } from '../components/JournalEntryForm';
import { IncidentReportForm } from '../components/IncidentReportForm';
import { JournalIcon, EditIcon, DeleteIcon } from '../components/Icons';
import { Video, Audio } from 'expo-av';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const SCREEN_WIDTH = Dimensions.get('window').width;

// --- Stats Calendar Component ---
const JournalCalendar = ({ entries, onSelectDate }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Calculate entry counts per day
  const entryCounts = useMemo(() => {
    const counts = {};
    entries.forEach(e => {
        const dateStr = new Date(e.date).toDateString();
        counts[dateStr] = (counts[dateStr] || 0) + 1;
    });
    return counts;
  }, [entries]);

  const daysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (month, year) => new Date(year, month, 1).getDay();

  const changeMonth = (increment) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + increment);
    setCurrentMonth(newMonth);
  };

  const renderDays = () => {
    const days = [];
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const totalDays = daysInMonth(month, year);
    const startDay = firstDayOfMonth(month, year);

    for (let i = 0; i < startDay; i++) {
      days.push(<View key={`empty-${i}`} style={calendarStyles.calendarDay} />);
    }

    for (let i = 1; i <= totalDays; i++) {
      const date = new Date(year, month, i);
      const dateStr = date.toDateString();
      const count = entryCounts[dateStr] || 0;
      const isToday = dateStr === new Date().toDateString();

      days.push(
        <TouchableOpacity 
          key={i} 
          style={[
            calendarStyles.calendarDay, 
            isToday && calendarStyles.calendarDayToday,
            count > 0 && calendarStyles.calendarDayHasEntry
          ]} 
          onPress={() => onSelectDate(date)} 
        >
          <Text style={[
            calendarStyles.calendarDayText, 
            isToday && calendarStyles.calendarDayTextToday,
            count > 0 && calendarStyles.calendarDayTextHasEntry
          ]}>{i}</Text>
          
          {count > 0 && (
              <View style={calendarStyles.countBadge}>
                  <Text style={calendarStyles.countText}>{count}</Text>
              </View>
          )}
        </TouchableOpacity>
      );
    }
    return <View style={calendarStyles.daysGrid}>{days}</View>;
  };

  return (
    <View style={calendarStyles.container}>
      <View style={calendarStyles.header}>
        <TouchableOpacity onPress={() => changeMonth(-1)} style={calendarStyles.navButton}>
            <Text style={calendarStyles.navText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={calendarStyles.monthTitle}>
            {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </Text>
        <TouchableOpacity onPress={() => changeMonth(1)} style={calendarStyles.navButton}>
            <Text style={calendarStyles.navText}>{'>'}</Text>
        </TouchableOpacity>
      </View>
      <View style={calendarStyles.weekRow}>
          {['S','M','T','W','T','F','S'].map((d, index) => (
            <Text key={index} style={calendarStyles.weekText}>{d}</Text>
          ))}
      </View>
      {renderDays()}
    </View>
  );
};

const calendarStyles = StyleSheet.create({
    container: {
        backgroundColor: 'white',
        marginHorizontal: 20,
        borderRadius: 12,
        padding: 10,
        marginBottom: 10,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 2,
        shadowOffset: {width:0, height: 2}
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    navButton: { padding: 5 },
    navText: { fontSize: 18, color: '#F472B6', fontWeight: 'bold' },
    monthTitle: { fontSize: 16, fontWeight: 'bold', color: '#374151' },
    weekRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 5 },
    weekText: { color: '#9CA3AF', fontSize: 12, width: (SCREEN_WIDTH - 60)/7, textAlign: 'center' },
    daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    calendarDay: {
        width: (SCREEN_WIDTH - 60) / 7,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
        borderRadius: 8,
    },
    calendarDayToday: { borderWidth: 1, borderColor: '#F472B6' },
    calendarDayHasEntry: { backgroundColor: '#FDF2F8' }, // Light pink bg
    calendarDayText: { fontSize: 14, color: '#374151' },
    calendarDayTextToday: { color: '#F472B6', fontWeight: 'bold' },
    calendarDayTextHasEntry: { fontWeight: '600' },
    countBadge: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        backgroundColor: '#F472B6',
        borderRadius: 5,
        width: 12,
        height: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    countText: { color: 'white', fontSize: 8, fontWeight: 'bold' }
});

// --- Icons ---
const MaximizeIcon = () => (
    <View style={{width: 24, height: 24, borderWidth: 2, borderColor: '#4B5563', borderRadius: 4, justifyContent: 'center', alignItems: 'center'}}>
        <View style={{width: 8, height: 8, borderWidth: 1, borderColor: '#4B5563'}} />
    </View>
);

const ShareIcon = () => (
    <View style={{width: 24, height: 24, justifyContent: 'center', alignItems: 'center'}}>
        {/* Simple Share Icon Representation */}
        <Text style={{fontSize: 18, color: '#4B5563', marginTop: -2}}>📤</Text>
    </View>
);

const getMoodEmoji = (moodKey) => {
  const moodMap = {
    'rad': '😁',
    'good': '😊',
    'meh': '😐',
    'bad': '😟',
    'awful': '😢',
  };
  return moodMap[moodKey] || null;
};

export const JournalPage = ({ navigation }) => {
  const { entries, isLoading, addEntry, updateEntry, deleteEntry } = useJournal();
  const { contacts: emergencyContacts } = useEmergencyContacts(); // Get contacts
  
  // UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedSections, setCollapsedSections] = useState([]);
  const [isCalendarVisible, setIsCalendarVisible] = useState(false);

  // Modal & Form State
  const [formVisible, setFormVisible] = useState(false);
  const [incidentFormVisible, setIncidentFormVisible] = useState(false);
  const [templateModalVisible, setTemplateModalVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [templateData, setTemplateData] = useState(null);
  
  // Share State
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [entryToShare, setEntryToShare] = useState(null);
  
  const [initialFormStep, setInitialFormStep] = useState(0);
  const [initialFormMode, setInitialFormMode] = useState('edit');

  const [expandedEntryId, setExpandedEntryId] = useState(null);
  const soundRef = useRef(new Audio.Sound());
  const lastTap = useRef(null);

  useEffect(() => {
    return () => {
      soundRef.current.unloadAsync();
    };
  }, []);

  // Filter entries based on search
  const filteredEntries = useMemo(() => {
      if (!searchQuery.trim()) return entries;
      const lowerQuery = searchQuery.toLowerCase();
      return entries.filter(e => 
        (e.title && e.title.toLowerCase().includes(lowerQuery)) ||
        (e.notes && e.notes.toLowerCase().includes(lowerQuery)) ||
        (e.location && e.location.toLowerCase().includes(lowerQuery))
      );
  }, [entries, searchQuery]);

  const groupedEntries = useMemo(() => {
    if (isLoading || filteredEntries.length === 0) return [];
    
    const sortedEntries = [...filteredEntries].sort((a, b) => new Date(b.date) - new Date(a.date));

    const groups = sortedEntries.reduce((acc, entry) => {
      const date = new Date(entry.date).toLocaleDateString(undefined, {
        year: 'numeric', month: 'long', day: 'numeric'
      });
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(entry);
      return acc;
    }, {});

    return Object.keys(groups).map(date => ({
      title: date,
      data: collapsedSections.includes(date) ? [] : groups[date] 
    }));
  }, [filteredEntries, isLoading, collapsedSections]);

  const toggleSection = (sectionTitle) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setCollapsedSections(prev => 
        prev.includes(sectionTitle) 
            ? prev.filter(t => t !== sectionTitle)
            : [...prev, sectionTitle]
      );
  };

  // --- Sharing Logic ---
  
  const handleShareButtonPress = (item) => {
      setEntryToShare(item);
      setShareModalVisible(true);
  };

  const getShareMessage = (entry) => {
      let message = `Journal Entry: ${entry.title}\nDate: ${new Date(entry.date).toLocaleDateString()}\n\n`;
      if (entry.notes) message += entry.notes;
      if (entry.description) message += entry.description; // For incident reports
      return message;
  };

  const shareViaSMS = async (contact) => {
      const message = getShareMessage(entryToShare);
      const separator = Platform.OS === 'ios' ? '&' : '?';
      const url = `sms:${contact.phone}${separator}body=${encodeURIComponent(message)}`;
      
      try {
          const supported = await Linking.canOpenURL(url);
          if (supported) {
              await Linking.openURL(url);
              setShareModalVisible(false);
          } else {
              Alert.alert('Error', 'SMS is not supported on this device.');
          }
      } catch (err) {
          console.error(err);
          Alert.alert('Error', 'Could not open messaging app.');
      }
  };

  const shareViaSystem = async () => {
      try {
          const message = getShareMessage(entryToShare);
          await Share.share({
              message: message,
              title: `Journal: ${entryToShare.title}`
          });
          setShareModalVisible(false);
      } catch (error) {
          Alert.alert('Error', 'Share failed.');
      }
  };

  // --- End Sharing Logic ---

  const handleAddEntry = () => {
    setEditingEntry(null);
    setTemplateData(null);
    setInitialFormStep(0);
    setInitialFormMode('edit'); 
    setTemplateModalVisible(true);
  };

  const handleSelectTemplate = (templateType, customData = {}) => {
    setTemplateModalVisible(false);

    if (templateType === 'incident') {
      setEditingEntry(null);
      setIncidentFormVisible(true);
      return;
    }

    let data = { title: '', notes: '' };
    switch (templateType) {
      case 'journey':
        const from = customData.from ? customData.from : '[Point A]';
        const to = customData.to ? customData.to : '[Point B]';
        data = {
          title: 'Journey Log',
          notes: `From: ${from}\nTo: ${to}\n\nNotes:\n`,
        };
        break;
      case 'meeting':
        const meetPerson = customData.person ? customData.person : "[Person's Name]";
        const meetLoc = customData.location ? customData.location : "[Location]";
        data = {
          title: 'Meeting Log',
          notes: `Met with: ${meetPerson}\nLocation: ${meetLoc}\n\nNotes:\n`,
        };
        break;
      case 'interaction':
        const interactPerson = customData.person ? customData.person : "[Person's Name]";
        const outcome = customData.outcome ? customData.outcome : "[Good/Mild/Bad]";
        data = {
          title: 'Interaction Log',
          notes: `Interaction with: ${interactPerson}\nOutcome: ${outcome}\n\nNotes:\n`,
        };
        break;
      default:
        break;
    }
    setTemplateData(data);
    setInitialFormStep(0);
    setInitialFormMode('edit');
    setFormVisible(true);
  };

  const handleEditEntry = (entry) => {
    setEditingEntry(entry);
    if (entry.isIncidentReport) {
      setIncidentFormVisible(true);
    } else {
      setTemplateData(null);
      setInitialFormStep(0); 
      setInitialFormMode('edit'); 
      setFormVisible(true);
    }
  };

  const openEntryFullScreen = (item) => {
      if (item.isIncidentReport) {
        setEditingEntry(item);
        setIncidentFormVisible(true);
      } else {
        setEditingEntry(item);
        setTemplateData(null);
        setInitialFormStep(3); 
        setInitialFormMode('read'); 
        setFormVisible(true);
      }
  }

  const handleItemPress = (item) => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300; 

    if (lastTap.current && lastTap.current.id === item.id && (now - lastTap.current.timestamp) < DOUBLE_PRESS_DELAY) {
      lastTap.current = null; 
      openEntryFullScreen(item);
    } else {
      lastTap.current = { id: item.id, timestamp: now };
      handleToggleExpand(item.id);
    }
  };

  const handleSaveEntry = async (entryData) => {
    try {
      if (editingEntry) {
        await updateEntry(editingEntry.id, entryData);
      } else {
        await addEntry(entryData);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save the journal entry.');
    } finally {
        setFormVisible(false);
        setIncidentFormVisible(false);
    }
  };

  const handleDeleteEntry = (entry) => {
    Alert.alert(
      'Delete Entry',
      `Are you sure you want to delete "${entry.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteEntry(entry.id) },
      ]
    );
  };
  
  const getSeverityColor = (severity) => {
      const colors = { danger: '#FECACA', warning: '#FEF08A', suspicious: '#E5E7EB', regular: 'white' };
      return colors[severity] || 'white';
  }

  const handleToggleExpand = (itemId) => {
    setExpandedEntryId(prevId => (prevId === itemId ? null : itemId));
  };

  const playSound = async (uri) => {
    try {
      await soundRef.current.unloadAsync(); 
      await soundRef.current.loadAsync({ uri });
      await soundRef.current.playAsync();
    } catch (error) {
      console.error("Failed to play sound", error);
      Alert.alert("Error", "Could not play audio file.");
    }
  };

  const renderTags = (item) => {
    const { mood, location, activityTags } = item;
    const moodEmoji = getMoodEmoji(mood);
    const hasLocation = location && location.trim().length > 0;
    const hasActivities = activityTags && activityTags.length > 0;

    if (!moodEmoji && !hasLocation && !hasActivities) return null; 

    return (
      <View style={styles.tagsContainer}>
        {moodEmoji && <Text style={styles.moodTag}>{moodEmoji}</Text>}
        {hasLocation && (
          <View style={styles.tagChip}>
            <Text style={styles.tagText}>{location}</Text>
          </View>
        )}
        {hasActivities && activityTags.map((tag, index) => (
          <View key={index} style={styles.tagChip}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ))}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.fullPage}>
        <PageHeader title="My Journal" onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <Text>Loading journal...</Text>
        </View>
      </View>
    );
  }

  const renderJournalItem = ({ item }) => {
    const isExpanded = item.id === expandedEntryId;
    const firstImage = item.attachments?.find(att => att.type === 'image');

    return (
      <TouchableOpacity
        style={[styles.journalItem, {backgroundColor: getSeverityColor(item.severity)}]}
        onPress={() => handleItemPress(item)} 
        activeOpacity={0.7}
      >
        <View style={styles.journalItemMainRow}>
            <View style={styles.journalItemContent}>
                <Text style={styles.journalItemTitle}>{item.title}</Text>
                <Text style={styles.journalItemDate}>
                    {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
                {item.isIncidentReport ? (
                    <>
                        <Text style={styles.incidentDetail}><Text style={{fontWeight: 'bold'}}>Person: </Text>{item.personName} ({item.relationship})</Text>
                        <Text style={styles.incidentDetail}><Text style={{fontWeight: 'bold'}}>Location: </Text>{item.location}</Text>
                        <Text style={styles.incidentDetail}><Text style={{fontWeight: 'bold'}}>Incident: </Text>{item.incidentType}</Text>
                        <Text style={styles.journalItemNotes} numberOfLines={isExpanded ? undefined : 3}>{item.description}</Text>
                    </>
                ) : (
                    <Text style={styles.journalItemNotes} numberOfLines={isExpanded ? undefined : 3}>{item.notes}</Text>
                )}
            </View>

            {firstImage && !isExpanded && (
                <Image source={{ uri: firstImage.uri }} style={styles.thumbnail} />
            )}
        </View>

        <View>
            {isExpanded && item.attachments && (
             <View style={styles.attachmentContainer}>
               {item.attachments.map((att, index) => {
                 if (att.type === 'image') {
                   return (
                     <Image key={index} source={{ uri: att.uri }} style={styles.attachmentImage} resizeMode="cover" />
                   );
                 }
                 if (att.type === 'video') {
                   return (
                     <Video
                       key={index}
                       source={{ uri: att.uri }}
                       style={styles.attachmentVideo}
                       useNativeControls
                       resizeMode="contain"
                     />
                   );
                 }
                 if (att.type === 'audio') {
                   return (
                     <TouchableOpacity key={index} style={styles.audioButton} onPress={() => playSound(att.uri)}>
                       <Text style={styles.audioButtonText}>Play Audio Recording</Text>
                     </TouchableOpacity>
                   );
                 }
                 return null;
               })}
             </View>
           )}
           {renderTags(item)}
        </View>

        <View style={styles.journalActionsRow}>
          {/* Share Button */}
          <TouchableOpacity
            style={styles.actionButton}
            onPressIn={(e) => e.stopPropagation()}
            onPress={() => handleShareButtonPress(item)}
          >
            <ShareIcon />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPressIn={(e) => e.stopPropagation()}
            onPress={() => openEntryFullScreen(item)}
          >
            <MaximizeIcon />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPressIn={(e) => e.stopPropagation()}
            onPress={() => handleEditEntry(item)}
          >
            <EditIcon />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPressIn={(e) => e.stopPropagation()}
            onPress={() => handleDeleteEntry(item)}
          >
            <DeleteIcon />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.fullPage}>
      <PageHeader title="My Journal" onBack={() => navigation.goBack()} />

      <View style={styles.searchContainer}>
          <TextInput 
            style={styles.searchInput}
            placeholder="Search entries..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
      </View>

      <TouchableOpacity 
        style={styles.calendarToggleButton} 
        onPress={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setIsCalendarVisible(!isCalendarVisible);
        }}
      >
          <Text style={styles.calendarToggleText}>
              {isCalendarVisible ? 'Hide Calendar' : 'Show Calendar View'}
          </Text>
      </TouchableOpacity>

      {isCalendarVisible && (
          <JournalCalendar 
            entries={entries} 
            onSelectDate={(date) => {
                const dateStr = date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
                setSearchQuery(dateStr); 
            }}
          />
      )}

      <View style={styles.journalContainer}>
        {entries.length === 0 ? (
          <View style={styles.emptyState}>
            <JournalIcon color="#D1D5DB" />
            <Text style={styles.emptyStateText}>Your journal is empty</Text>
            <Text style={styles.emptyStateSubtext}>
              Create your first entry to log incidents and keep a timeline of events.
            </Text>
          </View>
        ) : (
          <SectionList
            sections={groupedEntries}
            keyExtractor={(item) => item.id}
            renderItem={renderJournalItem}
            renderSectionHeader={({ section: { title, data } }) => (
                <TouchableOpacity onPress={() => toggleSection(title)} activeOpacity={0.7}>
                    <View style={styles.sectionHeaderContainer}>
                        <Text style={styles.sectionHeader}>{title}</Text>
                        <Text style={styles.sectionCollapseIcon}>
                            {collapsedSections.includes(title) ? 'Show' : 'Hide'}
                        </Text>
                    </View>
                </TouchableOpacity>
            )}
            showsVerticalScrollIndicator={false}
            extraData={expandedEntryId}
          />
        )}
      </View>

      <TouchableOpacity style={styles.floatingActionButton} onPress={handleAddEntry}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* --- Share Modal --- */}
      <Modal visible={shareModalVisible} transparent={true} animationType="slide" onRequestClose={() => setShareModalVisible(false)}>
          <View style={styles.modalOverlay}>
              <View style={styles.shareModalContent}>
                  <Text style={styles.shareModalTitle}>Share Entry</Text>
                  <Text style={styles.shareModalSubtitle}>Send to Emergency Contacts</Text>
                  
                  {emergencyContacts.length > 0 ? (
                      <FlatList 
                          data={emergencyContacts}
                          keyExtractor={item => item.id}
                          renderItem={({ item }) => (
                              <TouchableOpacity style={styles.contactItem} onPress={() => shareViaSMS(item)}>
                                  <Text style={styles.contactName}>{item.name}</Text>
                                  <Text style={styles.contactPhone}>{item.phone}</Text>
                              </TouchableOpacity>
                          )}
                          style={{maxHeight: 200}}
                      />
                  ) : (
                      <Text style={styles.noContactsText}>No emergency contacts found.</Text>
                  )}

                  <TouchableOpacity style={styles.systemShareButton} onPress={shareViaSystem}>
                      <Text style={styles.systemShareText}>Share via other apps...</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.cancelButton} onPress={() => setShareModalVisible(false)}>
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
              </View>
          </View>
      </Modal>

      <JournalTemplateModal
        visible={templateModalVisible}
        onClose={() => setTemplateModalVisible(false)}
        onSelectTemplate={handleSelectTemplate}
      />

      <JournalEntryForm
        visible={formVisible}
        entry={editingEntry}
        templateData={templateData}
        initialStep={initialFormStep}
        initialMode={initialFormMode}
        onClose={() => setFormVisible(false)}
        onSave={handleSaveEntry}
      />

      <IncidentReportForm
        visible={incidentFormVisible}
        entry={editingEntry}
        onClose={() => setIncidentFormVisible(false)}
        onSave={handleSaveEntry}
      />
    </View>
  );
};

const styles = StyleSheet.create({
    fullPage: {
        flex: 1,
        backgroundColor: '#FFF8F8',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    // Search Styles
    searchContainer: {
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    searchInput: {
        backgroundColor: 'white',
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 10,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    // Calendar Toggle
    calendarToggleButton: {
        alignItems: 'center',
        marginBottom: 10,
    },
    calendarToggleText: {
        color: '#F472B6',
        fontWeight: '600',
        fontSize: 14,
    },
    journalContainer: {
        flex: 1,
        paddingHorizontal: 20,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyStateText: {
        marginTop: 16,
        fontSize: 18,
        fontWeight: '600',
        color: '#374151',
    },
    emptyStateSubtext: {
        marginTop: 4,
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        maxWidth: '80%',
    },
    sectionHeaderContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FFF8F8',
        paddingTop: 16,
        paddingBottom: 8,
    },
    sectionHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    sectionCollapseIcon: {
        fontSize: 12,
        color: '#6B7280',
        fontWeight: '600',
    },
    journalItem: {
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      flexDirection: 'column', 
    },
    journalItemMainRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    journalItemContent: {
      flex: 1,
      marginRight: 10,
    },
    thumbnail: {
        width: 100,
        height: 100,
        borderRadius: 8,
        backgroundColor: '#E5E7EB',
    },
    journalItemTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#1F2937',
      marginBottom: 4,
    },
    journalItemDate: {
      fontSize: 12,
      color: '#6B7280',
      marginBottom: 8,
    },
    journalItemNotes: {
      fontSize: 14,
      color: '#4B5563',
      lineHeight: 20,
      marginTop: 4,
    },
    incidentDetail: {
        fontSize: 14,
        color: '#4B5563',
        marginBottom: 2,
    },
    journalActionsRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: 10,
      borderTopWidth: 1,
      borderTopColor: 'rgba(0,0,0,0.05)',
      paddingTop: 8,
    },
    actionButton: {
        padding: 8,
        marginLeft: 10,
    },
    floatingActionButton: {
        position: 'absolute',
        bottom: 24,
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#F9A8D4',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
      },
      fabText: {
        color: 'white',
        fontSize: 30,
        lineHeight: 34,
      },
    attachmentContainer: {
      marginTop: 12,
    },
    attachmentImage: {
      width: '100%',
      height: 200,
      borderRadius: 8,
      marginBottom: 8,
    },
    attachmentVideo: {
      width: '100%',
      height: 200,
      borderRadius: 8,
      marginBottom: 8,
      backgroundColor: '#000',
    },
    audioButton: {
      backgroundColor: '#F472B6',
      padding: 12,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 8,
    },
    audioButtonText: {
      color: 'white',
      fontWeight: 'bold',
      fontSize: 14,
    },
    tagsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      marginTop: 10,
      borderTopWidth: 1,
      borderTopColor: 'rgba(0, 0, 0, 0.1)',
      paddingTop: 8,
    },
    moodTag: {
      fontSize: 20,
      marginRight: 8,
    },
    tagChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#F3F4F6',
      borderRadius: 16,
      paddingVertical: 4,
      paddingHorizontal: 10,
      marginRight: 6,
      marginBottom: 6,
    },
    tagText: {
      fontSize: 12,
      color: '#4B5563',
      marginLeft: 4,
      fontWeight: '500',
      textTransform: 'capitalize',
    },
    
    // Share Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    shareModalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: '60%',
    },
    shareModalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 5,
        textAlign: 'center',
    },
    shareModalSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 20,
        textAlign: 'center',
    },
    contactItem: {
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    contactName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
    },
    contactPhone: {
        fontSize: 14,
        color: '#9CA3AF',
    },
    noContactsText: {
        textAlign: 'center',
        color: '#9CA3AF',
        marginVertical: 20,
    },
    systemShareButton: {
        marginTop: 15,
        paddingVertical: 12,
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
        alignItems: 'center',
    },
    systemShareText: {
        color: '#4B5563',
        fontWeight: '600',
    },
    cancelButton: {
        marginTop: 10,
        paddingVertical: 12,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: '#EF4444',
        fontWeight: '600',
        fontSize: 16,
    },
});