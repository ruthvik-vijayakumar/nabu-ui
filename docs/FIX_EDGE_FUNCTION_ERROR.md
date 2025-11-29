# Fix Edge Function Non-2xx Error

## Error Message
```
FunctionsHttpError: Edge Function returned a non-2xx status code
```

## Quick Fix Steps

### Step 1: Check Edge Function Logs

The most important step is to check what error the edge function is actually returning:

1. **Go to Supabase Dashboard:**
   - Navigate to **Edge Functions → process-document → Logs**
   - Look for the most recent error logs
   - The logs will show the actual error message

2. **Or use CLI:**
   ```bash
   supabase functions logs process-document --limit 20
   ```

### Step 2: Verify Secrets Are Set

The edge function needs these secrets:

```bash
# Check what secrets are set
supabase secrets list

# Set missing secrets
supabase secrets set OPENAI_API_KEY=sk-your-openai-key
```

**Note:** `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are automatically available in edge functions, but you can verify they're working by checking the logs.

### Step 3: Common Errors and Fixes

#### Error: "OPENAI_API_KEY not configured"
**Fix:**
```bash
supabase secrets set OPENAI_API_KEY=sk-your-key
```

#### Error: "SUPABASE_URL not configured" or "SUPABASE_SERVICE_ROLE_KEY not configured"
**Fix:** These should be auto-available. If not, check:
- Edge function is deployed correctly
- Project is linked: `supabase link --project-ref your-ref`

#### Error: "Document not found"
**Fix:** 
- Verify the document exists in the database
- Check the `documentId` being passed is correct
- Ensure the document has `user_id` set

#### Error: Database permission issues
**Fix:**
- Check RLS policies on `document` and `document_vector` tables
- Verify service role key has proper permissions

#### Error: OpenAI API error
**Fix:**
- Verify API key is valid
- Check API key has credits/quota
- Verify network connectivity from edge function

### Step 4: Redeploy Edge Function

After fixing secrets or code:

```bash
# Redeploy the function
supabase functions deploy process-document

# Verify it's deployed
supabase functions list
```

### Step 5: Test the Edge Function

**Option A: Via Supabase Dashboard**
1. Go to **Edge Functions → process-document**
2. Click **Invoke**
3. Use body:
   ```json
   {
     "documentId": "your-document-id"
   }
   ```

**Option B: Via curl**
```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/process-document' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"documentId": "your-document-id"}'
```

### Step 6: Check Browser Console

After saving a document, check the browser console for:

1. **Error response body** - This will show the actual error message from the edge function
2. **Error status** - The HTTP status code (400, 404, 500, etc.)
3. **Error context** - Additional error details

The enhanced logging will show:
```
❌ EdgeFunctionService: Error response body: { error: "actual error message" }
```

## Debugging Checklist

- [ ] Edge function is deployed (`supabase functions list`)
- [ ] OPENAI_API_KEY secret is set (`supabase secrets list`)
- [ ] Edge function logs show the actual error
- [ ] Document exists in database
- [ ] Document has content
- [ ] Browser console shows error response body
- [ ] Network request shows status code

## Next Steps

1. **Check edge function logs** - This is the most important step
2. **Set missing secrets** - If OPENAI_API_KEY is missing
3. **Redeploy function** - After fixing secrets
4. **Test manually** - Use the invoke button in dashboard
5. **Check browser console** - Look for error response body

The enhanced error logging will now show the actual error message from the edge function in the browser console, making it much easier to debug!

