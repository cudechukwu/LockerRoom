# Channel Image Setup Guide

## 1. Database Setup

Run the SQL script to add image support to your database:

```sql
-- Run this in your Supabase SQL editor
\i database/add_channel_images.sql
```

## 2. Default Images Setup

Upload these default images to your Supabase Storage bucket `channel-images`:

### File Structure:
```
channel-images/
├── defaults/
│   ├── channel.png    # For team-wide channels (discoverable)
│   └── group.png      # For player groups (hidden)
```

### Upload Instructions:
1. Go to Supabase Dashboard → Storage
2. Create bucket `channel-images` (if not exists)
3. Create folder `defaults/`
4. Upload your default images:
   - `defaults/channel.png` - For team channels
   - `defaults/group.png` - For player groups

## 3. Features Implemented

### ✅ Image Upload & Storage
- **Format Support**: PNG, JPEG, WEBP
- **Thumbnail Generation**: 256x256 WEBP for performance
- **Storage**: Supabase Storage with public access
- **Fallback**: Default images when no custom image selected

### ✅ Visibility System
- **Channels**: `visibility = 'discoverable'` (visible to all team members)
- **Groups**: `visibility = 'hidden'` (only visible to members)

### ✅ Database Schema
- Added `image_url` field to channels table
- Added `visibility` field to channels table
- Created storage bucket with proper policies
- Added indexes for performance

## 4. Usage

### Creating Channels/Groups:
1. User selects members
2. User enters name and selects image (optional)
3. System uploads image and creates channel/group
4. Image URL stored in database
5. Default image used if none selected

### Image Processing:
- **Input**: Any PNG/JPEG/WEBP image
- **Output**: 256x256 WEBP thumbnail
- **Storage**: Organized by channel ID
- **Access**: Public URLs for fast loading

## 5. Next Steps

To complete the implementation, you'll need to:

1. **Run the database migration** (add_channel_images.sql)
2. **Upload default images** to storage bucket
3. **Update channel list UI** to show images
4. **Implement discoverable channel browsing**
5. **Add join/request access functionality**

## 6. API Changes

The `createChannel` and `createGroup` functions now accept:
- `image`: Image object from ImagePicker
- `visibility`: Automatically set based on type

Example:
```javascript
await createChannel(teamId, {
  name: 'Training Room',
  members: selectedMembers,
  image: selectedImage, // Optional
  created_by: user.id
});
```
