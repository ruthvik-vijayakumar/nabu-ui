<template>
  <div :class="cn('p-6 pt-0', props.class)">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { type HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

export interface CardContentProps {
  class?: HTMLAttributes['class']
}

const props = defineProps<CardContentProps>()
</script>

