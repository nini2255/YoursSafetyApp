import React, { createContext, useContext, useState, useEffect } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithCredential
} from 'firebase/auth';
import { ref, set, get, child } from 'firebase/database'; // Import Database functions
import { GoogleSignin } from '@react-native-google-signin/google-signin'; // Import Google Signin
import { auth, database } from '../services/firebase'; 

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

const CURRENT_USER_KEY = '@current_user_email';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); 
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Configure Google Sign-In (Do this once)
  useEffect(() => {
    GoogleSignin.configure({
    webClientId: "701532646484-7ii37i8pur9itc4kv2ntv46ojud4hoc7.apps.googleusercontent.com", 
    offlineAccess: true, // often helpful
      // You can find this in your google-services.json under oauth_client with client_type: 3
    });
  }, []);

  // Sync Firebase Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // If Firebase thinks we are logged in, ensure we have the local data
        if (!user) {
           await loadUserProfile(firebaseUser.uid, firebaseUser.email);
        }
      } else {
        // Firebase says we are logged out
        setUser(null);
        setIsLoggedIn(false);
      }
      setIsLoading(false);
    });
    return unsubscribe;
  }, [user]);

  // Helper: Load User Profile from Realtime Database
  const loadUserProfile = async (uid, email) => {
    try {
      const dbRef = ref(database);
      const snapshot = await get(child(dbRef, `users/${uid}`));
      
      if (snapshot.exists()) {
        const userData = snapshot.val();
        const fullUser = { ...userData, uid, email }; // Combine Auth data with DB data
        
        // Save to local storage for offline access/speed
        await AsyncStorage.setItem(`@user_creds_${email}`, JSON.stringify(fullUser));
        await AsyncStorage.setItem(CURRENT_USER_KEY, email);
        
        setUser(fullUser);
        setIsLoggedIn(true);
      } else {
        console.warn("User authenticated but no profile found in DB.");
        // Optional: Create a basic profile if missing
        setUser({ uid, email });
        setIsLoggedIn(true);
      }
    } catch (error) {
      console.error("Failed to load user profile:", error);
    }
  };

  const login = async (email, password) => {
    try {
      // 1. Try Firebase Login directly (Bypassing strict local check)
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // 2. Fetch User Data from Realtime Database to "Restore" the session
      await loadUserProfile(firebaseUser.uid, firebaseUser.email);

    } catch (error) {
      console.error('Login error:', error);
      
      // Fallback: If offline, try checking local storage manually
      if (error.code === 'auth/network-request-failed') {
         const localCreds = await AsyncStorage.getItem(`@user_creds_${email}`);
         if (localCreds) {
            const userData = JSON.parse(localCreds);
            if (userData.password === password) {
               setUser(userData);
               setIsLoggedIn(true);
               return; // Success via local fallback
            }
         }
      }
      throw error;
    }
  };

  const signup = async (credentials) => {
    const { email, password, name, phone, profilePic } = credentials;
    try {
      // 1. Create Auth User
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      // 2. Prepare Profile Data (Exclude sensitive password from DB if desired, but keeping your structure)
      const userProfile = { 
        name, 
        email, 
        phone: phone || '',
        profilePic: profilePic || '',
        createdAt: new Date().toISOString()
      };

      // 3. Save to Realtime Database (Persistent Cloud Storage)
      await set(ref(database, 'users/' + uid), userProfile);

      // 4. Save Locally
      const userWithId = { ...userProfile, uid };
      await AsyncStorage.setItem(`@user_creds_${email}`, JSON.stringify(credentials)); // Keeping credentials for offline
      await AsyncStorage.setItem(CURRENT_USER_KEY, email);
      
      setUser(userWithId);
      setIsLoggedIn(true);

    } catch (error) {
      console.error('Signup error:', error);
      throw error; 
    }
  };

  const googleLogin = async () => {
    try {
      // 1. Check Play Services
      await GoogleSignin.hasPlayServices();
      
      // 2. Prompt for Sign In
      const response = await GoogleSignin.signIn();
      // Depending on version, response might be the user object or contain { data: user }
      const idToken = response.data?.idToken || response.idToken;

      if (!idToken) throw new Error("No ID token found");

      // 3. Create Credential
      const googleCredential = GoogleAuthProvider.credential(idToken);

      // 4. Sign in to Firebase
      const userCredential = await signInWithCredential(auth, googleCredential);
      const user = userCredential.user;

      // 5. Check if user exists in DB, if not, create profile
      const dbRef = ref(database);
      const snapshot = await get(child(dbRef, `users/${user.uid}`));

      if (!snapshot.exists()) {
        const newProfile = {
          name: user.displayName,
          email: user.email,
          profilePic: user.photoURL,
          createdAt: new Date().toISOString()
        };
        await set(ref(database, 'users/' + user.uid), newProfile);
      }

      // 6. Load profile to state
      await loadUserProfile(user.uid, user.email);

    } catch (error) {
      console.error('Google Sign-In Error:', error);
      throw error;
    }
  };

  const logout = async () => {
     try {
      await signOut(auth);
      await GoogleSignin.signOut(); // Sign out from Google too
      await AsyncStorage.removeItem(CURRENT_USER_KEY);
      setUser(null);
      setIsLoggedIn(false);
    } catch (e) {
      console.error('Logout failed', e);
    }
  };
  
 const updateUser = async (newUserData) => {
    if (!user || !user.uid) return;
    try {
      // 1. Merge current state with updates
      const updatedUser = { ...user, ...newUserData };
      
      // 2. Create a "Sanitized" copy for Firebase
      // We do NOT want to send the password or undefined values to the DB
      const dataForFirebase = { ...updatedUser };
      
      delete dataForFirebase.password; // 🔒 SECURITY: Never save password to DB
      delete dataForFirebase.idToken;  // Remove other auth junk if present
      
      // 🛡️ CRASH PREVENTION: Remove any keys that are strictly undefined
      Object.keys(dataForFirebase).forEach(key => {
        if (dataForFirebase[key] === undefined) {
          delete dataForFirebase[key];
        }
      });

      // 3. Update Cloud (Now safe from "undefined" errors)
      await set(ref(database, `users/${user.uid}`), dataForFirebase);
      
      // 4. Update Local Storage 
      // (It's okay to keep the password in local storage if your app needs it for offline login)
      await AsyncStorage.setItem(`@user_creds_${user.email}`, JSON.stringify(updatedUser));
      
      setUser(updatedUser);
      Alert.alert('Success', 'Profile updated.');
    } catch (e) {
      console.error('Failed to update user data', e);
      Alert.alert('Error', 'Could not update profile: ' + e.message);
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
    googleLogin, // Expose the new function
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};