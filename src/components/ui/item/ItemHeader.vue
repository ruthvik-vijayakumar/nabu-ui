<template>
  <div :class="cn('text-xs font-medium text-muted-foreground uppercase tracking-wider', props.class)">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { type HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

export interface ItemHeaderProps {
  class?: HTMLAttributes['class']
}

const props = defineProps<ItemHeaderProps>()
</script>

