<template>
  <div :class="cn('flex items-center gap-2', props.class)">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { type HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

export interface ItemActionsProps {
  class?: HTMLAttributes['class']
}

const props = defineProps<ItemActionsProps>()
</script>

