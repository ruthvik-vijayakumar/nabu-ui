<template>
  <input
    :class="cn(
      'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
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

export interface InputProps {
  modelValue?: string | number
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<InputProps>(), {
  modelValue: '',
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
}>()

const attrs = useAttrs()
const restAttrs = computed(() => {
  const { class: _, ...rest } = attrs
  return rest
})

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
}
</script>

