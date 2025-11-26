# Team Member Roles Management - Status & Plan

## 📋 Current State

### ✅ **What Exists:**
1. **Database Schema** - `team_member_roles` table with granular roles
2. **API Functions** - `assignRole()`, `updateRolePermissions()`, `removeRole()`
3. **Permission System** - Checks both `team_member_roles` and `team_members` tables
4. **Fallback Logic** - Maps `team_members.role = 'coach'` → `assistant_coach`

### ❌ **What's Missing:**
1. **UI for Role Assignment** - No screen/modal to assign granular roles
2. **Role Management Screen** - No dedicated place to manage team member roles
3. **Visual Role Indicators** - No clear way to see who has what role

---

## 🔐 **Who Can Assign Roles?**

**Only these roles can assign/change roles:**
- `head_coach` 
- `team_admin`

**Enforced by:** `canManageRoles()` function in `src/api/roles.js`

---

## 🎯 **Available Roles**

| Role | Description | Default Permissions |
|------|-------------|---------------------|
| `head_coach` | Head coach (full permissions) | All permissions enabled |
| `assistant_coach` | Assistant coach | Most permissions enabled |
| `position_coach` | Position-specific coach (e.g., "DL Coach") | Limited to their position group |
| `team_admin` | Team administrator | All permissions enabled |
| `student_manager` | Student manager | Limited permissions |
| `athletic_trainer` | Athletic trainer | Limited permissions |
| `player` | Player | No admin permissions |

---

## 🔄 **Current Flow**

### **Basic Roles (team_members table):**
- Set when user joins team
- Simple: `coach`, `player`, `trainer`, `admin`
- Used for basic team membership

### **Granular Roles (team_member_roles table):**
- **Currently:** Must be assigned manually via API or SQL
- **Future:** Should be assignable via UI by head coach/admin
- Provides fine-grained permissions for attendance system

### **Fallback Logic:**
- If user has `role: 'coach'` in `team_members` → treated as `assistant_coach`
- If user has `is_admin: true` in `team_members` → treated as `team_admin`
- If no entry in `team_member_roles` → defaults to `player`

---

## 💡 **Proposed Solution: Role Management UI**

### **Option 1: Add to Team Management Screen**
- Add "Team Roles" section to existing `TeamManagementScreen`
- List all team members with their current roles
- Allow head coach/admin to change roles

### **Option 2: New Role Management Screen**
- Create dedicated `RoleManagementScreen`
- Accessible from Actions or Team Management
- Full role assignment interface

### **Option 3: Add to Member Profile/View**
- When viewing a member profile, show "Assign Role" button (if admin)
- Quick role assignment modal

---

## 🎨 **Proposed UI Design**

### **Role Management Screen:**
```
┌─────────────────────────────────┐
│ Team Roles Management           │
├─────────────────────────────────┤
│ Search members...               │
│                                 │
│ 👤 John Smith                   │
│    Current: Assistant Coach     │
│    [Change Role ▼]              │
│                                 │
│ 👤 Mike Johnson                 │
│    Current: Player              │
│    [Change Role ▼]              │
│                                 │
│ 👤 Sarah Williams               │
│    Current: Head Coach          │
│    [Change Role ▼]              │
└─────────────────────────────────┘
```

### **Role Assignment Modal:**
```
┌─────────────────────────────────┐
│ Assign Role to John Smith       │
├─────────────────────────────────┤
│ Select Role:                    │
│ ○ Head Coach                    │
│ ● Assistant Coach               │
│ ○ Position Coach                │
│   Position: [DL ▼]              │
│ ○ Team Admin                    │
│ ○ Student Manager               │
│ ○ Athletic Trainer              │
│ ○ Player                        │
│                                 │
│ Permissions:                    │
│ ☑ View Attendance               │
│ ☑ Edit Attendance               │
│ ☐ Lock Check-ins                │
│ ☑ View Analytics                │
│                                 │
│ [Cancel]  [Save]                │
└─────────────────────────────────┘
```

---

## 📝 **Implementation Plan**

### **Phase 1: Basic Role Assignment (1-2 hours)**
1. Create `RoleAssignmentModal` component
2. Add "Assign Role" button to member profile/view
3. Simple dropdown to select role
4. Call `assignRole()` API

### **Phase 2: Role Management Screen (2-3 hours)**
1. Create `RoleManagementScreen`
2. List all team members with current roles
3. Search/filter functionality
4. Bulk role assignment

### **Phase 3: Permission Management (2-3 hours)**
1. Add permission toggles to role assignment modal
2. Show current permissions
3. Allow custom permission overrides

---

## 🔧 **Quick Fix: Manual Assignment**

**For now, you can assign roles manually via SQL:**

```sql
-- Make a user head coach
INSERT INTO team_member_roles (team_id, user_id, role)
VALUES ('your-team-id', 'user-id', 'head_coach')
ON CONFLICT (team_id, user_id) 
DO UPDATE SET role = 'head_coach';

-- Make a user assistant coach
INSERT INTO team_member_roles (team_id, user_id, role)
VALUES ('your-team-id', 'user-id', 'assistant_coach')
ON CONFLICT (team_id, user_id) 
DO UPDATE SET role = 'assistant_coach';
```

---

## ✅ **Next Steps**

1. **Decide on UI approach** (Option 1, 2, or 3)
2. **Create role assignment modal**
3. **Add to appropriate screen**
4. **Test role assignment flow**

---

**Status:** API ready, UI needed
**Priority:** Medium (nice to have, but not blocking)
**Estimated Time:** 4-8 hours for full implementation

