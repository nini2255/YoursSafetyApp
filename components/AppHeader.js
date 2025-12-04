import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MenuIcon } from './Icons';

export const AppHeader = ({ onMenuPress, title }) => (
  <SafeAreaView
    edges={['top']}
    style={styles.appHeader}>
    <TouchableOpacity onPress={onMenuPress} style={styles.headerButton}>
      <MenuIcon />
    </TouchableOpacity>
    <Text style={styles.headerTitle}>{title}</Text>
    <View style={styles.headerSpacer} />
  </SafeAreaView>
);

const styles = StyleSheet.create({
  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#FFE4E6',
    backgroundColor: '#FEF2F2',
    ...Platform.select({
      ios: {
        paddingBottom: 8,
        paddingHorizontal: 16,
      },
      default: {
        padding: 16,
        justifyContent: 'space-between',
      }
    })    
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
  },
  /* headerButton: {
    padding: 8,
  }, */
  headerSpacer: {
    width: 40,
  },
});