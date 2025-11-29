# Setting Edge Function Secrets

## Method 1: Supabase Dashboard (Easiest ✅)

1. **Go to Supabase Dashboard:**
   - Navigate to your project
   - Go to **Settings → Edge Functions → Secrets**
   - Or go to **Edge Functions → process-document → Settings → Secrets**

2. **Add Secret:**
   - Click **Add Secret** or **New Secret**
   - Name: `OPENAI_API_KEY`
   - Value: `sk-your-openai-api-key`
   - Click **Save**

3. **Verify:**
   - The secret should appear in the list
   - Status should show as "Set"

## Method 2: Supabase CLI (If Working)

### Check if CLI is installed:
```bash
supabase --version
```

### If not installed:
```bash
npm install -g supabase
# or
brew install supabase/tap/supabase
```

### Login and Link:
```bash
# Login to Supabase
supabase login

# Link your project (get project ref from Dashboard → Settings → API)
supabase link --project-ref your-project-ref
```

### Set Secret:
```bash
supabase secrets set OPENAI_API_KEY=sk-your-openai-api-key
```

### Verify:
```bash
supabase secrets list
```

## Method 3: Supabase Management API

If CLI doesn't work, you can use the Management API:

```bash
# Get your access token from: https://supabase.com/dashboard/account/tokens

curl -X POST 'https://api.supabase.com/v1/projects/{project-ref}/secrets' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "OPENAI_API_KEY",
    "value": "sk-your-openai-api-key"
  }'
```

## Method 4: Environment Variables in Edge Function (Not Recommended)

You can also hardcode in the edge function for testing (NOT for production):

```typescript
// In supabase/functions/process-document/index.ts
const openaiApiKey = Deno.env.get('OPENAI_API_KEY') || 'sk-your-key-here'
```

⚠️ **Warning:** Never commit API keys to git!

## Troubleshooting CLI Issues

### Issue: "command not found"
**Fix:**
```bash
npm install -g supabase
# or
brew install supabase/tap/supabase
```

### Issue: "not logged in"
**Fix:**
```bash
supabase login
```

### Issue: "project not linked"
**Fix:**
```bash
# Get project ref from Dashboard → Settings → API
supabase link --project-ref your-project-ref
```

### Issue: "permission denied"
**Fix:**
- Make sure you're the project owner or have admin access
- Check you're logged into the correct account

### Issue: "secrets set" command not found
**Fix:**
- Update Supabase CLI: `npm install -g supabase@latest`
- Or use Dashboard method instead

## Verify Secrets Are Set

### Via Dashboard:
- Go to **Edge Functions → Settings → Secrets**
- You should see `OPENAI_API_KEY` listed

### Via CLI:
```bash
supabase secrets list
```

### Via Edge Function Logs:
- Deploy and invoke the function
- Check logs for environment check:
  ```
  🔧 Environment check: { hasOpenAIKey: true }
  ```

## Required Secrets

For the `process-document` function, you need:

- ✅ `OPENAI_API_KEY` - Your OpenAI API key (required)
- ✅ `SUPABASE_URL` - Auto-provided by Supabase
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Auto-provided by Supabase

## After Setting Secrets

1. **Redeploy the function** (if needed):
   ```bash
   supabase functions deploy process-document
   ```

2. **Test the function:**
   - Use Supabase Dashboard → Edge Functions → process-document → Invoke
   - Or save a document and check logs

3. **Check logs:**
   ```bash
   supabase functions logs process-document
   ```

## Quick Test

After setting the secret, test if it's accessible:

```bash
# Invoke the function with a test document ID
curl -X POST 'https://your-project.supabase.co/functions/v1/process-document' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"documentId": "test-doc-id"}'
```

Check the response - if it says "OPENAI_API_KEY not configured", the secret isn't set correctly.

