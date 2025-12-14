# Technical Testing

## Testing Strategy Overview

NabuAI requires comprehensive testing across multiple layers: Chrome extension components, Vue.js frontend, Supabase backend, edge functions, and AI/ML integrations. This document outlines the testing approach, test types, and implementation strategies.

---

## 1. Unit Testing

### 1.1 Frontend Components (Vue 3)

**Testing Framework:** Vitest + Vue Test Utils

**Components to Test:**
- **Login.vue**
  - Email/password validation
  - Form submission handling
  - Error message display
  - Success redirect

- **ScribeDetail.vue**
  - Tab switching functionality
  - Message sending/receiving
  - Document list rendering
  - Editor content persistence

- **PDFViewerEngine.ts**
  - PDF loading and parsing
  - Page navigation
  - Coordinate transformations
  - Annotation rendering

- **StorageManager**
  - Backend switching (Supabase/Chrome/localStorage)
  - Content saving logic
  - Error handling

**Test Examples:**
```typescript
describe('StorageManager', () => {
  it('should save content to Supabase backend', async () => {
    const manager = StorageManager.getInstance()
    manager.setStorageBackend('supabase')
    const result = await manager.saveContent(mockContent)
    expect(result).toBeDefined()
  })
  
  it('should handle storage backend switching', () => {
    const manager = StorageManager.getInstance()
    manager.setStorageBackend('chrome')
    expect(manager.getBackend()).toBe('chrome')
  })
})
```

### 1.2 Utility Functions

**Functions to Test:**
- Text chunking algorithm
- Coordinate normalization
- URL validation and resolution
- Storage path extraction

**Test Examples:**
```typescript
describe('Text Chunking', () => {
  it('should chunk text with proper overlap', () => {
    const text = 'A'.repeat(2000)
    const chunks = chunkText(text, 500, 100)
    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks[0].length).toBeLessThanOrEqual(500)
  })
  
  it('should preserve sentence boundaries', () => {
    const text = 'First sentence. Second sentence. Third sentence.'
    const chunks = chunkText(text, 30, 10)
    expect(chunks[0]).toContain('First sentence.')
  })
})
```

### 1.3 Background Service Worker

**Functions to Test:**
- Message handling
- Context menu creation
- Content type detection
- PDF URL extraction

---

## 2. Integration Testing

### 2.1 Frontend-Backend Integration

**Test Scenarios:**
- User authentication flow
- Document save and retrieval
- Vector search functionality
- RAG chat message flow

**Test Examples:**
```typescript
describe('Document Save Integration', () => {
  it('should save document and trigger vectorization', async () => {
    const doc = await saveDocument(mockDocument)
    expect(doc.id).toBeDefined()
    
    // Wait for async vectorization
    await waitForVectorization(doc.id)
    
    const vectors = await getDocumentVectors(doc.id)
    expect(vectors.length).toBeGreaterThan(0)
  })
})
```

### 2.2 Chrome Extension APIs

**Test Scenarios:**
- Context menu interactions
- Message passing between components
- Storage API usage
- Tab management

**Test Examples:**
```typescript
describe('Chrome Extension Integration', () => {
  it('should handle context menu clicks', async () => {
    const mockContextMenu = {
      menuItemId: 'save-to-nabu',
      selectionText: 'Test text'
    }
    
    await handleContextMenuClick(mockContextMenu)
    expect(mockSaveFunction).toHaveBeenCalled()
  })
  
  it('should pass messages between popup and background', async () => {
    const response = await chrome.runtime.sendMessage({
      action: 'saveContent',
      data: mockData
    })
    expect(response.success).toBe(true)
  })
})
```

### 2.3 Database Integration

**Test Scenarios:**
- Row-level security policies
- Vector search queries
- Annotation persistence
- Sharing functionality

**Test Examples:**
```typescript
describe('Database Integration', () => {
  it('should enforce RLS policies', async () => {
    const user1Doc = await createDocument(user1, mockDoc)
    const user2Doc = await createDocument(user2, mockDoc)
    
    // User 1 should not see user 2's documents
    const user1Docs = await getDocuments(user1)
    expect(user1Docs).not.toContainEqual(user2Doc)
  })
  
  it('should perform vector similarity search', async () => {
    const query = 'machine learning'
    const results = await vectorSearch(query, {
      threshold: 0.7,
      limit: 10
    })
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].similarity).toBeGreaterThanOrEqual(0.7)
  })
})
```

---

## 3. End-to-End Testing

### 3.1 User Workflows

**Testing Framework:** Playwright or Cypress

**Critical User Journeys:**

1. **First-Time User Onboarding**
   - Sign up → Create scribe → Add document → Chat
   - Verify: Account creation, scribe creation, document save, vectorization

2. **Content Saving Workflow**
   - Right-click → Save modal → Select scribe → Save
   - Verify: Content saved, metadata correct, vectorization triggered

3. **RAG Chat Flow**
   - Open scribe → Send message → Receive AI response → View sources
   - Verify: Message sent, vector search performed, AI response received, sources displayed

4. **PDF Annotation Flow**
   - Open PDF → Highlight text → Add note → Save annotation
   - Verify: Annotation rendered, saved to database, persists on reload

**Test Examples:**
```typescript
describe('E2E: Complete User Journey', () => {
  it('should complete first-time user onboarding', async () => {
    // 1. Sign up
    await page.goto('/popup')
    await page.fill('[data-testid="email"]', 'test@example.com')
    await page.fill('[data-testid="password"]', 'password123')
    await page.click('[data-testid="signup"]')
    
    // 2. Create scribe
    await page.click('[data-testid="create-scribe"]')
    await page.fill('[data-testid="scribe-name"]', 'Test Scribe')
    await page.click('[data-testid="save-scribe"]')
    
    // 3. Add document
    await page.click('[data-testid="add-document"]')
    await page.fill('[data-testid="document-title"]', 'Test Document')
    await page.click('[data-testid="save-document"]')
    
    // 4. Chat
    await page.click('[data-testid="chat-tab"]')
    await page.fill('[data-testid="message-input"]', 'What is this about?')
    await page.click('[data-testid="send-message"]')
    
    // Verify AI response
    await expect(page.locator('[data-testid="ai-response"]')).toBeVisible()
  })
})
```

### 3.2 Cross-Browser Testing

**Browsers to Test:**
- Chrome (primary)
- Edge (Chromium-based)
- Firefox (if supported)

**Test Scenarios:**
- Extension installation
- Basic functionality
- PDF rendering
- Vector search

---

## 4. Performance Testing

### 4.1 Vector Search Performance

**Metrics to Test:**
- Query response time (< 100ms target)
- Index build time
- Search accuracy (recall/precision)

**Test Scenarios:**
```typescript
describe('Vector Search Performance', () => {
  it('should complete search in under 100ms', async () => {
    const start = performance.now()
    await vectorSearch('test query', { limit: 10 })
    const duration = performance.now() - start
    expect(duration).toBeLessThan(100)
  })
  
  it('should maintain accuracy with large datasets', async () => {
    // Create 10,000 test documents
    await createTestDocuments(10000)
    
    const results = await vectorSearch('test query', { limit: 10 })
    expect(results.length).toBe(10)
    expect(results[0].similarity).toBeGreaterThan(0.7)
  })
})
```

### 4.2 PDF Rendering Performance

**Metrics to Test:**
- PDF load time
- Page render time
- Annotation rendering performance
- Memory usage with large PDFs

**Test Scenarios:**
```typescript
describe('PDF Rendering Performance', () => {
  it('should load PDF in under 2 seconds', async () => {
    const start = performance.now()
    await pdfViewer.loadPDF(mockPdfUrl)
    const duration = performance.now() - start
    expect(duration).toBeLessThan(2000)
  })
  
  it('should render annotations efficiently', async () => {
    const annotations = await createTestAnnotations(100)
    const start = performance.now()
    await pdfViewer.renderAnnotations(annotations)
    const duration = performance.now() - start
    expect(duration).toBeLessThan(500)
  })
})
```

### 4.3 Chunking and Embedding Performance

**Metrics to Test:**
- Chunking speed
- Embedding generation time
- Batch processing efficiency

---

## 5. Security Testing

### 5.1 Authentication & Authorization

**Test Scenarios:**
- Token validation
- Session expiration
- RLS policy enforcement
- Unauthorized access attempts

**Test Examples:**
```typescript
describe('Security: Authentication', () => {
  it('should reject invalid tokens', async () => {
    const invalidToken = 'invalid-token'
    const response = await fetch('/api/documents', {
      headers: { Authorization: `Bearer ${invalidToken}` }
    })
    expect(response.status).toBe(401)
  })
  
  it('should enforce RLS policies', async () => {
    const user1Doc = await createDocument(user1, mockDoc)
    const user2Token = await getAuthToken(user2)
    
    const response = await fetch(`/api/documents/${user1Doc.id}`, {
      headers: { Authorization: `Bearer ${user2Token}` }
    })
    expect(response.status).toBe(403)
  })
})
```

### 5.2 Input Validation

**Test Scenarios:**
- SQL injection prevention
- XSS prevention
- File upload validation
- URL validation

### 5.3 API Key Security

**Test Scenarios:**
- API keys not exposed to client
- Edge function secret management
- Rate limiting

---

## 6. AI/ML Component Testing

### 6.1 Embedding Generation

**Test Scenarios:**
- Embedding dimension validation (1536)
- Embedding quality (similarity scores)
- Batch processing
- Error handling

**Test Examples:**
```typescript
describe('Embedding Generation', () => {
  it('should generate embeddings with correct dimensions', async () => {
    const embedding = await generateEmbedding('test text')
    expect(embedding.length).toBe(1536)
  })
  
  it('should produce similar embeddings for similar text', async () => {
    const emb1 = await generateEmbedding('machine learning')
    const emb2 = await generateEmbedding('ML algorithms')
    const similarity = cosineSimilarity(emb1, emb2)
    expect(similarity).toBeGreaterThan(0.7)
  })
})
```

### 6.2 RAG Pipeline Testing

**Test Scenarios:**
- Query embedding generation
- Vector search accuracy
- Context assembly
- LLM response quality

**Test Examples:**
```typescript
describe('RAG Pipeline', () => {
  it('should retrieve relevant context chunks', async () => {
    const query = 'What is machine learning?'
    const context = await retrieveContext(query, scribeId)
    expect(context.chunks.length).toBeGreaterThan(0)
    expect(context.chunks[0].similarity).toBeGreaterThan(0.7)
  })
  
  it('should generate contextually relevant responses', async () => {
    const response = await sendRAGMessage(scribeId, 'Explain this concept')
    expect(response.message).toBeDefined()
    expect(response.sources.length).toBeGreaterThan(0)
  })
})
```

### 6.3 Chunking Algorithm Testing

**Test Scenarios:**
- Chunk size consistency
- Overlap preservation
- Sentence boundary preservation
- Edge cases (very short/long text)

---

## 7. Edge Function Testing

### 7.1 process-document Function

**Test Scenarios:**
- Document text extraction
- Chunking accuracy
- Embedding generation
- Vector storage

**Test Examples:**
```typescript
describe('process-document Edge Function', () => {
  it('should process document and create vectors', async () => {
    const doc = await createDocument(mockDoc)
    await invokeEdgeFunction('process-document', { documentId: doc.id })
    
    const vectors = await getDocumentVectors(doc.id)
    expect(vectors.length).toBeGreaterThan(0)
  })
  
  it('should handle large documents', async () => {
    const largeDoc = await createLargeDocument(100000) // 100KB
    await invokeEdgeFunction('process-document', { documentId: largeDoc.id })
    
    const vectors = await getDocumentVectors(largeDoc.id)
    expect(vectors.length).toBeGreaterThan(10)
  })
})
```

### 7.2 rag-chat Function

**Test Scenarios:**
- Query processing
- Vector search
- Context assembly
- LLM integration
- Error handling

### 7.3 process-image Function

**Test Scenarios:**
- Image OCR accuracy
- Text extraction
- Embedding generation

---

## 8. Database Testing

### 8.1 Schema Validation

**Test Scenarios:**
- Table structure
- Foreign key constraints
- Index creation
- RLS policies

### 8.2 Vector Search Testing

**Test Scenarios:**
- IVFFlat index performance
- Cosine similarity calculations
- Query optimization
- Result ranking

**Test Examples:**
```typescript
describe('Vector Search Database', () => {
  it('should use IVFFlat index for fast queries', async () => {
    const query = await generateQueryEmbedding('test')
    const results = await db.query(`
      SELECT * FROM document_vector
      WHERE embedding <=> $1 < 0.3
      ORDER BY embedding <=> $1
      LIMIT 10
    `, [query])
    
    expect(results.length).toBeLessThanOrEqual(10)
  })
  
  it('should return results ordered by similarity', async () => {
    const results = await vectorSearch('test query')
    for (let i = 1; i < results.length; i++) {
      expect(results[i-1].similarity).toBeGreaterThanOrEqual(results[i].similarity)
    }
  })
})
```

---

## 9. Browser Extension Specific Testing

### 9.1 Manifest V3 Compliance

**Test Scenarios:**
- Service worker functionality
- Content Security Policy
- Permission handling
- Background script lifecycle

### 9.2 Content Script Testing

**Test Scenarios:**
- Script injection
- DOM interaction
- Message passing
- Context menu integration

### 9.3 Storage Testing

**Test Scenarios:**
- Chrome Storage API
- Data persistence
- Quota limits
- Migration between backends

---

## 10. Error Handling & Edge Cases

### 10.1 Network Failures

**Test Scenarios:**
- Offline mode handling
- API timeout handling
- Retry logic
- Error messages

### 10.2 Invalid Data

**Test Scenarios:**
- Malformed PDFs
- Invalid URLs
- Corrupted embeddings
- Missing metadata

### 10.3 Resource Limits

**Test Scenarios:**
- Large file uploads
- Storage quota exceeded
- Rate limiting
- Memory constraints

---

## 11. Test Implementation Plan

### Phase 1: Unit Tests (Weeks 1-2)
- Set up testing framework (Vitest)
- Write utility function tests
- Write component tests
- Target: 70% code coverage

### Phase 2: Integration Tests (Weeks 3-4)
- Frontend-backend integration
- Chrome API integration
- Database integration
- Target: Critical paths covered

### Phase 3: E2E Tests (Weeks 5-6)
- Set up Playwright/Cypress
- Implement critical user journeys
- Cross-browser testing
- Target: All major workflows covered

### Phase 4: Performance & Security (Weeks 7-8)
- Performance benchmarks
- Security audits
- Load testing
- Target: Performance targets met, security validated

---

## 12. Test Coverage Goals

- **Unit Tests:** 80% code coverage
- **Integration Tests:** 100% of critical paths
- **E2E Tests:** All major user journeys
- **Performance Tests:** All performance-critical functions
- **Security Tests:** All authentication/authorization paths

---

## 13. Continuous Integration

### CI/CD Pipeline

**Stages:**
1. **Lint & Type Check**
   - ESLint
   - TypeScript compilation
   - Prettier formatting

2. **Unit Tests**
   - Run all unit tests
   - Generate coverage report
   - Fail if coverage < 80%

3. **Integration Tests**
   - Run integration test suite
   - Test against staging database

4. **E2E Tests**
   - Run Playwright tests
   - Test in headless Chrome

5. **Build & Deploy**
   - Build extension
   - Deploy to staging
   - Run smoke tests

---

## 14. Testing Tools & Frameworks

### Frontend Testing
- **Vitest** - Unit testing framework
- **Vue Test Utils** - Vue component testing
- **Playwright** - E2E testing
- **MSW** - API mocking

### Backend Testing
- **Jest** - Edge function testing
- **Supabase Test Helpers** - Database testing
- **Postman/Newman** - API testing

### Performance Testing
- **Lighthouse** - Performance audits
- **WebPageTest** - Load time testing
- **Chrome DevTools** - Performance profiling

### Security Testing
- **OWASP ZAP** - Security scanning
- **Snyk** - Dependency vulnerability scanning
- **Manual security audits**

---

## 15. Test Data Management

### Mock Data
- User accounts
- Test documents
- Embeddings
- Annotations

### Test Database
- Separate test Supabase project
- Seed scripts for test data
- Cleanup after tests

### Test Files
- Sample PDFs
- Test images
- Mock API responses

---

## 16. Monitoring & Metrics

### Test Metrics to Track
- Test execution time
- Test pass/fail rates
- Code coverage trends
- Performance benchmarks
- Error rates

### Test Reporting
- Coverage reports (HTML)
- Test results dashboard
- Performance trend charts
- Security scan reports

---

This comprehensive testing strategy ensures NabuAI is reliable, performant, and secure across all components and user workflows.

