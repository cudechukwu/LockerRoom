import React, { useState, useContext } from 'react';
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
import { useSupabase } from '../providers/SupabaseProvider';
import { ensureUserProfile } from '../lib/onboarding';
import { AppBootstrapContext } from '../contexts/AppBootstrapContext';

const SignInScreen = ({ navigation }) => {
  const supabase = useSupabase();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const { refreshBootstrap } = useContext(AppBootstrapContext);

  const updateFormData = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const validateForm = () => {
    if (!formData.email.trim()) {
      Alert.alert('Required Field', 'Please enter your email address.');
      return false;
    }
    if (!formData.password.trim()) {
      Alert.alert('Required Field', 'Please enter your password.');
      return false;
    }
    return true;
  };

  const handleSignIn = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      console.log('Attempting to sign in with Supabase...');
      
      // Sign in user
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      if (data.user) {
        try {
          await ensureUserProfile(supabase, data.user);
        } catch (seedError) {
          console.error('⚠️ ensureUserProfile failed after sign in:', seedError);
        }

        const targetRoute = await refreshBootstrap({ showSpinner: false });

        if (targetRoute) {
          navigation.reset({
            index: 0,
            routes: [{ name: targetRoute }],
          });
        }
      }

    } catch (error) {
      // Log for debugging but don't show scary error to user
      console.log('Sign in attempt failed:', error.message);
      
      let errorMessage = 'Failed to sign in. Please try again.';
      let alertTitle = 'Sign In Failed';
      
      if (error.message) {
        console.log('Error message:', error.message);
        // Handle specific Supabase auth errors
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password. Please check your credentials and try again.';
          alertTitle = 'Invalid Credentials';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Please check your email and click the confirmation link before signing in.';
          alertTitle = 'Email Not Confirmed';
        } else if (error.message.includes('Too many requests')) {
          errorMessage = 'Too many sign-in attempts. Please wait a moment and try again.';
          alertTitle = 'Too Many Attempts';
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
              <Text style={styles.brandTitle}>Welcome back</Text>
              <Text style={styles.brandSubtitle}>
                Sign in to catch up with your team and stay on pulse.
              </Text>
            </View>
            </View>

          <View style={styles.formArea}>
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
                  autoCorrect={false}
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
                  placeholder="Enter your password"
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
                onPress={handleSignIn}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.WHITE} />
                ) : (
                <Text style={styles.primaryButtonText}>Sign in</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
              style={styles.secondaryAction}
              onPress={() =>
                Alert.alert('Coming soon', 'Password reset will be available shortly.')
              }
              >
              <Text style={styles.secondaryTextBold}>Forgot password?</Text>
              </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryAction}
                  onPress={() => navigation.navigate('CreateAccount')}
                >
              <Text style={styles.secondaryText}>
                New to LockerRoom?{' '}
                <Text style={styles.secondaryTextBold}>Create an account</Text>
              </Text>
            </TouchableOpacity>
          </View>
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
    marginTop: 4,
  },
  secondaryText: {
    fontSize: getFontSize('SM'),
    color: COLORS.MEDIUM_GRAY,
  },
  secondaryTextBold: {
    color: COLORS.PRIMARY_BLACK,
    fontWeight: getFontWeight('SEMIBOLD'),
  },
});

export default SignInScreen;
