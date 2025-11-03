// Test script for the profile system
// Run this with: node test_profile_system.js

const { createClient } = require('@supabase/supabase-js');

// You'll need to replace these with your actual Supabase credentials
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testProfileSystem() {
  console.log('🧪 Testing Profile System...\n');

  try {
    // Test 1: Check if profile tables exist
    console.log('1. Checking if profile tables exist...');
    
    const { data: userProfiles, error: userProfilesError } = await supabase
      .from('user_profiles')
      .select('count')
      .limit(1);
    
    if (userProfilesError) {
      console.log('❌ user_profiles table not found or not accessible');
      console.log('   Error:', userProfilesError.message);
    } else {
      console.log('✅ user_profiles table exists');
    }

    const { data: teamMemberProfiles, error: teamMemberProfilesError } = await supabase
      .from('team_member_profiles')
      .select('count')
      .limit(1);
    
    if (teamMemberProfilesError) {
      console.log('❌ team_member_profiles table not found or not accessible');
      console.log('   Error:', teamMemberProfilesError.message);
    } else {
      console.log('✅ team_member_profiles table exists');
    }

    const { data: playerStats, error: playerStatsError } = await supabase
      .from('player_stats')
      .select('count')
      .limit(1);
    
    if (playerStatsError) {
      console.log('❌ player_stats table not found or not accessible');
      console.log('   Error:', playerStatsError.message);
    } else {
      console.log('✅ player_stats table exists');
    }

    // Test 2: Check if avatars bucket exists
    console.log('\n2. Checking if avatars storage bucket exists...');
    
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.log('❌ Could not list storage buckets');
      console.log('   Error:', bucketsError.message);
    } else {
      const avatarsBucket = buckets.find(bucket => bucket.name === 'avatars');
      if (avatarsBucket) {
        console.log('✅ avatars bucket exists');
      } else {
        console.log('❌ avatars bucket not found');
        console.log('   Available buckets:', buckets.map(b => b.name));
      }
    }

    // Test 3: Check RLS policies
    console.log('\n3. Checking RLS policies...');
    
    // This would require admin access to check policies
    console.log('ℹ️  RLS policies should be checked in Supabase dashboard');
    console.log('   Make sure policies allow:');
    console.log('   - Users can view all user_profiles');
    console.log('   - Users can edit their own profiles');
    console.log('   - Team members can view profiles in their teams');
    console.log('   - Admins/coaches can edit all team profiles');

    console.log('\n✅ Profile system test completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Run the database migration: database/profile_schema.sql');
    console.log('2. Test the profile components in your React Native app');
    console.log('3. Verify RLS policies in Supabase dashboard');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  testProfileSystem();
}

module.exports = { testProfileSystem };
