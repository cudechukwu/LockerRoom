import React from 'react';

export const AppBootstrapContext = React.createContext({
  refreshBootstrap: async () => {},
  user: null,
  userProfile: null,
  userTeams: [],
});


