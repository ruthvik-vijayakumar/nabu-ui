<template>
  <div class="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700/50 shadow-lg">
    <!-- Logo and Title -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-gray-700/30">
      <div class="flex items-center space-x-3">
        <div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg ring-2 ring-blue-500/20">
          <span class="text-white font-bold text-sm">N</span>
        </div>
        <div>
          <h1 class="text-sm font-bold text-white leading-tight">NabuAI</h1>
          <p class="text-xs text-gray-400 leading-tight">Knowledge Base</p>
        </div>
      </div>
      <button
        @click="handleLogout"
        class="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
        title="Logout"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
        </svg>
      </button>
    </div>

    <!-- Navigation Tabs -->
    <div class="flex items-center gap-1 px-2 py-2">
      <button
        v-for="item in navigationItems"
        :key="item.id"
        @click="navigate(item.id)"
        :class="[
          'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors relative',
          currentView === item.id
            ? 'bg-accent text-accent-foreground'
            : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
        ]"
      >
        <component :is="item.icon" class="w-4 h-4" />
        <span>{{ item.label }}</span>
        <span
          v-if="item.badge"
          class="ml-auto rounded-full bg-primary/20 text-primary text-[10px] px-1.5 py-0.5"
        >
          {{ item.badge }}
        </span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue'

export interface NavigationItem {
  id: string
  label: string
  icon: any
  badge?: string | number
}

export interface PopupNavigationProps {
  currentView?: string
  navigationItems: NavigationItem[]
}

const props = withDefaults(defineProps<PopupNavigationProps>(), {
  currentView: 'save',
})

const emit = defineEmits<{
  navigate: [id: string]
  logout: []
}>()

function navigate(id: string) {
  emit('navigate', id)
}

function handleLogout() {
  emit('logout')
}

// Icon components
const SaveIcon = () => h('svg', {
  class: 'w-4 h-4',
  fill: 'none',
  stroke: 'currentColor',
  viewBox: '0 0 24 24'
}, [
  h('path', {
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'stroke-width': '2',
    d: 'M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4'
  })
])

const DashboardIcon = () => h('svg', {
  class: 'w-4 h-4',
  fill: 'none',
  stroke: 'currentColor',
  viewBox: '0 0 24 24'
}, [
  h('path', {
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'stroke-width': '2',
    d: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z'
  })
])
</script>

