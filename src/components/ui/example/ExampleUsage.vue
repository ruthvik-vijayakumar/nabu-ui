<template>
  <div class="p-6 space-y-6">
    <h1 class="text-2xl font-bold mb-4">shadcn-vue Components Example</h1>
    
    <!-- Button Examples -->
    <Card>
      <CardHeader>
        <CardTitle>Buttons</CardTitle>
      </CardHeader>
      <CardContent class="space-x-2">
        <Button>Default</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="link">Link</Button>
      </CardContent>
    </Card>

    <!-- Input Examples -->
    <Card>
      <CardHeader>
        <CardTitle>Inputs</CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        <Input type="text" placeholder="Enter text..." />
        <Input type="email" placeholder="Enter email..." />
        <Input type="password" placeholder="Enter password..." />
      </CardContent>
    </Card>

    <!-- Dialog Example -->
    <Card>
      <CardHeader>
        <CardTitle>Dialog</CardTitle>
      </CardHeader>
      <CardContent>
        <Dialog v-model:open="dialogOpen">
          <DialogTrigger as-child>
            <Button>Open Dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Example Dialog</DialogTitle>
              <DialogDescription>
                This is an example dialog using shadcn-vue components.
              </DialogDescription>
            </DialogHeader>
            <div class="py-4">
              <Input placeholder="Enter something..." />
            </div>
            <div class="flex justify-end gap-2">
              <DialogClose as-child>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button>Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog'

const dialogOpen = ref(false)
</script>

