# PDF Annotation System Improvements

Based on [recogito/pdf-annotator-js](https://github.com/recogito/pdf-annotator-js) and W3C Web Annotation standards.

## Current Implementation Analysis

### Current Format

Our current annotation format uses simple coordinate-based highlights:

```typescript
interface HighlightAnnotation {
  type: 'highlight'
  page: number
  start: { x: number; y: number }
  end: { x: number; y: number }
  color: Color
  pageWidth: number
  pageHeight: number
}
```

### Issues with Current Approach

1. **No text extraction**: Highlights don't store the actual quoted text
2. **No quadpoints**: Uses simple x/y coordinates instead of PDF quadpoint format
3. **No character offsets**: Can't map back to text content accurately
4. **Not standardized**: Custom format doesn't follow W3C Web Annotation spec
5. **Scaling issues**: Coordinates may not scale correctly with zoom changes

## Recommended Format (W3C Web Annotation + Recogito)

### Standard Annotation Format

Based on the [W3C Web Annotation Data Model](https://www.w3.org/TR/annotation-model/) and recogito's implementation:

```typescript
interface WebAnnotation {
  id: string
  type: 'Annotation'
  bodies: AnnotationBody[]
  target: AnnotationTarget
  created: string  // ISO 8601 timestamp
  updated: string   // ISO 8601 timestamp
  creator?: {
    id: string
    name: string
    email?: string
  }
}

interface AnnotationBody {
  type: 'TextualBody' | 'SpecificResource'
  purpose: 'commenting' | 'tagging' | 'highlighting' | 'replying'
  value: string  // The comment/tag text
  created?: string
  creator?: Creator
}

interface AnnotationTarget {
  source: string  // PDF URL
  selector: TextQuoteSelector | TextPositionSelector | SvgSelector
  created?: string
  updated?: string
}

// For text highlights (most common)
interface TextQuoteSelector {
  type: 'TextQuoteSelector'
  exact: string  // The exact quoted text
  prefix?: string  // Text before the selection
  suffix?: string  // Text after the selection
}

// For PDF-specific annotations
interface TextPositionSelector {
  type: 'TextPositionSelector'
  start: number  // Character offset start
  end: number    // Character offset end
}

// For PDF highlights with quadpoints
interface PdfSelector extends TextPositionSelector {
  type: 'TextPositionSelector'
  start: number
  end: number
  pageNumber: number
  quadpoints: number[]  // [x1, y1, x2, y2, x3, y3, x4, y4] - 8 values
}
```

### Recogito-Specific Format

Recogito uses a simplified version:

```typescript
interface RecogitoAnnotation {
  id: string
  bodies: Array<{
    type: 'TextualBody'
    purpose: 'commenting' | 'tagging'
    value: string
  }>
  target: {
    source: string  // PDF URL
    selector: Array<{
      type: 'TextQuoteSelector'
      quote: string  // Selected text
      start: number  // Character offset
      end: number    // Character offset
      pageNumber: number
      quadpoints: number[]  // [x1, y1, x2, y2, x3, y3, x4, y4]
    }>
    created: string
    updated: string
  }
}
```

## Implementation Plan

### Phase 1: Text Extraction and Character Offsets

**Goal**: Extract text content and map selections to character positions.

```typescript
// In PDFViewerEngine.ts

interface TextContent {
  text: string
  items: Array<{
    str: string
    x: number
    y: number
    width: number
    height: number
    fontName: string
    fontSize: number
    charIndex: number  // Character offset in full text
  }>
}

private async extractTextWithOffsets(pageNum: number): Promise<TextContent> {
  const page = await this.pdfDocument.getPage(pageNum)
  const textContent = await page.getTextContent()
  
  let fullText = ''
  const items: TextItem[] = []
  
  for (let i = 0; i < textContent.items.length; i++) {
    const item = textContent.items[i]
    const charIndex = fullText.length
    fullText += item.str
    
    items.push({
      ...item,
      charIndex
    })
  }
  
  return { text: fullText, items }
}
```

### Phase 2: QuadPoints Calculation

**Goal**: Convert selection rectangles to PDF quadpoint format.

```typescript
/**
 * Convert a selection rectangle to PDF quadpoint format
 * Quadpoints: [x1, y1, x2, y2, x3, y3, x4, y4]
 * Representing the 4 corners of a quadrilateral:
 * - Top-left: (x1, y1)
 * - Top-right: (x2, y2)
 * - Bottom-left: (x3, y3)
 * - Bottom-right: (x4, y4)
 */
private calculateQuadpoints(
  start: { x: number; y: number },
  end: { x: number; y: number },
  viewport: any
): number[] {
  // Convert viewport coordinates to PDF coordinates
  const pdfCoords = viewport.convertToPdfPoint(start.x, start.y)
  const pdfCoordsEnd = viewport.convertToPdfPoint(end.x, end.y)
  
  // Calculate bounding box
  const left = Math.min(pdfCoords[0], pdfCoordsEnd[0])
  const right = Math.max(pdfCoords[0], pdfCoordsEnd[0])
  const top = Math.min(pdfCoords[1], pdfCoordsEnd[1])
  const bottom = Math.max(pdfCoords[1], pdfCoordsEnd[1])
  
  // PDF coordinates: origin at bottom-left, y increases upward
  // Return quadpoints: [x1, y1, x2, y2, x3, y3, x4, y4]
  return [
    left, bottom,   // Bottom-left
    right, bottom,  // Bottom-right
    left, top,      // Top-left
    right, top      // Top-right
  ]
}
```

### Phase 3: Text Selection with Quote Extraction

**Goal**: Extract the actual text when user selects, not just coordinates.

```typescript
private async finishTextSelection() {
  if (!this.textSelection) return
  
  const { start, end, page } = this.textSelection
  
  // Get text content with offsets
  const textContent = await this.extractTextWithOffsets(page)
  
  // Find text items in selection area
  const selectedItems = textContent.items.filter(item => {
    return item.x >= Math.min(start.x, end.x) &&
           item.x + item.width <= Math.max(start.x, end.x) &&
           item.y >= Math.min(start.y, end.y) &&
           item.y + item.height <= Math.max(start.y, end.y)
  })
  
  // Extract quoted text
  const quote = selectedItems.map(item => item.str).join(' ')
  const charStart = selectedItems[0]?.charIndex ?? 0
  const charEnd = selectedItems[selectedItems.length - 1]?.charIndex + 
                  (selectedItems[selectedItems.length - 1]?.str.length ?? 0)
  
  // Get prefix and suffix for context
  const prefix = textContent.text.substring(Math.max(0, charStart - 50), charStart)
  const suffix = textContent.text.substring(charEnd, Math.min(textContent.text.length, charEnd + 50))
  
  // Calculate quadpoints
  const viewport = this.renderedPages.get(page)?.viewport
  if (!viewport) return
  
  const quadpoints = this.calculateQuadpoints(start, end, viewport)
  
  // Create annotation
  const annotation: RecogitoAnnotation = {
    id: `annotation-${Date.now()}-${Math.random()}`,
    bodies: [],
    target: {
      source: this.config.pdfUrl,
      selector: [{
        type: 'TextQuoteSelector',
        quote,
        start: charStart,
        end: charEnd,
        pageNumber: page,
        quadpoints
      }],
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    }
  }
  
  // Store annotation
  this.addAnnotation(page, annotation)
}
```

### Phase 4: Updated Type Definitions

```typescript
// types.ts

export interface WebAnnotation {
  id: string
  type: 'Annotation'
  bodies: AnnotationBody[]
  target: AnnotationTarget
  created: string
  updated: string
  creator?: {
    id: string
    name: string
    email?: string
  }
}

export interface AnnotationBody {
  type: 'TextualBody' | 'SpecificResource'
  purpose: 'commenting' | 'tagging' | 'highlighting' | 'replying'
  value: string
  created?: string
  creator?: {
    id: string
    name: string
  }
}

export interface AnnotationTarget {
  source: string  // PDF URL
  selector: PdfTextSelector[]
  created?: string
  updated?: string
}

export interface PdfTextSelector {
  type: 'TextQuoteSelector' | 'TextPositionSelector'
  quote?: string  // For TextQuoteSelector
  start: number   // Character offset
  end: number     // Character offset
  pageNumber: number
  quadpoints: number[]  // [x1, y1, x2, y2, x3, y3, x4, y4]
  prefix?: string  // Context before
  suffix?: string  // Context after
}

// For backward compatibility during migration
export type Annotation = WebAnnotation | LegacyAnnotation

export interface LegacyAnnotation {
  type: 'highlight' | 'note' | 'drawing'
  page: number
  // ... old format
}
```

### Phase 5: Rendering with Quadpoints

**Goal**: Render highlights using quadpoints for accurate positioning.

```typescript
private renderAnnotation(annotation: WebAnnotation, pageNum: number) {
  const selector = annotation.target.selector[0] as PdfTextSelector
  if (!selector || selector.pageNumber !== pageNum) return
  
  const quadpoints = selector.quadpoints
  if (quadpoints.length !== 8) return
  
  // Create highlight element
  const highlight = document.createElement('div')
  highlight.className = 'pdf-highlight'
  highlight.dataset.annotationId = annotation.id
  
  // Calculate position and size from quadpoints
  // Convert PDF coordinates to viewport coordinates
  const viewport = this.renderedPages.get(pageNum)?.viewport
  if (!viewport) return
  
  const [x1, y1, x2, y2, x3, y3, x4, y4] = quadpoints
  
  // Convert PDF coords to viewport coords
  const topLeft = viewport.convertToViewportPoint([x1, y3])
  const bottomRight = viewport.convertToViewportPoint([x2, y1])
  
  highlight.style.position = 'absolute'
  highlight.style.left = `${topLeft[0]}px`
  highlight.style.top = `${topLeft[1]}px`
  highlight.style.width = `${bottomRight[0] - topLeft[0]}px`
  highlight.style.height = `${bottomRight[1] - topLeft[1]}px`
  
  // Apply color from annotation body or default
  const highlightBody = annotation.bodies.find(b => b.purpose === 'highlighting')
  const color = this.getColorFromBody(highlightBody) || 'yellow'
  highlight.style.backgroundColor = this.getColorValue(color)
  highlight.style.opacity = '0.3'
  
  // Add to annotation layer
  const layer = this.pageLayers.get(pageNum)
  if (layer) {
    const annotationLayer = layer.querySelector('.page-annotation-layer')
    if (annotationLayer) {
      annotationLayer.appendChild(highlight)
    }
  }
}
```

### Phase 6: Database Schema Update

Update the `annotation` table to support the new format:

```sql
-- Migration: Update annotation table for Web Annotation format
ALTER TABLE annotation 
  ADD COLUMN IF NOT EXISTS annotation_data JSONB;

-- Store full Web Annotation format
-- annotation_data structure:
-- {
--   "id": "annotation-id",
--   "type": "Annotation",
--   "bodies": [...],
--   "target": {
--     "source": "pdf-url",
--     "selector": [{
--       "type": "TextQuoteSelector",
--       "quote": "selected text",
--       "start": 1234,
--       "end": 1256,
--       "pageNumber": 1,
--       "quadpoints": [x1, y1, x2, y2, x3, y3, x4, y4]
--     }]
--   },
--   "created": "2024-01-01T00:00:00Z",
--   "updated": "2024-01-01T00:00:00Z"
-- }

-- Keep existing columns for backward compatibility during migration
-- Gradually migrate old format to new format
```

### Phase 7: Migration Script

```typescript
// utils/annotationMigration.ts

async function migrateLegacyAnnotations() {
  // Fetch all legacy annotations
  const { data: legacyAnnotations } = await supabase
    .from('annotation')
    .select('*')
    .is('annotation_data', null)  // Only legacy format
  
  for (const legacy of legacyAnnotations) {
    // Convert to Web Annotation format
    const webAnnotation: WebAnnotation = {
      id: legacy.id || `annotation-${Date.now()}`,
      type: 'Annotation',
      bodies: legacy.type === 'note' ? [{
        type: 'TextualBody',
        purpose: 'commenting',
        value: legacy.data?.text || ''
      }] : [{
        type: 'TextualBody',
        purpose: 'highlighting',
        value: ''
      }],
      target: {
        source: legacy.document_id, // Will need to fetch document URL
        selector: [{
          type: 'TextPositionSelector',
          start: 0, // Will need to calculate from coordinates
          end: 0,
          pageNumber: legacy.page_number,
          quadpoints: this.convertCoordinatesToQuadpoints(legacy.data)
        }],
        created: legacy.created_at,
        updated: legacy.updated_at
      },
      created: legacy.created_at,
      updated: legacy.updated_at
    }
    
    // Update annotation
    await supabase
      .from('annotation')
      .update({ annotation_data: webAnnotation })
      .eq('id', legacy.id)
  }
}
```

## Benefits of New Format

1. **Standardized**: Follows W3C Web Annotation spec
2. **Text-based**: Stores actual quoted text, not just coordinates
3. **Accurate**: Quadpoints provide precise PDF coordinates
4. **Searchable**: Can search annotations by quoted text
5. **Scalable**: Works correctly at any zoom level
6. **Interoperable**: Can export/import with other annotation tools
7. **Rich**: Supports multiple bodies (comments, tags, etc.)

## Migration Strategy

1. **Phase 1**: Implement new format alongside old format (dual support)
2. **Phase 2**: Add migration UI to convert old annotations
3. **Phase 3**: Default to new format for new annotations
4. **Phase 4**: Run background migration for all legacy annotations
5. **Phase 5**: Remove legacy format support (after sufficient time)

## References

- [W3C Web Annotation Data Model](https://www.w3.org/TR/annotation-model/)
- [Recogito PDF Annotator](https://github.com/recogito/pdf-annotator-js)
- [PDF.js Text Content API](https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib_getDocument.html)
- [PDF QuadPoints Specification](https://www.adobe.com/content/dam/acom/en/devnet/pdf/pdfs/PDF32000_2008.pdf) (Section 12.5.6.10)




