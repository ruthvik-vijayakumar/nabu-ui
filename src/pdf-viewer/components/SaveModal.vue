<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 py-6" @click="handleBackdropClick">
    <Card class="w-full max-w-lg shadow-2xl" @click.stop>
      <CardHeader class="space-y-1">
        <div class="flex items-start justify-between gap-4">
          <div>
            <CardDescription>Save content to your workspace</CardDescription>
            <CardTitle>Save PDF to NabuAI</CardTitle>
          </div>
          <Button variant="ghost" size="icon" class="h-8 w-8" @click="$emit('close')">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </Button>
        </div>
      </CardHeader>

      <CardContent class="space-y-5">
        <FieldGroup class="space-y-3">
          <Field>
            <FieldLabel class="text-xs uppercase tracking-wide">PDF file</FieldLabel>
            <div class="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground truncate" :title="filename">
              {{ filename }}
            </div>
          </Field>
          <Field>
            <FieldLabel class="text-xs uppercase tracking-wide">PDF URL</FieldLabel>
            <div class="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground break-all">
              {{ pdfUrl }}
            </div>
          </Field>
          <Field>
            <FieldLabel class="text-xs uppercase tracking-wide">Source page</FieldLabel>
            <div class="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground break-all">
              {{ sourceUrl || 'Unknown source' }}
            </div>
          </Field>
        </FieldGroup>

        <Separator />

        <FieldGroup class="space-y-4">
          <Field>
            <FieldLabel>Title</FieldLabel>
            <Input
              v-model="formData.title"
              id="pdf-title"
              placeholder="Give this PDF a memorable title"
            />
          </Field>
          <Field>
            <FieldLabel>Tags</FieldLabel>
            <Input
              v-model="formData.tags"
              id="pdf-tags"
              placeholder="Design, research, meetings..."
            />
            <CardDescription class="text-xs mt-1">
              Separate tags with commas to keep things organized.
            </CardDescription>
          </Field>
          <Field>
            <FieldLabel>Notes</FieldLabel>
            <Textarea
              v-model="formData.notes"
              rows="3"
              placeholder="Add optional context or highlights"
            />
          </Field>
        </FieldGroup>

        <div class="flex items-center gap-3 pt-2">
          <Button class="flex-1" @click="handleSave">
            Save PDF
          </Button>
          <Button variant="outline" class="flex-1" @click="$emit('close')">
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { SaveModalData } from '../types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Separator } from '@/components/ui/separator'

const props = defineProps<{
  pdfUrl: string
  sourceUrl?: string
  filename: string
}>()

const emit = defineEmits<{
  close: []
  save: [data: SaveModalData]
}>()

const formData = ref<SaveModalData>({
  title: '',
  tags: '',
  notes: ''
})

const handleSave = () => {
  if (!formData.value.title.trim()) {
    alert('Please enter a title for the PDF')
    return
  }

  const tags = formData.value.tags
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag)

  emit('save', {
    title: formData.value.title,
    tags,
    notes: formData.value.notes
  })
}

const handleBackdropClick = (e: MouseEvent) => {
  if (e.target === e.currentTarget) {
    emit('close')
  }
}

onMounted(() => {
  formData.value.title = props.filename.replace('.pdf', '')
})
</script>

