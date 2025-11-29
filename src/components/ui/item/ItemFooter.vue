<template>
  <div :class="cn('text-xs text-muted-foreground', props.class)">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { type HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

export interface ItemFooterProps {
  class?: HTMLAttributes['class']
}

const props = defineProps<ItemFooterProps>()
</script>

