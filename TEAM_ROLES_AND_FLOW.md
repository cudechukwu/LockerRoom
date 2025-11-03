# Team Roles and User Flow Specification

## Initial User Flow

### Splash Screen → Role Selection
Two primary buttons:
- **Get Started** → Create a team (becomes Admin automatically)
- **Sign In** → If already invited to a team (via email or join code)

## Admin Flow (Get Started)

### Team Creation
- User becomes Team Admin by default
- Create team: name, logo, sport, school, colors

### Onboarding Others
Admin invites team members with pre-assigned roles:
- **Coach emails** → invited as "Coach"
- **Trainer emails** → invited as "Trainer"  
- **Assistant coach emails** → invited as "Coaching Assistant"
- **Player emails** → invited as "Player"

**Key Point**: Each invite carries the role assignment, eliminating user confusion about their role.

### Role Management
- Admin can edit roles later (e.g., promote Coach → Admin)
- Roles are assigned by Admin on invite, not chosen by users

## Sign In Flow (Player/Coach/etc.)

### Authentication
- Enter email + password OR click link from invite
- If first time: confirm invite (token/code)
- System auto-assigns the role from invite

### Profile Setup
User completes profile:
- Name, picture, position/title (DL Coach, Captain, etc.)
- Notification preferences
- Password creation (first time users)

## Profile Setup Rules

### Role Assignment
- **Roles are assigned by Admin on invite** — not chosen by the user
- System automatically assigns role based on invite type

### Profile Management
- **Profile details** (name, title, jersey number, position, etc.) are editable by the user themselves
- **Admin can override** if needed (e.g., typo or correction)

## User Roles & Permissions

### Admin (Owner)
- Full control of team
- Manage invites, roles, removals, settings, join code
- Can transfer admin role to another member
- Must assign successor before stepping down if last admin

### Coaches
- Post to feed
- Manage film, playbook, calendar
- Approve join requests (if allowed by team settings)
- Can invite other coaches
- Cannot grant admin role

### Coaching Assistants
- Same permissions as coaches
- **Clarify boundaries**: Are they identical to coaches but can't invite other coaches?

### Captains
- Player permissions plus captain-specific features
- **Clarify boundaries**: Could tag posts as "Captain's Note"

### Players
- Consume and post where allowed
- Can join multiple teams (select on login)

### Trainers
- Post updates
- Manage training/rehab notes
- View roster (no edits)
- No admin settings access

### Blocked Users
- Cannot view or rejoin unless unblocked
- Stored with `blocked_at` flag
- **Clarify**: Can only Admin unblock, or also Coaches?

## Role Hierarchy Matrix

| Action              | Admin | Coach | Assistant | Captain | Player | Trainer |
| :------------------ | :---- | :---- | :-------- | :------ | :----- | :------ |
| Invite users        | ✅    | ✅    | ✅        | ❌      | ❌     | ❌      |
| Approve join requests | ✅    | ✅\*  | ✅\*      | ❌      | ❌     | ❌      |
| Transfer admin      | ✅    | ❌    | ❌        | ❌      | ❌     | ❌      |
| Post to feed        | ✅    | ✅    | ✅        | ✅      | ✅     | ✅      |
| Manage settings     | ✅    | ❌    | ❌        | ❌      | ❌     | ❌      |

**Note:** `(* if team settings allow)` applies to the "Approve join requests" permission for Coach and Assistant roles.

## Team Management Rules

### Joining Teams
- **Email Invite**: Auto-approve on acceptance
- **Join Code**: Requires coach/admin approval
- Domain restriction optional (e.g., @wesleyan.edu)
- Users can join multiple teams simultaneously

### Leaving Teams
- Self-leave allowed
- Admin/Coach can kick members
- Block prevents rejoining (same account + email)

### Role Transitions
- Admin can transfer admin role
- Coaches can be promoted to admin
- Last admin must assign successor before leaving

## Invitation System

### Email Invites
- Generate invite token
- Auto-approve on acceptance
- Can be revoked if pending
- Wrong email handling: revoke invite or remove + block
- **Role pre-assignment**: Each invite specifies the role the user will have

### Join Codes
- Enter pending state
- Require coach/admin approval
- Displayed in Approvals tab
- **Settings to consider:**
  - Expiration (e.g., valid for 7 days)
  - Rotation (Admin can regenerate)
  - Limit attempts (to prevent brute force)

## Audit & Logging

**Critical for all key membership actions:**
- Invite, join, kick, block, role change, admin transfer
- Log with `actor_id` for accountability
- Essential for troubleshooting and security

## Edge Cases Handled

- Multiple team memberships per user
- Admin succession planning
- Wrong email invitations
- Domain restrictions
- Blocked user management
- Role hierarchy enforcement
- Role assignment via invite (no user confusion)

## Team Settings

- Domain restrictions
- Auto-approval settings
- Role permissions
- Join code management
