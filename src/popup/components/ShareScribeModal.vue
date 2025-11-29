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
                <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                  <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
                  </svg>
                </div>
                <div>
                  <h2 class="text-lg font-bold text-white">Share Scribe</h2>
                  <p class="text-xs text-gray-400">{{ scribeName }}</p>
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
            <!-- Email Input -->
            <div>
              <label for="shareEmail" class="block text-sm font-medium text-gray-300 mb-2">
                Email Address <span class="text-red-400">*</span>
              </label>
              <input
                id="shareEmail"
                v-model="email"
                type="email"
                placeholder="user@example.com"
                class="w-full px-4 py-3 rounded-xl border border-gray-700/60 bg-gray-900/60 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all"
                :class="{ 'border-red-500/50 focus:ring-red-500/50': error }"
                @keyup.enter="handleShare"
                :disabled="isLoading"
                autofocus
              />
              <p v-if="error" class="mt-2 text-sm text-red-400">{{ error }}</p>
              <p v-else class="mt-2 text-xs text-gray-500">
                Enter the email address of the person you want to share with
              </p>
            </div>

            <!-- Success Message -->
            <div v-if="success" class="p-4 rounded-xl bg-green-500/10 border border-green-500/30">
              <div class="flex items-center gap-3">
                <svg class="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                <p class="text-sm text-green-300">{{ success }}</p>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="px-6 py-5 border-t border-gray-700/60 bg-gray-900/30 backdrop-blur flex items-center justify-end gap-3">
            <button
              @click="handleClose"
              class="px-4 py-2.5 rounded-xl border border-gray-700/60 bg-gray-800/50 text-gray-300 hover:bg-gray-800/70 hover:text-white transition-all font-medium text-sm"
              :disabled="isLoading"
            >
              Cancel
            </button>
            <button
              @click="handleShare"
              :disabled="isLoading || !email.trim()"
              class="px-4 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 transition-all font-medium text-sm shadow-lg shadow-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <svg v-if="isLoading" class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
              </svg>
              {{ isLoading ? 'Sharing...' : 'Share' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { databaseService } from '../../utils/database'

const props = defineProps<{
  isOpen: boolean
  scribeId: string
  scribeName: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'shared'): void
}>()

const email = ref('')
const error = ref('')
const success = ref('')
const isLoading = ref(false)

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    // Reset form when modal opens
    email.value = ''
    error.value = ''
    success.value = ''
    isLoading.value = false
  }
})

function handleClose() {
  if (isLoading.value) return
  emit('close')
}

async function handleShare() {
  if (!email.value.trim()) {
    error.value = 'Please enter an email address'
    return
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email.value.trim())) {
    error.value = 'Please enter a valid email address'
    return
  }

  error.value = ''
  success.value = ''
  isLoading.value = true

  try {
    await databaseService.shareScribe(props.scribeId, email.value.trim())
    success.value = `Scribe shared successfully with ${email.value.trim()}`
    
    // Close modal after 2 seconds
    setTimeout(() => {
      emit('shared')
      handleClose()
    }, 2000)
  } catch (err: any) {
    console.error('Error sharing scribe:', err)
    error.value = err.message || 'Failed to share scribe. Please try again.'
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active > div,
.modal-leave-active > div {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.modal-enter-from > div,
.modal-leave-to > div {
  transform: scale(0.95);
  opacity: 0;
}
</style>

