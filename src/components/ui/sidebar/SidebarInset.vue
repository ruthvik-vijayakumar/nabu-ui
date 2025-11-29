<template>
  <main :class="cn('flex-1', props.class)">
    <slot />
  </main>
</template>

<script setup lang="ts">
import { type HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

export interface SidebarInsetProps {
  class?: HTMLAttributes['class']
}

const props = defineProps<SidebarInsetProps>()
</script>

