# Phase 1 SQL Fixes - Run This First!

## 🎯 What to Run

**Only run this ONE file in Supabase SQL Editor:**

```
database/fix_rls_final.sql
```

This file:
- ✅ Drops all existing policies first (no conflicts)
- ✅ Recreates all policies properly
- ✅ Adds performance indexes
- ✅ Is **idempotent** (safe to run multiple times)
- ✅ Includes verification queries at the end

## 📋 How to Use

1. Open Supabase Dashboard → SQL Editor
2. Copy the entire contents of `database/fix_rls_final.sql`
3. Paste into SQL Editor
4. Click **Run**
5. Check the results - should see policies and indexes listed

## ✅ Expected Output

You should see:
```
✓ Policies created: 9 policies
✓ Indexes created: 6 indexes
✓ All tables secured
```

## 🚫 Do NOT Run

- ~~`database/fix_message_update_policy.sql`~~ (superseded)
- ~~`database/fix_rls_comprehensive.sql`~~ (superseded)
- ~~`database/optimize_unread_counts.sql`~~ (already applied)

## 🎯 After Running

Your RLS policies will be:
- ✅ Complete (SELECT, INSERT, UPDATE, DELETE where needed)
- ✅ Secure (auth.uid() checks everywhere)
- ✅ Performance optimized (indexes for scale)
- ✅ Production ready

**Then test your app!** 🚀

