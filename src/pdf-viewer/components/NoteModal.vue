<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="true"
        class="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
        @click="handleBackdropClick"
      >
        <Card class="w-full max-w-md" @click.stop>
          <CardHeader>
            <div class="flex items-center justify-between">
              <div>
                <CardTitle>Add Note</CardTitle>
                <CardDescription>Add a note to this PDF</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                @click="$emit('close')"
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
                <FieldLabel>Note</FieldLabel>
                <Textarea
                  v-model="noteText"
                  rows="4"
                  placeholder="Enter your note here..."
                  ref="textareaRef"
                />
                <FieldDescription>
                  Your note will be saved with this PDF
                </FieldDescription>
              </Field>
            </FieldGroup>

            <div class="flex gap-2 pt-2">
              <Button
                @click="handleSave"
                class="flex-1"
                :disabled="!noteText.trim()"
              >
                Save Note
              </Button>
              <Button
                variant="outline"
                @click="$emit('close')"
                class="flex-1"
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
import { ref, onMounted, nextTick } from 'vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Field, FieldGroup, FieldLabel, FieldDescription } from '@/components/ui/field'

// Emits
const emit = defineEmits<{
  close: []
  save: [text: string]
}>()

// Refs
const noteText = ref('')
const textareaRef = ref<HTMLTextAreaElement>()

// Methods
const handleSave = () => {
  const text = noteText.value.trim()
  if (text) {
    emit('save', text)
  }
}

const handleBackdropClick = (e: MouseEvent) => {
  if (e.target === e.currentTarget) {
    emit('close')
  }
}

// Lifecycle
onMounted(async () => {
  await nextTick()
  textareaRef.value?.focus()
})
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

