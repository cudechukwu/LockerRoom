# 🎯 Calling Implementation Plan

## Overview
This plan outlines the step-by-step implementation of audio/video calling using Agora.io, following the production-ready architecture from `CALLING_IMPLEMENTATION_GUIDE.md`.

---

## 📋 Implementation Order (Sequential)

### **Phase 1: Foundation (Core Infrastructure)**

#### ✅ Step 1: Install Agora SDK
- **File**: `package.json`
- **Action**: Install `react-native-agora`
- **Command**: `npx expo install react-native-agora`
- **Status**: Ready to start

#### ✅ Step 2: Create Agora Config
- **File**: `src/config/agora.js` (new)
- **Purpose**: Centralize Agora App ID (from Agora.io dashboard)
- **Content**:
  ```javascript
  export const AGORA_APP_ID = process.env.EXPO_PUBLIC_AGORA_APP_ID || '';
  export const AGORA_APP_CERTIFICATE = process.env.EXPO_PUBLIC_AGORA_APP_CERTIFICATE || '';
  ```
- **Note**: Add to `.env` file (not committed to git)

#### ✅ Step 3: Create Calling API Functions
- **File**: `src/api/calling.js` (new)
- **Functions to create**:
  1. `createCallSession(teamId, recipientIds, callType, channelId?)` - Create new call
  2. `joinCall(callSessionId)` - Join existing call
  3. `endCall(callSessionId)` - End call
  4. `rejectCall(callSessionId)` - Reject incoming call
  5. `getAgoraToken(callSessionId)` - Fetch token from Edge Function
  6. `getCallSession(callSessionId)` - Get call session data
  7. `updateCallStatus(callSessionId, status)` - Update call status
  8. `trackCallMetrics(callSessionId, metrics)` - Store quality metrics
- **Pattern**: Follow existing `src/api/chat.js` structure
- **Dependencies**: `supabase` from `src/lib/supabase.js`

#### ✅ Step 4: Create Supabase Edge Function (Token Server)
- **File**: `supabase/functions/agora-token/index.ts` (new)
- **Purpose**: Secure token generation with team validation
- **Security**:
  - Validates team membership
  - Checks call session exists and not ended
  - Generates time-limited tokens (1 hour)
- **Environment Variables** (set in Supabase dashboard):
  - `AGORA_APP_ID`
  - `AGORA_APP_CERTIFICATE`
- **Deploy**: `supabase functions deploy agora-token`

---

### **Phase 2: React Hooks (State Management)**

#### ✅ Step 5: Create `useAgoraEngine` Hook
- **File**: `src/hooks/useAgoraEngine.js` (new)
- **Purpose**: Centralized Agora engine management
- **Features**:
  - Initialize/destroy engine
  - Join/leave channel
  - Toggle mute/video
  - Track remote UIDs
  - Handle quality metrics
- **Returns**: `{ engine, isMuted, videoEnabled, remoteUids, isConnected, join, leave, toggleMute, toggleVideo, initialize }`

#### ✅ Step 6: Create `useCallSession` Hook
- **File**: `src/hooks/useCallSession.js` (new)
- **Purpose**: Manage call state and Supabase Realtime subscriptions
- **Features**:
  - Subscribe to call status changes
  - Track participants via Presence channels
  - Handle incoming call notifications
  - Auto-cleanup on unmount
- **Returns**: `{ callSession, participants, status, subscribe, unsubscribe }`

#### ✅ Step 7: Create `useCallNotifications` Hook
- **File**: `src/hooks/useCallNotifications.js` (new)
- **Purpose**: Handle incoming call notifications
- **Features**:
  - Listen for new call sessions where user is participant
  - Show incoming call UI
  - Handle missed/rejected call notifications
- **Integration**: Works with `useCallSession` for real-time updates

---

### **Phase 3: UI Components (Screens)**

#### ✅ Step 8: Create `IncomingCallScreen`
- **File**: `src/screens/IncomingCallScreen.jsx` (new)
- **Props**: `{ callSession, onAccept, onReject }`
- **UI Elements**:
  - Caller profile photo + name
  - Call type indicator (Audio/Video)
  - Accept button (green)
  - Reject button (red)
  - Ringtone/vibration
- **Navigation**: Modal presentation (full screen overlay)

#### ✅ Step 9: Create `ActiveCallScreen` (1-on-1)
- **File**: `src/screens/ActiveCallScreen.jsx` (new)
- **Props**: `{ callSession, route }`
- **UI Elements**:
  - Remote video view (or profile photo if audio only)
  - Local video preview (small, draggable)
  - Control buttons:
    - Mute/Unmute
    - Video On/Off
    - Speaker/Headset toggle
    - End Call
  - Call duration timer
  - Call quality indicator (optional)
- **Hooks Used**: `useAgoraEngine`, `useCallSession`

#### ✅ Step 10: Create `GroupCallScreen`
- **File**: `src/screens/GroupCallScreen.jsx` (new)
- **Props**: `{ callSession, route }`
- **UI Elements**:
  - Grid layout for multiple video streams
  - Active speaker highlighting
  - Participant list (if >8 participants)
  - Same controls as `ActiveCallScreen`
  - Participant count
- **Layout**: Dynamic grid (2x2, 3x3, etc.) based on participant count

---

### **Phase 4: Integration & Navigation**

#### ✅ Step 11: Add Navigation Routes
- **File**: `App.js`
- **Actions**:
  - Import call screens
  - Add `Stack.Screen` for `IncomingCall`, `ActiveCall`, `GroupCall`
  - Configure modal presentation
  - Handle deep linking (optional)

#### ✅ Step 12: Integrate with ViewProfileScreen
- **File**: `src/screens/ViewProfileScreen.jsx`
- **Actions**:
  - Wire up `handleAudio` to create audio call
  - Wire up `handleVideo` to create video call
  - Navigate to `ActiveCallScreen` after call created
- **Flow**:
  1. User clicks Audio/Video button
  2. Create call session via API
  3. Fetch Agora token
  4. Initialize Agora engine
  5. Navigate to `ActiveCallScreen`

#### ✅ Step 13: Add Realtime Call Notifications
- **File**: `src/hooks/useCallNotifications.js` (already created)
- **Integration Points**:
  - `App.js` - Global listener for incoming calls
  - `ViewProfileScreen` - Listen for call status changes
  - Background handling (future: push notifications)

---

### **Phase 5: Advanced Features (Future)**

#### 🔜 Step 14: Call Metrics Tracking
- **File**: `src/hooks/useAgoraEngine.js` (enhance existing)
- **Features**:
  - Track join latency
  - Monitor packet loss
  - Record bitrate
  - Store in `call_metrics` table
  - Dashboard visualization (future)

#### 🔜 Step 15: Screen Sharing
- **File**: `src/screens/ActiveCallScreen.jsx` (enhance)
- **Features**:
  - Toggle screen share button
  - Use Agora screen sharing API
  - Show screen share indicator

#### 🔜 Step 16: Call Recording
- **File**: `src/api/calling.js` (add function)
- **Features**:
  - Start/stop recording
  - Store recording URL in `call_sessions`
  - Playback UI

---

## 🚀 Quick Start (First Steps)

### 1. Get Agora Account
1. Go to [agora.io](https://agora.io)
2. Sign up for free account
3. Create new project
4. Copy **App ID** and **App Certificate**
5. Add to `.env`:
   ```
   EXPO_PUBLIC_AGORA_APP_ID=your_app_id
   EXPO_PUBLIC_AGORA_APP_CERTIFICATE=your_app_certificate
   ```

### 2. Install Dependencies
```bash
npx expo install react-native-agora
```

### 3. Start with API Functions
Create `src/api/calling.js` first - this is the foundation for everything else.

### 4. Test Database
Verify your schema is working:
```sql
SELECT * FROM call_sessions LIMIT 1;
```

---

## 📁 File Structure (New Files)

```
src/
├── api/
│   └── calling.js                    # NEW: Call API functions
├── config/
│   └── agora.js                      # NEW: Agora configuration
├── hooks/
│   ├── useAgoraEngine.js             # NEW: Agora engine management
│   ├── useCallSession.js             # NEW: Call state management
│   └── useCallNotifications.js       # NEW: Incoming call notifications
├── screens/
│   ├── IncomingCallScreen.jsx        # NEW: Incoming call UI
│   ├── ActiveCallScreen.jsx         # NEW: 1-on-1 call UI
│   └── GroupCallScreen.jsx          # NEW: Group call UI
└── components/
    └── (no new components initially)

supabase/
└── functions/
    └── agora-token/
        └── index.ts                  # NEW: Token server Edge Function
```

---

## 🔄 Data Flow (Call Initiation)

```
User clicks "Audio" in ViewProfileScreen
    ↓
handleAudio() → createCallSession()
    ↓
Supabase: Insert into call_sessions + call_participants
    ↓
Supabase Realtime: Broadcast to recipient
    ↓
Recipient: useCallNotifications detects incoming call
    ↓
Show IncomingCallScreen
    ↓
Recipient accepts → joinCall()
    ↓
Fetch Agora token from Edge Function
    ↓
Initialize Agora engine → join channel
    ↓
Navigate to ActiveCallScreen
    ↓
Both users connected → status = 'connected'
```

---

## ✅ Testing Strategy

### Unit Tests
- API functions (mock Supabase)
- Hooks (React Testing Library)

### Integration Tests
- End-to-end call flow (1-on-1)
- Group call flow
- Call rejection flow

### Manual Testing
1. Test 1-on-1 audio call
2. Test 1-on-1 video call
3. Test group call (3+ participants)
4. Test call rejection
5. Test call ending
6. Test reconnection after network drop

---

## 🎯 Success Criteria

- [ ] 1-on-1 audio calls working
- [ ] 1-on-1 video calls working
- [ ] Group calls working (3+ participants)
- [ ] Incoming call notifications working
- [ ] Call quality metrics being tracked
- [ ] UI matches app design system
- [ ] No memory leaks (proper cleanup)
- [ ] Handles network failures gracefully

---

## 📝 Notes

- **Agora Free Tier**: 10,000 minutes/month - plenty for development
- **Token Security**: Always generate tokens server-side (Edge Function)
- **Realtime**: Use Supabase Presence channels for reliability
- **Performance**: Lazy-load video streams for large groups
- **Error Handling**: Graceful degradation (audio-only if video fails)

---

## 🆘 Common Issues

### Issue: "Agora engine not initializing"
- **Fix**: Check App ID is correct in `.env`
- **Fix**: Ensure permissions are granted (camera/mic)

### Issue: "Token invalid"
- **Fix**: Check Edge Function is deployed
- **Fix**: Verify App Certificate matches Agora dashboard

### Issue: "No audio/video"
- **Fix**: Check device permissions
- **Fix**: Test on physical device (not simulator)

---

**Ready to start?** Begin with **Step 1: Install Agora SDK** and work sequentially through the phases.

