# Supabase Provider Migration Plan

## Problem
We have TWO Supabase clients:
1. Static client in `src/lib/supabase.js` (created at module load - BAD)
2. Provider client in `SupabaseProvider` (created after session hydration - GOOD)

This causes `auth.uid() = NULL` in RLS because some requests use the unhydrated client.

## Solution: ONE Client, ONE Source of Truth

### Phase 1: Critical Path (Attendance) ✅ DONE
- ✅ Created SupabaseProvider
- ✅ Updated attendance functions to accept supabase parameter
- ✅ Updated attendance call sites to use useSupabase() hook

### Phase 2: App.js (In Progress)
App.js wraps SupabaseProvider but also uses supabase directly. Need to:
- Create AppContent component that uses useSupabase() hook
- Move all supabase-dependent logic to AppContent
- App.js just wraps provider and renders AppContent

### Phase 3: All Other Files (43 files need updating)
For each file:
- If it's a React component/hook: Use `useSupabase()` hook
- If it's an API function: Accept `supabase` as first parameter
- Update all call sites

## Quick Fix for Now

For App.js specifically, we can:
1. Create AppContent that uses useSupabase()
2. Move all logic to AppContent
3. App.js just renders: `<SupabaseProvider><AppContent /></SupabaseProvider>`

But this is a 1000+ line refactor. 

## Alternative: Temporary Workaround

For App.js, we can create a helper that gets the client from context after provider mounts, but this is not ideal.

## Recommended Approach

1. **Immediate**: Fix App.js by creating AppContent component
2. **Next**: Systematically update all 43 files to use provider pattern
3. **Final**: Remove static supabase export entirely

