<template>
  <div class="flex w-full">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { ref, provide, type Ref } from 'vue'

const isCollapsed = ref(false)
const toggle = () => {
  isCollapsed.value = !isCollapsed.value
}

provide<Ref<boolean>>('sidebar-collapsed-state', isCollapsed)
provide('sidebar-toggle', toggle)
</script>

