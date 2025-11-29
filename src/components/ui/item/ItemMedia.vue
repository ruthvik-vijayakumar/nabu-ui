<template>
  <div :class="cn(mediaVariants({ variant }), props.class)">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { type HTMLAttributes } from 'vue'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const mediaVariants = cva(
  'flex-shrink-0',
  {
    variants: {
      variant: {
        default: '',
        icon: 'flex items-center justify-center',
        image: 'overflow-hidden rounded-md',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

type MediaVariant = 'default' | 'icon' | 'image'

export interface ItemMediaProps {
  variant?: MediaVariant
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<ItemMediaProps>(), {
  variant: 'default',
})
</script>

