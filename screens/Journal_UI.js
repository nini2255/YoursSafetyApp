import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import JournalEntries_UI from './JournalEntries_UI'; // The renamed file
import Gallery_UI from './GalleryPage'; // The new gallery file
import { SafeAreaView } from 'react-native-safe-area-context';

const Tab = createMaterialTopTabNavigator();

const Journal_UIController = () => {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }} edges={['top']}>
      <Tab.Navigator
        screenOptions={{
          tabBarLabelStyle: { fontSize: 14, fontWeight: '600' },
          tabBarIndicatorStyle: { backgroundColor: '#4CAF50' },
          tabBarActiveTintColor: '#4CAF50',
          tabBarInactiveTintColor: 'gray',
        }}
      >
        <Tab.Screen 
            name="JournalEntries" 
            component={JournalEntries_UI} 
            options={{ tabBarLabel: 'Entries' }}
        />
        <Tab.Screen 
            name="Gallery" 
            component={Gallery_UI} 
            options={{ tabBarLabel: 'Gallery' }}
        />
      </Tab.Navigator>
    </SafeAreaView>
  );
};

export default Journal_UIController;