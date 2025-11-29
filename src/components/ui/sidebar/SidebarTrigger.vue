<template>
  <button
    :class="cn(
      'inline-flex items-center justify-center rounded-md p-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
      props.class
    )"
    @click="handleToggle"
  >
    <svg
      class="h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M4 6h16M4 12h16M4 18h16"
      />
    </svg>
    <span class="sr-only">Toggle sidebar</span>
  </button>
</template>

<script setup lang="ts">
import { inject, type HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

export interface SidebarTriggerProps {
  class?: HTMLAttributes['class']
}

const props = defineProps<SidebarTriggerProps>()

const toggle = inject<() => void>('sidebar-toggle')

function handleToggle() {
  toggle?.()
}
</script>

