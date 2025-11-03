# Backend Architecture Plan for Chat System

## 🤔 Clarifying Questions

### Database & Infrastructure
1. **Database Choice**: Are you planning to stick with Supabase (PostgreSQL) or open to other options? Supabase has real-time features that could be perfect for chat.

2. **Real-time Requirements**: How critical is real-time messaging? Do you need:
   - Instant message delivery?
   - Typing indicators?
   - Online/offline status?
   - Read receipts in real-time?

3. **File Storage**: For the 100MB file uploads, are you planning to use:
   - Supabase Storage?
   - AWS S3?
   - Another cloud storage solution?

4. **Push Notifications**: Do you need:
   - iOS push notifications?
   - Android push notifications?
   - Web push notifications?
   - Email fallbacks?

### Authentication & Authorization
5. **User Roles**: How are user roles currently managed in your app? Do you have:
   - A roles table?
   - Role-based permissions already implemented?
   - JWT tokens with role claims?

6. **Team Management**: How are teams currently structured in your database?
   - One team per user?
   - Multiple teams per user?
   - How are team memberships managed?

### Performance & Scale
7. **Expected Load**: What's your expected usage?
   - How many concurrent users per team?
   - How many messages per day per team?
   - Peak usage times?

8. **Message History**: For the academic year retention:
   - Should old messages be archived to cold storage?
   - Or kept in the main database with indexing?

### Integration Points
9. **Existing App Integration**: How should the chat system integrate with your current app?
   - Same database/schema?
   - Separate microservice?
   - API endpoints that your React Native app calls?

10. **Home Feed Integration**: How should chat announcements sync with the Home Feed?
    - Same database table?
    - Event-driven architecture?
    - Direct API calls?

## 🏗️ Proposed Architecture Overview

### Core Components
1. **Database Schema** (PostgreSQL/Supabase)
2. **Real-time API** (WebSockets/Server-Sent Events)
3. **File Upload Service**
4. **Push Notification Service**
5. **Search Service**
6. **Audit/Logging Service**

### API Design
- RESTful endpoints for CRUD operations
- WebSocket connections for real-time features
- GraphQL for complex queries (optional)

### Security Considerations
- Row-level security (RLS) for team isolation
- JWT token validation
- File upload security
- Rate limiting
- Input validation

## 📋 Implementation Phases

### Phase 1: Core Database & Basic API
- User roles and permissions
- Team and channel management
- Basic messaging
- File uploads

### Phase 2: Real-time Features
- WebSocket implementation
- Live message delivery
- Typing indicators
- Online status

### Phase 3: Advanced Features
- Search functionality
- Push notifications
- Audit logging
- Performance optimization

### Phase 4: Integration & Polish
- Home Feed integration
- Advanced moderation
- Analytics
- Monitoring

## ✅ Requirements Confirmed

Based on your answers:
- **Database**: Supabase (PostgreSQL)
- **Real-time**: Sub-1s delivery, typing indicators, online presence, read receipts
- **File Storage**: AWS S3 with signed URLs
- **Push Notifications**: Expo Notifications → APNs/FCM
- **Scale**: 40-120 members/team, 2k-5k messages/day, 50-150 concurrent sockets
- **Roles**: Admin, Coach, Trainer, Captain, Player, Alumni

## 🎯 Refined Backend Implementation Plan

### Pre-Phase: Foundation (Start Here)
**0. Auth, RLS, and Seed Setup**
- Authentication & Row-Level Security first
- Seed script (one team, sample channels, test users)
- Every endpoint and realtime sub respects membership from day 1

### Phase 1: Core Database Schema & API

**1. Database Tables:**
- `teams` - Team information
- `team_members` - User-team relationships with roles
- `channels` - Chat channels (team, coach, trainer, position groups, DMs)
- `channel_members` - User-channel access permissions (UNIQUE constraint)
- `messages` - Chat messages with edit history (ULID/Snowflake IDs)
- `message_edits` - Edit history tracking
- `message_tombstones` - Soft delete audit log (renamed from message_deletes)
- `message_attachments` - File attachments with S3 URLs
- `message_reads` - Read receipts for DMs; "Seen by N" on Announcements
- `reactions` - message_id, user_id, emoji, created_at
- `mutes` - user_id, channel_id, until_ts
- `priority_alerts` - id, channel_id/null, sender_id, scope, body, created_at, reason
- `threads` - root_message_id, reply_count, last_activity_at (optional)
- `device_tokens` - Push notification tokens
- `user_presence` - Online status (Redis-backed, TTL 60s)

**2. Critical Indexes:**
- Every "hot" table: `(channel_id, created_at DESC)` for fast pagination
- `messages`: `(team_id, created_at)`, `(channel_id, id)`
- `attachments`: `(message_id)`, `(team_id, created_at)`
- `message_reads`: `(user_id, channel_id, read_at DESC)`
- `channel_members`: `(user_id, channel_id)` UNIQUE

**3. Core API Endpoints:**
- `GET /api/teams/:id/channels` - List accessible channels
- `GET /api/channels/:id/messages` - Get message history (cursor-based pagination)
- `POST /api/channels/:id/messages` - Send message (with Idempotency-Key)
- `PUT /api/messages/:id` - Edit message (15min window)
- `DELETE /api/messages/:id` - Soft delete message
- `POST /api/messages/:id/react` - Add reaction
- `DELETE /api/messages/:id/react` - Remove reaction
- `POST /api/messages/:id/read` - Mark as read
- `POST /api/channels/:id/mute` - Mute channel
- `POST /api/alerts` - Priority alerts
- `GET /api/channels/:id/media` - Media gallery

**4. File Upload System:**
- S3 keys: `teams/<teamId>/channels/<channelId>/<messageId>/<filename>`
- Signed URLs (short TTL)
- Background job for thumbnails/transcoding
- Delete → revoke S3 object + tombstone record

**5. Real-time Setup:**
- Supabase Realtime subscriptions on `messages`, `channel_members`
- Typing/presence via Redis (TTL ~60s)
- Channel topic convention: `team:<teamId>:channel:<channelId>`

**6. Error Handling:**
- Structured 4xx codes: `PERMISSION_DENIED`, `EDIT_WINDOW_EXPIRED`, `MUTE_OVERRIDE_REQUIRED`
- Admin override via SECURITY DEFINER RPC for moderation

**7. Moderation Features:**
- Edit window: 15 min; store `message_edits` and expose "Edited" flag
- Soft delete everywhere; render tombstone text; keep audit trail
- Priority alerts: rate limit (2/hr, 6/day), two-step confirm, auto-pin

### Phase 2: Advanced Features
- Full-text search with materialized view
- Push notification worker
- Performance optimization
- Analytics

### Phase 3: Integration & Polish
- Home Feed integration
- Advanced moderation tools
- Monitoring & alerting

## 🚀 Ready to Start Coding

**Immediate Next Steps:**
1. Database schema with all tables and indexes
2. RLS policies for team isolation
3. Basic message API with cursor pagination
4. S3 file upload system
5. Supabase Realtime setup
6. Seed script for testing

**This approach ensures:**
- Production-ready from day 1
- Proper security and permissions
- Scalable architecture
- Foundation for all advanced features

Ready to start with the database schema?
