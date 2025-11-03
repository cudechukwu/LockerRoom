// Action definitions and configurations for Actions screen

export const ACTION_TYPES = {
  NOTES: 'notes',
  CALENDAR: 'calendar',
  POLLS: 'polls',
  ANNOUNCEMENTS: 'announcements',
  TASKS: 'tasks',
  SETTINGS: 'settings',
};

export const ACTION_CONFIGS = {
  [ACTION_TYPES.NOTES]: {
    id: 'notes',
    title: 'Notes',
    subtitle: 'Personal notes & coach feedback',
    icon: 'document-text-outline',
    color: '#3B82F6',
    coachOrder: 1,
    playerOrder: 1,
  },
  [ACTION_TYPES.CALENDAR]: {
    id: 'calendar',
    title: 'Calendar',
    subtitle: 'Team schedule & personal events',
    icon: 'calendar-outline',
    color: '#10B981',
    coachOrder: 2,
    playerOrder: 2,
  },
  [ACTION_TYPES.POLLS]: {
    id: 'polls',
    title: 'Polls',
    subtitle: 'Team decisions & quick surveys',
    icon: 'bar-chart-outline',
    color: '#F59E0B',
    coachOrder: 3,
    playerOrder: 3,
  },
  [ACTION_TYPES.ANNOUNCEMENTS]: {
    id: 'announcements',
    title: 'Announcements',
    subtitle: 'Team updates & news',
    icon: 'megaphone-outline',
    color: '#EF4444',
    coachOrder: 4,
    playerOrder: 4,
  },
  [ACTION_TYPES.TASKS]: {
    id: 'tasks',
    title: 'Tasks',
    subtitle: 'Assignments & to-dos',
    icon: 'list-outline',
    color: '#8B5CF6',
    coachOrder: 5,
    playerOrder: 5,
  },
  [ACTION_TYPES.SETTINGS]: {
    id: 'settings',
    title: 'Settings',
    subtitle: 'Preferences & profile',
    icon: 'cog-outline',
    color: '#6B7280',
    coachOrder: 6,
    playerOrder: 6,
  },
};

// Get actions ordered by user role
export const getActionsByRole = (userRole) => {
  const actions = Object.values(ACTION_CONFIGS);
  
  if (userRole === 'coach' || userRole === 'admin') {
    // Coaches see "Post First" order
    return actions.sort((a, b) => a.coachOrder - b.coachOrder);
  } else {
    // Players see "Consume First" order
    return actions.sort((a, b) => a.playerOrder - b.playerOrder);
  }
};

// Quick actions (most used, horizontal strip)
export const QUICK_ACTIONS = [
  ACTION_TYPES.NOTES,
  ACTION_TYPES.CALENDAR,
  ACTION_TYPES.POLLS,
];

// Recent activity types
export const RECENT_ACTIVITY_TYPES = {
  NOTE_CREATED: 'note_created',
  POLL_VOTED: 'poll_voted',
  CALENDAR_RSVP: 'calendar_rsvp',
  ANNOUNCEMENT_READ: 'announcement_read',
};
