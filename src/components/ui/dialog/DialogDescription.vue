<template>
  <DialogDescriptionPrimitive :class="cn('text-sm text-muted-foreground', props.class)">
    <slot />
  </DialogDescriptionPrimitive>
</template>

<script setup lang="ts">
import { type HTMLAttributes } from 'vue'
import { DialogDescription as DialogDescriptionPrimitive } from 'radix-vue'
import { cn } from '@/lib/utils'

export interface DialogDescriptionProps {
  class?: HTMLAttributes['class']
}

const props = defineProps<DialogDescriptionProps>()
</script>

