# NabuAI Architecture Diagrams

This file contains Mermaid diagrams visualizing the system architecture, data flows, and component interactions.

## System Architecture

```mermaid
graph TB
    subgraph "Chrome Extension"
        subgraph "Frontend Layer"
            POPUP[Popup UI<br/>Vue 3 + shadcn-vue]
            DASHBOARD[Dashboard<br/>Vue 3]
            PDFVIEWER[PDF Viewer<br/>PDF.js]
        end
        
        subgraph "Service Layer"
            BACKGROUND[Background Service Worker<br/>TypeScript]
            CONTENT[Content Script<br/>TypeScript]
        end
        
        subgraph "Data Layer"
            STORAGE[Storage Manager<br/>Multi-backend Abstraction]
            DB_SERVICE[Database Service<br/>Supabase Client]
            AUTH_SERVICE[Auth Service<br/>Supabase Auth]
        end
    end
    
    subgraph "Supabase Backend"
        SUPABASE_AUTH[Authentication<br/>Email/Password]
        SUPABASE_DB[(PostgreSQL Database<br/>RLS Enabled)]
        SUPABASE_STORAGE[Storage Buckets<br/>Media Files]
        EDGE_FUNCTIONS[Edge Functions<br/>Deno Runtime]
    end
    
    subgraph "External Services"
        OPENAI[OpenAI API<br/>Embeddings + Vision]
        GROQ[Groq API<br/>LLM Inference]
    end
    
    POPUP --> STORAGE
    DASHBOARD --> STORAGE
    PDFVIEWER --> STORAGE
    BACKGROUND --> STORAGE
    CONTENT --> BACKGROUND
    
    STORAGE --> DB_SERVICE
    STORAGE --> AUTH_SERVICE
    
    DB_SERVICE --> SUPABASE_DB
    DB_SERVICE --> SUPABASE_STORAGE
    AUTH_SERVICE --> SUPABASE_AUTH
    
    EDGE_FUNCTIONS --> SUPABASE_DB
    EDGE_FUNCTIONS --> OPENAI
    EDGE_FUNCTIONS --> GROQ
    
    STORAGE -.async.-> EDGE_FUNCTIONS
    
    style POPUP fill:#3b82f6,color:#fff
    style DASHBOARD fill:#3b82f6,color:#fff
    style PDFVIEWER fill:#3b82f6,color:#fff
    style BACKGROUND fill:#10b981,color:#fff
    style CONTENT fill:#10b981,color:#fff
    style STORAGE fill:#f59e0b,color:#fff
    style DB_SERVICE fill:#f59e0b,color:#fff
    style SUPABASE_DB fill:#8b5cf6,color:#fff
    style EDGE_FUNCTIONS fill:#8b5cf6,color:#fff
    style OPENAI fill:#ef4444,color:#fff
    style GROQ fill:#ef4444,color:#fff
```

## Data Flow: Content Save

```mermaid
sequenceDiagram
    participant User
    participant UI as Popup/Context Menu
    participant BG as Background Service
    participant SM as Storage Manager
    participant DB as Database Service
    participant SB as Supabase
    participant EF as Edge Function
    participant AI as OpenAI API
    
    User->>UI: Right-click / Save Action
    UI->>BG: Save Request
    BG->>SM: saveContent(data)
    SM->>DB: saveDocument(document)
    DB->>SB: Insert into document table
    DB->>SB: Upload to storage bucket
    SB-->>DB: Document ID
    DB-->>SM: Success
    SM-->>BG: Success Response
    BG-->>UI: Show Success Message
    
    Note over SM,EF: Async Processing
    SM->>EF: Trigger process-document
    EF->>SB: Fetch document
    EF->>EF: Chunk text content
    EF->>AI: Generate embeddings
    AI-->>EF: Embedding vectors
    EF->>SB: Store in document_vector
    EF-->>SM: Processing complete
```

## Data Flow: RAG Chat

```mermaid
sequenceDiagram
    participant User
    participant UI as ScribeDetail
    participant EF_SERVICE as Edge Function Service
    participant EF as rag-chat Edge Function
    participant DB as Supabase Database
    participant VECTOR as Vector Search
    participant GROQ as Groq API
    
    User->>UI: Send Message
    UI->>EF_SERVICE: sendRAGMessage(scribeId, message)
    EF_SERVICE->>EF: Invoke rag-chat
    
    EF->>DB: Get scribe documents
    DB-->>EF: Document list
    
    EF->>EF: Generate query embedding
    EF->>VECTOR: Vector similarity search
    VECTOR->>DB: Query document_vector table
    DB-->>VECTOR: Top-k chunks with metadata
    VECTOR-->>EF: Relevant context chunks
    
    EF->>EF: Assemble context prompt
    EF->>GROQ: LLM inference (Llama 3.1 70B)
    GROQ-->>EF: AI response
    
    EF->>DB: Save messages to scribe_message
    EF-->>EF_SERVICE: Response with sources
    EF_SERVICE-->>UI: Display response
    
    UI->>User: Show AI response
```

## Component Interaction: PDF Annotation

```mermaid
graph LR
    subgraph "PDF Viewer"
        A[PDFViewer.vue] --> B[PDFViewerEngine.ts]
        B --> C[PDF.js Canvas]
        B --> D[Text Layer]
        B --> E[Annotation Layer]
    end
    
    subgraph "User Actions"
        F[Highlight Tool] --> E
        G[Drawing Tool] --> E
        H[Note Tool] --> I[NoteModal]
    end
    
    subgraph "Data Persistence"
        E --> J[Annotation Data]
        I --> J
        J --> K[Database Service]
        K --> L[(annotation table)]
    end
    
    subgraph "Rendering"
        B --> M[Render Page]
        M --> C
        M --> D
        M --> E
    end
    
    style A fill:#3b82f6,color:#fff
    style B fill:#10b981,color:#fff
    style E fill:#f59e0b,color:#fff
    style L fill:#8b5cf6,color:#fff
```

## Database Schema Relationships

```mermaid
erDiagram
    USERS ||--o{ DOCUMENT : owns
    USERS ||--o{ SCRIBE : owns
    USERS ||--o{ SHARE : shares
    
    DOCUMENT ||--o{ DOCUMENT_VECTOR : has
    DOCUMENT ||--o{ ANNOTATION : has
    DOCUMENT }o--o| SCRIBE : belongs_to
    
    SCRIBE ||--o{ SCRIBE_MESSAGE : contains
    SCRIBE }o--o{ SHARE : shared
    
    DOCUMENT {
        uuid id PK
        uuid user_id FK
        uuid scribe_id FK
        varchar type
        text title
        text url
        text content
        text notes
        text_array tags
        text media_url
        jsonb metadata
        timestamp created_at
    }
    
    SCRIBE {
        uuid id PK
        uuid user_id FK
        text name
        text model
        text description
        timestamp created_at
    }
    
    DOCUMENT_VECTOR {
        uuid id PK
        uuid document_id FK
        vector embedding
        text chunk_text
        integer chunk_index
        jsonb metadata
    }
    
    ANNOTATION {
        uuid id PK
        uuid document_id FK
        varchar type
        integer page_number
        jsonb data
        varchar color
    }
    
    SCRIBE_MESSAGE {
        uuid id PK
        uuid scribe_id FK
        varchar role
        text content
        integer tokens
        jsonb metadata
    }
    
    SHARE {
        uuid id PK
        uuid shared_by_user_id FK
        uuid shared_with_user_id FK
        varchar resource_type
        uuid resource_id
        varchar permission
    }
```

## Vectorization Pipeline

```mermaid
flowchart TD
    A[User Saves Content] --> B{Content Type}
    
    B -->|Text/Page/PDF| C[Extract Text]
    B -->|Image| D[Extract with Vision API]
    B -->|Video| E[Extract Metadata]
    
    C --> F[Chunk Text<br/>500-1000 chars<br/>100-200 overlap]
    D --> F
    E --> F
    
    F --> G[Generate Embeddings<br/>OpenAI text-embedding-3-small]
    
    G --> H[Store Vectors<br/>document_vector table]
    
    H --> I[Index with IVFFlat<br/>pgvector]
    
    I --> J[Ready for Semantic Search]
    
    style A fill:#3b82f6,color:#fff
    style F fill:#10b981,color:#fff
    style G fill:#f59e0b,color:#fff
    style H fill:#8b5cf6,color:#fff
    style J fill:#ef4444,color:#fff
```

## Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant App as App.vue
    participant Login as Login.vue
    participant Auth as Auth Service
    participant Supabase as Supabase Auth
    participant Storage as Chrome Storage
    
    User->>App: Open Extension
    App->>Auth: Check Auth State
    Auth->>Storage: Get Session
    Storage-->>Auth: Session Token
    
    alt Not Authenticated
        Auth-->>App: No Session
        App->>Login: Show Login
        User->>Login: Enter Credentials
        Login->>Auth: signIn/signUp
        Auth->>Supabase: Authenticate
        Supabase-->>Auth: Session Token
        Auth->>Storage: Store Session
        Auth-->>Login: Success
        Login->>App: Navigate to Dashboard
    else Authenticated
        Auth-->>App: Valid Session
        App->>App: Show Dashboard/Scribe Selection
    end
```

## Edge Functions Architecture

```mermaid
graph TB
    subgraph "Client Side"
        CLIENT[Extension Client]
    end
    
    subgraph "Supabase Edge Functions"
        EF1[process-document<br/>Chunk + Embed]
        EF2[process-image<br/>OCR + Embed]
        EF3[rag-chat<br/>RAG + LLM]
        EF4[generate-embeddings<br/>Utility]
    end
    
    subgraph "External APIs"
        OPENAI[OpenAI API<br/>Embeddings + Vision]
        GROQ[Groq API<br/>Llama 3.1 70B]
    end
    
    subgraph "Supabase Services"
        DB[(PostgreSQL<br/>+ pgvector)]
        STORAGE[Storage Buckets]
    end
    
    CLIENT -->|Trigger| EF1
    CLIENT -->|Trigger| EF2
    CLIENT -->|Query| EF3
    CLIENT -->|Utility| EF4
    
    EF1 --> DB
    EF1 --> OPENAI
    EF1 --> STORAGE
    
    EF2 --> DB
    EF2 --> OPENAI
    EF2 --> STORAGE
    
    EF3 --> DB
    EF3 --> GROQ
    
    EF4 --> OPENAI
    
    style CLIENT fill:#3b82f6,color:#fff
    style EF1 fill:#10b981,color:#fff
    style EF2 fill:#10b981,color:#fff
    style EF3 fill:#10b981,color:#fff
    style EF4 fill:#10b981,color:#fff
    style OPENAI fill:#ef4444,color:#fff
    style GROQ fill:#ef4444,color:#fff
    style DB fill:#8b5cf6,color:#fff
```

## Storage Backend Abstraction

```mermaid
graph TB
    subgraph "Application Layer"
        APP[Vue Components]
    end
    
    subgraph "Storage Manager"
        SM[StorageManager<br/>Multi-backend Abstraction]
    end
    
    subgraph "Backend Implementations"
        SUPABASE[Supabase Backend<br/>Default]
        CHROME[Chrome Storage Backend]
        LOCAL[localStorage Backend]
    end
    
    subgraph "Data Stores"
        SB_DB[(Supabase Database)]
        SB_STORAGE[Supabase Storage]
        CHROME_STORAGE[(chrome.storage.local)]
        LOCAL_STORAGE[(window.localStorage)]
    end
    
    APP --> SM
    SM -->|backend: 'supabase'| SUPABASE
    SM -->|backend: 'chrome'| CHROME
    SM -->|backend: 'localStorage'| LOCAL
    
    SUPABASE --> SB_DB
    SUPABASE --> SB_STORAGE
    CHROME --> CHROME_STORAGE
    LOCAL --> LOCAL_STORAGE
    
    style SM fill:#f59e0b,color:#fff
    style SUPABASE fill:#8b5cf6,color:#fff
    style CHROME fill:#3b82f6,color:#fff
    style LOCAL fill:#10b981,color:#fff
```

## UI Component Hierarchy

```mermaid
graph TD
    subgraph "Popup Application"
        APP[App.vue<br/>Router + Auth Guard]
        APP --> LOGIN[Login.vue]
        APP --> SELECTION[ScribeSelection.vue]
        APP --> DASHBOARD[Dashboard.vue]
        APP --> DETAIL[ScribeDetail.vue]
    end
    
    subgraph "shadcn-vue Components"
        BUTTON[Button]
        CARD[Card]
        INPUT[Input]
        TEXTAREA[Textarea]
        DIALOG[Dialog]
        BADGE[Badge]
        TABS[Tabs]
        FIELD[Field]
    end
    
    subgraph "Custom Components"
        CREATE_MODAL[CreateScribeModal]
        SHARE_MODAL[ShareScribeModal]
        NOTE_MODAL[NoteModal]
        SAVE_MODAL[SaveModal]
    end
    
    LOGIN --> BUTTON
    LOGIN --> INPUT
    LOGIN --> CARD
    
    SELECTION --> BUTTON
    SELECTION --> INPUT
    SELECTION --> CARD
    
    DASHBOARD --> BUTTON
    DASHBOARD --> CARD
    DASHBOARD --> BADGE
    DASHBOARD --> INPUT
    
    DETAIL --> BUTTON
    DETAIL --> CARD
    DETAIL --> TABS
    DETAIL --> TEXTAREA
    
    DASHBOARD --> CREATE_MODAL
    DASHBOARD --> SHARE_MODAL
    DETAIL --> NOTE_MODAL
    DETAIL --> SAVE_MODAL
    
    style APP fill:#3b82f6,color:#fff
    style BUTTON fill:#10b981,color:#fff
    style CARD fill:#10b981,color:#fff
    style CREATE_MODAL fill:#f59e0b,color:#fff
```

## RAG Query Processing Detail

```mermaid
flowchart TD
    A[User Message] --> B[Generate Query Embedding<br/>OpenAI text-embedding-3-small]
    
    B --> C[Get Scribe Documents]
    
    C --> D[Vector Similarity Search<br/>pgvector cosine distance]
    
    D --> E{Match Threshold<br/>>= 0.7}
    
    E -->|Pass| F[Retrieve Top-K Chunks<br/>Default: 10]
    E -->|Fail| G[No Context]
    
    F --> H[Assemble Context Prompt]
    G --> H
    
    H --> I[Format Sources Metadata<br/>Title, URL, Chunk Index]
    
    I --> J[Call Groq API<br/>Llama 3.1 70B]
    
    J --> K[Stream Response]
    
    K --> L[Save Messages<br/>scribe_message table]
    
    L --> M[Return Response + Sources]
    
    style A fill:#3b82f6,color:#fff
    style B fill:#f59e0b,color:#fff
    style D fill:#10b981,color:#fff
    style J fill:#ef4444,color:#fff
    style M fill:#8b5cf6,color:#fff
```

## Context Menu Flow

```mermaid
sequenceDiagram
    participant User
    participant Page as Web Page
    participant Content as Content Script
    participant BG as Background Service
    participant Modal as Injected Modal
    participant Storage as Storage Manager
    
    User->>Page: Right-click on Content
    Page->>Content: Context Menu Event
    Content->>BG: Context Menu Click
    BG->>BG: Determine Content Type<br/>Text/Image/PDF/Video
    
    alt Text Selection
        BG->>Modal: Inject Text Save Dialog
        User->>Modal: Add Tags & Save
        Modal->>BG: Save Request
        BG->>Storage: saveContent(text)
    else Image/Video
        BG->>Modal: Inject Media Save Dialog
        User->>Modal: Add Tags & Save
        Modal->>BG: Save Request
        BG->>Storage: saveContent(media)
    else PDF Link
        BG->>BG: Open PDF Viewer
        BG->>Page: Navigate to pdf-viewer.html
    end
    
    Storage->>Storage: Process & Store
    Storage-->>BG: Success
    BG-->>Modal: Show Success Message
    Modal-->>User: Feedback
```

---

## How to View These Diagrams

1. **GitHub/GitLab**: Mermaid diagrams render automatically in markdown files
2. **VS Code**: Install "Markdown Preview Mermaid Support" extension
3. **Online**: Copy diagram code to [Mermaid Live Editor](https://mermaid.live/)
4. **Documentation Sites**: Most support Mermaid (GitBook, Notion, etc.)

## Diagram Legend

- **Blue**: Frontend/UI Components
- **Green**: Service Layer/Processing
- **Orange**: Data/Storage Layer
- **Purple**: Backend Services
- **Red**: External APIs

