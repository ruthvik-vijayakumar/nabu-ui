# Supabase Storage Setup Guide

## Setting Up Image Storage for NabuAI

This guide will walk you through setting up Supabase Storage to store uploaded images.

### Step 1: Create the Storage Bucket

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **"New bucket"**
4. Configure the bucket:
   - **Name**: `nabu-ai-object-storage`
   - **Public bucket**: **OFF** (make it private)
   - Click **"Create bucket"**

### Step 2: Set Up Storage Policies

Storage policies must be set up through the Supabase Dashboard. You cannot modify `storage.objects` directly via SQL.

#### Option A: Using Supabase Dashboard (Recommended)

1. In the Storage section, click on the `nabu-ai-object-storage` bucket
2. Go to the **"Policies"** tab
3. Click **"New policy"**

**Policy 1: Allow authenticated users to upload to their own folder**

- **Policy name**: `Users can upload to own folder`
- **Allowed operation**: `INSERT`
- **Target roles**: `authenticated`
- **USING expression**: (leave empty or use `true`)
- **WITH CHECK expression**: 
  ```sql
  bucket_id = 'nabu-ai-object-storage' 
  AND (
    name LIKE 'images/' || auth.uid()::text || '/%'
    OR 
    name LIKE 'screenshots/' || auth.uid()::text || '/%'
    OR 
    name LIKE 'videos/' || auth.uid()::text || '/%'
    OR 
    name LIKE 'pdfs/' || auth.uid()::text || '/%'
  )
  ```

**Policy 2: Allow authenticated users to read their own files**

- **Policy name**: `Users can read own files`
- **Allowed operation**: `SELECT`
- **Target roles**: `authenticated`
- **USING expression**: 
  ```sql
  bucket_id = 'nabu-ai-object-storage' 
  AND (
    name LIKE 'images/' || auth.uid()::text || '/%'
    OR 
    name LIKE 'screenshots/' || auth.uid()::text || '/%'
    OR 
    name LIKE 'videos/' || auth.uid()::text || '/%'
    OR 
    name LIKE 'pdfs/' || auth.uid()::text || '/%'
  )
  ```
- **WITH CHECK expression**: (leave empty)

**Policy 3: Allow authenticated users to delete their own files**

- **Policy name**: `Users can delete own files`
- **Allowed operation**: `DELETE`
- **Target roles**: `authenticated`
- **USING expression**: 
  ```sql
  bucket_id = 'nabu-ai-object-storage' 
  AND (
    name LIKE 'images/' || auth.uid()::text || '/%'
    OR 
    name LIKE 'screenshots/' || auth.uid()::text || '/%'
    OR 
    name LIKE 'videos/' || auth.uid()::text || '/%'
    OR 
    name LIKE 'pdfs/' || auth.uid()::text || '/%'
  )
  ```
- **WITH CHECK expression**: (leave empty)

#### Option B: Simpler Policy (Less Secure, Easier to Set Up)

If the folder-based policies don't work or you want a simpler setup for testing:

1. In the Storage section, click on the `nabu-ai-object-storage` bucket
2. Go to the **"Policies"** tab
3. Click **"New policy"**
4. Create a single policy:

- **Policy name**: `Authenticated users can manage files`
- **Allowed operation**: `ALL`
- **Target roles**: `authenticated`
- **USING expression**: 
  ```sql
  bucket_id = 'nabu-ai-object-storage'
  ```
- **WITH CHECK expression**: 
  ```sql
  bucket_id = 'nabu-ai-object-storage'
  ```

This allows any authenticated user to upload, read, and delete files in the bucket. It's less secure but easier to set up for testing.

### Step 3: Verify the Setup

1. Test uploading an image through the extension
2. Check the Storage bucket - you should see files appearing in `images/{user_id}/` or `screenshots/{user_id}/` folders
3. Check that the document entity in the database has the `storage_object_path` and `media_url` fields populated

### Troubleshooting

#### Error: "new row violates row-level security policy"

This means the storage policies aren't set up correctly. Check:

1. **Is the bucket created?**
   - Go to Storage → Buckets
   - Verify `nabu-ai-object-storage` exists

2. **Are the policies created and enabled?**
   - Go to Storage → `nabu-ai-object-storage` → Policies tab
   - Verify all 3 policies exist (INSERT, SELECT, DELETE)
   - Make sure they're **enabled** (toggle should be ON)
   - Check that the WITH CHECK expression includes all prefixes: `images/`, `screenshots/`, `videos/`

3. **Is the user authenticated when trying to upload?**
   - Check browser console for authentication errors
   - Verify the user is logged in
   - Check that `auth.uid()` matches the user ID in the file path

4. **Quick Fix - Use Simpler Policy (Option B)**
   - If folder-based policies aren't working, use the simpler "ALL" policy from Option B
   - This allows any authenticated user to manage files (less secure but works for testing)

#### Error: "must be owner of table objects"

This happens if you try to modify `storage.objects` via SQL. Storage policies must be set up through the Supabase Dashboard, not SQL migrations.

#### Files not appearing

Check:
- The bucket name matches exactly: `nabu-ai-object-storage`
- The user is authenticated
- The file path matches the policy patterns

### File Path Structure

Files are stored with this structure:
```
nabu-ai-object-storage/
  ├── images/
  │   └── {user_id}/
  │       └── {timestamp}-{random}.{ext}
  └── screenshots/
      └── {user_id}/
          └── {timestamp}-{random}.{ext}
```

The `user_id` ensures users can only access their own files when using the folder-based policies.
