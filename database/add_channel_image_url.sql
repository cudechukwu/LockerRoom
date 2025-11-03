-- Add image_url column to channels table if it doesn't exist
ALTER TABLE channels ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add visibility column if needed
ALTER TABLE channels ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) DEFAULT 'discoverable';


