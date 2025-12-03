import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBmW-J5TwLgSHxfpc5hVYbN_EEmMVMm3R8",
  authDomain: "yoursapp-new.firebaseapp.com",
  databaseURL: "https://yoursapp-new-default-rtdb.firebaseio.com",
  projectId: "yoursapp-new",
  storageBucket: "yoursapp-new.firebasestorage.app",
  messagingSenderId: "701532646484",
  appId: "1:701532646484:web:db60e6bff3eae72d0e51c1",
  measurementId: "G-VE241FPFG6"
};

// Initialize Firebase
let app;
let database;
let auth;

try {
  app = initializeApp(firebaseConfig);
  
  // Initialize Auth with React Native persistence to keep users logged in
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });

  database = getDatabase(app);
  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase:', error);
}

export { app, database, auth };