<template>
  <div :class="cn('h-px bg-border', props.class)" />
</template>

<script setup lang="ts">
import { type HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

export interface ItemSeparatorProps {
  class?: HTMLAttributes['class']
}

const props = defineProps<ItemSeparatorProps>()
</script>

