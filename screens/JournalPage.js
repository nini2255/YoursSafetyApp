// rafaelanunez/yoursapp/yoursApp-main/screens/JournalPage.js

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image
} from 'react-native';
import { useJournal } from '../context/JournalContext';
import { PageHeader } from '../components/PageHeader';
import { JournalTemplateModal } from '../components/JournalTemplateModal';
import { JournalEntryForm } from '../components/JournalEntryForm';
import { IncidentReportForm } from '../components/IncidentReportForm';
import { JournalIcon, EditIcon, DeleteIcon } from '../components/Icons';
import { Video, Audio } from 'expo-av';

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
  const [formVisible, setFormVisible] = useState(false);
  const [incidentFormVisible, setIncidentFormVisible] = useState(false);
  const [templateModalVisible, setTemplateModalVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [templateData, setTemplateData] = useState(null);
  
  const [expandedEntryId, setExpandedEntryId] = useState(null);
  const soundRef = useRef(new Audio.Sound());

  useEffect(() => {
    return () => {
      soundRef.current.unloadAsync();
    };
  }, []);

  const groupedEntries = useMemo(() => {
    if (isLoading || entries.length === 0) return [];
    
    const sortedEntries = [...entries].sort((a, b) => new Date(b.date) - new Date(a.date));

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
      data: groups[date]
    }));
  }, [entries, isLoading]);

  const handleAddEntry = () => {
    setEditingEntry(null);
    setTemplateData(null);
    setTemplateModalVisible(true);
  };

  const handleSelectTemplate = (templateType) => {
    setTemplateModalVisible(false);

    if (templateType === 'incident') {
      setEditingEntry(null);
      setIncidentFormVisible(true);
      return;
    }

    let data = { title: '', notes: '' };
    switch (templateType) {
      case 'journey':
        data = {
          title: 'Journey Log',
          notes: 'From: [Point A]\nTo: [Point B]\n\nNotes:\n',
        };
        break;
      case 'meeting':
        data = {
          title: 'Meeting Log',
          notes: 'Met with: [Person\'s Name]\nLocation: [Location]\n\nNotes:\n',
        };
        break;
      case 'interaction':
        data = {
          title: 'Interaction Log',
          notes: 'Interaction with: [Person\'s Name]\nOutcome: [Good/Mild/Bad]\n\nNotes:\n',
        };
        break;
      default:
        break;
    }
    setTemplateData(data);
    setFormVisible(true);
  };

  const handleEditEntry = (entry) => {
    setEditingEntry(entry);
    if (entry.isIncidentReport) {
      setIncidentFormVisible(true);
    } else {
      setTemplateData(null);
      setFormVisible(true);
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
        onPress={() => handleToggleExpand(item.id)}
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

            {/* Thumbnail: Increased Size */}
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
            renderSectionHeader={({ section: { title } }) => (
                <Text style={styles.sectionHeader}>{title}</Text>
            )}
            showsVerticalScrollIndicator={false}
            extraData={expandedEntryId}
          />
        )}
      </View>

      <TouchableOpacity style={styles.floatingActionButton} onPress={handleAddEntry}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <JournalTemplateModal
        visible={templateModalVisible}
        onClose={() => setTemplateModalVisible(false)}
        onSelectTemplate={handleSelectTemplate}
      />

      <JournalEntryForm
        visible={formVisible}
        entry={editingEntry}
        templateData={templateData}
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
    sectionHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
        backgroundColor: '#FFF8F8',
        paddingTop: 16,
        paddingBottom: 8,
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
    // Updated thumbnail size
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
});