import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { initDB } from '../utils/db'; // Import DB init

// ... imports for Journal_UI, Calendar_UI, etc. remain the same

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// ... MainTabNavigator code remains the same ...

const Start_Here = () => {
    // Initialize the local database when the app starts
    useEffect(() => {
        initDB()
            .then(() => console.log('Database initialized successfully'))
            .catch(err => console.error('Failed to initialize database', err));
    }, []);

    return (
        <NavigationContainer>
            {/* ... rest of the NavigationContainer code remains the same */}
        </NavigationContainer>
    );
};

export default Start_Here;