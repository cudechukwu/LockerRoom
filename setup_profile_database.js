// Database setup script for profile system
// Run with: node setup_profile_database.js

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// You'll need to replace these with your actual Supabase credentials
const supabaseUrl = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupProfileDatabase() {
  console.log('🚀 Setting up Profile Database...\n');

  try {
    // Read the SQL schema file
    const schemaPath = path.join(__dirname, 'database', 'profile_schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

    console.log('📄 SQL Schema loaded from database/profile_schema.sql');
    console.log('📊 Executing SQL schema...\n');

    // Execute the SQL schema
    const { data, error } = await supabase.rpc('exec_sql', { sql: schemaSQL });

    if (error) {
      console.error('❌ Error executing SQL schema:', error);
      console.log('\n🔧 Manual Setup Required:');
      console.log('1. Go to your Supabase Dashboard');
      console.log('2. Navigate to SQL Editor');
      console.log('3. Copy and paste the contents of database/profile_schema.sql');
      console.log('4. Execute the SQL');
      return;
    }

    console.log('✅ SQL schema executed successfully!');

    // Test the tables
    console.log('\n🧪 Testing database tables...');

    const tables = ['user_profiles', 'team_member_profiles', 'player_stats'];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('count')
          .limit(1);
        
        if (error) {
          console.log(`❌ ${table}: ${error.message}`);
        } else {
          console.log(`✅ ${table}: Table exists and accessible`);
        }
      } catch (err) {
        console.log(`❌ ${table}: ${err.message}`);
      }
    }

    // Test storage bucket
    console.log('\n📦 Testing storage bucket...');
    try {
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      
      if (bucketsError) {
        console.log('❌ Storage buckets error:', bucketsError.message);
      } else {
        const avatarsBucket = buckets.find(bucket => bucket.name === 'avatars');
        if (avatarsBucket) {
          console.log('✅ avatars bucket: Exists and accessible');
        } else {
          console.log('❌ avatars bucket: Not found');
        }
      }
    } catch (err) {
      console.log('❌ Storage bucket error:', err.message);
    }

    console.log('\n🎉 Database setup completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Test the profile system in your React Native app');
    console.log('2. Go to Profile tab and click "Test Profile System"');
    console.log('3. Create a test profile to verify everything works');

  } catch (error) {
    console.error('❌ Setup failed:', error);
    console.log('\n🔧 Manual Setup Required:');
    console.log('1. Go to your Supabase Dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the contents of database/profile_schema.sql');
    console.log('4. Execute the SQL');
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  setupProfileDatabase();
}

module.exports = { setupProfileDatabase };
