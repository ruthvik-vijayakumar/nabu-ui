// Background service worker for NabuAI extension
// Import polyfills first to set up service worker environment
import '../utils/polyfills'

import { storageManager } from '../utils/storage'
import { databaseService } from '../utils/database'
import { supabase } from '../utils/supabase'
import { uploadDataUrl, uploadFromUrl } from '../utils/storageUpload'
import { edgeFunctionService } from '../utils/edgeFunctions'

class BackgroundService {
  private contextMenuIds = {
    text: 'nabu-save-text',
    image: 'nabu-save-image',
    video: 'nabu-save-video',
    screenshot: 'nabu-take-screenshot',
    pdf: 'nabu-save-pdf'
  }
  
  // Track last set session tokens to avoid redundant sets
  private lastSessionTokens: { access_token?: string; refresh_token?: string } | null = null

  constructor() {
    this.init()
  }

  // Restore Supabase session from chrome.storage.local
  private async restoreSession() {
    try {
      const result = await chrome.storage.local.get('supabase_session')
      const session = result.supabase_session
      
      if (session?.access_token && session?.refresh_token) {
        console.log('🔐 Restoring Supabase session from storage...')
        const { data, error } = await supabase.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token
        })
        
        if (error) {
          console.warn('⚠️ Failed to restore session:', error)
        } else {
          this.lastSessionTokens = {
            access_token: session.access_token,
            refresh_token: session.refresh_token
          }
          console.log('✅ Session restored for user:', data?.user?.id)
        }
      } else {
        console.log('ℹ️ No stored session found')
      }
    } catch (err) {
      console.error('❌ Error restoring session:', err)
    }
  }

  // Ensure session is available before making database calls
  private async ensureSession() {
    // Check if we have a current session
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token && session?.refresh_token) {
      return true
    }
    
    // Try to restore from storage
    await this.restoreSession()
    
    // Check again
    const { data: { session: newSession } } = await supabase.auth.getSession()
    return !!(newSession?.access_token && newSession?.refresh_token)
  }

  private async init() {
    console.log('🚀 NabuAI Background Service initializing...')
    // Restore session from chrome.storage on startup
    await this.restoreSession()
    
    // Create context menus when extension is installed
    this.createContextMenus()
    
    // Listen for context menu clicks
    chrome.contextMenus.onClicked.addListener(this.handleContextMenuClick.bind(this))
    
    // Listen for messages from content scripts and popup
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this))
    
    // Handle extension installation
    chrome.runtime.onInstalled.addListener(this.handleInstallation.bind(this))
    
    console.log('✅ NabuAI Background Service initialized')
  }

  private createContextMenus() {
    console.log('🔧 Creating context menus...')
    
    try {
      // Remove all existing context menus first to avoid duplicates
      chrome.contextMenus.removeAll(() => {
        console.log('🧹 Removed existing context menus')
        
        // Create context menu for text selection
        chrome.contextMenus.create({
          id: this.contextMenuIds.text,
          title: 'Save to NabuAI',
          contexts: ['selection'],
          documentUrlPatterns: ['<all_urls>']
        }, (callback) => {
          if (chrome.runtime.lastError) {
            console.error('❌ Error creating text context menu:', chrome.runtime.lastError.message)
          } else {
            console.log('✅ Text context menu created')
          }
        })

        // Create context menu for images
        chrome.contextMenus.create({
          id: this.contextMenuIds.image,
          title: 'Save Image to NabuAI',
          contexts: ['image'],
          documentUrlPatterns: ['<all_urls>']
        }, (callback) => {
          if (chrome.runtime.lastError) {
            console.error('❌ Error creating image context menu:', chrome.runtime.lastError.message)
          } else {
            console.log('✅ Image context menu created')
          }
        })

        // Create context menu for videos
        chrome.contextMenus.create({
          id: this.contextMenuIds.video,
          title: 'Save Video to NabuAI',
          contexts: ['video'],
          documentUrlPatterns: ['<all_urls>']
        }, (callback) => {
          if (chrome.runtime.lastError) {
            console.error('❌ Error creating video context menu:', chrome.runtime.lastError.message)
          } else {
            console.log('✅ Video context menu created')
          }
        })

        // Create context menu for taking full screenshots
        chrome.contextMenus.create({
          id: this.contextMenuIds.screenshot,
          title: 'Take Full Screenshot',
          contexts: ['page'],
          documentUrlPatterns: ['<all_urls>']
        }, (callback) => {
          if (chrome.runtime.lastError) {
            console.error('❌ Error creating screenshot context menu:', chrome.runtime.lastError.message)
          } else {
            console.log('✅ Screenshot context menu created')
          }
        })

        // Create context menu for taking partial screenshots
        chrome.contextMenus.create({
          id: 'nabu-take-partial-screenshot',
          title: 'Select Area to Screenshot',
          contexts: ['page'],
          documentUrlPatterns: ['<all_urls>']
        }, (callback) => {
          if (chrome.runtime.lastError) {
            console.error('❌ Error creating partial screenshot context menu:', chrome.runtime.lastError.message)
          } else {
            console.log('✅ Partial screenshot context menu created')
          }
        })

        // Create context menu for PDF links (but not for image links)
        // Note: We can't exclude images directly, so we'll handle it in the click handler
        chrome.contextMenus.create({
          id: this.contextMenuIds.pdf,
          title: 'Open PDF in NabuAI Viewer',
          contexts: ['link'],
          documentUrlPatterns: ['<all_urls>'],
          // Target URL patterns to only show for actual PDF links
          targetUrlPatterns: ['*://*/*.pdf', '*://*/*.PDF']
        }, (callback) => {
          if (chrome.runtime.lastError) {
            console.error('❌ Error creating PDF context menu:', chrome.runtime.lastError.message)
          } else {
            console.log('✅ PDF context menu created')
          }
        })
        
        console.log('🎯 All context menus created successfully')
      })
    } catch (error) {
      console.error('❌ Error creating context menus:', error)
    }
  }

  private async handleContextMenuClick(info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab) {
    console.log('🖱️ Context menu clicked:', info.menuItemId, info)
    console.log('📋 Context menu data:', {
      menuItemId: info.menuItemId,
      srcUrl: info.srcUrl,
      linkUrl: info.linkUrl,
      selectionText: info.selectionText,
      tab: tab?.id ? `Tab ${tab.id}` : 'No tab'
    })
    
    if (!tab?.id) {
      console.error('❌ No tab ID available')
      // Try to get the active tab
      try {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true })
        if (activeTab?.id) {
          tab = activeTab
          console.log('✅ Retrieved active tab:', tab.id)
        } else {
          console.error('❌ Could not retrieve active tab')
          return
        }
      } catch (error) {
        console.error('❌ Error retrieving tab:', error)
        return
      }
    }

    try {
      if (info.menuItemId === this.contextMenuIds.text && info.selectionText) {
        console.log('📝 Text selected, showing save dialog...')
        // Handle text selection - show dialog directly
        await this.showTextSaveDialog(tab.id, info.selectionText, tab.url || '')
      } else if (info.menuItemId === this.contextMenuIds.image) {
        if (!info.srcUrl) {
          console.error('❌ Image context menu clicked but no srcUrl available')
          console.log('Available info:', info)
          return
        }
        console.log('🖼️ Image selected, showing save dialog...', info.srcUrl)
        // Handle image save
        await this.showMediaSaveDialog(tab.id, {
          src: info.srcUrl,
          alt: info.mediaType === 'image' ? (info.altText || 'Image') : 'Image',
          url: tab.url || '',
          type: 'image' as const
        })
      } else if (info.menuItemId === this.contextMenuIds.video && info.srcUrl) {
        console.log('🎥 Video selected, showing save dialog...')
        // Handle video save
        await this.showMediaSaveDialog(tab.id, {
          src: info.srcUrl,
          alt: 'Video',
          url: tab.url || '',
          type: 'video' as const
        })
      } else if (info.menuItemId === this.contextMenuIds.screenshot) {
        console.log('📸 Full screenshot requested, capturing page...')
        // Handle full screenshot capture
        await this.takeScreenshot(tab.id, tab.url || '')
      } else if (info.menuItemId === 'nabu-take-partial-screenshot') {
        console.log('📸 Partial screenshot requested, starting selection mode...')
        // Handle partial screenshot capture
        await this.startPartialScreenshot(tab.id, tab.url || '')
      } else if (info.menuItemId === this.contextMenuIds.pdf && info.linkUrl) {
        // Don't show PDF menu for images - only show image save option
        if (info.mediaType === 'image') {
          console.log('🖼️ Image link clicked, ignoring PDF menu (image menu should be used instead)')
          return
        }
        // Check if the link is actually a PDF
        if (this.isPDFUrl(info.linkUrl)) {
          console.log('📄 PDF link selected, opening in NabuAI viewer...')
          // Handle PDF opening in viewer
          await this.openPDFInViewer(info.linkUrl, tab.url || '')
        } else {
          console.log('⚠️ Link is not a PDF, ignoring...')
        }
      } else {
        console.log('⚠️ Unknown context menu item:', info.menuItemId)
      }
    } catch (error) {
      console.error('❌ Error handling context menu click:', error)
    }
  }

  private async showTextSaveDialog(tabId: number, text: string, url: string) {
    console.log(`🎬 Injecting text save dialog into tab ${tabId}`)
    console.log(`📝 Text: ${text.substring(0, 100)}...`)
    console.log(`🔗 URL: ${url}`)
    
    try {
      // Ensure session is available before fetching scribes
      const hasSession = await this.ensureSession()
      if (!hasSession) {
        console.warn('⚠️ No session available, cannot fetch scribes')
      }
      
      // Inject the dialog script directly into the page
      // Fetch user's scribes to populate dropdown
      let scribes: Array<{ id: string; name: string }> = []
      try {
        const list = await databaseService.getUserScribes()
        scribes = (list || []).map(s => ({ id: s.id, name: s.name || 'Untitled' }))
      } catch (e) {
        console.warn('Failed to load scribes:', e)
      }

      // Check if tab is still valid before injecting
      let tab: chrome.tabs.Tab | undefined
      try {
        tab = await chrome.tabs.get(tabId)
        if (!tab || !tab.id) {
          console.error('❌ Invalid tab ID:', tabId)
          return
        }
        // Check if tab URL is accessible
        if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('chrome-extension://')) {
          console.error('❌ Cannot inject into restricted page:', tab.url)
          return
        }
      } catch (tabError) {
        console.error('❌ Error checking tab:', tabError)
        return
      }

      // Retry mechanism for script injection
      let injectionSuccess = false
      let lastError: any = null
      
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          if (attempt > 0) {
            console.log(`🔄 Retry attempt ${attempt + 1}/3 for script injection`)
            await new Promise(resolve => setTimeout(resolve, 200 * attempt)) // Exponential backoff
          }
          
          await chrome.scripting.executeScript({
            target: { tabId },
            func: (text, url, scribes) => {
              // Wait for DOM to be ready
              const ensureDOMReady = () => {
                if (document.readyState === 'loading') {
                  return new Promise((resolve) => {
                    document.addEventListener('DOMContentLoaded', resolve, { once: true })
                  })
                }
                return Promise.resolve()
              }
              
              ensureDOMReady().then(() => {
                console.log('🎭 Creating text save dialog in page context...')
                
                // Remove any existing modals first - be more aggressive
                const existingModals = document.querySelectorAll('[data-nabu-text-modal]')
                existingModals.forEach(modal => {
                  console.log('🧹 Removing existing modal')
                  modal.remove()
                })
                
                // Also check for any modals with similar styling that might be leftover
                const allModals = document.querySelectorAll('div[style*="position: fixed"][style*="z-index"]')
                allModals.forEach((modal: Element) => {
                  const html = modal.innerHTML || ''
                  if (html.includes('Save Text') || html.includes('Save to NabuAI')) {
                    console.log('🧹 Removing leftover modal')
                    modal.remove()
                  }
                })
                
                // Ensure body exists and is ready
                if (!document.body) {
                  console.error('❌ Document body not ready')
                  return
                }
                
                // Create and show the text save dialog
                const modal = document.createElement('div')
                modal.setAttribute('data-nabu-text-modal', 'true')
                modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: hsla(0, 0%, 3.9%, 0.8);
            backdrop-filter: blur(8px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          `
          
          // Add CSS for spinner animation if not already added
          if (!document.querySelector('style[data-nabu-spinner]')) {
            const style = document.createElement('style')
            style.setAttribute('data-nabu-spinner', 'true')
            style.textContent = `
              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
              .animate-spin {
                animation: spin 1s linear infinite;
              }
            `
            document.head.appendChild(style)
          }
          
          modal.innerHTML = `
            <div style="
              background: hsl(0, 0%, 9.5%);
              border: 1px solid hsl(0, 0%, 25%);
              border-radius: 0.5rem;
              box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
              max-width: 448px;
              width: 100%;
              margin: 16px;
              max-height: 80vh;
              overflow-y: auto;
            ">
              <div style="
                padding: 16px;
                border-bottom: 1px solid hsl(0, 0%, 25%);
              ">
                <div style="
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                ">
                  <h3 style="
                    font-size: 18px;
                    font-weight: 600;
                    color: hsl(0, 0%, 98%);
                    margin: 0;
                    letter-spacing: -0.025em;
                  ">Save Text</h3>
                  <button onclick="this.closest('[style*=\"position: fixed\"]').remove()" style="
                    color: hsl(0, 0%, 63.9%);
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    padding: 8px;
                    border-radius: 0.375rem;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                  " onmouseover="this.style.backgroundColor='hsl(0, 0%, 15%)'; this.style.color='hsl(0, 0%, 98%)'" onmouseout="this.style.backgroundColor='transparent'; this.style.color='hsl(0, 0%, 63.9%)'">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>
              </div>
              
              <div style="padding: 24px; padding-top: 0;">
                <div style="margin-bottom: 16px;">
                  <label style="
                    display: block;
                    font-size: 14px;
                    font-weight: 500;
                    color: hsl(0, 0%, 98%);
                    margin-bottom: 8px;
                  ">Selected Text</label>
                  <div style="
                    background: hsl(0, 0%, 9.5%);
                    border: 1px solid hsl(0, 0%, 25%);
                    border-radius: 0.5rem;
                    padding: 12px;
                    font-size: 14px;
                    color: hsl(0, 0%, 98%);
                    max-height: 128px;
                    overflow-y: auto;
                    white-space: pre-wrap;
                    font-family: inherit;
                  ">${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
                </div>
                
                <div style="margin-bottom: 16px;">
                  <label style="
                    display: block;
                    font-size: 14px;
                    font-weight: 500;
                    color: hsl(0, 0%, 98%);
                    margin-bottom: 8px;
                  ">Page URL</label>
                  <div style="
                    background: hsl(0, 0%, 9.5%);
                    border: 1px solid hsl(0, 0%, 25%);
                    border-radius: 0.5rem;
                    padding: 12px;
                    font-size: 13px;
                    color: hsl(0, 0%, 63.9%);
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    font-family: 'Monaco', 'Menlo', monospace;
                  ">${url}</div>
                </div>
                
                <div style="margin-bottom: 20px;">
                  <label for="scribeSelect" style="
                    display: block;
                    font-size: 14px;
                    font-weight: 500;
                    color: hsl(0, 0%, 98%);
                    margin-bottom: 8px;
                  ">Scribe</label>
                  <select id="scribeSelect" style="
                    width: 100%;
                    padding: 10px 12px;
                    border: 1px solid hsl(0, 0%, 25%);
                    border-radius: 0.5rem;
                    font-size: 14px;
                    outline: none;
                    box-sizing: border-box;
                    background: hsl(0, 0%, 9.5%);
                    color: hsl(0, 0%, 98%);
                    transition: all 0.2s;
                  " onfocus="this.style.outline='2px solid hsl(0, 0%, 83.1%)'; this.style.outlineOffset='2px'; this.style.borderColor='hsl(0, 0%, 83.1%)'" onblur="this.style.outline='none'; this.style.borderColor='hsl(0, 0%, 25%)'"></select>
                  <div style="margin-top: 10px; display: none;" id="newScribeRow">
                    <input type="text" id="scribeName" style="
                      width: 100%; 
                      padding: 10px 12px; 
                      border: 1px solid hsl(0, 0%, 25%); 
                      border-radius: 0.5rem; 
                      font-size: 14px; 
                      outline: none; 
                      box-sizing: border-box; 
                      background: hsl(0, 0%, 9.5%); 
                      color: hsl(0, 0%, 98%);
                      transition: all 0.2s;
                    " placeholder="New scribe name" onfocus="this.style.outline='2px solid hsl(0, 0%, 83.1%)'; this.style.outlineOffset='2px'; this.style.borderColor='hsl(0, 0%, 83.1%)'" onblur="this.style.outline='none'; this.style.borderColor='hsl(0, 0%, 25%)'">
                  </div>
                </div>
                
                <div style="display: flex; gap: 12px;">
                  <button id="saveBtn" style="
                    flex: 1;
                    background: hsl(0, 0%, 98%);
                    color: hsl(0, 0%, 9%);
                    padding: 10px 16px;
                    border: none;
                    border-radius: 0.5rem;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                  " onmouseover="this.style.backgroundColor='hsl(0, 0%, 90%)'" onmouseout="this.style.backgroundColor='hsl(0, 0%, 98%)'">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path>
                    </svg>
                    Save
                  </button>
                  <button onclick="window.open('https://nabu-ai.com/dashboard', '_blank')" style="
                    flex: 1;
                    background: transparent;
                    color: hsl(0, 0%, 98%);
                    padding: 10px 16px;
                    border: 1px solid hsl(0, 0%, 25%);
                    border-radius: 0.5rem;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                  " onmouseover="this.style.backgroundColor='hsl(0, 0%, 15%)'" onmouseout="this.style.backgroundColor='transparent'">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
                    </svg>
                    Dashboard
                  </button>
                </div>
              </div>
            </div>
          `
          
                document.body.appendChild(modal)
                console.log('✅ Text save dialog added to page')
                
                // Populate scribe dropdown
                const scribeSelect = modal.querySelector('#scribeSelect') as HTMLSelectElement
                if (scribeSelect) {
                  const noneOpt = document.createElement('option'); noneOpt.value=''; noneOpt.text='No scribe'; scribeSelect.appendChild(noneOpt)
                  const newOpt = document.createElement('option'); newOpt.value='__new__'; newOpt.text='➕ Create new scribe'; scribeSelect.appendChild(newOpt)
                  ;(scribes || []).forEach((s: any) => { const opt=document.createElement('option'); opt.value=s.id; opt.text=s.name; scribeSelect.appendChild(opt) })
                  scribeSelect.addEventListener('change', () => {
                    const row = modal.querySelector('#newScribeRow') as HTMLElement
                    if (row) row.style.display = scribeSelect.value === '__new__' ? 'block' : 'none'
                  })
                }

                // Add save functionality
                const saveBtn = modal.querySelector('#saveBtn') as HTMLButtonElement
                if (saveBtn) {
                  console.log('🔘 Save button found, adding click handler...')
                  saveBtn.addEventListener('click', () => {
                    console.log('💾 Save button clicked, processing save...')
                    
                    // Disable button and show loading state
                    saveBtn.disabled = true
                    saveBtn.innerHTML = `
                      <svg class="animate-spin" width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                      </svg>
                      Saving...
                    `
                    saveBtn.style.opacity = '0.7'
                    saveBtn.style.cursor = 'not-allowed'
                    
                    const scribeInput = modal.querySelector('#scribeName') as HTMLInputElement
                    const scribeName = scribeInput?.value?.trim() || ''
                    const scribeSelect = modal.querySelector('#scribeSelect') as HTMLSelectElement
                    const scribeId = scribeSelect?.value && scribeSelect.value !== '__new__' ? scribeSelect.value : ''
                    
                    const saveData = {
                      type: 'text',
                      title: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
                      url: url,
                      content: text,
                      timestamp: new Date().toISOString(),
                      scribeName,
                      scribeId
                    }
                    
                    console.log('📊 Save data prepared:', saveData)
                    
                    // Send message to background script to save
                    chrome.runtime.sendMessage({
                      action: 'saveContent',
                      data: saveData
                    }, (response) => {
                      console.log('📨 Save response received:', response)
                      if (response && response.success) {
                        // Show success message
                        modal.innerHTML = `
                          <div style="
                            background: hsl(0, 0%, 9.5%);
                            border: 1px solid hsl(0, 0%, 25%);
                            border-radius: 0.5rem;
                            padding: 24px;
                            max-width: 384px;
                            margin: 16px;
                            text-align: center;
                            box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
                          ">
                            <div style="
                              width: 64px;
                              height: 64px;
                              background: hsl(0, 0%, 15%);
                              border-radius: 50%;
                              display: flex;
                              align-items: center;
                              justify-content: center;
                              margin: 0 auto 16px;
                            ">
                              <svg width="32" height="32" fill="none" stroke="hsl(0, 0%, 98%)" stroke-width="2.5" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path>
                              </svg>
                            </div>
                            <h3 style="
                              font-size: 20px;
                              font-weight: 600;
                              color: hsl(0, 0%, 98%);
                              margin: 0 0 8px;
                            ">Saved to NabuAI!</h3>
                            <p style="
                              font-size: 14px;
                              color: hsl(0, 0%, 63.9%);
                              margin: 0 0 24px;
                              line-height: 1.5;
                            ">Your text has been successfully saved.</p>
                            <button onclick="this.closest('[style*=\"position: fixed\"]').remove()" style="
                              width: 100%;
                              background: hsl(0, 0%, 98%);
                              color: hsl(0, 0%, 9%);
                              padding: 10px 16px;
                              border: none;
                              border-radius: 0.5rem;
                              font-size: 14px;
                              font-weight: 500;
                              cursor: pointer;
                              transition: all 0.2s;
                            " onmouseover="this.style.backgroundColor='hsl(0, 0%, 90%)'" onmouseout="this.style.backgroundColor='hsl(0, 0%, 98%)'">
                              Continue
                            </button>
                          </div>
                        `
                        console.log('✅ Success message displayed')
                      } else {
                        // Show error message
                        modal.innerHTML = `
                          <div style="
                            background: hsl(0, 0%, 9.5%);
                            border: 1px solid hsl(0, 0%, 25%);
                            border-radius: 0.5rem;
                            padding: 24px;
                            max-width: 384px;
                            margin: 16px;
                            text-align: center;
                            box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
                          ">
                            <div style="
                              width: 64px;
                              height: 64px;
                              background: hsl(0, 62.8%, 30.6%);
                              border-radius: 50%;
                              display: flex;
                              align-items: center;
                              justify-content: center;
                              margin: 0 auto 16px;
                            ">
                              <svg width="32" height="32" fill="none" stroke="hsl(0, 0%, 98%)" stroke-width="2.5" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path>
                              </svg>
                            </div>
                            <h3 style="
                              font-size: 20px;
                              font-weight: 600;
                              color: hsl(0, 0%, 98%);
                              margin: 0 0 8px;
                            ">Save Failed</h3>
                            <p style="
                              font-size: 14px;
                              color: hsl(0, 0%, 63.9%);
                              margin: 0 0 24px;
                              line-height: 1.5;
                            ">There was an error saving your content. Please try again.</p>
                            <button onclick="this.closest('[style*=\"position: fixed\"]').remove()" style="
                              width: 100%;
                              background: hsl(0, 62.8%, 30.6%);
                              color: hsl(0, 0%, 98%);
                              padding: 10px 16px;
                              border: none;
                              border-radius: 0.5rem;
                              font-size: 14px;
                              font-weight: 500;
                              cursor: pointer;
                              transition: all 0.2s;
                            " onmouseover="this.style.backgroundColor='hsl(0, 62.8%, 25.6%)'" onmouseout="this.style.backgroundColor='hsl(0, 62.8%, 30.6%)'">
                              Close
                            </button>
                          </div>
                        `
                        console.log('❌ Error message displayed')
                      }
                    })
                  })
                  console.log('✅ Save button click handler added')
                } else {
                  console.error('❌ Save button not found')
                }
                
                // Close modal when clicking outside
                modal.addEventListener('click', (e) => {
                  if (e.target === modal) {
                    modal.remove()
                    console.log('🔒 Modal closed by outside click')
                  }
                })
                
                // Ensure modal is visible and appended to body
                if (!document.body.contains(modal)) {
                  document.body.appendChild(modal)
                  console.log('✅ Modal appended to body')
                }
                
                // Force display to ensure visibility
                modal.style.display = 'flex'
                modal.style.visibility = 'visible'
                modal.style.opacity = '1'
                
                console.log('✅ Modal should now be visible')
              }).catch((err) => {
                console.error('❌ Error in modal creation:', err)
              })
            },
            args: [text, url, scribes]
          })
          
          injectionSuccess = true
          console.log('✅ Text save dialog script injected successfully')
          break
        } catch (injectionError: any) {
          lastError = injectionError
          console.error(`❌ Script injection attempt ${attempt + 1} failed:`, injectionError)
          
          // If it's a specific error that won't be fixed by retrying, break early
          if (injectionError.message?.includes('Cannot access') || 
              injectionError.message?.includes('restricted')) {
            console.error('❌ Cannot inject into this page type')
            break
          }
        }
      }
      
      if (!injectionSuccess) {
        console.error('❌ Failed to inject script after 3 attempts:', lastError)
        // Try alternative approach: send message to content script if available
        try {
          await chrome.tabs.sendMessage(tabId, {
            action: 'showTextSaveModal',
            data: { text, url, scribes }
          })
          console.log('✅ Sent message to content script as fallback')
        } catch (messageError) {
          console.error('❌ Fallback message also failed:', messageError)
        }
      }
    } catch (error) {
      console.error('❌ Error showing text save dialog:', error)
    }
  }

  private async showMediaSaveDialog(tabId: number, mediaData: {
    src: string
    alt: string
    url: string
    type: 'image' | 'video'
  }) {
    try {
      // Ensure session is available before fetching scribes
      const hasSession = await this.ensureSession()
      if (!hasSession) {
        console.warn('⚠️ No session available, cannot fetch scribes')
      }
      
      // Fetch user's scribes to populate dropdown
      let scribes: Array<{ id: string; name: string }> = []
      try {
        console.log('📋 Fetching scribes for media save dialog...')
        const list = await databaseService.getUserScribes()
        console.log('📋 Fetched scribes:', list?.length || 0, 'scribes')
        scribes = (list || []).map(s => ({ id: s.id, name: s.name || 'Untitled' }))
        console.log('📋 Mapped scribes:', scribes.length, 'scribes', scribes)
      } catch (e) {
        console.error('❌ Failed to load scribes:', e)
        console.error('❌ Error details:', {
          message: (e as any)?.message,
          stack: (e as any)?.stack,
          error: e
        })
      }

      await chrome.scripting.executeScript({
        target: { tabId },
        func: (data: { src: string; alt: string; url: string; type: 'image' | 'video' }, scribes: Array<{ id: string; name: string }>) => {
          console.log('📋 Received scribes in injected script:', scribes?.length || 0, 'scribes', scribes)
          
          // Remove any existing modals first
          const existingModals = document.querySelectorAll('[data-nabu-media-modal]')
          existingModals.forEach(modal => modal.remove())
          
          const modal = document.createElement('div')
          modal.setAttribute('data-nabu-media-modal', 'true')
          modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: hsla(0, 0%, 3.9%, 0.8);
            backdrop-filter: blur(8px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          `
          
          const mediaPreview = data.type === 'image' 
            ? `<img src="${data.src}" alt="${data.alt}" style="width: 100%; height: 128px; object-fit: cover; border-radius: 10px; border: 1px solid rgba(75, 85, 99, 0.5);">`
            : `<video src="${data.src}" style="width: 100%; height: 128px; object-fit: cover; border-radius: 10px; border: 1px solid rgba(75, 85, 99, 0.5);" controls></video>`

          modal.innerHTML = `
            <div style="
              background: hsl(0, 0%, 9.5%);
              border: 1px solid hsl(0, 0%, 25%);
              border-radius: 0.5rem;
              box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
              max-width: 448px;
              width: 100%;
              margin: 16px;
              max-height: 80vh;
              overflow-y: auto;
            ">
              <div style="
                padding: 16px;
                border-bottom: 1px solid hsl(0, 0%, 25%);
              ">
                <div style="
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                ">
                  <h3 style="
                    font-size: 18px;
                    font-weight: 600;
                    color: hsl(0, 0%, 98%);
                    margin: 0;
                    letter-spacing: -0.025em;
                  ">Save ${data.type === 'image' ? 'Image' : 'Video'}</h3>
                  <button onclick="this.closest('[style*=\"position: fixed\"]').remove()" style="
                    color: hsl(0, 0%, 63.9%);
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    padding: 8px;
                    border-radius: 0.375rem;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                  " onmouseover="this.style.backgroundColor='hsl(0, 0%, 15%)'; this.style.color='hsl(0, 0%, 98%)'" onmouseout="this.style.backgroundColor='transparent'; this.style.color='hsl(0, 0%, 63.9%)'">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>
              </div>
              
              <div style="padding: 24px; padding-top: 0;">
                <div style="margin-bottom: 16px;">
                  <label style="
                    display: block;
                    font-size: 14px;
                    font-weight: 500;
                    color: hsl(0, 0%, 98%);
                    margin-bottom: 8px;
                  ">Preview</label>
                  <div style="background: hsl(0, 0%, 9.5%); padding: 8px; border-radius: 0.5rem; border: 1px solid hsl(0, 0%, 25%);">
                    ${mediaPreview}
                  </div>
                </div>
                
                <div style="margin-bottom: 16px;">
                  <label style="
                    display: block;
                    font-size: 14px;
                    font-weight: 500;
                    color: hsl(0, 0%, 98%);
                    margin-bottom: 8px;
                  ">Media URL</label>
                  <div style="
                    background: hsl(0, 0%, 9.5%);
                    border: 1px solid hsl(0, 0%, 25%);
                    border-radius: 0.5rem;
                    padding: 12px;
                    font-size: 13px;
                    color: hsl(0, 0%, 63.9%);
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    font-family: 'Monaco', 'Menlo', monospace;
                  ">${data.src}</div>
                </div>
                
                <div style="margin-bottom: 20px;">
                  <label for="scribeSelect" style="
                    display: block;
                    font-size: 14px;
                    font-weight: 500;
                    color: hsl(0, 0%, 98%);
                    margin-bottom: 8px;
                  ">Scribe</label>
                  <select id="scribeSelect" style="
                    width: 100%;
                    padding: 10px 12px;
                    border: 1px solid hsl(0, 0%, 25%);
                    border-radius: 0.5rem;
                    font-size: 14px;
                    outline: none;
                    box-sizing: border-box;
                    background: hsl(0, 0%, 9.5%);
                    color: hsl(0, 0%, 98%);
                    transition: all 0.2s;
                  " onfocus="this.style.outline='2px solid hsl(0, 0%, 83.1%)'; this.style.outlineOffset='2px'; this.style.borderColor='hsl(0, 0%, 83.1%)'" onblur="this.style.outline='none'; this.style.borderColor='hsl(0, 0%, 25%)'"></select>
                  <div style="margin-top: 10px; display: none;" id="newScribeRow">
                    <input type="text" id="scribeName" style="
                      width: 100%; 
                      padding: 10px 12px; 
                      border: 1px solid hsl(0, 0%, 25%); 
                      border-radius: 0.5rem; 
                      font-size: 14px; 
                      outline: none; 
                      box-sizing: border-box; 
                      background: hsl(0, 0%, 9.5%); 
                      color: hsl(0, 0%, 98%);
                      transition: all 0.2s;
                    " placeholder="New scribe name" onfocus="this.style.outline='2px solid hsl(0, 0%, 83.1%)'; this.style.outlineOffset='2px'; this.style.borderColor='hsl(0, 0%, 83.1%)'" onblur="this.style.outline='none'; this.style.borderColor='hsl(0, 0%, 25%)'">
                  </div>
                </div>
                
                <div style="display: flex; gap: 12px;">
                  <button id="saveBtn" style="
                    flex: 1;
                    background: hsl(0, 0%, 98%);
                    color: hsl(0, 0%, 9%);
                    padding: 10px 16px;
                    border: none;
                    border-radius: 0.5rem;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                  " onmouseover="this.style.backgroundColor='hsl(0, 0%, 90%)'" onmouseout="this.style.backgroundColor='hsl(0, 0%, 98%)'">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path>
                    </svg>
                    Save
                  </button>
                  <button onclick="window.open('https://nabu-ai.com/dashboard', '_blank')" style="
                    flex: 1;
                    background: transparent;
                    color: hsl(0, 0%, 98%);
                    padding: 10px 16px;
                    border: 1px solid hsl(0, 0%, 25%);
                    border-radius: 0.5rem;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                  " onmouseover="this.style.backgroundColor='hsl(0, 0%, 15%)'" onmouseout="this.style.backgroundColor='transparent'">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
                    </svg>
                    Dashboard
                  </button>
                </div>
              </div>
            </div>
          `
          
          document.body.appendChild(modal)
          console.log('✅ Media save dialog added to page')
          
          // Populate scribe dropdown
          const scribeSelect = modal.querySelector('#scribeSelect') as HTMLSelectElement
          if (scribeSelect) {
            console.log('📋 Populating media scribe dropdown with', scribes?.length || 0, 'scribes')
            const noneOpt = document.createElement('option'); noneOpt.value=''; noneOpt.text='No scribe'; scribeSelect.appendChild(noneOpt)
            const newOpt = document.createElement('option'); newOpt.value='__new__'; newOpt.text='➕ Create new scribe'; scribeSelect.appendChild(newOpt)
            if (scribes && scribes.length > 0) {
              scribes.forEach((s: any) => { 
                const opt = document.createElement('option')
                opt.value = s.id
                opt.text = s.name || 'Untitled'
                scribeSelect.appendChild(opt)
                console.log('✅ Added scribe option:', s.id, s.name)
              })
            } else {
              console.warn('⚠️ No scribes available to populate media dropdown')
            }
            scribeSelect.addEventListener('change', () => {
              const row = modal.querySelector('#newScribeRow') as HTMLElement
              if (row) row.style.display = scribeSelect.value === '__new__' ? 'block' : 'none'
            })
          } else {
            console.error('❌ Could not find #scribeSelect element in media modal')
          }
          
          // Add CSS for spinner animation if not already added
          if (!document.querySelector('style[data-nabu-spinner]')) {
            const style = document.createElement('style')
            style.setAttribute('data-nabu-spinner', 'true')
            style.textContent = `
              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
              .animate-spin {
                animation: spin 1s linear infinite;
              }
            `
            document.head.appendChild(style)
          }
          
          // Add save functionality
          const saveBtn = modal.querySelector('#saveBtn') as HTMLButtonElement
          if (saveBtn) {
            saveBtn.addEventListener('click', () => {
              // Disable button and show loading state
              saveBtn.disabled = true
              saveBtn.innerHTML = `
                <svg class="animate-spin" width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                Saving...
              `
              saveBtn.style.opacity = '0.7'
              saveBtn.style.cursor = 'not-allowed'
              
              const scribeSelect = modal.querySelector('#scribeSelect') as HTMLSelectElement
              const scribeInput = modal.querySelector('#scribeName') as HTMLInputElement
              const scribeId = scribeSelect?.value && scribeSelect.value !== '__new__' ? scribeSelect.value : ''
              const scribeName = scribeSelect?.value === '__new__' ? (scribeInput?.value?.trim() || '') : ''
              
              const saveData = {
                type: data.type,
                title: data.alt,
                url: data.url,
                content: data.src,
                timestamp: new Date().toISOString(),
                scribeId,
                scribeName,
                metadata: { mediaType: data.type }
              }
              
              console.log('Saving media to NabuAI:', saveData)
              
              // Send message to background script to save
              chrome.runtime.sendMessage({
                action: 'saveContent',
                data: saveData
              }, (response) => {
                if (response && response.success) {
                  // Show success message
                  modal.innerHTML = `
                    <div style="
                      background: hsl(0, 0%, 9.5%);
                      border: 1px solid hsl(0, 0%, 25%);
                      border-radius: 0.5rem;
                      padding: 24px;
                      max-width: 384px;
                      margin: 16px;
                      text-align: center;
                      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
                    ">
                      <div style="
                        width: 64px;
                        height: 64px;
                        background: hsl(0, 0%, 15%);
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin: 0 auto 16px;
                      ">
                        <svg width="32" height="32" fill="none" stroke="hsl(0, 0%, 98%)" stroke-width="2.5" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path>
                        </svg>
                      </div>
                      <h3 style="
                        font-size: 20px;
                        font-weight: 600;
                        color: hsl(0, 0%, 98%);
                        margin: 0 0 8px;
                      ">Saved to NabuAI!</h3>
                      <p style="
                        font-size: 14px;
                        color: hsl(0, 0%, 63.9%);
                        margin: 0 0 24px;
                        line-height: 1.5;
                      ">Your ${data.type} has been successfully saved.</p>
                      <button onclick="this.closest('[style*=\"position: fixed\"]').remove()" style="
                        width: 100%;
                        background: hsl(0, 0%, 98%);
                        color: hsl(0, 0%, 9%);
                        padding: 10px 16px;
                        border: none;
                        border-radius: 0.5rem;
                        font-size: 14px;
                        font-weight: 500;
                        cursor: pointer;
                        transition: all 0.2s;
                      " onmouseover="this.style.backgroundColor='hsl(0, 0%, 90%)'" onmouseout="this.style.backgroundColor='hsl(0, 0%, 98%)'">
                        Continue
                      </button>
                    </div>
                  `
                } else {
                  // Show error message
                  modal.innerHTML = `
                    <div style="
                      background: hsl(0, 0%, 9.5%);
                      border: 1px solid hsl(0, 0%, 25%);
                      border-radius: 0.5rem;
                      padding: 24px;
                      max-width: 384px;
                      margin: 16px;
                      text-align: center;
                      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
                    ">
                      <div style="
                        width: 64px;
                        height: 64px;
                        background: hsl(0, 62.8%, 30.6%);
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin: 0 auto 16px;
                      ">
                        <svg width="32" height="32" fill="none" stroke="hsl(0, 0%, 98%)" stroke-width="2.5" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                      </div>
                      <h3 style="
                        font-size: 20px;
                        font-weight: 600;
                        color: hsl(0, 0%, 98%);
                        margin: 0 0 8px;
                      ">Save Failed</h3>
                      <p style="
                        font-size: 14px;
                        color: hsl(0, 0%, 63.9%);
                        margin: 0 0 24px;
                        line-height: 1.5;
                      ">There was an error saving your content. Please try again.</p>
                      <button onclick="this.closest('[style*=\"position: fixed\"]').remove()" style="
                        width: 100%;
                        background: hsl(0, 62.8%, 30.6%);
                        color: hsl(0, 0%, 98%);
                        padding: 10px 16px;
                        border: none;
                        border-radius: 0.5rem;
                        font-size: 14px;
                        font-weight: 500;
                        cursor: pointer;
                        transition: all 0.2s;
                      " onmouseover="this.style.backgroundColor='hsl(0, 62.8%, 25.6%)'" onmouseout="this.style.backgroundColor='hsl(0, 62.8%, 30.6%)'">
                        Close
                      </button>
                    </div>
                  `
                }
              })
            })
          }
          
          // Close modal when clicking outside
          modal.addEventListener('click', (e) => {
            if (e.target === modal) {
              modal.remove()
            }
          })
        },
        args: [mediaData, scribes]
      })
    } catch (error) {
      console.error('Error showing media save dialog:', error)
    }
  }

  private isPDFUrl(url: string): boolean {
    try {
      const urlObj = new URL(url)
      const pathname = urlObj.pathname.toLowerCase()
      const searchParams = urlObj.searchParams
      
      // Check if URL ends with .pdf
      if (pathname.endsWith('.pdf')) {
        return true
      }
      
      // Check if URL has PDF in query parameters
      if (searchParams.has('format') && searchParams.get('format')?.toLowerCase() === 'pdf') {
        return true
      }
      
      // Check if URL has PDF in the path
      if (pathname.includes('.pdf')) {
        return true
      }
      
      return false
    } catch (error) {
      console.error('Error parsing URL:', error)
      return false
    }
  }

  private async takeScreenshot(tabId: number, url: string) {
    console.log(`📸 Taking screenshot of tab ${tabId}`)
    console.log(`🔗 URL: ${url}`)
    
    try {
      // Capture the visible tab
      const dataUrl = await chrome.tabs.captureVisibleTab(null, {
        format: 'png',
        quality: 90
      })
      
      console.log('✅ Screenshot captured successfully')
      
      // Show the screenshot save dialog
      await this.showScreenshotSaveDialog(tabId, dataUrl, url)
      
    } catch (error) {
      console.error('❌ Error taking screenshot:', error)
      
      // Show error dialog
      await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          const modal = document.createElement('div')
          modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          `
          
          modal.innerHTML = `
            <div style="
              background: hsl(0, 0%, 9.5%);
              border: 1px solid hsl(0, 0%, 25%);
              border-radius: 0.5rem;
              padding: 24px;
              max-width: 384px;
              margin: 16px;
              text-align: center;
              box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
            ">
              <div style="
                width: 64px;
                height: 64px;
                background: hsl(0, 62.8%, 30.6%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 16px;
              ">
                <svg width="32" height="32" fill="none" stroke="hsl(0, 0%, 98%)" stroke-width="2.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </div>
              <h3 style="
                font-size: 20px;
                font-weight: 600;
                color: hsl(0, 0%, 98%);
                margin: 0 0 8px;
              ">Screenshot Failed</h3>
              <p style="
                font-size: 14px;
                color: hsl(0, 0%, 63.9%);
                margin: 0 0 24px;
                line-height: 1.5;
              ">Unable to capture screenshot. Please try again.</p>
              <button onclick="this.closest('[style*=\"position: fixed\"]').remove()" style="
                width: 100%;
                background: hsl(0, 62.8%, 30.6%);
                color: hsl(0, 0%, 98%);
                padding: 10px 16px;
                border: none;
                border-radius: 0.5rem;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
              " onmouseover="this.style.backgroundColor='hsl(0, 62.8%, 25.6%)'" onmouseout="this.style.backgroundColor='hsl(0, 62.8%, 30.6%)'">
                Close
              </button>
            </div>
          `
          
          document.body.appendChild(modal)
          
          // Close modal when clicking outside
          modal.addEventListener('click', (e) => {
            if (e.target === modal) {
              modal.remove()
            }
          })
        }
      })
    }
  }

  private async startPartialScreenshot(tabId: number, url: string) {
    console.log(`📸 Starting partial screenshot selection for tab ${tabId}`)
    console.log(`🔗 URL: ${url}`)
    
    try {
      // Ensure session is available before fetching scribes
      const hasSession = await this.ensureSession()
      if (!hasSession) {
        console.warn('⚠️ No session available, cannot fetch scribes')
      }
      
      // Fetch user's scribes to populate dropdown
      let scribes: Array<{ id: string; name: string }> = []
      try {
        console.log('📋 Fetching scribes for partial screenshot...')
        const list = await databaseService.getUserScribes()
        console.log('📋 Fetched scribes:', list?.length || 0, 'scribes')
        scribes = (list || []).map(s => ({ id: s.id, name: s.name || 'Untitled' }))
        console.log('📋 Mapped scribes:', scribes.length, 'scribes', scribes)
      } catch (e) {
        console.error('❌ Failed to load scribes:', e)
        console.error('❌ Error details:', {
          message: (e as any)?.message,
          stack: (e as any)?.stack,
          error: e
        })
      }

      // First capture the full screenshot
      const fullScreenshot = await chrome.tabs.captureVisibleTab(null, {
        format: 'png',
        quality: 90
      })
      
      console.log('✅ Full screenshot captured for selection')
      console.log('📋 About to inject script with scribes:', scribes.length, 'scribes', scribes)
      
      // Inject the selection overlay
      await chrome.scripting.executeScript({
        target: { tabId },
        func: (fullScreenshot: string, url: string, scribes: Array<{ id: string; name: string }>) => {
          console.log('🎭 Creating partial screenshot selection overlay...')
          console.log('📋 Received scribes in partial screenshot overlay:', scribes?.length || 0, 'scribes', scribes)
          
          // Create overlay for selection
          const overlay = document.createElement('div')
          overlay.id = 'nabu-screenshot-overlay'
          overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.3);
            z-index: 999999;
            cursor: crosshair;
            user-select: none;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          `
          
          // Create selection rectangle
          const selectionRect = document.createElement('div')
          selectionRect.id = 'nabu-selection-rect'
          selectionRect.style.cssText = `
            position: absolute;
            border: 2px solid #3b82f6;
            background: rgba(59, 130, 246, 0.1);
            display: none;
            pointer-events: none;
          `
          
          // Create instructions
          const instructions = document.createElement('div')
          instructions.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            font-size: 14px;
            z-index: 1000000;
            pointer-events: none;
          `
          instructions.textContent = 'Click and drag to select area (release to capture or press Escape to cancel)'
          
          overlay.appendChild(selectionRect)
          overlay.appendChild(instructions)
          document.body.appendChild(overlay)
          
          let isSelecting = false
          let startX = 0
          let startY = 0
          let currentX = 0
          let currentY = 0
          
          // Mouse down - start selection
          overlay.addEventListener('mousedown', (e) => {
            isSelecting = true
            startX = e.clientX
            startY = e.clientY
            currentX = e.clientX
            currentY = e.clientY
            
            selectionRect.style.display = 'block'
            selectionRect.style.left = startX + 'px'
            selectionRect.style.top = startY + 'px'
            selectionRect.style.width = '0px'
            selectionRect.style.height = '0px'
            
            e.preventDefault()
          })
          
          // Mouse move - update selection
          overlay.addEventListener('mousemove', (e) => {
            if (!isSelecting) return
            
            currentX = e.clientX
            currentY = e.clientY
            
            const left = Math.min(startX, currentX)
            const top = Math.min(startY, currentY)
            const width = Math.abs(currentX - startX)
            const height = Math.abs(currentY - startY)
            
            selectionRect.style.left = left + 'px'
            selectionRect.style.top = top + 'px'
            selectionRect.style.width = width + 'px'
            selectionRect.style.height = height + 'px'
            
            e.preventDefault()
          })
          
          // Mouse up - end selection and capture
          overlay.addEventListener('mouseup', (e) => {
            if (!isSelecting) return
            
            isSelecting = false
            e.preventDefault()
            
            // Automatically capture the selected area
            const rect = selectionRect.getBoundingClientRect()
            if (rect.width > 10 && rect.height > 10) {
              captureSelectedArea(fullScreenshot, rect, url)
            } else {
              showError('Please select a larger area')
              overlay.remove()
            }
          })
          
          // Keyboard events
          overlay.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
              // Cancel selection
              overlay.remove()
            }
          })
          
          // Make overlay focusable for keyboard events
          overlay.tabIndex = 0
          overlay.focus()
          
          function captureSelectedArea(fullScreenshotDataUrl: string, selectionRect: DOMRect, pageUrl: string) {
            console.log('📸 Capturing selected area:', selectionRect)
            
            // Create canvas to crop the image
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')
            
            if (!ctx) {
              showError('Failed to create canvas context')
              return
            }
            
            // Account for device pixel ratio (important for Retina/high-DPI displays)
            const dpr = window.devicePixelRatio || 1
            console.log('📐 Device Pixel Ratio:', dpr)
            
            // Set canvas size to selection size
            canvas.width = selectionRect.width
            canvas.height = selectionRect.height
            
            // Create image from full screenshot
            const img = new Image()
            img.onload = () => {
              // Calculate actual pixel coordinates in the screenshot
              // The screenshot is captured at device pixel density, so multiply by DPR
              const sourceX = selectionRect.left * dpr
              const sourceY = selectionRect.top * dpr
              const sourceWidth = selectionRect.width * dpr
              const sourceHeight = selectionRect.height * dpr
              
              console.log('🎯 Source coordinates:', { sourceX, sourceY, sourceWidth, sourceHeight })
              console.log('📏 Image dimensions:', { width: img.width, height: img.height })
              
              // Draw the cropped portion
              ctx.drawImage(
                img,
                sourceX,
                sourceY,
                sourceWidth,
                sourceHeight,
                0,
                0,
                selectionRect.width,
                selectionRect.height
              )
              
              // Convert to data URL
              const croppedDataUrl = canvas.toDataURL('image/png', 0.9)
              
              // Remove overlay
              overlay.remove()
              
              // Show save dialog with cropped image
              console.log('📋 Calling showScreenshotSaveDialog with scribes:', scribes?.length || 0, 'scribes', scribes)
              showScreenshotSaveDialog(croppedDataUrl, pageUrl, true, scribes)
            }
            
            img.onerror = () => {
              showError('Failed to load screenshot image')
            }
            
            img.src = fullScreenshotDataUrl
          }
          
          function showScreenshotSaveDialog(dataUrl: string, url: string, isPartial: boolean, scribesList: Array<{ id: string; name: string }>) {
            const scribes = scribesList // Use consistent name
            console.log('🎭 Creating screenshot save dialog...')
            console.log('📋 Received scribes in showScreenshotSaveDialog:', scribes?.length || 0, 'scribes', scribes)
            
            // Remove any existing modals first
            const existingModals = document.querySelectorAll('[data-nabu-screenshot-modal]')
            existingModals.forEach(modal => modal.remove())
            
            const modal = document.createElement('div')
            modal.setAttribute('data-nabu-screenshot-modal', 'true')
            modal.style.cssText = `
              position: fixed;
              top: 0;
              left: 0;
              width: 100vw;
              height: 100vh;
              background: hsla(0, 0%, 3.9%, 0.8);
              backdrop-filter: blur(8px);
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 999999;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            `
            
            modal.innerHTML = `
              <div style="
                background: hsl(0, 0%, 9.5%);
                border: 1px solid hsl(0, 0%, 25%);
                border-radius: 0.5rem;
                box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
                max-width: 500px;
                width: 100%;
                margin: 16px;
                max-height: 90vh;
                overflow-y: auto;
              ">
                <div style="
                  padding: 16px;
                  border-bottom: 1px solid hsl(0, 0%, 25%);
                ">
                  <div style="
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                  ">
                    <h3 style="
                      font-size: 18px;
                      font-weight: 600;
                      color: hsl(0, 0%, 98%);
                      margin: 0;
                      letter-spacing: -0.025em;
                    ">Save ${isPartial ? 'Partial ' : ''}Screenshot</h3>
                    <button onclick="this.closest('[style*=\"position: fixed\"]').remove()" style="
                      color: hsl(0, 0%, 63.9%);
                      background: transparent;
                      border: none;
                      cursor: pointer;
                      padding: 8px;
                      border-radius: 0.375rem;
                      transition: all 0.2s;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                    " onmouseover="this.style.backgroundColor='hsl(0, 0%, 25%)'; this.style.color='hsl(0, 0%, 98%)'" onmouseout="this.style.backgroundColor='transparent'; this.style.color='hsl(0, 0%, 63.9%)'">
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                      </svg>
                    </button>
                  </div>
                </div>
                
                <div style="padding: 24px; padding-top: 0;">
                  <div style="margin-bottom: 16px;">
                    <label style="
                      display: block;
                      font-size: 14px;
                      font-weight: 500;
                      color: hsl(0, 0%, 98%);
                      margin-bottom: 8px;
                    ">Screenshot Preview</label>
                    <div style="
                      border: 1px solid hsl(0, 0%, 25%);
                      border-radius: 0.5rem;
                      overflow: hidden;
                      max-height: 300px;
                      text-align: center;
                      background: hsl(0, 0%, 9.5%);
                      padding: 8px;
                    ">
                      <img src="${dataUrl}" alt="Screenshot" style="
                        max-width: 100%;
                        max-height: 300px;
                        object-fit: contain;
                        border-radius: 0.375rem;
                      ">
                    </div>
                  </div>
                  
                  <div style="margin-bottom: 16px;">
                    <label style="
                      display: block;
                      font-size: 14px;
                      font-weight: 500;
                      color: hsl(0, 0%, 98%);
                      margin-bottom: 8px;
                    ">Page URL</label>
                    <div style="
                      background: hsl(0, 0%, 9.5%);
                      border: 1px solid hsl(0, 0%, 25%);
                      border-radius: 0.5rem;
                      padding: 12px;
                      font-size: 13px;
                      color: hsl(0, 0%, 63.9%);
                      overflow: hidden;
                      text-overflow: ellipsis;
                      white-space: nowrap;
                      font-family: 'Monaco', 'Menlo', monospace;
                    ">${url}</div>
                  </div>
                  
                  <div style="margin-bottom: 20px;">
                    <label for="screenshot-scribeSelect" style="
                      display: block;
                      font-size: 14px;
                      font-weight: 500;
                      color: hsl(0, 0%, 98%);
                      margin-bottom: 8px;
                    ">Scribe</label>
                    <select id="screenshot-scribeSelect" style="
                      width: 100%;
                      padding: 10px 12px;
                      border: 1px solid hsl(0, 0%, 25%);
                      border-radius: 0.5rem;
                      font-size: 14px;
                      outline: none;
                      box-sizing: border-box;
                      background: hsl(0, 0%, 9.5%);
                      color: hsl(0, 0%, 98%);
                      transition: all 0.2s;
                    " onfocus="this.style.outline='2px solid hsl(0, 0%, 83.1%)'; this.style.outlineOffset='2px'" onblur="this.style.outline='none'"></select>
                    <div style="margin-top: 10px; display: none;" id="screenshot-newScribeRow">
                      <input type="text" id="screenshot-scribeName" style="
                        width: 100%; 
                        padding: 10px 12px; 
                        border: 1px solid hsl(0, 0%, 25%); 
                        border-radius: 0.5rem; 
                        font-size: 14px; 
                        outline: none; 
                        box-sizing: border-box; 
                        background: hsl(0, 0%, 9.5%); 
                        color: hsl(0, 0%, 98%);
                        transition: all 0.2s;
                      " placeholder="New scribe name" onfocus="this.style.outline='2px solid hsl(0, 0%, 83.1%)'; this.style.outlineOffset='2px'; this.style.borderColor='hsl(0, 0%, 83.1%)'" onblur="this.style.outline='none'; this.style.borderColor='hsl(0, 0%, 25%)'">
                    </div>
                  </div>
                  
                  <div style="display: flex; gap: 12px;">
                    <button id="saveScreenshotBtn" style="
                      flex: 1;
                      background: hsl(0, 0%, 98%);
                      color: hsl(0, 0%, 9%);
                      padding: 10px 16px;
                      border: none;
                      border-radius: 0.5rem;
                      font-size: 14px;
                      font-weight: 500;
                      cursor: pointer;
                      transition: all 0.2s;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      gap: 8px;
                    " onmouseover="this.style.backgroundColor='hsl(0, 0%, 90%)'" onmouseout="this.style.backgroundColor='hsl(0, 0%, 98%)'">
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path>
                      </svg>
                      Save Screenshot
                    </button>
                    <button onclick="window.open('https://nabu-ai.com/dashboard', '_blank')" style="
                      flex: 1;
                      background: transparent;
                      color: hsl(0, 0%, 98%);
                      padding: 10px 16px;
                      border: 1px solid hsl(0, 0%, 25%);
                      border-radius: 0.5rem;
                      font-size: 14px;
                      font-weight: 500;
                      cursor: pointer;
                      transition: all 0.2s;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      gap: 8px;
                    " onmouseover="this.style.backgroundColor='hsl(0, 0%, 25%)'" onmouseout="this.style.backgroundColor='transparent'">
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
                      </svg>
                      Dashboard
                    </button>
                  </div>
                </div>
              </div>
            `
            
            document.body.appendChild(modal)
            console.log('✅ Screenshot save dialog added to page')
            
            // Populate scribe dropdown
            const scribeSelect = modal.querySelector('#screenshot-scribeSelect') as HTMLSelectElement
            if (scribeSelect) {
              console.log('📋 Populating partial screenshot scribe dropdown with', scribes?.length || 0, 'scribes')
              const noneOpt = document.createElement('option'); noneOpt.value=''; noneOpt.text='No scribe'; scribeSelect.appendChild(noneOpt)
              const newOpt = document.createElement('option'); newOpt.value='__new__'; newOpt.text='➕ Create new scribe'; scribeSelect.appendChild(newOpt)
              if (scribes && scribes.length > 0) {
                scribes.forEach((s: any) => { 
                  const opt = document.createElement('option')
                  opt.value = s.id
                  opt.text = s.name || 'Untitled'
                  scribeSelect.appendChild(opt)
                  console.log('✅ Added scribe option:', s.id, s.name)
                })
              } else {
                console.warn('⚠️ No scribes available to populate partial screenshot dropdown')
              }
              scribeSelect.addEventListener('change', () => {
                const row = modal.querySelector('#screenshot-newScribeRow') as HTMLElement
                if (row) row.style.display = scribeSelect.value === '__new__' ? 'block' : 'none'
              })
            } else {
              console.error('❌ Could not find #screenshot-scribeSelect element in partial screenshot modal')
            }
            
            // Add CSS for spinner animation if not already added
            if (!document.querySelector('style[data-nabu-spinner]')) {
              const style = document.createElement('style')
              style.setAttribute('data-nabu-spinner', 'true')
              style.textContent = `
                @keyframes spin {
                  from { transform: rotate(0deg); }
                  to { transform: rotate(360deg); }
                }
                .animate-spin {
                  animation: spin 1s linear infinite;
                }
              `
              document.head.appendChild(style)
            }
            
            // Add save functionality
            const saveBtn = modal.querySelector('#saveScreenshotBtn') as HTMLButtonElement
            if (saveBtn) {
              console.log('🔘 Save screenshot button found, adding click handler...')
              saveBtn.addEventListener('click', () => {
                console.log('💾 Save screenshot button clicked, processing save...')
                
                // Disable button and show loading state
                saveBtn.disabled = true
                saveBtn.innerHTML = `
                  <svg class="animate-spin" width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                  </svg>
                  Saving...
                `
                saveBtn.style.opacity = '0.7'
                saveBtn.style.cursor = 'not-allowed'
                
                const scribeSelect = modal.querySelector('#screenshot-scribeSelect') as HTMLSelectElement
                const scribeInput = modal.querySelector('#screenshot-scribeName') as HTMLInputElement
                const title = isPartial ? 'Partial Screenshot' : 'Screenshot'
                const scribeId = scribeSelect?.value && scribeSelect.value !== '__new__' ? scribeSelect.value : ''
                const scribeName = scribeSelect?.value === '__new__' ? (scribeInput?.value?.trim() || '') : ''
                
                const saveData = {
                  type: 'image', // Screenshots are saved as images
                  title: title,
                  url: url,
                  content: dataUrl,
                  tags: [],
                  timestamp: new Date().toISOString(),
                  isScreenshot: true, // Flag to identify screenshots
                  scribeId,
                  scribeName,
                  metadata: { isScreenshot: true, isPartial: isPartial }
                }
                
                console.log('📊 Screenshot save data prepared:', saveData)
                
                // Send message to background script to save
                chrome.runtime.sendMessage({
                  action: 'saveContent',
                  data: saveData
                }, (response) => {
                  console.log('📨 Screenshot save response received:', response)
                  if (response && response.success) {
                    // Show success message
                    modal.innerHTML = `
                      <div style="
                        background: hsl(0, 0%, 9.5%);
                        border: 1px solid hsl(0, 0%, 25%);
                        border-radius: 0.5rem;
                        padding: 24px;
                        max-width: 384px;
                        margin: 16px;
                        text-align: center;
                        box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
                      ">
                        <div style="
                          width: 64px;
                          height: 64px;
                          background: hsl(0, 0%, 15%);
                          border-radius: 50%;
                          display: flex;
                          align-items: center;
                          justify-content: center;
                          margin: 0 auto 16px;
                        ">
                          <svg width="32" height="32" fill="none" stroke="hsl(0, 0%, 98%)" stroke-width="2.5" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path>
                          </svg>
                        </div>
                        <h3 style="
                          font-size: 20px;
                          font-weight: 600;
                          color: hsl(0, 0%, 98%);
                          margin: 0 0 8px;
                        ">Screenshot Saved!</h3>
                        <p style="
                          font-size: 14px;
                          color: hsl(0, 0%, 63.9%);
                          margin: 0 0 24px;
                          line-height: 1.5;
                        ">Your ${isPartial ? 'partial ' : ''}screenshot has been successfully saved to NabuAI.</p>
                        <button id="continueBtn" style="
                          width: 100%;
                          background: hsl(0, 0%, 98%);
                          color: hsl(0, 0%, 9%);
                          padding: 10px 16px;
                          border: none;
                          border-radius: 0.5rem;
                          font-size: 14px;
                          font-weight: 500;
                          cursor: pointer;
                          transition: all 0.2s;
                        " onmouseover="this.style.backgroundColor='hsl(0, 0%, 90%)'" onmouseout="this.style.backgroundColor='hsl(0, 0%, 98%)'">
                          Continue
                        </button>
                      </div>
                    `
                    console.log('✅ Screenshot success message displayed')
                    
                    // Add click handler to continue button
                    setTimeout(() => {
                      const continueBtn = modal.querySelector('#continueBtn')
                      if (continueBtn) {
                        continueBtn.addEventListener('click', () => {
                          console.log('🔘 Continue button clicked, removing modal')
                          modal.remove()
                        })
                      }
                    }, 100)
                  } else {
                    // Show error message
                    modal.innerHTML = `
                      <div style="
                        background: hsl(0, 0%, 9.5%);
                        border: 1px solid hsl(0, 0%, 25%);
                        border-radius: 0.5rem;
                        padding: 24px;
                        max-width: 384px;
                        margin: 16px;
                        text-align: center;
                        box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
                      ">
                        <div style="
                          width: 64px;
                          height: 64px;
                          background: hsl(0, 62.8%, 30.6%);
                          border-radius: 50%;
                          display: flex;
                          align-items: center;
                          justify-content: center;
                          margin: 0 auto 16px;
                        ">
                          <svg width="32" height="32" fill="none" stroke="hsl(0, 0%, 98%)" stroke-width="2.5" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path>
                          </svg>
                        </div>
                        <h3 style="
                          font-size: 20px;
                          font-weight: 600;
                          color: hsl(0, 0%, 98%);
                          margin: 0 0 8px;
                        ">Save Failed</h3>
                        <p style="
                          font-size: 14px;
                          color: hsl(0, 0%, 63.9%);
                          margin: 0 0 24px;
                          line-height: 1.5;
                        ">There was an error saving your screenshot. Please try again.</p>
                        <button onclick="this.closest('[style*=\"position: fixed\"]').remove()" style="
                          width: 100%;
                          background: hsl(0, 62.8%, 30.6%);
                          color: hsl(0, 0%, 98%);
                          padding: 10px 16px;
                          border: none;
                          border-radius: 0.5rem;
                          font-size: 14px;
                          font-weight: 500;
                          cursor: pointer;
                          transition: all 0.2s;
                        " onmouseover="this.style.backgroundColor='hsl(0, 62.8%, 25.6%)'" onmouseout="this.style.backgroundColor='hsl(0, 62.8%, 30.6%)'">
                          Close
                        </button>
                      </div>
                    `
                    console.log('❌ Screenshot error message displayed')
                  }
                })
              })
              console.log('✅ Screenshot save button click handler added')
            } else {
              console.error('❌ Screenshot save button not found')
            }
            
            // Close modal when clicking outside
            modal.addEventListener('click', (e) => {
              console.log('🔒 Screenshot modal clicked', e.target)
              if (e.target === modal) {
                modal.remove()
                console.log('🔒 Screenshot modal closed by outside click')
              }
            })
          }
          
          function showError(message: string) {
            const errorDiv = document.createElement('div')
            errorDiv.style.cssText = `
              position: fixed;
              top: 20px;
              left: 50%;
              transform: translateX(-50%);
              background: #dc2626;
              color: white;
              padding: 12px 20px;
              border-radius: 6px;
              font-size: 14px;
              z-index: 1000001;
              pointer-events: none;
            `
            errorDiv.textContent = message
            document.body.appendChild(errorDiv)
            
            setTimeout(() => {
              errorDiv.remove()
            }, 3000)
          }
          
        },
        args: [fullScreenshot, url, scribes]
      })
      
      console.log('✅ Partial screenshot selection overlay injected successfully')
    } catch (error) {
      console.error('❌ Error starting partial screenshot:', error)
    }
  }

  private async openPDFInViewer(pdfUrl: string, sourceUrl: string) {
    console.log(`📄 Opening PDF in NabuAI viewer: ${pdfUrl}`)
    console.log(`🔗 Source URL: ${sourceUrl}`)
    
    if (!pdfUrl || typeof pdfUrl !== 'string' || pdfUrl.trim() === '') {
      throw new Error('PDF URL is required and must be a non-empty string')
    }
    
    try {
      // Create PDF viewer URL with parameters
      const viewerUrl = chrome.runtime.getURL('pdf-viewer.html')
      const params = new URLSearchParams({
        url: pdfUrl,
        source: sourceUrl || pdfUrl
      })
      
      const fullViewerUrl = `${viewerUrl}?${params.toString()}`
      
      console.log('🔗 Opening PDF viewer:', fullViewerUrl)
      console.log('🔍 URL parameter value:', pdfUrl)
      
      // Open PDF viewer in new tab
      await chrome.tabs.create({
        url: fullViewerUrl,
        active: true
      })
      
      console.log('✅ PDF viewer opened successfully')
    } catch (error) {
      console.error('❌ Error opening PDF viewer:', error)
      throw error
    }
  }

  private async showScreenshotSaveDialog(tabId: number, dataUrl: string, url: string) {
    console.log(`🎬 Showing screenshot save dialog for tab ${tabId}`)
    
    try {
      // Ensure session is available before fetching scribes
      const hasSession = await this.ensureSession()
      if (!hasSession) {
        console.warn('⚠️ No session available, cannot fetch scribes')
      }
      
      // Fetch user's scribes to populate dropdown
      let scribes: Array<{ id: string; name: string }> = []
      try {
        console.log('📋 Fetching scribes for screenshot save dialog...')
        const list = await databaseService.getUserScribes()
        console.log('📋 Fetched scribes:', list?.length || 0, 'scribes')
        scribes = (list || []).map(s => ({ id: s.id, name: s.name || 'Untitled' }))
        console.log('📋 Mapped scribes:', scribes.length, 'scribes', scribes)
      } catch (e) {
        console.error('❌ Failed to load scribes:', e)
        console.error('❌ Error details:', {
          message: (e as any)?.message,
          stack: (e as any)?.stack,
          error: e
        })
      }

      await chrome.scripting.executeScript({
        target: { tabId },
        func: (dataUrl: string, url: string, scribes: Array<{ id: string; name: string }>) => {
          console.log('📋 Received scribes in injected script:', scribes?.length || 0, 'scribes', scribes)
          console.log('🎭 Creating screenshot save dialog in page context...')
          
          // Remove any existing modals first
          const existingModals = document.querySelectorAll('[data-nabu-screenshot-modal]')
          existingModals.forEach(modal => modal.remove())
          
          const modal = document.createElement('div')
          modal.setAttribute('data-nabu-screenshot-modal', 'true')
          modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          `
          
          modal.innerHTML = `
            <div style="
              background: hsl(0, 0%, 9.5%);
              border: 1px solid hsl(0, 0%, 25%);
              border-radius: 0.5rem;
              box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
              max-width: 500px;
              width: 100%;
              margin: 16px;
              max-height: 90vh;
              overflow-y: auto;
            ">
              <div style="
                padding: 16px;
                border-bottom: 1px solid hsl(0, 0%, 25%);
              ">
                <div style="
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                ">
                  <h3 style="
                    font-size: 18px;
                    font-weight: 600;
                    color: hsl(0, 0%, 98%);
                    margin: 0;
                    letter-spacing: -0.025em;
                  ">Save Screenshot to NabuAI</h3>
                  <button onclick="this.closest('[style*=\"position: fixed\"]').remove()" style="
                    color: hsl(0, 0%, 63.9%);
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    padding: 8px;
                    border-radius: 0.375rem;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                  " onmouseover="this.style.backgroundColor='hsl(0, 0%, 25%)'; this.style.color='hsl(0, 0%, 98%)'" onmouseout="this.style.backgroundColor='transparent'; this.style.color='hsl(0, 0%, 63.9%)'">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>
              </div>
              
              <div style="padding: 24px; padding-top: 0;">
                <div style="margin-bottom: 16px;">
                  <label style="
                    display: block;
                    font-size: 14px;
                    font-weight: 500;
                    color: hsl(0, 0%, 98%);
                    margin-bottom: 8px;
                  ">Screenshot Preview</label>
                  <div style="
                    border: 1px solid hsl(0, 0%, 25%);
                    border-radius: 0.5rem;
                    overflow: hidden;
                    max-height: 300px;
                    text-align: center;
                    background: hsl(0, 0%, 9.5%);
                    padding: 8px;
                  ">
                    <img src="${dataUrl}" alt="Screenshot" style="
                      max-width: 100%;
                      max-height: 300px;
                      object-fit: contain;
                      border-radius: 0.375rem;
                    ">
                  </div>
                </div>
                
                <div style="margin-bottom: 16px;">
                  <label style="
                    display: block;
                    font-size: 14px;
                    font-weight: 500;
                    color: hsl(0, 0%, 98%);
                    margin-bottom: 8px;
                  ">Page URL</label>
                  <div style="
                    background: hsl(0, 0%, 9.5%);
                    border: 1px solid hsl(0, 0%, 25%);
                    border-radius: 0.5rem;
                    padding: 12px;
                    font-size: 13px;
                    color: hsl(0, 0%, 63.9%);
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    font-family: 'Monaco', 'Menlo', monospace;
                  ">${url}</div>
                </div>
                
                <div style="margin-bottom: 20px;">
                  <label for="screenshot-scribeSelect" style="
                    display: block;
                    font-size: 14px;
                    font-weight: 500;
                    color: hsl(0, 0%, 98%);
                    margin-bottom: 8px;
                  ">Scribe</label>
                  <select id="screenshot-scribeSelect" style="
                    width: 100%;
                    padding: 10px 12px;
                    border: 1px solid hsl(0, 0%, 25%);
                    border-radius: 0.5rem;
                    font-size: 14px;
                    outline: none;
                    box-sizing: border-box;
                    background: hsl(0, 0%, 9.5%);
                    color: hsl(0, 0%, 98%);
                    transition: all 0.2s;
                  " onfocus="this.style.outline='2px solid hsl(0, 0%, 83.1%)'; this.style.outlineOffset='2px'" onblur="this.style.outline='none'"></select>
                  <div style="margin-top: 10px; display: none;" id="screenshot-newScribeRow">
                    <input type="text" id="screenshot-scribeName" style="
                      width: 100%; 
                      padding: 10px 12px; 
                      border: 1px solid hsl(0, 0%, 25%); 
                      border-radius: 0.5rem; 
                      font-size: 14px; 
                      outline: none; 
                      box-sizing: border-box; 
                      background: hsl(0, 0%, 9.5%); 
                      color: hsl(0, 0%, 98%);
                      transition: all 0.2s;
                    " placeholder="New scribe name" onfocus="this.style.outline='2px solid hsl(0, 0%, 83.1%)'; this.style.outlineOffset='2px'; this.style.borderColor='hsl(0, 0%, 83.1%)'" onblur="this.style.outline='none'; this.style.borderColor='hsl(0, 0%, 25%)'">
                  </div>
                </div>
                
                <div style="display: flex; gap: 12px;">
                  <button id="saveScreenshotBtn" style="
                    flex: 1;
                    background: hsl(0, 0%, 98%);
                    color: hsl(0, 0%, 9%);
                    padding: 10px 16px;
                    border: none;
                    border-radius: 0.5rem;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                  " onmouseover="this.style.backgroundColor='hsl(0, 0%, 90%)'" onmouseout="this.style.backgroundColor='hsl(0, 0%, 98%)'">
                    Save Screenshot
                  </button>
                  <button onclick="window.open('https://nabu-ai.com/dashboard', '_blank')" style="
                    flex: 1;
                    background: transparent;
                    color: hsl(0, 0%, 98%);
                    padding: 10px 16px;
                    border: 1px solid hsl(0, 0%, 25%);
                    border-radius: 0.5rem;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                  " onmouseover="this.style.backgroundColor='hsl(0, 0%, 25%)'" onmouseout="this.style.backgroundColor='transparent'">
                    Go to Dashboard
                  </button>
                </div>
              </div>
            </div>
          `
          
          document.body.appendChild(modal)
          console.log('✅ Screenshot save dialog added to page')
          
          // Populate scribe dropdown
          const scribeSelect = modal.querySelector('#screenshot-scribeSelect') as HTMLSelectElement
          if (scribeSelect) {
            console.log('📋 Populating screenshot scribe dropdown with', scribes?.length || 0, 'scribes')
            const noneOpt = document.createElement('option'); noneOpt.value=''; noneOpt.text='No scribe'; scribeSelect.appendChild(noneOpt)
            const newOpt = document.createElement('option'); newOpt.value='__new__'; newOpt.text='➕ Create new scribe'; scribeSelect.appendChild(newOpt)
            if (scribes && scribes.length > 0) {
              scribes.forEach((s: any) => { 
                const opt = document.createElement('option')
                opt.value = s.id
                opt.text = s.name || 'Untitled'
                scribeSelect.appendChild(opt)
                console.log('✅ Added scribe option:', s.id, s.name)
              })
            } else {
              console.warn('⚠️ No scribes available to populate screenshot dropdown')
            }
            scribeSelect.addEventListener('change', () => {
              const row = modal.querySelector('#screenshot-newScribeRow') as HTMLElement
              if (row) row.style.display = scribeSelect.value === '__new__' ? 'block' : 'none'
            })
          } else {
            console.error('❌ Could not find #screenshot-scribeSelect element in modal')
          }
          
          // Add CSS for spinner animation if not already added
          if (!document.querySelector('style[data-nabu-spinner]')) {
            const style = document.createElement('style')
            style.setAttribute('data-nabu-spinner', 'true')
            style.textContent = `
              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
              .animate-spin {
                animation: spin 1s linear infinite;
              }
            `
            document.head.appendChild(style)
          }
          
          // Add save functionality
          const saveBtn = modal.querySelector('#saveScreenshotBtn') as HTMLButtonElement
          if (saveBtn) {
            console.log('🔘 Save screenshot button found, adding click handler...')
            saveBtn.addEventListener('click', () => {
              console.log('💾 Save screenshot button clicked, processing save...')
              
              // Disable button and show loading state
              saveBtn.disabled = true
              saveBtn.innerHTML = `
                <svg class="animate-spin" width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="display: inline-block; margin-right: 8px;">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                Saving...
              `
              saveBtn.style.opacity = '0.7'
              saveBtn.style.cursor = 'not-allowed'
              
              const scribeSelect = modal.querySelector('#screenshot-scribeSelect') as HTMLSelectElement
              const scribeInput = modal.querySelector('#screenshot-scribeName') as HTMLInputElement
              const title = 'Screenshot'
              const scribeId = scribeSelect?.value && scribeSelect.value !== '__new__' ? scribeSelect.value : ''
              const scribeName = scribeSelect?.value === '__new__' ? (scribeInput?.value?.trim() || '') : ''
              
              const saveData = {
                type: 'image', // Screenshots are saved as images
                title: title,
                url: url,
                content: dataUrl,
                tags: [],
                timestamp: new Date().toISOString(),
                isScreenshot: true, // Flag to identify screenshots
                scribeId,
                scribeName,
                metadata: { isScreenshot: true }
              }
              
              console.log('📊 Screenshot save data prepared:', saveData)
              
              // Send message to background script to save
              chrome.runtime.sendMessage({
                action: 'saveContent',
                data: saveData
              }, (response) => {
                console.log('📨 Screenshot save response received:', response)
                if (response && response.success) {
                  // Show success message
                  modal.innerHTML = `
                    <div style="
                      background: hsl(0, 0%, 9.5%);
                      border: 1px solid hsl(0, 0%, 25%);
                      border-radius: 0.5rem;
                      padding: 24px;
                      max-width: 384px;
                      margin: 16px;
                      text-align: center;
                      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
                    ">
                      <div style="
                        width: 64px;
                        height: 64px;
                        background: hsl(0, 0%, 15%);
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin: 0 auto 16px;
                      ">
                        <svg width="32" height="32" fill="none" stroke="hsl(0, 0%, 98%)" stroke-width="2.5" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path>
                        </svg>
                      </div>
                      <h3 style="
                        font-size: 20px;
                        font-weight: 600;
                        color: hsl(0, 0%, 98%);
                        margin: 0 0 8px;
                      ">Screenshot Saved!</h3>
                      <p style="
                        font-size: 14px;
                        color: hsl(0, 0%, 63.9%);
                        margin: 0 0 24px;
                        line-height: 1.5;
                      ">Your screenshot has been successfully saved to NabuAI.</p>
                      <button onclick="this.closest('[style*=\"position: fixed\"]').remove()" style="
                        width: 100%;
                        background: hsl(0, 0%, 98%);
                        color: hsl(0, 0%, 9%);
                        padding: 10px 16px;
                        border: none;
                        border-radius: 0.5rem;
                        font-size: 14px;
                        font-weight: 500;
                        cursor: pointer;
                        transition: all 0.2s;
                      " onmouseover="this.style.backgroundColor='hsl(0, 0%, 90%)'" onmouseout="this.style.backgroundColor='hsl(0, 0%, 98%)'">
                        Continue
                      </button>
                    </div>
                  `
                  console.log('✅ Screenshot success message displayed')
                } else {
                  // Show error message
                  modal.innerHTML = `
                    <div style="
                      background: hsl(0, 0%, 9.5%);
                      border: 1px solid hsl(0, 0%, 25%);
                      border-radius: 0.5rem;
                      padding: 24px;
                      max-width: 384px;
                      margin: 16px;
                      text-align: center;
                      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
                    ">
                      <div style="
                        width: 64px;
                        height: 64px;
                        background: hsl(0, 62.8%, 30.6%);
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin: 0 auto 16px;
                      ">
                        <svg width="32" height="32" fill="none" stroke="hsl(0, 0%, 98%)" stroke-width="2.5" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                      </div>
                      <h3 style="
                        font-size: 20px;
                        font-weight: 600;
                        color: hsl(0, 0%, 98%);
                        margin: 0 0 8px;
                      ">Save Failed</h3>
                      <p style="
                        font-size: 14px;
                        color: hsl(0, 0%, 63.9%);
                        margin: 0 0 24px;
                        line-height: 1.5;
                      ">There was an error saving your screenshot. Please try again.</p>
                      <button onclick="this.closest('[style*=\"position: fixed\"]').remove()" style="
                        width: 100%;
                        background: hsl(0, 62.8%, 30.6%);
                        color: hsl(0, 0%, 98%);
                        padding: 10px 16px;
                        border: none;
                        border-radius: 0.5rem;
                        font-size: 14px;
                        font-weight: 500;
                        cursor: pointer;
                        transition: all 0.2s;
                      " onmouseover="this.style.backgroundColor='hsl(0, 62.8%, 25.6%)'" onmouseout="this.style.backgroundColor='hsl(0, 62.8%, 30.6%)'">
                        Close
                      </button>
                    </div>
                  `
                  console.log('❌ Screenshot error message displayed')
                }
              })
            })
            console.log('✅ Screenshot save button click handler added')
          } else {
            console.error('❌ Screenshot save button not found')
          }
          
          // Close modal when clicking outside
          modal.addEventListener('click', (e) => {
            if (e.target === modal) {
              modal.remove()
              console.log('🔒 Screenshot modal closed by outside click')
            }
          })
          
        },
        args: [dataUrl, url, scribes]
      })
      
      console.log('✅ Screenshot save dialog script injected successfully')
    } catch (error) {
      console.error('❌ Error showing screenshot save dialog:', error)
    }
  }

  private handleMessage(request: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) {
    if (request.action === 'showTextSaveModal') {
      // Handle text save modal request
      this.showTextSaveDialog(sender.tab?.id || 0, request.data.text, request.data.url)
      sendResponse({ success: true })
    } else if (request.action === 'showMediaSaveModal') {
      // Handle media save modal request
      this.showMediaSaveDialog(sender.tab?.id || 0, request.data)
      sendResponse({ success: true })
    } else if (request.action === 'setAuthSession') {
      // Receive Supabase session tokens from popup and set in background
      (async () => {
        try {
          const { access_token, refresh_token } = request
          if (access_token && refresh_token) {
            // Check if tokens have changed to avoid redundant session sets
            if (this.lastSessionTokens?.access_token === access_token && 
                this.lastSessionTokens?.refresh_token === refresh_token) {
              // Tokens haven't changed, skip setting session
              sendResponse({ success: true, skipped: true })
              return
            }
            
            // Store session in chrome.storage for persistence
            await chrome.storage.local.set({
              supabase_session: {
                access_token,
                refresh_token
              }
            })
            
            // Set session in Supabase client
            const { data, error } = await supabase.auth.setSession({ 
              access_token, 
              refresh_token 
            })
            if (error) {
              console.warn('⚠️ Failed to set Supabase session in background:', error)
              sendResponse({ success: false, error: error.message })
            } else {
              // Update last session tokens
              this.lastSessionTokens = { access_token, refresh_token }
              console.log('🔐 Supabase session set in background for user:', data?.user?.id)
              sendResponse({ success: true })
            }
          } else {
            sendResponse({ success: false, error: 'Missing tokens' })
          }
        } catch (err: any) {
          console.error('❌ Error setting session in background:', err)
          sendResponse({ success: false, error: err?.message || 'Unknown error' })
        }
      })()
      return true
    } else if (request.action === 'getUserScribes') {
      (async () => {
        try {
          const hasSession = await this.ensureSession()
          if (!hasSession) {
            throw new Error('Not authenticated')
          }
          const list = await databaseService.getUserScribes()
          const scribes = (list || []).map(s => ({
            id: s.id,
            name: s.name || 'Untitled',
            is_shared: s.is_shared || false
          }))
          sendResponse({ success: true, scribes })
        } catch (error: any) {
          console.error('❌ Error fetching scribes for PDF viewer:', error)
          sendResponse({ success: false, error: error?.message || 'Failed to load scribes' })
        }
      })()
      return true
    } else if (request.action === 'clearAuthSession') {
      // Clear Supabase session in background
      (async () => {
        try {
          // Sign out from Supabase
          await supabase.auth.signOut()
          
          // Clear stored session
          await chrome.storage.local.remove('supabase_session')
          
          // Reset last session tokens
          this.lastSessionTokens = null
          
          console.log('🔐 Auth session cleared in background')
          sendResponse({ success: true })
        } catch (err: any) {
          console.error('❌ Error clearing session in background:', err)
          sendResponse({ success: false, error: err?.message || 'Unknown error' })
        }
      })()
      return true
    } else if (request.action === 'saveContent') {
      // Handle save content request
      this.saveContent(request.data, sendResponse, sender.tab?.id)
      return true // Keep message channel open for async response
    } else if (request.action === 'openPDFViewer') {
      // Open a PDF in the dedicated viewer from popup or content scripts
      const pdfUrl = request.pdfUrl
      const sourceUrl = request.sourceUrl || request.pdfUrl
      
      console.log('📨 Received openPDFViewer request:', {
        hasPdfUrl: !!pdfUrl,
        pdfUrlType: typeof pdfUrl,
        pdfUrlLength: pdfUrl?.length,
        pdfUrlPreview: pdfUrl ? pdfUrl.substring(0, 100) : 'N/A',
        sourceUrl: sourceUrl
      })
      
      if (!pdfUrl) {
        console.warn('⚠️ openPDFViewer request missing pdfUrl')
        sendResponse({ success: false, error: 'Missing pdfUrl' })
        return
      }
      
      if (typeof pdfUrl !== 'string' || pdfUrl.trim() === '') {
        console.warn('⚠️ openPDFViewer request has invalid pdfUrl:', pdfUrl)
        sendResponse({ success: false, error: 'Invalid pdfUrl: must be a non-empty string' })
        return
      }

      ;(async () => {
        try {
          await this.openPDFInViewer(pdfUrl, sourceUrl)
          sendResponse({ success: true })
        } catch (error: any) {
          console.error('❌ Failed to open PDF viewer from message:', error)
          sendResponse({ success: false, error: error?.message || 'Failed to open PDF viewer' })
        }
      })()
      return true
    }
  }

  private async saveContent(data: any, sendResponse: (response: any) => void, tabId?: number) {
    try {
      console.log('💾 Saving content:', data)
      
      // Ensure Supabase session exists (fetch tokens from chrome.storage if needed)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          const stored = await chrome.storage.local.get('supabase_session')
          const tokens = stored?.supabase_session
          if (tokens?.access_token && tokens?.refresh_token) {
            await supabase.auth.setSession({
              access_token: tokens.access_token,
              refresh_token: tokens.refresh_token
            })
          }
        }
      } catch (sessErr) {
        console.warn('Session check/set failed:', sessErr)
      }

      // Upload media/screenshot/PDF to object storage if applicable
      let storagePath: string | undefined
      let storagePublicUrl: string | undefined
      const isImage = data.type === 'image' || data.mediaType === 'image' || data.metadata?.mediaType === 'image'
      const isPDF = data.type === 'pdf'
      
      console.log('📦 Upload check:', {
        type: data.type,
        isPDF,
        isImage,
        isScreenshot: data.isScreenshot,
        hasPdfUrl: !!data.pdfUrl,
        pdfUrl: data.pdfUrl,
        hasContent: !!data.content,
        contentPreview: typeof data.content === 'string' ? data.content.substring(0, 100) : typeof data.content
      })
      
      try {
        const { data: { user } } = await supabase.auth.getUser()
        const userId = user?.id
        
        console.log('👤 User check:', { userId, hasUser: !!user })
        
        if (userId && (isImage || data.isScreenshot || isPDF)) {
          if (isPDF) {
            // Handle PDF upload - try pdfUrl first, then fallback to url or content if it's a URL
            const pdfUrlToUpload = data.pdfUrl || (data.url && (data.url.endsWith('.pdf') || data.url.includes('.pdf')) ? data.url : null) || (data.content && typeof data.content === 'string' && (data.content.startsWith('http://') || data.content.startsWith('https://')) && data.content.includes('.pdf') ? data.content : null)
            
            console.log('📄 PDF upload attempt:', {
              pdfUrl: data.pdfUrl,
              url: data.url,
              content: typeof data.content === 'string' ? data.content.substring(0, 100) : 'not a string',
              pdfUrlToUpload
            })
            
            if (pdfUrlToUpload) {
              console.log('📄 Uploading PDF to Supabase Storage:', pdfUrlToUpload)
              try {
                const up = await uploadFromUrl(pdfUrlToUpload, userId, 'pdfs')
                storagePath = up.path
                storagePublicUrl = up.publicUrl
                console.log('✅ PDF uploaded to storage:', storagePath, storagePublicUrl)
              } catch (uploadError: any) {
                console.error('❌ Failed to upload PDF:', uploadError)
                console.error('❌ Upload error details:', {
                  message: uploadError.message,
                  error: uploadError,
                  stack: uploadError.stack
                })
                // If upload fails, store the original URL
                storagePublicUrl = pdfUrlToUpload
              }
            } else {
              console.warn('⚠️ PDF detected but no valid PDF URL found for upload:', {
                pdfUrl: data.pdfUrl,
                url: data.url,
                content: typeof data.content === 'string' ? data.content.substring(0, 50) : typeof data.content
              })
            }
          } else if (data.content && typeof data.content === 'string') {
            if (data.content.startsWith('data:')) {
              // Data URL (base64 encoded image) - convert to blob and upload
              const up = await uploadDataUrl(data.content, userId, data.isScreenshot ? 'screenshots' : 'images')
              storagePath = up.path
              storagePublicUrl = up.publicUrl
              console.log('✅ Image uploaded from data URL:', storagePath)
            } else if (data.content.startsWith('http://') || data.content.startsWith('https://')) {
              // HTTP(S) URL - fetch the raw image file and upload directly
              console.log('📥 Fetching image from URL for upload:', data.content)
              try {
                const up = await uploadFromUrl(data.content, userId, data.isScreenshot ? 'screenshots' : 'images')
                storagePath = up.path
                storagePublicUrl = up.publicUrl
                console.log('✅ Raw image file uploaded from URL:', storagePath, storagePublicUrl)
              } catch (uploadError: any) {
                console.error('❌ Failed to upload image from URL:', uploadError)
                // If upload fails due to CORS, we'll store the original URL
                if (uploadError.message?.includes('CORS') || uploadError.message?.includes('fetch')) {
                  console.warn('⚠️ CORS issue - storing original URL instead')
                  storagePublicUrl = data.content
                } else {
                  throw uploadError
                }
              }
            }
          }
        }
      } catch (uploadErr) {
        console.error('❌ Upload failed:', uploadErr)
        // Continue saving even if upload fails - will store original URL
      }

      // Optionally fetch Readability article for text/page from the active tab
      let article: any = null
      if ((data.type === 'text' || data.type === 'page') && typeof tabId === 'number') {
        try {
          const resp = await chrome.tabs.sendMessage(tabId, { action: 'getReadableArticle' })
          if (resp?.ok && resp.article) article = resp.article
        } catch (_) {}
      }

      // Use StorageManager which handles Supabase, Chrome, or localStorage backends
      // Prepare the content without id (StorageManager will handle it)
      const mergedMetadata = { ...(data.metadata || {}), ...(article ? { 
        article: {
          ...article,
          htmlContent: article.content, // Keep HTML in metadata
          textContent: article.textContent
        }
      } : {}) }
      
      // For pages, prefer textContent (plain text) over HTML content for vector processing
      // But keep HTML in metadata for reference
      let pageContent = data.content
      if ((data.type === 'page' || data.type === 'text') && article?.textContent) {
        // Use plain text content for better vector processing
        pageContent = article.textContent
        console.log('📄 Using article textContent for page:', {
          textContentLength: article.textContent?.length || 0,
          htmlContentLength: article.content?.length || 0
        })
      }
      
      const contentToSave = {
        type: data.type,
        title: data.title,
        url: data.url,
        content: pageContent || data.content, // Use textContent for pages, original for others
        notes: data.notes,
        tags: data.tags,
        timestamp: data.timestamp || new Date().toISOString(),
        metadata: mergedMetadata,
        storage_object_path: storagePath, // Supabase Storage path (internal)
        media_url: storagePublicUrl || (isImage && data.content ? data.content : (isPDF && data.pdfUrl ? data.pdfUrl : undefined)), // Public URL from Supabase Storage, or fallback to original
        media_type: isImage ? 'image' : (data.type === 'video' ? 'video' : (isPDF ? 'application/pdf' : undefined)),
        scribe_id: data.scribeId || data.scribe_id // Include scribe_id if provided
      }
      
      console.log('💾 Calling StorageManager.saveContent with:', {
        type: contentToSave.type,
        title: contentToSave.title,
        contentLength: contentToSave.content?.length || 0,
        hasContent: !!contentToSave.content,
        hasStoragePath: !!contentToSave.storage_object_path,
        hasMediaUrl: !!contentToSave.media_url,
        mediaType: contentToSave.media_type
      })
      
      // Save using StorageManager
      let id: string
      try {
        id = await storageManager.saveContent(contentToSave)
        console.log('✅ Document saved with ID:', id)
      } catch (saveError: any) {
        console.error('❌ StorageManager.saveContent failed:', saveError)
        console.error('❌ Save error details:', {
          message: saveError.message,
          error: saveError,
          stack: saveError.stack,
          data: saveError.data
        })
        throw saveError
      }
      
      // If an existing scribeId was chosen, clone its name; else create new if scribeName provided
      if (data.scribeId && typeof data.scribeId === 'string') {
        try {
          const existing = await databaseService.getScribeById(data.scribeId)
          const nameToUse = existing?.name || 'Untitled Conversation'
          await databaseService.createScribe({ document_id: id, name: nameToUse })
        } catch (e) {
          console.warn('⚠️ Failed to clone scribe name:', e)
        }
      } else if (data.scribeName && typeof data.scribeName === 'string' && data.scribeName.trim().length > 0) {
        try {
          await databaseService.createScribe({
            document_id: id,
            name: data.scribeName.trim()
          })
          console.log('🧠 Scribe created and linked to document:', data.scribeName)
        } catch (scribeError) {
          console.warn('⚠️ Failed to create scribe:', scribeError)
        }
      }
      
      console.log('✅ Content saved successfully with ID:', id)
      
      // Process document for vector storage (async, don't wait for response)
      // Text/Page/PDF: use process-document
      // Images: use process-image (extracts text from images)
      const isTextDocument = contentToSave.type === 'text' || contentToSave.type === 'page' || contentToSave.type === 'pdf'
      const isImageDoc = contentToSave.type === 'image'
      const shouldProcessText = isTextDocument && 
                                contentToSave.content && 
                                typeof contentToSave.content === 'string' && 
                                contentToSave.content.trim().length > 0
      const shouldProcessImage = isImageDoc && 
                                 (contentToSave.media_url || contentToSave.storage_object_path)
      
      console.log('🔍 Background: Vector processing check:', {
        documentId: id,
        type: contentToSave.type,
        hasContent: !!contentToSave.content,
        contentLength: typeof contentToSave.content === 'string' ? contentToSave.content.length : 0,
        hasMediaUrl: !!contentToSave.media_url,
        hasStoragePath: !!contentToSave.storage_object_path,
        shouldProcessText,
        shouldProcessImage
      })
      
      if (shouldProcessText) {
        console.log('🚀 Background: Starting vector processing for text document:', id)
        // Call process-document edge function (async, don't wait)
        edgeFunctionService.processDocument(id)
          .then(result => {
            console.log('✅ Background: Document processed for vector storage:', result)
          })
          .catch(error => {
            console.error('❌ Background: Failed to process document for vectors:', error)
            console.error('❌ Background: Error details:', {
              message: error?.message,
              stack: error?.stack,
              error: error
            })
            // Don't throw - vector processing is optional and happens async
          })
      } else if (shouldProcessImage) {
        console.log('🖼️ Background: Starting image processing for vector storage:', id)
        // Call process-image edge function (async, don't wait)
        edgeFunctionService.processImage(id)
          .then(result => {
            console.log('✅ Background: Image processed for vector storage:', result)
            if (result.extractedTextLength) {
              console.log('📝 Background: Extracted', result.extractedTextLength, 'characters from image')
            }
          })
          .catch(error => {
            console.error('❌ Background: Failed to process image for vectors:', error)
            console.error('❌ Background: Error details:', {
              message: error?.message,
              stack: error?.stack,
              error: error
            })
            // Don't throw - vector processing is optional and happens async
          })
      } else {
        console.log('⏭️ Background: Skipping vector processing:', {
          reason: isTextDocument ? (!contentToSave.content ? 'no content' : 
                                    typeof contentToSave.content !== 'string' ? 'content not string' :
                                    contentToSave.content.trim().length === 0 ? 'empty content' : 'unknown') :
                  isImageDoc ? (!contentToSave.media_url && !contentToSave.storage_object_path ? 'no image URL' : 'unknown') :
                  'unsupported type'
        })
      }
      
      sendResponse({ success: true, id })
    } catch (error) {
      console.error('❌ Error saving content:', error)
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error,
        stack: error instanceof Error ? error.stack : undefined,
        data: data
      })
      sendResponse({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
    }
  }

  private handleInstallation(details: chrome.runtime.InstalledDetails) {
    if (details.reason === 'install') {
      console.log('NabuAI extension installed successfully!')
      
      // Open welcome page
      chrome.tabs.create({
        url: 'https://nabu-ai.com/welcome'
      })
    } else if (details.reason === 'update') {
      console.log('NabuAI extension updated!')
    }
  }
}

// Initialize background service
new BackgroundService()
