import React, { useState } from 'react';
// --- MODIFIED: Import ScrollView, KeyboardAvoidingView, Platform ---
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  Image, 
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'
import * as ImagePicker from 'expo-image-picker';
import Ionicons from '@expo/vector-icons/Ionicons'; // For the back arrow icon
import { UserIcon, MailIcon, PhoneIcon, LockIcon } from '../components/Icons'; 
import { useAuth } from '../context/AuthContext'; // Import useAuth

export default function SignupScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState(''); 
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [imageUri, setImageUri] = useState(null); 
  const [isLoading, setIsLoading] = useState(false); // Added loading state
  const auth = useAuth(); // Get auth context

  // Function to pick an image
  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert("Permission Required", "You need to allow access to your photos to upload a profile picture.");
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1], // Square aspect ratio
      quality: 0.5, // Lower quality to save space
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const validate = () => {
    if (!name || !email || !password || !confirm) {
      Alert.alert('Validation', 'Please fill all required fields.');
      return false;
    }
    // Phone is optional
    if (password.length < 6) {
      Alert.alert('Validation', 'Password should be at least 6 characters.');
      return false;
    }
    if (password !== confirm) {
      Alert.alert('Validation', 'Passwords do not match.');
      return false;
    }
    return true;
  };

  const handleSignup = async () => {
    if (!validate()) return;
    
    setIsLoading(true); // Set loading true
    
    // --- MODIFIED: Use auth.signup ---
    try {
      const creds = {
        name: name.trim(),
        email: email.trim().toLowerCase(), // Always store email lowercase
        phone: phone.trim(), 
        password, // In a real app, you should HASH this password
        profilePic: imageUri // Add the image URI here
      };
      
      await auth.signup(creds);
      
      // navigation.replace('Home') is no longer needed.
      // App.js will handle the navigation state change automatically
      // when `isLoggedIn` becomes true in AuthContext.
      
    } catch (err) {
      console.error('Signup error:', err);
      // Display the error message thrown from AuthContext
      Alert.alert('Error', err.message || 'Could not create account.');
    } finally {
      setIsLoading(false); // Set loading false
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* --- MODIFIED: Back button is now outside the scrolling content --- */}
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={28} color="#333" />
      </TouchableOpacity>

      {/* --- MODIFIED: Added KeyboardAvoidingView and ScrollView --- */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          
          <Text style={styles.title}>Let's Get Started!</Text>
          <Text style={styles.subtitle}>Create an account to YourApp to get all features</Text>

          {/* Profile Picture Picker */}
          <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.profileImage} />
            ) : (
              <Text style={styles.imagePickerText}>Add Profile Picture</Text>
            )}
          </TouchableOpacity>

          <View style={styles.inputGroup}>
            <UserIcon style={styles.inputIcon} color="#9CA3AF" />
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor="#9CA3AF"
              value={name}
              onChangeText={setName}
            />
          </View>
          <View style={styles.inputGroup}>
            <MailIcon style={styles.inputIcon} color="#9CA3AF" />
            <TextInput
              style={styles.input}
              placeholder="Username (Email)"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>
          <View style={styles.inputGroup}>
            <PhoneIcon style={styles.inputIcon} color="#9CA3AF" />
            <TextInput
              style={styles.input}
              placeholder="Phone (Optional)"
              placeholderTextColor="#9CA3AF"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>
          <View style={styles.inputGroup}>
            <LockIcon style={styles.inputIcon} color="#9CA3AF" />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>
          <View style={styles.inputGroup}>
            <LockIcon style={styles.inputIcon} color="#9CA3AF" />
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              placeholderTextColor="#9CA3AF"
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
            />
          </View>

          <TouchableOpacity 
            style={[styles.createButton, isLoading && styles.buttonDisabled]} 
            onPress={handleSignup}
            disabled={isLoading}
          >
            <Text style={styles.createButtonText}>
              {isLoading ? 'CREATING...' : 'CREATE'}
            </Text>
          </TouchableOpacity>

          <View style={styles.loginPrompt}>
            <Text style={styles.loginPromptText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Login here</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
      {/* --- END MODIFIED --- */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'white',
  },
  // --- ADDED: Style for ScrollView itself ---
  scrollView: {
    flex: 1,
  },
  // --- MODIFIED: This now styles the *content* of the ScrollView ---
  container: {
    flexGrow: 1, // Ensures content can grow
    paddingHorizontal: 30,
    paddingTop: 60, // Added padding to clear the back button
    paddingBottom: 40, // Added bottom padding
  },
  backButton: {
    position: 'absolute',
    top: 50, // Adjusted for clarity (works well with SafeAreaView)
    left: 20,
    zIndex: 1, 
    padding: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
    // marginTop: 20, // No longer needed, container padding handles it
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  imagePicker: {
    alignSelf: 'center',
    marginBottom: 20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FEE2E2', 
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FBCFE8',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  imagePickerText: {
    color: '#F87171', 
    textAlign: 'center',
    fontSize: 12,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#FBCFE8', 
    height: 50,
    marginBottom: 15,
    paddingHorizontal: 15,
    width: '100%',
    elevation: 2, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  createButton: {
    backgroundColor: '#F87171', 
    borderRadius: 25,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginTop: 20,
    marginBottom: 20,
  },
  createButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    backgroundColor: '#FECACA', // Lighter pink
  },
  loginPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  loginPromptText: {
    fontSize: 14,
    color: '#666',
  },
  loginLink: {
    fontSize: 14,
    color: '#F87171', 
    fontWeight: 'bold',
  },
});
