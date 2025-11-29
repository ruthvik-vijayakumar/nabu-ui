# Debug PDF Upload Issues

## Problem
PDFs are not being uploaded to Supabase Object Storage.

## Debugging Steps

### 1. Check Browser Console
Open the background service worker console:
1. Go to `chrome://extensions/`
2. Find your extension
3. Click "service worker" or "background page"
4. Look for these log messages when saving a PDF:
   - `📦 Upload check:` - Shows if PDF is detected
   - `👤 User check:` - Shows if user is authenticated
   - `📄 PDF upload attempt:` - Shows which URL is being used
   - `📄 Uploading PDF to Supabase Storage:` - Confirms upload started
   - `✅ PDF uploaded to storage:` - Success message
   - `❌ Failed to upload PDF:` - Error message

### 2. Verify Storage Policies
Make sure your Supabase Storage policies include the `pdfs/` folder:

Go to **Supabase Dashboard → Storage → `nabu-ai-object-storage` → Policies**

**Policy 1: INSERT (Upload)**
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

**Policy 2: SELECT (Read)**
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

**Policy 3: DELETE**
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

### 3. Common Issues

#### Issue: "PDF detected but no valid PDF URL found"
**Cause**: The PDF URL is not being passed correctly from the PDF viewer.

**Solution**: Check that `pdfUrl` is being sent in the save message. The code now tries:
1. `data.pdfUrl` (primary)
2. `data.url` if it ends with `.pdf` (fallback)
3. `data.content` if it's a URL containing `.pdf` (fallback)

#### Issue: "Storage policy violation"
**Cause**: RLS policies don't include `pdfs/` folder.

**Solution**: Update all three policies (INSERT, SELECT, DELETE) to include:
```sql
OR name LIKE 'pdfs/' || auth.uid()::text || '/%'
```

#### Issue: "User not authenticated"
**Cause**: Session expired or not set.

**Solution**: 
1. Check if you're logged in
2. Reload the extension
3. Try logging out and back in

#### Issue: "Failed to fetch media"
**Cause**: CORS or network error when downloading PDF.

**Solution**: 
- Check if the PDF URL is accessible
- Some PDFs may require authentication
- Check network tab for failed requests

### 4. Test Upload Manually

You can test if the upload function works by running this in the browser console (on a page with the extension loaded):

```javascript
// Get the PDF URL
const pdfUrl = 'https://example.com/document.pdf'

// Call the upload function (you'll need to import it or access it via the extension)
// This is just for testing - the actual upload happens in the background script
```

### 5. Check Storage Bucket

After attempting to save a PDF:
1. Go to **Supabase Dashboard → Storage → `nabu-ai-object-storage`**
2. Check if a `pdfs/` folder exists
3. Check if files are appearing in `pdfs/{your_user_id}/`

### 6. Verify PDF URL Format

The PDF URL should be:
- A direct link to a PDF file (ends with `.pdf` or has `.pdf` in the path)
- Accessible via HTTP/HTTPS
- Not requiring authentication (unless your extension handles it)

## Expected Behavior

When saving a PDF:
1. ✅ PDF type is detected (`isPDF = true`)
2. ✅ User is authenticated (`userId` exists)
3. ✅ PDF URL is found (`pdfUrlToUpload` is set)
4. ✅ PDF is downloaded from URL
5. ✅ PDF is uploaded to `pdfs/{user_id}/{timestamp}-{random}.pdf`
6. ✅ Public URL is generated
7. ✅ Document is saved with `storage_object_path` and `media_url`

## Still Not Working?

1. **Check all console logs** - Look for any error messages
2. **Verify storage policies** - Make sure `pdfs/` is included
3. **Test with a simple PDF** - Try a publicly accessible PDF URL
4. **Check network requests** - See if the PDF download is failing
5. **Verify authentication** - Make sure you're logged in

