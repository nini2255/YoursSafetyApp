import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; // Import SafeAreaView

export const PageHeader = ({ title, onBack }) => (
  <SafeAreaView
  edges = {['top']} 
  style={styles.appHeader}>
    <TouchableOpacity onPress={onBack} style={styles.headerButton}>
      <Text style={styles.backButtonText}>‹</Text>
    </TouchableOpacity>
    <Text style={styles.headerTitle}>{title}</Text> 
    <View style={styles.headerSpacer} />
  </SafeAreaView>
);

const styles = StyleSheet.create({
    appHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Platform.OS === 'ios' ? 0 : 16,
        paddingLeft: Platform.OS === 'ios' ? 8 : 16,
        borderBottomWidth: 1,
        borderBottomColor: '#FFE4E6', // Changed from '#000'
        backgroundColor: '#FEF2F2', // Changed from '#000'
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
      backButtonText: {
        fontSize: 30,
        color: '#4B5563',
        lineHeight: 32,
      },
});