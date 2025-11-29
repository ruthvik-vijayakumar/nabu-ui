<template>
  <div class="relative" ref="root">
    <div class="flex items-center justify-between mb-2">
      <label class="text-sm font-semibold text-gray-100 flex items-center gap-2">
        <span class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/10 text-blue-300">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3"/>
          </svg>
        </span>
        Scribe Conversation
      </label>
      <span class="text-xs text-gray-500">{{ props.items.length }} available</span>
    </div>

    <button
      type="button"
      @click="toggle"
      class="w-full rounded-2xl border border-gray-700/80 bg-gradient-to-r from-gray-900 to-gray-900/60 px-4 py-3 text-left shadow-inner transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70 hover:border-gray-500/80"
    >
      <div class="flex items-center justify-between gap-4">
        <div class="min-w-0">
          <p class="text-sm font-medium truncate" :class="labelTextClass">{{ displayLabel }}</p>
          <p class="text-xs text-gray-500 mt-0.5 truncate">{{ helperText }}</p>
        </div>
        <div class="flex items-center gap-2">
          <span
            v-if="props.modelValue"
            class="px-2 py-0.5 text-xs rounded-full border"
            :class="props.modelValue === '__new__'
              ? 'border-purple-500/30 bg-purple-500/10 text-purple-200'
              : 'border-blue-500/30 bg-blue-500/10 text-blue-200'"
          >
            {{ props.modelValue === '__new__' ? 'New' : 'Linked' }}
          </span>
          <svg
            class="w-4 h-4 text-gray-400 transition-transform duration-200"
            :class="{ 'rotate-180': open }"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </div>
      </div>
    </button>

    <transition name="fade-scale">
      <div
        v-if="open"
        class="absolute left-0 right-0 z-30 mt-3 rounded-2xl border border-gray-700/80 bg-gray-950/95 shadow-2xl backdrop-blur"
      >
        <div class="p-3 border-b border-gray-800">
          <div class="relative">
            <span class="absolute inset-y-0 left-3 flex items-center text-gray-500 pointer-events-none">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-5.2-5.2m1.7-4.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z"/>
              </svg>
            </span>
            <input
              ref="searchInput"
              v-model="query"
              type="text"
              placeholder="Search scribes..."
              class="w-full rounded-xl border border-gray-700 bg-gray-900/80 py-2.5 pl-10 pr-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/70"
            />
          </div>
          <p class="text-xs text-gray-500 mt-2 flex items-center gap-1">
            <svg class="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5"/>
            </svg>
            Press Esc to close • {{ filtered.length }} result{{ filtered.length === 1 ? '' : 's' }}
          </p>
        </div>

        <div class="p-3 space-y-2">
          <button
            type="button"
            @click="select('')"
            class="w-full rounded-xl border border-dashed border-gray-700 px-3 py-2 text-left text-sm text-gray-300 transition hover:border-blue-500/50 hover:bg-blue-500/5 flex items-center gap-3"
          >
            <span class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-800 text-gray-400">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </span>
            <div class="flex-1">
              <p class="font-medium text-gray-100">No scribe</p>
              <p class="text-xs text-gray-500">Keep this content unlinked</p>
            </div>
            <span v-if="!props.modelValue" class="text-xs text-blue-300">Active</span>
          </button>

          <button
            type="button"
            @click="select('__new__')"
            class="w-full rounded-xl border border-purple-500/30 bg-gradient-to-r from-purple-500/10 to-blue-500/10 px-3 py-2 text-left text-sm text-gray-100 transition hover:from-purple-500/20 hover:to-blue-500/20 flex items-center gap-3"
          >
            <span class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/20 text-purple-200">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
              </svg>
            </span>
            <div class="flex-1">
              <p class="font-medium">Create new scribe</p>
              <p class="text-xs text-purple-200/70">Start a fresh conversation</p>
            </div>
            <span class="text-xs text-purple-200" v-if="props.modelValue === '__new__'">Selected</span>
          </button>
        </div>

        <div class="px-3 pb-3">
          <p class="text-xs uppercase tracking-wide text-gray-500 mb-2">Existing scribes</p>

          <div class="max-h-64 overflow-y-auto pr-1 space-y-1 custom-scroll">
            <button
              v-for="s in filtered"
              :key="s.id"
              type="button"
              @click="select(s.id)"
              class="w-full rounded-xl border px-3 py-2 flex items-center justify-between text-left transition"
              :class="props.modelValue === s.id
                ? 'border-blue-500/50 bg-blue-500/10'
                : 'border-gray-800 hover:border-blue-500/30 hover:bg-gray-900/80'"
            >
              <div class="flex items-center gap-3 min-w-0">
                <div class="h-8 w-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-xs font-semibold text-blue-200">
                  {{ initials(s.name) }}
                </div>
                <div class="min-w-0">
                  <p class="text-sm font-medium text-gray-100 truncate">{{ s.name || 'Untitled Conversation' }}</p>
                  <p class="text-xs text-gray-500">Linked scribe</p>
                </div>
              </div>
              <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          </div>

          <div
            v-if="filtered.length === 0"
            class="mt-3 rounded-xl border border-dashed border-gray-700 p-4 text-center text-sm text-gray-500"
          >
            No scribes match your search.
          </div>
        </div>

        <div v-if="modelValue === '__new__'" class="px-3 pb-4 border-t border-gray-800 pt-3">
          <label class="text-xs font-medium text-gray-400 mb-1 block">New scribe name</label>
          <input
            ref="newScribeInput"
            v-model="newNameInner"
            type="text"
            placeholder="e.g. Research Notes"
            class="w-full rounded-xl border border-purple-500/40 bg-gray-900/70 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/60"
          />
          <p class="text-xs text-gray-500 mt-2">We'll create this scribe the next time you save.</p>
        </div>
      </div>
    </transition>

    <p class="text-xs text-gray-500 mt-3 flex items-start gap-2">
      <svg class="w-3.5 h-3.5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
      Link content to a scribe to keep related conversations together.
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

interface Item { id: string; name: string }

const props = defineProps<{ items: Item[]; modelValue: string; newName: string }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void; (e: 'update:newName', v: string): void }>()

const open = ref(false)
const query = ref('')
const newNameInner = ref(props.newName)

const root = ref<HTMLElement | null>(null)
const searchInput = ref<HTMLInputElement | null>(null)
const newScribeInput = ref<HTMLInputElement | null>(null)

watch(() => props.newName, (v) => { newNameInner.value = v })
watch(newNameInner, (v) => emit('update:newName', v))

const filtered = computed(() => {
  const q = query.value.toLowerCase().trim()
  if (!q) return props.items
  return props.items.filter(i => (i.name || 'Untitled Conversation').toLowerCase().includes(q))
})

const displayLabel = computed(() => {
  if (props.modelValue === '__new__') return newNameInner.value || 'Name your new scribe'
  const sel = props.items.find(i => i.id === props.modelValue)
  return sel?.name || 'No scribe selected'
})

const helperText = computed(() => {
  if (props.modelValue === '__new__') {
    return newNameInner.value ? `Creating “${newNameInner.value}”` : 'Provide a name for your new scribe'
  }
  if (!props.modelValue) return 'Optional: link this content to a scribe'
  const sel = props.items.find(i => i.id === props.modelValue)
  return sel?.name ? `Linked to ${sel.name}` : 'Linked to an untitled scribe'
})

const labelTextClass = computed(() => {
  if (props.modelValue === '__new__') return 'text-purple-200'
  if (props.modelValue) return 'text-blue-200'
  return 'text-gray-200'
})

function toggle() { open.value = !open.value }

function select(val: string) {
  emit('update:modelValue', val)
  if (val !== '__new__') {
    emit('update:newName', '')
    open.value = false
  } else {
    nextTick(() => {
      open.value = true
      newScribeInput.value?.focus()
    })
  }
}

function initials(name?: string) {
  const source = (name || 'Untitled Conversation').trim()
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }
  return source.charAt(0).toUpperCase() || 'S'
}

function handleClickOutside(event: MouseEvent) {
  if (!open.value) return
  if (root.value && !root.value.contains(event.target as Node)) {
    open.value = false
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') open.value = false
}

watch(open, (value) => {
  if (value) {
    nextTick(() => {
      searchInput.value?.focus()
    })
  } else {
    query.value = ''
  }
})

watch(() => props.modelValue, (value) => {
  if (value === '__new__') {
    nextTick(() => newScribeInput.value?.focus())
  }
})

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside)
  document.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleClickOutside)
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
}
.custom-scroll {
  scrollbar-width: thin;
  scrollbar-color: #475569 transparent;
}
.custom-scroll::-webkit-scrollbar {
  width: 6px;
}
.custom-scroll::-webkit-scrollbar-thumb {
  background-color: #475569;
  border-radius: 999px;
}
</style>
