import React, { createContext, useContext, useState, useEffect } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { auth } from '../services/firebase'; 

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Storage key for the *email* of the last logged-in user
const CURRENT_USER_KEY = '@current_user_email';

// Helper function to migrate old data
const migrateOldData = async (email, oldUserData) => {
  console.log('Starting data migration for user:', email);
  try {
    const oldKeys = [
      '@journal_entries', '@emergency_contacts', '@autofill_people',
      '@autofill_locations', '@fake_call_caller_name', '@fake_call_screen_hold_enabled',
      '@fake_call_volume_hold_enabled', '@fake_call_screen_hold_duration',
      '@fake_call_volume_hold_duration', '@discreet_mode_enabled',
      '@sudoku_screen_enabled', '@bypass_code', '@two_finger_trigger_enabled',
    ];

    const newKeysMap = {
      '@user_credentials': `@user_creds_${email}`,
      '@journal_entries': `@${email}_journal_entries`,
      '@emergency_contacts': `@${email}_emergency_contacts`,
      '@autofill_people': `@${email}_autofill_people`,
      '@autofill_locations': `@${email}_autofill_locations`,
      '@fake_call_caller_name': `@${email}_fake_call_caller_name`,
      '@fake_call_screen_hold_enabled': `@${email}_fake_call_screen_hold_enabled`,
      '@fake_call_volume_hold_enabled': `@${email}_fake_call_volume_hold_enabled`,
      '@fake_call_screen_hold_duration': `@${email}_fake_call_screen_hold_duration`,
      '@fake_call_volume_hold_duration': `@${email}_fake_call_volume_hold_duration`,
      '@discreet_mode_enabled': `@${email}_discreet_mode_enabled`,
      '@sudoku_screen_enabled': `@${email}_sudoku_screen_enabled`,
      '@bypass_code': `@${email}_bypass_code`,
      '@two_finger_trigger_enabled': `@${email}_two_finger_trigger_enabled`,
    };
    
    const oldData = await AsyncStorage.multiGet(oldKeys);
    const newData = [];
    
    newData.push([newKeysMap['@user_credentials'], JSON.stringify(oldUserData)]);
    
    oldData.forEach(([key, value]) => {
      if (value !== null) {
        const newKey = newKeysMap[key];
        if (newKey) {
          newData.push([newKey, value]);
        }
      }
    });

    await AsyncStorage.multiSet(newData);
    await AsyncStorage.multiRemove([...oldKeys, '@user_credentials', '@logged_in']);
    console.log('Data migration complete.');

  } catch (e) {
    console.error('Data migration failed:', e);
    Alert.alert('Data Migration Failed', 'Could not migrate all old app data.');
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); 
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Sync Firebase Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(prevUser => {
          if (prevUser) {
            return { ...prevUser, uid: firebaseUser.uid };
          }
          return prevUser;
        });
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const loadUserFromStorage = async () => {
      try {
        const userEmail = await AsyncStorage.getItem(CURRENT_USER_KEY);
        if (userEmail) {
          const credsString = await AsyncStorage.getItem(`@user_creds_${userEmail}`);
          if (credsString) {
            const userData = JSON.parse(credsString);
            if (auth.currentUser) {
              userData.uid = auth.currentUser.uid;
            }
            setUser(userData);
            setIsLoggedIn(true);
          } else {
            await AsyncStorage.removeItem(CURRENT_USER_KEY);
          }
        }
      } catch (e) {
        console.error('Failed to load user from storage', e);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserFromStorage();
  }, []);

  const login = async (email, password) => {
    try {
      // 1. Local Login Check
      let userData = null;
      let isOldUser = false;

      const newCredsString = await AsyncStorage.getItem(`@user_creds_${email}`);
      
      if (newCredsString) {
        userData = JSON.parse(newCredsString);
        if (userData.password !== password) {
          throw new Error('Invalid email or password (Local Check).');
        }
      } else {
        const oldCredsString = await AsyncStorage.getItem('@user_credentials');
        if (oldCredsString) {
          const oldUserData = JSON.parse(oldCredsString);
          if (oldUserData.email === email && oldUserData.password === password) {
            isOldUser = true;
            userData = oldUserData;
          }
        }
      }

      if (!userData) {
        throw new Error('User not found locally. Please sign up.');
      }

      if (isOldUser) {
        await migrateOldData(email, userData);
      }

      // 2. Firebase Login
      let firebaseUid = null;
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        firebaseUid = userCredential.user.uid;
      } catch (fbError) {
        console.error('Firebase Login Error:', fbError.code, fbError.message);
        
        // Handle specific errors
        if (fbError.code === 'auth/user-not-found' || fbError.code === 'auth/invalid-credential') {
          console.log('Local user found but not in Firebase. Creating Firebase account...');
          try {
            const newUserCred = await createUserWithEmailAndPassword(auth, email, password);
            firebaseUid = newUserCred.user.uid;
          } catch (createError) {
             console.error('Sync failed:', createError);
             if (createError.code === 'auth/operation-not-allowed') {
                 Alert.alert('Configuration Error', 'Email/Password login is not enabled in Firebase Console.');
             }
          }
        } else if (fbError.code === 'auth/operation-not-allowed') {
             Alert.alert('Configuration Error', 'Email/Password login is disabled in Firebase Console. Please enable it to generate a User ID.');
        } else if (fbError.code === 'auth/invalid-email') {
             Alert.alert('Invalid Email', 'The email format is incorrect. Please update your profile with a valid email.');
        } else {
             // If it's a network error or something else, we let them login locally but warn them
             Alert.alert('Connection Warning', 'Could not connect to server. User ID will not be available.');
        }
      }

      // 3. Update State
      const finalUser = { ...userData, uid: firebaseUid };
      setUser(finalUser);
      setIsLoggedIn(true);
      await AsyncStorage.setItem(CURRENT_USER_KEY, email);

    } catch (e) {
      console.error('Login error:', e);
      throw e; 
    }
  };

  const signup = async (credentials) => {
    const { email, password } = credentials;
    try {
      const existingUser = await AsyncStorage.getItem(`@user_creds_${email}`);
      if (existingUser) {
        throw new Error('An account with this email already exists.');
      }
      
      let firebaseUid = null;
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        firebaseUid = userCredential.user.uid;
      } catch (fbError) {
        console.error('Firebase Signup Error:', fbError);
        if (fbError.code === 'auth/email-already-in-use') {
           // If they exist in Firebase but not locally, sign them in
           const userCredential = await signInWithEmailAndPassword(auth, email, password);
           firebaseUid = userCredential.user.uid;
        } else if (fbError.code === 'auth/operation-not-allowed') {
           throw new Error('Email/Password signup is disabled in Firebase Console.');
        } else if (fbError.code === 'auth/invalid-email') {
           throw new Error('Please enter a valid email address.');
        } else {
           throw new Error(fbError.message);
        }
      }

      const userWithId = { ...credentials, uid: firebaseUid };
      await AsyncStorage.setItem(`@user_creds_${email}`, JSON.stringify(credentials));
      
      setUser(userWithId);
      setIsLoggedIn(true);
      await AsyncStorage.setItem(CURRENT_USER_KEY, email);

    } catch (e) {
      console.error('Signup error:', e);
      throw e; 
    }
  };

  const logout = async () => {
     try {
      await signOut(auth);
      await AsyncStorage.removeItem(CURRENT_USER_KEY);
      setUser(null);
      setIsLoggedIn(false);
    } catch (e) {
      console.error('Logout failed', e);
      Alert.alert('Error', 'Could not log out');
    }
  };
  
  const updateUser = async (newUserData) => {
    if (!user) return;
    try {
      const updatedUser = { ...user, ...newUserData };
      await AsyncStorage.setItem(`@user_creds_${user.email}`, JSON.stringify(updatedUser));
      
      if (auth.currentUser) {
        updatedUser.uid = auth.currentUser.uid;
      }
      
      setUser(updatedUser);
      Alert.alert('Success', 'Profile updated.');
    } catch (e) {
      console.error('Failed to update user data', e);
      Alert.alert('Error', 'Could not update profile.');
    }
  };

  const value = {
    user,
    isLoggedIn,
    isLoading,
    login,
    signup,
    logout,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};