// Migration script to populate existing users with profile data
// Run with: node migrate_existing_users.js

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// You'll need to replace these with your actual Supabase credentials
const supabaseUrl = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateExistingUsers() {
  console.log('🔄 Migrating existing users to profile system...\n');

  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'database', 'migrate_existing_users.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration SQL loaded from database/migrate_existing_users.sql');
    console.log('🚀 Executing migration...\n');

    // Execute the migration SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      console.error('❌ Error executing migration:', error);
      console.log('\n🔧 Manual Migration Required:');
      console.log('1. Go to your Supabase Dashboard');
      console.log('2. Navigate to SQL Editor');
      console.log('3. Copy and paste the contents of database/migrate_existing_users.sql');
      console.log('4. Execute the SQL');
      return;
    }

    console.log('✅ Migration executed successfully!');

    // Verify the migration
    console.log('\n🔍 Verifying migration results...');

    // Check user profiles
    const { data: userProfiles, error: userError } = await supabase
      .from('user_profiles')
      .select('count')
      .limit(1);
    
    if (userError) {
      console.log('❌ Error checking user_profiles:', userError.message);
    } else {
      console.log('✅ user_profiles table accessible');
    }

    // Check team member profiles
    const { data: teamProfiles, error: teamError } = await supabase
      .from('team_member_profiles')
      .select('count')
      .limit(1);
    
    if (teamError) {
      console.log('❌ Error checking team_member_profiles:', teamError.message);
    } else {
      console.log('✅ team_member_profiles table accessible');
    }

    // Check player stats
    const { data: playerStats, error: statsError } = await supabase
      .from('player_stats')
      .select('count')
      .limit(1);
    
    if (statsError) {
      console.log('❌ Error checking player_stats:', statsError.message);
    } else {
      console.log('✅ player_stats table accessible');
    }

    // Get actual counts
    const { data: userCount } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true });

    const { data: teamCount } = await supabase
      .from('team_member_profiles')
      .select('*', { count: 'exact', head: true });

    const { data: statsCount } = await supabase
      .from('player_stats')
      .select('*', { count: 'exact', head: true });

    console.log('\n📊 Migration Results:');
    console.log(`   User profiles: ${userCount?.length || 0}`);
    console.log(`   Team member profiles: ${teamCount?.length || 0}`);
    console.log(`   Player stats: ${statsCount?.length || 0}`);

    console.log('\n🎉 Migration completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Go to your React Native app');
    console.log('2. Navigate to the Profile tab');
    console.log('3. Your profile should now load properly!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.log('\n🔧 Manual Migration Required:');
    console.log('1. Go to your Supabase Dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the contents of database/migrate_existing_users.sql');
    console.log('4. Execute the SQL');
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  migrateExistingUsers();
}

module.exports = { migrateExistingUsers };
