# LockerRoom Setup Instructions

## Prerequisites
- Node.js and npm installed
- Expo CLI installed (`npm install -g @expo/cli`)
- Supabase account and project

## 1. Supabase Setup

### Create a new Supabase project
1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Create a new project
3. Note down your project URL and anon key

### Set up the database
1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `database_schema.sql` into the editor
4. Run the SQL script to create all tables, policies, and functions

### Configure storage
1. Go to Storage in your Supabase dashboard
2. Verify that the `team-logos` bucket was created
3. Set the bucket to public (this was done in the SQL script)

## 2. Environment Configuration

### Create environment file
Create a `.env` file in your project root:

```bash
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Agora.io Calling Configuration (optional - for audio/video calls)
EXPO_PUBLIC_AGORA_APP_ID=your_agora_app_id
EXPO_PUBLIC_AGORA_APP_CERTIFICATE=your_agora_app_certificate
```

### Get your Supabase credentials
1. In your Supabase project dashboard, go to Settings > API
2. Copy the Project URL and anon public key
3. Paste them into your `.env` file

### Get your Agora.io credentials (for calling features)
1. Go to [agora.io](https://agora.io) and create a free account
2. Create a new project in the Agora Console
3. **Find your App ID**: 
   - In your project dashboard, you'll see the App ID displayed prominently
   - Example: `e7f6e9aeecf14b2ba10e3f40be9f56e7`
4. **Find your App Certificate**:
   - In your project dashboard, click on **"Config"** or **"Project Management"**
   - Look for **"App Certificate"** section
   - Click **"Show"** or **"Copy"** button to reveal the certificate
   - **Important**: The certificate is only shown once during project creation. If you can't see it, you may need to:
     - Click **"Reset"** to generate a new certificate (only if you haven't used it in production)
     - Or check if you saved it during initial setup
5. Add both to your `.env` file:
   ```bash
   EXPO_PUBLIC_AGORA_APP_ID=e7f6e9aeecf14b2ba10e3f40be9f56e7
   EXPO_PUBLIC_AGORA_APP_CERTIFICATE=your_certificate_here
   ```
6. **Note**: The free tier includes 10,000 minutes/month - perfect for development

## 3. Install Dependencies

```bash
npm install
```

## 4. Run the App

```bash
npm start
```

## 5. Test the Flow

1. **Splash Screen**: App starts with LockerRoom branding
2. **Video Cover Screen**: Shows "Let's Get Started" and "Sign In" buttons
3. **Get Started Flow**:
   - If unauthenticated: Shows Create Account sheet
   - If authenticated: Shows Team Setup Wizard
4. **Team Setup Wizard**: 4-step process to create a team
5. **Success**: User lands on main dashboard

## Database Schema Overview

### Tables Created:
- **teams**: Core team information (name, sport, colors, logo)
- **team_members**: User membership with roles and admin status
- **team_invites**: Email invitations by role
- **team_join_codes**: 7-day expiry join codes for new members

### Key Features:
- **Row Level Security (RLS)**: Users can only access their own team data
- **Role-based permissions**: Admin, Coach, Trainer, Assistant, Player roles
- **Domain restriction**: Optional @wesleyan.edu email restriction
- **Auto-expiring join codes**: 7-day validity with rotation capability
- **File storage**: Team logos stored in Supabase Storage

## Security Features

- **Authentication**: Supabase Auth with email/password
- **Authorization**: RLS policies ensure data isolation
- **Input validation**: Client and server-side validation
- **Secure file uploads**: Storage policies restrict access

## Next Steps

After basic setup, consider implementing:
1. **Email service**: Send actual team invitations
2. **Logo upload**: Complete the file upload functionality
3. **Team dashboard**: Build the main team management interface
4. **Push notifications**: Alert users to team updates
5. **Analytics**: Track team engagement and usage

## Troubleshooting

### Common Issues:

1. **"Invalid API key" error**:
   - Check your `.env` file has correct Supabase credentials
   - Ensure the anon key is copied correctly

2. **"Table doesn't exist" error**:
   - Run the `database_schema.sql` script in Supabase SQL Editor
   - Check that all tables were created successfully

3. **"Permission denied" error**:
   - Verify RLS policies are enabled
   - Check that the user is authenticated

4. **Storage upload fails**:
   - Ensure the `team-logos` bucket exists
   - Check storage policies are set correctly

### Getting Help:
- Check Supabase logs in your project dashboard
- Review the browser console for JavaScript errors
- Verify all environment variables are set correctly
