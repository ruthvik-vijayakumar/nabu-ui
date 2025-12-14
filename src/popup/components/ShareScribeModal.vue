<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
        @click.self="handleClose"
      >
        <Card class="w-full max-w-md" @click.stop>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-3">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <svg class="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
                </svg>
              </div>
              <div>
                <CardTitle class="text-lg font-semibold">Share Scribe</CardTitle>
                <p class="text-xs text-muted-foreground mt-0.5">{{ scribeName }}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              @click="handleClose"
              class="h-8 w-8"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </Button>
          </CardHeader>
          <CardContent class="space-y-4">
            <div>
              <FieldGroup>
                <Field>
                  <FieldLabel for="shareEmail" class="text-xs uppercase tracking-wide text-muted-foreground">
                    Email Address <span class="text-destructive">*</span>
                  </FieldLabel>
                  <Input
                    id="shareEmail"
                    v-model="email"
                    type="email"
                    placeholder="user@example.com"
                    @keyup.enter="handleShare"
                    :disabled="isLoading"
                    autofocus
                    :class="{ 'border-destructive focus-visible:ring-destructive': error }"
                  />
                  <FieldDescription v-if="error" class="text-destructive text-xs">
                    {{ error }}
                  </FieldDescription>
                  <FieldDescription v-else class="text-xs">
                    Enter the email address of the person you want to share with
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </div>

            <!-- Success Message -->
            <div v-if="success" class="p-3 rounded-md bg-muted border border-border">
              <div class="flex items-center gap-2">
                <svg class="w-4 h-4 text-foreground flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                <p class="text-sm text-foreground">{{ success }}</p>
              </div>
            </div>

            <div class="flex gap-2 pt-2">
              <Button
                @click="handleShare"
                :disabled="isLoading || !email.trim()"
                class="flex-1"
                size="lg"
              >
                <svg v-if="isLoading" class="w-4 h-4 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
                <svg v-else class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
                </svg>
                {{ isLoading ? 'Sharing...' : 'Share' }}
              </Button>
              <Button
                variant="outline"
                @click="handleClose"
                :disabled="isLoading"
                class="flex-1"
                size="lg"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { databaseService } from '../../utils/database'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Field, FieldLabel, FieldDescription, FieldGroup } from '@/components/ui/field'

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
