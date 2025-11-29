<template>
  <div :class="cn('text-sm font-semibold text-foreground leading-none', props.class)">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { type HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

export interface ItemTitleProps {
  class?: HTMLAttributes['class']
}

const props = defineProps<ItemTitleProps>()
</script>

