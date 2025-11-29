<template>
  <li>
    <component
      :is="as"
      :class="cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'bg-accent text-accent-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        props.class
      )"
      @click="handleClick"
    >
      <slot name="icon" />
      <span v-if="!isCollapsed" class="flex-1">
        <slot />
      </span>
    </component>
  </li>
</template>

<script setup lang="ts">
import { inject, type HTMLAttributes, type Ref } from 'vue'
import { cn } from '@/lib/utils'

export interface SidebarMenuItemProps {
  as?: string | object
  active?: boolean
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<SidebarMenuItemProps>(), {
  as: 'button',
  active: false,
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const isCollapsed = inject<Ref<boolean>>('sidebar-collapsed-state', { value: false })

function handleClick(event: MouseEvent) {
  emit('click', event)
}
</script>

