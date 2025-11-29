# Edge Function Troubleshooting

## Issue: Edge Function Not Being Invoked

### Step 1: Check Console Logs

When saving a document, you should see these logs in order:

1. **Document Save:**
   ```
   🔍 Vector processing check: { documentId, type, hasContent, shouldProcess }
   ```

2. **If shouldProcess is true:**
   ```
   🚀 Starting vector processing for document: {id}
   ✅ Edge function service loaded, calling processDocument...
   🔄 EdgeFunctionService: Processing document for vector storage: {id}
   📡 EdgeFunctionService: Invoking process-document edge function...
   ```

3. **If edge function succeeds:**
   ```
   ✅ EdgeFunctionService: Document processed successfully: { chunksProcessed: X }
   ```

4. **If edge function fails:**
   ```
   ❌ EdgeFunctionService: Error from edge function: {error}
   ```

### Step 2: Verify Edge Function is Deployed

1. **Check Supabase Dashboard:**
   - Go to **Edge Functions** in your Supabase project
   - You should see `process-document` listed
   - Status should be "Active"

2. **Check via CLI:**
   ```bash
   supabase functions list
   ```

3. **Deploy if missing:**
   ```bash
   supabase functions deploy process-document
   ```

### Step 3: Check Edge Function Logs

1. **In Supabase Dashboard:**
   - Go to **Edge Functions → process-document → Logs**
   - Look for recent invocations
   - Check for errors

2. **Via CLI:**
   ```bash
   supabase functions logs process-document
   ```

### Step 4: Test Edge Function Manually

**Option A: Via Supabase Dashboard**
- Go to **Edge Functions → process-document → Invoke**
- Use this body:
  ```json
  {
    "documentId": "your-document-id"
  }
  ```

**Option B: Via curl:**
```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/process-document' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"documentId": "your-document-id"}'
```

**Option C: In Browser Console:**
```javascript
// In popup or content script console
const { supabase } = await import('./utils/supabase')
const { data, error } = await supabase.functions.invoke('process-document', {
  body: { documentId: 'your-document-id' }
})
console.log({ data, error })
```

### Step 5: Common Issues

#### Issue: "Supabase functions not available"

**Cause:** Old version of `@supabase/supabase-js` or client not initialized correctly

**Fix:**
```bash
npm install @supabase/supabase-js@latest
```

#### Issue: "Function not found" or 404

**Cause:** Edge function not deployed or wrong name

**Fix:**
```bash
# Deploy the function
supabase functions deploy process-document

# Verify it exists
supabase functions list
```

#### Issue: "Unauthorized" or 401

**Cause:** Missing or invalid authentication

**Fix:**
- Make sure user is logged in
- Check that Supabase client has valid session
- Verify `SUPABASE_ANON_KEY` is correct

#### Issue: "OPENAI_API_KEY not configured"

**Cause:** Secret not set in Supabase

**Fix:**
```bash
supabase secrets set OPENAI_API_KEY=sk-your-key
```

#### Issue: Dynamic import fails silently

**Cause:** Module not found or circular dependency

**Fix:**
- Check browser console for import errors
- Verify `src/utils/edgeFunctions.ts` exists
- Check for TypeScript/build errors

### Step 6: Debug the Call Chain

Add this test function to verify the chain works:

```typescript
// In browser console or test file
async function testEdgeFunction() {
  console.log('🧪 Testing edge function...')
  
  // 1. Check Supabase client
  const { supabase } = await import('./utils/supabase')
  console.log('✅ Supabase client:', !!supabase)
  console.log('✅ Supabase functions:', !!supabase.functions)
  
  // 2. Check edge function service
  const { edgeFunctionService } = await import('./utils/edgeFunctions')
  console.log('✅ Edge function service:', !!edgeFunctionService)
  
  // 3. Get a test document ID
  const { databaseService } = await import('./utils/database')
  const docs = await databaseService.getDocuments()
  const testDoc = docs.find(d => d.type === 'text' && d.content && d.content.length > 100)
  
  if (!testDoc) {
    console.error('❌ No test document found')
    return
  }
  
  console.log('📄 Test document:', testDoc.id, testDoc.title)
  
  // 4. Try to process it
  try {
    const result = await edgeFunctionService.processDocument(testDoc.id)
    console.log('✅ Test result:', result)
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run it
testEdgeFunction()
```

### Step 7: Check Network Requests

1. Open **Chrome DevTools → Network tab**
2. Filter by "process-document" or "functions"
3. Save a document
4. Look for the edge function request
5. Check:
   - Request URL
   - Request method (should be POST)
   - Request headers (should include Authorization)
   - Response status
   - Response body

### Step 8: Verify Function Code

Check that `supabase/functions/process-document/index.ts` exists and has the correct code.

### Step 9: Check Build Output

Make sure the edge function is being built and deployed:

```bash
# Check if function directory exists
ls -la supabase/functions/process-document/

# Deploy with verbose output
supabase functions deploy process-document --debug
```

## Quick Fix Checklist

- [ ] Edge function is deployed (`supabase functions list`)
- [ ] OpenAI API key is set (`supabase secrets list`)
- [ ] User is authenticated
- [ ] Document has content (check `document.content` in database)
- [ ] Document type is `text`, `page`, or `pdf`
- [ ] Console shows "🚀 Starting vector processing"
- [ ] No errors in browser console
- [ ] No errors in edge function logs
- [ ] Network request is being made (check Network tab)

## Still Not Working?

1. **Check all console logs** - Look for any error messages
2. **Check edge function logs** - In Supabase Dashboard
3. **Test manually** - Use the test function above
4. **Check network requests** - Verify the request is being sent
5. **Verify deployment** - Make sure function is actually deployed

