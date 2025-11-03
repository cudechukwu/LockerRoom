-- Add contact_phone column to team_member_profiles table
-- This migration adds phone number support for both players and staff

-- Add the contact_phone column
ALTER TABLE team_member_profiles 
ADD COLUMN contact_phone VARCHAR(20);

-- Add a comment to document the column
COMMENT ON COLUMN team_member_profiles.contact_phone IS 'Contact phone number for both players and staff members';

-- Update existing records with sample phone numbers (optional)
-- You can uncomment this section if you want to populate existing records
/*
UPDATE team_member_profiles 
SET contact_phone = '+1-555-' || LPAD((RANDOM() * 9999)::INTEGER::TEXT, 4, '0')
WHERE contact_phone IS NULL;
*/

-- Show the updated table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'team_member_profiles' 
AND column_name IN ('contact_email', 'contact_phone')
ORDER BY ordinal_position;
