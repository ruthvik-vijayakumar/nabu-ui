<template>
  <aside
    :class="cn(
      'flex flex-col border-r bg-background transition-all duration-200',
      isCollapsed ? 'w-16' : 'w-64',
      props.class
    )"
  >
    <slot />
  </aside>
</template>

<script setup lang="ts">
import { inject, type HTMLAttributes, type Ref } from 'vue'
import { cn } from '@/lib/utils'

export interface SidebarProps {
  class?: HTMLAttributes['class']
}

const props = defineProps<SidebarProps>()

const isCollapsed = inject<Ref<boolean>>('sidebar-collapsed-state', { value: false })
</script>

