<template>
  <div class="flex flex-col h-full bg-background border border-border rounded-lg overflow-hidden">
    <!-- Toolbar -->
    <div class="flex-shrink-0 border-b border-border bg-muted/30 p-2 flex items-center gap-1 flex-wrap overflow-x-auto relative">
      <!-- Text Formatting -->
      <Button
        variant="ghost"
        size="icon"
        @click="editor?.chain().focus().toggleBold().run()"
        :class="{ 'bg-accent': editor?.isActive('bold') }"
        class="h-8 w-8"
        title="Bold"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z"/>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 12h9"/>
        </svg>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        @click="editor?.chain().focus().toggleItalic().run()"
        :class="{ 'bg-accent': editor?.isActive('italic') }"
        class="h-8 w-8"
        title="Italic"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
        </svg>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        @click="editor?.chain().focus().toggleUnderline().run()"
        :class="{ 'bg-accent': editor?.isActive('underline') }"
        class="h-8 w-8"
        title="Underline"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12h14"/>
        </svg>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        @click="editor?.chain().focus().toggleStrike().run()"
        :class="{ 'bg-accent': editor?.isActive('strike') }"
        class="h-8 w-8"
        title="Strikethrough"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14"/>
        </svg>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        @click="editor?.chain().focus().toggleCode().run()"
        :class="{ 'bg-accent': editor?.isActive('code') }"
        class="h-8 w-8"
        title="Inline Code"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
        </svg>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        @click="editor?.chain().focus().toggleHighlight().run()"
        :class="{ 'bg-accent': editor?.isActive('highlight') }"
        class="h-8 w-8"
        title="Highlight"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/>
        </svg>
      </Button>

      <div class="w-px h-6 bg-border mx-1"></div>

      <!-- Headings -->
      <div class="relative">
        <Button
          ref="headingButtonRef"
          variant="ghost"
          size="sm"
          @click.stop="showHeadingMenu = !showHeadingMenu"
          :class="{ 'bg-accent': editor?.isActive('heading') }"
          class="h-8"
          title="Heading"
        >
          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
          Heading
          <svg class="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </Button>
        <Teleport to="body">
          <div v-if="showHeadingMenu" class="fixed bg-popover border border-border rounded-md shadow-lg z-[100] min-w-[140px] overflow-hidden" @click.stop :style="getHeadingMenuStyle()">
          <button
            @click="editor?.chain().focus().toggleHeading({ level: 1 }).run(); showHeadingMenu = false"
            class="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center gap-2"
          >
            <span class="text-lg font-bold">H1</span>
            <span>Heading 1</span>
          </button>
          <button
            @click="editor?.chain().focus().toggleHeading({ level: 2 }).run(); showHeadingMenu = false"
            class="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center gap-2"
          >
            <span class="text-base font-semibold">H2</span>
            <span>Heading 2</span>
          </button>
          <button
            @click="editor?.chain().focus().toggleHeading({ level: 3 }).run(); showHeadingMenu = false"
            class="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center gap-2"
          >
            <span class="text-sm font-semibold">H3</span>
            <span>Heading 3</span>
          </button>
          <button
            @click="editor?.chain().focus().setParagraph().run(); showHeadingMenu = false"
            class="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
          >
            Paragraph
          </button>
          </div>
        </Teleport>
      </div>

      <div class="w-px h-6 bg-border mx-1"></div>

      <!-- Lists -->
      <Button
        variant="ghost"
        size="icon"
        @click="editor?.chain().focus().toggleBulletList().run()"
        :class="{ 'bg-accent': editor?.isActive('bulletList') }"
        class="h-8 w-8"
        title="Bullet List"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 6h13M8 12h13m-13 6h13M3 6h.01M3 12h.01M3 18h.01"/>
        </svg>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        @click="editor?.chain().focus().toggleOrderedList().run()"
        :class="{ 'bg-accent': editor?.isActive('orderedList') }"
        class="h-8 w-8"
        title="Numbered List"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"/>
        </svg>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        @click="editor?.chain().focus().toggleTaskList().run()"
        :class="{ 'bg-accent': editor?.isActive('taskList') }"
        class="h-8 w-8"
        title="Task List"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
        </svg>
      </Button>

      <div class="w-px h-6 bg-border mx-1"></div>

      <!-- Block Elements -->
      <Button
        variant="ghost"
        size="icon"
        @click="editor?.chain().focus().toggleBlockquote().run()"
        :class="{ 'bg-accent': editor?.isActive('blockquote') }"
        class="h-8 w-8"
        title="Blockquote"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 8h.01M14 8h.01M10 12h6M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        @click="editor?.chain().focus().toggleCodeBlock().run()"
        :class="{ 'bg-accent': editor?.isActive('codeBlock') }"
        class="h-8 w-8"
        title="Code Block"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        @click="editor?.chain().focus().setHorizontalRule().run()"
        class="h-8 w-8"
        title="Horizontal Rule"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"/>
        </svg>
      </Button>

      <div class="w-px h-6 bg-border mx-1"></div>

      <!-- Table -->
      <div class="relative">
        <Button
          ref="tableButtonRef"
          variant="ghost"
          size="icon"
          @click.stop="showTableMenu = !showTableMenu"
          :class="{ 'bg-accent': editor?.isActive('table') }"
          class="h-8 w-8"
          title="Table"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
          </svg>
        </Button>
        <Teleport to="body">
          <div v-if="showTableMenu" class="fixed bg-popover border border-border rounded-md shadow-lg z-[100] p-3" @click.stop :style="getTableMenuStyle()">
          <div class="grid grid-cols-4 gap-1.5">
            <template v-for="rows in [1, 2, 3, 4]" :key="rows">
              <button
                v-for="cols in [1, 2, 3, 4]"
                :key="`${rows}-${cols}`"
                @click="insertTable(rows, cols)"
                class="w-9 h-9 border border-border/50 hover:border-primary hover:bg-accent/50 rounded transition-colors relative group"
                :title="`${rows}x${cols} table`"
              >
                <div class="absolute inset-0 flex items-center justify-center">
                  <div class="grid gap-0.5" :style="`grid-template-columns: repeat(${cols}, 1fr); grid-template-rows: repeat(${rows}, 1fr); width: ${cols * 4 + (cols - 1) * 1}px; height: ${rows * 4 + (rows - 1) * 1}px;`">
                    <template v-for="cell in rows * cols" :key="cell">
                      <div class="bg-foreground/60 group-hover:bg-primary rounded-sm" style="width: 4px; height: 4px;"></div>
                    </template>
                  </div>
                </div>
              </button>
            </template>
          </div>
          </div>
        </Teleport>
      </div>

      <div class="w-px h-6 bg-border mx-1"></div>

      <!-- Links & Images -->
      <Button
        variant="ghost"
        size="icon"
        @click="showLinkDialog = true"
        :class="{ 'bg-accent': editor?.isActive('link') }"
        class="h-8 w-8"
        title="Link"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
        </svg>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        @click="showImageDialog = true"
        class="h-8 w-8"
        title="Image"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
      </Button>

      <div class="w-px h-6 bg-border mx-1"></div>

      <!-- Text Align -->
      <Button
        variant="ghost"
        size="icon"
        @click="editor?.chain().focus().setTextAlign('left').run()"
        :class="{ 'bg-accent': editor?.isActive({ textAlign: 'left' }) }"
        class="h-8 w-8"
        title="Align Left"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M3 14h18M3 6h18"/>
        </svg>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        @click="editor?.chain().focus().setTextAlign('center').run()"
        :class="{ 'bg-accent': editor?.isActive({ textAlign: 'center' }) }"
        class="h-8 w-8"
        title="Align Center"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6h18M7 12h10M3 18h18"/>
        </svg>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        @click="editor?.chain().focus().setTextAlign('right').run()"
        :class="{ 'bg-accent': editor?.isActive({ textAlign: 'right' }) }"
        class="h-8 w-8"
        title="Align Right"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 10H3m18 4H3m0-8h18"/>
        </svg>
      </Button>

      <div class="w-px h-6 bg-border mx-1"></div>

      <!-- Undo/Redo -->
      <Button
        variant="ghost"
        size="icon"
        @click="editor?.chain().focus().undo().run()"
        :disabled="!editor?.can().undo()"
        class="h-8 w-8"
        title="Undo"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/>
        </svg>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        @click="editor?.chain().focus().redo().run()"
        :disabled="!editor?.can().redo()"
        class="h-8 w-8"
        title="Redo"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6"/>
        </svg>
      </Button>

      <div class="w-px h-6 bg-border mx-1"></div>

      <!-- Export to Word -->
      <Button
        variant="ghost"
        size="icon"
        @click="exportToWord"
        class="h-8 w-8"
        title="Export to Word"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
      </Button>
    </div>

    <!-- Link Dialog -->
    <Teleport to="body">
      <div v-if="showLinkDialog" class="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4" @click.self="showLinkDialog = false">
        <Card class="w-full max-w-md" @click.stop>
          <CardHeader>
            <div class="flex items-center justify-between">
              <div>
                <CardTitle>Add Link</CardTitle>
                <CardDescription>Insert a link into your document</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                @click="showLinkDialog = false"
                class="h-8 w-8"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </Button>
            </div>
          </CardHeader>
          <CardContent class="space-y-4">
            <FieldGroup>
              <Field>
                <FieldLabel>URL</FieldLabel>
                <Input
                  v-model="linkUrl"
                  type="url"
                  placeholder="https://example.com"
                  @keyup.enter="addLink"
                />
                <FieldDescription>
                  Enter the URL you want to link to
                </FieldDescription>
              </Field>
            </FieldGroup>
            <div class="flex gap-2 pt-2">
              <Button @click="addLink" class="flex-1" :disabled="!linkUrl.trim()">Add</Button>
              <Button variant="outline" @click="showLinkDialog = false" class="flex-1">Cancel</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Teleport>

    <!-- Image Dialog -->
    <Teleport to="body">
      <div v-if="showImageDialog" class="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4" @click.self="showImageDialog = false">
        <Card class="w-full max-w-md" @click.stop>
          <CardHeader>
            <div class="flex items-center justify-between">
              <div>
                <CardTitle>Add Image</CardTitle>
                <CardDescription>Insert an image from a URL</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                @click="showImageDialog = false"
                class="h-8 w-8"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </Button>
            </div>
          </CardHeader>
          <CardContent class="space-y-4">
            <FieldGroup>
              <Field>
                <FieldLabel>Image URL</FieldLabel>
                <Input
                  v-model="imageUrl"
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  @keyup.enter="addImage"
                />
                <FieldDescription>
                  Enter the URL of the image you want to insert
                </FieldDescription>
              </Field>
            </FieldGroup>
            <div class="flex gap-2 pt-2">
              <Button @click="addImage" class="flex-1" :disabled="!imageUrl.trim()">Add</Button>
              <Button variant="outline" @click="showImageDialog = false" class="flex-1">Cancel</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Teleport>

    <!-- Editor Content -->
    <div class="flex-1 overflow-y-auto p-6 custom-scroll" @click="closeMenus" @click.self="closeMenus">
      <EditorContent :editor="editor" class="h-full" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, Teleport } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Highlight from '@tiptap/extension-highlight'
import Typography from '@tiptap/extension-typography'
import TextAlign from '@tiptap/extension-text-align'
import HorizontalRule from '@tiptap/extension-horizontal-rule'
import Image from '@tiptap/extension-image'
import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel, FieldDescription } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

const props = defineProps<{
  modelValue?: string
  placeholder?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const showHeadingMenu = ref(false)
const showTableMenu = ref(false)
const showLinkDialog = ref(false)
const showImageDialog = ref(false)
const linkUrl = ref('')
const imageUrl = ref('')
const headingButtonRef = ref<HTMLElement | null>(null)
const tableButtonRef = ref<HTMLElement | null>(null)

const editor = useEditor({
  content: props.modelValue || '',
  extensions: [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3],
      },
      codeBlock: {
        HTMLAttributes: {
          class: 'code-block',
        },
      },
    }),
    Placeholder.configure({
      placeholder: props.placeholder || 'Start writing...',
    }),
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        class: 'text-primary underline',
      },
    }),
    Underline,
    TaskList,
    TaskItem.configure({
      nested: true,
    }),
    Highlight.configure({
      multicolor: true,
    }),
    Typography,
    TextAlign.configure({
      types: ['heading', 'paragraph'],
    }),
    HorizontalRule,
    Image.extend({
      addAttributes() {
        return {
          ...this.parent?.(),
          width: {
            default: null,
            parseHTML: element => element.getAttribute('width'),
            renderHTML: attributes => {
              if (!attributes.width) {
                return {}
              }
              return {
                width: attributes.width,
              }
            },
          },
          height: {
            default: null,
            parseHTML: element => element.getAttribute('height'),
            renderHTML: attributes => {
              if (!attributes.height) {
                return {}
              }
              return {
                height: attributes.height,
              }
            },
          },
        }
      },
      addNodeView() {
        return ({ node, HTMLAttributes, getPos, editor }) => {
          const dom = document.createElement('div')
          dom.className = 'image-wrapper'
          
          const img = document.createElement('img')
          img.src = node.attrs.src
          img.alt = node.attrs.alt || ''
          img.className = 'resizable-image'
          if (node.attrs.width) {
            img.style.width = `${node.attrs.width}px`
            img.style.height = 'auto'
          } else {
            img.style.maxWidth = '100%'
            img.style.height = 'auto'
          }
          img.style.borderRadius = '0.5em'
          img.style.display = 'block'
          img.style.margin = '0'
          img.style.cursor = 'pointer'
          
          const resizeHandle = document.createElement('div')
          resizeHandle.className = 'resize-handle'
          resizeHandle.style.position = 'absolute'
          resizeHandle.style.bottom = '0'
          resizeHandle.style.right = '0'
          resizeHandle.style.width = '16px'
          resizeHandle.style.height = '16px'
          resizeHandle.style.background = 'hsl(var(--primary))'
          resizeHandle.style.border = '2px solid hsl(var(--background))'
          resizeHandle.style.borderRadius = '2px'
          resizeHandle.style.cursor = 'nwse-resize'
          resizeHandle.style.opacity = '0'
          resizeHandle.style.transition = 'opacity 0.2s'
          resizeHandle.style.zIndex = '10'
          
          dom.appendChild(img)
          dom.appendChild(resizeHandle)
          
          let isResizing = false
          let startX = 0
          let startY = 0
          let startWidth = 0
          let startHeight = 0
          
          const handleMouseDown = (e: MouseEvent) => {
            if (e.target === resizeHandle) {
              e.preventDefault()
              e.stopPropagation()
              isResizing = true
              startX = e.clientX
              startY = e.clientY
              startWidth = img.offsetWidth
              startHeight = img.offsetHeight
              img.style.userSelect = 'none'
              document.addEventListener('mousemove', handleMouseMove)
              document.addEventListener('mouseup', handleMouseUp)
            }
          }
          
          const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return
            e.preventDefault()
            const deltaX = e.clientX - startX
            const newWidth = Math.max(50, startWidth + deltaX)
            img.style.width = `${newWidth}px`
            img.style.height = 'auto'
          }
          
          const handleMouseUp = () => {
            if (isResizing) {
              isResizing = false
              img.style.userSelect = ''
              const width = img.offsetWidth
              const height = img.offsetHeight
              
              if (typeof getPos === 'function') {
                const pos = getPos()
                if (pos !== null && editor) {
                  editor.commands.updateAttributes('image', {
                    width: width,
                    height: height,
                  })
                }
              }
            }
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
          }
          
          const handleMouseEnter = () => {
            resizeHandle.style.opacity = '1'
            img.style.outline = '2px solid hsl(var(--primary))'
            img.style.outlineOffset = '2px'
          }
          
          const handleMouseLeave = () => {
            if (!isResizing) {
              resizeHandle.style.opacity = '0'
              img.style.outline = ''
              img.style.outlineOffset = ''
            }
          }
          
          dom.addEventListener('mousedown', handleMouseDown)
          dom.addEventListener('mouseenter', handleMouseEnter)
          dom.addEventListener('mouseleave', handleMouseLeave)
          
          return {
            dom,
            destroy: () => {
              dom.removeEventListener('mousedown', handleMouseDown)
              dom.removeEventListener('mouseenter', handleMouseEnter)
              dom.removeEventListener('mouseleave', handleMouseLeave)
              document.removeEventListener('mousemove', handleMouseMove)
              document.removeEventListener('mouseup', handleMouseUp)
            },
          }
        }
      },
    }).configure({
      HTMLAttributes: {
        class: 'max-w-full h-auto rounded-lg',
      },
    }),
    Table.configure({
      resizable: true,
      HTMLAttributes: {
        class: 'tiptap-table',
      },
    }),
    TableRow,
    TableHeader,
    TableCell,
  ],
  editorProps: {
    attributes: {
      class: 'prose prose-invert max-w-none focus:outline-none',
    },
  },
  onUpdate: ({ editor }) => {
    emit('update:modelValue', editor.getHTML())
  },
})

function insertTable(rows: number, cols: number) {
  editor.value?.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run()
  showTableMenu.value = false
}

function addLink() {
  if (linkUrl.value && editor.value) {
    editor.value.chain().focus().setLink({ href: linkUrl.value }).run()
    linkUrl.value = ''
    showLinkDialog.value = false
  }
}

function addImage() {
  if (imageUrl.value && editor.value) {
    editor.value.chain().focus().setImage({ src: imageUrl.value }).run()
    imageUrl.value = ''
    showImageDialog.value = false
  }
}

function closeMenus(event?: Event) {
  if (event) {
    const target = event.target as HTMLElement
    // Don't close if clicking inside the menu or the button
    if (target.closest('.relative') || target.closest('[class*="popover"]') || target.closest('button')) {
      return
    }
  }
  showHeadingMenu.value = false
  showTableMenu.value = false
}

function getHeadingMenuStyle() {
  if (!headingButtonRef.value) return {}
  const rect = headingButtonRef.value.getBoundingClientRect()
  return {
    top: `${rect.bottom + 4}px`,
    left: `${rect.left}px`,
  }
}

function getTableMenuStyle() {
  if (!tableButtonRef.value) return {}
  const rect = tableButtonRef.value.getBoundingClientRect()
  return {
    top: `${rect.bottom + 4}px`,
    left: `${rect.left}px`,
  }
}

function exportToWord() {
  if (!editor.value) return
  
  const html = editor.value.getHTML()
  const text = editor.value.getText()
  
  // Create a simple Word document using HTML format
  const htmlContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <title>Document</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>90</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 11pt;
            line-height: 1.6;
          }
          h1 { font-size: 24pt; font-weight: bold; margin-top: 12pt; margin-bottom: 6pt; }
          h2 { font-size: 18pt; font-weight: bold; margin-top: 10pt; margin-bottom: 5pt; }
          h3 { font-size: 14pt; font-weight: bold; margin-top: 8pt; margin-bottom: 4pt; }
          p { margin-bottom: 6pt; }
          ul, ol { margin-left: 20pt; margin-bottom: 6pt; }
          table { border-collapse: collapse; width: 100%; margin: 6pt 0; }
          table td, table th { border: 1px solid #000; padding: 4pt; }
          table th { background-color: #f0f0f0; font-weight: bold; }
        </style>
      </head>
      <body>
        ${html}
      </body>
    </html>
  `
  
  const blob = new Blob(['\ufeff', htmlContent], {
    type: 'application/msword'
  })
  
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `document-${new Date().getTime()}.doc`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// Close menus when clicking outside
onMounted(() => {
  document.addEventListener('click', closeMenus)
})

watch(() => props.modelValue, (value) => {
  const isSame = editor.value?.getHTML() === value
  if (!isSame && editor.value) {
    editor.value.commands.setContent(value || '')
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('click', closeMenus)
  editor.value?.destroy()
})

// Expose editor instance for parent components
defineExpose({
  editor,
  insertContent: (content: string) => {
    if (editor.value) {
      // Ensure editor is focused and insert at current cursor position
      editor.value.chain().focus().insertContent(content).run()
    }
  },
  insertImage: (src: string, alt?: string) => {
    if (editor.value) {
      // Ensure editor is focused and insert image at current cursor position
      editor.value.chain().focus().setImage({ src, alt: alt || '' }).run()
    }
  }
})
</script>

<style>
.ProseMirror {
  outline: none;
  color: hsl(var(--foreground));
  font-size: 14px;
  line-height: 1.6;
}

.ProseMirror p {
  margin-bottom: 0.75em;
  font-size: 14px;
}

.ProseMirror p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left;
  color: hsl(var(--muted-foreground));
  pointer-events: none;
  height: 0;
}

.ProseMirror h1 {
  font-size: 2em;
  font-weight: 700;
  margin-top: 1em;
  margin-bottom: 0.5em;
  line-height: 1.2;
}

.ProseMirror h2 {
  font-size: 1.5em;
  font-weight: 600;
  margin-top: 0.8em;
  margin-bottom: 0.4em;
  line-height: 1.3;
}

.ProseMirror h3 {
  font-size: 1.25em;
  font-weight: 600;
  margin-top: 0.6em;
  margin-bottom: 0.3em;
}

.ProseMirror ul,
.ProseMirror ol {
  padding-left: 1.5em;
  margin-bottom: 0.75em;
}

.ProseMirror ul {
  list-style-type: disc;
}

.ProseMirror ol {
  list-style-type: decimal;
}

.ProseMirror li {
  margin-bottom: 0.25em;
}

.ProseMirror li[data-type="taskItem"] {
  display: flex;
  align-items: flex-start;
  gap: 0.5em;
}

.ProseMirror li[data-type="taskItem"] > label {
  margin-top: 0.25em;
  cursor: pointer;
}

.ProseMirror li[data-type="taskItem"] > label > input[type="checkbox"] {
  cursor: pointer;
}

.ProseMirror blockquote {
  border-left: 4px solid hsl(var(--border));
  padding-left: 1em;
  margin-left: 0;
  margin-bottom: 0.75em;
  color: hsl(var(--muted-foreground));
  font-style: italic;
}

.ProseMirror code {
  background-color: hsl(var(--muted));
  border-radius: 0.25em;
  padding: 0.2em 0.4em;
  font-family: 'Fira Code', 'JetBrains Mono', monospace;
  font-size: 0.9em;
}

.ProseMirror pre {
  background-color: hsl(var(--muted));
  border-radius: 0.5em;
  padding: 1em;
  overflow-x: auto;
  margin-bottom: 0.75em;
}

.ProseMirror pre code {
  background-color: transparent;
  padding: 0;
  color: hsl(var(--foreground));
}

.ProseMirror mark {
  background-color: hsl(var(--highlight));
  padding: 0.1em 0.2em;
  border-radius: 0.2em;
}

.ProseMirror strong {
  font-weight: 600;
}

.ProseMirror em {
  font-style: italic;
}

.ProseMirror u {
  text-decoration: underline;
}

.ProseMirror a {
  color: hsl(var(--primary));
  text-decoration: underline;
  text-underline-offset: 2px;
}

.ProseMirror hr {
  border: none;
  border-top: 2px solid hsl(var(--border));
  margin: 1.5em 0;
}

.ProseMirror .image-wrapper {
  position: relative;
  display: inline-block;
  max-width: 100%;
  margin: 1em 0;
  vertical-align: top;
}

.ProseMirror .image-wrapper .resizable-image {
  max-width: 100%;
  height: auto;
  border-radius: 0.5em;
  display: block;
  margin: 0;
  cursor: pointer;
  transition: outline 0.2s;
}

.ProseMirror .image-wrapper:hover .resizable-image {
  outline: 2px solid hsl(var(--primary));
  outline-offset: 2px;
}

.ProseMirror .image-wrapper .resize-handle {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 16px;
  height: 16px;
  background: hsl(var(--primary));
  border: 2px solid hsl(var(--background));
  border-radius: 2px;
  cursor: nwse-resize;
  opacity: 0;
  transition: opacity 0.2s;
  z-index: 10;
}

.ProseMirror .image-wrapper:hover .resize-handle {
  opacity: 1;
}

.ProseMirror .image-wrapper .resize-handle:active {
  opacity: 1;
  background: hsl(var(--primary) / 0.8);
}

/* Table Styles */
.ProseMirror .tiptap-table {
  border-collapse: collapse;
  margin: 1em 0;
  table-layout: fixed;
  width: 100%;
  overflow: hidden;
  border: 2px solid rgba(148, 163, 184, 0.4) !important;
}

.ProseMirror .tiptap-table td,
.ProseMirror .tiptap-table th {
  border: 1px solid rgba(148, 163, 184, 0.3) !important;
  box-sizing: border-box;
  min-width: 1em;
  padding: 0.5em 0.75em;
  position: relative;
  vertical-align: top;
}

.ProseMirror .tiptap-table th {
  background-color: hsl(var(--muted));
  font-weight: 600;
  text-align: left;
  border: 1px solid rgba(148, 163, 184, 0.3) !important;
  border-bottom: 2px solid rgba(148, 163, 184, 0.4) !important;
}

.ProseMirror .tiptap-table .selectedCell:after {
  z-index: 2;
  position: absolute;
  content: "";
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background: hsl(var(--accent) / 0.3);
  pointer-events: none;
}

.ProseMirror .tiptap-table .column-resize-handle {
  position: absolute;
  right: -2px;
  top: 0;
  bottom: -2px;
  width: 4px;
  background-color: hsl(var(--primary));
  pointer-events: none;
}
</style>
