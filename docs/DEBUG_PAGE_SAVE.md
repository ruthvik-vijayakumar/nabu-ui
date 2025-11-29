# Debugging: Page Save Not Storing Content or Processing

## Issue
When saving a page, either:
- Content is not being stored in the database
- Document is not being processed for vector storage

## Fixes Applied

### 1. Content Format Fix
- **Before**: Using `article.content` (HTML) which may not process well
- **After**: Using `article.textContent` (plain text) for better vector processing
- HTML is still preserved in metadata for reference

### 2. Enhanced Logging
Added logging at multiple points:
- Content extraction (textContent vs HTML)
- Content length before saving
- Database save confirmation
- Vector processing trigger check

## How to Debug

### Step 1: Check Browser Console

When saving a page, look for these logs:

**In Popup (App.vue):**
```
Saving page: {
  contentLength: X,
  hasTextContent: true/false,
  hasHtmlContent: true/false
}
```

**In Background Script:**
```
📄 Using article textContent for page: {
  textContentLength: X,
  htmlContentLength: Y
}
💾 Calling StorageManager.saveContent with: {
  contentLength: X,
  hasContent: true/false
}
📝 Saving document to database: {
  contentLength: X,
  hasContent: true/false
}
✅ Content saved successfully to Supabase
🔍 Vector processing check: {
  documentId: ...,
  type: 'page',
  hasContent: true/false,
  contentLength: X,
  shouldProcess: true/false
}
```

### Step 2: Verify Content in Database

Run this SQL in Supabase SQL Editor:

```sql
-- Check recent page saves
SELECT 
  id,
  title,
  type,
  url,
  LENGTH(content) as content_length,
  LEFT(content, 100) as content_preview,
  created_at
FROM document
WHERE type = 'page'
  AND user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 5;
```

### Step 3: Check if Processing Was Triggered

```sql
-- Check if vectors exist for recent pages
SELECT 
  d.id,
  d.title,
  d.type,
  LENGTH(d.content) as content_length,
  COUNT(dv.id) as vector_count,
  MAX(dv.created_at) as last_processed
FROM document d
LEFT JOIN document_vector dv ON d.id = dv.document_id
WHERE d.type = 'page'
  AND d.user_id = auth.uid()
  AND d.created_at > NOW() - INTERVAL '1 hour'
GROUP BY d.id, d.title, d.type, d.content
ORDER BY d.created_at DESC;
```

## Common Issues

### Issue 1: No Content Extracted
**Symptoms:** `contentLength: 0` in logs

**Causes:**
- Readability failed to parse the page
- Page doesn't have readable content
- Content script not injected

**Fix:**
- Check browser console for Readability errors
- Try a different page with clear article content
- Verify content script is loaded (check extension popup)

### Issue 2: Content Saved But Not Processed
**Symptoms:** Document exists but `vector_count: 0`

**Causes:**
- Content is empty or whitespace only
- Edge function not deployed
- API keys not set
- Processing failed silently

**Fix:**
1. Check edge function logs: `supabase functions logs process-document`
2. Verify API keys: `supabase secrets list`
3. Manually trigger processing using "Process Documents" button

### Issue 3: Content is HTML Instead of Text
**Symptoms:** Content saved but processing fails or produces poor results

**Fix:**
- Already fixed! Now uses `textContent` instead of `content`
- Rebuild extension to get the fix

## Testing

1. **Save a page** from a news article or blog post
2. **Check console logs** for:
   - Content length > 0
   - `shouldProcess: true`
   - Processing success message
3. **Verify in database** that content exists
4. **Check vectors** were created

## Expected Flow

```
1. User clicks "Save Page"
   ↓
2. Content script extracts article (Readability)
   ↓
3. Uses textContent (plain text) for content field
   ↓
4. Saves to document table with content
   ↓
5. Checks: hasContent && type === 'page' → shouldProcess = true
   ↓
6. Calls process-document edge function
   ↓
7. Document chunked and vectors stored
   ↓
8. Ready for RAG queries
```

## Quick Fix Checklist

- [ ] Rebuild extension to get latest changes
- [ ] Check browser console for content length
- [ ] Verify document saved in database
- [ ] Check if processing was triggered
- [ ] Verify vectors exist for the document
- [ ] Check edge function logs for errors

