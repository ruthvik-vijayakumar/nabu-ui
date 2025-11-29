# shadcn-vue Integration

This project now uses shadcn-vue components for a consistent, accessible UI design system.

## Setup Complete ✅

- ✅ Tailwind CSS configured with shadcn theme variables
- ✅ CSS variables for theming (light/dark mode support)
- ✅ Utility functions (`cn()` for class merging)
- ✅ Base components created

## Available Components

### Button
```vue
<script setup>
import { Button } from '@/components/ui/button'
</script>

<template>
  <Button variant="default" size="default">Click me</Button>
  <Button variant="outline" size="sm">Outline</Button>
  <Button variant="ghost" size="lg">Ghost</Button>
  <Button variant="destructive">Delete</Button>
</template>
```

**Variants:** `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`
**Sizes:** `default`, `sm`, `lg`, `icon`

### Input
```vue
<script setup>
import { Input } from '@/components/ui/input'
</script>

<template>
  <Input type="text" placeholder="Enter text..." />
  <Input type="email" class="mt-4" />
</template>
```

### Card
```vue
<script setup>
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>Card Title</CardTitle>
    </CardHeader>
    <CardContent>
      Card content goes here
    </CardContent>
  </Card>
</template>
```

### Dialog (Modal)
```vue
<script setup>
import { ref } from 'vue'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

const open = ref(false)
</script>

<template>
  <Dialog v-model:open="open">
    <DialogTrigger as-child>
      <Button>Open Dialog</Button>
    </DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Dialog Title</DialogTitle>
        <DialogDescription>
          Dialog description text
        </DialogDescription>
      </DialogHeader>
      <div>
        Content here
      </div>
      <DialogClose as-child>
        <Button variant="outline">Close</Button>
      </DialogClose>
    </DialogContent>
  </Dialog>
</template>
```

## Utility Functions

### `cn()` - Class Name Merger
Use the `cn()` utility to merge Tailwind classes:

```vue
<script setup>
import { cn } from '@/lib/utils'
</script>

<template>
  <div :class="cn('base-class', isActive && 'active-class', props.class)">
    Content
  </div>
</template>
```

## Theming

The project uses CSS variables for theming. Both light and dark modes are supported:

- Light mode: Default (uses `:root` variables)
- Dark mode: Add `dark` class to parent element

Variables are defined in `src/popup/style.css` and can be customized.

## Adding More Components

To add more shadcn-vue components:

1. Check the [shadcn-vue documentation](https://www.shadcn-vue.com/)
2. Copy the component code to `src/components/ui/[component-name]/`
3. Export from `src/components/ui/[component-name]/index.ts`
4. Import and use in your Vue components

## Migration Guide

To migrate existing components to use shadcn-vue:

1. Replace custom buttons with `<Button>` component
2. Replace custom inputs with `<Input>` component
3. Replace custom modals with `<Dialog>` component
4. Use `cn()` utility for class merging
5. Use Tailwind utility classes with shadcn theme variables

## Example: Migrating a Modal

**Before:**
```vue
<div class="modal">
  <div class="modal-content">
    <h3>Title</h3>
    <button @click="close">Close</button>
  </div>
</div>
```

**After:**
```vue
<Dialog v-model:open="isOpen">
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
    </DialogHeader>
    <DialogClose as-child>
      <Button>Close</Button>
    </DialogClose>
  </DialogContent>
</Dialog>
```

