<template>
  <div :class="cn('flex h-16 items-center border-b px-4', props.class)">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { type HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

export interface SidebarHeaderProps {
  class?: HTMLAttributes['class']
}

const props = defineProps<SidebarHeaderProps>()
</script>

