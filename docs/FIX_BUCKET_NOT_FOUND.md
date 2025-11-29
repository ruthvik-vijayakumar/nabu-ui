# Fix "Bucket not found" Error

## Problem
You're seeing a "Bucket not found" error when trying to display image previews in the saved items panel.

## Solution

### Step 1: Verify Bucket Exists

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **Storage** in the left sidebar
4. Check if a bucket named **`nabu-ai-object-storage`** exists

### Step 2: Create the Bucket (if it doesn't exist)

1. Click **"New bucket"** button
2. Configure:
   - **Name**: `nabu-ai-object-storage` (must match exactly)
   - **Public bucket**: **OFF** (private bucket)
   - Click **"Create bucket"**

### Step 3: Set Up Storage Policies

The bucket needs policies to allow authenticated users to read their files.

1. Click on the `nabu-ai-object-storage` bucket
2. Go to the **"Policies"** tab
3. Create these policies:

**Policy 1: Allow authenticated users to read their own files**
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

**Policy 2: Allow authenticated users to upload to their own folder**
- **Policy name**: `Users can upload to own folder`
- **Allowed operation**: `INSERT`
- **Target roles**: `authenticated`
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

### Step 4: Make Bucket Public (Alternative - for image previews)

If you want image previews to work without authentication, you can make the bucket public:

1. Go to Storage → `nabu-ai-object-storage`
2. Click **"Settings"** tab
3. Toggle **"Public bucket"** to **ON**
4. This allows anyone with the URL to access files (use with caution)

**Note**: Making the bucket public is simpler but less secure. The folder-based policies above are more secure.

### Step 5: Verify

After creating the bucket and policies:

1. Reload the extension
2. Try saving an image or screenshot
3. Check the saved items panel - images should now display

## Troubleshooting

### Still seeing "Bucket not found"?

1. **Check bucket name**: Must be exactly `nabu-ai-object-storage` (case-sensitive)
2. **Check project**: Make sure you're in the correct Supabase project
3. **Check browser console**: Look for detailed error messages
4. **Verify policies**: Make sure all 3 policies are enabled (toggle should be ON)

### Images still not showing?

1. **Check file paths**: Verify that `storage_object_path` in the database matches the actual file path
2. **Check authentication**: Make sure you're logged in
3. **Check browser console**: Look for CORS or authentication errors

## Quick Test

To test if the bucket is accessible:

1. Open browser console
2. Run:
   ```javascript
   // Replace with your actual file path
   const testPath = 'images/YOUR_USER_ID/TIMESTAMP-FILENAME.png'
   const { data } = supabase.storage.from('nabu-ai-object-storage').getPublicUrl(testPath)
   console.log('Public URL:', data.publicUrl)
   ```
3. Try opening the URL in a new tab - if it loads, the bucket is accessible

