<template>
  <Sidebar class="bg-gray-900/95 border-gray-800">
    <SidebarHeader class="border-gray-800">
      <div class="flex items-center justify-between w-full">
        <div class="flex items-center gap-3" :class="isCollapsed ? 'justify-center w-full' : ''">
          <div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg ring-2 ring-blue-500/20 flex-shrink-0">
            <span class="text-white font-bold text-sm">N</span>
          </div>
          <div v-if="!isCollapsed" class="flex flex-col min-w-0">
            <h1 class="text-sm font-bold text-white leading-tight">NabuAI</h1>
            <p class="text-xs text-gray-400 leading-tight">Knowledge Base</p>
          </div>
        </div>
      </div>
    </SidebarHeader>
    
    <SidebarContent class="bg-gray-900/50">
      <SidebarGroup>
        <SidebarMenu>
          <SidebarMenuItem
            :active="currentView === 'save'"
            @click="navigate('save')"
          >
            <template #icon>
              <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path>
              </svg>
            </template>
            Save Page
          </SidebarMenuItem>
          
          <SidebarMenuItem
            :active="currentView === 'dashboard'"
            @click="navigate('dashboard')"
          >
            <template #icon>
              <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
              </svg>
            </template>
            Dashboard
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
      
      <SidebarGroup v-if="recentScribes.length > 0" title="Recent Scribes" class="mt-6">
        <SidebarMenu>
          <SidebarMenuItem
            v-for="scribe in recentScribes"
            :key="scribe.id"
            :active="false"
            @click="openScribe(scribe.id)"
            class="!text-xs"
          >
            <template #icon>
              <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
              </svg>
            </template>
            <span class="truncate">{{ scribe.name }}</span>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    </SidebarContent>
  </Sidebar>
</template>

<script setup lang="ts">
import { inject, computed, type Ref } from 'vue'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

export interface PopupSidebarProps {
  currentView?: 'save' | 'dashboard'
  recentScribes?: Array<{ id: string; name: string }>
}

const props = withDefaults(defineProps<PopupSidebarProps>(), {
  currentView: 'save',
  recentScribes: () => [],
})

const emit = defineEmits<{
  navigate: [view: 'save' | 'dashboard']
  'open-scribe': [id: string]
}>()

const isCollapsed = inject<Ref<boolean>>('sidebar-collapsed-state', { value: false })

function navigate(view: 'save' | 'dashboard') {
  emit('navigate', view)
}

function openScribe(id: string) {
  emit('open-scribe', id)
}
</script>

