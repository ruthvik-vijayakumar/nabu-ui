# Embedding Alternatives to OpenAI

## Quick Comparison

| Provider | Cost | Quality | Speed | Setup |
|----------|------|---------|-------|-------|
| **OpenAI** | $0.10/1M tokens | ⭐⭐⭐⭐⭐ | Fast | Easy |
| **Hugging Face** | Free | ⭐⭐⭐⭐ | Medium | Easy |
| **Cohere** | $0.10/1M tokens | ⭐⭐⭐⭐ | Fast | Easy |
| **Local (Xenova)** | Free | ⭐⭐⭐ | Slow | Medium |
| **Supabase pg_embedding** | Free* | ⭐⭐⭐ | Fast | Built-in |

*Free if using Supabase's built-in embedding extension

## Option 1: Hugging Face (Free & Easy ✅)

### Setup

1. **Get API Token:**
   - Go to: https://huggingface.co/settings/tokens
   - Create a token (free, no credit card needed)

2. **Set Secret:**
   ```bash
   supabase secrets set HUGGINGFACE_API_KEY=hf_your-token-here
   ```

3. **Update Edge Function:**
   - See updated `process-document/index.ts` below

### Models Available:
- `sentence-transformers/all-MiniLM-L6-v2` (384 dim) - Fast, good quality
- `sentence-transformers/all-mpnet-base-v2` (768 dim) - Better quality
- `BAAI/bge-small-en-v1.5` (384 dim) - Great for English
- `intfloat/e5-small-v2` (384 dim) - Good general purpose

## Option 2: Cohere (Paid, High Quality)

### Setup

1. **Get API Key:**
   - Go to: https://dashboard.cohere.com/api-keys
   - Sign up (free tier available)

2. **Set Secret:**
   ```bash
   supabase secrets set COHERE_API_KEY=your-cohere-key
   ```

### Models:
- `embed-english-v3.0` (1024 dim) - Best quality
- `embed-english-light-v3.0` (384 dim) - Faster, cheaper

## Option 3: Local Embeddings (Free, Private)

### Setup

Uses Transformers.js (runs in Deno edge function):

```typescript
// No API key needed - runs locally
// Slower but completely free and private
```

### Models:
- `Xenova/all-MiniLM-L6-v2` (384 dim)
- `Xenova/bge-small-en-v1.5` (384 dim)

## Option 4: Supabase pg_embedding Extension

### Setup

Uses Supabase's built-in embedding extension (if available):

```sql
-- Enable extension
CREATE EXTENSION IF NOT EXISTS embedding;

-- Use in SQL
SELECT embedding('text-embedding-ada-002', 'your text here');
```

**Note:** This may not be available in all Supabase projects yet.

## Recommended: Hugging Face

**Why Hugging Face?**
- ✅ **Free** - No credit card needed
- ✅ **Good quality** - Comparable to OpenAI
- ✅ **Easy setup** - Just need API token
- ✅ **Multiple models** - Choose based on needs
- ✅ **No rate limits** (on free tier)

## Setup Instructions

### Option 1: Hugging Face (Free - Recommended)

1. **Get API Token:**
   - Go to: https://huggingface.co/settings/tokens
   - Click "New token"
   - Name: `nabu-ai-embeddings`
   - Type: Read (no write needed)
   - Copy the token (starts with `hf_`)

2. **Set Secret in Supabase:**
   - **Dashboard Method:**
     - Go to Supabase Dashboard → Edge Functions → Settings → Secrets
     - Add secret: `HUGGINGFACE_API_KEY` = `hf_your-token`
   - **CLI Method:**
     ```bash
     supabase secrets set HUGGINGFACE_API_KEY=hf_your-token-here
     ```

3. **Set Provider:**
   - **Dashboard Method:**
     - Add secret: `EMBEDDING_PROVIDER` = `huggingface`
   - **CLI Method:**
     ```bash
     supabase secrets set EMBEDDING_PROVIDER=huggingface
     ```

4. **Redeploy Function:**
   ```bash
   supabase functions deploy process-document
   ```

### Option 2: Cohere

1. **Get API Key:**
   - Go to: https://dashboard.cohere.com/api-keys
   - Sign up (free tier available)
   - Create API key

2. **Set Secrets:**
   ```bash
   supabase secrets set COHERE_API_KEY=your-cohere-key
   supabase secrets set EMBEDDING_PROVIDER=cohere
   ```

3. **Redeploy:**
   ```bash
   supabase functions deploy process-document
   ```

### Option 3: Keep OpenAI (Default)

If you want to use OpenAI:
```bash
supabase secrets set OPENAI_API_KEY=sk-your-key
# EMBEDDING_PROVIDER defaults to 'openai' if not set
```

## Dimension Compatibility

Different providers return different dimensions:
- **OpenAI**: 1536 dimensions ✅ (matches current DB schema)
- **Hugging Face**: 384 dimensions ⚠️ (needs schema update)
- **Cohere**: 1024 dimensions ⚠️ (needs schema update)

**Note:** PostgreSQL's `VECTOR` type can store different dimensions per value, but the column definition `VECTOR(1536)` might cause issues. The code will work, but you may see warnings. For production, consider making the dimension flexible.

## Implementation

The updated `process-document/index.ts` now supports:
- ✅ OpenAI (default)
- ✅ Hugging Face (free)
- ✅ Cohere (paid)

Just set the `EMBEDDING_PROVIDER` secret and the corresponding API key!

