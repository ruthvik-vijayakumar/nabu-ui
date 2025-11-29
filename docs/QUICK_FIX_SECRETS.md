# Quick Fix: Set OPENAI_API_KEY Secret

## ⚠️ Important: Project is Paused

Your Supabase project is currently **paused**. You need to unpause it first:

1. Go to: https://supabase.com/dashboard/project/dozesvlwpdskvppsstlq
2. Click **Unpause Project** or **Resume Project**
3. Wait for the project to resume (may take a minute)

## Method 1: Supabase Dashboard (Easiest - Recommended ✅)

1. **Go to your project dashboard:**
   https://supabase.com/dashboard/project/dozesvlwpdskvppsstlq

2. **Navigate to Edge Functions:**
   - Click **Edge Functions** in the left sidebar
   - Or go to **Settings → Edge Functions**

3. **Go to Secrets:**
   - Click **Secrets** tab
   - Or go to **Settings → Edge Functions → Secrets**

4. **Add Secret:**
   - Click **Add Secret** or **New Secret** button
   - **Name:** `OPENAI_API_KEY`
   - **Value:** `sk-your-openai-api-key-here`
   - Click **Save** or **Add**

5. **Verify:**
   - The secret should appear in the list
   - Status should show as "Set" or a checkmark

## Method 2: Supabase CLI (After Unpausing)

### Step 1: Link Project
```bash
cd /Users/coderuth/Documents/nabu-ui
supabase link --project-ref dozesvlwpdskvppsstlq
```

### Step 2: Set Secret (Correct Format)
```bash
# Format: NAME=VALUE (no spaces around =)
supabase secrets set OPENAI_API_KEY=sk-your-actual-openai-key-here
```

**Important:** Replace `sk-your-actual-openai-key-here` with your real OpenAI API key!

### Step 3: Verify
```bash
supabase secrets list
```

You should see:
```
OPENAI_API_KEY
```

## Get Your OpenAI API Key

If you don't have an OpenAI API key:

1. Go to: https://platform.openai.com/api-keys
2. Click **Create new secret key**
3. Copy the key (starts with `sk-`)
4. **Important:** Save it somewhere safe - you won't see it again!

## After Setting the Secret

1. **Redeploy the function** (if needed):
   ```bash
   supabase functions deploy process-document
   ```

2. **Test it:**
   - Save a document in the extension
   - Check browser console for success messages
   - Or test via Dashboard → Edge Functions → process-document → Invoke

## Verify It's Working

Check the edge function logs:
```bash
supabase functions logs process-document
```

You should see:
```
🔧 Environment check: { hasOpenAIKey: true, ... }
```

If you see `hasOpenAIKey: false`, the secret isn't set correctly.

## Troubleshooting

### "Project is paused"
- Unpause the project in Dashboard first
- Wait for it to resume before setting secrets

### "Invalid secret pair"
- Use format: `NAME=VALUE` (no spaces)
- Example: `OPENAI_API_KEY=sk-abc123...`

### "Not linked"
- Run: `supabase link --project-ref dozesvlwpdskvppsstlq`

### Secret not appearing
- Refresh the Dashboard page
- Check you're in the correct project
- Try setting it again

## Recommended: Use Dashboard Method

The Dashboard method is the easiest and most reliable:
1. No CLI setup needed
2. Visual confirmation
3. Works even if project is paused (after unpausing)
4. Can see all secrets at once

Go to: https://supabase.com/dashboard/project/dozesvlwpdskvppsstlq/settings/functions

