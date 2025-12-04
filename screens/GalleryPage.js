import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { 
  View, Text, StyleSheet, SectionList, Image, TouchableOpacity, 
  Dimensions, Modal, Alert, PanResponder, Platform, 
  UIManager, LayoutAnimation, ActivityIndicator
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Video } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import Share from 'react-native-share'; 
import { getGalleryMedia, insertMedia, deleteMedia } from '../utils/db';
import { saveFileToGallery, deleteFile } from '../utils/fileSystem';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const SPACING = 2;
const IMAGE_SIZE = (width / COLUMN_COUNT) - (SPACING * 2);

const GalleryPage = () => {
  const [mediaItems, setMediaItems] = useState([]);
  const [selectedMedia, setSelectedMedia] = useState(null); // For full screen viewer
  const [collapsedSections, setCollapsedSections] = useState([]);
  
  // Selection Mode State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]); // Array of IDs

  // Refs for PanResponder to access current state without stale closures
  const mediaItemsRef = useRef(mediaItems);
  const selectedMediaRef = useRef(selectedMedia);

  // Keep refs synced with state
  useEffect(() => { mediaItemsRef.current = mediaItems; }, [mediaItems]);
  useEffect(() => { selectedMediaRef.current = selectedMedia; }, [selectedMedia]);

  useFocusEffect(
    useCallback(() => {
      loadMedia();
    }, [])
  );

  const loadMedia = async () => {
    try {
      const media = await getGalleryMedia();
      setMediaItems(media);
    } catch (error) {
      console.error('Error loading gallery media:', error);
    }
  };

  // --- Grouping Logic ---
  const sections = useMemo(() => {
    if (!mediaItems.length) return [];
    const groups = mediaItems.reduce((acc, item) => {
      const date = new Date(item.createdAt);
      const dateKey = date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(item);
      return acc;
    }, {});

    return Object.keys(groups).map(dateKey => ({
      title: dateKey,
      data: collapsedSections.includes(dateKey) ? [] : [groups[dateKey]], 
      count: groups[dateKey].length
    }));
  }, [mediaItems, collapsedSections]);

  const toggleSection = (title) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCollapsedSections(prev => prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]);
  };

  // --- Selection Logic ---
  const handleLongPress = (item) => {
    setIsSelectionMode(true);
    toggleSelection(item.id);
  };

  const toggleSelection = (id) => {
    setSelectedItems(prev => {
      let newSelection;
      if (prev.includes(id)) {
        newSelection = prev.filter(i => i !== id);
      } else {
        newSelection = [...prev, id];
      }
      
      // Auto-exit selection mode if empty
      if (newSelection.length === 0) {
          setIsSelectionMode(false);
      }
      return newSelection;
    });
  };

  const cancelSelection = () => {
    setIsSelectionMode(false);
    setSelectedItems([]);
  };

  const handleShareSelected = async () => {
    if (selectedItems.length === 0) return;
    
    try {
      const filesToShare = mediaItems
        .filter(item => selectedItems.includes(item.id))
        .map(item => item.localUri);

      await Share.open({
        urls: filesToShare,
        type: '*/*',
      });
      cancelSelection();
    } catch (error) {
      console.log('Share dismissed or failed', error);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedItems.length === 0) return;

    Alert.alert(
      'Delete Items',
      `Are you sure you want to delete ${selectedItems.length} item(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            for (const id of selectedItems) {
                const item = mediaItems.find(m => m.id === id);
                if (item) {
                    await deleteFile(item.localUri);
                    await deleteMedia(id);
                }
            }
            loadMedia();
            cancelSelection();
          }
        }
      ]
    );
  };

  // --- Full Screen Navigation Logic ---
  const openFullScreen = (item) => {
      if (isSelectionMode) {
          toggleSelection(item.id);
      } else {
          setSelectedMedia(item);
      }
  };

  const navigateImage = (direction) => {
      const currentMedia = selectedMediaRef.current;
      const items = mediaItemsRef.current;
      
      if (!currentMedia || !items.length) return;
      
      const currentIndex = items.findIndex(m => m.id === currentMedia.id);
      
      let nextIndex = -1;
      
      // Note: Items are sorted Newest (0) to Oldest (N)
      if (direction === 'next') {
          // User requested "Next", usually implies moving forward in list (older images)
          nextIndex = currentIndex + 1; 
      } else {
          // User requested "Previous", usually implies moving backward in list (newer images)
          nextIndex = currentIndex - 1; 
      }

      if (nextIndex >= 0 && nextIndex < items.length) {
          setSelectedMedia(items[nextIndex]);
      }
  };

  // --- Gesture Handler ---
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      // Allow clicks to pass through if movement is small, catch swipes if large
      onMoveShouldSetPanResponder: (_, gestureState) => {
          return Math.abs(gestureState.dx) > 20 || Math.abs(gestureState.dy) > 20;
      },
      onPanResponderRelease: (evt, gestureState) => {
        const { dx, dy } = gestureState;
        const SWIPE_THRESHOLD = 50;

        if (Math.abs(dy) > Math.abs(dx)) {
            // Vertical Swipe
            if (dy > SWIPE_THRESHOLD) {
                // Swipe Down -> Close
                setSelectedMedia(null);
            }
        } else {
            // Horizontal Swipe
            if (dx > SWIPE_THRESHOLD) {
                // Swipe Right -> Next Image (as requested)
                navigateImage('next');
            } else if (dx < -SWIPE_THRESHOLD) {
                // Swipe Left -> Previous Image (as requested)
                navigateImage('prev');
            }
        }
      },
    })
  ).current;

  // --- Grid Item Render ---
  const renderGridItem = (item) => {
    const isSelected = selectedItems.includes(item.id);
    
    return (
      <TouchableOpacity 
        key={item.id} 
        style={[styles.mediaItem, isSelected && styles.mediaItemSelected]} 
        onPress={() => openFullScreen(item)}
        onLongPress={() => handleLongPress(item)}
        delayLongPress={300}
      >
        {item.type === 'image' ? (
          <Image source={{ uri: item.localUri }} style={styles.thumbnail} />
        ) : item.type === 'video' ? (
          <View style={styles.videoContainer}>
             <Video source={{ uri: item.localUri }} style={styles.thumbnail} resizeMode="cover" />
             <View style={styles.iconOverlay}><Ionicons name="play-circle" size={24} color="rgba(255,255,255,0.8)" /></View>
          </View>
        ) : (
           <View style={[styles.thumbnail, styles.audioPlaceholder]}><Ionicons name="musical-notes" size={32} color="#666" /></View>
        )}
        
        {/* Selection Overlay */}
        {isSelectionMode && (
            <View style={styles.selectionOverlay}>
                <Ionicons name={isSelected ? "checkmark-circle" : "ellipse-outline"} size={24} color={isSelected ? "#F472B6" : "white"} />
            </View>
        )}
        
        {!isSelectionMode && item.journalTitle && (
          <View style={styles.journalBadge}>
            <Text style={styles.journalBadgeText} numberOfLines={1}>{item.journalTitle}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderSectionBody = ({ item: dayItems }) => (
    <View style={styles.gridContainer}>
      {dayItems.map(renderGridItem)}
      {Array.from({ length: COLUMN_COUNT - (dayItems.length % COLUMN_COUNT) }).map((_, i) => (
           <View key={`spacer-${i}`} style={[styles.mediaItem, { backgroundColor: 'transparent' }]} />
      ))}
    </View>
  );

  const pickMedia = async (type) => {
    let result = await (type === 'image' 
        ? ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 }) 
        : ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Videos }));

    if (!result.canceled) {
      try {
        const persistentUri = await saveFileToGallery(result.assets[0].uri, type);
        await insertMedia(persistentUri, type, null, 'Direct Upload');
        loadMedia();
      } catch (error) {
        Alert.alert('Error', 'Failed to save media.');
      }
    }
  };

  return (
    <View style={styles.container}>
      {/* Selection Header */}
      {isSelectionMode && (
          <View style={styles.selectionHeader}>
              <TouchableOpacity onPress={cancelSelection} style={{padding: 5}}>
                  <Ionicons name="close" size={26} color="#374151" />
              </TouchableOpacity>
              <Text style={styles.selectionTitle}>{selectedItems.length} Selected</Text>
              <View style={{flexDirection: 'row'}}>
                  <TouchableOpacity onPress={handleShareSelected} style={{marginRight: 20}}>
                      <Ionicons name="share-outline" size={26} color="#374151" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleDeleteSelected}>
                      <Ionicons name="trash-outline" size={26} color="#EF4444" />
                  </TouchableOpacity>
              </View>
          </View>
      )}

      <SectionList
        sections={sections}
        keyExtractor={(item, index) => index.toString()}
        renderItem={renderSectionBody}
        renderSectionHeader={({ section: { title, count } }) => (
            <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection(title)}>
              <View style={{flexDirection: 'row', alignItems: 'baseline'}}>
                <Text style={styles.headerTitle}>{title}</Text>
                <Text style={styles.headerCount}>{count} items</Text>
              </View>
              <Ionicons name={collapsedSections.includes(title) ? "chevron-down" : "chevron-up"} size={20} color="#6B7280" />
            </TouchableOpacity>
        )}
        contentContainerStyle={{paddingBottom: 100}}
        stickySectionHeadersEnabled
        ListEmptyComponent={<View style={styles.center}><Text style={{color:'#999'}}>No media yet.</Text></View>}
      />
      
      {!isSelectionMode && (
        <View style={styles.fabContainer}>
            <TouchableOpacity style={[styles.fab, { marginBottom: 10, backgroundColor: '#F9A8D4' }]} onPress={() => pickMedia('video')}>
            <Ionicons name="videocam" size={24} color="white" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.fab, { backgroundColor: '#F472B6' }]} onPress={() => pickMedia('image')}>
            <Ionicons name="image" size={24} color="white" />
            </TouchableOpacity>
        </View>
      )}

      {/* Full Screen Viewer */}
      <Modal visible={!!selectedMedia} transparent animationType="fade" onRequestClose={() => setSelectedMedia(null)}>
        <View style={styles.modalContainer} {...panResponder.panHandlers}>
           {/* Top Controls */}
           <View style={styles.modalControls}>
                <TouchableOpacity onPress={() => setSelectedMedia(null)} style={styles.controlButton}>
                    <Ionicons name="close" size={30} color="white" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => {
                    Alert.alert('Delete', 'Delete this item?', [
                        {text: 'Cancel'}, 
                        {text: 'Delete', style:'destructive', onPress: async () => {
                            await deleteFile(selectedMedia.localUri);
                            await deleteMedia(selectedMedia.id);
                            setSelectedMedia(null);
                            loadMedia();
                        }}
                    ])
                }} style={styles.controlButton}>
                    <Ionicons name="trash" size={28} color="#FF6B6B" />
                </TouchableOpacity>
           </View>
           
           <View style={styles.modalContent}>
               {selectedMedia?.type === 'image' && (
                 <Image source={{ uri: selectedMedia.localUri }} style={styles.fullMedia} resizeMode="contain" />
               )}
               {selectedMedia?.type === 'video' && (
                  // Native controls removed temporarily to ensure swipes work over video area
                  <Video 
                    source={{ uri: selectedMedia.localUri }} 
                    style={styles.fullMedia} 
                    resizeMode="contain" 
                    shouldPlay 
                    isLooping
                  />
               )}
               {selectedMedia?.type === 'audio' && (
                  <View style={styles.center}>
                     <Ionicons name="musical-notes" size={80} color="white" />
                     <Text style={{color:'white', marginTop:20}}>Audio File</Text>
                  </View>
               )}
           </View>

           {/* Swipe Instructions */}
           <View style={styles.swipeHintLeft}><Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.3)"/></View>
           <View style={styles.swipeHintRight}><Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.3)"/></View>
           <View style={styles.swipeHintBottom}><Ionicons name="chevron-down" size={24} color="rgba(255,255,255,0.3)"/></View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F8' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF8F8', padding: 12, borderBottomWidth: 1, borderColor: '#F3F4F6' },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#1F2937', marginRight: 8 },
  headerCount: { fontSize: 12, color: '#9CA3AF' },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 2 },
  mediaItem: { width: IMAGE_SIZE, height: IMAGE_SIZE, margin: SPACING, borderRadius: 8, overflow: 'hidden', backgroundColor: '#eee' },
  mediaItemSelected: { borderWidth: 3, borderColor: '#F472B6', opacity: 0.8 },
  thumbnail: { width: '100%', height: '100%' },
  videoContainer: { position: 'relative', width: '100%', height: '100%' },
  iconOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  selectionOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-start', alignItems: 'flex-end', padding: 5 },
  audioPlaceholder: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#E5E7EB' },
  journalBadge: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', paddingVertical: 2, paddingHorizontal: 4 },
  journalBadgeText: { color: 'white', fontSize: 9, textAlign: 'center' },
  center: { alignItems: 'center', justifyContent: 'center', marginTop: 50 },
  fabContainer: { position: 'absolute', bottom: 20, right: 20, alignItems: 'center' },
  fab: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  
  // Selection Header
  selectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 40 : 20, paddingBottom: 15, elevation: 4, zIndex: 100 },
  selectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#374151' },

  // Modal
  modalContainer: { flex: 1, backgroundColor: 'black' },
  modalControls: { position: 'absolute', top: 40, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, zIndex: 10 },
  controlButton: { padding: 10, backgroundColor:'rgba(0,0,0,0.3)', borderRadius:20 },
  modalContent: { flex: 1, justifyContent: 'center' },
  fullMedia: { width: width, height: '80%' },
  swipeHintLeft: { position: 'absolute', left: 10, top: '50%' },
  swipeHintRight: { position: 'absolute', right: 10, top: '50%' },
  swipeHintBottom: { position: 'absolute', bottom: 40, alignSelf: 'center' },
});

export default GalleryPage;