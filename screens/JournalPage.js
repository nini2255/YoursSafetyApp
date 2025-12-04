import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { SafeAreaView } from 'react-native-safe-area-context';

// FIX: Use curly braces {} to import the named export 'JournalPage' 
// and rename it to 'JournalEntriesPage' for clarity in this file.
import { JournalPage as JournalEntriesPage } from './JournalEntriesPage'; 
import GalleryPage from './GalleryPage'; 

const Tab = createMaterialTopTabNavigator();

const JournalPageController = () => {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF8F8' }} edges={['top']}>
      <Tab.Navigator
        screenOptions={{
          tabBarLabelStyle: { fontSize: 14, fontWeight: '600', textTransform: 'none' },
          tabBarIndicatorStyle: { backgroundColor: '#F472B6' }, // Pink theme
          tabBarActiveTintColor: '#F472B6',
          tabBarInactiveTintColor: 'gray',
          tabBarStyle: { backgroundColor: '#FFF8F8', elevation: 0, shadowOpacity: 0 },
        }}
      >
        <Tab.Screen 
            name="Entries" 
            component={JournalEntriesPage} 
            options={{ tabBarLabel: 'Journal' }}
        />
        <Tab.Screen 
            name="Gallery" 
            component={GalleryPage} 
            options={{ tabBarLabel: 'Gallery' }}
        />
      </Tab.Navigator>
    </SafeAreaView>
  );
};

export default JournalPageController;