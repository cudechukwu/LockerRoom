# Remaining Supabase Migration Tasks

## ✅ Fixed (Critical Path)
- ✅ `useHomeData` hook - Updated to use `useSupabase()` and pass to API functions
- ✅ `getTeamInfo` - Now accepts `supabase` as first parameter
- ✅ `getTeamNotificationSummary` - Now accepts `supabase` as first parameter
- ✅ `getUpcomingEvents` - Now accepts `supabase` as first parameter
- ✅ `getUserProfile` - Now accepts `supabase` as first parameter
- ✅ `useProfileData` hook - Updated to use `useSupabase()`

## ⚠️ Still Need to Update

### Hooks
- [ ] `useEventCreator` - Uses `getUserProfile` (needs supabase parameter)

### Screens (Need to use `useSupabase()` hook)
- [ ] `ChannelChatScreen.jsx` - Line 347: `getTeamInfo(teamId)` → `getTeamInfo(supabase, teamId)`
- [ ] `DirectMessageChatScreen.jsx` - Line 155: `getTeamInfo(teamId)` → `getTeamInfo(supabase, teamId)`
- [ ] `ViewProfileScreen.jsx` - Line 79: `getTeamInfo(currentTeamId)` → `getTeamInfo(supabase, currentTeamId)`
- [ ] `ConversationInfoScreen.jsx` - Lines 254, 261: `getTeamInfo(teamId)` → `getTeamInfo(supabase, teamId)`
- [ ] `TeamManagementScreen.jsx` - Line 92: `getTeamInfo(teamMember.team_id)` → `getTeamInfo(supabase, teamMember.team_id)`
- [ ] `ProfileSetupScreen.jsx` - May use `getUserProfile`

### API Files (Still importing static supabase)
These need to be updated to accept `supabase` as first parameter:
- [ ] `src/api/roles.js`
- [ ] `src/api/attendanceGroups.js`
- [ ] `src/api/positionGroups.js`
- [ ] `src/api/teamMembers.js` - `fetchTeamMembers`, `createChannel`, and other functions
- [ ] `src/api/playbooks.js`
- [ ] `src/api/channels.js`
- [ ] `src/api/events.js` - Other functions besides `getUpcomingEvents`
- [ ] `src/api/profiles.js` - Other functions besides `getUserProfile`

## Pattern to Follow

### For React Components/Hooks:
```javascript
import { useSupabase } from '../providers/SupabaseProvider';

function MyComponent() {
  const supabase = useSupabase();
  
  // Use supabase in API calls
  const result = await someApiFunction(supabase, ...otherParams);
}
```

### For API Functions:
```javascript
// OLD:
export async function myFunction(param1, param2) {
  const { data } = await supabase.from('table').select();
}

// NEW:
export async function myFunction(supabaseClient, param1, param2) {
  if (!supabaseClient) {
    throw new Error('Supabase client is required...');
  }
  const supabase = supabaseClient;
  const { data } = await supabase.from('table').select();
}
```

## Priority Order
1. **High Priority**: Screens that are currently breaking (causing errors)
2. **Medium Priority**: Hooks that are used frequently
3. **Low Priority**: API functions that aren't called yet or are rarely used

