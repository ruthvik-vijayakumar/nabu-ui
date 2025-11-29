# Supabase Database Implementation Guide

This guide walks you through setting up the complete database schema for NabuAI in your Supabase project.

## 📋 Prerequisites

1. **Supabase Account**: https://supabase.com
2. **Project Created**: Follow the basic setup from `SUPABASE_SETUP.md`
3. **API Credentials**: Get your URL and Anon Key from Settings → API

## 🗄️ Database Setup

### Step 1: Run the Migrations

Go to your Supabase Dashboard → **SQL Editor** and run these migrations in order:

#### 1.1 Initial Schema

```bash
# Copy the entire contents of:
supabase/migrations/001_initial_schema.sql
```

Paste into SQL Editor and click **RUN**.

This creates:
- ✅ `document` table (main content storage)
- ✅ `annotation` table (PDF highlights/notes/drawings)
- ✅ `scribe` table (AI conversations)
- ✅ `scribe_message` table (individual messages)
- ✅ `document_vector` table (embeddings for semantic search)
- ✅ `share` table (document sharing)
- ✅ All indexes and RLS policies

#### 1.2 Functions

```bash
# Copy the entire contents of:
supabase/migrations/002_functions.sql
```

Paste into SQL Editor and click **RUN**.

This creates:
- ✅ `search_documents_semantic()` - Vector similarity search
- ✅ `search_documents_hybrid()` - Combined semantic + full-text search
- ✅ `get_document_stats()` - Document statistics
- ✅ `get_user_content_stats()` - User storage stats
- ✅ Auto-updating triggers for message counts and share tokens

### Step 2: Verify Setup

Run this query to verify all tables were created:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('document', 'annotation', 'scribe', 'scribe_message', 'document_vector', 'share')
ORDER BY table_name;
```

You should see all 6 tables listed.

## 🔗 Database Entity Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                         auth.users                              │
│                   (Supabase Authentication)                     │
└────────────┬────────────────────────────────────────────────────┘
             │
             ├────────────────────────────────────────────────────┐
             │                                                    │
             ↓                                                    ↓
┌────────────────────────┐                            ┌──────────────────────────┐
│      DOCUMENT          │                            │        SHARE              │
│                        │◄───────────────────────────│                          │
│ - id (PK)              │                            │ - id (PK)                 │
│ - user_id (FK)         │                            │ - document_id (FK)        │
│ - type                 │                            │ - shared_by_user_id (FK)  │
│ - title                │                            │ - shared_with_user_id (FK)│
│ - content              │                            │ - share_type              │
│ - tags[]               │                            │ - share_token             │
│ - metadata (JSONB)     │                            │ - permissions             │
│ - timestamps           │                            │ - expires_at              │
└────┬───────────────────┘                            └──────────────────────────┘
     │
     ├───────────────────────────────────────────────────┐
     │                                                   │
     ↓                                                   ↓
┌────────────────────────┐                   ┌──────────────────────────┐
│   DOCUMENT_VECTOR      │                   │      ANNOTATION          │
│                        │                   │                          │
│ - id (PK)              │                   │ - id (PK)                │
│ - document_id (FK)     │                   │ - document_id (FK)       │
│ - user_id (FK)         │                   │ - user_id (FK)           │
│ - embedding (VECTOR)   │                   │ - type                   │
│ - chunk_text           │                   │ - page_number            │
│ - chunk_index          │                   │ - coordinates            │
│ - page_number          │                   │ - text_content           │
│ - metadata (JSONB)     │                   │ - color                  │
└────────────────────────┘                   └──────────────────────────┘
                                                  │
                                                  ↓
                                     ┌──────────────────────────┐
                                     │        SCRIBE            │
                                     │                          │
                                     │ - id (PK)                │
                                     │ - document_id (FK)       │
                                     │ - user_id (FK)           │
                                     │ - name                   │
                                     │ - model                  │
                                     │ - message_count          │
                                     │ - total_tokens           │
                                     └────────┬─────────────────┘
                                              │
                                              ↓
                                     ┌──────────────────────────┐
                                     │    SCRIBE_MESSAGE        │
                                     │                          │
                                     │ - id (PK)                │
                                     │ - scribe_id (FK)         │
                                     │ - user_id (FK)           │
                                     │ - role                   │
                                     │ - content                │
                                     │ - tokens                 │
                                     │ - referenced_annotations │
                                     └──────────────────────────┘
```

## 🔐 Row Level Security (RLS)

All tables have **RLS enabled** with these policies:

| Table | Select | Insert | Update | Delete |
|-------|--------|--------|--------|--------|
| `document` | ✅ Own docs | ✅ Own docs | ✅ Own docs | ✅ Own docs |
| `annotation` | ✅ Own | ✅ Own | ✅ Own | ✅ Own |
| `scribe` | ✅ Own | ✅ Own | ✅ Own | ✅ Own |
| `scribe_message` | ✅ Own | ✅ Own | ❌ No | ✅ Own |
| `document_vector` | ✅ Own | ✅ Own | ❌ No | ✅ Own |
| `share` | ✅ Own | ✅ Own | ❌ No | ✅ Own |

Users can **only** access their own data by default.

## 📊 Key Features

### 1. Multi-Type Content Storage
The `document` table supports:
- `page` - Full web pages
- `text` - Selected text snippets
- `image` - Images with thumbnails
- `video` - Videos with metadata
- `pdf` - PDF documents with extracted text

### 2. Semantic Search
```sql
-- Search using embeddings
SELECT * FROM search_documents_semantic(
  query_embedding := '[...1536-dimension vector...]',
  match_threshold := 0.7,
  match_count := 10,
  user_filter := 'user-uuid'
);
```

### 3. Hybrid Search
```sql
-- Combine semantic + full-text search
SELECT * FROM search_documents_hybrid(
  query_text := 'TikTok algorithm',
  query_embedding := '[...vector...]',
  user_filter := 'user-uuid',
  match_count := 20
);
```

### 4. Document Statistics
```sql
SELECT * FROM get_document_stats('document-uuid');
```

Returns:
- `total_annotations` - Number of highlights/notes
- `total_scribes` - Number of AI conversations
- `total_vector_chunks` - Number of embedded chunks
- `last_updated` - Most recent activity timestamp

## 🚀 Next Steps: Integrating with Extension

### 1. Create TypeScript Types

Create `src/utils/types.ts`:

```typescript
export interface Document {
  id: string
  user_id: string
  type: 'page' | 'text' | 'image' | 'video' | 'pdf'
  title: string
  url: string
  content?: string
  notes?: string
  tags: string[]
  media_url?: string
  thumbnail_url?: string
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
}

export interface Annotation {
  id: string
  document_id: string
  type: 'highlight' | 'note' | 'drawing'
  page_number: number
  x_coordinate?: number
  y_coordinate?: number
  text_content?: string
  note_text?: string
  color: string
  created_at: string
}

export interface Scribe {
  id: string
  document_id: string
  name: string
  model: string
  message_count: number
  created_at: string
}
```

### 2. Create Database Service

Create `src/utils/database.ts`:

```typescript
import { supabase } from './supabase'
import type { Document, Annotation } from './types'

export class DatabaseService {
  // Documents
  async saveDocument(document: Omit<Document, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('document')
      .insert(document)
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  async getDocuments(userId: string) {
    const { data, error } = await supabase
      .from('document')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  }

  // Annotations
  async saveAnnotation(annotation: Omit<Annotation, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('annotation')
      .insert(annotation)
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  // Semantic Search
  async semanticSearch(queryEmbedding: number[], userId: string, limit = 10) {
    const { data, error } = await supabase
      .rpc('search_documents_semantic', {
        query_embedding: queryEmbedding,
        match_threshold: 0.7,
        match_count: limit,
        user_filter: userId
      })
    
    if (error) throw error
    return data
  }
}

export const databaseService = new DatabaseService()
```

### 3. Update Storage Manager

Modify `src/utils/storage.ts` to use Supabase:

```typescript
import { databaseService } from './database'
import { getCurrentUser } from './auth'

export class StorageManager {
  async saveContent(content: SavedContent) {
    const { user } = await getCurrentUser()
    if (!user) throw new Error('Not authenticated')
    
    const document = {
      user_id: user.id,
      type: content.type,
      title: content.title,
      url: content.url,
      content: content.content,
      notes: content.notes,
      tags: content.tags,
      metadata: content.metadata || {}
    }
    
    return await databaseService.saveDocument(document)
  }
}
```

## 🔍 Testing Your Setup

### 1. Test Insertion
```sql
-- Insert a test document
INSERT INTO document (user_id, type, title, url, tags)
VALUES (
  auth.uid(),
  'text',
  'Test Document',
  'https://example.com',
  ARRAY['test', 'sample']
)
RETURNING *;
```

### 2. Test RLS
```sql
-- Should only return YOUR documents
SELECT * FROM document;
```

### 3. Test Search
```sql
-- Test FTS search
SELECT * FROM document 
WHERE to_tsvector('english', title) @@ plainto_tsquery('english', 'test');
```

## 📚 Additional Resources

- **pgvector docs**: https://github.com/pgvector/pgvector
- **Supabase RLS**: https://supabase.com/docs/guides/auth/row-level-security
- **Full-text search**: https://www.postgresql.org/docs/current/textsearch.html

## 🐛 Troubleshooting

### Error: extension "vector" does not exist
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Error: function "search_documents_semantic" does not exist
Run `002_functions.sql` migration again.

### RLS blocking queries
Make sure you're authenticated in Supabase dashboard:
```sql
SET session.request.jwt.claim.sub = 'your-user-id';
```

---

**You're all set!** 🎉 The database is ready to power NabuAI with semantic search, AI conversations, and full document management.

