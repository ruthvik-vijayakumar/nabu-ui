<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-white border-b border-gray-200 px-4 py-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div class="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <span class="text-white font-bold text-sm">N</span>
          </div>
          <div>
            <h1 class="text-lg font-semibold text-gray-900">NabuAI Dashboard</h1>
            <p class="text-sm text-gray-500">Your saved content</p>
          </div>
        </div>
        <button
          @click="$emit('back')"
          class="text-gray-400 hover:text-gray-600"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    </div>

    <!-- Stats -->
    <div class="p-4">
      <div class="grid grid-cols-5 gap-4 mb-6">
        <div class="bg-white rounded-lg p-4 text-center">
          <div class="text-2xl font-bold text-primary-600">{{ stats.totalItems }}</div>
          <div class="text-sm text-gray-500">Total Items</div>
        </div>
        <div class="bg-white rounded-lg p-4 text-center">
          <div class="text-2xl font-bold text-green-600">{{ stats.byType.page || 0 }}</div>
          <div class="text-sm text-gray-500">Pages</div>
        </div>
        <div class="bg-white rounded-lg p-4 text-center">
          <div class="text-2xl font-bold text-blue-600">{{ stats.byType.text || 0 }}</div>
          <div class="text-sm text-gray-500">Text</div>
        </div>
        <div class="bg-white rounded-lg p-4 text-center">
          <div class="text-2xl font-bold text-purple-600">{{ stats.byType.screenshot || 0 }}</div>
          <div class="text-sm text-gray-500">Screenshots</div>
        </div>
        <div class="bg-white rounded-lg p-4 text-center">
          <div class="text-2xl font-bold text-red-600">{{ stats.byType.pdf || 0 }}</div>
          <div class="text-sm text-gray-500">PDFs</div>
        </div>
      </div>

      <!-- Search -->
      <div class="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <div class="flex space-x-2">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search saved content..."
            class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
          <button
            @click="searchContent"
            class="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            Search
          </button>
        </div>
      </div>

      <!-- Content List -->
      <div class="space-y-3">
        <div
          v-for="item in filteredContent"
          :key="item.id"
          class="bg-white rounded-lg border border-gray-200 p-4"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center space-x-2 mb-2">
                <span class="px-2 py-1 text-xs font-medium rounded-full"
                      :class="getTypeBadgeClass(item.type)">
                  {{ item.type }}
                </span>
                <span class="text-xs text-gray-500">{{ formatDate(item.timestamp) }}</span>
              </div>
              
              <h3 class="font-medium text-gray-900 mb-1">{{ item.title }}</h3>
              <p class="text-sm text-gray-600 mb-2">{{ item.url }}</p>
              
              <!-- Screenshot Preview -->
              <div v-if="item.type === 'screenshot' && item.content" class="mb-2">
                <img 
                  :src="item.content" 
                  :alt="item.title"
                  class="w-32 h-20 object-cover rounded border border-gray-200 cursor-pointer"
                  @click="openScreenshotPreview(item.content, item.title)"
                />
              </div>
              
              <div v-if="item.notes" class="text-sm text-gray-700 mb-2">
                {{ item.notes }}
              </div>
              
              <div v-if="item.tags.length > 0" class="flex flex-wrap gap-1 mb-2">
                <span
                  v-for="tag in item.tags"
                  :key="tag"
                  class="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                >
                  {{ tag }}
                </span>
              </div>
              
              <!-- PDF Preview -->
              <div v-if="item.type === 'pdf'" class="mb-2">
                <button
                  @click="openPDFInViewer(item.content, item.url)"
                  class="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  📄 Open in NabuAI Viewer
                </button>
              </div>
            </div>
            
            <div class="flex space-x-2">
              <button
                @click="openUrl(item.url)"
                class="text-blue-600 hover:text-blue-700"
                title="Open URL"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                </svg>
              </button>
              <button
                @click="deleteContent(item.id)"
                class="text-red-600 hover:text-red-700"
                title="Delete"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="filteredContent.length === 0" class="text-center py-8">
        <div class="text-gray-400 mb-4">
          <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
        </div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">No content found</h3>
        <p class="text-gray-500">Start saving content to see it here</p>
      </div>

      <!-- Actions -->
      <div class="mt-6 space-y-3">
        <button
          @click="exportData"
          class="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200"
        >
          Export All Data
        </button>
        <button
          @click="clearAllData"
          class="w-full bg-red-100 text-red-700 px-4 py-2 rounded-md hover:bg-red-200"
        >
          Clear All Data
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { storageManager, type SavedContent } from '../utils/storage'

const emit = defineEmits(['back'])

const content = ref<SavedContent[]>([])
const searchQuery = ref('')
const stats = ref({
  totalItems: 0,
  totalSize: 0,
  byType: {}
})

const filteredContent = computed(() => {
  if (!searchQuery.value) return content.value
  
  const query = searchQuery.value.toLowerCase()
  return content.value.filter(item => 
    item.title.toLowerCase().includes(query) ||
    item.notes?.toLowerCase().includes(query) ||
    item.tags.some(tag => tag.toLowerCase().includes(query)) ||
    item.url.toLowerCase().includes(query)
  )
})

onMounted(async () => {
  await loadContent()
  await loadStats()
})

async function loadContent() {
  content.value = await storageManager.getAllContent()
}

async function loadStats() {
  stats.value = await storageManager.getStorageStats()
}

async function searchContent() {
  if (searchQuery.value) {
    content.value = await storageManager.searchContent(searchQuery.value)
  } else {
    await loadContent()
  }
}

async function deleteContent(id: string) {
  if (confirm('Are you sure you want to delete this item?')) {
    await storageManager.deleteContent(id)
    await loadContent()
    await loadStats()
  }
}

async function clearAllData() {
  if (confirm('Are you sure you want to delete ALL saved content? This cannot be undone!')) {
    for (const item of content.value) {
      await storageManager.deleteContent(item.id)
    }
    await loadContent()
    await loadStats()
  }
}

async function exportData() {
  const data = await storageManager.exportContent()
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `nabu-ai-export-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function openUrl(url: string) {
  chrome.tabs.create({ url })
}

function openPDFInViewer(pdfUrl: string, sourceUrl: string) {
  // Create PDF viewer URL with parameters
  const viewerUrl = chrome.runtime.getURL('pdf-viewer.html')
  const params = new URLSearchParams({
    url: pdfUrl,
    source: sourceUrl
  })
  
  const fullViewerUrl = `${viewerUrl}?${params.toString()}`
  
  // Open PDF viewer in new tab
  chrome.tabs.create({
    url: fullViewerUrl,
    active: true
  })
}

function openScreenshotPreview(imageSrc: string, title: string) {
  // Create a new tab with the screenshot
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title} - NabuAI Screenshot</title>
      <style>
        body { 
          margin: 0; 
          padding: 20px; 
          background: #f5f5f5; 
          display: flex; 
          justify-content: center; 
          align-items: center; 
          min-height: 100vh; 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .container { 
          background: white; 
          border-radius: 8px; 
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); 
          padding: 20px; 
          max-width: 90vw; 
          max-height: 90vh; 
          overflow: auto;
        }
        img { 
          max-width: 100%; 
          height: auto; 
          border-radius: 4px; 
        }
        h1 { 
          margin: 0 0 20px 0; 
          color: #333; 
          font-size: 24px; 
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>${title}</h1>
        <img src="${imageSrc}" alt="${title}" />
      </div>
    </body>
    </html>
  `
  
  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  chrome.tabs.create({ url })
}

function getTypeBadgeClass(type: string): string {
  const classes = {
    page: 'bg-blue-100 text-blue-800',
    text: 'bg-green-100 text-green-800',
    image: 'bg-purple-100 text-purple-800',
    video: 'bg-orange-100 text-orange-800',
    screenshot: 'bg-indigo-100 text-indigo-800',
    pdf: 'bg-red-100 text-red-800'
  }
  return classes[type as keyof typeof classes] || 'bg-gray-100 text-gray-800'
}

function formatDate(timestamp: string): string {
  return new Date(timestamp).toLocaleDateString()
}
</script>
