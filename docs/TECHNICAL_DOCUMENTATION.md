# NabuAI Chrome Extension - Technical Documentation

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [System Architecture](#system-architecture)
4. [Data Flow](#data-flow)
5. [Component Structure](#component-structure)
6. [Database Schema](#database-schema)
7. [Edge Functions](#edge-functions)
8. [Vectorization & RAG](#vectorization--rag)
9. [Authentication & Security](#authentication--security)
10. [Build & Development](#build--development)
11. [Key Features](#key-features)

---

## Overview

NabuAI is a Chrome extension that serves as a personal memory and organization layer for online content. It enables users to capture, save, and intelligently retrieve information from web pages, images, PDFs, and text selections using AI-powered semantic search (RAG - Retrieval Augmented Generation).

### Core Capabilities

- **Content Capture**: Save web pages, selected text, images, videos, PDFs, and screenshots
- **PDF Annotation**: Highlight, draw, and add notes to PDF documents
- **AI-Powered Search**: Semantic search using vector embeddings
- **RAG Chat**: Context-aware conversations with AI using saved content
- **Organization**: Tag-based organization and scribe-based grouping
- **Sharing**: Share documents and scribes with collaborators

---

## Tech Stack

### Frontend

- **Vue 3** (v3.4.0) - Progressive JavaScript framework
- **TypeScript** (v5.2.0) - Type-safe JavaScript
- **Vite** (v5.0.0) - Build tool and dev server
- **Tailwind CSS** (v3.4.0) - Utility-first CSS framework
- **shadcn-vue** - Reusable component library built on Radix Vue
- **Radix Vue** (v1.9.17) - Headless UI primitives
- **PDF.js** (v5.4.296) - PDF rendering and annotation
- **markdown-it** (v14.1.0) - Markdown parsing and rendering
- **lucide-vue-next** (v0.548.0) - Icon library

### Backend & Infrastructure

- **Supabase** - Backend-as-a-Service
  - PostgreSQL database
  - Authentication (email/password)
  - Storage (file uploads)
  - Edge Functions (Deno runtime)
  - Row Level Security (RLS)

### AI & Processing

- **OpenAI API** - Embeddings (text-embedding-3-small) and Vision API
- **Groq API** - LLM inference (Llama 3.1 70B)
- **Tesseract.js** (v6.0.1) - OCR for images (optional)

### Browser APIs

- **Chrome Extension Manifest V3**
- **Chrome Context Menus API**
- **Chrome Storage API**
- **Chrome Scripting API**
- **Chrome Tabs API**

### Development Tools

- **vue-tsc** - TypeScript type checking for Vue
- **PostCSS** - CSS processing
- **Autoprefixer** - CSS vendor prefixing
- **class-variance-authority** - Component variant management
- **clsx** & **tailwind-merge** - Class name utilities

---

## System Architecture

### Extension Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Chrome Extension                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Popup UI   │    │  Background │    │   Content    │  │
│  │   (Vue 3)    │◄──►│  Service    │◄──►│   Script    │  │
│  │              │    │   Worker    │    │              │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                   │                   │          │
│         │                   │                   │          │
│         └───────────────────┴───────────────────┘          │
│                            │                                │
│                            ▼                                │
│                  ┌──────────────────┐                       │
│                  │  Storage Manager │                       │
│                  │   (Abstraction)  │                       │
│                  └──────────────────┘                       │
│                            │                                │
│                            ▼                                │
│                  ┌──────────────────┐                       │
│                  │ Database Service │                       │
│                  │  (Supabase SDK)  │                       │
│                  └──────────────────┘                       │
│                            │                                │
└────────────────────────────┼────────────────────────────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │   Supabase Backend   │
                  ├──────────────────────┤
                  │ • PostgreSQL DB      │
                  │ • Storage Buckets    │
                  │ • Edge Functions     │
                  │ • Authentication     │
                  └──────────────────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │   External Services  │
                  ├──────────────────────┤
                  │ • OpenAI API         │
                  │ • Groq API           │
                  └──────────────────────┘
```

### Component Layers

1. **Presentation Layer** (Popup, Dashboard, PDF Viewer)
   - Vue 3 components with shadcn-vue UI
   - Dark mode theming
   - Responsive design

2. **Service Layer** (Background, Content Scripts)
   - Context menu handlers
   - Message passing
   - Content injection

3. **Data Layer** (Storage, Database, Edge Functions)
   - Abstraction for multiple storage backends
   - Supabase integration
   - Vector embeddings

4. **AI Layer** (Edge Functions)
   - Document processing
   - Image OCR
   - Embedding generation
   - RAG chat

---

## Data Flow

### 1. Content Save Flow

```
User Action (Right-click / Popup)
    ↓
Context Menu / Popup UI
    ↓
Background Service / Storage Manager
    ↓
StorageManager.saveContent()
    ↓
[Backend: 'supabase']
    ↓
DatabaseService.saveDocument()
    ↓
Supabase Storage (for media files)
    ↓
Supabase Database (document record)
    ↓
Edge Function (async)
    ↓
process-document / process-image
    ↓
Chunking → Embeddings → document_vector table
    ↓
Success Response
```

### 2. RAG Chat Flow

```
User Message in ScribeDetail
    ↓
EdgeFunctionService.sendRAGMessage()
    ↓
rag-chat Edge Function
    ↓
1. Vector Search (pgvector)
   - Query embedding generation
   - Similarity search in document_vector
   - Retrieve top-k chunks
    ↓
2. Context Assembly
   - Combine relevant chunks
   - Add metadata (title, URL, etc.)
    ↓
3. LLM Inference (Groq)
   - Send context + user message
   - Generate response
    ↓
4. Save Message
   - Store in scribe_message table
    ↓
5. Return Response
    ↓
Display in Chat UI
```

### 3. PDF Annotation Flow

```
User Opens PDF Link
    ↓
Background Service
    ↓
Open PDF Viewer (pdf-viewer.html)
    ↓
PDFViewerEngine (PDF.js)
    ↓
Render PDF Canvas + Text Layer
    ↓
User Interaction (Highlight/Draw/Note)
    ↓
Annotation Data Structure
    ↓
Save to Database (annotation table)
    ↓
Render Annotation Layer
```

### 4. Authentication Flow

```
User Opens Extension
    ↓
App.vue checks auth state
    ↓
[Not Authenticated]
    ↓
Login.vue
    ↓
Supabase Auth (signIn/signUp)
    ↓
Session Token
    ↓
Store in chrome.storage.local
    ↓
[Authenticated]
    ↓
ScribeSelection / Dashboard
```

---

## Component Structure

### Extension Entry Points

```
src/
├── popup/
│   ├── index.html          # Popup entry point
│   ├── main.ts             # Popup initialization
│   ├── App.vue             # Main app router
│   ├── Login.vue           # Authentication UI
│   ├── Dashboard.vue       # Scribe dashboard
│   ├── ScribeDetail.vue    # Scribe chat interface
│   └── components/         # Popup components
│
├── background/
│   └── background.ts        # Service worker
│
├── content/
│   └── content.ts         # Content script
│
├── dashboard/
│   ├── index.html          # Dashboard entry point
│   └── main.ts             # Dashboard initialization
│
└── pdf-viewer/
    ├── pdf-viewer.html     # PDF viewer entry point
    ├── PDFViewer.vue        # Main PDF component
    ├── PDFViewerEngine.ts  # PDF rendering engine
    └── components/         # PDF components
```

### UI Components (shadcn-vue)

```
src/components/ui/
├── button/          # Button component
├── card/            # Card components
├── input/           # Input field
├── textarea/        # Textarea field
├── dialog/          # Modal dialogs
├── badge/           # Badge component
├── field/           # Form field components
├── separator/       # Separator component
├── tabs/            # Tab navigation
├── sidebar/         # Sidebar navigation
└── item/            # List item components
```

### Utility Services

```
src/utils/
├── supabase.ts          # Supabase client
├── auth.ts              # Authentication utilities
├── database.ts          # Database operations
├── storage.ts           # Storage manager (multi-backend)
├── edgeFunctions.ts     # Edge function client
├── types.ts             # TypeScript type definitions
└── polyfills.ts         # Browser polyfills
```

---

## Database Schema

### Core Tables

#### 1. `document`
Stores all saved content (pages, text, images, videos, PDFs).

**Key Fields:**
- `id` (UUID) - Primary key
- `user_id` (UUID) - Foreign key to auth.users
- `type` (VARCHAR) - Content type: 'page', 'text', 'image', 'video', 'pdf', 'screenshot'
- `title` (TEXT) - Document title
- `url` (TEXT) - Source URL
- `content` (TEXT) - Full text content
- `notes` (TEXT) - User notes
- `tags` (TEXT[]) - Array of tags
- `media_url` (TEXT) - Storage URL for media files
- `metadata` (JSONB) - Flexible metadata storage
- `scribe_id` (UUID) - Optional foreign key to scribe

**Indexes:**
- `idx_document_user_id` - User lookup
- `idx_document_type` - Type filtering
- `idx_document_created_at` - Time-based sorting
- `idx_document_tags` - Tag search (GIN)
- `idx_document_fts` - Full-text search (GIN)

#### 2. `scribe`
AI conversation containers for documents.

**Key Fields:**
- `id` (UUID) - Primary key
- `user_id` (UUID) - Owner
- `name` (TEXT) - Scribe name
- `model` (TEXT) - LLM model identifier
- `description` (TEXT) - Optional description

#### 3. `scribe_message`
Individual messages in a scribe conversation.

**Key Fields:**
- `id` (UUID) - Primary key
- `scribe_id` (UUID) - Foreign key to scribe
- `role` (VARCHAR) - 'user' or 'assistant'
- `content` (TEXT) - Message content
- `tokens` (INTEGER) - Token count
- `metadata` (JSONB) - Additional data

#### 4. `document_vector`
Vector embeddings for semantic search.

**Key Fields:**
- `id` (UUID) - Primary key
- `document_id` (UUID) - Foreign key to document
- `embedding` (vector(1536)) - OpenAI embedding vector
- `chunk_text` (TEXT) - Text chunk
- `chunk_index` (INTEGER) - Chunk position
- `metadata` (JSONB) - Chunk metadata

**Indexes:**
- `idx_document_vector_embedding` - Vector similarity search (ivfflat)
- `idx_document_vector_document_id` - Document lookup

#### 5. `annotation`
PDF annotations (highlights, drawings, notes).

**Key Fields:**
- `id` (UUID) - Primary key
- `document_id` (UUID) - Foreign key to document
- `type` (VARCHAR) - 'highlight', 'drawing', 'note'
- `page_number` (INTEGER) - PDF page
- `data` (JSONB) - Annotation geometry and content
- `color` (VARCHAR) - Annotation color

#### 6. `share`
Document and scribe sharing.

**Key Fields:**
- `id` (UUID) - Primary key
- `resource_type` (VARCHAR) - 'document' or 'scribe'
- `resource_id` (UUID) - Resource identifier
- `shared_by_user_id` (UUID) - Sharer
- `shared_with_user_id` (UUID) - Recipient
- `permission` (VARCHAR) - 'read' or 'write'

### Row Level Security (RLS)

All tables have RLS policies:
- Users can only view/insert/update/delete their own records
- Shared resources are accessible to both owner and recipient
- Service role has full access (for edge functions)

---

## Edge Functions

### 1. `process-document`

**Purpose:** Chunk text documents and generate embeddings.

**Input:**
```typescript
{
  documentId: string
}
```

**Process:**
1. Fetch document from database
2. Extract text content
3. Chunk text (500-1000 characters, overlap)
4. Generate embeddings (OpenAI text-embedding-3-small)
5. Store in `document_vector` table

**Output:**
```typescript
{
  message: string
  chunksProcessed: number
}
```

### 2. `process-image`

**Purpose:** Extract text from images using OCR/Vision API and generate embeddings.

**Input:**
```typescript
{
  documentId: string
}
```

**Process:**
1. Fetch document and image from storage
2. Extract text using OpenAI Vision API
3. Chunk extracted text
4. Generate embeddings
5. Store in `document_vector` table

**Output:**
```typescript
{
  message: string
  chunksProcessed: number
  extractedTextLength: number
}
```

### 3. `rag-chat`

**Purpose:** Generate AI responses using RAG (Retrieval Augmented Generation).

**Input:**
```typescript
{
  scribeId: string
  message: string
  matchThreshold?: number  // Default: 0.7
  matchCount?: number      // Default: 10
  model?: string           // Default: 'llama-3.1-70b-versatile'
}
```

**Process:**
1. Get all documents in scribe
2. Generate query embedding
3. Vector similarity search (pgvector)
4. Retrieve top-k chunks with metadata
5. Assemble context prompt
6. Call Groq API (Llama 3.1 70B)
7. Save message to database
8. Return response

**Output:**
```typescript
{
  message: string
  tokens: number
  contextChunks: number
  sources: Array<{
    document_id: string
    title: string
    chunk_text: string
    similarity: number
  }>
}
```

### 4. `generate-embeddings`

**Purpose:** Utility function to generate embeddings for arbitrary text.

**Input:**
```typescript
{
  texts: string[]
}
```

**Output:**
```typescript
{
  embeddings: number[][]
}
```

---

## Vectorization & RAG

### Vectorization Pipeline

1. **Content Upload**
   - User saves content (text, image, PDF, etc.)
   - Document stored in database
   - Media files uploaded to Supabase Storage

2. **Async Processing**
   - Edge function triggered (`process-document` or `process-image`)
   - Text extraction (if needed)
   - Chunking strategy:
     - Chunk size: 500-1000 characters
     - Overlap: 100-200 characters
     - Preserve sentence boundaries

3. **Embedding Generation**
   - OpenAI API: `text-embedding-3-small`
   - Dimension: 1536
   - Batch processing for efficiency

4. **Storage**
   - Vectors stored in `document_vector` table
   - pgvector extension for similarity search
   - Indexed with IVFFlat for fast queries

### RAG (Retrieval Augmented Generation)

1. **Query Processing**
   - User message in scribe chat
   - Generate query embedding
   - Filter by scribe's documents

2. **Retrieval**
   - Vector similarity search (cosine distance)
   - Match threshold: 0.7 (configurable)
   - Top-k chunks: 10 (configurable)
   - Include metadata (title, URL, chunk index)

3. **Context Assembly**
   - Combine retrieved chunks
   - Add source attribution
   - Format for LLM prompt

4. **Generation**
   - Groq API: Llama 3.1 70B
   - System prompt with context
   - User message
   - Stream response (optional)

5. **Response Storage**
   - Save user message
   - Save assistant response
   - Track token usage

### Vector Search Performance

- **Index Type:** IVFFlat (Inverted File with Flat compression)
- **Distance Metric:** Cosine similarity
- **Index Build:** After sufficient vectors (typically 1000+)
- **Query Performance:** <100ms for typical queries

---

## Authentication & Security

### Authentication Flow

1. **Sign Up / Sign In**
   - Email/password via Supabase Auth
   - Session token stored in `chrome.storage.local`
   - Session persists across browser restarts

2. **Session Management**
   - Automatic token refresh
   - Session restoration on extension startup
   - Logout clears all local data

3. **Protected Routes**
   - `App.vue` checks auth state
   - Redirects to login if not authenticated
   - Guards database operations

### Security Measures

1. **Row Level Security (RLS)**
   - All tables have RLS policies
   - Users can only access their own data
   - Shared resources have explicit policies

2. **API Keys**
   - Edge functions use Supabase secrets
   - Never exposed to client
   - Environment-specific configuration

3. **Content Security Policy**
   - Manifest V3 restrictions
   - Web-accessible resources whitelist
   - No inline scripts (except allowed)

4. **Data Validation**
   - TypeScript types
   - Database constraints
   - Input sanitization

---

## Build & Development

### Project Structure

```
nabu-ui/
├── src/                    # Source code
│   ├── popup/             # Extension popup
│   ├── background/        # Service worker
│   ├── content/           # Content scripts
│   ├── dashboard/         # Dashboard page
│   ├── pdf-viewer/        # PDF viewer
│   ├── components/        # UI components
│   └── utils/             # Utilities
├── supabase/              # Supabase config
│   ├── functions/         # Edge functions
│   └── migrations/        # Database migrations
├── dist/                  # Build output
├── manifest.json          # Extension manifest
├── vite.config.ts         # Vite configuration
├── tailwind.config.js     # Tailwind config
└── package.json           # Dependencies
```

### Build Process

1. **Development**
   ```bash
   npm run dev              # Vite dev server
   ```

2. **Production Build**
   ```bash
   npm run build            # Build to dist/
   npm run build:extension  # Build + extension packaging
   ```

3. **Build Output**
   - `dist/popup.js` - Popup bundle
   - `dist/background.js` - Service worker
   - `dist/content.js` - Content script
   - `dist/dashboard.js` - Dashboard bundle
   - `dist/pdf-viewer.js` - PDF viewer bundle
   - Static assets (HTML, CSS, icons)

### Vite Configuration

- **Multiple Entry Points:** Popup, background, content, dashboard, PDF viewer
- **Path Aliases:** `@/` resolves to `src/`
- **Chunk Naming:** Prevents leading underscores (Chrome restriction)
- **PDF.js Worker:** Copied to dist during build

### Development Workflow

1. **Local Development**
   - Run `npm run dev`
   - Load `dist/` as unpacked extension in Chrome
   - Hot reload for popup (limited)

2. **Testing**
   - Manual testing in Chrome
   - Console logging for debugging
   - Supabase dashboard for data verification

3. **Deployment**
   - Build production bundle
   - Test in Chrome
   - Package for Chrome Web Store (if applicable)

---

## Key Features

### 1. Multi-Backend Storage

Supports multiple storage backends:
- **Supabase** (default) - Cloud storage with full features
- **Chrome Storage** - Local browser storage
- **localStorage** - Simple local storage

Switchable via `StorageManager.setStorageBackend()`

### 2. PDF Annotation

- **Highlighting:** Text selection with color presets
- **Drawing:** Freehand drawing on PDF pages
- **Notes:** Text annotations with modal input
- **Persistence:** Annotations saved to database
- **Rendering:** Per-page annotation layers with proper scaling

### 3. Content Types

- **Page:** Full webpage with Readability extraction
- **Text:** Selected text snippets
- **Image:** Images with OCR support
- **Video:** Video metadata and thumbnails
- **PDF:** PDF files with annotation support
- **Screenshot:** Full or partial page screenshots

### 4. Search Capabilities

- **Full-Text Search:** PostgreSQL full-text search
- **Semantic Search:** Vector similarity search
- **Hybrid Search:** Combination of both
- **Tag Filtering:** Filter by tags
- **Type Filtering:** Filter by content type

### 5. UI Components

- **shadcn-vue:** Consistent component library
- **Dark Mode:** Full dark theme support
- **Responsive:** Mobile-friendly layouts
- **Accessible:** ARIA labels and keyboard navigation

### 6. Drag & Drop

- **File Upload:** Drag images, PDFs, text files
- **URL Drop:** Paste URLs directly
- **Visual Feedback:** Drop zone overlay
- **Auto-Processing:** Automatic vectorization

---

## Environment Variables

### Supabase Configuration

Required in Supabase Edge Functions:
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (for RLS bypass)
- `OPENAI_API_KEY` - OpenAI API key (for embeddings and vision)
- `GROQ_API_KEY` - Groq API key (for LLM inference)

### Client Configuration

Set in `src/utils/supabase.ts`:
- Supabase project URL
- Supabase anon key

---

## Performance Considerations

1. **Vector Search**
   - IVFFlat index for fast similarity search
   - Batch embedding generation
   - Caching query results

2. **Chunking Strategy**
   - Optimal chunk size (500-1000 chars)
   - Overlap for context preservation
   - Sentence boundary awareness

3. **Lazy Loading**
   - PDF pages loaded on demand
   - Images loaded lazily in lists
   - Code splitting in build

4. **Caching**
   - User session caching
   - Document metadata caching
   - Vector search result caching

---

## Future Enhancements

- [ ] Real-time collaboration
- [ ] Advanced PDF annotation tools
- [ ] Multi-language support
- [ ] Export/import functionality
- [ ] Browser extension for other browsers (Firefox, Edge)
- [ ] Mobile app integration
- [ ] Advanced analytics
- [ ] Custom LLM model support
- [ ] Plugin system for extensions

---

## Troubleshooting

### Common Issues

1. **Vector Search Not Working**
   - Check pgvector extension is enabled
   - Verify IVFFlat index is built
   - Check embedding dimensions match (1536)

2. **Edge Functions Failing**
   - Verify API keys in Supabase secrets
   - Check edge function logs
   - Verify RLS policies

3. **PDF Annotations Not Saving**
   - Check database connection
   - Verify annotation data structure
   - Check RLS policies for annotation table

4. **Authentication Issues**
   - Clear chrome.storage.local
   - Re-authenticate
   - Check Supabase auth settings

---

## License

[Add your license information here]

---

## Contributors

[Add contributor information here]

---

*Last Updated: [Current Date]*

