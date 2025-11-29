<template>
  <ul :class="cn('space-y-1', props.class)">
    <slot />
  </ul>
</template>

<script setup lang="ts">
import { type HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

export interface SidebarMenuProps {
  class?: HTMLAttributes['class']
}

const props = defineProps<SidebarMenuProps>()
</script>

