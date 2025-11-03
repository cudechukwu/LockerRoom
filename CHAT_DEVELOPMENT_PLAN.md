# Chat System Development Plan

## 🗂 Chat Structure Overview

### Main Chat Categories
- **Main Team Chat** → Default "everyone" space
- **Coach Chat** → Private, invite-only for coaches
- **Trainer Chat** → Private, invite-only for trainers  
- **Position Groups** → Flexible, coach-created groups (renameable)
- **Casual LockerRoom Chat** → Memes, bonding, culture layer

### Examples of Flexible Groups
- "Offense"
- "WR" 
- "Defense—Backline"
- "Recovery Group A"
- "Soccer—Midfield"

## 🎨 Interface Design

### Navigation
- Left-to-right swipe or dropdown menu → shows list of chats (Slack-style)
- Pinned section at top → Announcements (important posts don't get buried)
- Unread indicators → red dot or count on each chat
- Threaded replies → optional, good for film notes or clarifying instructions

### Chat Tab Structure
- **Channels Tab** → Team, Coaches, Trainers, Position Groups
- **Direct Messages (DMs) Tab** → 1:1 or small group private chats

## 🔑 User Experience Features

### For Players
- Move between Team Chat, Position Chat, Trainer Chat without leaving chat screen
- Notifications grouped smartly ("2 new in Trainer Chat, 5 in Team Chat")
- Can create captain-led groups (default private, captain invites peers)

### For Coaches
- Separate "Coach Room" for private coordination
- Ability to broadcast messages → automatically mirrored into Team Feed
- Can DM any player (mentorship, feedback)
- Long-press any message → Promote to Home Feed (coach/trainer only)

### For Trainers
- "Trainer Room" to coordinate with staff
- Can DM or tag players directly for rehab reminders
- Can add users to temporary rehab channels

## ⚙️ Technical Specifications

### Access Control
- **Coach Access**: Coaches only see groups they're explicitly assigned to
- **No Global Override**: No "head coach" override view
- **Captain Groups**: Allowed, default private, coaches not auto-added

### Data Management
- **History Window**: Academic year (Aug 1–May 31) retained
- **Auto-archive**: At year rollover, archive all channels/DMs to read-only
- **Re-open Option**: Coach/admin can re-open select channels for next season

### File Support
- **Allowed Types**: 
  - Images: PNG/JPG/HEIC
  - Video: MP4/MOV
  - Audio: M4A/MP3
  - Docs: PDF, PPT, DOCX, XLSX
  - Links
- **Size Limits**: 100MB per file (config flag); chunked upload for >25MB
- **Media Gallery**: Per-chat "Media & Files" tab with type filters

## 🔔 Notification System

### Mute Options
- Users can mute any channel/DM (8h / 24h / until unmuted)
- One global notification sound (no per-chat variants)

### Push Rules
- **DMs**: Push always (respecting mute)
- **@mentions / @group mentions**: Push
- **Channel chatter w/o mentions**: Badge count only
- **Announcements channel**: Always push (cannot be muted unless user opts out at team level)

## 🔍 Search & Discovery

### Search Features
- **Global search**: People, channels, messages, files with recent queries
- **In-channel search**: Filter by sender, date, has:file, has:link
- **Unread/Mentions view**: Tab showing All Unreads + Mentions

## 🔗 Integration with App

### Home Feed Relationship
- Coach "Announcement" post → auto-creates pinned message in target channel + Feed item
- Feed cards link back to original chat/thread (de-duplication)
- Long-press message → Promote to Home Feed (coach/trainer only)

### Read Receipts
- **DMs**: Per-message read receipts
- **Channels**: Show "Seen by N" for Announcements only (toggle in channel settings)

## 📊 Scale & Performance

### Team Size Optimization
- Designed for 40–120 members per team (football scale)
- 5–20 active channels
- Pagination + lazy loading for long histories
- Virtualized lists for message rendering

## 🏃‍♂️ Seasonal Management

### Off-Season Mode
- Channels persist
- Notifications default to digest (daily) except Announcements & DMs

### Player Lifecycle
- **Graduates**: Move to Alumni role (read-only access to archives for 60 days, then revoke)
- **New players**: Onboard into default groups (Team, Position, LockerRoom)
- **Injuries**: Injury status does not change chat access; trainers may add to temporary rehab channels

## 🎯 Implementation Priorities

### Phase 1: Core Structure
1. Basic chat interface with channels/DMs tabs
2. Main Team Chat, Coach Chat, Trainer Chat
3. Basic messaging and file upload

### Phase 2: Advanced Features
1. Flexible position groups
2. Search functionality
3. Notification system
4. Media gallery

### Phase 3: Integration & Polish
1. Home Feed integration
2. Seasonal management
3. Performance optimization
4. Advanced moderation tools

## ✏️ Message Editing & Moderation

### Editing Rules
- **Edit Window**: 15 minutes after send
- **Edit Label**: Show "Edited" with tooltip/time
- **History**: Keep edit history (viewable by Coaches/Trainers for channels they manage + Admin). Users only see latest text
- **No edits after 15 minutes**: Require new message or thread reply

### Message Deletion
- **Sender**: Can delete own message within 15 minutes → soft delete with "Message deleted by sender"
- **Channel Moderators**: Coaches (for assigned channels) & Trainers (for trainer channels) can delete any message anytime → soft delete with "Removed by moderator"
- **Team Admin**: Can remove any message across team at any time (compliance)
- **Audit Log**: All deletes/edits stored server-side (actor, timestamp, reason) for academic-year retention
- **Attachments**: Deleting message also revokes file URL (don't orphan media)

## 🚨 Emergency Notifications (Priority Alerts)

### Override System
- **Temporarily overrides**: Per-chat mute and sends push notifications to targeted members (subject to OS Focus/Do Not Disturb)
- **Targets**: Whole team, position groups, or custom list
- **Rate Limit**: Max 2 per hour / 6 per day per team to prevent spam
- **Two-step Confirm**: "This will notify all recipients even if muted. Proceed?" + required reason field

### UI & Integration
- **Distinct UI**: Red badge + "⚠️ Priority Alert" banner in app and Home Feed card
- **Auto-pin**: Pins in Announcements channel and links from Home Feed
- **Audit**: Log who sent it, scope, and message body

## 👑 Captain Permissions

### What Captains Can Do
- Create private player groups and invite/remove members (players only)
- Pin messages in groups they own
- Delete messages within groups they created (soft delete; shows "Removed by captain")
- Toggle channel description, emoji reactions, and who can post (open vs. captains-only announcements) for their groups

### What Captains Cannot Do
- See or moderate Coaches/Trainers channels
- Access position groups unless added as a member
- Change roles (can't grant captain/coach)
- Send Priority Alerts

### Visibility & Oversight
- **Captain Badge**: On messages in their groups
- **Admin Override**: Coaches/Admin can revoke captain and override any captain moderation

## ❓ Remaining Questions for Clarification

1. **Analytics**: What metrics should coaches see about chat engagement?
2. **Backup**: How should chat data be backed up/exported?
3. **Mobile Optimization**: Any specific mobile UX considerations beyond responsive design?
