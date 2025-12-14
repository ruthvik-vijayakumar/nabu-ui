<template>
  <TabsContent :class="cn(
    'mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    props.class
  )" v-bind="$attrs">
    <slot />
  </TabsContent>
</template>

<script setup lang="ts">
import { TabsContent as TabsContentPrimitive } from 'radix-vue'
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const TabsContent = TabsContentPrimitive

export interface TabsContentProps {
  value: string
  class?: HTMLAttributes['class']
}

defineProps<TabsContentProps>()
</script>




