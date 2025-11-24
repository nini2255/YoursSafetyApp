import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export const PageHeader = ({ title, onBack }) => (
  <View style={styles.appHeader}>
    <TouchableOpacity onPress={onBack} style={styles.headerButton}>
      <Text style={styles.backButtonText}>‹</Text>
    </TouchableOpacity>
    <Text style={styles.headerTitle}>{title}</Text>
    <View style={styles.headerSpacer} />
  </View>
);

const styles = StyleSheet.create({
    appHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#FFE4E6', // Changed from '#000'
        backgroundColor: '#FEF2F2', // Changed from '#000'
      },
      headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1F2937',
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