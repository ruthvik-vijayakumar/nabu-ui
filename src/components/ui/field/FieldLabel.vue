<template>
  <label :for="props.for" :class="cn('text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70', props.class)">
    <slot />
  </label>
</template>

<script setup lang="ts">
import { type HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

export interface FieldLabelProps {
  for?: string
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<FieldLabelProps>(), {
  for: undefined,
})
</script>

