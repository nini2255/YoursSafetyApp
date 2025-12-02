import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Modal, 
  TouchableOpacity, 
  StyleSheet, 
  TextInput, 
  ScrollView 
} from 'react-native';

export const JournalTemplateModal = ({ visible, onClose, onSelectTemplate }) => {
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [formData, setFormData] = useState({});

  // Reset state when modal is opened/closed
  useEffect(() => {
    if (visible) {
      setActiveTemplate(null);
      setFormData({});
    }
  }, [visible]);

  const handleTemplateClick = (templateType) => {
    if (templateType === 'blank' || templateType === 'incident') {
      // These don't need extra text inputs here (Incident has its own form)
      onSelectTemplate(templateType);
    } else {
      setActiveTemplate(templateType);
      setFormData({}); // Reset form data for new template
    }
  };

  const handleInputChange = (key, text) => {
    setFormData(prev => ({ ...prev, [key]: text }));
  };

  const handleSubmit = () => {
    onSelectTemplate(activeTemplate, formData);
  };

  const renderTemplateSelection = () => (
    <>
      <Text style={styles.formTitle}>New Journal Entry</Text>
      <Text style={styles.templateSubtitle}>Select a template to get started:</Text>

      <TouchableOpacity style={styles.templateButton} onPress={() => handleTemplateClick('incident')}>
        <Text style={styles.templateButtonText}>⚠️ Incident Report</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.templateButton} onPress={() => handleTemplateClick('journey')}>
        <Text style={styles.templateButtonText}>🚗 Returning from Point A to B</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.templateButton} onPress={() => handleTemplateClick('meeting')}>
        <Text style={styles.templateButtonText}>👥 Meeting with a Person</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.templateButton} onPress={() => handleTemplateClick('interaction')}>
        <Text style={styles.templateButtonText}>💬 Interaction with a Person</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.templateButton} onPress={() => handleTemplateClick('blank')}>
        <Text style={styles.templateButtonText}>📄 Blank Entry</Text>
      </TouchableOpacity>

      <View style={styles.formActions}>
        <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderFormInput = (label, key, placeholder) => (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={styles.textInput}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        value={formData[key] || ''}
        onChangeText={(text) => handleInputChange(key, text)}
      />
    </View>
  );

  const renderTemplateForm = () => {
    let content;
    let title;

    switch (activeTemplate) {
      case 'journey':
        title = "Journey Details";
        content = (
          <>
            {renderFormInput("Starting Point (A)", "from", "e.g. Work, Gym")}
            {renderFormInput("Destination (B)", "to", "e.g. Home, Cafe")}
          </>
        );
        break;
      case 'meeting':
        title = "Meeting Details";
        content = (
          <>
            {renderFormInput("Who did you meet?", "person", "e.g. John Doe")}
            {renderFormInput("Location", "location", "e.g. Starbucks, Office")}
          </>
        );
        break;
      case 'interaction':
        title = "Interaction Details";
        content = (
          <>
            {renderFormInput("Who was it with?", "person", "e.g. Service Staff, Stranger")}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Outcome</Text>
              <View style={styles.outcomeRow}>
                {['Good', 'Mild', 'Bad'].map((opt) => (
                  <TouchableOpacity 
                    key={opt}
                    style={[
                      styles.outcomeButton, 
                      formData.outcome === opt && styles.outcomeButtonSelected
                    ]}
                    onPress={() => handleInputChange('outcome', opt)}
                  >
                    <Text style={[
                      styles.outcomeText,
                      formData.outcome === opt && styles.outcomeTextSelected
                    ]}>{opt}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        );
        break;
      default:
        return null;
    }

    return (
      <View style={{ width: '100%' }}>
        <Text style={styles.formTitle}>{title}</Text>
        <ScrollView style={{ maxHeight: 300 }}>
          {content}
        </ScrollView>

        <View style={styles.formActionsRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => setActiveTemplate(null)}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.submitButtonText}>Start Writing</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.templateModal}>
          {activeTemplate ? renderTemplateForm() : renderTemplateSelection()}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
      },
      templateModal: {
        width: '90%',
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 24,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      formTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
        color: '#1F2937',
      },
      templateSubtitle: {
        fontSize: 15,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 20,
      },
      templateButton: {
        backgroundColor: '#F3F4F6',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#E5E7EB',
      },
      templateButtonText: {
        textAlign: 'center',
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
      },
      // Form Input Styles
      inputGroup: {
        marginBottom: 16,
      },
      inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 6,
      },
      textInput: {
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: '#1F2937',
        backgroundColor: '#F9FAFB',
      },
      // Outcome Buttons
      outcomeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
      },
      outcomeButton: {
        flex: 1,
        paddingVertical: 10,
        marginHorizontal: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#D1D5DB',
        alignItems: 'center',
        backgroundColor: 'white',
      },
      outcomeButtonSelected: {
        backgroundColor: '#F472B6',
        borderColor: '#F472B6',
      },
      outcomeText: {
        color: '#4B5563',
        fontWeight: '600',
      },
      outcomeTextSelected: {
        color: 'white',
      },
      // Actions
      formActions: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 10,
      },
      formActionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
      },
      cancelButton: {
        paddingVertical: 12,
        paddingHorizontal: 20,
      },
      cancelButtonText: {
        color: '#6B7280',
        fontSize: 16,
        fontWeight: '600',
      },
      backButton: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        backgroundColor: '#E5E7EB',
        borderRadius: 25,
      },
      backButtonText: {
        color: '#374151',
        fontSize: 16,
        fontWeight: '600',
      },
      submitButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        backgroundColor: '#F472B6',
        borderRadius: 25,
      },
      submitButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
      },
});