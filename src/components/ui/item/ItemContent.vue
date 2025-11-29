<template>
  <div :class="cn('flex-1 min-w-0 space-y-1', props.class)">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { type HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

export interface ItemContentProps {
  class?: HTMLAttributes['class']
}

const props = defineProps<ItemContentProps>()
</script>

