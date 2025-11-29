<template>
  <div class="dark bg-background text-foreground min-h-full">
  <!-- Loading State -->
  <div v-if="isCheckingAuth" class="min-h-96 min-w-96 bg-background flex items-center justify-center">
    <div class="text-center">
      <svg class="animate-spin h-12 w-12 text-primary mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <p class="text-muted-foreground">Loading...</p>
    </div>
  </div>

  <!-- Login Screen -->
  <Login class="min-h-96 min-w-96 w-full" v-else-if="!currentUser" @login-success="handleLoginSuccess" />

  <!-- Scribe Selection View -->
  <div v-else-if="showScribeSelection" class="max-w-96 w-full">
    <ScribeSelection
      :selectedScribeId="selectedScribeId"
      :newScribeName="scribeName"
      @select="handleScribeSelect"
      @back="showScribeSelection = false"
    />
  </div>

  <!-- Main App -->
  <div class="max-w-96 min-h-96 w-full bg-background" v-else-if="!showDashboard && !showScribeSelection">
      <!-- Header with Navigation -->
      <div class="bg-background/95 backdrop-blur-sm border-b border-border shadow-sm">
        <!-- Logo and Title -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg ring-2 ring-blue-500/20">
              <span class="text-white font-bold text-sm">N</span>
            </div>
            <div>
              <h1 class="text-sm font-bold text-foreground leading-tight">NabuAI</h1>
              <p class="text-xs text-muted-foreground leading-tight">Knowledge Base</p>
            </div>
          </div>
          <button
            @click="handleLogout"
            class="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
            title="Logout"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
            </svg>
          </button>
        </div>

        <!-- Navigation Tabs -->
        <div class="flex items-center gap-1 px-2 py-2">
          <button
            @click="openDashboard"
            class="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
            </svg>
            <span>Dashboard</span>
          </button>
          <!-- <button
            class="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors bg-accent text-accent-foreground"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path>
            </svg>
            <span>Save Page</span>
          </button> -->
        </div>
      </div>

      <!-- Page Info -->
      <div class="p-4 space-y-4">
        <Card 
          class="cursor-pointer hover:bg-accent/50 transition-colors"
          @click="showNotes = !showNotes"
        >
          <CardContent class="p-3">
            <div class="flex items-center space-x-3">
            <div class="flex-shrink-0">
              <div class="w-10 h-10 bg-card rounded-lg flex items-center justify-center ring-1 ring-border overflow-hidden">
                <img
                  v-if="faviconUrl"
                  :src="faviconUrl"
                  :alt="pageInfo.title"
                  class="w-full h-full object-contain"
                  referrerpolicy="no-referrer"
                />
                <svg v-else class="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
              </div>
            </div>
              <div class="flex-1 min-w-0">
                <h2 class="text-sm font-semibold text-card-foreground truncate">{{ pageInfo.title }}</h2>
                <p class="text-xs text-muted-foreground truncate mt-1">{{ pageInfo.url }}</p>
              </div>
          
            </div>
          </CardContent>
        </Card>


          <Card>
            <CardContent class="p-4">
              <FieldGroup>
                <Field>
                  <FieldLabel for="notes" class="flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                    </svg>
                    Add notes or context
                  </FieldLabel>
                  <Textarea
                    id="notes"
                    v-model="notes"
                    rows="3"
                    placeholder="What's important about this page? Add your thoughts..."
                    class="text-xs"
                  />
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>

        <!-- Scribe Select / Create -->
        <Card>
          <CardHeader class="p-3">
            <CardTitle class="text-sm">
              Scribe
            </CardTitle>
          </CardHeader>
          <CardContent class="space-y-3 p-3 pt-0">
            <Button
              variant="outline"
              class="w-full justify-between h-auto py-3"
              @click="showScribeSelection = true"
            >
              <div class="min-w-0 flex-1 text-left">
                <p class="text-sm font-medium truncate" :class="getScribeLabelClass()">
                  {{ getScribeDisplayName() }}
                </p>
                <p class="text-xs text-muted-foreground mt-0.5 truncate">{{ getScribeHelperText() }}</p>
              </div>
              <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </Button>
          </CardContent>
        </Card>

        <!-- Action Buttons -->
        <div class="space-y-3">
          <Button
            @click="savePage"
            :disabled="isSaving"
            class="w-full text-white"
            size="default"
          >
            <svg v-if="isSaving" class="animate-spin h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <svg v-else class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path>
            </svg>
            <span v-if="isSaving">Saving...</span>
            <span v-else>Save Page</span>
          </Button>
        </div>
      </div>

      <!-- Success Message -->
      <div
        v-if="showSuccess"
        class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      >
        <Card class="rounded-2xl p-6 max-w-sm mx-4 text-center shadow-2xl transform transition-all">
          <div class="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 ring-4 ring-emerald-500/20">
            <svg class="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h3 class="text-xl font-bold text-card-foreground mb-2">Page Saved!</h3>
          <p class="text-sm text-muted-foreground mb-6">Your page has been successfully saved to NabuAI.</p>
          <Button
            @click="showSuccess = false"
            class="w-full"
            size="lg"
          >
            Continue
          </Button>
        </Card>
      </div>
  </div>

  <!-- Dashboard -->
  <Dashboard v-else-if="!showScribeDetail" @back="showDashboard = false" @open-scribe="openScribe" />

  <!-- Scribe Detail -->
  <ScribeDetail v-else :scribeId="activeScribeId" @back="closeScribe" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Dashboard from './Dashboard.vue'
import ScribeDetail from './ScribeDetail.vue'
import Login from './Login.vue'
import ScribeSelection from './components/ScribeSelection.vue'
import { storageManager } from '../utils/storage'
import { databaseService } from '../utils/database'
import { getCurrentUser, clearUserCache, signOut } from '../utils/auth'
import { supabase } from '../utils/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Field, FieldLabel, FieldGroup } from '@/components/ui/field'

interface PageInfo {
  title: string
  url: string
}

const pageInfo = ref<PageInfo>({
  title: '',
  url: ''
})
const faviconUrl = ref('')
const notes = ref('')
const scribeName = ref('')
const scribes = ref<Array<{ id: string; name: string }>>([])
const selectedScribeId = ref('')
const isSaving = ref(false)
const showSuccess = ref(false)
const showDashboard = ref(false)
const showScribeDetail = ref(false)
const activeScribeId = ref('')
const currentUser = ref<any>(null)
const isCheckingAuth = ref(true)
const showNotes = ref(false)
const showScribeSelection = ref(false)

onMounted(async () => {
  // Check authentication
  const { user } = await getCurrentUser()
  currentUser.value = user
  isCheckingAuth.value = false

  // Track last sent tokens to avoid redundant messages
  let lastSentTokens: { access_token?: string; refresh_token?: string } | null = null

  // Send current session to background so background saves are authenticated
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token && session?.refresh_token) {
      // Persist session tokens for background fallback
      try {
        await chrome.storage.local.set({
          supabase_session: {
            access_token: session.access_token,
            refresh_token: session.refresh_token
          }
        })
      } catch (e) {
        console.warn('Failed to persist session to chrome.storage:', e)
      }

      // Send initial session (will be tracked by lastSentTokens)
      chrome.runtime.sendMessage({
        action: 'setAuthSession',
        access_token: session.access_token,
        refresh_token: session.refresh_token
      }).catch(() => {}) // Ignore errors if background script is not ready
      
      // Update last sent tokens
      lastSentTokens = {
        access_token: session.access_token,
        refresh_token: session.refresh_token
      }
    }
  } catch (e) {
    console.warn('Failed to send session to background:', e)
  }

  // Listen to auth changes (only one listener needed)
  supabase.auth.onAuthStateChange((_event, session) => {
    currentUser.value = session?.user || null
    
    // Clear caches on auth change
    if (_event === 'SIGNED_OUT') {
      databaseService.clearUserCache()
      clearUserCache()
      lastSentTokens = null
      return
    }
    
    if (session?.access_token && session?.refresh_token) {
      // Only send if tokens have actually changed
      if (lastSentTokens?.access_token !== session.access_token || 
          lastSentTokens?.refresh_token !== session.refresh_token) {
        // Persist latest session
        chrome.storage.local.set({
          supabase_session: {
            access_token: session.access_token,
            refresh_token: session.refresh_token
          }
        }).catch(() => {})

        chrome.runtime.sendMessage({
          action: 'setAuthSession',
          access_token: session.access_token,
          refresh_token: session.refresh_token
        }).catch(() => {}) // Ignore errors if background script is not ready
        
        // Update last sent tokens
        lastSentTokens = {
          access_token: session.access_token,
          refresh_token: session.refresh_token
        }
      }
    }
  })

  // Get page info
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab) {
      pageInfo.value = {
        title: tab.title || 'Untitled Page',
        url: tab.url || ''
      }
      updateFavicon(pageInfo.value.url)
      console.log('📄 Page info loaded:', {
        title: pageInfo.value.title,
        url: pageInfo.value.url
      })
    } else {
      console.warn('⚠️ No active tab found')
      pageInfo.value = {
        title: 'Untitled Page',
        url: ''
      }
      updateFavicon(undefined)
    }
  } catch (error) {
    console.error('❌ Error getting tab info:', error)
    pageInfo.value = {
      title: 'Untitled Page',
      url: ''
    }
    updateFavicon(undefined)
  }

  // Load scribes (will be refreshed when needed)
  await loadScribes()
})

async function loadScribes() {
  try {
    const list = await databaseService.getUserScribes()
    scribes.value = (list || []).map(s => ({ id: s.id, name: s.name || 'Untitled Conversation' }))
    console.log('✅ Loaded', scribes.value.length, 'scribes')
  } catch (e) {
    console.error('❌ Failed to load scribes:', e)
    scribes.value = []
  }
}

function handleScribeSelect(scribeId: string, newName?: string) {
  selectedScribeId.value = scribeId
  if (newName) {
    scribeName.value = newName
  } else if (scribeId !== '__new__') {
    scribeName.value = ''
  }
  showScribeSelection.value = false
}

function getScribeDisplayName() {
  if (selectedScribeId.value === '__new__') {
    return scribeName.value || 'Name your new scribe'
  }
  if (selectedScribeId.value) {
    const scribe = scribes.value.find(s => s.id === selectedScribeId.value)
    return scribe?.name || 'Selected scribe'
  }
  return 'No scribe selected'
}

function getScribeHelperText() {
  if (selectedScribeId.value === '__new__') {
    return scribeName.value ? `Creating "${scribeName.value}"` : 'Provide a name for your new scribe'
  }
  if (selectedScribeId.value) {
    const scribe = scribes.value.find(s => s.id === selectedScribeId.value)
    return scribe?.name ? `Linked to ${scribe.name}` : 'Linked to a scribe'
  }
  return 'Link this content to a scribe'
}

function getScribeLabelClass() {
  if (selectedScribeId.value === '__new__') return 'text-primary'
  if (selectedScribeId.value) return 'text-primary'
  return ''
}

function updateFavicon(url?: string) {
  try {
    if (!url) {
      faviconUrl.value = ''
      return
    }
    const parsed = new URL(url)
    faviconUrl.value = `https://www.google.com/s2/favicons?sz=64&domain=${parsed.hostname}`
  } catch {
    faviconUrl.value = ''
  }
}

function handleLoginSuccess(user: any) {
  currentUser.value = user
}

const savePage = async () => {
  isSaving.value = true
  
  try {
    // Validate we have page info
    if (!pageInfo.value.url) {
      throw new Error('No page URL available. Please refresh the page and try again.')
    }
    
    // Ask content script for the readable article with timeout
    let article: any = null
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tab) {
        throw new Error('Could not get active tab')
      }
      
      if (tab?.id && tab.url) {
        // Check if content script can run on this page
        const url = new URL(tab.url)
        const isRestrictedPage = url.protocol === 'chrome:' || 
                                 url.protocol === 'chrome-extension:' || 
                                 url.protocol === 'moz-extension:' ||
                                 url.protocol === 'edge:' ||
                                 url.hostname === 'newtab' ||
                                 url.hostname === 'localhost' && url.port
        
        if (!isRestrictedPage) {
          try {
            // Try to inject content script if not already injected
            try {
              await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content.js']
              })
            } catch (injectError: any) {
              // Content script might already be injected, or page doesn't allow injection
              // This is fine, we'll try to send a message anyway
              if (!injectError.message?.includes('Cannot access')) {
                console.warn('Could not inject content script:', injectError)
              }
            }
            
            // Wait a bit for content script to initialize
            await new Promise(resolve => setTimeout(resolve, 100))
            
            // Add timeout for Readability parsing (max 5 seconds)
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Readability timeout')), 5000)
            )
            
            const responsePromise = chrome.tabs.sendMessage(tab.id, { action: 'getReadableArticle' })
            
            const response = await Promise.race([responsePromise, timeoutPromise]) as any
            if (response?.ok && response.article) {
              article = response.article
              console.log('✅ Article extracted:', {
                title: article.title,
                textContentLength: article.textContent?.length || 0,
                hasTextContent: !!article.textContent,
                hasContent: !!article.content
              })
              
              // If textContent is empty but content (HTML) exists, extract text from HTML
              if (!article.textContent && article.content) {
                console.warn('⚠️ textContent is empty but HTML content exists, extracting text from HTML')
                try {
                  const tempDiv = document.createElement('div')
                  tempDiv.innerHTML = article.content
                  article.textContent = tempDiv.innerText || tempDiv.textContent || ''
                  console.log('✅ Extracted textContent from HTML:', article.textContent.length, 'characters')
                } catch (e) {
                  console.warn('⚠️ Failed to extract text from HTML:', e)
                }
              }
            } else if (response?.error) {
              console.warn('⚠️ Readability error:', response.error)
            } else {
              console.warn('⚠️ No article in response:', response)
            }
          } catch (msgError: any) {
            // Content script not available or message failed
            if (msgError.message?.includes('Receiving end does not exist') || 
                msgError.message?.includes('Could not establish connection')) {
              console.warn('Content script not available on this page. Saving without article content.')
            } else {
              console.warn('Readability parse failed:', msgError)
            }
          }
        } else {
          console.warn('Cannot run content script on restricted page:', tab.url)
        }
      }
    } catch (e) {
      // Ignore readability failures; we can still save metadata/notes
      console.warn('Readability parse failed or unavailable:', e)
    }

    // Use textContent for processing (plain text), but keep HTML in metadata
    // Limit content size to avoid huge pages (max 500KB of text)
    let pageContent = article?.textContent || article?.content || undefined
    
    console.log('📝 Content extraction result:', {
      hasArticle: !!article,
      hasTextContent: !!article?.textContent,
      textContentLength: article?.textContent?.length || 0,
      hasHtmlContent: !!article?.content,
      htmlContentLength: article?.content?.length || 0,
      finalPageContentLength: pageContent?.length || 0
    })
    
    if (pageContent && pageContent.length > 500000) {
      console.warn('⚠️ Page content too large, truncating to 500KB')
      pageContent = pageContent.substring(0, 500000)
    }
    
    // Warn if no content was extracted and try to get content from page directly
    if (!pageContent || pageContent.trim().length === 0) {
      console.warn('⚠️ No page content extracted from content script. Trying direct extraction...')
      
      // Last resort: try to get content directly from the active tab
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
        if (tab?.id) {
          // Try to execute script directly in the page to get content
          const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
              // Remove unwanted elements
              const bodyClone = document.body.cloneNode(true) as HTMLElement
              const unwanted = bodyClone.querySelectorAll('script, style, nav, header, footer, aside, .nav, .navigation, .header, .footer, .sidebar, .ad, .advertisement, .ads')
              unwanted.forEach(el => el.remove())
              
              const text = (bodyClone.innerText || bodyClone.textContent || '').trim()
              return {
                title: document.title || (document.querySelector('h1')?.textContent || '').trim(),
                textContent: text.substring(0, 500000) // Limit to 500KB
              }
            }
          })
          
          if (results && results[0]?.result?.textContent) {
            const directContent = results[0].result
            pageContent = directContent.textContent
            if (!article) {
              article = { title: directContent.title }
            } else if (!article.title) {
              article.title = directContent.title
            }
            console.log('✅ Direct extraction succeeded:', pageContent.length, 'characters')
          }
        }
      } catch (directError: any) {
        console.warn('⚠️ Direct extraction also failed:', directError.message)
      }
      
      if (!pageContent || pageContent.trim().length === 0) {
        console.warn('⚠️ No page content extracted after all attempts. Page will be saved with title and URL only.')
      }
    }
    
    // Validate required fields
    if (!pageInfo.value.title && !article?.title) {
      throw new Error('Page title is required')
    }
    
    const savedData = {
      type: 'page' as const,
      title: (article?.title && article.title.trim()) || pageInfo.value.title || 'Untitled Page',
      url: pageInfo.value.url,
      notes: notes.value || '',
      content: pageContent, // Use textContent (plain text) for vector processing
      timestamp: new Date().toISOString(),
      metadata: article ? { 
        article: {
          ...article,
          htmlContent: article.content, // Keep HTML in metadata for reference
          textContent: article.textContent
        }
      } : {}
    }
    
    console.log('💾 Saving page:', {
      title: savedData.title,
      url: savedData.url,
      contentLength: savedData.content?.length || 0,
      hasTextContent: !!article?.textContent,
      hasHtmlContent: !!article?.content,
      hasNotes: !!savedData.notes
    })
    
    // Handle scribe selection before saving
    let scribeIdToLink: string | undefined = undefined
    
    if (selectedScribeId.value && selectedScribeId.value !== '__new__') {
      // Use existing scribe
      scribeIdToLink = selectedScribeId.value
      console.log('📎 Linking document to existing scribe:', scribeIdToLink)
    } else if (selectedScribeId.value === '__new__' && scribeName.value && scribeName.value.trim().length > 0) {
      // Create new scribe first, then link document to it
      try {
        const newScribe = await databaseService.createScribe({ 
          name: scribeName.value.trim() 
        })
        scribeIdToLink = newScribe.id
        console.log('📎 Created new scribe and linking document:', scribeIdToLink)
      } catch (e) {
        console.warn('⚠️ Failed to create new scribe, document will use default scribe:', e)
      }
    }
    
    // Use the new storage manager (this saves to DB and triggers async processing)
    let docId: string
    try {
      // Include scribe_id in savedData if we have one
      const dataToSave = { ...savedData, tags: [] }
      if (scribeIdToLink) {
        (dataToSave as any).scribe_id = scribeIdToLink
      }
      
      docId = await storageManager.saveContent(dataToSave)
      console.log('✅ Document saved with ID:', docId, 'linked to scribe:', scribeIdToLink || 'default')
    } catch (saveError: any) {
      console.error('❌ Failed to save document:', saveError)
      console.error('❌ Save error details:', {
        message: saveError?.message,
        error: saveError,
        stack: saveError?.stack,
        savedData: {
          title: savedData.title,
          url: savedData.url,
          type: savedData.type,
          scribe_id: scribeIdToLink
        }
      })
      throw new Error(`Failed to save page: ${saveError?.message || 'Unknown error'}`)
    }
    
    // Show success immediately - vector processing happens in background
    showSuccess.value = true
    setTimeout(() => {
      showSuccess.value = false
    }, 3000)
    
    // Clear form
    notes.value = ''
    scribeName.value = ''
    selectedScribeId.value = ''
  } catch (error: any) {
    console.error('❌ Error saving page:', error)
    console.error('❌ Error stack:', error?.stack)
    console.error('❌ Error details:', {
      message: error?.message,
      name: error?.name,
      error: error
    })
    
    // Show user-friendly error message
    const errorMessage = error?.message || 'Unknown error occurred'
    alert(`Failed to save page: ${errorMessage}`)
    
    // Don't show success if there was an error
    showSuccess.value = false
  } finally {
    isSaving.value = false
  }
}

function openDashboard() {
  const url = chrome.runtime.getURL('src/dashboard/index.html')
  chrome.tabs.create({ url })
}

function openScribe(id: string) {
  activeScribeId.value = id
  showScribeDetail.value = true
}

function closeScribe() {
  showScribeDetail.value = false
}

async function handleLogout() {
  try {
    // Sign out from Supabase
    await signOut()
    
    // Clear all caches
    clearUserCache()
    databaseService.clearUserCache()
    
    // Clear chrome.storage.local session
    await chrome.storage.local.remove('supabase_session')
    
    // Reset state
    currentUser.value = null
    showDashboard.value = false
    showScribeDetail.value = false
    showScribeSelection.value = false
    notes.value = ''
    scribeName.value = ''
    selectedScribeId.value = ''
    scribes.value = []
    
    // Notify background script to clear session
    chrome.runtime.sendMessage({
      action: 'clearAuthSession'
    }).catch(() => {}) // Ignore errors if background script is not ready
    
    console.log('✅ Logged out successfully')
  } catch (error: any) {
    console.error('❌ Error logging out:', error)
    alert(`Failed to logout: ${error?.message || 'Unknown error'}`)
  }
}
</script>
