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
  /* appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE4E6',
    backgroundColor: '#FEF2F2',
  }, */
  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Platform.OS === 'ios' ? 0 : 16,
    paddingLeft: Platform.OS === 'ios' ? 8 : 16,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE4E6',
    backgroundColor: '#FEF2F2',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
  },
  headerButton: {
    padding: 8,
  },
  headerSpacer: {
    width: 40,
  },
});