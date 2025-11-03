const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = 'https://your-project.supabase.co'; // Replace with your actual URL
const supabaseKey = 'your-anon-key'; // Replace with your actual key
const supabase = createClient(supabaseUrl, supabaseKey);

async function restoreProfile() {
  try {
    console.log('🔍 Checking your profile data...');
    
    // Get your user ID (you'll need to replace this with your actual user ID)
    const userId = 'your-user-id'; // Replace with your actual user ID
    
    // Check if you have a profile
    const { data: userProfile, error: userError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (userError) {
      console.error('Error fetching user profile:', userError);
      return;
    }
    
    console.log('👤 User Profile:', {
      displayName: userProfile?.display_name,
      bio: userProfile?.bio,
      avatarUrl: userProfile?.avatar_url
    });
    
    // Check your team member profile
    const { data: teamProfile, error: teamError } = await supabase
      .from('team_member_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (teamError) {
      console.error('Error fetching team profile:', teamError);
      return;
    }
    
    console.log('🏈 Team Profile:', {
      staffTitle: teamProfile?.staff_title,
      department: teamProfile?.department,
      isComplete: teamProfile?.is_complete
    });
    
    // Check your team membership
    const { data: teamMember, error: memberError } = await supabase
      .from('team_members')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (memberError) {
      console.error('Error fetching team membership:', memberError);
      return;
    }
    
    console.log('👥 Team Membership:', {
      role: teamMember?.role,
      isAdmin: teamMember?.is_admin,
      teamId: teamMember?.team_id
    });
    
    // If your staff_title is "Staff" instead of "Defensive Coordinator", let's fix it
    if (teamProfile?.staff_title === 'Staff') {
      console.log('🔧 Fixing your staff title...');
      
      const { error: updateError } = await supabase
        .from('team_member_profiles')
        .update({ 
          staff_title: 'Defensive Coordinator',
          department: 'Football'
        })
        .eq('user_id', userId);
      
      if (updateError) {
        console.error('Error updating staff title:', updateError);
      } else {
        console.log('✅ Staff title updated to "Defensive Coordinator"');
      }
    }
    
    // If your display name is generic, let's fix it
    if (!userProfile?.display_name || userProfile.display_name === 'User') {
      console.log('🔧 Fixing your display name...');
      
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ 
          display_name: 'Quentin Jones'
        })
        .eq('user_id', userId);
      
      if (updateError) {
        console.error('Error updating display name:', updateError);
      } else {
        console.log('✅ Display name updated to "Quentin Jones"');
      }
    }
    
    console.log('✅ Profile check complete!');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the restore function
restoreProfile();
