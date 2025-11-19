import React, { useState, useContext, useEffect, useCallback } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { COLORS } from '../constants/colors';
import { getFontSize, getFontWeight } from '../constants/fonts';
import { AppBootstrapContext } from '../contexts/AppBootstrapContext';
import { TeamContext } from '../contexts/TeamContext';
import { ensureTeamMemberProfile } from '../lib/onboarding';

const JoinOrCreateTeamScreen = ({ navigation }) => {
  const { user, refreshBootstrap } = useContext(AppBootstrapContext);
  const { teams } = useContext(TeamContext);
  const [joinCode, setJoinCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (teams && teams.length > 0) {
      if (teams.length === 1) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        });
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: 'TeamPicker' }],
        });
      }
    }
  }, [teams, navigation]);

  const handleCreateTeam = useCallback(() => {
    navigation.navigate('TeamSetup');
  }, [navigation]);

  const handleJoinTeam = useCallback(async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) {
      Alert.alert('Invite Code Required', 'Enter the 6-character code your coach shared.');
      return;
    }

    if (code.length < 6) {
      Alert.alert('Invalid Code', 'Invite codes are typically 6 characters long.');
      return;
    }

    if (!user?.id) {
      Alert.alert('Not Signed In', 'Please sign in again to join a team.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: joinCodeRow, error: joinCodeError } = await supabase
        .from('team_join_codes')
        .select('team_id, is_active')
        .eq('code', code)
        .maybeSingle();

      if (joinCodeError) {
        throw joinCodeError;
      }

      if (!joinCodeRow) {
        Alert.alert('Invalid Code', 'We could not find that invite code. Check with your coach.');
        return;
      }

      const { team_id: teamId, is_active: isActive } = joinCodeRow;

      if (!isActive) {
        Alert.alert('Invite Inactive', 'This invite code is no longer active.');
        return;
      }

      const { data: existingMember } = await supabase
        .from('team_members')
        .select('id')
        .eq('team_id', teamId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingMember) {
        Alert.alert('Already on Team', 'You are already a member of this team.');
        await refreshBootstrap({ showSpinner: true });
        return;
      }

      const { error: insertError } = await supabase
        .from('team_members')
        .insert({
          team_id: teamId,
          user_id: user.id,
          role: 'player',
          is_admin: false,
        });

      if (insertError && insertError.code !== '23505') {
        throw insertError;
      }

      try {
        await ensureTeamMemberProfile(teamId, user.id, 'player');
      } catch (profileError) {
        console.warn('Failed to create team member profile after join:', profileError);
      }

      await refreshBootstrap({ showSpinner: true });
    } catch (error) {
      console.error('Join team via code failed:', error);
      Alert.alert(
        'Could Not Join',
        error?.message || 'We could not join that team. Double-check the code and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [joinCode, user?.id, refreshBootstrap]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 32 : 0}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>Welcome to LockerRoom</Text>
            <Text style={styles.subtitle}>
              Join your squad with the code your coach shared, or create a new team if you run the show.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>I have an invite code</Text>
            <Text style={styles.cardDescription}>
              Enter the 6-character code from your coach or captain to join instantly.
            </Text>
            <TextInput
              value={joinCode}
              onChangeText={(text) => setJoinCode(text.toUpperCase())}
              autoCapitalize="characters"
              autoCorrect={false}
              keyboardType="default"
              maxLength={10}
              style={styles.input}
              placeholder="E.g. ABC123"
              placeholderTextColor={COLORS.MEDIUM_GRAY}
            />
            <TouchableOpacity
              style={[styles.primaryButton, isSubmitting && styles.primaryButtonDisabled]}
              onPress={handleJoinTeam}
              activeOpacity={0.85}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color={COLORS.WHITE} />
              ) : (
                <Text style={styles.primaryButtonLabel}>Join Team</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.separatorContainer}>
            <View style={styles.separatorLine} />
            <Text style={styles.separatorText}>or</Text>
            <View style={styles.separatorLine} />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>I want to create a team</Text>
            <Text style={styles.cardDescription}>
              Coaches and captains can spin up a team space, customize it, and invite the roster in minutes.
            </Text>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleCreateTeam}
              activeOpacity={0.85}
            >
              <Ionicons name="add-circle-outline" size={20} color={COLORS.PRIMARY_BLACK} />
              <Text style={styles.secondaryButtonLabel}>Create a Team</Text>
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
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: getFontSize('2XL'),
    fontWeight: getFontWeight('BOLD'),
    color: COLORS.PRIMARY_BLACK,
  },
  subtitle: {
    marginTop: 12,
    fontSize: getFontSize('SM'),
    color: COLORS.MEDIUM_GRAY,
    lineHeight: 20,
  },
  card: {
    backgroundColor: COLORS.WHITE,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.LIGHT_GRAY,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 32,
  },
  cardTitle: {
    fontSize: getFontSize('MD'),
    fontWeight: getFontWeight('SEMIBOLD'),
    color: COLORS.PRIMARY_BLACK,
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: getFontSize('SM'),
    color: COLORS.MEDIUM_GRAY,
    lineHeight: 20,
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.LIGHT_GRAY,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: getFontSize('MD'),
    color: COLORS.PRIMARY_BLACK,
    marginBottom: 16,
  },
  primaryButton: {
    height: 52,
    borderRadius: 12,
    backgroundColor: COLORS.PRIMARY_BLACK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonLabel: {
    fontSize: getFontSize('MD'),
    fontWeight: getFontWeight('SEMIBOLD'),
    color: COLORS.WHITE,
  },
  separatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.LIGHT_GRAY,
  },
  separatorText: {
    marginHorizontal: 12,
    fontSize: getFontSize('XS'),
    color: COLORS.MEDIUM_GRAY,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.PRIMARY_BLACK,
  },
  secondaryButtonLabel: {
    fontSize: getFontSize('SM'),
    fontWeight: getFontWeight('SEMIBOLD'),
    color: COLORS.PRIMARY_BLACK,
    marginLeft: 8,
  },
});

export default JoinOrCreateTeamScreen;


