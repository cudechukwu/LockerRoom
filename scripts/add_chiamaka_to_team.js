// Script to add chiamaka@uni.minerva.edu to Wesleyan Cardinals team
// Run this with: node scripts/add_chiamaka_to_team.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  console.error('Make sure you have EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addChiamakaToTeam() {
  console.log('Adding chiamaka@uni.minerva.edu to Wesleyan Cardinals team...');
  
  try {
    // First, let's see what teams exist
    const { data: allTeams, error: teamsError } = await supabase
      .from('teams')
      .select('id, name');

    if (teamsError) {
      console.error('Error fetching teams:', teamsError.message);
      return;
    }

    console.log('Available teams:', allTeams);

    // Find the Wesleyan Cardinals team
    const wesleyanTeam = allTeams.find(team => 
      team.name.toLowerCase().includes('wesleyan') || 
      team.name.toLowerCase().includes('cardinals')
    );

    if (!wesleyanTeam) {
      console.error('Wesleyan Cardinals team not found');
      return;
    }

    console.log('✅ Found Wesleyan Cardinals team:', wesleyanTeam.id, wesleyanTeam.name);

    // Try to find the user in auth.users table directly
    const { data: userData, error: userError } = await supabase
      .from('auth.users')
      .select('id')
      .eq('email', 'chiamaka@uni.minerva.edu')
      .single();

    if (userError || !userData) {
      console.log('User not found in auth.users, creating new account...');
      // Create the user account
      const { data: newAuthData, error: newAuthError } = await supabase.auth.admin.createUser({
        email: 'chiamaka@uni.minerva.edu',
        password: 'Cardinals2024!',
        email_confirm: true,
        user_metadata: {
          name: 'Chiamaka',
          role: 'player',
          position: 'Player'
        }
      });

      if (newAuthError) {
        console.error('Error creating user:', newAuthError.message);
        return;
      }

      console.log('✅ Created user account for chiamaka@uni.minerva.edu');
      console.log('User ID:', newAuthData.user.id);
      userData = { id: newAuthData.user.id };
    } else {
      console.log('✅ Found existing user account for chiamaka@uni.minerva.edu');
      console.log('User ID:', userData.id);
    }

    // Check if user is already in the team
    const { data: existingMember, error: existingMemberError } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', wesleyanTeam.id)
      .eq('user_id', userData.id)
      .single();

    if (existingMember) {
      console.log('✅ User is already a member of the Wesleyan Cardinals team');
      console.log('Team member ID:', existingMember.id);
    } else {
      // Add user to team as a player
      const { data: memberData, error: memberError } = await supabase
        .from('team_members')
        .insert({
          team_id: wesleyanTeam.id,
          user_id: userData.id,
          role: 'player',
          position: 'Player'
        })
        .select();

      if (memberError) {
        console.error('Error adding user to team:', memberError.message);
        return;
      }

      console.log('✅ Added chiamaka@uni.minerva.edu to Wesleyan Cardinals team');
      console.log('Team member ID:', memberData[0].id);
    }

    // Add user to all team channels
    const { data: channelsData, error: channelsError } = await supabase
      .from('channels')
      .select('id')
      .eq('team_id', wesleyanTeam.id);

    if (channelsError) {
      console.error('Error fetching channels:', channelsError.message);
      return;
    }

    console.log(`✅ Found ${channelsData.length} channels to add user to`);

    // Add user to each channel (skip if already a member)
    for (const channel of channelsData) {
      const { data: existingChannelMember, error: existingChannelMemberError } = await supabase
        .from('channel_members')
        .select('id')
        .eq('channel_id', channel.id)
        .eq('user_id', userData.id)
        .single();

      if (existingChannelMember) {
        console.log(`✅ User already in channel ${channel.id}`);
      } else {
        const { error: channelMemberError } = await supabase
          .from('channel_members')
          .insert({
            channel_id: channel.id,
            user_id: userData.id,
            role: 'member'
          });

        if (channelMemberError) {
          console.error(`Error adding user to channel ${channel.id}:`, channelMemberError.message);
        } else {
          console.log(`✅ Added user to channel ${channel.id}`);
        }
      }
    }

    console.log('\n🎉 Successfully added chiamaka@uni.minerva.edu to Wesleyan Cardinals!');
    console.log('\nLogin credentials:');
    console.log('- Email: chiamaka@uni.minerva.edu');
    console.log('- Password: Cardinals2024!');
    console.log('\nThe user can now:');
    console.log('- Sign in to the app');
    console.log('- Access all team channels');
    console.log('- Send and receive messages');
    console.log('- See realtime updates');

  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run the script
addChiamakaToTeam().catch(console.error);