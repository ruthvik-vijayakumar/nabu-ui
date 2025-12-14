<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
        @click.self="handleClose"
      >
        <Card class="w-full max-w-md">
          <CardHeader>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <svg class="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                  </svg>
                </div>
                <div>
                  <CardTitle>Create New Scribe</CardTitle>
                  <CardDescription>Start a new conversation</CardDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                @click="handleClose"
                class="h-8 w-8"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </Button>
            </div>
          </CardHeader>

          <CardContent class="space-y-4">
            <FieldGroup>
              <Field>
                <FieldLabel for="scribeName">
                  Scribe Name <span class="text-destructive">*</span>
                </FieldLabel>
                <Input
                  id="scribeName"
                  v-model="scribeName"
                  type="text"
                  placeholder="e.g., Research Notes, Project Ideas..."
                  :class="{ 'border-destructive': error }"
                  @keyup.enter="handleCreate"
                  autofocus
                />
                <FieldDescription v-if="error" class="text-destructive">
                  {{ error }}
                </FieldDescription>
                <FieldDescription v-else>
                  Give your scribe a descriptive name
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel for="scribeModel">AI Model (Optional)</FieldLabel>
                <select
                  id="scribeModel"
                  v-model="selectedModel"
                  class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="gpt-4">GPT-4</option>
                  <option value="gpt-4-turbo">GPT-4 Turbo</option>
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                  <option value="claude-3-opus">Claude 3 Opus</option>
                  <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                </select>
                <FieldDescription>
                  Choose the AI model for this scribe
                </FieldDescription>
              </Field>
            </FieldGroup>
          </CardContent>

          <div class="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
            <Button
              variant="outline"
              @click="handleClose"
            >
              Cancel
            </Button>
            <Button
              @click="handleCreate"
              :disabled="isCreating || !scribeName.trim()"
            >
              <svg
                v-if="isCreating"
                class="w-4 h-4 mr-2 animate-spin"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              <span>{{ isCreating ? 'Creating...' : 'Create Scribe' }}</span>
            </Button>
          </div>
        </Card>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Field, FieldLabel, FieldDescription, FieldGroup } from '@/components/ui/field'

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
