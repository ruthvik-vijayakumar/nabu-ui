<template>
  <div class="dark min-h-screen bg-background text-foreground">
    <!-- Dashboard Header -->
    <header class="sticky top-0 z-50 w-full  bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div class="border-b">
      <div class="container flex h-16 items-center px-4 sm:px-6 lg:px-8 ">
        <div class="flex flex-1 items-center gap-4">
          <!-- Back Button -->
          <Button 
            variant="ghost" 
            size="icon"
            @click="$emit('back')" 
            class="h-9 w-9"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
          </Button>
          
          <!-- Scribe Name -->
          <div v-if="!scribeName" class="h-6 w-32 bg-muted rounded animate-pulse"></div>
          <h1 v-else class="text-xl font-bold text-foreground">
            {{ scribeName }}
          </h1>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-2">
          <Button 
            variant="ghost"
            @click="refreshDocuments"
            :disabled="isLoadingDocuments"
            class="h-9 px-3"
          >
            <svg 
              class="h-4 w-4 mr-2 transition-transform"
              :class="{ 'animate-spin': isLoadingDocuments }"
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            Refresh
          </Button>
        </div>
      </div>
      </div>
      <!-- Sub-header with metadata -->
      <div class="bg-muted/20 border-b">
        <div class="container px-4 sm:px-6 lg:px-8 py-3">
          <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <div class="flex items-center gap-1.5">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              <span>{{ documentStats.total }} saved item{{ documentStats.total === 1 ? '' : 's' }}</span>
            </div>
            <span v-if="documentStats.lastSaved !== '—'" class="flex items-center gap-1.5">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span>Updated {{ documentStats.lastSaved }}</span>
            </span>
            <span class="flex items-center gap-1.5">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
              </svg>
              <span>Model: {{ scribeDetails?.model || 'Default' }}</span>
            </span>
          </div>
        </div>
      </div>
    </header>

    <div class="container px-4 sm:px-6 lg:px-8 h-full">
      <div class="grid grid-cols-12">
        <!-- Left: Saved Items with Drag & Drop Widget -->
        <div 
          class="col-span-12 border-l lg:col-span-4 flex flex-col relative border-r border-border px-4 py-2" 
          style="height: calc(100vh - 120px); min-height: 600px;"
        >
          <!-- Drag & Drop Widget -->
          <div 
            class="flex-shrink-0 mb-4 relative"
            @drop.prevent="handleDrop"
            @dragover.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false"
            @dragenter.prevent="isDragging = true"
          >
            <!-- Hidden file input -->
            <input
              ref="fileInputRef"
              type="file"
              multiple
              accept="image/*,.pdf,.txt,.md"
              @change="handleFileSelect"
              class="hidden"
            />

            <Card 
              class="border-dashed transition-colors"
              :class="isDragging 
                ? 'border-primary bg-primary/10 border-2' 
                : 'border-border/50 hover:border-primary/50'"
            >
              <CardContent class="p-4">
                <div class="flex items-center gap-3">
                  <div class="flex-shrink-0">
                    <svg 
                      class="w-5 h-5 text-muted-foreground" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        stroke-linecap="round" 
                        stroke-linejoin="round" 
                        stroke-width="2" 
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-foreground">
                      {{ isDragging ? 'Drop files here' : 'Drag & drop files or' }}
                    </p>
                    <p v-if="!isDragging" class="text-xs text-muted-foreground mt-0.5">
                      Images, PDFs, text files, or links
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    @click="triggerFileInput"
                    :disabled="isUploading"
                    class="flex-shrink-0"
                  >
                    <svg v-if="!isUploading" class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                    </svg>
                    <svg v-else class="w-4 h-4 mr-1 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                    </svg>
                    {{ isUploading ? 'Uploading...' : 'Select' }}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <!-- Saved Items List -->
          <div class="flex-1 overflow-y-auto custom-scroll [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          
          <!-- Loading State -->
          <div v-if="isLoadingDocuments" class="flex-1 space-y-3 overflow-y-auto custom-scroll [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <Card v-for="n in 3" :key="n" class="animate-pulse border-border/50">
              <CardContent class="p-4">
                <div class="flex items-start gap-3">
                  <!-- Image Preview Skeleton -->
                  <div class="w-16 h-16 flex-shrink-0 bg-muted rounded-lg"></div>
                  
                  <!-- Content Skeleton -->
                  <div class="flex-1 min-w-0 space-y-2">
                    <!-- Title -->
                    <div class="h-4 bg-muted rounded w-3/4"></div>
                    <!-- URL/Preview -->
                    <div class="h-3 bg-muted rounded w-1/2"></div>
                    <!-- Metadata -->
                    <div class="flex items-center gap-2 pt-1">
                      <div class="h-3 bg-muted rounded w-16"></div>
                      <div class="h-3 bg-muted rounded w-12"></div>
                    </div>
                  </div>
                  
                  <!-- Action Menu Skeleton -->
                  <div class="w-8 h-8 flex-shrink-0 bg-muted rounded"></div>
                </div>
              </CardContent>
            </Card>
          </div>

          <!-- Documents List -->
          <div v-else-if="documents.length > 0" class="flex-1 overflow-y-auto custom-scroll space-y-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <Card
              v-for="doc in documents"
              :key="doc.id"
              class="group transition-all duration-200 overflow-hidden"
              :class="selectedDoc?.id === doc.id 
                ? 'ring-2 ring-primary/50 bg-primary/5 border-primary/30' 
                : 'hover:border-primary/30 hover:bg-accent/30 border-border/50'"
            >
              <CardContent class="p-4 cursor-pointer" @click="openSavedItem(doc)">
                <div class="flex items-start gap-3">
                  <!-- Image Preview (1:1 square on the left) -->
                  <div 
                    v-if="doc.type === 'image' && getImageUrlForDoc(doc.id)" 
                    class="relative w-16 h-16 flex-shrink-0 bg-muted overflow-hidden rounded-lg cursor-pointer"
                    @click.stop="openImageViewer(doc.id)"
                  >
                    <div class="absolute inset-0 bg-muted flex items-center justify-center z-0">
                      <svg class="w-5 h-5 text-muted-foreground animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                      </svg>
                    </div>
                    <img 
                      :src="getImageUrlForDoc(doc.id) || undefined" 
                      :alt="doc.title || 'Image'"
                      class="w-full h-full object-cover relative z-10 transition-transform duration-300 group-hover:scale-105"
                      @load="handleImageLoad"
                      @error="handleImageError"
                      style="opacity: 0"
                    />
                  </div>

                  <!-- Content -->
                  <div class="flex-1 min-w-0 space-y-2">
                    <!-- Title -->
                    <h4 class="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-tight">
                      {{ doc.title || 'Untitled' }}
                    </h4>
                    
                    <!-- Page URL (for images and screenshots) -->
                    <div v-if="(doc.type === 'image' || doc.type === 'screenshot') && doc.url" class="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
                      </svg>
                      <span class="truncate">{{ truncateUrl(doc.url) }}</span>
                    </div>
                    
                    <!-- Content Preview -->
                    <p v-if="doc.type !== 'image' && doc.type !== 'screenshot' && (doc.content || doc.notes)" class="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {{ doc.content?.substring(0, 100) || doc.notes?.substring(0, 100) || 'No preview available' }}
                    </p>

                    <!-- Metadata -->
                    <div class="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                      <span class="flex items-center gap-1">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        {{ timeAgo(doc.updated_at || doc.created_at) }}
                      </span>
                      <span>•</span>
                      <span class="uppercase text-xs font-medium">{{ doc.type }}</span>
                    </div>

                    <!-- Tags -->
                    <div v-if="(doc.tags || []).length > 0" class="flex flex-wrap gap-1.5 pt-1">
                      <span 
                        v-for="tag in doc.tags.slice(0, 3)" 
                        :key="tag" 
                        class="inline-flex items-center px-2 py-0.5 text-xs rounded-md bg-muted/60 text-foreground/80 font-medium"
                      >
                        {{ tag }}
                      </span>
                      <span 
                        v-if="doc.tags.length > 3"
                        class="inline-flex items-center px-2 py-0.5 text-xs rounded-md bg-muted/40 text-muted-foreground"
                      >
                        +{{ doc.tags.length - 3 }}
                      </span>
                    </div>
                  </div>

                  <!-- Action Buttons -->
                  <div class="flex items-center gap-1 flex-shrink-0">
                    <!-- Add to Editor Button (for text, image, screenshot only) -->
                    <Button
                      v-if="doc.type === 'text' || doc.type === 'image' || doc.type === 'screenshot'"
                      variant="ghost"
                      size="icon"
                      @click.stop="addToEditor(doc)"
                      class="h-8 w-8"
                      title="Add to Editor"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                      </svg>
                    </Button>

                    <!-- Action Menu -->
                    <div class="relative" data-doc-menu :data-doc-id="doc.id">
                      <Button
                        variant="ghost"
                        size="icon"
                        @click.stop="openDocMenu(doc.id)"
                        class="h-8 w-8"
                      >
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                        </svg>
                      </Button>
                    <Card
                      v-if="docMenuOpen === doc.id"
                      class="absolute right-0 top-10 z-50 w-48 p-1"
                    >
                      <CardContent class="p-0">
                        <Button
                          v-if="doc.url"
                          variant="ghost"
                          @click.stop="openDocumentLink(doc); docMenuOpen = null"
                          class="w-full justify-start text-sm py-1 px-3 h-8"
                        >
                          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                          </svg>
                          Open Link
                        </Button>
                        <Button
                          variant="ghost"
                          @click.stop="deleteDocument(doc); docMenuOpen = null"
                          class="w-full justify-start text-sm text-destructive py-1 px-3 h-8"
                        >
                          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                          </svg>
                          Delete
                        </Button>
                      </CardContent>
                    </Card>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <!-- Empty State -->
          <Card v-else class="flex-1 flex items-center justify-center text-center border-dashed border-border/50">
            <CardContent class="py-16 px-6">
              <div class="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
              </div>
              <p class="text-foreground font-semibold mb-1">No documents yet</p>
              <p class="text-muted-foreground text-sm">Save content to this scribe to see it here</p>
            </CardContent>
          </Card>
          </div>
        </div>

        <!-- Center: Chat Area with Tabs -->
        <div class="col-span-12 lg:col-span-8 flex flex-col border-r border-border" style="height: calc(100vh - 120px); min-height: 600px;">
          <!-- Tab Navigation -->
          <div class="flex-shrink-0 border-b border-border bg-background">
            <div class="flex items-center gap-2 px-4">
              <button
                @click="chatActiveTab = 'chat'"
                :class="[
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px',
                  chatActiveTab === 'chat'
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                ]"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
                </svg>
                Chat
              </button>
              <button
                @click="chatActiveTab = 'edra'"
                :class="[
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px',
                  chatActiveTab === 'edra'
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                ]"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                </svg>
                Editor
              </button>
            </div>
          </div>

          <!-- Chat Tab Content -->
          <div v-if="chatActiveTab === 'chat'" class="flex-1 flex flex-col min-h-0 overflow-hidden">
            <!-- Loading Chat History Skeleton -->
            <div v-if="messages.length === 0 && isLoadingHistory" class="flex-1 overflow-y-auto px-4 py-4 custom-scroll">
              <div class="w-full max-w-3xl mx-auto space-y-3">
                <div v-for="n in 3" :key="n" class="flex items-start gap-4 py-3">
                  <div class="w-8 h-8 rounded-full bg-muted animate-pulse flex-shrink-0"></div>
                  <div class="flex-1 min-w-0 space-y-2">
                    <div class="h-4 bg-muted rounded animate-pulse" :style="`width: ${85 - n * 5}%;`"></div>
                    <div class="h-4 bg-muted rounded animate-pulse" :style="`width: ${70 - n * 5}%;`"></div>
                    <div v-if="n < 3" class="h-4 bg-muted rounded animate-pulse" :style="`width: ${60 - n * 5}%;`"></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Empty State: Centered Input with Action Buttons -->
            <div v-else-if="messages.length === 0 && !isLoading && !isLoadingHistory" class="flex-1 flex flex-col items-center justify-center px-4 py-8">
              <div class="w-full max-w-2xl space-y-6">
                <!-- Title -->
                <div class="text-center space-y-2">
                  <h2 class="text-2xl font-bold text-foreground">Ask anything</h2>
                  <p class="text-sm text-muted-foreground">
                    I can help you understand and analyze the {{ documents.length }} document{{ documents.length !== 1 ? 's' : '' }} you've saved here.
                  </p>
                </div>

                <!-- Large Input Field -->
                <div class="relative">
                  <form @submit.prevent="sendMessage" class="w-full">
                    <div class="relative">
                      <Textarea
                        v-model="message"
                        @keydown.enter.exact.prevent="sendMessage"
                        @keydown.enter.shift.exact="message += '\n'"
                        rows="3"
                        placeholder="Ask anything"
                        class="w-full pr-12 resize-none transition-all bg-background border-2 border-border rounded-lg text-base"
                        :disabled="isLoading"
                        @input="autoResize"
                        ref="messageInput"
                      />
                      <Button
                        type="submit"
                        size="icon"
                        @click="sendMessage"
                        :disabled="isLoading || !message.trim()"
                        class="absolute right-2 bottom-2 h-9 w-9 bg-foreground text-background hover:bg-foreground/90"
                      >
                        <svg 
                          v-if="!isLoading"
                          class="w-4 h-4" 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18"/>
                        </svg>
                        <svg 
                          v-else
                          class="w-4 h-4 animate-spin" 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                        </svg>
                      </Button>
                    </div>
                  </form>
                </div>

                <!-- Research Action Buttons -->
                <div class="flex flex-wrap items-center justify-center gap-3">
                  <Button
                    variant="outline"
                    @click="message = 'Summarize the key findings and main arguments from all saved documents'; sendMessage()"
                    class="h-10 px-4 bg-muted/50 hover:bg-muted"
                  >
                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                    Summarize Documents
                  </Button>
                  <Button
                    variant="outline"
                    @click="message = 'Extract and list all key findings, statistics, and data points from the saved documents'; sendMessage()"
                    class="h-10 px-4 bg-muted/50 hover:bg-muted"
                  >
                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
                    </svg>
                    Extract Key Findings
                  </Button>
                  <Button
                    variant="outline"
                    @click="message = 'Compare and contrast the different perspectives, methodologies, or findings across the saved documents'; sendMessage()"
                    class="h-10 px-4 bg-muted/50 hover:bg-muted"
                  >
                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                    </svg>
                    Compare Documents
                  </Button>
                  <Button
                    variant="outline"
                    @click="message = 'Generate a literature review outline based on the themes and topics in the saved documents'; sendMessage()"
                    class="h-10 px-4 bg-muted/50 hover:bg-muted"
                  >
                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                    Literature Review
                  </Button>
                  <Button
                    variant="outline"
                    @click="message = 'Analyze the research methodologies used in the saved documents and identify their strengths and limitations'; sendMessage()"
                    class="h-10 px-4 bg-muted/50 hover:bg-muted"
                  >
                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                    </svg>
                    Analyze Methodology
                  </Button>
                  <Button
                    variant="outline"
                    @click="message = 'Generate research questions based on the gaps, themes, and findings in the saved documents'; sendMessage()"
                    class="h-10 px-4 bg-muted/50 hover:bg-muted"
                  >
                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    Research Questions
                  </Button>
                </div>
              </div>
            </div>

            <!-- Messages View: When there are messages -->
            <template v-else>
              <!-- Messages Area -->
              <div 
                ref="messagesAreaRef" 
                class="flex-1 overflow-y-auto px-4 py-4 custom-scroll"
                @contextmenu.prevent="handleBlockContextMenu($event)"
              >

              <!-- Messages -->
              <div 
                v-for="(msg, idx) in messages" 
                :key="idx"
                class="flex items-start gap-4 py-3 group bg-background"
                :data-message-index="idx"
              >
                <div class="w-full max-w-3xl mx-auto flex items-start gap-4">
                  <div 
                    class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    :class="msg.role === 'user' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground'"
                  >
                    <svg v-if="msg.role === 'user'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                    </svg>
                    <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
                    </svg>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div 
                      class="markdown-content"
                      :class="msg.role === 'user' ? 'text-foreground' : 'text-foreground'"
                      v-html="renderMarkdown(msg.content)"
                    ></div>
                    <div v-if="msg.sources && msg.sources.length > 0" class="mt-4 pt-4 border-t border-border/50">
                      <p class="text-xs text-muted-foreground mb-2 font-medium">Sources:</p>
                      <div class="space-y-2">
                        <div
                          v-for="(source, sIdx) in msg.sources.slice(0, 3)" 
                          :key="sIdx"
                          class="text-xs p-2.5 rounded-md bg-muted/50 border border-border/50"
                        >
                          <p class="text-foreground font-medium mb-1">{{ source.title }}</p>
                          <p class="text-muted-foreground line-clamp-2">{{ source.chunk_text }}</p>
                          <p class="text-muted-foreground/70 mt-1.5">Similarity: {{ (source.similarity * 100).toFixed(1) }}%</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Loading Skeleton -->
              <div v-if="isLoading" class="flex items-start gap-4 py-3 bg-background">
                <div class="w-full max-w-3xl mx-auto flex items-start gap-4">
                  <div class="w-8 h-8 rounded-full bg-muted animate-pulse flex-shrink-0"></div>
                  <div class="flex-1 min-w-0 space-y-2">
                    <div class="h-4 bg-muted rounded animate-pulse" style="width: 85%;"></div>
                    <div class="h-4 bg-muted rounded animate-pulse" style="width: 70%;"></div>
                    <div class="h-4 bg-muted rounded animate-pulse" style="width: 60%;"></div>
                  </div>
                </div>
              </div>

              <!-- Error Message -->
              <div v-if="error" class="flex items-start gap-4 py-6 bg-background">
                <div class="w-full max-w-3xl mx-auto flex items-start gap-4">
                  <div class="w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center flex-shrink-0">
                    <svg class="w-4 h-4 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                  <div class="flex-1">
                    <p class="text-sm text-destructive/90">{{ error }}</p>
                  </div>
                </div>
              </div>
              </div>

              <!-- Block Context Menu -->
              <div
                v-if="blockContextMenu.open"
                class="fixed z-[100] block-context-menu"
                :style="{ left: blockContextMenu.x + 'px', top: blockContextMenu.y + 'px' }"
                data-block-context-menu
                @click.stop
              >
                <Card class="w-48 p-1">
                  <CardContent class="p-0">
                    <Button
                      variant="ghost"
                      @click="addBlockToEditor"
                      class="w-full justify-start text-sm py-1 px-3 h-8"
                    >
                      <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                      </svg>
                      Add to Editor
                    </Button>
                    <Button
                      variant="ghost"
                      @click="copyBlockContent"
                      class="w-full justify-start text-sm py-1 px-3 h-8"
                    >
                      <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                      </svg>
                      Copy
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <!-- Input Area with Shortcuts -->
              <div class="px-4 py-4 border-t border-border/50 bg-background flex-shrink-0">
                <div class="w-full max-w-3xl mx-auto">
                  <form @submit.prevent="sendMessage" class="flex items-end gap-3 mb-3">
                    <div class="flex-1 relative">
                      <Textarea
                        v-model="message"
                        @keydown.enter.exact.prevent="sendMessage"
                        @keydown.enter.shift.exact="message += '\n'"
                        rows="1"
                        placeholder="Message Nabu AI..."
                        class="w-full pr-12 resize-none transition-all bg-muted/50 border-border"
                        :disabled="isLoading"
                        style="min-height: 48px; max-height: 120px;"
                        @input="autoResize"
                        ref="messageInput"
                      />
                      <Button
                        type="button"
                        size="icon"
                        @click="sendMessage"
                        :disabled="isLoading || !message.trim()"
                        class="absolute right-2 bottom-2 h-8 w-8"
                      >
                        <svg 
                          v-if="!isLoading"
                          class="w-4 h-4" 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                        </svg>
                        <svg 
                          v-else
                          class="w-4 h-4 animate-spin" 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                        </svg>
                      </Button>
                    </div>
                  </form>
                  
                  <!-- Research Action Buttons -->
                  <div class="flex flex-wrap items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      @click="message = 'Summarize the key findings and main arguments from all saved documents'; sendMessage()"
                      class="h-7 px-3 text-xs"
                    >
                      <svg class="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                      </svg>
                      Summarize
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      @click="message = 'Extract and list all key findings, statistics, and data points from the saved documents'; sendMessage()"
                      class="h-7 px-3 text-xs"
                    >
                      <svg class="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
                      </svg>
                      Extract Findings
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      @click="message = 'Compare and contrast the different perspectives, methodologies, or findings across the saved documents'; sendMessage()"
                      class="h-7 px-3 text-xs"
                    >
                      <svg class="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                      </svg>
                      Compare
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      @click="message = 'Generate a literature review outline based on the themes and topics in the saved documents'; sendMessage()"
                      class="h-7 px-3 text-xs"
                    >
                      <svg class="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                      </svg>
                      Literature Review
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      @click="message = 'Analyze the research methodologies used in the saved documents and identify their strengths and limitations'; sendMessage()"
                      class="h-7 px-3 text-xs"
                    >
                      <svg class="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                      </svg>
                      Methodology
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      @click="message = 'Generate research questions based on the gaps, themes, and findings in the saved documents'; sendMessage()"
                      class="h-7 px-3 text-xs"
                    >
                      <svg class="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      Research Questions
                    </Button>
                  </div>
                </div>
              </div>
            </template>
          </div>

          <!-- Edra Editor Tab Content -->
          <div v-else-if="chatActiveTab === 'edra'" class="flex-1 flex flex-col min-h-0 overflow-hidden p-4">
            <EdraEditor
              ref="edraEditorRef"
              v-model="edraContent"
              placeholder="Start writing your notes..."
              class="h-full"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Image Viewer Modal -->
    <div 
      v-if="imageViewerOpen && currentImageIndex !== null"
      class="fixed inset-0 z-[2000] bg-black/90 backdrop-blur-sm flex items-center justify-center"
      @click.self="closeImageViewer"
      @keydown.esc="closeImageViewer"
    >
      <div class="relative w-full h-full flex items-center justify-center p-4">
        <!-- Close Button -->
        <Button
          variant="ghost"
          size="icon"
          @click="closeImageViewer"
          class="absolute top-4 right-4 z-10 h-10 w-10 bg-black/50 hover:bg-black/70 text-white"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </Button>

        <!-- Previous Button -->
        <Button
          v-if="imageDocuments.length > 1"
          variant="ghost"
          size="icon"
          @click="previousImage"
          :disabled="currentImageIndex === 0"
          class="absolute left-4 z-10 h-12 w-12 bg-black/50 hover:bg-black/70 text-white disabled:opacity-30"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
        </Button>

        <!-- Next Button -->
        <Button
          v-if="imageDocuments.length > 1"
          variant="ghost"
          size="icon"
          @click="nextImage"
          :disabled="currentImageIndex === imageDocuments.length - 1"
          class="absolute right-4 z-10 h-12 w-12 bg-black/50 hover:bg-black/70 text-white disabled:opacity-30"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
          </svg>
        </Button>

        <!-- Image Container -->
        <div class="max-w-7xl max-h-full flex flex-col items-center justify-center">
          <img
            :src="currentImageUrl || undefined"
            :alt="currentImageDoc?.title || 'Image'"
            class="max-w-full max-h-[85vh] object-contain rounded-lg"
            @load="handleImageViewerImageLoad"
            @error="handleImageViewerImageError"
          />
          
          <!-- Image Info -->
          <div v-if="currentImageDoc" class="mt-4 text-center text-white">
            <p class="text-lg font-semibold">{{ currentImageDoc.title || 'Untitled' }}</p>
            <p v-if="imageDocuments.length > 1" class="text-sm text-white/70 mt-1">
              {{ currentImageIndex + 1 }} of {{ imageDocuments.length }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick, computed, watch } from 'vue'
import { databaseService } from '../utils/database'
import { edgeFunctionService } from '../utils/edgeFunctions'
import { supabase } from '../utils/supabase'
import MarkdownIt from 'markdown-it'
import { StorageManager } from '../utils/storage'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import EdraEditor from '@/components/EdraEditor.vue'

const props = defineProps<{ scribeId: string }>()
const emit = defineEmits<{ (e: 'back'): void }>()

const documents = ref<any[]>([])
const imageUrls = ref<Map<string, string | null>>(new Map()) // Cache for image URLs by document ID
const scribeName = ref<string>('')
const scribeDetails = ref<any | null>(null)
const message = ref('')
const messagesAreaRef = ref<HTMLElement | null>(null)
const isDragging = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)
const isUploading = ref(false)
const chatActiveTab = ref<'chat' | 'edra'>('chat')
const edraContent = ref('')
const edraEditorRef = ref<InstanceType<typeof EdraEditor> | null>(null)
const docMenuOpen = ref<string | null>(null)
const isSavingEditor = ref(false)
let saveEditorTimeout: ReturnType<typeof setTimeout> | null = null
const blockContextMenu = ref<{ open: boolean; x: number; y: number; content: string; messageIndex: number }>({
  open: false,
  x: 0,
  y: 0,
  content: '',
  messageIndex: -1
})
const messages = ref<Array<{
  role: 'user' | 'assistant'
  content: string
  tokens?: number
  sources?: Array<{
    document_id: string
    title: string
    chunk_text: string
    similarity: number
  }>
}>>([])
const isLoading = ref(false)
const isLoadingDocuments = ref(true)
const isLoadingHistory = ref(true)
const error = ref<string | null>(null)
const response = ref<any>(null)
const selectedDoc = ref<any>(null)
const messageInput = ref<HTMLTextAreaElement | null>(null)
const showStats = ref(true)
const STATS_PREF_KEY = 'scribe_detail_show_stats'

// Image Viewer State
const imageViewerOpen = ref(false)
const currentImageIndex = ref<number | null>(null)
const imageDocuments = computed(() => documents.value.filter(doc => doc.type === 'image' && getImageUrlForDoc(doc.id)))
const currentImageDoc = computed(() => {
  if (currentImageIndex.value === null) return null
  return imageDocuments.value[currentImageIndex.value] || null
})
const currentImageUrl = computed(() => {
  if (!currentImageDoc.value) return null
  return getImageUrlForDoc(currentImageDoc.value.id)
})
if (typeof window !== 'undefined') {
  const storedPref = window.localStorage.getItem(STATS_PREF_KEY)
  if (storedPref !== null) {
    showStats.value = storedPref === 'true'
  }
}
watch(showStats, (value) => {
  try {
    window.localStorage.setItem(STATS_PREF_KEY, value ? 'true' : 'false')
  } catch (err) {
    console.warn('Unable to persist stats preference:', err)
  }
})

const documentStats = computed(() => {
  const docs = documents.value
  const total = docs.length
  const media = docs.filter(doc => doc.type === 'image' || doc.type === 'video').length
  const deepReads = docs.filter(doc => ['page', 'text', 'pdf'].includes(doc.type)).length
  const latest = docs[0]
  const lastSavedIso = latest?.updated_at || latest?.created_at

  return {
    total,
    media,
    deepReads,
    lastSaved: lastSavedIso ? timeAgo(lastSavedIso) : '—'
  }
})

const loadDocuments = async () => {
  isLoadingDocuments.value = true
  try {
    documents.value = await databaseService.getDocumentsByScribe(props.scribeId)
    documents.value.sort((a, b) => {
      const dateA = new Date(a.updated_at || a.created_at).getTime()
      const dateB = new Date(b.updated_at || b.created_at).getTime()
      return dateB - dateA
    })
    
    // Load image URLs for all image documents
    const imageDocs = documents.value.filter(doc => doc.type === 'image')
    console.log('🖼️ Loading URLs for', imageDocs.length, 'image documents')
    
    // Load URLs in parallel
    const urlPromises = imageDocs.map(async (doc) => {
      try {
        const url = await getImageUrl(doc)
        imageUrls.value.set(doc.id, url)
        return { docId: doc.id, url }
      } catch (err) {
        console.error('❌ Failed to load image URL for document', doc.id, ':', err)
        imageUrls.value.set(doc.id, null)
        return { docId: doc.id, url: null }
      }
    })
    
    await Promise.all(urlPromises)
    console.log('✅ Loaded', imageUrls.value.size, 'image URLs')
  } catch (e) {
    console.error('Failed to load documents:', e)
  } finally {
    isLoadingDocuments.value = false
  }
}

const refreshDocuments = async () => {
  await Promise.all([loadDocuments(), loadChatHistory()])
}

const loadChatHistory = async () => {
  isLoadingHistory.value = true
  try {
    const history = await databaseService.getScribeMessages(props.scribeId)
    const filtered = history.filter((msg) => msg.role === 'user' || msg.role === 'assistant')
    messages.value = filtered.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
      tokens: msg.tokens
    }))
    await nextTick()
    scrollToBottom(false) // Immediate scroll for initial load
  } catch (err) {
    console.error('Failed to load chat history:', err)
  } finally {
    isLoadingHistory.value = false
  }
}

// Helper function to get image URL from the Map (for template use)
function getImageUrlForDoc(docId: string): string | null {
  return imageUrls.value.get(docId) || null
}

// Drag and Drop Handlers
const storageManager = StorageManager.getInstance()

function triggerFileInput() {
  fileInputRef.value?.click()
}

async function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const files = target.files
  if (!files || files.length === 0) return
  
  await processFiles(Array.from(files))
  // Reset input
  if (target) target.value = ''
}

async function handleDrop(event: DragEvent) {
  isDragging.value = false
  
  const items = event.dataTransfer?.items
  const files = event.dataTransfer?.files
  
  if (!items && !files) return

  const fileList: File[] = []
  const textPromises: Promise<string>[] = []

  // Process DataTransferItemList (more reliable for mixed content)
  if (items) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      
      if (item.kind === 'file') {
        const file = item.getAsFile()
        if (file) fileList.push(file)
      } else if (item.kind === 'string') {
        // Handle text/URL drops - getAsString is async
        if (item.type === 'text/uri-list' || item.type === 'text/plain' || item.type === 'text/html') {
          const promise = new Promise<string>((resolve) => {
            item.getAsString((str) => resolve(str))
          })
          textPromises.push(promise)
        }
      }
    }
  } else if (files) {
    // Fallback to FileList
    fileList.push(...Array.from(files))
  }

  // Process files first
  if (fileList.length > 0) {
    await processFiles(fileList)
  }

  // Process text/URL items
  const textItems = await Promise.all(textPromises)
  for (const text of textItems) {
    if (text.startsWith('http://') || text.startsWith('https://')) {
      await processUrl(text)
    } else if (text.trim().length > 0) {
      // Check if it's HTML and extract text
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = text
      const plainText = tempDiv.textContent || tempDiv.innerText || text
      if (plainText.trim().length > 0) {
        await processText(plainText)
      }
    }
  }
}

async function processFiles(files: File[]) {
  if (isUploading.value) return
  isUploading.value = true

  try {
    for (const file of files) {
      const fileType = file.type
      const fileName = file.name
      
      // Determine document type
      let docType: 'image' | 'pdf' | 'text' | 'page' = 'text'
      if (fileType.startsWith('image/')) {
        docType = 'image'
      } else if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
        docType = 'pdf'
      } else if (fileType.startsWith('text/') || fileName.endsWith('.txt') || fileName.endsWith('.md')) {
        docType = 'text'
      }

      // Read file content
      if (docType === 'image') {
        // Convert image to data URL
        const reader = new FileReader()
        const dataUrl = await new Promise<string>((resolve, reject) => {
          reader.onload = (e) => resolve(e.target?.result as string)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
        
        await storageManager.saveContent({
          type: 'image',
          title: fileName.replace(/\.[^/.]+$/, ''),
          url: window.location.href,
          content: dataUrl,
          notes: '',
          tags: [],
          metadata: { originalFileName: fileName },
          scribe_id: props.scribeId
        } as any)
      } else if (docType === 'pdf') {
        // For PDFs, extract text first for vectorization
        const reader = new FileReader()
        const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
          reader.onload = (e) => resolve(e.target?.result as ArrayBuffer)
          reader.onerror = reject
          reader.readAsArrayBuffer(file)
        })
        
        // Convert to base64 for storage
        const bytes = new Uint8Array(arrayBuffer)
        const binary = bytes.reduce((acc, byte) => acc + String.fromCharCode(byte), '')
        const base64 = btoa(binary)
        const dataUrl = `data:application/pdf;base64,${base64}`
        
        // Extract text from PDF using PDF.js for vectorization
        let extractedText = ''
        try {
          // Dynamically import PDF.js
          const pdfjsModule = await import('pdfjs-dist')
          const pdfjsLib = pdfjsModule.default || pdfjsModule
          pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('pdf.worker.min.mjs')
          
          const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
          const pdfDocument = await loadingTask.promise
          
          console.log(`📄 Extracting text from PDF: ${pdfDocument.numPages} pages`)
          
          // Extract text from all pages
          const allText: string[] = []
          for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
            const page = await pdfDocument.getPage(pageNum)
            const textContent = await page.getTextContent()
            const pageText = textContent.items
              .map((item: any) => item.str)
              .join(' ')
            
            if (pageText.trim()) {
              allText.push(`[Page ${pageNum}]\n${pageText}\n`)
            }
          }
          
          extractedText = allText.join('\n\n')
          console.log(`✅ Extracted ${extractedText.length} characters from PDF`)
        } catch (pdfError) {
          console.warn('⚠️ Failed to extract text from PDF, will save PDF file only:', pdfError)
          // Continue without text - PDF will be saved but may not be vectorized
        }
        
        await storageManager.saveContent({
          type: 'pdf',
          title: fileName.replace(/\.[^/.]+$/, ''),
          url: window.location.href,
          content: extractedText || dataUrl, // Use extracted text if available, otherwise data URL
          notes: '',
          tags: [],
          metadata: { 
            originalFileName: fileName,
            hasExtractedText: !!extractedText,
            extractedTextLength: extractedText.length
          },
          scribe_id: props.scribeId
        } as any)
      } else {
        // Text file
        const text = await file.text()
        await storageManager.saveContent({
          type: 'text',
          title: fileName.replace(/\.[^/.]+$/, ''),
          url: window.location.href,
          content: text,
          notes: '',
          tags: [],
          metadata: { originalFileName: fileName },
          scribe_id: props.scribeId
        } as any)
      }
    }

    // Refresh documents list
    await loadDocuments()
    
    // Note: Vectorization is automatically triggered by storageManager.saveContent()
    // Images -> processImage() edge function
    // Text/PDF -> processDocument() edge function
    // This happens asynchronously in the background
    console.log('✅ Files uploaded. Vectorization will process in the background.')
  } catch (error: any) {
    console.error('Error processing files:', error)
    error.value = `Failed to upload files: ${error.message || 'Unknown error'}`
  } finally {
    isUploading.value = false
  }
}

async function processUrl(url: string) {
  if (isUploading.value) return
  isUploading.value = true

  try {
    await storageManager.saveContent({
      type: 'page',
      title: new URL(url).hostname,
      url: url,
      content: '',
      notes: '',
      tags: [],
      metadata: { source: 'drag-drop' },
      scribe_id: props.scribeId
    } as any)

    await loadDocuments()
  } catch (error: any) {
    console.error('Error processing URL:', error)
    error.value = `Failed to save URL: ${error.message || 'Unknown error'}`
  } finally {
    isUploading.value = false
  }
}

async function processText(text: string) {
  if (isUploading.value || !text.trim()) return
  isUploading.value = true

  try {
    await storageManager.saveContent({
      type: 'text',
      title: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
      url: window.location.href,
      content: text,
      notes: '',
      tags: [],
      metadata: { source: 'drag-drop' },
      scribe_id: props.scribeId
    } as any)

    await loadDocuments()
  } catch (error: any) {
    console.error('Error processing text:', error)
    error.value = `Failed to save text: ${error.message || 'Unknown error'}`
  } finally {
    isUploading.value = false
  }
}

onMounted(async () => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('contextmenu', handleClickOutside)
  const s = await databaseService.getScribeById(props.scribeId)
  scribeName.value = s?.name || 'Scribe'
  scribeDetails.value = s || null
  
  // Load editor content if it exists
  if (s && (s as any).editor_content) {
    edraContent.value = (s as any).editor_content
  }
  
  await Promise.all([loadDocuments(), loadChatHistory()])
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('contextmenu', handleClickOutside)
})

function truncateUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.replace('www.', '')
    const pathname = urlObj.pathname
    const fullPath = hostname + pathname
    
    if (fullPath.length > 50) {
      return hostname + pathname.substring(0, 47 - hostname.length) + '...'
    }
    return fullPath
  } catch {
    // If URL parsing fails, just truncate the string
    if (url.length > 50) {
      return url.substring(0, 47) + '...'
    }
    return url
  }
}

function timeAgo(iso: string) {
  const d = new Date(iso)
  const diff = Math.floor((Date.now() - d.getTime()) / 1000)
  if (diff < 60) return 'just now'
  const m = Math.floor(diff/60); if (m < 60) return `${m} min ago`
  const h = Math.floor(m/60); if (h < 24) return `${h} hour${h>1?'s':''} ago`
  const w = Math.floor(h/24/7); if (w >= 1) return `${w} week${w>1?'s':''} ago`
  const days = Math.floor(h/24); return `${days} day${days>1?'s':''} ago`
}

async function getImageUrl(doc: any): Promise<string | null> {
  if (doc.type !== 'image') return null
  
  console.log('🖼️ Getting image URL for document:', {
    id: doc.id,
    title: doc.title,
    media_url: doc.media_url,
    storage_object_path: doc.storage_object_path,
    type: doc.type
  })
  
  // Prefer media_url if it's already a full URL
  if (doc.media_url && (doc.media_url.startsWith('http://') || doc.media_url.startsWith('https://'))) {
    console.log('✅ Using full URL from media_url:', doc.media_url)
    return doc.media_url
  }
  
  // If it's a data URL, return it directly
  if (doc.media_url && doc.media_url.startsWith('data:')) {
    console.log('✅ Using data URL from media_url')
    return doc.media_url
  }
  
  // Try to construct signed URL from storage_object_path or media_url (bucket is private)
  let storagePath = doc.storage_object_path || doc.media_url
  if (storagePath) {
    // Clean the path - remove bucket name if included, remove leading slashes, remove full URLs
    storagePath = storagePath
      .replace(/^https?:\/\/[^\/]+\/storage\/v1\/object\/public\/nabu-ai-object-storage\//, '') // Remove full Supabase Storage URL
      .replace(/^https?:\/\/[^\/]+\/storage\/v1\/object\/sign\/nabu-ai-object-storage\//, '') // Remove signed URL prefix
      .replace(/^nabu-ai-object-storage\//, '') // Remove bucket prefix if present
      .replace(/^\//, '') // Remove leading slash
      .split('?')[0] // Remove query parameters (e.g., from signed URLs)
      .trim()
    
    // Validate path format (should be like: images/user-id/filename.ext or screenshots/user-id/filename.ext)
    if (!storagePath || storagePath.length === 0) {
      console.warn('⚠️ Storage path is empty after cleaning')
      return null
    }
    
    // Check if path looks valid (should have at least prefix/user-id/filename pattern)
    const pathParts = storagePath.split('/')
    if (pathParts.length < 3) {
      console.warn('⚠️ Storage path format looks incorrect:', storagePath, 'Expected format: prefix/user-id/filename.ext')
    }
    
    console.log('📁 Using cleaned storage path:', storagePath)
    
    try {
      // For private buckets, we need to use signed URLs (valid for 1 hour)
      const { data: signedData, error: signedError } = await supabase.storage
        .from('nabu-ai-object-storage')
        .createSignedUrl(storagePath, 3600) // 1 hour expiry
      
      if (signedError) {
        console.error('❌ Error creating signed URL:', signedError)
        console.error('❌ Signed URL error details:', {
          message: signedError.message,
          statusCode: (signedError as any).statusCode,
          error: signedError
        })
        
        // Check if it's a "Bucket not found" error
        if (signedError.message?.includes('Bucket not found') || (signedError as any).statusCode === '404') {
          console.error('❌ BUCKET NOT FOUND: The bucket "nabu-ai-object-storage" does not exist in your Supabase project.')
          console.error('📋 To fix this:')
          console.error('   1. Go to https://supabase.com/dashboard')
          console.error('   2. Select your project')
          console.error('   3. Navigate to Storage in the left sidebar')
          console.error('   4. Click "New bucket"')
          console.error('   5. Name it: nabu-ai-object-storage')
          console.error('   6. Set "Public bucket" to OFF (private)')
          console.error('   7. Click "Create bucket"')
          console.error('   8. Set up storage policies (see FIX_BUCKET_NOT_FOUND.md)')
          return null
        }
        
        // Fallback to public URL (in case bucket is actually public)
        console.log('🔄 Falling back to public URL...')
        const { data: pubData } = supabase.storage.from('nabu-ai-object-storage').getPublicUrl(storagePath)
        const publicUrl = pubData?.publicUrl
        console.log('🔗 Generated public URL (fallback):', publicUrl)
        return publicUrl || null
      }
      
      const signedUrl = signedData?.signedUrl
      console.log('✅ Generated signed URL:', signedUrl)
      
      // Log the full URL structure for debugging
      if (signedUrl) {
        console.log('🔍 URL breakdown:', {
          originalPath: doc.storage_object_path || doc.media_url,
          cleanedPath: storagePath,
          signedUrl: signedUrl,
          bucket: 'nabu-ai-object-storage',
          expiresIn: '1 hour'
        })
      }
      
      return signedUrl || null
    } catch (err: any) {
      console.error('❌ Error getting image URL:', err)
      console.error('❌ Error details:', {
        message: err?.message,
        stack: err?.stack,
        error: err
      })
      
      // Last resort: try public URL
      try {
        const { data: pubData } = supabase.storage.from('nabu-ai-object-storage').getPublicUrl(storagePath)
        return pubData?.publicUrl || null
      } catch (pubErr) {
        console.error('❌ Public URL fallback also failed:', pubErr)
        return null
      }
    }
  }
  
  console.warn('⚠️ No storage path or media_url found for image document')
  return null
}

function handleImageLoad(event: Event) {
  const img = event.target as HTMLImageElement
  img.style.opacity = '1'
  // Hide loading placeholder
  const placeholder = img.parentElement?.querySelector('.absolute')
  if (placeholder) {
    (placeholder as HTMLElement).style.display = 'none'
  }
}

function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement
  console.warn('⚠️ Failed to load image:', img.src)
  
  // Check if it's a bucket error
  if (img.src && img.src.includes('supabase.co') && img.src.includes('storage')) {
    console.error('❌ Image failed to load. Possible causes:')
    console.error('   1. Bucket "nabu-ai-object-storage" does not exist')
    console.error('   2. Storage policies do not allow public access')
    console.error('   3. File path is incorrect')
    console.error('   → Check Supabase Dashboard → Storage to verify bucket exists')
  }
  
  img.style.display = 'none'
  // Show error state
  const placeholder = img.parentElement?.querySelector('.absolute')
  if (placeholder) {
    (placeholder as HTMLElement).innerHTML = `
      <div class="flex items-center justify-center h-full text-gray-500">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>
      </div>
    `
  }
}

function openDocMenu(docId: string) {
  docMenuOpen.value = docMenuOpen.value === docId ? null : docId
}

async function getPdfUrlFromDoc(doc: any): Promise<string | null> {
  console.log('🔍 Getting PDF URL from doc:', {
    id: doc.id,
    type: doc.type,
    hasMetadata: !!doc.metadata,
    metadata: doc.metadata,
    metadataPdfUrl: doc.metadata?.pdfUrl,
    mediaUrl: doc.media_url,
    mediaType: doc.media_type,
    url: doc.url,
    storagePath: doc.storage_object_path,
    contentPreview: typeof doc.content === 'string' ? doc.content.substring(0, 100) : typeof doc.content
  })

  // Parse metadata if it's a string (JSON)
  let metadata = doc.metadata
  if (typeof metadata === 'string') {
    try {
      metadata = JSON.parse(metadata)
    } catch (e) {
      console.warn('⚠️ Failed to parse metadata as JSON:', e)
    }
  }

  // Prefer explicit PDF URL from metadata if present
  if (metadata && typeof metadata.pdfUrl === 'string' && metadata.pdfUrl) {
    console.log('✅ Using PDF URL from metadata:', metadata.pdfUrl)
    return metadata.pdfUrl
  }

  const isPdfSelection = Array.isArray(doc.tags) && doc.tags.includes('pdf-selection')
  const isPdfDoc = doc.type === 'pdf' || isPdfSelection || doc.media_type === 'application/pdf'

  // Helper function to check if a string looks like a storage path
  const isStoragePath = (path: string): boolean => {
    if (!path || typeof path !== 'string') return false
    return (
      path.includes('nabu-ai-object-storage') ||
      path.includes('/storage/v1/object/') ||
      (!path.startsWith('http://') && !path.startsWith('https://') && !path.startsWith('data:') && !path.startsWith('blob:') && path.length > 0 && path.includes('/'))
    )
  }

  // Helper function to extract storage path from media_url or storage_object_path
  const extractStoragePath = (path: string): string => {
    // Remove bucket name prefix if present
    let cleaned = path.replace(/^nabu-ai-object-storage\//, '').replace(/^\//, '')
    // Remove storage API path prefix if present
    cleaned = cleaned.replace(/^storage\/v1\/object\/[^/]+\//, '')
    return cleaned
  }

  // Helper function to get signed URL from storage path
  const getSignedUrlFromPath = async (storagePath: string): Promise<string | null> => {
    try {
      const cleanedPath = extractStoragePath(storagePath)
      console.log('🔍 Attempting to get signed URL for path:', cleanedPath)
      
      const { data: signedData, error: signedError } = await supabase.storage
        .from('nabu-ai-object-storage')
        .createSignedUrl(cleanedPath, 3600)
      
      if (!signedError && signedData?.signedUrl) {
        console.log('✅ Using signed URL from storage path:', signedData.signedUrl)
        return signedData.signedUrl
      }
      
      // Fallback to public URL if signed URL fails
      if (signedError) {
        console.warn('⚠️ Failed to get signed URL, trying public URL:', signedError)
        const { data: pubData } = supabase.storage.from('nabu-ai-object-storage').getPublicUrl(cleanedPath)
        if (pubData?.publicUrl) {
          console.log('✅ Using public URL from storage:', pubData.publicUrl)
          return pubData.publicUrl
        }
      }
    } catch (err) {
      console.warn('⚠️ Failed to get URL from storage:', err)
    }
    return null
  }

  // For PDF documents, check media_url - might be a direct URL or storage path
  if (isPdfDoc && doc.media_url && typeof doc.media_url === 'string') {
    const mediaUrl = doc.media_url as string
    
    // If it's a direct URL (http, https, data, blob), use it
    if (
      mediaUrl.startsWith('http://') ||
      mediaUrl.startsWith('https://') ||
      mediaUrl.startsWith('data:') ||
      mediaUrl.startsWith('blob:')
    ) {
      console.log('✅ Using media_url as direct URL for PDF:', mediaUrl)
      return mediaUrl
    }
    
    // If it looks like a storage path, try to get signed URL
    if (isStoragePath(mediaUrl)) {
      const signedUrl = await getSignedUrlFromPath(mediaUrl)
      if (signedUrl) {
        return signedUrl
      }
      // If signed URL failed but it's a storage path, log for debugging
      console.warn('⚠️ Storage path found but could not get signed URL:', mediaUrl)
    }
    
    // For PDF selections, also accept URLs that contain .pdf
    if (isPdfSelection && mediaUrl.toLowerCase().includes('.pdf')) {
      console.log('✅ Using media_url for PDF selection (contains .pdf):', mediaUrl)
      return mediaUrl
    }
  }

  // Check content field - might contain PDF URL or data URL
  if (doc.content && typeof doc.content === 'string') {
    const content = doc.content as string
    // Check if content is a PDF URL
    if (
      (content.startsWith('http://') || content.startsWith('https://') || content.startsWith('blob:')) &&
      (content.toLowerCase().includes('.pdf') || isPdfDoc)
    ) {
      console.log('✅ Using content as PDF URL:', content)
      return content
    }
    // Check if content is a data URL PDF
    if (content.startsWith('data:application/pdf') || content.startsWith('data:application/octet-stream')) {
      console.log('✅ Using content as PDF data URL')
      return content
    }
    // Check if content is a storage path
    if (isStoragePath(content)) {
      const signedUrl = await getSignedUrlFromPath(content)
      if (signedUrl) {
        return signedUrl
      }
    }
  }

  // Check if we have a storage_object_path for PDFs - need to get signed URL
  if (isPdfDoc && doc.storage_object_path) {
    const signedUrl = await getSignedUrlFromPath(doc.storage_object_path)
    if (signedUrl) {
      return signedUrl
    }
  }

  // Fallback: if the main URL looks like a PDF link, use that
  if (doc.url && typeof doc.url === 'string') {
    const url = doc.url as string
    // Check if it's a direct URL
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) {
      if (url.toLowerCase().includes('.pdf') || isPdfDoc) {
        console.log('✅ Using URL as PDF:', url)
        return url
      }
    }
    // Check if it's a storage path
    if (isStoragePath(url)) {
      const signedUrl = await getSignedUrlFromPath(url)
      if (signedUrl) {
        return signedUrl
      }
    }
  }

  // Last resort: check metadata.sourceUrl
  if (metadata && typeof metadata.sourceUrl === 'string' && metadata.sourceUrl) {
    const sourceUrl = metadata.sourceUrl
    // Check if it's a direct URL
    if (
      sourceUrl.startsWith('http://') ||
      sourceUrl.startsWith('https://') ||
      sourceUrl.startsWith('blob:')
    ) {
      if (sourceUrl.toLowerCase().includes('.pdf') || isPdfDoc) {
        console.log('✅ Using sourceUrl from metadata as PDF URL:', sourceUrl)
        return sourceUrl
      }
    }
    // Check if it's a storage path
    if (isStoragePath(sourceUrl)) {
      const signedUrl = await getSignedUrlFromPath(sourceUrl)
      if (signedUrl) {
        return signedUrl
      }
    }
  }

  console.warn('⚠️ No PDF URL found for document:', doc.id, {
    type: doc.type,
    media_url: doc.media_url,
    storage_object_path: doc.storage_object_path,
    url: doc.url,
    hasMetadata: !!metadata,
    metadataSourceUrl: metadata?.sourceUrl
  })
  return null
}

async function openSavedItem(doc: any) {
  // Images already open a dedicated viewer on thumbnail click
  if (doc.type === 'image' && getImageUrlForDoc(doc.id)) {
    openImageViewer(doc.id)
    return
  }

  // Open full PDF in viewer
  if (doc.type === 'pdf') {
    const pdfUrl = await getPdfUrlFromDoc(doc)
    // Parse metadata to get sourceUrl
    let metadata = doc.metadata
    if (typeof metadata === 'string') {
      try {
        metadata = JSON.parse(metadata)
      } catch (e) {
        // Ignore parse errors
      }
    }
    const sourceUrl = (metadata && metadata.sourceUrl) || (doc.url && doc.url.toLowerCase().includes('.pdf') ? doc.url : null) || pdfUrl

    if (pdfUrl && typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      console.log('📄 Opening PDF in viewer:', { pdfUrl, sourceUrl })
      chrome.runtime.sendMessage(
        {
          action: 'openPDFViewer',
          pdfUrl,
          sourceUrl
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error('❌ Error opening PDF viewer:', chrome.runtime.lastError)
            // Only fallback to URL if it's actually a PDF URL
            if (doc.url && doc.url.toLowerCase().includes('.pdf')) {
              openDocumentLink(doc)
            } else {
              alert('Failed to open PDF viewer. PDF URL not found.')
            }
          } else if (response && !response.success) {
            console.error('❌ Failed to open PDF viewer:', response.error)
            // Only fallback to URL if it's actually a PDF URL
            if (doc.url && doc.url.toLowerCase().includes('.pdf')) {
              openDocumentLink(doc)
            } else {
              alert('Failed to open PDF viewer: ' + (response.error || 'Unknown error'))
            }
          }
        }
      )
      return
    }

    // Fallback: only open URL if it's actually a PDF URL
    console.warn('⚠️ No PDF URL found')
    
    // Try one more time with more detailed logging
    console.log('🔍 Document details for debugging:', {
      id: doc.id,
      type: doc.type,
      media_url: doc.media_url,
      storage_object_path: doc.storage_object_path,
      url: doc.url,
      metadata: doc.metadata
    })
    
    if (doc.url && doc.url.toLowerCase().includes('.pdf')) {
      console.log('⚠️ Falling back to doc.url (contains .pdf):', doc.url)
      openDocumentLink(doc)
    } else {
      // More helpful error message
      const errorMsg = `Cannot open PDF: PDF URL not found in document.\n\nDocument ID: ${doc.id}\nType: ${doc.type}\nMedia URL: ${doc.media_url || 'N/A'}\nStorage Path: ${doc.storage_object_path || 'N/A'}`
      console.error('❌', errorMsg)
      alert(errorMsg)
    }
    return
  }

  // PDF text selections (saved from PDF viewer)
  const isPdfSelection =
    Array.isArray(doc.tags) && doc.tags.includes('pdf-selection')

  if (isPdfSelection) {
    const pdfUrl = await getPdfUrlFromDoc(doc)
    // Parse metadata to get sourceUrl
    let metadata = doc.metadata
    if (typeof metadata === 'string') {
      try {
        metadata = JSON.parse(metadata)
      } catch (e) {
        // Ignore parse errors
      }
    }
    const sourceUrl = (metadata && metadata.sourceUrl) || (doc.url && doc.url.toLowerCase().includes('.pdf') ? doc.url : null) || pdfUrl

    if (pdfUrl && typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      console.log('📄 Opening PDF selection in viewer:', { pdfUrl, sourceUrl })
      chrome.runtime.sendMessage(
        {
          action: 'openPDFViewer',
          pdfUrl,
          sourceUrl
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error('❌ Error opening PDF viewer:', chrome.runtime.lastError)
            // Only fallback to URL if it's actually a PDF URL
            if (doc.url && doc.url.toLowerCase().includes('.pdf')) {
              openDocumentLink(doc)
            } else {
              alert('Failed to open PDF viewer. PDF URL not found.')
            }
          } else if (response && !response.success) {
            console.error('❌ Failed to open PDF viewer:', response.error)
            // Only fallback to URL if it's actually a PDF URL
            if (doc.url && doc.url.toLowerCase().includes('.pdf')) {
              openDocumentLink(doc)
            } else {
              alert('Failed to open PDF viewer: ' + (response.error || 'Unknown error'))
            }
          }
        }
      )
      return
    }

    // Fallback: only open URL if it's actually a PDF URL
    console.warn('⚠️ No PDF URL found for selection')
    
    // Try one more time with more detailed logging
    console.log('🔍 Document details for debugging:', {
      id: doc.id,
      type: doc.type,
      media_url: doc.media_url,
      storage_object_path: doc.storage_object_path,
      url: doc.url,
      metadata: doc.metadata,
      tags: doc.tags
    })
    
    if (doc.url && doc.url.toLowerCase().includes('.pdf')) {
      console.log('⚠️ Falling back to doc.url (contains .pdf):', doc.url)
      openDocumentLink(doc)
    } else {
      // More helpful error message
      const errorMsg = `Cannot open PDF: PDF URL not found in document metadata.\n\nDocument ID: ${doc.id}\nType: ${doc.type}\nMedia URL: ${doc.media_url || 'N/A'}\nStorage Path: ${doc.storage_object_path || 'N/A'}`
      console.error('❌', errorMsg)
      alert(errorMsg)
    }
    return
  }

  // Default behaviour: open associated link if present
  if (doc.url) {
    openDocumentLink(doc)
  }
}

async function addToEditor(doc: any) {
  // Switch to editor tab if not already there
  if (chatActiveTab.value !== 'edra') {
    chatActiveTab.value = 'edra'
    await nextTick()
  }

  // Wait a bit more to ensure editor is fully mounted
  await nextTick()

  if (!edraEditorRef.value) {
    console.warn('Editor not available')
    return
  }

  if (doc.type === 'text') {
    // Add text content at cursor position
    const textContent = doc.content || doc.notes || ''
    if (textContent) {
      // Split by newlines and create paragraphs
      const paragraphs = textContent.split('\n').filter((p: string) => p.trim())
      if (paragraphs.length > 0) {
        const htmlContent = paragraphs.map((p: string) => `<p>${p}</p>`).join('')
        edraEditorRef.value.insertContent(htmlContent)
      }
    }
  } else if (doc.type === 'image' || doc.type === 'screenshot') {
    // Add image at cursor position
    const imageUrl = getImageUrlForDoc(doc.id)
    if (imageUrl) {
      const altText = doc.title || 'Image'
      edraEditorRef.value.insertImage(imageUrl, altText)
    }
  }
}

function handleClickOutside(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (!target.closest('[data-doc-menu]')) {
    docMenuOpen.value = null
  }
  if (!target.closest('[data-block-context-menu]') && !target.closest('.block-context-menu')) {
    blockContextMenu.value.open = false
  }
}

function handleBlockContextMenu(event: MouseEvent) {
  const target = event.target as HTMLElement
  
  // Find the closest block element (p, table, ul, ol, blockquote, h1-h6, pre)
  const blockElements = ['p', 'table', 'ul', 'ol', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'pre']
  let blockElement: HTMLElement | null = null
  
  for (const tag of blockElements) {
    blockElement = target.closest(tag)
    if (blockElement) break
  }
  
  // If clicked on a table, get the table wrapper
  if (!blockElement && target.closest('.table-wrapper')) {
    blockElement = target.closest('.table-wrapper') as HTMLElement
  }
  
  // Also check if clicked inside markdown-content
  const markdownContainer = target.closest('.markdown-content')
  if (!markdownContainer) return
  
  // Find the message index from the parent
  const messageContainer = markdownContainer.closest('[data-message-index]')
  const messageIndex = messageContainer ? parseInt(messageContainer.getAttribute('data-message-index') || '0') : 0
  
  if (blockElement) {
    event.preventDefault()
    event.stopPropagation()
    blockContextMenu.value = {
      open: true,
      x: event.clientX,
      y: event.clientY,
      content: blockElement.outerHTML,
      messageIndex
    }
  }
}

async function addBlockToEditor() {
  if (!blockContextMenu.value.content) return
  
  // Switch to editor tab if not already there
  if (chatActiveTab.value !== 'edra') {
    chatActiveTab.value = 'edra'
    await nextTick()
  }
  
  // Wait for editor to be fully mounted and visible
  await nextTick()
  await new Promise(resolve => setTimeout(resolve, 100))
  
  if (!edraEditorRef.value || !edraEditorRef.value.editor) {
    console.warn('Editor not available')
    return
  }
  
  // Focus the editor first to ensure cursor position is active
  edraEditorRef.value.editor.chain().focus().run()
  
  // Wait a bit for focus to be established
  await new Promise(resolve => setTimeout(resolve, 50))
  
  // Insert the block content at cursor position
  edraEditorRef.value.insertContent(blockContextMenu.value.content)
  blockContextMenu.value.open = false
}

async function copyBlockContent() {
  if (!blockContextMenu.value.content) return
  
  try {
    // Create a temporary element to extract text
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = blockContextMenu.value.content
    const textContent = tempDiv.textContent || tempDiv.innerText || ''
    
    await navigator.clipboard.writeText(textContent)
    blockContextMenu.value.open = false
    
    // Show a brief success feedback (optional)
    // You could add a toast notification here
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}

// Auto-save editor content with debouncing
async function saveEditorContent() {
  if (isSavingEditor.value) return
  
  isSavingEditor.value = true
  try {
    // Update scribe with editor content
    // Note: This assumes the database has an editor_content column
    // If not, you'll need to add a migration first
    await databaseService.updateScribe(props.scribeId, {
      editor_content: edraContent.value
    } as any)
    console.log('✅ Editor content saved')
  } catch (error: any) {
    console.error('❌ Failed to save editor content:', error)
    // If the column doesn't exist, we'll get an error but won't break the app
  } finally {
    isSavingEditor.value = false
  }
}

// Watch for editor content changes and auto-save with debounce
watch(edraContent, () => {
  // Clear existing timeout
  if (saveEditorTimeout) {
    clearTimeout(saveEditorTimeout)
  }
  
  // Set new timeout to save after 2 seconds of inactivity
  saveEditorTimeout = setTimeout(() => {
    saveEditorContent()
  }, 2000)
})

function openDocumentLink(doc: any) {
  if (doc.url) {
    chrome.tabs.create({ url: doc.url })
  }
}

async function deleteDocument(doc: any) {
  if (!confirm(`Are you sure you want to delete "${doc.title || 'this document'}"?`)) {
    return
  }

  try {
    isLoadingDocuments.value = true
    
    // First, delete associated vectors from document_vector table
    const { error: vectorError } = await supabase
      .from('document_vector')
      .delete()
      .eq('document_id', doc.id)

    if (vectorError) {
      console.warn('⚠️ Error deleting vectors (may not exist):', vectorError)
      // Continue with document deletion even if vectors fail (they might not exist)
    } else {
      console.log('✅ Deleted vectors for document:', doc.id)
    }

    // Delete the document (this should also cascade delete vectors, but we do it explicitly above)
    const { error } = await supabase
      .from('document')
      .delete()
      .eq('id', doc.id)

    if (error) {
      throw error
    }

    // Remove from local state
    documents.value = documents.value.filter(d => d.id !== doc.id)
    imageUrls.value.delete(doc.id)
    
    // If it was selected, clear selection
    if (selectedDoc.value?.id === doc.id) {
      selectedDoc.value = null
    }

    console.log('✅ Document and vectors deleted successfully')
  } catch (error: any) {
    console.error('❌ Error deleting document:', error)
    alert(`Failed to delete document: ${error.message || 'Unknown error'}`)
  } finally {
    isLoadingDocuments.value = false
  }
}

// Image Viewer Functions
function openImageViewer(docId: string) {
  const index = imageDocuments.value.findIndex(doc => doc.id === docId)
  if (index !== -1) {
    currentImageIndex.value = index
    imageViewerOpen.value = true
    // Prevent body scroll when viewer is open
    document.body.style.overflow = 'hidden'
  }
}

function closeImageViewer() {
  imageViewerOpen.value = false
  currentImageIndex.value = null
  document.body.style.overflow = ''
}

function nextImage() {
  if (currentImageIndex.value !== null && currentImageIndex.value < imageDocuments.value.length - 1) {
    currentImageIndex.value++
  }
}

function previousImage() {
  if (currentImageIndex.value !== null && currentImageIndex.value > 0) {
    currentImageIndex.value--
  }
}

function handleImageViewerImageLoad(event: Event) {
  const img = event.target as HTMLImageElement
  img.style.opacity = '1'
}

function handleImageViewerImageError(event: Event) {
  const img = event.target as HTMLImageElement
  console.warn('⚠️ Failed to load image in viewer:', img.src)
  img.style.display = 'none'
}

// Keyboard navigation for image viewer
function handleImageViewerKeydown(event: KeyboardEvent) {
  if (!imageViewerOpen.value) return
  
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
    event.preventDefault()
    nextImage()
  } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
    event.preventDefault()
    previousImage()
  } else if (event.key === 'Escape') {
    event.preventDefault()
    closeImageViewer()
  }
}

// Watch for image viewer open/close to add/remove keyboard listeners
watch(imageViewerOpen, (isOpen) => {
  if (isOpen) {
    window.addEventListener('keydown', handleImageViewerKeydown)
  } else {
    window.removeEventListener('keydown', handleImageViewerKeydown)
  }
})

async function sendMessage() {
  if (!message.value.trim() || isLoading.value) return

  const userMessage = message.value.trim()
  message.value = ''
  error.value = null
  response.value = null

  // Add user message
  messages.value.push({
    role: 'user',
    content: userMessage
  })

  isLoading.value = true

  try {
    const result = await edgeFunctionService.sendRAGMessage(props.scribeId, userMessage)
    
    response.value = result

    // Add assistant response
    messages.value.push({
      role: 'assistant',
      content: result.message || 'No response received',
      tokens: result.tokens,
      sources: result.sources
    })

    // Scroll to bottom
    await nextTick()
    scrollToBottom()
  } catch (e: any) {
    console.error('RAG chat error:', e)
    error.value = e.message || 'Failed to get response. Please try again.'
    
    // Add error message
    messages.value.push({
      role: 'assistant',
      content: `Error: ${error.value}`
    })
  } finally {
    isLoading.value = false
  }
}

function scrollToBottom(smooth = true) {
  nextTick(() => {
    if (messagesAreaRef.value) {
      if (smooth) {
        messagesAreaRef.value.scrollTo({
          top: messagesAreaRef.value.scrollHeight,
          behavior: 'smooth'
        })
      } else {
        messagesAreaRef.value.scrollTop = messagesAreaRef.value.scrollHeight
      }
    }
  })
}

// Watch for changes in messages or loading state to auto-scroll
watch([messages, isLoading], () => {
  scrollToBottom()
}, { deep: true })

function autoResize(event: Event) {
  const target = event.target as HTMLTextAreaElement
  target.style.height = 'auto'
  target.style.height = `${Math.min(target.scrollHeight, 120)}px`
}

// Initialize markdown-it with custom renderers to match existing styling
const md = new MarkdownIt({
  breaks: true,
  linkify: true,
  html: true  // Enable HTML to support <br> tags in table cells
})

// Custom table renderer to match existing styling
md.renderer.rules.table_open = () => {
  return '<div class="table-wrapper"><table class="markdown-table" style="border-collapse: collapse;">'
}
md.renderer.rules.table_close = () => {
  return '</table></div>'
}

// Ensure thead and tbody are rendered
md.renderer.rules.thead_open = () => {
  return '<thead>'
}
md.renderer.rules.thead_close = () => {
  return '</thead>'
}
md.renderer.rules.tbody_open = () => {
  return '<tbody>'
}
md.renderer.rules.tbody_close = () => {
  return '</tbody>'
}

// Custom table cell renderers with inline styles to ensure borders show
md.renderer.rules.th_open = () => {
  return '<th class="table-header" style="border: 1px solid rgba(148, 163, 184, 0.3); padding: 0.5rem 0.5rem !important;">'
}
md.renderer.rules.td_open = () => {
  return '<td class="table-cell" style="border: 1px solid rgba(148, 163, 184, 0.3); padding: 0.75rem 0.75rem !important;">'
}

// Note: markdown-it automatically processes inline markdown in table cells
// The content between td_open and td_close is already rendered as inline markdown
// Post-processing in renderMarkdown() handles <br> tags and bullet points

// Custom code block renderer
md.renderer.rules.fence = (tokens: any[], idx: number) => {
  const token = tokens[idx]
  const code = escapeHtml(token.content)
  return `<pre class="bg-muted border border-border rounded-lg p-4 my-4 overflow-x-auto"><code class="text-sm text-foreground font-mono leading-relaxed block whitespace-pre">${code}</code></pre>`
}

// Custom inline code renderer
md.renderer.rules.code_inline = (tokens: any[], idx: number) => {
  const token = tokens[idx]
  const code = escapeHtml(token.content)
  return `<code class="bg-muted border border-border rounded px-1.5 py-0.5 text-xs text-primary font-mono">${code}</code>`
}

// Custom link renderer
md.renderer.rules.link_open = (tokens: any[], idx: number) => {
  const token = tokens[idx]
  const href = escapeHtml(token.attrGet('href') || '')
  const title = token.attrGet('title')
  const titleAttr = title ? ` title="${escapeHtml(title)}"` : ''
  return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="text-primary hover:text-primary/80 underline break-all"${titleAttr}>`
}

// Custom heading renderers
md.renderer.rules.heading_open = (tokens: any[], idx: number) => {
  const token = tokens[idx]
  const level = token.tag.slice(1) // 'h1' -> '1'
  const sizes: Record<string, string> = {
    '1': 'text-2xl font-bold text-foreground mt-7 mb-4',
    '2': 'text-xl font-semibold text-foreground mt-6 mb-3',
    '3': 'text-lg font-semibold text-foreground mt-5 mb-2',
    '4': 'text-base font-semibold text-foreground mt-4 mb-2',
    '5': 'text-base font-semibold text-foreground mt-4 mb-2',
    '6': 'text-sm font-semibold text-foreground mt-3 mb-2'
  }
  const className = sizes[level] || sizes['3']
  return `<${token.tag} class="${className}">`
}

// Custom horizontal rule renderer
md.renderer.rules.hr = () => {
  return '<hr class="border-border my-5">'
}

// Custom list renderers
md.renderer.rules.bullet_list_open = () => {
  return '<ul class="list-disc ml-6 my-3 space-y-1.5">'
}
md.renderer.rules.ordered_list_open = () => {
  return '<ol class="list-decimal ml-6 my-3 space-y-1.5">'
}
md.renderer.rules.list_item_open = () => {
  return '<li class="text-foreground">'
}

// Custom paragraph renderer
md.renderer.rules.paragraph_open = () => {
  return '<p>'
}

// Custom strong renderer
md.renderer.rules.strong_open = () => {
  return '<strong class="font-semibold text-foreground">'
}

// Custom em renderer
md.renderer.rules.em_open = () => {
  return '<em class="italic text-muted-foreground">'
}

// Custom blockquote renderer
md.renderer.rules.blockquote_open = () => {
  return '<blockquote class="border-l-4 border-border pl-4 my-4 italic text-muted-foreground">'
}

function renderMarkdown(text: string): string {
  if (!text) return ''
  
  try {
    let html = md.render(text)
    
    // Post-process table cells to handle <br> tags and bullet points
    // Replace escaped <br> tags
    html = html.replace(/&lt;br&gt;/gi, '<br>')
    html = html.replace(/&lt;br\s*\/&gt;/gi, '<br>')
    html = html.replace(/&lt;br\s*\/&gt;/gi, '<br>')
    
    // Process table cells to convert markdown bullets and handle line breaks
    html = html.replace(/(<td[^>]*>)(.*?)(<\/td>)/gs, (_match, openTag, content, closeTag) => {
      // Convert markdown-style bullets (* or -) at line start to HTML bullets
      let processed = content.replace(/^([\*\-])\s+/gm, '• ')
      // Also handle bullets after <br> tags
      processed = processed.replace(/(<br\s*\/?>)\s*([\*\-])\s+/gi, '$1• ')
      // Convert newlines to <br> if not already present
      processed = processed.replace(/\n(?!<br)/g, '<br>')
      return openTag + processed + closeTag
    })
    
    // Same for table headers
    html = html.replace(/(<th[^>]*>)(.*?)(<\/th>)/gs, (_match, openTag, content, closeTag) => {
      let processed = content.replace(/^([\*\-])\s+/gm, '• ')
      processed = processed.replace(/(<br\s*\/?>)\s*([\*\-])\s+/gi, '$1• ')
      processed = processed.replace(/\n(?!<br)/g, '<br>')
      return openTag + processed + closeTag
    })
    
    return `<div class="markdown-content">${html}</div>`
  } catch (error) {
    console.error('Error rendering markdown:', error)
    // Fallback to escaped text
    return `<div class="markdown-content"><p>${escapeHtml(text)}</p></div>`
  }
}

function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.custom-scroll {
  scrollbar-width: thin;
  scrollbar-color: hsl(var(--muted-foreground) / 0.3) transparent;
}

.custom-scroll::-webkit-scrollbar {
  width: 6px;
}

.custom-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scroll::-webkit-scrollbar-thumb {
  background-color: hsl(var(--muted-foreground) / 0.3);
  border-radius: 999px;
}

.custom-scroll::-webkit-scrollbar-thumb:hover {
  background-color: hsl(var(--muted-foreground) / 0.5);
}

/* Markdown styling */
.markdown-content {
  color: inherit;
  word-wrap: break-word;
  overflow-wrap: break-word;
  font-size: 0.875rem;
  line-height: 1.7;
  color: hsl(var(--foreground));
}

.markdown-content > *:first-child {
  margin-top: 0;
}

.markdown-content > *:last-child {
  margin-bottom: 0;
}

.markdown-content h1,
.markdown-content h2,
.markdown-content h3,
.markdown-content h4,
.markdown-content h5,
.markdown-content h6 {
  color: hsl(var(--foreground));
  font-weight: 600;
  line-height: 1.4;
  margin-top: 1.75rem;
  margin-bottom: 1rem;
}

.markdown-content h1:first-child,
.markdown-content h2:first-child,
.markdown-content h3:first-child,
.markdown-content h4:first-child,
.markdown-content h5:first-child,
.markdown-content h6:first-child {
  margin-top: 0;
}

.markdown-content h1 {
  font-size: 1.25rem;
  margin-top: 1.75rem;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid hsl(var(--border));
}

.markdown-content h2 {
  font-size: 1.125rem;
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
}

.markdown-content h3 {
  font-size: 1rem;
  margin-top: 1.25rem;
  margin-bottom: 0.625rem;
}

.markdown-content h4 {
  font-size: 0.9375rem;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
}

.markdown-content h5 {
  font-size: 0.875rem;
  margin-top: 0.875rem;
  margin-bottom: 0.5rem;
}

.markdown-content h6 {
  font-size: 0.8125rem;
  margin-top: 0.75rem;
  margin-bottom: 0.5rem;
  color: hsl(var(--muted-foreground));
}

.markdown-content code {
  background-color: hsl(var(--muted));
  border: 1px solid hsl(var(--border));
  border-radius: 0.25rem;
  padding: 0.125rem 0.375rem;
  font-size: 0.8125rem;
  color: hsl(var(--primary));
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  word-break: break-word;
}

.markdown-content pre {
  background-color: hsl(var(--muted));
  border: 1px solid hsl(var(--border));
  border-radius: 0.5rem;
  padding: 1rem;
  margin: 1.5rem 0;
  overflow-x: auto;
  line-height: 1.6;
}

.markdown-content pre code {
  background: none;
  border: none;
  padding: 0;
  color: hsl(var(--foreground));
  font-size: 0.8125rem;
  word-break: normal;
  white-space: pre;
  display: block;
}

.markdown-content a {
  color: hsl(var(--primary));
  text-decoration: underline;
  text-underline-offset: 2px;
  transition: color 0.2s;
  word-break: break-word;
}

.markdown-content a:hover {
  color: hsl(var(--primary) / 0.8);
  text-decoration-thickness: 2px;
}

.markdown-content a code {
  color: hsl(var(--primary));
}

.markdown-content ul,
.markdown-content ol {
  margin: 1.25rem 0;
  padding-left: 1.75rem;
  font-size: 0.875rem;
}

.markdown-content ul {
  list-style-type: disc;
}

.markdown-content ol {
  list-style-type: decimal;
}

.markdown-content li {
  margin: 0.5rem 0;
  line-height: 1.7;
  font-size: 0.875rem;
}

.markdown-content li > p {
  margin: 0.5rem 0;
}

.markdown-content li > p:first-child {
  margin-top: 0;
}

.markdown-content li > p:last-child {
  margin-bottom: 0;
}

.markdown-content ul ul,
.markdown-content ol ol,
.markdown-content ul ol,
.markdown-content ol ul {
  margin: 0.5rem 0;
}

.markdown-content li::marker {
  color: hsl(var(--muted-foreground));
}

.markdown-content strong {
  font-weight: 600;
  color: hsl(var(--foreground));
}

.markdown-content em {
  font-style: italic;
  color: hsl(var(--muted-foreground));
}

.markdown-content hr {
  border: none;
  border-top: 1px solid hsl(var(--border));
  margin: 1.5rem 0;
}

.markdown-content p {
  margin: 0.75rem 0;
  line-height: 1.7;
  color: hsl(var(--foreground));
  font-size: 0.875rem;
}

.markdown-content p + p {
  margin-top: 1rem;
}

/* Add spacing between different element types */
.markdown-content h1 + p,
.markdown-content h2 + p,
.markdown-content h3 + p,
.markdown-content h4 + p,
.markdown-content h5 + p,
.markdown-content h6 + p {
  margin-top: 0.75rem;
}

.markdown-content p + h1,
.markdown-content p + h2,
.markdown-content p + h3,
.markdown-content p + h4,
.markdown-content p + h5,
.markdown-content p + h6 {
  margin-top: 1.5rem;
}

.markdown-content p + ul,
.markdown-content p + ol {
  margin-top: 1rem;
}

.markdown-content ul + p,
.markdown-content ol + p {
  margin-top: 1rem;
}

.markdown-content p + pre,
.markdown-content pre + p {
  margin-top: 1.25rem;
}

.markdown-content p + blockquote,
.markdown-content blockquote + p {
  margin-top: 1rem;
}

.markdown-content p + .table-wrapper,
.markdown-content .table-wrapper + p {
  margin-top: 1.25rem;
}

.markdown-content h1 + .table-wrapper,
.markdown-content h2 + .table-wrapper,
.markdown-content h3 + .table-wrapper,
.markdown-content .table-wrapper + h1,
.markdown-content .table-wrapper + h2,
.markdown-content .table-wrapper + h3 {
  margin-top: 1.25rem;
}

.markdown-content ul + ul,
.markdown-content ol + ol,
.markdown-content ul + ol,
.markdown-content ol + ul {
  margin-top: 0.75rem;
}

.markdown-content blockquote {
  border-left: 3px solid hsl(var(--primary) / 0.5);
  padding-left: 1rem;
  margin: 1rem 0;
  color: hsl(var(--muted-foreground));
  font-style: italic;
  font-size: 0.875rem;
}

.markdown-content .table-wrapper {
  margin: 1.5rem 0;
  border-radius: 0.375rem;
  overflow: auto;
  border: 2px solid hsl(var(--border)) !important;
  background-color: hsl(var(--muted) / 0.3);
  box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.2);
}

.markdown-content .markdown-table {
  width: 100%;
  border-collapse: collapse;
  background-color: transparent;
  font-size: 0.875rem;
  margin: 0;
  border: none;
}

.markdown-content .markdown-table th.table-header,
.markdown-content .markdown-table td.table-cell {
  border: 1px solid rgba(148, 163, 184, 0.3) !important;
}

.markdown-content .markdown-table th.table-header {
  background-color: hsl(var(--muted));
  color: hsl(var(--foreground));
  font-weight: 600;
  padding: 1rem 1rem;
  text-align: left;
  border-bottom: 2px solid rgba(148, 163, 184, 0.4) !important;
  font-size: 0.8125rem;
}

.markdown-content .markdown-table th.table-header:first-child {
  border-top-left-radius: 0.375rem;
}

.markdown-content .markdown-table th.table-header:last-child {
  border-top-right-radius: 0.375rem;
}

.markdown-content .markdown-table td.table-cell {
  padding: 1rem 1rem !important;
  color: hsl(var(--foreground)) !important;
  line-height: 1.5;
  font-size: 0.8125rem;
  background-color: transparent;
}

.markdown-content .markdown-table tbody tr:last-child td.table-cell:first-child {
  border-bottom-left-radius: 0.375rem;
}

.markdown-content .markdown-table tbody tr:last-child td.table-cell:last-child {
  border-bottom-right-radius: 0.375rem;
}

.markdown-content .markdown-table .table-cell * {
  color: hsl(var(--foreground)) !important;
}

.markdown-content .markdown-table .table-cell code {
  color: hsl(var(--primary)) !important;
  background-color: hsl(var(--muted));
  border: 1px solid hsl(var(--border));
  border-radius: 0.25rem;
  padding: 0.125rem 0.375rem;
  font-size: 0.75rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
}

.markdown-content .markdown-table .table-cell a {
  color: hsl(var(--primary)) !important;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.markdown-content .markdown-table .table-cell a:hover {
  color: hsl(var(--primary) / 0.8) !important;
}

.markdown-content .markdown-table .table-cell strong {
  color: hsl(var(--foreground)) !important;
  font-weight: 600;
}

.markdown-content .markdown-table .table-cell em {
  color: hsl(var(--muted-foreground)) !important;
  font-style: italic;
}

.markdown-content .markdown-table tbody tr:hover {
  background-color: hsl(var(--accent) / 0.5);
}
</style>
