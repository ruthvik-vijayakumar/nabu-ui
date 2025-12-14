<template>
  <div class="dark min-h-screen bg-background text-foreground">
    <!-- Header -->
    <div class="border-b border-border bg-card">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div class="flex items-center justify-between">
          <h1 class="text-xl font-semibold text-foreground">NabuAI</h1>
          <div class="flex items-center gap-3">
            <Button
              size="sm"
              @click="showCreateModal = true"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
              Create Scribe
            </Button>
            <!-- Profile Menu -->
            <div class="relative" data-profile-menu @click.stop>
              <Button
                variant="ghost"
                size="sm"
                @click="showProfileMenu = !showProfileMenu"
                class="h-8 w-8 p-0 rounded-full bg-muted hover:bg-muted/80"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
              </Button>
              <Card
                v-if="showProfileMenu"
                class="absolute right-0 top-10 z-50 w-48 p-1"
              >
                <CardContent class="p-0">
                  <Button
                    variant="ghost"
                    @click="exportData; showProfileMenu = false"
                    class="w-full justify-start text-sm py-1 px-3 h-8"
                  >
                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                    Export
                  </Button>
                  <Button
                    variant="ghost"
                    @click="handleLogout; showProfileMenu = false"
                    class="w-full justify-start text-sm py-1 px-3 h-8"
                  >
                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                    Logout
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Stats Panel -->
      <div class="border-t border-border bg-muted/30">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <div class="flex flex-wrap items-center gap-6 text-sm">
            <div class="flex items-center gap-2">
              <span v-if="isLoading" class="h-5 w-8 rounded bg-muted animate-pulse"></span>
              <span v-else class="text-lg font-semibold text-foreground">{{ scribeStats.total }}</span>
              <span class="text-muted-foreground">Total scribes</span>
            </div>
            <div class="flex items-center gap-2">
              <span v-if="isLoading" class="h-5 w-8 rounded bg-muted animate-pulse"></span>
              <span v-else class="text-lg font-semibold text-foreground">{{ scribeStats.shared }}</span>
              <span class="text-muted-foreground">Shared with you</span>
            </div>
            <div class="flex items-center gap-2">
              <span v-if="isLoading" class="h-5 w-8 rounded bg-muted animate-pulse"></span>
              <span v-else class="text-lg font-semibold text-foreground">{{ scribeStats.totalDocuments }}</span>
              <span class="text-muted-foreground">Documents saved</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div class="relative flex-1">
          <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 z-10">
            <svg class="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>
          <Input
            v-model="searchQuery"
            type="text"
            placeholder="Search scribes, domains or collaborators..."
            class="pl-10"
          />
        </div>
        <div class="flex items-center gap-2">
          <Button
            v-for="option in filterOptions"
            :key="option.value"
            @click="handleFilterChange(option.value)"
            :variant="filterMode === option.value ? 'default' : 'outline'"
            size="sm"
            class="relative h-9 px-4"
          >
            <span>{{ option.label }}</span>
            <Badge 
              :variant="filterMode === option.value ? 'secondary' : 'outline'"
              class="ml-2 h-5 min-w-[20px] px-1.5 text-xs font-semibold"
            >
              {{ filterCounts[option.value] }}
            </Badge>
          </Button>
        </div>
      </div>

      <div class="space-y-6">
        <div class="space-y-6">
          <div v-if="isLoading" class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Card
              v-for="n in 6"
              :key="n"
              class="animate-pulse"
            >
              <CardContent class="p-5">
                <!-- Header -->
                <div class="flex items-start justify-between gap-3">
                  <div class="flex items-center gap-3">
                    <div class="h-12 w-12 rounded-lg bg-muted"></div>
                    <div class="space-y-2">
                      <div class="h-4 w-32 rounded bg-muted"></div>
                      <div class="h-3 w-24 rounded bg-muted"></div>
                    </div>
                  </div>
                  <div class="h-8 w-8 rounded bg-muted"></div>
                </div>

                <!-- Body -->
                <div class="mt-4 space-y-2">
                  <div class="h-4 w-full rounded bg-muted"></div>
                  <div class="h-4 w-5/6 rounded bg-muted"></div>
                  <div class="h-4 w-4/6 rounded bg-muted"></div>
                </div>

                <!-- Footer -->
                <div class="mt-4 flex flex-wrap gap-2">
                  <div class="h-6 w-16 rounded-full bg-muted"></div>
                  <div class="h-6 w-20 rounded-full bg-muted"></div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card v-else-if="loadError" class="border-destructive/50">
            <CardContent class="p-10 text-center">
              <svg class="mx-auto mb-4 h-12 w-12 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <CardTitle class="text-lg">We couldn't load your scribes</CardTitle>
              <p class="mt-2 text-sm text-muted-foreground">{{ loadError }}</p>
              <Button
                variant="destructive"
                @click="loadScribes()"
                class="mt-6"
              >
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                Try again
              </Button>
            </CardContent>
          </Card>

          <Card v-else-if="emptyState" class="border-dashed">
            <CardContent class="p-10 text-center">
              <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              </div>
              <CardTitle class="mt-4 text-xl">No scribes match your filters</CardTitle>
              <p class="mt-2 text-sm text-muted-foreground">Create a new workspace or adjust the filters above.</p>
              <div class="mt-6 flex flex-wrap justify-center gap-3">
                <Button
                  variant="outline"
                  @click="handleFilterChange('all')"
                >
                  Reset filters
                </Button>
                <Button
                  variant="default"
                  @click="showCreateModal = true"
                >
                  Create scribe
                </Button>
              </div>
            </CardContent>
          </Card>

          <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Card
              v-for="s in filteredScribes"
              :key="s.id"
              @click="handleOpenScribe(s.id)"
              class="group relative overflow-hidden cursor-pointer transition hover:border-primary/50 hover:bg-accent/50"
              :class="{ 'border-green-500/40 bg-green-500/10': s.is_shared }"
            >
              <CardContent class="p-5">
                <div class="flex items-start justify-between gap-3">
                  <div class="flex items-center gap-3">
                    <div class="h-12 w-12 rounded-lg bg-primary/20 flex items-center justify-center">
                      <svg class="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                      </svg>
                    </div>
                    <div>
                      <CardTitle class="text-base line-clamp-1">{{ s.name || 'Untitled Conversation' }}</CardTitle>
                      <p class="text-xs text-muted-foreground">{{ s.model || 'Default model' }}</p>
                    </div>
                  </div>
                  <div class="relative" data-menu-container>
                    <Button
                      variant="ghost"
                      size="icon"
                      @click.stop="openMenu(s.id)"
                      class="h-8 w-8"
                    >
                      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
                    </Button>
                    <Card
                      v-if="menuOpen === s.id"
                      class="absolute right-0 top-10 z-50 w-48 p-1"
                    >
                      <CardContent class="p-0">
                        <template v-if="!s.is_shared">
                          <Button variant="ghost" @click.stop="handleEdit(s)" class="w-full justify-start text-sm py-1 px-3 h-8">
                            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                            Edit
                          </Button>
                          <Button variant="ghost" @click.stop="handleShare(s)" class="w-full justify-start text-sm py-1 px-3 h-8">
                            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
                            Share
                          </Button>
                          <Button variant="ghost" @click.stop="handleDelete(s)" class="w-full justify-start text-sm text-destructive py-1 px-3 h-8">
                            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                            Delete
                          </Button>
                        </template>
                        <div v-else class="px-3 py-1.5 text-xs text-muted-foreground">Shared by {{ s.shared_by_user_email || 'a collaborator' }}</div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <div class="mt-4 space-y-3 text-sm text-muted-foreground">
                  <p class="line-clamp-3 min-h-[48px] text-foreground">
                    {{ s.lastAssistantMessage || s.description || 'Conversations saved from the extension appear here with full metadata and RAG-ready context.' }}
                  </p>
                  <div class="flex flex-wrap gap-2 text-xs">
                    <span class="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-1 text-foreground">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                      {{ s.documentCount || 0 }} docs
                    </span>
                    <span class="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-1 text-foreground">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                      {{ timeAgo(s.updated_at || s.created_at) }}
                    </span>
                    <span v-if="s.is_shared" class="inline-flex items-center gap-1 rounded-full border border-green-500/50 bg-green-500/10 px-2.5 py-1 text-green-300">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
                      Shared access
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

      </div>
    </div>

    <!-- Create Scribe Modal -->
    <CreateScribeModal
      :isOpen="showCreateModal"
      @close="showCreateModal = false"
      @create="handleCreateScribe"
    />

    <!-- Share Scribe Modal -->
    <ShareScribeModal
      :isOpen="showShareModal"
      :scribeId="selectedScribeForShare?.id || ''"
      :scribeName="selectedScribeForShare?.name || ''"
      @close="showShareModal = false"
      @shared="handleShareSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, onBeforeUnmount } from 'vue'
import { storageManager } from '../utils/storage'
import { databaseService } from '../utils/database'
import { getCurrentUser, signOut, clearUserCache } from '../utils/auth'
import CreateScribeModal from './components/CreateScribeModal.vue'
import ShareScribeModal from './components/ShareScribeModal.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
const emit = defineEmits<{ (e: 'back'): void; (e: 'open-scribe', id: string): void }>()

type FilterMode = 'all' | 'owned' | 'shared'

const searchQuery = ref('')
const scribes = ref<any[]>([])
const menuOpen = ref<string | null>(null)
const isLoading = ref(false)
const loadError = ref<string | null>(null)
const showCreateModal = ref(false)
const showShareModal = ref(false)
const showProfileMenu = ref(false)
const selectedScribeForShare = ref<any>(null)
const filterMode = ref<FilterMode>('all')
const filterOptions = [
  { label: 'All scribes', value: 'all' as FilterMode },
  { label: 'Owned', value: 'owned' as FilterMode },
  { label: 'Shared', value: 'shared' as FilterMode }
]
const filterCounts = computed(() => {
  const shared = scribes.value.filter(s => s.is_shared).length
  return {
    all: scribes.value.length,
    owned: scribes.value.length - shared,
    shared
  }
})
const filteredScribes = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  return scribes.value
    .filter(s => {
      if (filterMode.value === 'owned') return !s.is_shared
      if (filterMode.value === 'shared') return Boolean(s.is_shared)
      return true
    })
    .filter(s => (s.name || '').toLowerCase().includes(q))
})
const emptyState = computed(() => !isLoading.value && !loadError.value && filteredScribes.value.length === 0)
const scribeStats = computed(() => {
  const total = scribes.value.length
  const shared = scribes.value.filter(s => s.is_shared).length
  const totalDocuments = scribes.value.reduce((sum, s) => sum + (s.documentCount || 0), 0)
  const latestTimestamp = scribes.value.reduce((latest, s) => {
    const date = new Date(s.updated_at || s.created_at).getTime()
    return date > latest ? date : latest
  }, 0)

  return {
    total,
    shared,
    totalDocuments,
    lastUpdated: latestTimestamp ? timeAgo(new Date(latestTimestamp).toISOString()) : '—'
  }
})
const currentUserName = ref<string | null>(null)
const workspaceTitle = computed(() => {
  if (!currentUserName.value) return 'Your Workspace'
  const name = currentUserName.value
  const suffix = /s$/i.test(name) ? '\'' : '\'s'
  return `${name}${suffix} Workspace`
})

onMounted(async () => {
  await loadCurrentUser()
  await loadScribes()
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})

async function loadScribes() {
  isLoading.value = true
  loadError.value = null
  
  try {
    console.log('🔄 Loading scribes in dashboard...')
    const list = await databaseService.getUserScribes()
    console.log('📋 Loaded', list.length, 'scribes from database')
    
    if (!list || list.length === 0) {
      console.log('ℹ️ No scribes found')
      scribes.value = []
      return
    }
    
    const withCounts = await Promise.all(list.map(async (s) => {
      try {
        const [docs, lastAssistantMessage] = await Promise.all([
          databaseService.getDocumentsByScribe(s.id),
          databaseService.getLastAssistantMessage(s.id)
        ])
        return { ...s, documentCount: docs.length, lastAssistantMessage }
      } catch (e) {
        console.warn('Failed to load scribe meta:', s.id, e)
        return { ...s, documentCount: 0, lastAssistantMessage: null }
      }
    }))
    
    scribes.value = withCounts
    console.log('✅ Scribes loaded in dashboard:', scribes.value.length)
  } catch (e) {
    console.error('❌ Failed to load scribes in dashboard:', e)
    const errorMessage = e instanceof Error ? e.message : 'Unknown error'
    loadError.value = errorMessage
    scribes.value = []
  } finally {
    isLoading.value = false
  }
}

async function loadCurrentUser() {
  try {
    const { user } = await getCurrentUser()
    if (user) {
      const displayName =
        (user.user_metadata && (user.user_metadata.full_name || user.user_metadata.name)) ||
        (user.email ? user.email.split('@')[0] : null)
      currentUserName.value = displayName
    }
  } catch (err) {
    console.warn('Failed to load user info for workspace title:', err)
  }
}
function openMenu(scribeId: string) {
  menuOpen.value = menuOpen.value === scribeId ? null : scribeId
}

function handleClickOutside(e: MouseEvent) {
  const target = e.target as HTMLElement
  // Close menu if clicking outside the menu container
  if (!target.closest('[data-menu-container]')) {
    menuOpen.value = null
  }
  // Close profile menu if clicking outside
  if (!target.closest('[data-profile-menu]')) {
    showProfileMenu.value = false
  }
}

async function handleEdit(scribe: any) {
  menuOpen.value = null
  const newName = prompt('Edit scribe name:', scribe.name)
  if (newName && newName.trim() && newName !== scribe.name) {
    isLoading.value = true
    try {
      await databaseService.updateScribe(scribe.id, { name: newName.trim() })
      await loadScribes()
    } catch (e) {
      console.error('Failed to update scribe:', e)
      alert(`Failed to update scribe: ${e instanceof Error ? e.message : 'Unknown error'}`)
      await loadScribes() // Reload to refresh state
    } finally {
      isLoading.value = false
    }
  }
}

function handleShare(scribe: any) {
  menuOpen.value = null
  selectedScribeForShare.value = scribe
  showShareModal.value = true
}

function handleShareSuccess() {
  // Reload scribes to show updated share information if needed
  loadScribes()
}

async function handleDelete(scribe: any) {
  menuOpen.value = null
  if (confirm(`Delete "${scribe.name}"? This cannot be undone.`)) {
    isLoading.value = true
    try {
      await databaseService.deleteScribe(scribe.id)
      await loadScribes()
    } catch (e) {
      console.error('Failed to delete scribe:', e)
      alert(`Failed to delete scribe: ${e instanceof Error ? e.message : 'Unknown error'}`)
      await loadScribes() // Reload to refresh state
    } finally {
      isLoading.value = false
    }
  }
}

async function handleCreateScribe(data: { name: string; model?: string }) {
  isLoading.value = true
  try {
    await databaseService.createScribe({ 
      name: data.name,
      model: data.model || 'gpt-4'
    })
    await loadScribes()
    showCreateModal.value = false
  } catch (e) {
    console.error('Failed to create scribe:', e)
    alert(`Failed to create scribe: ${e instanceof Error ? e.message : 'Unknown error'}`)
    await loadScribes() // Reload to refresh state
  } finally {
    isLoading.value = false
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

async function handleLogout() {
  try {
    // Sign out from Supabase
    await signOut()
    
    // Clear all caches
    clearUserCache()
    databaseService.clearUserCache()
    
    // Clear chrome.storage.local session
    await chrome.storage.local.remove('supabase_session')
    
    // Notify background script to clear session
    chrome.runtime.sendMessage({
      action: 'clearAuthSession'
    }).catch(() => {}) // Ignore errors if background script is not ready
    
    console.log('✅ Logged out successfully')
    
    // Close the dashboard tab since user is logged out
    // Get current tab and close it
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tabs[0]?.id) {
      chrome.tabs.remove(tabs[0].id)
    }
  } catch (error: any) {
    console.error('❌ Error logging out:', error)
    alert(`Failed to logout: ${error?.message || 'Unknown error'}`)
  }
}

function handleFilterChange(mode: FilterMode) {
  filterMode.value = mode
}

function timeAgo(iso: string) {
  const d = new Date(iso)
  const diff = Math.floor((Date.now() - d.getTime()) / 1000)
  if (diff < 60) return 'just now'
  const m = Math.floor(diff/60); if (m < 60) return `${m} min ago`
  const h = Math.floor(m/60); if (h < 24) return `${h} hours ago`
  const w = Math.floor(h/24/7); if (w >= 1) return `${w} week${w>1?'s':''} ago`
  const days = Math.floor(h/24); return `${days} day${days>1?'s':''} ago`
}

function handleOpenScribe(id: string) {
  emit('open-scribe', id)
}
</script>
