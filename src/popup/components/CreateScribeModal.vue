<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        @click.self="handleClose"
      >
        <div class="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl border border-gray-700/60 shadow-2xl w-full max-w-md overflow-hidden">
          <!-- Header -->
          <div class="px-6 py-5 border-b border-gray-700/60 bg-gray-900/30 backdrop-blur">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-lg">
                  <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                  </svg>
                </div>
                <div>
                  <h2 class="text-lg font-bold text-white">Create New Scribe</h2>
                  <p class="text-xs text-gray-400">Start a new conversation</p>
                </div>
              </div>
              <button
                @click="handleClose"
                class="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800/50 rounded-lg transition"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- Content -->
          <div class="p-6 space-y-5">
            <!-- Name Input -->
            <div>
              <label for="scribeName" class="block text-sm font-medium text-gray-300 mb-2">
                Scribe Name <span class="text-red-400">*</span>
              </label>
              <input
                id="scribeName"
                v-model="scribeName"
                type="text"
                placeholder="e.g., Research Notes, Project Ideas..."
                class="w-full px-4 py-3 rounded-xl border border-gray-700/60 bg-gray-900/60 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                :class="{ 'border-red-500/50 focus:ring-red-500/50': error }"
                @keyup.enter="handleCreate"
                autofocus
              />
              <p v-if="error" class="mt-2 text-sm text-red-400">{{ error }}</p>
              <p v-else class="mt-2 text-xs text-gray-500">Give your scribe a descriptive name</p>
            </div>

            <!-- Optional: Model Selection -->
            <div>
              <label for="scribeModel" class="block text-sm font-medium text-gray-300 mb-2">
                AI Model (Optional)
              </label>
              <select
                id="scribeModel"
                v-model="selectedModel"
                class="w-full px-4 py-3 rounded-xl border border-gray-700/60 bg-gray-900/60 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
              >
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-4-turbo">GPT-4 Turbo</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                <option value="claude-3-opus">Claude 3 Opus</option>
                <option value="claude-3-sonnet">Claude 3 Sonnet</option>
              </select>
              <p class="mt-2 text-xs text-gray-500">Choose the AI model for this scribe</p>
            </div>
          </div>

          <!-- Footer -->
          <div class="px-6 py-4 border-t border-gray-700/60 bg-gray-900/30 backdrop-blur flex items-center justify-end gap-3">
            <button
              @click="handleClose"
              class="px-4 py-2 rounded-lg border border-gray-700/60 bg-gray-800/50 text-gray-300 hover:bg-gray-800/70 transition"
            >
              Cancel
            </button>
            <button
              @click="handleCreate"
              :disabled="isCreating || !scribeName.trim()"
              class="px-6 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium hover:from-purple-700 hover:to-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <svg
                v-if="isCreating"
                class="w-4 h-4 animate-spin"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              <span>{{ isCreating ? 'Creating...' : 'Create Scribe' }}</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'create', data: { name: string; model?: string }): void
}>()

const scribeName = ref('')
const selectedModel = ref('gpt-4')
const error = ref('')
const isCreating = ref(false)

function handleEscape(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.isOpen && !isCreating.value) {
    emit('close')
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleEscape)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleEscape)
})

watch(() => props.isOpen, (open) => {
  if (open) {
    scribeName.value = ''
    selectedModel.value = 'gpt-4'
    error.value = ''
    isCreating.value = false
    // Focus input after modal opens
    setTimeout(() => {
      const input = document.getElementById('scribeName') as HTMLInputElement
      if (input) input.focus()
    }, 100)
  }
})

function handleClose() {
  if (!isCreating.value) {
    emit('close')
  }
}

async function handleCreate() {
  if (!scribeName.value.trim()) {
    error.value = 'Scribe name is required'
    return
  }

  if (scribeName.value.trim().length > 255) {
    error.value = 'Scribe name must be less than 255 characters'
    return
  }

  error.value = ''
  isCreating.value = true

  try {
    emit('create', {
      name: scribeName.value.trim(),
      model: selectedModel.value
    })
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to create scribe'
    isCreating.value = false
  }
}
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-active .bg-gradient-to-br,
.modal-leave-active .bg-gradient-to-br {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .bg-gradient-to-br,
.modal-leave-to .bg-gradient-to-br {
  transform: scale(0.95);
  opacity: 0;
}
</style>

