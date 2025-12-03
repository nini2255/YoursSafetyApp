import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput, Alert } from 'react-native';
import { PageHeader } from '../components/PageHeader';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext'; // IMPORTED: To get the current user

const DiscreetModeSettingsPage = ({ navigation }) => {
  const { user } = useAuth(); // ADDED: Get the logged-in user

  // (Existing state remains the same)
  const [discreetModeEnabled, setDiscreetModeEnabled] = useState(false);
  const [sudokuScreenEnabled, setSudokuScreenEnabled] = useState(false);
  const [twoFingerTriggerEnabled, setTwoFingerTriggerEnabled] = useState(false);
  const [bypassCode, setBypassCode] = useState('');
  const [isSettingBypassCode, setIsSettingBypassCode] = useState(false);
  const [newBypassCode, setNewBypassCode] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // REMOVED: Old static keys
  // const DISCREET_MODE_KEY = '@discreet_mode_enabled';
  // ... (etc)

  // ADDED: State to hold the dynamic, user-specific keys
  const [keys, setKeys] = useState(null);

  // ADDED: Effect to set the keys when the user logs in
  useEffect(() => {
    if (user?.email) {
      // Create keys based on the user's email
      setKeys({
        DISCREET_MODE_KEY: `@${user.email}_discreet_mode_enabled`,
        SUDOKU_SCREEN_KEY: `@${user.email}_sudoku_screen_enabled`,
        BYPASS_CODE_KEY: `@${user.email}_bypass_code`,
        TWO_FINGER_TRIGGER_KEY: `@${user.email}_two_finger_trigger_enabled`,
      });
    } else {
      // User is logged out, clear keys
      setKeys(null);
    }
  }, [user]); // Re-run when the user object changes

  // MODIFIED: Load settings *after* the keys have been set
  useEffect(() => {
    if (keys) {
      loadSettings();
    }
  }, [keys]); // Re-run when the 'keys' object is ready

  const loadSettings = async () => {
    if (!keys) return; // ADDED: Guard clause

    setIsLoading(true); // Moved from old useEffect
    try {
      // MODIFIED: Use dynamic keys from state
      const [discreet, sudoku, code, twoFinger] = await Promise.all([
        AsyncStorage.getItem(keys.DISCREET_MODE_KEY),
        AsyncStorage.getItem(keys.SUDOKU_SCREEN_KEY),
        AsyncStorage.getItem(keys.BYPASS_CODE_KEY),
        AsyncStorage.getItem(keys.TWO_FINGER_TRIGGER_KEY),
      ]);
      setDiscreetModeEnabled(discreet === 'true');
      setSudokuScreenEnabled(sudoku === 'true');
      setBypassCode(code || '');
      setTwoFingerTriggerEnabled(twoFinger === 'true');
    } catch (error) {
      console.error('Error loading discreet mode settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDiscreetMode = async (value) => {
    if (!keys) return; // ADDED: Guard clause
    try {
      // MODIFIED: Use dynamic key
      await AsyncStorage.setItem(keys.DISCREET_MODE_KEY, value.toString());
      setDiscreetModeEnabled(value);
    } catch (error) {
      Alert.alert('Error', 'Failed to update discreet mode setting.');
    }
  };

  const toggleSudokuScreen = async (value) => {
    if (!keys) return; // ADDED: Guard clause

    if (value && !bypassCode) {
      Alert.alert('Bypass Code Required', 'Please set a bypass code first before enabling the sudoku screen.');
      return;
    }
    try {
      // MODIFIED: Use dynamic key
      await AsyncStorage.setItem(keys.SUDOKU_SCREEN_KEY, value.toString());
      setSudokuScreenEnabled(value);
    } catch (error) {
      Alert.alert('Error', 'Failed to update sudoku screen setting.');
    }
  };

  const toggleTwoFingerTrigger = async (value) => {
    if (!keys) return; // ADDED: Guard clause

    if (value && !bypassCode) {
      Alert.alert('Bypass Code Required', 'Please set a bypass code first before enabling the two-finger trigger.');
      return;
    }
    try {
      // MODIFIED: Use dynamic key
      await AsyncStorage.setItem(keys.TWO_FINGER_TRIGGER_KEY, value.toString());
      setTwoFingerTriggerEnabled(value);
    } catch (error) {
      Alert.alert('Error', 'Failed to update two-finger trigger setting.');
    }
  };

  const validateBypassCode = (code) => {
    if (code.length < 4 || code.length > 9) {
      return false;
    }
    return /^[1-9]+$/.test(code);
  };

  const handleSaveBypassCode = async () => {
    if (!keys) return; // ADDED: Guard clause

    if (!validateBypassCode(newBypassCode)) {
      Alert.alert(
        'Invalid Code',
        'Bypass code must be 4-9 digits long and contain only numbers 1-9.'
      );
      return;
    }
    try {
      const isFirstTime = !bypassCode;
      // MODIFIED: Use dynamic key
      await AsyncStorage.setItem(keys.BYPASS_CODE_KEY, newBypassCode);
      setBypassCode(newBypassCode);

      if (isFirstTime) {
        // MODIFIED: Use dynamic key
        await AsyncStorage.setItem(keys.TWO_FINGER_TRIGGER_KEY, 'true');
        setTwoFingerTriggerEnabled(true);
      }

      setNewBypassCode('');
      setIsSettingBypassCode(false);

      if (isFirstTime) {
        Alert.alert(
          'Success',
          'Bypass code has been set successfully.\n\nTwo-finger emergency trigger has been automatically enabled. You can disable it in settings if needed.'
        );
      } else {
        Alert.alert('Success', 'Bypass code has been updated successfully.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save bypass code.');
    }
  };

  const handleBypassCodeChange = (text) => {
    const filtered = text.replace(/[^1-9]/g, '');
    if (filtered.length <= 9) {
      setNewBypassCode(filtered);
    }
  };

  // (The rest of the component's JSX and styles remain unchanged)
  // ... (loading view, JSX for toggles, modal, etc.) ...
  // ... (styles) ...

  if (isLoading) {
    return (
      <View style={styles.fullPage}>
        <PageHeader title="Discreet Mode"  onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <Text>Loading settings...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.fullPage}>
      <PageHeader title="Discreet Mode"  onBack={() => navigation.goBack()} />
      <ScrollView style={styles.settingsContainer}>
        {/* General Settings */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>General Settings</Text>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Enable Discreet Mode</Text>
              <Text style={styles.settingDescription}>Activate privacy features to disguise the app</Text>
            </View>
            <TouchableOpacity
              style={[styles.toggle, discreetModeEnabled && styles.toggleActive]}
              onPress={() => toggleDiscreetMode(!discreetModeEnabled)}
            >
              <View style={[styles.toggleCircle, discreetModeEnabled && styles.toggleCircleActive]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bypass Code Section */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Bypass Code</Text>
          {bypassCode ? (
            <View style={styles.bypassCodeDisplay}>
              <View style={styles.bypassCodeInfo}>
                <Text style={styles.settingLabel}>Current Code</Text>
                <Text style={styles.bypassCodeText}>{bypassCode}</Text>
              </View>
              <TouchableOpacity style={styles.changeCodeButton} onPress={() => setIsSettingBypassCode(true)}>
                <Text style={styles.changeCodeButtonText}>Change Code</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.noBypassCodeContainer}>
              <Text style={styles.noBypassCodeText}>Set a bypass code to enable sudoku screen</Text>
              <TouchableOpacity style={styles.setCodeButton} onPress={() => setIsSettingBypassCode(true)}>
                <Text style={styles.setCodeButtonText}>Set Bypass Code</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Sudoku Screen Section */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Sudoku Screen</Text>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, !bypassCode && styles.disabledText]}>Show Sudoku Screen on Open</Text>
              <Text style={[styles.settingDescription, !bypassCode && styles.disabledText]}>Display a fake sudoku game when app opens</Text>
              {!bypassCode && <Text style={styles.warningText}>Set a bypass code to enable this feature</Text>}
            </View>
            <TouchableOpacity
              style={[styles.toggle, sudokuScreenEnabled && styles.toggleActive, !bypassCode && styles.toggleDisabled]}
              onPress={() => toggleSudokuScreen(!sudokuScreenEnabled)}
              disabled={!bypassCode}
            >
              <View style={[styles.toggleCircle, sudokuScreenEnabled && styles.toggleCircleActive]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Emergency Trigger Section */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Emergency Trigger</Text>
          <View style={styles.emergencyInfoBox}>
            <Text style={styles.emergencyInfoIcon}>🚨</Text>
            <Text style={styles.emergencyInfoTitle}>TWO-FINGER EMERGENCY TRIGGER</Text>
            <Text style={styles.emergencyInfoText}>
              When enabled, hold two fingers on the screen for 1 second from anywhere in the app to instantly show the sudoku screen.{'\n\n'}
              The sudoku will appear partially filled to look like you were playing a game. You can disable this feature at any time using the toggle below.
            </Text>
          </View>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, !bypassCode && styles.disabledText]}>Enable Two-Finger Trigger</Text>
              <Text style={[styles.settingDescription, !bypassCode && styles.disabledText]}>Hold two fingers for 1 second to trigger sudoku</Text>
              {!bypassCode && <Text style={styles.warningText}>Set a bypass code to enable this feature</Text>}
            </View>
            <TouchableOpacity
              style={[styles.toggle, twoFingerTriggerEnabled && styles.toggleActive, !bypassCode && styles.toggleDisabled]}
              onPress={() => toggleTwoFingerTrigger(!twoFingerTriggerEnabled)}
              disabled={!bypassCode}
            >
              <View style={[styles.toggleCircle, twoFingerTriggerEnabled && styles.toggleCircleActive]} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Bypass Code Modal */}
      <Modal visible={isSettingBypassCode} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.formModal}>
            <Text style={styles.formTitle}>{bypassCode ? 'Change Bypass Code' : 'Set Bypass Code'}</Text>
            <Text style={styles.bypassCodeInstructions}>
              Enter a 4-9 digit code using numbers 1-9.{'\n'}
              You'll enter this code in the first row of the sudoku to access the app.
            </Text>
            <TextInput
              style={styles.bypassCodeInput}
              placeholder="Enter code (e.g., 1234)"
              value={newBypassCode}
              onChangeText={handleBypassCodeChange}
              keyboardType="number-pad"
              maxLength={9}
              autoFocus
            />
            <Text style={styles.bypassCodeLength}>{newBypassCode.length} / 9 digits</Text>
            <View style={styles.formActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => { setIsSettingBypassCode(false); setNewBypassCode(''); }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, !validateBypassCode(newBypassCode) && styles.disabledButton]}
                onPress={handleSaveBypassCode}
                disabled={!validateBypassCode(newBypassCode)}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
        alignItems: 'center',
    },
    settingsContainer: {
        flex: 1,
    },
    settingsSection: {
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#FEE2E2',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#6B7280',
        marginBottom: 15,
        textTransform: 'uppercase',
    },
    settingItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
    },
    settingInfo: {
        flex: 1,
        marginRight: 10,
    },
    settingLabel: {
        fontSize: 17,
        fontWeight: '500',
        color: '#1F2937',
    },
    settingDescription: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 4,
    },
    disabledText: {
        color: '#9CA3AF',
    },
    warningText: {
        fontSize: 13,
        color: '#EF4444',
        marginTop: 6,
    },
    toggle: {
        width: 50,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#E5E7EB',
        justifyContent: 'center',
        padding: 2,
    },
    toggleActive: {
        backgroundColor: '#F87171',
    },
    toggleDisabled: {
        backgroundColor: '#D1D5DB',
    },
    toggleCircle: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: 'white',
        alignSelf: 'flex-start',
        elevation: 2,
    },
    toggleCircleActive: {
        alignSelf: 'flex-end',
    },
    bypassCodeDisplay: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        backgroundColor: '#FEF2F2',
        borderRadius: 8,
    },
    bypassCodeInfo: {
        flex: 1,
    },
    bypassCodeText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#374151',
        letterSpacing: 2,
        marginTop: 4,
    },
    changeCodeButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 6,
        backgroundColor: '#FECACA',
    },
    changeCodeButtonText: {
        color: '#991B1B',
        fontWeight: '600',
    },
    noBypassCodeContainer: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    noBypassCodeText: {
        fontSize: 16,
        color: '#4B5563',
        marginBottom: 15,
    },
    setCodeButton: {
        backgroundColor: '#F87171',
        paddingVertical: 12,
        paddingHorizontal: 25,
        borderRadius: 8,
    },
    setCodeButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    emergencyInfoBox: {
        backgroundColor: '#FEF2F2',
        padding: 15,
        borderRadius: 8,
        marginBottom: 20,
        alignItems: 'center',
    },
    emergencyInfoIcon: {
        fontSize: 24,
    },
    emergencyInfoTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#991B1B',
        marginTop: 8,
        marginBottom: 8,
    },
    emergencyInfoText: {
        fontSize: 14,
        color: '#4B5563',
        textAlign: 'center',
        lineHeight: 20,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    formModal: {
        width: '90%',
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 25,
        elevation: 10,
    },
    formTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#1F2937',
    },
    bypassCodeInstructions: {
        fontSize: 15,
        color: '#6B7280',
        marginBottom: 20,
        lineHeight: 22,
    },
    bypassCodeInput: {
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        padding: 15,
        fontSize: 18,
        textAlign: 'center',
        letterSpacing: 3,
        color: '#1F2937',
    },
    bypassCodeLength: {
        textAlign: 'right',
        marginTop: 8,
        color: '#6B7280',
    },
    formActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 25,
    },
    cancelButton: {
        padding: 12,
        marginRight: 10,
    },
    cancelButtonText: {
        fontSize: 16,
        color: '#6B7280',
        fontWeight: '500',
    },
    saveButton: {
        backgroundColor: '#F87171',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
    },
    saveButtonText: {
        fontSize: 16,
        color: 'white',
        fontWeight: 'bold',
    },
    disabledButton: {
        backgroundColor: '#FECACA',
    },
});

export default DiscreetModeSettingsPage;