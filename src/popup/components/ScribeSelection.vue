<template>
  <div class="w-full h-full flex flex-col bg-background">
    <!-- Header -->
    <div class="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
      <h2 class="text-sm font-semibold text-foreground">Select Scribe</h2>
      <Button
        variant="ghost"
        size="icon"
        @click="$emit('back')"
        class="h-8 w-8"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </Button>
    </div>

    <!-- Search -->
    <div class="flex-shrink-0 px-4 py-2 border-b border-border">
      <div class="relative">
        <svg class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <Input
          v-model="searchQuery"
          type="text"
          placeholder="Search..."
          class="pl-10"
        />
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto px-4 py-2 space-y-3 min-h-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <!-- Quick Option -->
      <div class="space-y-1">
        <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Options</p>
        <button
          @click="selectScribe('')"
          class="w-full text-left px-3 py-2 rounded-md text-sm transition-colors hover:bg-accent"
          :class="selectedScribeId === '' ? 'bg-primary/10 text-primary' : 'text-foreground'"
        >
          No scribe
        </button>
      </div>

      <!-- Create New Scribe Section -->
      <div class="space-y-2">
        <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Create New</p>
        <button
          @click="selectScribe('__new__')"
          class="w-full text-left px-3 py-2 rounded-md text-sm transition-colors hover:bg-accent border border-dashed"
          :class="selectedScribeId === '__new__' ? 'bg-primary/10 border-primary text-primary' : 'border-border text-foreground'"
        >
          <div class="flex items-center gap-2">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            <span>New scribe</span>
          </div>
        </button>

        <!-- New Scribe Name Input -->
        <div v-if="selectedScribeId === '__new__'" class="px-1">
          <Input
            v-model="newScribeName"
            type="text"
            placeholder="Enter scribe name..."
            @keyup.enter="confirmSelection"
          />
        </div>
      </div>

      <!-- Existing Scribes -->
      <div v-if="!isLoading && !loadError" class="space-y-2">
        <div class="flex items-center justify-between mb-1">
          <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Existing Scribes</p>
          <span v-if="filteredScribes.length > 0" class="text-xs text-muted-foreground">{{ filteredScribes.length }}</span>
        </div>

        <div v-if="filteredScribes.length === 0" class="py-4 text-center">
          <p class="text-sm text-muted-foreground">No scribes found</p>
        </div>

        <div v-else class="space-y-1">
          <button
            v-for="scribe in filteredScribes"
            :key="scribe.id"
            @click="selectScribe(scribe.id)"
            class="w-full text-left px-3 py-2 rounded-md text-sm transition-colors hover:bg-accent"
            :class="selectedScribeId === scribe.id ? 'bg-primary/10 text-primary' : 'text-foreground'"
          >
            <div class="flex items-center justify-between">
              <span>{{ scribe.name || 'Untitled' }}</span>
              <span class="text-xs text-muted-foreground ml-2">{{ scribe.documentCount || 0 }} docs</span>
            </div>
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="py-4 text-center">
        <p class="text-sm text-muted-foreground">Loading...</p>
      </div>

      <!-- Error State -->
      <div v-if="loadError" class="py-4 text-center space-y-2">
        <p class="text-sm text-destructive">{{ loadError }}</p>
        <Button variant="outline" size="sm" @click="loadScribes()">
          Retry
        </Button>
      </div>
    </div>

    <!-- Footer -->
    <div class="flex-shrink-0 flex items-center gap-2 border-t border-border px-4 py-3">
      <Button
        @click="confirmSelection"
        :disabled="selectedScribeId === '__new__' && !newScribeName.trim()"
        class="flex-1"
      >
        Confirm
      </Button>
      <Button
        variant="outline"
        @click="$emit('back')"
      >
        Cancel
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { databaseService } from '../../utils/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const props = defineProps<{
  selectedScribeId?: string
  newScribeName?: string
}>()

const emit = defineEmits<{
  (e: 'select', scribeId: string, scribeName?: string): void
  (e: 'back'): void
}>()

const scribes = ref<Array<{ id: string; name: string; documentCount?: number }>>([])
const searchQuery = ref('')
const selectedScribeId = ref(props.selectedScribeId || '')
const newScribeName = ref(props.newScribeName || '')
const isLoading = ref(false)
const loadError = ref<string | null>(null)

watch(() => props.selectedScribeId, (val) => {
  selectedScribeId.value = val || ''
})
watch(() => props.newScribeName, (val) => {
  newScribeName.value = val || ''
})

const filteredScribes = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return scribes.value
  return scribes.value.filter(s => 
    (s.name || 'Untitled').toLowerCase().includes(q)
  )
})

function selectScribe(id: string) {
  selectedScribeId.value = id
  if (id !== '__new__') {
    newScribeName.value = ''
  }
}

function confirmSelection() {
  if (selectedScribeId.value === '__new__') {
    if (!newScribeName.value.trim()) {
      return
    }
    emit('select', '__new__', newScribeName.value.trim())
  } else {
    emit('select', selectedScribeId.value)
  }
}

async function loadScribes() {
  isLoading.value = true
  loadError.value = null
  
  try {
    const list = await databaseService.getUserScribes()
    
    if (!list || list.length === 0) {
      scribes.value = []
      return
    }
    
    const withCounts = await Promise.all(list.map(async (s) => {
      try {
        const docs = await databaseService.getDocumentsByScribe(s.id)
        return { ...s, documentCount: docs.length }
      } catch (e) {
        return { ...s, documentCount: 0 }
      }
    }))
    
    scribes.value = withCounts.map(s => ({
      id: s.id,
      name: s.name || 'Untitled',
      documentCount: s.documentCount || 0
    }))
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'Failed to load scribes'
    loadError.value = errorMessage
    scribes.value = []
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadScribes()
})
</script>
