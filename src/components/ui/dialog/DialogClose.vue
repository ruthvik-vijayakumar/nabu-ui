<template>
  <DialogClosePrimitive :class="cn(props.class)">
    <slot />
  </DialogClosePrimitive>
</template>

<script setup lang="ts">
import { type HTMLAttributes } from 'vue'
import { DialogClose as DialogClosePrimitive } from 'radix-vue'
import { cn } from '@/lib/utils'

export interface DialogCloseProps {
  class?: HTMLAttributes['class']
}

const props = defineProps<DialogCloseProps>()
</script>

