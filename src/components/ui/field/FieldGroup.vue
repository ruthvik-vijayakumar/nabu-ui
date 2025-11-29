<template>
  <div :class="cn('flex flex-col gap-6', props.class)">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { type HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

export interface FieldGroupProps {
  class?: HTMLAttributes['class']
}

const props = defineProps<FieldGroupProps>()
</script>

