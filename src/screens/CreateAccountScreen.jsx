import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { getFontWeight, getFontSize } from '../constants/fonts';
import { supabase } from '../lib/supabase';
import { ensureUserProfile } from '../lib/onboarding';
import { AppBootstrapContext } from '../contexts/AppBootstrapContext';

const CreateAccountScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
  });
  const { refreshBootstrap } = useContext(AppBootstrapContext);

  useEffect(() => {
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
          emailRedirectTo: 'lockerroom://auth/callback',
        },
      });

      if (error) throw error;

      if (data.user) {
        const newUser = data.user;
        console.log('✅ User created:', newUser.id);
        console.log('📧 Email confirmation required:', newUser.email_confirmed_at === null);

        try {
          await ensureUserProfile(newUser, formData.name);
          console.log('✅ ensureUserProfile completed');
        } catch (seedError) {
          console.error('⚠️ Failed to seed user profile:', seedError);
        }
        
        // Check if session is established (email confirmation disabled) or user needs to confirm
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.log('✅ Session established immediately - refreshing bootstrap');
          const targetRoute = await refreshBootstrap({ showSpinner: false });

          if (targetRoute) {
            navigation.reset({
              index: 0,
              routes: [{ name: targetRoute }],
            });
          }
        } else if (data.user.email_confirmed_at === null) {
          // Email confirmation is required
          console.log('⚠️ Email confirmation required');
          Alert.alert(
            'Check Your Email',
            'We sent a confirmation link to your email. Please click the link to verify your account, then sign in.',
            [
              {
                text: 'OK',
                onPress: () => navigation.navigate('SignIn'),
              },
            ]
          );
        } else {
          // If no session yet, wait a bit and try again
          console.log('⏳ Waiting for session...');
          setTimeout(async () => {
            const { data: { session: retrySession } } = await supabase.auth.getSession();
            if (retrySession) {
              console.log('✅ Session established after wait - refreshing bootstrap');
          const targetRoute = await refreshBootstrap({ showSpinner: false });

          if (targetRoute) {
            navigation.reset({
              index: 0,
              routes: [{ name: targetRoute }],
            });
          }
            } else {
              console.error('❌ Session not established after wait');
              Alert.alert(
                'Account Created',
                'Your account has been created. Please check your email to confirm your account, then sign in.',
                [
                  {
                    text: 'OK',
                    onPress: () => navigation.navigate('SignIn'),
                  },
                ]
              );
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
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView 
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
        >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.brandSection}>
              <Image
                source={require('../../assets/LockerRoom.png')}
                style={styles.brandLogo}
                resizeMode="contain"
              />
            <View style={styles.brandText}>
              <Text style={styles.brandTitle}>Create your account</Text>
              <Text style={styles.brandSubtitle}>
                Join your squad and keep every play in one place.
              </Text>
            </View>
          </View>

          <View style={styles.formArea}>
          <View style={styles.inputGroup}>
              <Text style={styles.label}>Full name</Text>
            <TextInput
              style={[
                styles.textInput,
                  focusedField === 'name' && styles.textInputFocused,
              ]}
              value={formData.name}
              onChangeText={(text) => updateFormData('name', text)}
              onFocus={() => setFocusedField('name')}
              onBlur={() => setFocusedField(null)}
              autoCapitalize="words"
                placeholder="Jordan Reed"
                placeholderTextColor={COLORS.TEXT_MUTED}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[
                styles.textInput,
                  focusedField === 'email' && styles.textInputFocused,
              ]}
              value={formData.email}
              onChangeText={(text) => updateFormData('email', text)}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              keyboardType="email-address"
              autoCapitalize="none"
                placeholder="you@example.com"
                placeholderTextColor={COLORS.TEXT_MUTED}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
              <View
                style={[
              styles.passwordContainer,
                  focusedField === 'password' && styles.passwordContainerFocused,
                ]}
              >
              <TextInput
                style={styles.passwordInput}
                value={formData.password}
                onChangeText={(text) => updateFormData('password', text)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                secureTextEntry={!showPassword}
                returnKeyType="done"
                  placeholder="Minimum 6 characters"
                  placeholderTextColor={COLORS.TEXT_MUTED}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
                  accessibilityRole="button"
                  accessibilityLabel="Toggle password visibility"
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
                <Text style={styles.primaryButtonText}>Create account</Text>
            )}
          </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryAction}
              onPress={() => navigation.navigate('SignIn')}
            >
              <Text style={styles.secondaryText}>
                Already have an account? <Text style={styles.secondaryTextBold}>Sign in</Text>
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.legalText}>
            By creating an account, you agree to our{' '}
            <Text style={styles.link}>Terms of Service</Text> and{' '}
            <Text style={styles.link}>Privacy Policy</Text>.
          </Text>
        </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.WHITE,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  brandSection: {
    gap: 20,
    marginBottom: 28,
    paddingTop: 32,
  },
  brandLogo: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  brandText: {
    gap: 6,
  },
  brandTitle: {
    fontSize: getFontSize('2XL'),
    fontWeight: getFontWeight('BOLD'),
    color: COLORS.PRIMARY_BLACK,
  },
  brandSubtitle: {
    fontSize: getFontSize('SM'),
    color: COLORS.MEDIUM_GRAY,
    lineHeight: 20,
  },
  formArea: {
    gap: 20,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: getFontSize('XS'),
    fontWeight: getFontWeight('SEMIBOLD'),
    color: COLORS.PRIMARY_BLACK,
  },
  textInput: {
    backgroundColor: '#F4F5F7',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: getFontSize('SM'),
    color: COLORS.PRIMARY_BLACK,
    borderWidth: 1,
    borderColor: '#EAEBF0',
  },
  textInputFocused: {
    borderColor: COLORS.PRIMARY_BLACK,
    backgroundColor: COLORS.WHITE,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#F4F5F7',
    borderWidth: 1,
    borderColor: '#EAEBF0',
  },
  passwordContainerFocused: {
    borderColor: COLORS.PRIMARY_BLACK,
    backgroundColor: COLORS.WHITE,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: getFontSize('SM'),
    color: COLORS.PRIMARY_BLACK,
  },
  eyeButton: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButton: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.PRIMARY_BLACK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: COLORS.WHITE,
    fontSize: getFontSize('BASE'),
    fontWeight: getFontWeight('SEMIBOLD'),
  },
  secondaryAction: {
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryText: {
    fontSize: getFontSize('SM'),
    color: COLORS.MEDIUM_GRAY,
  },
  secondaryTextBold: {
    color: COLORS.PRIMARY_BLACK,
    fontWeight: getFontWeight('SEMIBOLD'),
  },
  legalText: {
    fontSize: getFontSize('XS'),
    color: COLORS.MEDIUM_GRAY,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 24,
  },
  link: {
    textDecorationLine: 'underline',
    color: COLORS.PRIMARY_BLACK,
  },
});

export default CreateAccountScreen;
