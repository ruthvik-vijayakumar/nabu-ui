<template>
  <DialogTriggerPrimitive :class="cn(props.class)">
    <slot />
  </DialogTriggerPrimitive>
</template>

<script setup lang="ts">
import { type HTMLAttributes } from 'vue'
import { DialogTrigger as DialogTriggerPrimitive } from 'radix-vue'
import { cn } from '@/lib/utils'

export interface DialogTriggerProps {
  class?: HTMLAttributes['class']
}

const props = defineProps<DialogTriggerProps>()
</script>

