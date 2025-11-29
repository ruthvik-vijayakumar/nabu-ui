<template>
  <component
    v-if="!asChild"
    :is="as"
    :class="cn(itemVariants({ variant, size }), props.class)"
    v-bind="$attrs"
  >
    <slot />
  </component>
  <slot v-else />
</template>

<script setup lang="ts">
import { type HTMLAttributes } from 'vue'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const itemVariants = cva(
  'flex items-start gap-3 rounded-lg transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-card border border-border',
        outline: 'border border-border bg-transparent hover:bg-accent/50',
        muted: 'bg-muted/50 border border-border/50',
      },
      size: {
        default: 'p-4',
        sm: 'p-2',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

type ItemVariant = 'default' | 'outline' | 'muted'
type ItemSize = 'default' | 'sm'

export interface ItemProps {
  variant?: ItemVariant
  size?: ItemSize
  as?: string | object
  class?: HTMLAttributes['class']
  asChild?: boolean
}

const props = withDefaults(defineProps<ItemProps>(), {
  as: 'div',
  variant: 'default',
  size: 'default',
  asChild: false,
})
</script>

