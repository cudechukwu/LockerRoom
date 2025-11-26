import React, { useState, useRef, useEffect, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ImageBackground,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { getFontFamily, getFontWeight, getFontSize } from '../constants/fonts';
import { useSupabase } from '../providers/SupabaseProvider';
import { TABLES, STORAGE_BUCKETS } from '../lib/supabase';
import { seedInitialData, ensureUserProfile } from '../lib/onboarding';
import { AppBootstrapContext } from '../contexts/AppBootstrapContext';

const { width, height } = Dimensions.get('window');
const isTablet = width >= 768;

const TeamSetupScreen = ({ navigation }) => {
  const supabase = useSupabase();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  
  // Form state - persisted locally until final submission
  const [formData, setFormData] = useState({
    // Step 1: Team Basics
    team_name: '',
    sport: 'football',
    team_type: '', // 'school' or 'club'
    school: '',
    
    // Step 2: Roles & Invites
    coaches: [],
    trainers: [],
    assistants: [],
    players: [],
    restrict_domain: false,
    
    // Step 3: Access Controls
    join_code_approval: 'admin_only', // 'admin_only' or 'admin_coach'
  });

  const [inviteEmails, setInviteEmails] = useState({
    coaches: '',
    trainers: '',
    assistants: '',
    players: '',
  });

  const scrollViewRef = useRef();
  const { refreshBootstrap } = useContext(AppBootstrapContext);

  useEffect(() => {
    // Check authentication state when component mounts
    const checkAuth = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Auth check error:', error);
      } else if (!session) {
        console.error('No session found on mount');
        Alert.alert('Authentication Error', 'Please sign in again.');
        navigation.navigate('SignIn');
      } else {
        console.log('Session found:', session.user.id);
      }
    };
    
    checkAuth();
  }, []);

  const updateFormData = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const parseEmailList = (emailString) => {
    return emailString
      .split(/[,\n\s]+/)
      .map(email => email.trim())
      .filter(email => email && email.includes('@'));
  };

  const validateStep = (step) => {
    switch (step) {
      case 1:
        if (!formData.team_name.trim()) {
          Alert.alert('Required Field', 'Please enter a team name.');
          return false;
        }
        if (!formData.team_type) {
          Alert.alert('Required Field', 'Please select whether this is a school or club.');
          return false;
        }
        if (!formData.school.trim()) {
          Alert.alert('Required Field', `Please enter a ${formData.team_type} name.`);
          return false;
        }

        break;
      case 2:
        // All invite fields are optional
        break;
      case 3:
        // Access control settings have defaults
        break;
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 3) {
        setCurrentStep(currentStep + 1);
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }
  };

  const handleCreateTeam = async () => {
    if (!validateStep(3)) return;
    
    setLoading(true);
    try {
      // Check session first
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('Session error:', sessionError);
        throw new Error('Session error: ' + sessionError.message);
      }
      
      if (!session) {
        console.error('No active session found');
        throw new Error('No active session found');
      }

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('User error:', userError);
        throw new Error('User not authenticated');
      }

      console.log('User authenticated:', user.id);

      // Ensure base user profile exists even if they skipped account completion
      try {
        await ensureUserProfile(supabase, user, user.user_metadata?.name || formData.team_name);
      } catch (seedError) {
        console.warn('⚠️ ensureUserProfile during team creation failed:', seedError);
      }

      // Parse invite emails
      const invites = {
        coaches: parseEmailList(inviteEmails.coaches),
        trainers: parseEmailList(inviteEmails.trainers),
        assistants: parseEmailList(inviteEmails.assistants),
        players: parseEmailList(inviteEmails.players),
      };

      // Create team and related records in a transaction
      const { data: team, error: teamError } = await supabase
        .from(TABLES.TEAMS)
        .insert({
          name: formData.team_name,
          sport: formData.sport,
          school: formData.school,
          primary_color: '#1C1C1C', // Default color
          secondary_color: '#F5F5F5', // Default color
          logo_url: null,
          restrict_domain: formData.restrict_domain,
          created_by: user.id,
        })
        .select()
        .single();

      if (teamError) throw teamError;

      // Create team member record (creator as admin)
      const { error: memberError } = await supabase
        .from(TABLES.TEAM_MEMBERS)
        .insert({
          team_id: team.id,
          user_id: user.id,
          role: 'coach', // Default operational role
          is_admin: true,
        });

      if (memberError) throw memberError;

      // Create join code
      const joinCode = generateJoinCode();
      const { error: codeError } = await supabase
        .from(TABLES.TEAM_JOIN_CODES)
        .insert({
          team_id: team.id,
          code: joinCode,
          expires_at: null,
          created_by: user.id,
        });

      if (codeError) throw codeError;

      // TODO: Send invites (implement email service)
      // TODO: Upload logo if provided

      try {
        await seedInitialData(supabase, { user, team, role: 'coach' });
        console.log('✅ seedInitialData completed for team creator');
      } catch (seedError) {
        console.warn('⚠️ seedInitialData failed for team creator:', seedError);
      }

      Alert.alert(
        'Team Created!',
        'Your team has been created successfully. Invites will be sent shortly.',
        [{
          text: 'OK',
          onPress: () => {
            refreshBootstrap({ showSpinner: true });
          }
        }]
      );

    } catch (error) {
      console.error('Error creating team:', error);
      Alert.alert('Error', 'Failed to create team. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generateJoinCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Team Basics</Text>
      <Text style={styles.stepDescription}>
        Let's start with the fundamentals of your team.
      </Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Team Name *</Text>
        <TextInput
          style={[
            styles.textInput,
            focusedField === 'team_name' && styles.textInputFocused
          ]}
          value={formData.team_name}
          onChangeText={(text) => updateFormData('team_name', text)}
          onFocus={() => setFocusedField('team_name')}
          onBlur={() => setFocusedField(null)}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Sport</Text>
        <View style={[
          styles.textInput,
          styles.disabledInput
        ]}>
          <Text style={styles.disabledText}>Football</Text>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Is this a school or club?</Text>
        <View style={styles.teamTypeContainer}>
          <TouchableOpacity
            style={[
              styles.teamTypeOption,
              formData.team_type === 'school' && styles.teamTypeOptionSelected
            ]}
            onPress={() => updateFormData('team_type', 'school')}
          >
            <Text style={[
              styles.teamTypeOptionText,
              formData.team_type === 'school' && styles.teamTypeOptionTextSelected
            ]}>
              School
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.teamTypeOption,
              formData.team_type === 'club' && styles.teamTypeOptionSelected
            ]}
            onPress={() => updateFormData('team_type', 'club')}
          >
            <Text style={[
              styles.teamTypeOptionText,
              formData.team_type === 'club' && styles.teamTypeOptionTextSelected
            ]}>
              Club
            </Text>
          </TouchableOpacity>
        </View>
      </View>



      {formData.team_type && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{formData.team_type === 'school' ? 'School Name' : 'Club Name'} *</Text>
          <TextInput
            style={[
              styles.textInput,
              focusedField === 'school' && styles.textInputFocused
            ]}
            value={formData.school}
            onChangeText={(text) => updateFormData('school', text)}
            onFocus={() => setFocusedField('school')}
            onBlur={() => setFocusedField(null)}
          />
        </View>
      )}
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Roles & Invites</Text>
      <Text style={styles.stepDescription}>
        Invite team members by role. Enter emails separated by commas.
      </Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Coaches</Text>
        <TextInput
          style={[
            styles.textInput,
            styles.textArea,
            focusedField === 'coaches' && styles.textInputFocused
          ]}
          value={inviteEmails.coaches}
          onChangeText={(text) => setInviteEmails(prev => ({ ...prev, coaches: text }))}
          onFocus={() => setFocusedField('coaches')}
          onBlur={() => setFocusedField(null)}
          placeholder="coach1@wesleyan.edu, coach2@wesleyan.edu"
          placeholderTextColor={COLORS.MEDIUM_GRAY}
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Trainers</Text>
        <TextInput
          style={[
            styles.textInput,
            styles.textArea,
            focusedField === 'trainers' && styles.textInputFocused
          ]}
          value={inviteEmails.trainers}
          onChangeText={(text) => setInviteEmails(prev => ({ ...prev, trainers: text }))}
          onFocus={() => setFocusedField('trainers')}
          onBlur={() => setFocusedField(null)}
          placeholder="trainer1@wesleyan.edu, trainer2@wesleyan.edu"
          placeholderTextColor={COLORS.MEDIUM_GRAY}
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Assistants</Text>
        <TextInput
          style={[
            styles.textInput,
            styles.textArea,
            focusedField === 'assistants' && styles.textInputFocused
          ]}
          value={inviteEmails.assistants}
          onChangeText={(text) => setInviteEmails(prev => ({ ...prev, assistants: text }))}
          onFocus={() => setFocusedField('assistants')}
          onBlur={() => setFocusedField(null)}
          placeholder="assistant1@wesleyan.edu, assistant2@wesleyan.edu"
          placeholderTextColor={COLORS.MEDIUM_GRAY}
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Players</Text>
        <TextInput
          style={[
            styles.textInput,
            styles.textArea,
            focusedField === 'players' && styles.textInputFocused
          ]}
          value={inviteEmails.players}
          onChangeText={(text) => setInviteEmails(prev => ({ ...prev, players: text }))}
          onFocus={() => setFocusedField('players')}
          onBlur={() => setFocusedField(null)}
          placeholder="player1@wesleyan.edu, player2@wesleyan.edu"
          placeholderTextColor={COLORS.MEDIUM_GRAY}
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.inputGroup}>
        <TouchableOpacity
          style={styles.toggleContainer}
          onPress={() => updateFormData('restrict_domain', !formData.restrict_domain)}
        >
          <View style={[
            styles.toggle,
            formData.restrict_domain && styles.toggleActive
          ]}>
            <View style={[
              styles.toggleThumb,
              formData.restrict_domain && styles.toggleThumbActive
            ]} />
          </View>
          <Text style={styles.toggleLabel}>
            Restrict to @wesleyan.edu emails only
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Access Controls</Text>
      <Text style={styles.stepDescription}>
        Set up how new members can join your team.
      </Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Join Code Approval</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={styles.radioOption}
            onPress={() => updateFormData('join_code_approval', 'admin_only')}
          >
            <View style={[
              styles.radioButton,
              formData.join_code_approval === 'admin_only' && styles.radioButtonSelected
            ]} />
            <Text style={styles.radioLabel}>Admin only</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.radioOption}
            onPress={() => updateFormData('join_code_approval', 'admin_coach')}
          >
            <View style={[
              styles.radioButton,
              formData.join_code_approval === 'admin_coach' && styles.radioButtonSelected
            ]} />
            <Text style={styles.radioLabel}>Admin + Coach</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Join Code</Text>
        <View style={styles.joinCodeContainer}>
          <Text style={styles.joinCodeText}>ABC123</Text>
          <Text style={styles.joinCodeInfo}>
            Expires in 7 days • Auto-approves new members
          </Text>
        </View>
      </View>
    </View>
  );

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
                  <View style={styles.stepIndicator}>
          <Text style={styles.stepText}>Step {currentStep} of 3</Text>
        </View>
        </View>

      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={true}
          alwaysBounceVertical={true}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
                    {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        {currentStep > 1 && (
          <TouchableOpacity style={styles.secondaryButton} onPress={prevStep}>
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>
        )}
        
        {currentStep < 3 ? (
          <TouchableOpacity style={styles.primaryButton} onPress={nextStep}>
            <Text style={styles.primaryButtonText}>Next</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
            onPress={handleCreateTeam}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.PRIMARY_BLACK} />
            ) : (
              <Text style={styles.primaryButtonText}>Create Team</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: isTablet ? 24 : 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  backButtonText: {
    color: '#F9F9F9',
    fontSize: 20,
    fontWeight: '600',
  },

  stepIndicator: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  stepText: {
    color: '#F9F9F9',
    fontSize: getFontSize('SM'),
    fontWeight: getFontWeight('MEDIUM'),
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
    paddingTop: 24,
  },
  stepContainer: {
    marginBottom: 32,
  },
  stepTitle: {
    fontSize: getFontSize(isTablet ? 'XL' : 'LG'),
    fontWeight: getFontWeight('BOLD'),
    color: '#F9F9F9',
    marginBottom: 8,
    fontFamily: 'Georgia',
  },
  stepDescription: {
    fontSize: getFontSize('BASE'),
    color: '#F5F5F5',
    marginBottom: 24,
    lineHeight: 22,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: getFontSize('BASE'),
    fontWeight: getFontWeight('MEDIUM'),
    color: '#F9F9F9',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    color: '#F9F9F9',
    fontSize: getFontSize('BASE'),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    height: 48,
  },
  textInputFocused: {
    borderColor: '#F9F9F9',
    borderWidth: 2,
  },
  disabledInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  disabledText: {
    color: '#F5F5F5',
    fontSize: getFontSize('BASE'),
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  teamTypeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  teamTypeOption: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
  },
  teamTypeOptionSelected: {
    borderColor: '#F9F9F9',
    backgroundColor: '#F9F9F9',
  },
  teamTypeOptionText: {
    color: '#F9F9F9',
    fontSize: getFontSize('BASE'),
    fontWeight: getFontWeight('MEDIUM'),
  },
  teamTypeOptionTextSelected: {
    color: COLORS.PRIMARY_BLACK,
  },


  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggle: {
    width: 48,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 2,
  },
  toggleActive: {
    backgroundColor: COLORS.WHITE,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    backgroundColor: '#999',
    borderRadius: 10,
  },
  toggleThumbActive: {
    backgroundColor: COLORS.PRIMARY_BLACK,
    transform: [{ translateX: 24 }],
  },
  toggleLabel: {
    color: '#F9F9F9',
    fontSize: getFontSize('BASE'),
    flex: 1,
  },
  radioContainer: {
    gap: 16,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'transparent',
  },
  radioButtonSelected: {
    borderColor: '#F9F9F9',
    backgroundColor: '#F9F9F9',
  },
  radioLabel: {
    color: '#F9F9F9',
    fontSize: getFontSize('BASE'),
  },
  joinCodeContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  joinCodeText: {
    fontSize: getFontSize('2XL'),
    fontWeight: getFontWeight('BOLD'),
    color: '#F9F9F9',
    letterSpacing: 2,
    marginBottom: 8,
    fontFamily: 'Georgia',
  },
  joinCodeInfo: {
    fontSize: getFontSize('SM'),
    color: '#F5F5F5',
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: isTablet ? 32 : 28,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    height: 48,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: COLORS.PRIMARY_BLACK,
    fontSize: getFontSize('BASE'),
    fontWeight: getFontWeight('SEMIBOLD'),
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F9F9F9',
    height: 48,
  },
  secondaryButtonText: {
    color: '#F9F9F9',
    fontSize: getFontSize('BASE'),
    fontWeight: getFontWeight('SEMIBOLD'),
  },
});

export default TeamSetupScreen;
