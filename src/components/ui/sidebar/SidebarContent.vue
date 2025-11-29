<template>
  <div :class="cn('flex-1 overflow-y-auto px-4 py-4', props.class)">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { type HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

export interface SidebarContentProps {
  class?: HTMLAttributes['class']
}

const props = defineProps<SidebarContentProps>()
</script>

