<template>
  <TabsRoot :model-value="modelValue || defaultValue" @update:model-value="updateValue" :default-value="defaultValue" :class="props.class">
    <slot />
  </TabsRoot>
</template>

<script setup lang="ts">
import { TabsRoot } from 'radix-vue'
import type { HTMLAttributes } from 'vue'

export interface TabsProps {
  modelValue?: string
  defaultValue?: string
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<TabsProps>(), {
  modelValue: undefined,
  defaultValue: undefined
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

function updateValue(value: string) {
  emit('update:modelValue', value)
}
</script>

