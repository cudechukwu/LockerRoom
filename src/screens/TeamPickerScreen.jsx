import React, { useContext, useCallback, useMemo, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TeamContext } from '../contexts/TeamContext';
import { AppBootstrapContext } from '../contexts/AppBootstrapContext';
import { COLORS } from '../constants/colors';
import { getFontSize, getFontWeight } from '../constants/fonts';

const DEFAULT_LOGO = require('../../assets/LockerRoom.png');

const TeamPickerScreen = ({ navigation }) => {
  const { teams, activeTeamId, setActiveTeamId } = useContext(TeamContext);
  const { userProfile } = useContext(AppBootstrapContext);

  useEffect(() => {
    if (Array.isArray(teams) && teams.length === 0 && !activeTeamId) {
      navigation.replace('JoinOrCreateTeam');
    }
  }, [teams, activeTeamId, navigation]);

  const sortedTeams = useMemo(() => {
    if (!teams) return [];
    return [...teams].sort((a, b) => {
      const aDate = a.joined_at ? new Date(a.joined_at).getTime() : 0;
      const bDate = b.joined_at ? new Date(b.joined_at).getTime() : 0;
      return bDate - aDate;
    });
  }, [teams]);

  const handleSelect = useCallback(
    (teamId) => {
      if (!teamId) {
        return;
      }
      if (teamId === activeTeamId) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        });
        return;
      }

      setActiveTeamId(teamId);
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      });
    },
    [activeTeamId, setActiveTeamId, navigation]
  );

  const renderTeamCard = useCallback(
    ({ item }) => {
      const isActive = item.team_id === activeTeamId;
      const roleLabel = item.role ? item.role.charAt(0).toUpperCase() + item.role.slice(1) : 'Member';

      return (
        <TouchableOpacity
          style={[styles.teamCard, isActive && styles.teamCardActive]}
          onPress={() => handleSelect(item.team_id)}
          activeOpacity={0.85}
        >
          <View style={styles.cardLeft}>
            <Image
              source={item.team_logo_url ? { uri: `${item.team_logo_url}?v=${item.joined_at || Date.now()}` } : DEFAULT_LOGO}
              style={styles.teamLogo}
            />
            <View style={styles.teamText}>
              <Text style={styles.teamName} numberOfLines={1}>
                {item.team_name || 'Untitled Team'}
              </Text>
              <Text style={styles.teamMeta}>
                {roleLabel}
                {item.is_admin ? ' • Admin' : ''}
              </Text>
            </View>
          </View>
          <View style={styles.cardRight}>
            {isActive && <Text style={styles.activeBadge}>Active</Text>}
            <Ionicons name="chevron-forward" size={20} color={COLORS.MEDIUM_GRAY} />
          </View>
        </TouchableOpacity>
      );
    },
    [activeTeamId, handleSelect]
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('Main');
            }
          }}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={22} color={COLORS.PRIMARY_BLACK} />
        </TouchableOpacity>
        <Text style={styles.title}>Choose Your Team</Text>
        <Text style={styles.subtitle}>
          {userProfile?.display_name
            ? `${userProfile.display_name}, pick where you want to go.`
            : 'Select a team to enter its locker room.'}
        </Text>
      </View>

      <FlatList
        data={sortedTeams}
        keyExtractor={(item) => item.team_id}
        renderItem={renderTeamCard}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListFooterComponent={
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => navigation.navigate('JoinOrCreateTeam')}
              activeOpacity={0.85}
            >
              <Ionicons name="people-outline" size={18} color={COLORS.PRIMARY_BLACK} />
              <Text style={styles.secondaryButtonLabel}>Join or Create Another Team</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.WHITE,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: 6,
    borderRadius: 999,
    marginBottom: 12,
  },
  title: {
    fontSize: getFontSize('2XL'),
    fontWeight: getFontWeight('BOLD'),
    color: COLORS.PRIMARY_BLACK,
  },
  subtitle: {
    marginTop: 8,
    fontSize: getFontSize('SM'),
    color: COLORS.MEDIUM_GRAY,
    lineHeight: 20,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  teamCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.WHITE,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.LIGHT_GRAY,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  teamCardActive: {
    borderColor: COLORS.PRIMARY_BLACK,
    shadowOpacity: 0.12,
    elevation: 3,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  teamLogo: {
    width: 48,
    height: 48,
    borderRadius: 12,
    marginRight: 16,
    backgroundColor: COLORS.BACKGROUND_MUTED,
  },
  teamText: {
    flex: 1,
  },
  teamName: {
    fontSize: getFontSize('MD'),
    fontWeight: getFontWeight('SEMIBOLD'),
    color: COLORS.PRIMARY_BLACK,
    marginBottom: 4,
  },
  teamMeta: {
    fontSize: getFontSize('SM'),
    color: COLORS.MEDIUM_GRAY,
  },
  cardRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeBadge: {
    fontSize: getFontSize('XS'),
    fontWeight: getFontWeight('SEMIBOLD'),
    color: COLORS.PRIMARY_BLACK,
    backgroundColor: COLORS.LIGHT_GRAY,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    marginRight: 8,
  },
  separator: {
    height: 16,
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
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

export default TeamPickerScreen;


