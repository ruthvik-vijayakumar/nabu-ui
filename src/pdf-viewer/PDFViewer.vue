<template>
  <div class="pdf-viewer-container">
    <!-- Header -->
    <div class="header">
      <div class="header-left">
        <div class="logo">N</div>
        <span class="app-name">NabuAI</span>
        <div class="pdf-info">
          <svg class="pdf-icon" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"></path>
          </svg>
          <span class="filename">{{ filename }}</span>
        </div>
      </div>
      <div class="header-right">
        <button @click="openOriginal" class="btn btn-secondary">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
          </svg>
          Open Original
        </button>
        <button @click="showSaveModal" class="btn btn-primary">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path>
          </svg>
          Save to NabuAI
        </button>
      </div>
    </div>
    
    <!-- PDF Toolbar -->
    <div class="pdf-toolbar">
      <div class="toolbar-left">
        <div class="toolbar-group">
          <button @click="goToPage(currentPage - 1)" :disabled="currentPage <= 1" class="btn btn-icon" title="Previous Page">
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
            </svg>
          </button>
          <div class="page-input-group">
            <input 
              type="number" 
              :value="currentPage" 
              @change="goToPage(parseInt(($event.target as HTMLInputElement).value))"
              @keyup.enter="goToPage(parseInt(($event.target as HTMLInputElement).value))"
              :min="1" 
              :max="totalPages"
              class="page-input"
            />
            <span class="page-separator">/</span>
            <span class="total-pages">{{ totalPages }}</span>
          </div>
          <button @click="goToPage(currentPage + 1)" :disabled="currentPage >= totalPages" class="btn btn-icon" title="Next Page">
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </button>
        </div>
      </div>
      
      <div class="toolbar-center">
        <div class="annotation-section">
          <div class="annotation-tools">
            <button 
              v-for="tool in tools" 
              :key="tool.id"
              @click="setTool(tool.id)"
              :class="['annotation-tool', { active: currentTool === tool.id }]"
              :title="tool.title"
            >
              <svg v-if="tool.id === 'select'" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"></path>
              </svg>
              <svg v-else-if="tool.id === 'highlight'" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"></path>
              </svg>
              <svg v-else-if="tool.id === 'note'" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
              </svg>
              <svg v-else-if="tool.id === 'draw'" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
              </svg>
              <svg v-else-if="tool.id === 'eraser'" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
              <span class="tool-name">{{ tool.name }}</span>
            </button>
          </div>
          
          <div class="color-picker" v-if="currentTool !== 'select'">
            <div 
              v-for="color in colors" 
              :key="color.id"
              @click="setColor(color.id)"
              :class="['color-option', { active: currentColor === color.id }]"
              :style="{ background: color.value }"
              :title="color.name"
            ></div>
          </div>
        </div>
      </div>
      
      <div class="toolbar-right">
        <div class="toolbar-group">
          <button @click="changeZoom(scale - 0.25)" class="btn btn-icon" title="Zoom Out">
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"></path>
            </svg>
          </button>
          <div class="zoom-display">{{ Math.round(scale * 100) }}%</div>
          <button @click="changeZoom(scale + 0.25)" class="btn btn-icon" title="Zoom In">
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7"></path>
            </svg>
          </button>
        </div>
        <div class="toolbar-separator"></div>
        <button @click="saveAnnotations" class="btn btn-primary btn-compact" title="Save Annotations">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path>
          </svg>
          <span>Save</span>
        </button>
      </div>
    </div>
    
    <!-- PDF Viewer -->
    <div class="pdf-viewer" ref="pdfViewer">
      <div v-if="!loading && !error" id="pdf-container" class="pdf-container">
        <div id="pdf-canvas-container" class="pdf-canvas-container" ref="canvasContainer">
          <!-- PDF pages will be rendered here -->
        </div>
      </div>
      
      <div v-if="loading" class="loading">
        <div class="spinner"></div>
        <p class="loading-text">Loading PDF...</p>
        <p class="loading-subtext">Please wait while we prepare your document</p>
      </div>
      
      <div v-if="error" class="error">
        <div class="error-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="10" stroke-width="2"></circle>
            <path d="M12 8v4M12 16h.01" stroke-width="2" stroke-linecap="round"></path>
          </svg>
        </div>
        <h3>Failed to Load PDF</h3>
        <p class="error-message">{{ error }}</p>
        <button @click="reload" class="btn btn-primary">Try Again</button>
      </div>
    </div>
    
    <!-- Save Modal -->
    <SaveModal 
      v-if="showSaveModalFlag"
      :pdf-url="pdfUrl"
      :source-url="sourceUrl"
      :filename="filename"
      @close="showSaveModalFlag = false"
      @save="savePDF"
    />
    
    <!-- Note Modal -->
    <NoteModal 
      v-if="showNoteModalFlag"
      @close="cancelNote"
      @save="saveNote"
    />
    
    <!-- Text Selection Notification -->
    <div v-if="selectedText" class="text-notification">
      <div class="notification-content">
        <div class="notification-title">📋 Text Selected & Copied:</div>
        <div class="notification-text">{{ selectedText }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import SaveModal from './components/SaveModal.vue'
import NoteModal from './components/NoteModal.vue'
import { PDFViewerEngine } from './PDFViewerEngine'
import type { Annotation, Tool, Color, NoteRequestContext } from './types'

// Props
const props = defineProps<{
  pdfUrl: string
  sourceUrl?: string
}>()

// Reactive state
const filename = ref('Loading PDF...')
const currentPage = ref(1)
const totalPages = ref(0)
const scale = ref(1.0)
const loading = ref(true)
const error = ref('')
const showSaveModalFlag = ref(false)
const showNoteModalFlag = ref(false)
const selectedText = ref('')

// Annotation state
const currentTool = ref<Tool>('select')
const currentColor = ref<Color>('yellow')
const annotations = ref<Map<number, Annotation[]>>(new Map())
let pendingNoteResolver: ((value?: string) => void) | null = null

// Refs
const pdfViewer = ref<HTMLElement>()
const canvasContainer = ref<HTMLElement>()

// PDF Engine
let pdfEngine: PDFViewerEngine | null = null

// Tools configuration
const tools: Array<{ id: Tool; name: string; title: string; icon: string }> = [
  { id: 'select', name: 'Select', title: 'Select Tool', icon: 'SelectIcon' },
  { id: 'highlight', name: 'Highlight', title: 'Highlight Text', icon: 'HighlightIcon' },
  { id: 'note', name: 'Note', title: 'Add Note', icon: 'NoteIcon' },
  { id: 'draw', name: 'Draw', title: 'Draw', icon: 'DrawIcon' },
  { id: 'eraser', name: 'Eraser', title: 'Eraser', icon: 'EraserIcon' }
]

// Colors configuration
const colors: Array<{ id: Color; name: string; value: string }> = [
  { id: 'yellow', name: 'Yellow', value: '#ffeb3b' },
  { id: 'green', name: 'Green', value: '#4caf50' },
  { id: 'blue', name: 'Blue', value: '#2196f3' },
  { id: 'red', name: 'Red', value: '#f44336' },
  { id: 'orange', name: 'Orange', value: '#ff9800' }
]

// Methods
const initPDFViewer = async () => {
  try {
    loading.value = true
    error.value = ''
    
    pdfEngine = new PDFViewerEngine({
      pdfUrl: props.pdfUrl,
      sourceUrl: props.sourceUrl,
      onPageChange: (page: number, total: number) => {
        currentPage.value = page
        totalPages.value = total
      },
      onFilenameChange: (name: string) => {
        filename.value = name
      },
      onLoadingChange: (isLoading: boolean) => {
        loading.value = isLoading
      },
      onError: (err: string) => {
        error.value = err
      },
      onTextSelected: (text: string) => {
        selectedText.value = text
        setTimeout(() => {
          selectedText.value = ''
        }, 3000)
      },
      onAnnotationsChange: (newAnnotations: Map<number, Annotation[]>) => {
        annotations.value = newAnnotations
      },
      onNoteRequested: handleNoteRequest
    })
    
    await pdfEngine.init()
    
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to initialize PDF viewer'
  }
}

const goToPage = async (pageNum: number) => {
  if (pdfEngine && pageNum >= 1 && pageNum <= totalPages.value) {
    await pdfEngine.goToPage(pageNum)
  }
}

const changeZoom = async (newScale: number) => {
  if (pdfEngine) {
    await pdfEngine.changeZoom(newScale)
    scale.value = newScale
  }
}

const setTool = (tool: Tool) => {
  currentTool.value = tool
  pdfEngine?.setTool(tool)
}

const setColor = (color: Color) => {
  currentColor.value = color
  pdfEngine?.setColor(color)
}

const handleNoteRequest = (_context: NoteRequestContext) => {
  pendingNoteResolver?.(undefined)
  showNoteModalFlag.value = true
  return new Promise<string | undefined>((resolve) => {
    pendingNoteResolver = resolve
  })
}

const showSaveModal = () => {
  showSaveModalFlag.value = true
}

const savePDF = async (data: any) => {
  try {
    console.log('💾 Saving PDF to NabuAI:', data)
    showSaveModalFlag.value = false
    
    // Show loading state
    loading.value = true
    
    // Extract text content from PDF if engine is available
    let extractedText = ''
    if (pdfEngine) {
      try {
        extractedText = await pdfEngine.extractAllText()
        console.log('📄 Extracted text from PDF:', extractedText.substring(0, 200) + '...')
      } catch (err) {
        console.warn('⚠️ Failed to extract PDF text:', err)
      }
    }
    
    // Send save request to background script
    const response = await chrome.runtime.sendMessage({
      action: 'saveContent',
      data: {
        type: 'pdf',
        title: data.title || filename.value,
        url: props.sourceUrl || props.pdfUrl,
        content: extractedText || props.pdfUrl, // Use extracted text or fallback to URL
        pdfUrl: props.pdfUrl, // Original PDF URL for downloading
        tags: data.tags || [],
        notes: data.notes || '',
        timestamp: new Date().toISOString(),
        metadata: {
          filename: filename.value,
          totalPages: totalPages.value,
          sourceUrl: props.sourceUrl
        }
      }
    })
    
    if (response && response.success) {
      console.log('✅ PDF saved successfully:', response.id)
      // Show success message
      alert(`PDF "${data.title || filename.value}" saved successfully to NabuAI!`)
    } else {
      throw new Error(response?.error || 'Failed to save PDF')
    }
  } catch (error) {
    console.error('❌ Error saving PDF:', error)
    alert('Failed to save PDF: ' + (error instanceof Error ? error.message : 'Unknown error'))
  } finally {
    loading.value = false
  }
}

const saveNote = (noteText: string) => {
  const trimmed = noteText.trim()
  if (!trimmed) return
  showNoteModalFlag.value = false
  pendingNoteResolver?.(trimmed)
  pendingNoteResolver = null
}

const cancelNote = () => {
  showNoteModalFlag.value = false
  pendingNoteResolver?.(undefined)
  pendingNoteResolver = null
}

const saveAnnotations = async () => {
  if (pdfEngine) {
    await pdfEngine.saveAnnotationsToNabuAI()
  }
}

const openOriginal = () => {
  window.open(props.pdfUrl, '_blank')
}

const reload = () => {
  initPDFViewer()
}

// Lifecycle
onMounted(async () => {
  await nextTick()
  await initPDFViewer()
})

onUnmounted(() => {
  if (pdfEngine) {
    pdfEngine.destroy()
  }
})
</script>

<style scoped>
/* Import the existing styles */
@import './pdf-viewer.css';
</style>
