// Content script for handling text selection and media interactions
// @ts-ignore - Readability has no DOM types for TS in this context
import { Readability } from '@mozilla/readability'

class ContentScript {
  private selectedText = ''
  private isListening = false

  constructor() {
    this.init()
  }

  private init() {
    // Listen for text selection
    document.addEventListener('mouseup', this.handleTextSelection.bind(this))
    
    // Context menu for images/videos is handled by background script
    // No need to intercept right-click - let the browser context menu appear
    
    // Listen for messages from background script and popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'getSelectedText') {
        sendResponse({ text: this.selectedText })
        return false // Synchronous response
      } else if (request.action === 'getReadableArticle') {
        // Handle async response - must return true
        (async () => {
          try {
            // Use a timeout to prevent hanging on complex pages
            let timeoutCleared = false
            const parseTimeout = setTimeout(() => {
              if (!timeoutCleared) {
                sendResponse({ ok: false, error: 'Readability parse timeout' })
              }
            }, 4000) // 4 second timeout
            
            try {
              // Build a detached document so Readability cannot mutate the live page
              const html = document.documentElement.outerHTML
              
              // Limit HTML size to avoid memory issues (max 2MB)
              const limitedHtml = html.length > 2000000 ? html.substring(0, 2000000) : html
              
              const detached = document.implementation.createHTMLDocument('readability')
              detached.documentElement.innerHTML = limitedHtml
              // Preserve base URL for relative links/resources
              const base = detached.createElement('base')
              base.href = document.baseURI
              detached.head ? detached.head.prepend(base) : detached.documentElement.prepend(base)

              const reader = new Readability(detached as Document, {
                maxElemsToParse: 1000, // Limit elements to parse for speed
                nbTopCandidates: 5 // Limit candidates
              })
              const article = reader.parse()
              
              timeoutCleared = true
              clearTimeout(parseTimeout)
              
              console.log('📄 Readability parse result:', {
                hasArticle: !!article,
                hasTextContent: !!(article?.textContent),
                textContentLength: article?.textContent?.length || 0,
                title: article?.title || 'No title'
              })
              
              if (article && article.textContent && article.textContent.trim().length > 0) {
                // Limit text content size (max 500KB)
                let textContent = article.textContent || ''
                if (textContent.length > 500000) {
                  textContent = textContent.substring(0, 500000)
                }
                
                sendResponse({
                  ok: true,
                  article: {
                    title: article.title,
                    byline: article.byline,
                    content: article.content, // sanitized HTML
                    textContent: textContent,
                    length: article.length,
                    excerpt: article.excerpt,
                    siteName: (document as any).siteName || document.title
                  }
                })
              } else {
                // Readability failed or returned empty content, try fallback extraction
                console.warn('⚠️ Readability returned empty content, trying fallback extraction')
                const fallbackContent = this.extractFallbackContent()
                
                if (fallbackContent.textContent && fallbackContent.textContent.trim().length > 0) {
                  sendResponse({
                    ok: true,
                    article: {
                      title: fallbackContent.title,
                      byline: '',
                      content: fallbackContent.htmlContent || '',
                      textContent: fallbackContent.textContent,
                      length: fallbackContent.textContent.length,
                      excerpt: fallbackContent.textContent.substring(0, 200),
                      siteName: document.title
                    }
                  })
                } else {
                  // Last resort: try to extract any text from the page
                  console.warn('⚠️ Fallback extraction also failed, trying last resort extraction')
                  const lastResortContent = this.extractLastResortContent()
                  
                  if (lastResortContent.textContent && lastResortContent.textContent.trim().length > 0) {
                    sendResponse({
                      ok: true,
                      article: {
                        title: lastResortContent.title,
                        byline: '',
                        content: '',
                        textContent: lastResortContent.textContent,
                        length: lastResortContent.textContent.length,
                        excerpt: lastResortContent.textContent.substring(0, 200),
                        siteName: document.title
                      }
                    })
                  } else {
                    sendResponse({ ok: false, error: 'Article parse returned null and all extraction methods found no content' })
                  }
                }
              }
            } catch (parseError: any) {
              timeoutCleared = true
              clearTimeout(parseTimeout)
              sendResponse({ ok: false, error: parseError?.message || 'Failed to parse article' })
            }
          } catch (e: any) {
            sendResponse({ ok: false, error: e?.message || 'Failed to parse article' })
          }
        })()
        
        return true // Indicates we will send a response asynchronously
      }
      return false
    })
  }

  private handleTextSelection(event: MouseEvent) {
    const selection = window.getSelection()
    if (selection && selection.toString().trim()) {
      this.selectedText = selection.toString().trim()
      
      // Only show context menu if we have meaningful text
      if (this.selectedText.length > 0) {
        this.isListening = true
        // Small delay to ensure selection is complete
        setTimeout(() => {
          this.isListening = false
        }, 100)
      }
    }
  }

  // Removed handleMediaRightClick - context menu is now handled by background script
  // The browser's default context menu will appear, and when user clicks "Save Image to NabuAI"
  // from the context menu, the background script will show the modal

  // Method to check if text is currently selected
  public hasTextSelected(): boolean {
    const selection = window.getSelection()
    return !!(selection && selection.toString().trim())
  }

  // Method to get currently selected text
  public getSelectedText(): string {
    return this.selectedText
  }

  // Fallback content extraction when Readability fails
  private extractFallbackContent(): { title: string; textContent: string; htmlContent?: string } {
    // Try common article/content selectors
    const selectors = [
      'article',
      '[role="article"]',
      'main article',
      '.article',
      '.post',
      '.entry-content',
      '.content',
      '.post-content',
      'main',
      '[role="main"]',
      '.main-content',
      '#content',
      '#main-content',
      '.article-body',
      '.article-content',
      '.story-body',
      '.post-body'
    ]

    let contentElement: HTMLElement | null = null
    let title = document.title

    // Try to find article title
    const titleSelectors = [
      'h1.article-title',
      'h1.post-title',
      'article h1',
      'main h1',
      '.article-title',
      '.post-title',
      '.entry-title',
      'h1'
    ]

    for (const selector of titleSelectors) {
      const titleEl = document.querySelector(selector)
      if (titleEl && titleEl.textContent && titleEl.textContent.trim().length > 0) {
        title = titleEl.textContent.trim()
        break
      }
    }

    // Try to find main content element
    for (const selector of selectors) {
      const element = document.querySelector(selector) as HTMLElement
      if (element) {
        // Check if it has meaningful content (at least 100 characters)
        const text = element.innerText || element.textContent || ''
        if (text.trim().length > 100) {
          contentElement = element
          break
        }
      }
    }

    // If no specific content element found, try body
    if (!contentElement) {
      // Remove script, style, nav, header, footer, aside elements
      const bodyClone = document.body.cloneNode(true) as HTMLElement
      const elementsToRemove = bodyClone.querySelectorAll('script, style, nav, header, footer, aside, .nav, .navigation, .header, .footer, .sidebar, .ad, .advertisement, .ads')
      elementsToRemove.forEach(el => el.remove())

      const bodyText = bodyClone.innerText || bodyClone.textContent || ''
      if (bodyText.trim().length > 100) {
        contentElement = bodyClone
      }
    }

    if (contentElement) {
      const textContent = (contentElement.innerText || contentElement.textContent || '').trim()
      const htmlContent = contentElement.innerHTML || ''

      // Limit content size (max 500KB)
      const limitedText = textContent.length > 500000 
        ? textContent.substring(0, 500000) 
        : textContent

      return {
        title: title || document.title,
        textContent: limitedText,
        htmlContent: htmlContent.length > 1000000 ? htmlContent.substring(0, 1000000) : htmlContent
      }
    }

    // Last resort: get all text from body
    const bodyText = document.body.innerText || document.body.textContent || ''
    return {
      title: title || document.title,
      textContent: bodyText.trim().substring(0, 500000) // Limit to 500KB
    }
  }

  // Last resort content extraction - extract any visible text
  private extractLastResortContent(): { title: string; textContent: string } {
    // Get title
    let title = document.title
    const h1 = document.querySelector('h1')
    if (h1 && h1.textContent) {
      title = h1.textContent.trim()
    }

    // Get all visible text from body, excluding scripts, styles, etc.
    const bodyClone = document.body.cloneNode(true) as HTMLElement
    
    // Remove unwanted elements
    const unwantedSelectors = [
      'script', 'style', 'nav', 'header', 'footer', 'aside',
      '.nav', '.navigation', '.header', '.footer', '.sidebar',
      '.ad', '.advertisement', '.ads', '.social', '.share',
      '.menu', '.navbar', '.cookie', '.popup', '.modal',
      '[role="navigation"]', '[role="banner"]', '[role="complementary"]',
      '[role="contentinfo"]'
    ]
    
    unwantedSelectors.forEach(selector => {
      try {
        bodyClone.querySelectorAll(selector).forEach(el => el.remove())
      } catch (e) {
        // Ignore selector errors
      }
    })

    // Get text content
    const textContent = (bodyClone.innerText || bodyClone.textContent || '').trim()
    
    // Clean up whitespace
    const cleanedText = textContent
      .replace(/\n{3,}/g, '\n\n') // Replace 3+ newlines with 2
      .replace(/[ \t]{2,}/g, ' ') // Replace multiple spaces with single space
      .trim()

    return {
      title: title || document.title || 'Untitled Page',
      textContent: cleanedText.substring(0, 500000) // Limit to 500KB
    }
  }
}

// Initialize content script
const contentScript: ContentScript = new ContentScript();

// Expose methods for external access
(window as any).nabuContentScript = contentScript;
