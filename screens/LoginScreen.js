import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { LockIcon, MailIcon } from '../components/Icons'; 
import { useAuth } from '../context/AuthContext'; 

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const auth = useAuth(); 

  const handleLogin = async () => {
    // Basic validation
    if (!email || !password) {
      Alert.alert('Validation', 'Please enter both email and password.');
      return;
    }
    
    // Check if it looks like an email
    if (!email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address (e.g. name@email.com) to connect to the server.');
      return;
    }
    
    setIsLoading(true); 
    
    try {
      await auth.login(email.trim(), password);
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Login Failed', error.message || 'Invalid email or password.');
    } finally {
      setIsLoading(false); 
    }
  };

  // --- NEW: Google Login Handler ---
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await auth.googleLogin();
      // No need to navigate manually; AuthContext state change triggers App.js navigation
    } catch (error) {
      console.error('Google Login Error:', error);
      Alert.alert('Google Login Failed', error.message || 'Could not sign in with Google.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topShape}></View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled" 
        >
          <Image
            source={require('../assets/logo_version1.png')}
            style={styles.illustration}
            resizeMode="contain"
          />
          <Text style={styles.welcomeTitle}>Welcome back!</Text>
          <Text style={styles.welcomeSubtitle}>Log in to your existing account of YoursApp</Text>

          {/* Email Input */}
          <View style={styles.inputGroup}>
            <MailIcon style={styles.inputIcon} color="#9CA3AF" />
            <TextInput
              style={styles.input}
              placeholder="Email Address" 
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address" 
              autoCapitalize="none"
            />
          </View>

          {/* Password Input */}
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
              {/* Optional: Add Facebook Icon if you have one */}
              <Text style={styles.socialButtonText}>Facebook</Text>
            </TouchableOpacity>
            
            {/* --- MODIFIED: Google Button connected to handleGoogleLogin --- */}
            <TouchableOpacity 
              style={[styles.socialButton, styles.googleButton]}
              onPress={handleGoogleLogin}
              disabled={isLoading}
            >
              <Image 
                source={require('../assets/google-icon.png')} 
                style={styles.socialIcon} 
                resizeMode="contain"
              />
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF8F8',
  },
  topShape: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 280,
    backgroundColor: '#ffdedeff', 
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
  },
  scrollView: { flex: 1 },
  container: {
    flexGrow: 1,
    paddingHorizontal: 30,
    paddingTop: 100,
    paddingBottom: 40,
    alignItems: 'center',
  },
  illustration: {
    width: '90%',
    height: 220,
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: Platform.OS === 'ios' ? '5%' : 15,
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
    marginBottom: Platform.OS === 'ios' ? 20 : 15,
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
    backgroundColor: '#FECACA',
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
    // Specific styles for Google button if needed
  },
  socialIcon: {
    width: 24,
    height: 24,
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