import React, { useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, StatusBar, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'
import { GestureDetector, Gesture, Directions } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useJournal } from '../context/JournalContext';

const { width } = Dimensions.get('window');

const THEME_COLOR_PRIMARY = '#CD5F66';
const THEME_COLOR_SECONDARY = '#FFF8F8';
const CARD_BACKGROUND = '#FFFFFF';
const TEXT_COLOR = '#291314';
const SUB_TEXT_COLOR = '#888';

const SecondaryHomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const lastPressRef = useRef(0);

  const displayName = user?.name || user?.displayName || user?.email?.split('@')[0] || 'User';
  const profilePhoto = user?.profilePic || user?.photoURL || null;

  let journalEntriesCount = 0;
  try {
    const journalData = useJournal();
    if (journalData?.entries && Array.isArray(journalData.entries)) {
      journalEntriesCount = journalData.entries.length;
    }
  } catch (e) {}

  const swipeDownGesture = Gesture.Fling()
    .direction(Directions.DOWN)
    .runOnJS(true) // <--- Add this line ensuring it runs on the JS thread
    .onEnd(() => navigation.canGoBack() && navigation.goBack());

  const features = [
    { name: 'Journal', route: 'Journal', icon: 'book-outline' },
    { name: 'Panic Button', route: 'Panic', icon: 'alert-circle-outline' },
    { name: 'Safety Timer', route: 'Timer', icon: 'time-outline' },
    { name: 'Fake Call', route: 'Home', icon: 'call-outline' },
    { name: 'Sudoku', route: 'Home', icon: 'grid-outline' },
    { name: 'Settings', route: 'Settings', icon: 'settings-outline' },
  ];

  const handleNavigation = (feature) => {
    const now = Date.now();
    if (now - lastPressRef.current < 1500) return; // Debounce
    lastPressRef.current = now;

    if (feature.route === 'Home') {
      navigation.navigate({
        name: 'Home',
        params: {
          triggerFakeCall: feature.name === 'Fake Call',
          triggerSudoku: feature.name === 'Sudoku',
        },
        merge: true,
      });
    } else {
      navigation.navigate(feature.route);
    }
  };

  return (
    <GestureDetector gesture={swipeDownGesture}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={CARD_BACKGROUND} />
        <View style={styles.container}>
          <View style={styles.topBar}>
            <View style={styles.dragIndicatorContainer}><View style={styles.dragIndicator} /></View>
            <View style={styles.profileSection}>
              {profilePhoto ? (
                <Image source={{ uri: profilePhoto }} style={styles.profileImage} />
              ) : (
                <View style={[styles.profileImage, styles.placeholderImage]}>
                  <Ionicons name="person" size={30} color={THEME_COLOR_PRIMARY} />
                </View>
              )}
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{displayName}</Text>
                <Text style={styles.profileDetail}>{journalEntriesCount} Journal Entries</Text>
                <TouchableOpacity onPress={() => navigation.navigate('UserProfileSettings')}>
                  <Text style={styles.viewProfileText}>View Personal Profile</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={{ marginLeft: 'auto' }}>
                <Ionicons name="settings-sharp" size={24} color="#E5E7EB" />
              </TouchableOpacity>
            </View>
            <Text style={styles.quickActionsHeader}>Quick Actions</Text>
            <Text style={styles.subHeaderText}>Swipe down to return home</Text>
          </View>

          <View style={styles.grid}>
            {features.map((feature, index) => (
              <TouchableOpacity key={index} style={styles.card} activeOpacity={0.7} onPress={() => handleNavigation(feature)}>
                <Ionicons name={feature.icon} size={32} color={THEME_COLOR_PRIMARY} style={styles.icon} />
                <Text style={styles.cardText}>{feature.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </SafeAreaView>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME_COLOR_SECONDARY },
  container: { flex: 1, backgroundColor: THEME_COLOR_SECONDARY },
  topBar: {
    paddingHorizontal: 25, paddingTop: 10, paddingBottom: 25,
    backgroundColor: CARD_BACKGROUND, borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35, shadowColor: '#CD5F66',
    shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.08,
    shadowRadius: 20, elevation: 10, zIndex: 10,
  },
  dragIndicatorContainer: { width: '100%', alignItems: 'center', marginBottom: 20 },
  dragIndicator: { width: 40, height: 4, backgroundColor: '#E5E7EB', borderRadius: 10 },
  profileSection: { flexDirection: 'row', alignItems: 'center', marginBottom: 30 },
  profileImage: { width: 68, height: 68, borderRadius: 34, marginRight: 15, borderWidth: 3, borderColor: THEME_COLOR_SECONDARY },
  placeholderImage: { backgroundColor: '#FFE4E6', justifyContent: 'center', alignItems: 'center' },
  profileInfo: { justifyContent: 'center' },
  profileName: { fontSize: 22, fontWeight: 'bold', color: TEXT_COLOR },
  profileDetail: { fontSize: 14, color: SUB_TEXT_COLOR, marginTop: 4, fontWeight: '500' },
  viewProfileText: { fontSize: 14, color: THEME_COLOR_PRIMARY, marginTop: 6, fontWeight: '700' },
  quickActionsHeader: { fontSize: 20, fontWeight: 'bold', color: TEXT_COLOR, marginBottom: 4 },
  subHeaderText: { fontSize: 14, color: SUB_TEXT_COLOR, fontWeight: '500', opacity: 0.8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', padding: 25, marginTop: 5 },
  card: {
    width: (width - 70) / 2, height: 115, backgroundColor: CARD_BACKGROUND,
    borderRadius: 24, padding: 18, marginBottom: 20, justifyContent: 'space-between',
    alignItems: 'flex-start', shadowColor: '#CD5F66', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06, shadowRadius: 15, elevation: 2, borderWidth: 1,
    borderColor: 'rgba(255, 240, 240, 1)',
  },
  cardText: { fontSize: 16, fontWeight: '700', color: TEXT_COLOR, marginTop: 'auto', paddingTop: 10 },
});

export default SecondaryHomeScreen;
