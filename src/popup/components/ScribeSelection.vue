<template>
  <Card class="w-full min-w-96 max-w-96 min-h-96 max-h-[520px] flex flex-col bg-background">
    <CardHeader class="px-4 py-3 pb-2">
      <div class="flex items-start justify-between gap-4">
        <div>
          <CardDescription class="text-[11px] uppercase tracking-[0.35em] text-muted-foreground">
            Scribe
          </CardDescription>
          <CardTitle class="text-base">Select destination</CardTitle>
        </div>
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
    </CardHeader>

    <CardContent class="flex-1 px-4 py-3 pt-1 space-y-4 flex flex-col">
      <div class="relative">
        <svg class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <Input
          v-model="searchQuery"
          type="text"
          placeholder="Search or create"
          class="pl-10"
        />
      </div>

      <div class="space-y-4 flex-1 overflow-y-auto pr-1">
        <div class="space-y-2">
          <p class="text-xs uppercase tracking-[0.3em] text-muted-foreground">Quick actions</p>
          <Button
            variant="outline"
            @click="selectScribe('')"
            class="w-full justify-between h-auto py-3"
            :class="selectedScribeId === '' ? 'border-primary bg-primary/10 text-primary-foreground' : ''"
          >
            <div class="flex items-center gap-3">
              <span class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground text-xs">—</span>
              <div class="text-left">
                <p class="font-medium leading-tight">No scribe</p>
                <p class="text-xs text-muted-foreground">Keep this item unlinked</p>
              </div>
            </div>
            <span v-if="selectedScribeId === ''" class="rounded-full bg-primary/15 text-primary px-2 py-0.5 text-[10px] font-semibold uppercase">
              Active
            </span>
          </Button>

          <Button
            variant="outline"
            @click="selectScribe('__new__')"
            class="w-full justify-between h-auto py-3 border-dashed"
            :class="selectedScribeId === '__new__' ? 'border-primary bg-primary/10 text-primary-foreground' : ''"
          >
            <div class="flex items-center gap-3">
              <span class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary">
                <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                </svg>
              </span>
              <div class="text-left">
                <p class="font-medium leading-tight">Create new</p>
                <p class="text-xs text-muted-foreground">Start a fresh conversation</p>
              </div>
            </div>
            <span v-if="selectedScribeId === '__new__'" class="rounded-full bg-primary/15 text-primary px-2 py-0.5 text-[10px] font-semibold uppercase">
              Active
            </span>
          </Button>

          <Card v-if="selectedScribeId === '__new__'" class="border-primary/40 bg-card">
            <CardContent class="p-4">
              <FieldGroup>
                <Field>
                  <FieldLabel class="text-xs uppercase tracking-wide">New scribe name</FieldLabel>
                  <Input
                    v-model="newScribeName"
                    type="text"
                    placeholder="e.g. Research Notes"
                    class="mt-1.5"
                    @keyup.enter="confirmSelection"
                  />
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>
        </div>

        <Separator />

        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <p class="text-xs uppercase tracking-[0.3em] text-muted-foreground">Existing scribes</p>
            <span class="text-xs text-muted-foreground">{{ filteredScribes.length }}</span>
          </div>
          <div class="space-y-2">
            <Button
              v-for="scribe in filteredScribes"
              :key="scribe.id"
              variant="outline"
              @click="selectScribe(scribe.id)"
              class="w-full justify-between h-auto py-3"
              :class="selectedScribeId === scribe.id ? 'border-primary bg-primary/10 text-primary-foreground' : ''"
            >
              <div class="flex items-center gap-2.5">
                <span class="inline-flex h-5.5 w-5.5 items-center justify-center rounded-full bg-primary/20 text-[9px] font-semibold text-primary">
                  {{ getInitials(scribe.name) }}
                </span>
                <div class="min-w-0 text-left">
                  <p class="truncate font-medium leading-tight">{{ scribe.name || 'Untitled Conversation' }}</p>
                  <p class="text-xs text-muted-foreground">{{ scribe.documentCount || 0 }} docs</p>
                </div>
              </div>
              <svg v-if="selectedScribeId === scribe.id" class="h-3.5 w-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
            </Button>
          </div>
          <Card v-if="filteredScribes.length === 0" class="border-dashed">
            <CardContent class="px-4 py-6 text-center text-sm text-muted-foreground">
              No scribes found.
            </CardContent>
          </Card>
        </div>
      </div>
    </CardContent>

    <div class="flex items-center gap-2 border-t border-border px-4 py-3">
      <template v-if="isLoading">
        <div class="flex items-center justify-center py-6 text-sm text-muted-foreground">
          Loading scribes…
        </div>
      </template>

      <template v-else-if="loadError">
        <Card class="border-destructive/50 bg-destructive/10">
          <CardContent class="p-4">
            <div class="flex items-center justify-between">
              <span class="text-sm text-destructive-foreground">{{ loadError }}</span>
              <Button variant="link" size="sm" @click="loadScribes()" class="text-xs font-semibold uppercase tracking-wide h-auto p-0">
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </template>

      <template v-else>
        <div class="space-y-2">
          <Button
            variant="outline"
            @click="selectScribe('')"
            class="w-full justify-between h-auto py-3"
            :class="selectedScribeId === '' ? 'border-primary bg-primary/10 text-primary-foreground' : ''"
          >
            <div class="flex items-center gap-3">
              <span class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground text-xs">—</span>
              <div class="text-left">
                <p class="font-medium">No scribe</p>
                <p class="text-xs text-muted-foreground">Keep this item unlinked</p>
              </div>
            </div>
            <span v-if="selectedScribeId === ''" class="text-[11px] font-semibold uppercase text-primary">Active</span>
          </Button>

          <Button
            variant="outline"
            @click="selectScribe('__new__')"
            class="w-full justify-between h-auto py-3 border-dashed"
            :class="selectedScribeId === '__new__' ? 'border-primary bg-primary/10 text-primary-foreground' : ''"
          >
            <div class="flex items-center gap-3">
              <span class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary">
                <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                </svg>
              </span>
              <div class="text-left">
                <p class="font-medium">Create new</p>
                <p class="text-xs text-muted-foreground">Start a fresh conversation</p>
              </div>
            </div>
            <span v-if="selectedScribeId === '__new__'" class="text-[11px] font-semibold uppercase text-primary">Active</span>
          </Button>

          <Card v-if="selectedScribeId === '__new__'" class="border-primary/40 bg-card">
            <CardContent class="p-4">
              <FieldGroup>
                <Field>
                  <FieldLabel class="text-xs uppercase tracking-wide">New scribe name</FieldLabel>
                  <Input
                    v-model="newScribeName"
                    type="text"
                    placeholder="e.g. Research Notes"
                    class="mt-1.5"
                    @keyup.enter="confirmSelection"
                  />
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>
        </div>

        <div class="pt-4">
          <p class="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2">Existing</p>
          <div class="space-y-2">
            <Button
              v-for="scribe in filteredScribes"
              :key="scribe.id"
              variant="outline"
              @click="selectScribe(scribe.id)"
              class="w-full justify-between h-auto py-3"
              :class="selectedScribeId === scribe.id ? 'border-primary bg-primary/10 text-primary-foreground' : ''"
            >
              <div class="flex items-center gap-2.5">
                <span class="inline-flex h-5.5 w-5.5 items-center justify-center rounded-full bg-primary/20 text-[9px] font-semibold text-primary">
                  {{ getInitials(scribe.name) }}
                </span>
                <div class="min-w-0 text-left">
                  <p class="truncate font-medium">{{ scribe.name || 'Untitled Conversation' }}</p>
                  <p class="text-xs text-muted-foreground">{{ scribe.documentCount || 0 }} docs</p>
                </div>
              </div>
              <svg v-if="selectedScribeId === scribe.id" class="h-3.5 w-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
            </Button>
          </div>
          <Card v-if="filteredScribes.length === 0" class="border-dashed mt-3">
            <CardContent class="px-4 py-6 text-center text-sm text-muted-foreground">
              No scribes found.
            </CardContent>
          </Card>
        </div>
      </template>
    </div>

    <div class="flex items-center gap-2 border-t border-border px-4 py-3">
      <Button
        @click="confirmSelection"
        :disabled="selectedScribeId === '__new__' && !newScribeName.trim()"
        class="flex-1"
        size="lg"
      >
        Use selection
      </Button>
      <Button
        variant="outline"
        @click="$emit('back')"
        size="lg"
      >
        Cancel
      </Button>
    </div>
  </Card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { databaseService } from '../../utils/database'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Field, FieldLabel, FieldGroup } from '@/components/ui/field'
import { Separator } from '@/components/ui/separator'

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

// Watch for prop changes
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
    (s.name || 'Untitled Conversation').toLowerCase().includes(q)
  )
})

function getInitials(name?: string) {
  const source = (name || 'Untitled Conversation').trim()
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }
  return source.charAt(0).toUpperCase() || 'S'
}

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
    console.log('🔄 Loading scribes for selection...')
    const list = await databaseService.getUserScribes()
    console.log('📋 Loaded', list.length, 'scribes from database')
    
    if (!list || list.length === 0) {
      console.log('ℹ️ No scribes found, user may need to create one')
      scribes.value = []
      return
    }
    
    const withCounts = await Promise.all(list.map(async (s) => {
      try {
        const docs = await databaseService.getDocumentsByScribe(s.id)
        return { ...s, documentCount: docs.length }
      } catch (e) {
        console.warn('Failed to load document count for scribe:', s.id, e)
        return { ...s, documentCount: 0 }
      }
    }))
    
    scribes.value = withCounts.map(s => ({
      id: s.id,
      name: s.name || 'Untitled Conversation',
      documentCount: s.documentCount || 0
    }))
    
    console.log('✅ Scribes loaded for selection:', scribes.value.length)
    console.log('📋 Scribe names:', scribes.value.map(s => s.name))
  } catch (e) {
    console.error('❌ Failed to load scribes:', e)
    const errorMessage = e instanceof Error ? e.message : 'Unknown error'
    console.error('❌ Error details:', {
      message: errorMessage,
      error: e
    })
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

