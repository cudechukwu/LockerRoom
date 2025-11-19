import React from 'react';

export const TeamContext = React.createContext({
  teams: [],
  activeTeamId: null,
  setActiveTeamId: () => {},
  refreshTeams: async () => {},
});


