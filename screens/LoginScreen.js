import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ScrollView,
  KeyboardAvoidingView, // For keyboard handling
  Platform // To check OS for KeyboardAvoidingView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'
import { LockIcon, MailIcon } from '../components/Icons'; // Assuming icons are in ../components/Icons.js
import { useAuth } from '../context/AuthContext'; // Import useAuth

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false); // Added loading state
  const auth = useAuth(); // Get auth context

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Validation', 'Please enter both email and password.');
      return;
    }

    setIsLoading(true); // Set loading true

    try {
      // --- MODIFIED: Use auth.login ---
      // We pass the email (trimmed) and password to the context
      await auth.login(email.trim(), password);

      // navigation.replace('Home') is no longer needed here.
      // App.js listens to the `isLoggedIn` state from AuthContext
      // and will automatically navigate to the 'Home' screen.

    } catch (error) {
      console.error('Login error:', error);
      // Display the error message thrown from AuthContext
      Alert.alert('Login Failed', error.message || 'Invalid email or password.');
    } finally {
      setIsLoading(false); // Set loading false
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FFF8F8' }}>
      <View style={styles.topShape}>
        <Image
          source={require('../assets/logo_version1.png')}
          style={styles.illustration}
          resizeMode="contain"
        />
      </View>
      <SafeAreaView style={styles.safeArea}>

        {/* --- ADDED KeyboardAvoidingView Wrapper --- */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled" // Good for dismissing keyboard on tap
          >
            <Text style={styles.welcomeTitle}>Welcome back!</Text>
            <Text style={styles.welcomeSubtitle}>Log in to your existing account of YoursApp</Text>

            <View style={styles.inputGroup}>
              <MailIcon style={styles.inputIcon} color="#9CA3AF" />
              <TextInput
                style={styles.input}
                placeholder="Username"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
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

            <TouchableOpacity style={styles.forgotPasswordButton} onPress={() => Alert.alert('Forgot Password', 'Feature to be implemented.')}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              <Text style={styles.loginButtonText}>
                {isLoading ? 'LOGGING IN...' : 'LOG IN'}
              </Text>
            </TouchableOpacity>

            <Text style={styles.orConnectText}>Or connect using</Text>

            <View style={styles.socialButtonsContainer}>
              <TouchableOpacity style={styles.socialButton}>
                {/* <Image source={require('../assets/facebook-icon.png')} style={styles.socialIcon} /> */}
                <Text style={styles.socialButtonText}>Facebook</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.socialButton, styles.googleButton]}>
                {/* <Image source={require('../assets/google-icon.png')} style={styles.socialIcon} /> */}
                <Text style={styles.socialButtonText}>Google</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.signupPrompt}>
              <Text style={styles.signupPromptText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
                <Text style={styles.signupLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
        {/* --- END KeyboardAvoidingView Wrapper --- */}

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF8F8',
  },
  // --- MODIFIED: Changed height from '35%' to a fixed 280 ---
  topShape: {
    position: 'relative',
    top: 0,
    left: 0,
    right: 0,
    height: 280, // Fixed height for consistent layout
    backgroundColor: '#ffdedeff',
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
  },
  scrollView: {
    flex: 1,
  },
  // --- MODIFIED: Adjusted padding and removed justifyContent ---
  container: {
    flexGrow: 1, // Ensures content can grow and be scrollable
    paddingHorizontal: 30,
    paddingTop: Platform.OS === 'ios' ? '15%' : 100, // Adjusted for new topShape height
    paddingBottom: 40, // Added bottom padding for spacing
    alignItems: 'center',
  },
  // --- MODIFIED: Adjusted height for new layout ---
  illustration: {
    width: '90%',
    marginTop: Platform.OS === 'ios' ? '20%' : 0,
    height: 220, // Adjusted height
    marginBottom: 20,
    alignSelf: 'center',
  },
  welcomeTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 15,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#F87171',
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
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: 25,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#F87171',
  },
  loginButton: {
    backgroundColor: '#F87171',
    borderRadius: 25,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    backgroundColor: '#FECACA', // Lighter pink
  },
  orConnectText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 20,
  },
  socialButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 30,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#F87171',
    height: 50,
    width: '48%',
  },
  googleButton: {
    // Specific styles for Google if needed
  },
  socialIcon: {
    width: 20,
    height: 20,
    marginRight: 10,
  },
  socialButtonText: {
    fontSize: 16,
    color: '#333',
  },
  signupPrompt: {
    flexDirection: 'row',
  },
  signupPromptText: {
    fontSize: 14,
    color: '#666',
  },
  signupLink: {
    fontSize: 14,
    color: '#F87171',
    fontWeight: 'bold',
  },
});