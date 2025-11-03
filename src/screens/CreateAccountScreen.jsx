import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  SafeAreaView,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ImageBackground,
} from 'react-native';
import { Asset } from 'expo-asset';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { getFontFamily, getFontWeight, getFontSize } from '../constants/fonts';
import { supabase } from '../lib/supabase';

const { width, height } = Dimensions.get('window');
const isTablet = width >= 768;

const CreateAccountScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
  });

  useEffect(() => {
    // Preload the logo image to prevent flash
    Asset.loadAsync(require('../../assets/LockerRoom.png')).then(() => {
      setImageLoaded(true);
    });

    // Test Supabase connection
    const testConnection = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Supabase connection test failed:', error);
        } else {
          console.log('Supabase connection successful');
        }
      } catch (error) {
        console.error('Supabase connection test error:', error);
      }
    };
    
    testConnection();
  }, []);

  const updateFormData = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const validateForm = () => {
    if (!formData.email.trim()) {
      Alert.alert('Required Field', 'Please enter your email address.');
      return false;
    }
    if (!formData.password.trim()) {
      Alert.alert('Required Field', 'Please enter a password.');
      return false;
    }
    if (formData.password.length < 6) {
      Alert.alert('Password Too Short', 'Password must be at least 6 characters long.');
      return false;
    }

    if (!formData.name.trim()) {
      Alert.alert('Required Field', 'Please enter your name.');
      return false;
    }
    return true;
  };

  const handleCreateAccount = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      console.log('Attempting to create account with Supabase...');
      console.log('Supabase URL:', process.env.EXPO_PUBLIC_SUPABASE_URL);
      console.log('Supabase Anon Key length:', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.length || 'undefined');
      console.log('Supabase client config:', { url: supabase.supabaseUrl, key: supabase.supabaseKey?.substring(0, 20) + '...' });
      
      // Create user account
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        // Check if session is established before navigating
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          navigation.navigate('TeamSetup');
        } else {
          // If no session yet, wait a bit and try again
          setTimeout(async () => {
            const { data: { session: retrySession } } = await supabase.auth.getSession();
            if (retrySession) {
              navigation.navigate('TeamSetup');
            } else {
              Alert.alert('Error', 'Failed to establish session. Please try again.');
            }
          }, 2000);
        }
      }

    } catch (error) {
      console.error('Error creating account:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        name: error.name
      });
      
      let errorMessage = 'Failed to create account. Please try again.';
      let alertTitle = 'Account Creation Failed';
      
      if (error.message) {
        // Handle specific Supabase auth errors
        if (error.message.includes('User already registered')) {
          errorMessage = 'An account with this email already exists. Please sign in instead.';
          alertTitle = 'Account Already Exists';
        } else if (error.message.includes('Password should be at least')) {
          errorMessage = 'Password must be at least 6 characters long.';
          alertTitle = 'Password Too Short';
        } else if (error.message.includes('Invalid email')) {
          errorMessage = 'Please enter a valid email address.';
          alertTitle = 'Invalid Email';
        } else if (error.message.includes('Signup is disabled')) {
          errorMessage = 'Account creation is currently disabled. Please contact support.';
          alertTitle = 'Signup Disabled';
        } else {
          errorMessage = error.message;
        }
      } else if (error.name === 'AuthRetryableFetchError') {
        errorMessage = 'Network error: Please check your internet connection and try again.';
        alertTitle = 'Connection Error';
      }
      
      Alert.alert(alertTitle, errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground 
      source={require('../../assets/whitesection.png')}
      style={styles.container}
      resizeMode="cover"
    >
      <View style={styles.overlay} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView 
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={true}
          alwaysBounceVertical={true}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
        <View style={styles.brandSection}>
          {imageLoaded && (
            <Image
              source={require('../../assets/LockerRoom.png')}
              style={styles.lockerLogo}
              resizeMode="contain"
            />
          )}
          <Text style={styles.appName}>LockerRoom</Text>
          <Text style={styles.tagline}>Where teams connect</Text>
        </View>

        <View style={styles.formSection}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={[
                styles.textInput,
                focusedField === 'name' && styles.textInputFocused
              ]}
              value={formData.name}
              onChangeText={(text) => updateFormData('name', text)}
              onFocus={() => setFocusedField('name')}
              onBlur={() => setFocusedField(null)}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[
                styles.textInput,
                focusedField === 'email' && styles.textInputFocused
              ]}
              value={formData.email}
              onChangeText={(text) => updateFormData('email', text)}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={[
              styles.passwordContainer,
              focusedField === 'password' && styles.passwordContainerFocused
            ]}>
              <TextInput
                style={styles.passwordInput}
                value={formData.password}
                onChangeText={(text) => updateFormData('password', text)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                secureTextEntry={!showPassword}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color={COLORS.MEDIUM_GRAY}
                />
              </TouchableOpacity>
            </View>
          </View>



          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
            onPress={handleCreateAccount}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.WHITE} />
            ) : (
              <Text style={styles.primaryButtonText}>Continue</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.legalText}>
            By creating an account, you agree to our{' '}
            <Text style={styles.link}>Terms of Service</Text> and{' '}
            <Text style={styles.link}>Privacy Policy</Text>.
          </Text>
        </View>
          </View>
        </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    zIndex: 2,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    zIndex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: isTablet ? 24 : 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: COLORS.PRIMARY_BLACK,
    fontSize: 20,
    fontWeight: '600',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: isTablet ? 32 : 28,
  },
  brandSection: {
    alignItems: 'center',
    marginTop: isTablet ? 24 : 20,
    marginBottom: isTablet ? 48 : 36,
  },
  lockerLogo: {
    width: isTablet ? 80 : 60,
    height: isTablet ? 80 : 60,
    marginBottom: 16,
    borderRadius: isTablet ? 16 : 12,
  },
  appName: {
    fontSize: getFontSize(isTablet ? '3XL' : '2XL'),
    fontWeight: getFontWeight('BOLD'),
    color: COLORS.PRIMARY_BLACK,
    letterSpacing: 1.5,
    marginBottom: 8,
    fontFamily: 'Georgia',
  },
  tagline: {
    fontSize: getFontSize(isTablet ? 'BASE' : 'SM'),
    color: COLORS.MEDIUM_GRAY,
    fontStyle: 'italic',
    fontFamily: 'Georgia',
  },
  formSection: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: getFontSize('BASE'),
    fontWeight: getFontWeight('MEDIUM'),
    color: COLORS.PRIMARY_BLACK,
    marginBottom: 5,
  },
  textInput: {
    backgroundColor: 'transparent',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    color: COLORS.PRIMARY_BLACK,
    fontSize: getFontSize('BASE'),
    borderWidth: 1,
    borderColor: '#D0D0D0',
    height: 48,
  },
  textInputFocused: {
    borderColor: COLORS.PRIMARY_BLACK,
    borderWidth: 2,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D0D0D0',
    height: 48,
  },
  passwordContainerFocused: {
    borderColor: COLORS.PRIMARY_BLACK,
    borderWidth: 2,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    color: COLORS.PRIMARY_BLACK,
    fontSize: getFontSize('BASE'),
  },
  eyeButton: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },

  primaryButton: {
    backgroundColor: COLORS.PRIMARY_BLACK,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 32,
    height: 48,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: COLORS.WHITE,
    fontSize: getFontSize('BASE'),
    fontWeight: getFontWeight('SEMIBOLD'),
  },
  legalText: {
    fontSize: getFontSize('SM'),
    color: COLORS.MEDIUM_GRAY,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  link: {
    textDecorationLine: 'underline',
    color: COLORS.PRIMARY_BLACK,
  },
});

export default CreateAccountScreen;
