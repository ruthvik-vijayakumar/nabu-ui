<template>
  <div :class="cn('space-y-2', props.class)">
    <h3 v-if="title" class="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
      {{ title }}
    </h3>
    <slot />
  </div>
</template>

<script setup lang="ts">
import { type HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

export interface SidebarGroupProps {
  title?: string
  class?: HTMLAttributes['class']
}

const props = defineProps<SidebarGroupProps>()
</script>

