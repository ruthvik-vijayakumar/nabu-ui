<template>
  <textarea
    :class="cn(
      'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
      props.class
    )"
    :value="modelValue"
    @input="handleInput"
    v-bind="restAttrs"
  />
</template>

<script setup lang="ts">
import { computed, type HTMLAttributes, useAttrs } from 'vue'
import { cn } from '@/lib/utils'

export interface TextareaProps {
  modelValue?: string
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<TextareaProps>(), {
  modelValue: '',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const attrs = useAttrs()
const restAttrs = computed(() => {
  const { class: _, ...rest } = attrs
  return rest
})

function handleInput(event: Event) {
  const target = event.target as HTMLTextAreaElement
  emit('update:modelValue', target.value)
}
</script>

