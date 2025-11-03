// Test script for HomeScreen real data integration
// Run with: node test_home_integration.js

const { createClient } = require('@supabase/supabase-js');

// You'll need to replace these with your actual Supabase credentials
const supabaseUrl = process.env.SUPABASE_URL || 'your-supabase-url';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-supabase-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testHomeIntegration() {
  console.log('🧪 Testing HomeScreen Real Data Integration...\n');

  try {
    // Test 1: Get team info
    console.log('1️⃣ Testing getTeamInfo...');
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('id, name, logo_url, primary_color, secondary_color, school')
      .limit(1);

    if (teamsError) {
      console.error('❌ Error fetching teams:', teamsError);
      return;
    }

    if (!teams || teams.length === 0) {
      console.log('⚠️ No teams found in database');
      return;
    }

    const team = teams[0];
    console.log('✅ Team info loaded:', {
      id: team.id,
      name: team.name,
      hasLogo: !!team.logo_url,
      school: team.school
    });

    // Test 2: Get team members
    console.log('\n2️⃣ Testing team members...');
    const { data: teamMembers, error: membersError } = await supabase
      .from('team_members')
      .select('user_id, role')
      .eq('team_id', team.id)
      .limit(5);

    if (membersError) {
      console.error('❌ Error fetching team members:', membersError);
    } else {
      console.log('✅ Team members loaded:', teamMembers?.length || 0, 'members');
    }

    // Test 3: Get channels
    console.log('\n3️⃣ Testing channels...');
    const { data: channels, error: channelsError } = await supabase
      .from('channels')
      .select('id, name, type')
      .eq('team_id', team.id)
      .limit(5);

    if (channelsError) {
      console.error('❌ Error fetching channels:', channelsError);
    } else {
      console.log('✅ Channels loaded:', channels?.length || 0, 'channels');
    }

    // Test 4: Get messages count
    console.log('\n4️⃣ Testing messages...');
    if (channels && channels.length > 0) {
      const channelIds = channels.map(c => c.id);
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('id')
        .in('channel_id', channelIds)
        .limit(10);

      if (messagesError) {
        console.error('❌ Error fetching messages:', messagesError);
      } else {
        console.log('✅ Messages loaded:', messages?.length || 0, 'messages');
      }
    }

    console.log('\n🎉 Integration test completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`- Team: ${team.name} (${team.school || 'No school'})`);
    console.log(`- Members: ${teamMembers?.length || 0}`);
    console.log(`- Channels: ${channels?.length || 0}`);
    console.log(`- Messages: ${messages?.length || 0}`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testHomeIntegration();
