# PDF Viewer V2 Implementation

## Overview

A complete rebuild of the PDF viewer with all requested features implemented from scratch.

## Features Implemented

### ✅ 1. Text Selection with Right-Click Context Menu
- Users can select text on any page
- Right-click shows context menu with "Save Text to Scribe" option
- Text selection works across all pages independently

### ✅ 2. Save Selected Text to Scribe with Full PDF Context
- Selected text is saved with the full PDF text as context
- Format: `Selected Text:\n{selection}\n\nFull PDF Context:\n{full pdf text}`
- Automatically triggers vectorization via `process-document` edge function
- User can select existing scribe or create new one

### ✅ 3. Save Images from PDF
- Automatically detects images on each page
- Shows "Save Image" button on pages with images
- Extracts images and saves them to storage
- Images are vectorized via `process-image` edge function

### ✅ 4. Screenshot Capability
- "Screenshot" button in toolbar
- Captures visible PDF viewer area
- Uses Chrome's `captureVisibleTab` API
- Saves screenshot with metadata (page number, etc.)

### ✅ 5. Save Whole PDF
- "Save PDF" button in header
- Saves PDF with extracted text content
- Triggers vectorization for full document
- Includes metadata (filename, source URL, etc.)

### ✅ 6. Zoom Functionality
- Zoom In/Out buttons in toolbar
- Zoom range: 50% to 300%
- Displays current zoom percentage
- Re-renders all pages at new scale

### ✅ 7. Scroll-Based Page Navigation
- Pages render in scrollable container
- Current page updates automatically based on scroll position
- Smooth scrolling when navigating to specific pages
- Page number input for direct navigation

## Technical Implementation

### Architecture

```
PDFViewerV2.vue
├── PDF Loading (PDF.js)
├── Text Extraction (Full PDF)
├── Page Rendering (Canvas + Text Layer)
├── Image Extraction (Per Page)
├── Context Menu (Right-Click)
├── Scribe Selection Modal
└── Storage Integration
```

### Key Components

1. **PDF Loading**
   - Uses PDF.js library
   - Loads PDF document
   - Extracts total page count

2. **Text Extraction**
   - Extracts text from all pages
   - Stores full PDF text for context
   - Used when saving selected text

3. **Page Rendering**
   - Renders each page to canvas
   - Creates text layer for selection
   - Positions layers correctly

4. **Image Extraction**
   - Analyzes operator list for images
   - Extracts image data
   - Converts to canvas/data URL

5. **Context Menu**
   - Shows on right-click with text selection
   - Options: Save to Scribe, Copy
   - Positioned at cursor location

6. **Scribe Integration**
   - Loads user's scribes
   - Allows selection or creation
   - Links saved content to scribe

7. **Vectorization**
   - Automatically triggered after saving
   - Text selections → `process-document`
   - Images → `process-image`
   - Full PDF → `process-document`

## Data Flow

### Text Selection Save Flow

```
User selects text → Right-click → Context menu
  ↓
Click "Save Text to Scribe"
  ↓
Load scribes → Show modal
  ↓
Select scribe (or create new)
  ↓
Format: Selected Text + Full PDF Context
  ↓
storageManager.saveContent()
  ↓
Database (document table)
  ↓
edgeFunctionService.processDocument() (async)
  ↓
Vector DB (document_vector table)
```

### Image Save Flow

```
PDF page rendered → Extract images
  ↓
User clicks "Save Image" button
  ↓
Convert image to data URL
  ↓
storageManager.saveContent()
  ↓
Database + Storage bucket
  ↓
edgeFunctionService.processImage() (async)
  ↓
OCR + Vector DB
```

## File Structure

```
src/pdf-viewer/
├── PDFViewerV2.vue          # Main component
├── pdf-viewer-vue.ts        # Entry point (updated)
└── pdf-viewer-vue.html      # HTML template
```

## Usage

The viewer is automatically used when opening PDFs via the extension. The entry point (`pdf-viewer-vue.ts`) loads `PDFViewerV2.vue` instead of the old `PDFViewer.vue`.

## Styling

Uses shadcn-vue design tokens:
- `hsl(var(--background))`
- `hsl(var(--foreground))`
- `hsl(var(--primary))`
- `hsl(var(--border))`
- etc.

## Future Enhancements

- [ ] Annotation tools (highlight, draw, notes)
- [ ] Search within PDF
- [ ] Bookmark/favorite pages
- [ ] Print functionality
- [ ] Download PDF
- [ ] Full-screen mode
- [ ] Thumbnail navigation

## Migration Notes

The old `PDFViewer.vue` is still available but not used. To switch back:
1. Update `pdf-viewer-vue.ts` to import `PDFViewer` instead of `PDFViewerV2`
2. Or keep both and add a feature flag




