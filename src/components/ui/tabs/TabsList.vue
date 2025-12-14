<template>
  <TabsList :class="cn('inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground', props.class)">
    <slot />
  </TabsList>
</template>

<script setup lang="ts">
import { TabsList as TabsListPrimitive } from 'radix-vue'
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const TabsList = TabsListPrimitive

export interface TabsListProps {
  class?: HTMLAttributes['class']
}

const props = defineProps<TabsListProps>()
</script>




