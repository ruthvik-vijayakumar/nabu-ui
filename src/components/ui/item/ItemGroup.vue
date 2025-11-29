<template>
  <div :class="cn('flex flex-col gap-2', props.class)">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { type HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

export interface ItemGroupProps {
  class?: HTMLAttributes['class']
}

const props = defineProps<ItemGroupProps>()
</script>

