<template>
  <div :class="cn('text-sm text-muted-foreground', props.class)">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { type HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

export interface ItemDescriptionProps {
  class?: HTMLAttributes['class']
}

const props = defineProps<ItemDescriptionProps>()
</script>

