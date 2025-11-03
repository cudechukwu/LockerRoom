// Script to create Wesleyan Cardinals user accounts
// This script creates realistic user accounts for testing
// Run this with: node scripts/create_wesleyan_users.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  console.error('Make sure you have EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file');
  process.exit(1);
}

// Use service role key for admin operations, fallback to anon key
const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseKey);

// Wesleyan Cardinals team members with realistic names
const wesleyanMembers = [
  // Coaching Staff
  {
    email: 'coach.leone@wesleyan.edu',
    password: 'Cardinals2024!',
    name: 'Coach Leone',
    role: 'coach',
    position: 'Head Coach',
    user_id: 'e0b53182-d8ca-491e-9a8c-f24db1ebd8df'
  },
  {
    email: 'coach.martinez@wesleyan.edu',
    password: 'Cardinals2024!',
    name: 'Coach Martinez',
    role: 'coach',
    position: 'Offensive Coordinator',
    user_id: '8d99f216-1454-4500-9652-f87922774f5c'
  },
  {
    email: 'coach.williams@wesleyan.edu',
    password: 'Cardinals2024!',
    name: 'Coach Williams',
    role: 'coach',
    position: 'Defensive Coordinator',
    user_id: 'f1a2b3c4-d5e6-f7g8-h9i0-j1k2l3m4n5o6'
  },
  {
    email: 'coach.davis@wesleyan.edu',
    password: 'Cardinals2024!',
    name: 'Coach Davis',
    role: 'coach',
    position: 'Special Teams Coach',
    user_id: 'a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6'
  },

  // Training Staff
  {
    email: 'dr.chen@wesleyan.edu',
    password: 'Cardinals2024!',
    name: 'Dr. Sarah Chen',
    role: 'trainer',
    position: 'Head Athletic Trainer',
    user_id: 'b2c3d4e5-f6g7-h8i9-j0k1-l2m3n4o5p6q7'
  },
  {
    email: 'trainer.johnson@wesleyan.edu',
    password: 'Cardinals2024!',
    name: 'Mike Johnson',
    role: 'trainer',
    position: 'Assistant Trainer',
    user_id: 'c3d4e5f6-g7h8-i9j0-k1l2-m3n4o5p6q7r8'
  },
  {
    email: 'strength.park@wesleyan.edu',
    password: 'Cardinals2024!',
    name: 'Lisa Park',
    role: 'trainer',
    position: 'Strength & Conditioning Coach',
    user_id: 'd4e5f6g7-h8i9-j0k1-l2m3-n4o5p6q7r8s9'
  },

  // Players - Offense
  {
    email: 'marcus.johnson@wesleyan.edu',
    password: 'Cardinals2024!',
    name: 'Marcus Johnson',
    role: 'player',
    position: 'QB',
    user_id: 'e5f6g7h8-i9j0-k1l2-m3n4-o5p6q7r8s9t0'
  },
  {
    email: 'alex.rodriguez@wesleyan.edu',
    password: 'Cardinals2024!',
    name: 'Alex Rodriguez',
    role: 'player',
    position: 'QB',
    user_id: 'f6g7h8i9-j0k1-l2m3-n4o5-p6q7r8s9t0u1'
  },
  {
    email: 'tyler.brown@wesleyan.edu',
    password: 'Cardinals2024!',
    name: 'Tyler Brown',
    role: 'player',
    position: 'RB',
    user_id: 'g7h8i9j0-k1l2-m3n4-o5p6-q7r8s9t0u1v2'
  },
  {
    email: 'jordan.smith@wesleyan.edu',
    password: 'Cardinals2024!',
    name: 'Jordan Smith',
    role: 'player',
    position: 'RB',
    user_id: 'h8i9j0k1-l2m3-n4o5-p6q7-r8s9t0u1v2w3'
  },
  {
    email: 'cameron.wilson@wesleyan.edu',
    password: 'Cardinals2024!',
    name: 'Cameron Wilson',
    role: 'player',
    position: 'RB',
    user_id: 'i9j0k1l2-m3n4-o5p6-q7r8-s9t0u1v2w3x4'
  },
  {
    email: 'ryan.thompson@wesleyan.edu',
    password: 'Cardinals2024!',
    name: 'Ryan Thompson',
    role: 'player',
    position: 'WR',
    user_id: 'j0k1l2m3-n4o5-p6q7-r8s9-t0u1v2w3x4y5'
  },
  {
    email: 'devon.lee@wesleyan.edu',
    password: 'Cardinals2024!',
    name: 'Devon Lee',
    role: 'player',
    position: 'WR',
    user_id: 'k1l2m3n4-o5p6-q7r8-s9t0-u1v2w3x4y5z6'
  },
  {
    email: 'noah.garcia@wesleyan.edu',
    password: 'Cardinals2024!',
    name: 'Noah Garcia',
    role: 'player',
    position: 'WR',
    user_id: 'l2m3n4o5-p6q7-r8s9-t0u1-v2w3x4y5z6a7'
  },
  {
    email: 'ethan.miller@wesleyan.edu',
    password: 'Cardinals2024!',
    name: 'Ethan Miller',
    role: 'player',
    position: 'WR',
    user_id: 'm3n4o5p6-q7r8-s9t0-u1v2-w3x4y5z6a7b8'
  },
  {
    email: 'logan.davis@wesleyan.edu',
    password: 'Cardinals2024!',
    name: 'Logan Davis',
    role: 'player',
    position: 'TE',
    user_id: 'n4o5p6q7-r8s9-t0u1-v2w3-x4y5z6a7b8c9'
  },
  {
    email: 'owen.martinez@wesleyan.edu',
    password: 'Cardinals2024!',
    name: 'Owen Martinez',
    role: 'player',
    position: 'TE',
    user_id: 'o5p6q7r8-s9t0-u1v2-w3x4-y5z6a7b8c9d0'
  },

  // Players - Defense
  {
    email: 'isaac.anderson@wesleyan.edu',
    password: 'Cardinals2024!',
    name: 'Isaac Anderson',
    role: 'player',
    position: 'DL',
    user_id: 'u1v2w3x4-y5z6-a7b8-c9d0-e1f2g3h4i5j6'
  },
  {
    email: 'lucas.taylor@wesleyan.edu',
    password: 'Cardinals2024!',
    name: 'Lucas Taylor',
    role: 'player',
    position: 'DL',
    user_id: 'v2w3x4y5-z6a7-b8c9-d0e1-f2g3h4i5j6k7'
  },
  {
    email: 'mason.thomas@wesleyan.edu',
    password: 'Cardinals2024!',
    name: 'Mason Thomas',
    role: 'player',
    position: 'DL',
    user_id: 'w3x4y5z6-a7b8-c9d0-e1f2-g3h4i5j6k7l8'
  },
  {
    email: 'sebastian.jackson@wesleyan.edu',
    password: 'Cardinals2024!',
    name: 'Sebastian Jackson',
    role: 'player',
    position: 'DL',
    user_id: 'x4y5z6a7-b8c9-d0e1-f2g3-h4i5j6k7l8m9'
  },
  {
    email: 'gabriel.white@wesleyan.edu',
    password: 'Cardinals2024!',
    name: 'Gabriel White',
    role: 'player',
    position: 'LB',
    user_id: 'y5z6a7b8-c9d0-e1f2-g3h4-i5j6k7l8m9n0'
  },
  {
    email: 'julian.harris@wesleyan.edu',
    password: 'Cardinals2024!',
    name: 'Julian Harris',
    role: 'player',
    position: 'LB',
    user_id: 'z6a7b8c9-d0e1-f2g3-h4i5-j6k7l8m9n0o1'
  },
  {
    email: 'anthony.martin@wesleyan.edu',
    password: 'Cardinals2024!',
    name: 'Anthony Martin',
    role: 'player',
    position: 'LB',
    user_id: 'a7b8c9d0-e1f2-g3h4-i5j6-k7l8m9n0o1p2'
  },
  {
    email: 'dylan.thompson@wesleyan.edu',
    password: 'Cardinals2024!',
    name: 'Dylan Thompson',
    role: 'player',
    position: 'LB',
    user_id: 'b8c9d0e1-f2g3-h4i5-j6k7-l8m9n0o1p2q3'
  },
  {
    email: 'wyatt.garcia@wesleyan.edu',
    password: 'Cardinals2024!',
    name: 'Wyatt Garcia',
    role: 'player',
    position: 'DB',
    user_id: 'c9d0e1f2-g3h4-i5j6-k7l8-m9n0o1p2q3r4'
  },
  {
    email: 'hunter.martinez@wesleyan.edu',
    password: 'Cardinals2024!',
    name: 'Hunter Martinez',
    role: 'player',
    position: 'DB',
    user_id: 'd0e1f2g3-h4i5-j6k7-l8m9-n0o1p2q3r4s5'
  },
  {
    email: 'connor.robinson@wesleyan.edu',
    password: 'Cardinals2024!',
    name: 'Connor Robinson',
    role: 'player',
    position: 'DB',
    user_id: 'e1f2g3h4-i5j6-k7l8-m9n0-o1p2q3r4s5t6'
  },
  {
    email: 'caleb.clark@wesleyan.edu',
    password: 'Cardinals2024!',
    name: 'Caleb Clark',
    role: 'player',
    position: 'DB',
    user_id: 'f2g3h4i5-j6k7-l8m9-n0o1-p2q3r4s5t6u7'
  },
  {
    email: 'ryan.rodriguez@wesleyan.edu',
    password: 'Cardinals2024!',
    name: 'Ryan Rodriguez',
    role: 'player',
    position: 'DB',
    user_id: 'g3h4i5j6-k7l8-m9n0-o1p2-q3r4s5t6u7v8'
  },

  // Special Teams
  {
    email: 'nathan.lewis@wesleyan.edu',
    password: 'Cardinals2024!',
    name: 'Nathan Lewis',
    role: 'player',
    position: 'K',
    user_id: 'h4i5j6k7-l8m9-n0o1-p2q3-r4s5t6u7v8w9'
  },
  {
    email: 'zachary.walker@wesleyan.edu',
    password: 'Cardinals2024!',
    name: 'Zachary Walker',
    role: 'player',
    position: 'P',
    user_id: 'i5j6k7l8-m9n0-o1p2-q3r4-s5t6u7v8w9x0'
  },
  {
    email: 'brandon.hall@wesleyan.edu',
    password: 'Cardinals2024!',
    name: 'Brandon Hall',
    role: 'player',
    position: 'LS',
    user_id: 'j6k7l8m9-n0o1-p2q3-r4s5-t6u7v8w9x0y1'
  }
];

async function createUsers() {
  console.log('Creating Wesleyan Cardinals user accounts...');
  
  for (const member of wesleyanMembers) {
    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: member.email,
        password: member.password,
        email_confirm: true,
        user_metadata: {
          name: member.name,
          role: member.role,
          position: member.position
        }
      });

      if (authError) {
        console.error(`Error creating user ${member.name}:`, authError.message);
        continue;
      }

      console.log(`✅ Created user: ${member.name} (${member.role}) - ${member.email}`);
      
      // Note: The user_id in the seed data should match the actual auth user ID
      // You may need to update the seed data with the actual IDs returned from auth
      
    } catch (error) {
      console.error(`Error creating user ${member.name}:`, error.message);
    }
  }
  
  console.log('\n🎉 User creation complete!');
  console.log('\nNext steps:');
  console.log('1. Run the seed data SQL script in your Supabase SQL editor');
  console.log('2. Update the user IDs in the seed data with the actual auth user IDs');
  console.log('3. Test the channel creation modal with these accounts');
  console.log('\nLogin credentials for testing:');
  console.log('- Email: coach.leone@wesleyan.edu');
  console.log('- Password: Cardinals2024!');
  console.log('- Email: marcus.johnson@wesleyan.edu');
  console.log('- Password: Cardinals2024!');
}

// Run the script
createUsers().catch(console.error);