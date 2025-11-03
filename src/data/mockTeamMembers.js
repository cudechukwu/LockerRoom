// Wesleyan Cardinals team members data
export const mockTeamMembers = [
  // Coaching Staff
  {
    id: '1',
    name: 'Coach Leone',
    handle: '@coach_leone',
    role: 'coach',
    position: 'Head Coach',
    avatarUrl: null,
    isActive: true,
  },
  {
    id: '2',
    name: 'Coach Martinez',
    handle: '@coach_martinez',
    role: 'coach',
    position: 'Offensive Coordinator',
    avatarUrl: null,
    isActive: true,
  },
  {
    id: '3',
    name: 'Coach Williams',
    handle: '@coach_williams',
    role: 'coach',
    position: 'Defensive Coordinator',
    avatarUrl: null,
    isActive: true,
  },
  {
    id: '4',
    name: 'Coach Davis',
    handle: '@coach_davis',
    role: 'coach',
    position: 'Special Teams Coach',
    avatarUrl: null,
    isActive: true,
  },

  // Training Staff
  {
    id: '5',
    name: 'Dr. Sarah Chen',
    handle: '@dr_chen',
    role: 'trainer',
    position: 'Head Athletic Trainer',
    avatarUrl: null,
    isActive: true,
  },
  {
    id: '6',
    name: 'Mike Johnson',
    handle: '@mike_johnson',
    role: 'trainer',
    position: 'Assistant Trainer',
    avatarUrl: null,
    isActive: true,
  },
  {
    id: '7',
    name: 'Lisa Park',
    handle: '@lisa_park',
    role: 'trainer',
    position: 'Strength & Conditioning Coach',
    avatarUrl: null,
    isActive: true,
  },

  // Players - Offense
  {
    id: '8',
    name: 'Marcus Johnson',
    handle: '@marcus_j',
    role: 'player',
    position: 'QB',
    avatarUrl: null,
    isActive: true,
  },
  {
    id: '9',
    name: 'Alex Rodriguez',
    handle: '@alex_rod',
    role: 'player',
    position: 'QB',
    avatarUrl: null,
    isActive: false,
  },
  {
    id: '10',
    name: 'Tyler Brown',
    handle: '@tyler_brown',
    role: 'player',
    position: 'RB',
    avatarUrl: null,
    isActive: true,
  },
  {
    id: '11',
    name: 'Jordan Smith',
    handle: '@jordan_smith',
    role: 'player',
    position: 'RB',
    avatarUrl: null,
    isActive: true,
  },
  {
    id: '12',
    name: 'Ryan Thompson',
    handle: '@ryan_thompson',
    role: 'player',
    position: 'WR',
    avatarUrl: null,
    isActive: true,
  },
  {
    id: '13',
    name: 'Devon Lee',
    handle: '@devon_lee',
    role: 'player',
    position: 'WR',
    avatarUrl: null,
    isActive: true,
  },
  {
    id: '14',
    name: 'Noah Garcia',
    handle: '@noah_garcia',
    role: 'player',
    position: 'WR',
    avatarUrl: null,
    isActive: false,
  },
  {
    id: '15',
    name: 'Logan Davis',
    handle: '@logan_davis',
    role: 'player',
    position: 'TE',
    avatarUrl: null,
    isActive: true,
  },

  // Players - Defense
  {
    id: '16',
    name: 'Isaac Anderson',
    handle: '@isaac_anderson',
    role: 'player',
    position: 'DL',
    avatarUrl: null,
    isActive: true,
  },
  {
    id: '17',
    name: 'Lucas Taylor',
    handle: '@lucas_taylor',
    role: 'player',
    position: 'DL',
    avatarUrl: null,
    isActive: true,
  },
  {
    id: '18',
    name: 'Gabriel White',
    handle: '@gabriel_white',
    role: 'player',
    position: 'LB',
    avatarUrl: null,
    isActive: true,
  },
  {
    id: '19',
    name: 'Julian Harris',
    handle: '@julian_harris',
    role: 'player',
    position: 'LB',
    avatarUrl: null,
    isActive: false,
  },
  {
    id: '20',
    name: 'Wyatt Garcia',
    handle: '@wyatt_garcia',
    role: 'player',
    position: 'DB',
    avatarUrl: null,
    isActive: true,
  },
  {
    id: '21',
    name: 'Hunter Martinez',
    handle: '@hunter_martinez',
    role: 'player',
    position: 'DB',
    avatarUrl: null,
    isActive: true,
  },

  // Special Teams
  {
    id: '22',
    name: 'Nathan Lewis',
    handle: '@nathan_lewis',
    role: 'player',
    position: 'K',
    avatarUrl: null,
    isActive: true,
  },
  {
    id: '23',
    name: 'Zachary Walker',
    handle: '@zachary_walker',
    role: 'player',
    position: 'P',
    avatarUrl: null,
    isActive: true,
  },
  {
    id: '24',
    name: 'Brandon Hall',
    handle: '@brandon_hall',
    role: 'player',
    position: 'LS',
    avatarUrl: null,
    isActive: false,
  },
];

// Mock API function to simulate fetching team members
export const fetchTeamMembers = async (teamId, query = '') => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  let filteredMembers = mockTeamMembers;
  
  if (query) {
    const searchTerm = query.toLowerCase();
    filteredMembers = mockTeamMembers.filter(member => 
      member.name.toLowerCase().includes(searchTerm) ||
      member.handle.toLowerCase().includes(searchTerm) ||
      member.role.toLowerCase().includes(searchTerm)
    );
  }
  
  return filteredMembers;
};

// Mock function to create a channel
export const createChannel = async (teamId, channelData) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const newChannel = {
    id: `channel_${Date.now()}`,
    name: channelData.name,
    description: channelData.description || '',
    type: channelData.type, // 'channel' or 'group'
    members: channelData.members,
    createdAt: new Date().toISOString(),
    isPrivate: channelData.type === 'group',
  };
  
  return newChannel;
};

// Mock function to create a group
export const createGroup = async (teamId, groupData) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const newGroup = {
    id: `group_${Date.now()}`,
    name: groupData.name || generateGroupName(groupData.members),
    type: 'group',
    members: groupData.members,
    createdAt: new Date().toISOString(),
    isPrivate: true,
  };
  
  return newGroup;
};

// Helper function to generate group name from members
const generateGroupName = (members) => {
  if (members.length <= 2) {
    return members.map(m => m.name).join(', ');
  } else {
    const firstTwo = members.slice(0, 2).map(m => m.name).join(', ');
    return `${firstTwo}, +${members.length - 2}`;
  }
};