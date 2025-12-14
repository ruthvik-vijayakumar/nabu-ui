<template>
  <div class="dark min-h-screen bg-background text-foreground">
    <!-- Header -->
    <div class="border-b border-border bg-card">
      <div class="flex items-center justify-between px-4 py-3">
        <div class="flex items-center gap-3">
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
            N
          </div>
          <div>
            <div class="text-sm font-semibold">NabuAI</div>
            <div class="text-xs text-muted-foreground truncate max-w-md">{{ filename }}</div>
          </div>
        </div>
        <Button @click="savePDF" size="sm">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path>
          </svg>
          Save PDF
        </Button>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="border-b border-border bg-card">
      <div class="flex items-center justify-between px-4 py-2">
        <div class="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            @click="goToPage(currentPage - 1)" 
            :disabled="currentPage <= 1"
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
            </svg>
          </Button>
          <div class="flex items-center gap-2">
            <Input 
              type="number" 
              :value="currentPage" 
              @change="goToPage(parseInt(($event.target as HTMLInputElement).value))"
              :min="1" 
              :max="totalPages"
              class="w-16 h-8 text-center"
            />
            <span class="text-sm text-muted-foreground">/ {{ totalPages }}</span>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            @click="goToPage(currentPage + 1)" 
            :disabled="currentPage >= totalPages"
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </Button>
        </div>

        <div class="flex items-center gap-2">
          <div class="relative" ref="screenshotMenuRef">
            <Button @click="showScreenshotMenu = !showScreenshotMenu" variant="outline" size="sm">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
              </svg>
              Screenshot
              <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="ml-1">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </Button>
            <Card v-if="showScreenshotMenu" class="absolute right-0 top-10 z-50 w-48 p-1">
              <CardContent class="p-0">
                <Button 
                  variant="ghost" 
                  class="w-full justify-start text-sm" 
                  @click="takeCurrentPageScreenshot"
                >
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="mr-2">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
                  Current Page
                </Button>
                <Button 
                  variant="ghost" 
                  class="w-full justify-start text-sm" 
                  @click="startAreaSelection"
                >
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="mr-2">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"></path>
                  </svg>
                  Select Area
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <Button variant="ghost" size="icon" @click="zoomOut">
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"></path>
            </svg>
          </Button>
          <span class="text-sm font-medium w-12 text-center">{{ Math.round(scale * 100) }}%</span>
          <Button variant="ghost" size="icon" @click="zoomIn">
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7"></path>
            </svg>
          </Button>
        </div>
      </div>
    </div>

    <!-- PDF Container -->
    <div 
      class="pdf-container overflow-y-auto overflow-x-hidden bg-muted/20" 
      ref="pdfContainer" 
      @scroll="handleScroll"
      style="height: calc(100vh - 120px);"
    >
      <div id="pdf-pages" class="flex flex-col items-center py-4 min-h-full gap-6">
        <!-- Pages will be rendered here -->
        <div v-if="!loading && totalPages === 0" class="flex flex-col items-center justify-center py-20">
          <p class="text-muted-foreground">No pages to display</p>
        </div>
      </div>
    </div>

    <!-- Context Menu -->
    <div 
      v-if="contextMenu.visible" 
      class="fixed z-50 min-w-[200px] rounded-md border border-border bg-popover p-1 shadow-md"
      :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
      @click.stop
    >
      <Button 
        variant="ghost" 
        class="w-full justify-start" 
        @click="saveSelectedText"
      >
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="mr-2">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path>
        </svg>
        Save Text to Scribe
      </Button>
      <Button 
        variant="ghost" 
        class="w-full justify-start" 
        @click="copyText"
      >
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="mr-2">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
        </svg>
        Copy
      </Button>
    </div>

    <!-- Scribe Selection Dialog (shared design) -->
    <div
      v-if="showScribeModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
      @click="showScribeModal = false"
    >
      <div
        class="w-full max-w-md max-h-[520px] h-[520px] bg-background border border-border rounded-lg shadow-lg overflow-hidden"
        @click.stop
      >
        <ScribeSelection
          :selected-scribe-id="selectedScribeId"
          :new-scribe-name="newScribeName"
          @select="handleScribeSelection"
          @back="showScribeModal = false"
        />
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
      <div class="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary"></div>
      <p class="mt-4 text-sm text-muted-foreground">Loading PDF...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { storageManager } from '../utils/storage'
import { databaseService } from '../utils/database'
import { edgeFunctionService } from '../utils/edgeFunctions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Field, FieldLabel, FieldGroup } from '@/components/ui/field'
import { Separator } from '@/components/ui/separator'
import ScribeSelection from '../popup/components/ScribeSelection.vue'

const props = defineProps<{
  pdfUrl: string
  sourceUrl?: string
}>()

// State
const filename = ref('Loading...')
const currentPage = ref(1)
const totalPages = ref(0)
const scale = ref(1.0)
const loading = ref(true)
const selectedText = ref('')
const fullPdfText = ref('')
// Store PDF document outside reactive system to avoid proxy issues with private members
let pdfDocument: any = null
const renderedPages = ref<Map<number, any>>(new Map())
const renderingPages = ref<Set<number>>(new Set()) // Track pages currently being rendered
const scribes = ref<any[]>([])
const showScribeModal = ref(false)
const pendingTextSave = ref<{ text: string; context: string } | null>(null)
const pendingScreenshotSave = ref<{ dataUrl: string; title: string; notes: string; tags: string[]; metadata: any } | null>(null)
const pendingPdfSave = ref<{ title: string; notes: string; tags: string[]; pdfUrl: string; content?: string } | null>(null)
const showScreenshotMenu = ref(false)
const searchQuery = ref('')
const selectedScribeId = ref<string>('')
const newScribeName = ref('')
const isSelectingArea = ref(false)
const selectionOverlay = ref<HTMLElement | null>(null)
const selectionRect = ref<HTMLElement | null>(null)
const selectionStart = ref<{ x: number; y: number } | null>(null)

const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0
})

// Refs
const pdfContainer = ref<HTMLElement>()
const screenshotMenuRef = ref<HTMLElement>()

// Initialize PDF.js
async function initPDF() {
  try {
    loading.value = true
    
    // Wait for PDF.js to be available - check multiple possible locations
    let pdfjsLib = (window as any).pdfjsLib || (window as any)['pdfjs-dist/build/pdf']
    
    if (!pdfjsLib) {
      // Wait a bit for script to load
      for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 100))
        pdfjsLib = (window as any).pdfjsLib || (window as any)['pdfjs-dist/build/pdf']
        if (pdfjsLib) break
      }
    }
    
    if (!pdfjsLib) {
      console.error('PDF.js not found. Available globals:', Object.keys(window).filter(k => k.includes('pdf')))
      throw new Error('PDF.js library not loaded. Please check if lib/pdf.min.js is available.')
    }
    
    console.log('✅ PDF.js library found:', !!pdfjsLib)
    
    // Configure PDF.js worker
    const workerUrl = chrome.runtime.getURL('lib/pdf.worker.min.js')
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl
    console.log('PDF.js worker configured:', workerUrl)

    // Extract filename
    try {
      const url = new URL(props.pdfUrl)
      filename.value = decodeURIComponent(url.pathname.split('/').pop() || 'document.pdf')
    } catch {
      filename.value = 'document.pdf'
    }

    // Load PDF - fetch as ArrayBuffer first to avoid CORS and private member issues
    console.log('Loading PDF from:', props.pdfUrl)
    
    // Validate URL
    if (!props.pdfUrl || typeof props.pdfUrl !== 'string' || props.pdfUrl.trim() === '') {
      throw new Error('Invalid PDF URL: URL is empty or not a string')
    }
    
    // Check if URL looks like a storage path (should have been converted already)
    const looksLikeStoragePath = (
      !props.pdfUrl.startsWith('http://') &&
      !props.pdfUrl.startsWith('https://') &&
      !props.pdfUrl.startsWith('data:') &&
      !props.pdfUrl.startsWith('blob:') &&
      (props.pdfUrl.includes('/') || props.pdfUrl.includes('nabu-ai-object-storage'))
    )
    
    if (looksLikeStoragePath) {
      console.error('❌ PDF URL appears to be a storage path, not a URL:', props.pdfUrl)
      throw new Error('Invalid PDF URL: Storage path detected. The URL should have been converted to a signed or public URL.')
    }
    
    // Try to validate URL format
    let isValidUrl = false
    try {
      new URL(props.pdfUrl)
      isValidUrl = true
    } catch (e) {
      // If URL constructor fails, it might be a data URL or blob URL, which is OK
      if (props.pdfUrl.startsWith('data:') || props.pdfUrl.startsWith('blob:')) {
        isValidUrl = true
      } else {
        console.warn('⚠️ PDF URL might be invalid:', props.pdfUrl)
      }
    }
    
    // Fetch PDF as ArrayBuffer
    let response: Response
    try {
      response = await fetch(props.pdfUrl, {
      mode: 'cors',
        credentials: 'omit',
        headers: {
          'Accept': 'application/pdf,application/octet-stream,*/*'
        }
    })
    } catch (fetchError: any) {
      console.error('❌ Fetch error:', fetchError)
      throw new Error(`Failed to fetch PDF: ${fetchError.message || 'Network error'}. URL: ${props.pdfUrl.substring(0, 100)}...`)
    }
    
    if (!response.ok) {
      // Provide more helpful error messages based on status code
      let errorMsg = `Failed to load PDF: HTTP ${response.status} ${response.statusText}`
      
      if (response.status === 400) {
        errorMsg += '. This usually means the URL is invalid, expired, or requires authentication.'
        if (props.pdfUrl.includes('supabase.co')) {
          errorMsg += ' The signed URL may have expired. Try opening the PDF again.'
        }
      } else if (response.status === 403) {
        errorMsg += '. Access denied. The file may be private or the signed URL has expired.'
      } else if (response.status === 404) {
        errorMsg += '. PDF not found. The file may have been deleted or moved.'
      }
      
      console.error('❌', errorMsg, 'URL:', props.pdfUrl)
      console.error('Response headers:', Object.fromEntries(response.headers.entries()))
      throw new Error(errorMsg)
    }
    
    const arrayBuffer = await response.arrayBuffer()
    console.log('✅ PDF downloaded successfully, size:', arrayBuffer.byteLength, 'bytes')
    
    // Load PDF with PDF.js using ArrayBuffer
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      verbosity: 0
    })
    
    pdfDocument = await loadingTask.promise
    totalPages.value = pdfDocument.numPages
    console.log(`✅ PDF loaded: ${totalPages.value} pages`)
    
    // Store the PDF document reference properly
    if (!pdfDocument) {
      throw new Error('PDF document is null after loading')
    }

    // Extract full PDF text for context (async, don't block)
    extractFullText().catch(err => console.error('Failed to extract text:', err))

    // Wait for container to be ready
    await nextTick()
    
    // Render all pages
    await renderAllPages()
    console.log('✅ All pages rendered')

    // Setup scroll listener
    setupScrollNavigation()

    loading.value = false
  } catch (error: any) {
    console.error('❌ Failed to load PDF:', error)
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      pdfUrl: props.pdfUrl,
      hasPdfjsLib: !!(window as any).pdfjsLib
    })
    alert('Failed to load PDF: ' + (error.message || 'Unknown error'))
    loading.value = false
  }
}

// Extract full PDF text
async function extractFullText() {
  if (!pdfDocument) {
    console.warn('PDF document not available for text extraction')
    return
  }
  
  try {
    const textParts: string[] = []
    const doc = pdfDocument
    
    for (let i = 1; i <= totalPages.value; i++) {
      try {
        // Use the document's getPage method directly
        const page = await doc.getPage(i)
        const textContent = await page.getTextContent()
        const pageText = textContent.items.map((item: any) => item.str).join(' ')
        textParts.push(`Page ${i}:\n${pageText}`)
      } catch (pageError) {
        console.warn(`Failed to extract text from page ${i}:`, pageError)
        textParts.push(`Page ${i}:\n[Text extraction failed]`)
      }
    }
    fullPdfText.value = textParts.join('\n\n')
    console.log(`Extracted ${fullPdfText.value.length} characters from PDF`)
  } catch (error) {
    console.error('Failed to extract PDF text:', error)
    // Don't throw - text extraction is optional
  }
}

// Render all pages
async function renderAllPages() {
  const container = document.getElementById('pdf-pages')
  if (!container || !pdfDocument) return

  container.innerHTML = ''

  for (let i = 1; i <= totalPages.value; i++) {
    await renderPage(i)
  }
}

// Render a single page
async function renderPage(pageNum: number) {
  const container = document.getElementById('pdf-pages')
  if (!container) {
    console.error('PDF pages container not found')
    return
  }
  
  if (!pdfDocument) {
    console.error('PDF document not loaded')
    return
  }

  // Prevent duplicate rendering
  if (renderingPages.value.has(pageNum)) {
    console.log(`Page ${pageNum} is already being rendered, skipping...`)
    return
  }

  try {
    renderingPages.value.add(pageNum)
    console.log(`Rendering page ${pageNum}...`)
    
    // Remove existing page wrapper if it exists (e.g., on zoom/rerender)
    const existingWrapper = container.querySelector(`[data-page-number="${pageNum}"]`)
    if (existingWrapper) {
      existingWrapper.remove()
      // Also remove from renderedPages map
      renderedPages.value.delete(pageNum)
    }
    
    // Get page from document - use the document directly (not through reactive proxy)
    const page = await pdfDocument.getPage(pageNum)
    if (!page) {
      throw new Error(`Failed to get page ${pageNum}`)
    }
    
    const viewport = page.getViewport({ scale: scale.value })
    
    console.log(`Page ${pageNum} viewport:`, {
      width: viewport.width,
      height: viewport.height,
      scale: scale.value
    })

    // Create page wrapper
    const pageWrapper = document.createElement('div')
    pageWrapper.className = 'pdf-page-wrapper'
    pageWrapper.dataset.pageNumber = pageNum.toString()
    pageWrapper.style.width = `${viewport.width}px`
    pageWrapper.style.height = `${viewport.height}px`
    pageWrapper.style.position = 'relative'
    pageWrapper.style.margin = '0 auto 24px auto' // Add bottom margin for page separation
    pageWrapper.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)'
    pageWrapper.style.backgroundColor = '#ffffff'
    pageWrapper.style.minHeight = `${viewport.height}px`
    pageWrapper.style.display = 'block' // Ensure it's a block element

    // Create canvas
    const canvas = document.createElement('canvas')
    canvas.className = 'pdf-canvas'
    canvas.width = viewport.width
    canvas.height = viewport.height
    canvas.style.display = 'block'
    canvas.style.width = `${viewport.width}px`
    canvas.style.height = `${viewport.height}px`
    canvas.style.position = 'relative'
    canvas.style.zIndex = '1'
    canvas.style.pointerEvents = 'none' // Allow text selection to work through canvas
    pageWrapper.appendChild(canvas)

    // Render PDF to canvas
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('Failed to get canvas context')
    }
    
    const renderContext = {
      canvasContext: context,
      viewport: viewport
    }
    
    console.log(`Rendering page ${pageNum} to canvas...`)
    await page.render(renderContext).promise
    console.log(`✅ Page ${pageNum} rendered successfully`)

    // Create text layer for selection - must be positioned exactly over canvas
    const textLayer = document.createElement('div')
    textLayer.className = 'text-layer'
    textLayer.style.position = 'absolute'
    textLayer.style.top = '0'
    textLayer.style.left = '0'
    textLayer.style.width = `${viewport.width}px`
    textLayer.style.height = `${viewport.height}px`
    textLayer.style.pointerEvents = 'auto'
    textLayer.style.userSelect = 'text'
    textLayer.style.zIndex = '10' // Higher z-index to ensure it's above canvas
    textLayer.style.overflow = 'hidden'
    textLayer.style.lineHeight = '1'
    textLayer.style.cursor = 'text'
    
    // IMPORTANT: Clear the text layer container before rendering
    textLayer.innerHTML = ''
    
    // Render text layer
    const textContent = await page.getTextContent()
    await renderTextLayer(textContent, textLayer, viewport)

    pageWrapper.appendChild(textLayer)

    // Setup context menu
    pageWrapper.addEventListener('contextmenu', (e) => handleContextMenu(e, pageNum))

    // Setup image extraction
    extractImagesFromPage(page, pageNum, viewport, pageWrapper).catch(err => 
      console.error('Failed to extract images:', err)
    )

    container.appendChild(pageWrapper)

    renderedPages.value.set(pageNum, { page, viewport, wrapper: pageWrapper })

  } catch (error) {
    console.error(`Failed to render page ${pageNum}:`, error)
  } finally {
    renderingPages.value.delete(pageNum)
  }
}

// Render text layer - simplified approach that works
async function renderTextLayer(textContent: any, container: HTMLElement, viewport: any) {
  const pdfjsLib = (window as any).pdfjsLib || (window as any)['pdfjs-dist/build/pdf']
  
  // IMPORTANT: Clear container before rendering to prevent duplicates
  container.innerHTML = ''
  
  // Simple, reliable manual rendering
  // The transform coordinates from getTextContent() are already in viewport coordinates
  // when the viewport is created with a scale
  let itemCount = 0
  textContent.items.forEach((item: any) => {
    if (!item.str || !item.str.trim()) return

    const textDiv = document.createElement('span')
    textDiv.textContent = item.str
    textDiv.className = 'text-item'
    textDiv.style.position = 'absolute'
    textDiv.style.color = 'transparent'
    textDiv.style.userSelect = 'text'
    textDiv.style.pointerEvents = 'auto'
    textDiv.style.whiteSpace = 'pre'
    textDiv.style.cursor = 'text'
    textDiv.style.lineHeight = '1'
    textDiv.style.fontFamily = item.fontName || 'sans-serif'

    const transform = item.transform
    
    // Transform coordinates are already in viewport coordinate space
    // transform[4] = x, transform[5] = y (baseline in PDF coordinates)
    const x = transform[4]
    
    // Font size from transform matrix
    const fontHeight = Math.abs(transform[3])
    const fontWidth = Math.abs(transform[0])
    
    // PDF Y=0 is at bottom, CSS Y=0 is at top, so flip
    // transform[5] is the baseline Y position in PDF coordinates
    // Convert to CSS coordinates
    const baselineY = viewport.height - transform[5]
    // Position text at baseline - adjust for font baseline (typically ~80% down from top)
    // Use a smaller adjustment for better alignment
    const y = baselineY - (fontHeight * 0.85)
    
    // Debug first few items
    if (itemCount < 5) {
      console.log('Text item:', {
        str: item.str.substring(0, 30),
        transform: transform,
        x: x,
        baselineY: baselineY,
        y: y,
        fontHeight: fontHeight,
        viewportHeight: viewport.height,
        viewportWidth: viewport.width
      })
    }
    
    textDiv.style.left = `${x}px`
    textDiv.style.top = `${y}px`
    textDiv.style.fontSize = `${fontHeight}px`
    textDiv.style.fontFamily = item.fontName || 'sans-serif'
    textDiv.style.lineHeight = '1'
    
    // Ensure text element covers enough area for selection
    // Add padding to prevent selection from breaking when cursor moves slightly
    if (fontWidth > 0) {
      textDiv.style.width = `${fontWidth}px`
    } else {
      // If no width specified, use a minimum width based on text length
      textDiv.style.minWidth = `${Math.max(item.str.length * fontHeight * 0.6, 10)}px`
    }
    textDiv.style.height = `${fontHeight}px`
    textDiv.style.padding = '1px 2px' // Small padding to extend selection area
    textDiv.style.margin = '0'
    
    // Handle text scaling and rotation
    let transformStr = ''
    if (transform[0] < 0) transformStr += 'scaleX(-1) '
    if (transform[3] < 0) transformStr += 'scaleY(-1) '
    if (transformStr) {
      textDiv.style.transform = transformStr.trim()
      textDiv.style.transformOrigin = '0 0'
    }

    container.appendChild(textDiv)
    itemCount++
  })
  
  console.log(`✅ Rendered ${itemCount} text items (from ${textContent.items.length} total)`)
}

// Extract images from page
async function extractImagesFromPage(page: any, pageNum: number, viewport: any, pageWrapper: HTMLElement) {
  try {
    const ops = await page.getOperatorList()
    const images: any[] = []
    const pdfjsLib = (window as any).pdfjsLib || (window as any)['pdfjs-dist/build/pdf']

    for (let i = 0; i < ops.fnArray.length; i++) {
      if (ops.fnArray[i] === pdfjsLib.OPS.paintImageXObject || ops.fnArray[i] === 60) {
        const imageName = ops.argsArray[i][0]
        try {
          const imageObj = await page.objs.get(imageName)
          if (imageObj && imageObj.data) {
            images.push({ name: imageName, obj: imageObj })
          }
        } catch (e) {
          // Skip if image can't be loaded
        }
      }
    }

    if (images.length > 0) {
      const btn = document.createElement('button')
      btn.className = 'absolute top-2 right-2 z-10 rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90'
      btn.innerHTML = `📷 Save ${images.length} Image${images.length > 1 ? 's' : ''}`
      btn.onclick = async () => {
        for (let idx = 0; idx < images.length; idx++) {
          await saveImageFromPage(images[idx].obj, pageNum, idx)
        }
      }
      pageWrapper.appendChild(btn)
    }
  } catch (error) {
    console.error('Failed to extract images:', error)
  }
}

// Handle context menu
function handleContextMenu(e: MouseEvent, pageNum: number) {
  const selection = window.getSelection()
  const text = selection?.toString().trim()

  if (text && text.length > 0) {
    e.preventDefault()
    selectedText.value = text
    contextMenu.value = {
      visible: true,
      x: e.clientX,
      y: e.clientY
    }
  }
}

// Close context menu
function closeContextMenu() {
  contextMenu.value.visible = false
}

// Copy text
function copyText() {
  navigator.clipboard.writeText(selectedText.value)
  closeContextMenu()
}

// Save selected text to scribe
async function saveSelectedText() {
  closeContextMenu()
  
  if (!selectedText.value.trim()) return

  try {
    const userScribes = await databaseService.getUserScribes()
    scribes.value = userScribes
    
    pendingTextSave.value = {
      text: selectedText.value,
      context: fullPdfText.value
    }
    
    showScribeModal.value = true
  } catch (error) {
    console.error('Failed to load scribes:', error)
    alert('Failed to load scribes. Please try again.')
  }
}

// Helper functions
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 2) || '?'
}

const filteredScribes = computed(() => {
  if (!searchQuery.value.trim()) return scribes.value
  const query = searchQuery.value.toLowerCase()
  return scribes.value.filter(scribe => 
    scribe.name.toLowerCase().includes(query)
  )
})

// Select scribe for save (text, screenshot, or full PDF)
function selectScribeForSave(scribeId: string) {
  selectedScribeId.value = scribeId
}

// Handle selection from shared ScribeSelection component
function handleScribeSelection(id: string, name?: string) {
  selectedScribeId.value = id
  if (id === '__new__' && name) {
    newScribeName.value = name
  }
  confirmScribeSelection()
}

// Confirm scribe selection and save
async function confirmScribeSelection() {
  try {
    let finalScribeId = selectedScribeId.value
    
    // Handle new scribe creation
    if (finalScribeId === '__new__') {
      if (!newScribeName.value.trim()) {
        alert('Please enter a scribe name')
        return
      }
      const scribe = await databaseService.createScribe({ name: newScribeName.value.trim() })
      finalScribeId = scribe.id
    }
    
    showScribeModal.value = false
    
    // Save text if pending
    if (pendingTextSave.value) {
      const content = `Selected Text:\n${pendingTextSave.value.text}\n\nFull PDF Context:\n${pendingTextSave.value.context}`

      const docId = await storageManager.saveContent({
        type: 'text',
        title: `PDF Selection - ${filename.value}`,
        url: props.sourceUrl || props.pdfUrl,
        content: content,
        notes: `Selected from PDF: ${filename.value}`,
        tags: ['pdf-selection'],
        metadata: {
          ...(props.sourceUrl ? { sourceUrl: props.sourceUrl } : {}),
          ...(props.pdfUrl ? { pdfUrl: props.pdfUrl } : {}),
          kind: 'pdf-selection'
        },
        scribe_id: finalScribeId || undefined
      } as any)

      console.log('Text saved to scribe:', docId)
      alert('Text saved!')
      pendingTextSave.value = null
    }
    
    // Save screenshot if pending
    if (pendingScreenshotSave.value) {
      const docId = await storageManager.saveContent({
        type: 'image',
        title: pendingScreenshotSave.value.title,
        url: props.sourceUrl || props.pdfUrl,
        content: pendingScreenshotSave.value.dataUrl,
        notes: pendingScreenshotSave.value.notes,
        tags: pendingScreenshotSave.value.tags,
        metadata: {
          ...(pendingScreenshotSave.value.metadata || {}),
          ...(props.sourceUrl ? { sourceUrl: props.sourceUrl } : {}),
          ...(props.pdfUrl ? { pdfUrl: props.pdfUrl } : {}),
          kind: 'pdf-screenshot'
        },
        scribe_id: finalScribeId || undefined
      } as any)

      console.log('Screenshot saved:', docId)
      alert('Screenshot saved!')
      pendingScreenshotSave.value = null
    }

    // Save full PDF if pending
    if (pendingPdfSave.value) {
      const docId = await storageManager.saveContent({
        type: 'pdf',
        title: pendingPdfSave.value.title,
        url: props.sourceUrl || props.pdfUrl,
        content: pendingPdfSave.value.content || pendingPdfSave.value.pdfUrl,
        notes: pendingPdfSave.value.notes,
        tags: pendingPdfSave.value.tags,
        pdfUrl: pendingPdfSave.value.pdfUrl,
        metadata: {
          ...(props.sourceUrl ? { sourceUrl: props.sourceUrl } : {}),
          ...(pendingPdfSave.value.pdfUrl ? { pdfUrl: pendingPdfSave.value.pdfUrl } : {}),
          kind: 'pdf-full'
        },
        scribe_id: finalScribeId || undefined
      } as any)

      console.log('PDF saved:', docId)
      alert('PDF saved!')
      pendingPdfSave.value = null
    }
    
    // Reset state
    selectedScribeId.value = ''
    newScribeName.value = ''
    searchQuery.value = ''
  } catch (error: any) {
    console.error('Failed to save:', error)
    alert('Failed to save: ' + error.message)
  }
}

// Save image from page
async function saveImageFromPage(imageObj: any, pageNum: number, imageIndex: number) {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = imageObj.width
    canvas.height = imageObj.height
    const ctx = canvas.getContext('2d')
    
    if (ctx && imageObj.data) {
      if (imageObj.data instanceof Uint8ClampedArray) {
        const imageData = ctx.createImageData(imageObj.width, imageObj.height)
        imageData.data.set(imageObj.data)
        ctx.putImageData(imageData, 0, 0)
      } else if (imageObj.data instanceof ImageData) {
        ctx.putImageData(imageObj.data, 0, 0)
      }
      
      const dataUrl = canvas.toDataURL('image/png')
      
      await storageManager.saveContent({
        type: 'image',
        title: `Image from ${filename.value} - Page ${pageNum}`,
        url: props.sourceUrl || props.pdfUrl,
        content: dataUrl,
        notes: `Extracted from PDF page ${pageNum}`,
        tags: ['pdf-image'],
        metadata: { pageNumber: pageNum, imageIndex }
      } as any)

      console.log(`Image ${imageIndex + 1} from page ${pageNum} saved!`)
    }
  } catch (error: any) {
    console.error('Failed to save image:', error)
  }
}

// Take screenshot of current page
async function takeCurrentPageScreenshot() {
  showScreenshotMenu.value = false
  
  try {
    const pageWrapper = document.querySelector(`[data-page-number="${currentPage.value}"]`) as HTMLElement
    if (!pageWrapper) {
      alert('Page not found')
      return
    }
    
    const canvas = pageWrapper.querySelector('canvas') as HTMLCanvasElement
    if (!canvas) {
      alert('Canvas not found')
      return
    }
    
    // Convert canvas to image
    const dataUrl = canvas.toDataURL('image/png')
    
    // Load scribes and show selection modal
    const userScribes = await databaseService.getUserScribes()
    scribes.value = userScribes
    
    pendingScreenshotSave.value = {
      dataUrl: dataUrl,
      title: `Screenshot - ${filename.value} - Page ${currentPage.value}`,
      notes: `Screenshot of PDF page ${currentPage.value}`,
      tags: ['screenshot', 'pdf'],
      metadata: { pageNumber: currentPage.value, type: 'current-page' }
    }
    
    selectedScribeId.value = ''
    newScribeName.value = ''
    searchQuery.value = ''
    showScribeModal.value = true
  } catch (error: any) {
    console.error('Failed to take screenshot:', error)
    alert('Failed to take screenshot: ' + error.message)
  }
}

// Start area selection for screenshot
function startAreaSelection() {
  showScreenshotMenu.value = false
  isSelectingArea.value = true
  
  // Create overlay
  const overlay = document.createElement('div')
  overlay.id = 'screenshot-selection-overlay'
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.3);
    z-index: 999998;
    cursor: crosshair;
    user-select: none;
  `
  
  // Create selection rectangle
  const rect = document.createElement('div')
  rect.id = 'screenshot-selection-rect'
  rect.style.cssText = `
    position: absolute;
    border: 2px solid hsl(var(--primary));
    background: rgba(59, 130, 246, 0.1);
    display: none;
    pointer-events: none;
  `
  
  // Create instructions
  const instructions = document.createElement('div')
  instructions.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: hsl(var(--card));
    color: hsl(var(--foreground));
    padding: 12px 20px;
    border-radius: 6px;
    font-size: 14px;
    z-index: 999999;
    pointer-events: none;
    border: 1px solid hsl(var(--border));
  `
  instructions.textContent = 'Click and drag to select area (release to capture or press Escape to cancel)'
  
  overlay.appendChild(rect)
  overlay.appendChild(instructions)
  document.body.appendChild(overlay)
  
  selectionOverlay.value = overlay
  selectionRect.value = rect
  
  let isDragging = false
  
  const handleMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return // Only left mouse button
    isDragging = true
    // Use viewport coordinates directly
    selectionStart.value = {
      x: e.clientX,
      y: e.clientY
    }
    selectionRect.value!.style.display = 'block'
    e.preventDefault()
  }
  
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !selectionStart.value) return
    
    const left = Math.min(selectionStart.value.x, e.clientX)
    const top = Math.min(selectionStart.value.y, e.clientY)
    const width = Math.abs(e.clientX - selectionStart.value.x)
    const height = Math.abs(e.clientY - selectionStart.value.y)
    
    selectionRect.value!.style.left = `${left}px`
    selectionRect.value!.style.top = `${top}px`
    selectionRect.value!.style.width = `${width}px`
    selectionRect.value!.style.height = `${height}px`
  }
  
  const handleMouseUp = async (e: MouseEvent) => {
    if (!isDragging || !selectionStart.value) return
    
    isDragging = false
    const left = Math.min(selectionStart.value.x, e.clientX)
    const top = Math.min(selectionStart.value.y, e.clientY)
    const width = Math.abs(e.clientX - selectionStart.value.x)
    const height = Math.abs(e.clientY - selectionStart.value.y)
    
    if (width > 10 && height > 10) {
      // Capture selected area using viewport coordinates
      await captureSelectedArea(left, top, width, height)
    }
    
    cleanupSelection()
  }
  
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      cleanupSelection()
    }
  }
  
  const cleanupSelection = () => {
    if (selectionOverlay.value) {
      selectionOverlay.value.remove()
      selectionOverlay.value = null
      selectionRect.value = null
      selectionStart.value = null
      isSelectingArea.value = false
    }
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
    document.removeEventListener('keydown', handleEscape)
  }
  
  overlay.addEventListener('mousedown', handleMouseDown)
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
  document.addEventListener('keydown', handleEscape)
}

// Capture selected area
async function captureSelectedArea(viewportLeft: number, viewportTop: number, viewportWidth: number, viewportHeight: number) {
  try {
    // Find the current page canvas
    const pageWrapper = document.querySelector(`[data-page-number="${currentPage.value}"]`) as HTMLElement
    if (!pageWrapper) {
      alert('Page not found')
      return
    }
    
    const canvas = pageWrapper.querySelector('canvas') as HTMLCanvasElement
    if (!canvas) {
      alert('Canvas not found')
      return
    }
    
    // Get canvas position in viewport
    const canvasRect = canvas.getBoundingClientRect()
    
    // Calculate intersection of selection with canvas
    const selectionLeft = Math.max(viewportLeft, canvasRect.left)
    const selectionTop = Math.max(viewportTop, canvasRect.top)
    const selectionRight = Math.min(viewportLeft + viewportWidth, canvasRect.right)
    const selectionBottom = Math.min(viewportTop + viewportHeight, canvasRect.bottom)
    
    // Check if selection overlaps with canvas
    if (selectionLeft >= selectionRight || selectionTop >= selectionBottom) {
      alert('Selection area does not overlap with PDF page')
      return
    }
    
    // Convert viewport coordinates to canvas coordinates
    // Account for canvas scaling (canvas might be displayed at different size than its actual resolution)
    const scaleX = canvas.width / canvasRect.width
    const scaleY = canvas.height / canvasRect.height
    
    const cropLeft = (selectionLeft - canvasRect.left) * scaleX
    const cropTop = (selectionTop - canvasRect.top) * scaleY
    const cropWidth = (selectionRight - selectionLeft) * scaleX
    const cropHeight = (selectionBottom - selectionTop) * scaleY
    
    // Ensure coordinates are within canvas bounds
    const finalLeft = Math.max(0, Math.min(cropLeft, canvas.width))
    const finalTop = Math.max(0, Math.min(cropTop, canvas.height))
    const finalWidth = Math.min(cropWidth, canvas.width - finalLeft)
    const finalHeight = Math.min(cropHeight, canvas.height - finalTop)
    
    if (finalWidth <= 0 || finalHeight <= 0) {
      alert('Invalid selection area')
      return
    }
    
    // Create a new canvas for the cropped area
    const cropCanvas = document.createElement('canvas')
    cropCanvas.width = finalWidth
    cropCanvas.height = finalHeight
    const ctx = cropCanvas.getContext('2d')
    
    if (!ctx) {
      alert('Failed to get canvas context')
      return
    }
    
    // Draw the cropped area from the original canvas
    ctx.drawImage(
      canvas,
      finalLeft, finalTop, finalWidth, finalHeight,
      0, 0, finalWidth, finalHeight
    )
    
    const dataUrl = cropCanvas.toDataURL('image/png')
    
    // Load scribes and show selection modal
    const userScribes = await databaseService.getUserScribes()
    scribes.value = userScribes
    
    pendingScreenshotSave.value = {
      dataUrl: dataUrl,
      title: `Screenshot - ${filename.value} - Selected Area`,
      notes: `Screenshot of selected area from PDF page ${currentPage.value}`,
      tags: ['screenshot', 'pdf', 'partial'],
      metadata: { 
        pageNumber: currentPage.value, 
        type: 'selected-area',
        selection: { left: finalLeft, top: finalTop, width: finalWidth, height: finalHeight }
      }
    }
    
    selectedScribeId.value = ''
    newScribeName.value = ''
    searchQuery.value = ''
    showScribeModal.value = true
  } catch (error: any) {
    console.error('Failed to capture selected area:', error)
    alert('Failed to capture area: ' + error.message)
  }
}

// Save whole PDF (open scribe selector)
async function savePDF() {
  try {
    const userScribes = await databaseService.getUserScribes()
    scribes.value = userScribes

    pendingPdfSave.value = {
      title: filename.value.replace('.pdf', ''),
      notes: `Full PDF: ${filename.value}`,
      tags: ['pdf'],
      pdfUrl: props.pdfUrl,
      content: fullPdfText.value || props.pdfUrl
    }

    selectedScribeId.value = ''
    newScribeName.value = ''
    searchQuery.value = ''
    showScribeModal.value = true
  } catch (error: any) {
    console.error('Failed to prepare PDF save:', error)
    alert('Failed to save PDF: ' + error.message)
  }
}

// Zoom
function zoomIn() {
  scale.value = Math.min(scale.value + 0.25, 3.0)
  renderAllPages()
}

function zoomOut() {
  scale.value = Math.max(scale.value - 0.25, 0.5)
  renderAllPages()
}

// Navigation
function goToPage(pageNum: number) {
  if (pageNum < 1 || pageNum > totalPages.value) return
  currentPage.value = pageNum
  
  const pageWrapper = document.querySelector(`[data-page-number="${pageNum}"]`) as HTMLElement
  if (pageWrapper && pdfContainer.value) {
    pageWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

// Scroll-based navigation
let scrollTimeout: number | null = null
function handleScroll() {
  if (scrollTimeout) {
    clearTimeout(scrollTimeout)
  }
  
  scrollTimeout = window.setTimeout(() => {
    updateCurrentPageFromScroll()
  }, 100)
}

function updateCurrentPageFromScroll() {
  if (!pdfContainer.value) return

  const container = pdfContainer.value
  const scrollTop = container.scrollTop
  const containerHeight = container.clientHeight
  const viewportCenter = scrollTop + containerHeight / 2

  const pages = document.querySelectorAll('.pdf-page-wrapper')
  let newPage = currentPage.value

  pages.forEach((page, index) => {
    const rect = page.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()
    const pageTop = rect.top - containerRect.top + container.scrollTop
    const pageBottom = pageTop + rect.height

    if (viewportCenter >= pageTop && viewportCenter <= pageBottom) {
      newPage = index + 1
    }
  })

  if (newPage !== currentPage.value) {
    currentPage.value = newPage
  }
}

function setupScrollNavigation() {
  if (pdfContainer.value) {
    pdfContainer.value.addEventListener('scroll', handleScroll)
  }
}

// Handle click outside to close menus
function handleClickOutside(e: MouseEvent) {
  const target = e.target as HTMLElement
  
  // Close screenshot menu if clicking outside
  if (screenshotMenuRef.value && !screenshotMenuRef.value.contains(target)) {
    showScreenshotMenu.value = false
  }
  
  // Close context menu
  closeContextMenu()
}

// Lifecycle
onMounted(async () => {
  await nextTick()
  
  // Check if PDF.js is loaded - check both possible locations
  const pdfjsLib = (window as any).pdfjsLib || (window as any)['pdfjs-dist/build/pdf']
  if (!pdfjsLib) {
    console.error('PDF.js not loaded, waiting...')
    // Wait for PDF.js script to load
    let attempts = 0
    while (!pdfjsLib && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100))
      const check = (window as any).pdfjsLib || (window as any)['pdfjs-dist/build/pdf']
      if (check) break
      attempts++
    }
    
    const finalCheck = (window as any).pdfjsLib || (window as any)['pdfjs-dist/build/pdf']
    if (!finalCheck) {
      alert('PDF.js library failed to load. Please refresh the page.')
      return
    }
  }
  
  console.log('PDF.js loaded, initializing viewer...')
  await initPDF()
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  if (scrollTimeout) {
    clearTimeout(scrollTimeout)
  }
  // Cleanup selection overlay if still active
  if (selectionOverlay.value) {
    selectionOverlay.value.remove()
  }
})
</script>

<style scoped>
.text-layer {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: auto;
  user-select: text;
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
  z-index: 10;
  cursor: text;
  /* Ensure selection works across the entire layer */
  -webkit-touch-callout: default;
  -webkit-tap-highlight-color: transparent;
}

.text-item {
  position: absolute;
  color: transparent;
  user-select: text;
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
  pointer-events: auto;
  cursor: text;
  z-index: 1;
  /* Ensure text selection works across elements */
  white-space: pre;
  /* Prevent gaps that break selection */
  margin: 0;
  padding: 1px 2px;
  box-sizing: border-box;
}

.text-item::selection {
  background: rgba(59, 130, 246, 0.3);
}

.text-item::-moz-selection {
  background: rgba(59, 130, 246, 0.3);
}
</style>
