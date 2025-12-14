import { createApp } from 'vue'
import PDFViewerV2 from './PDFViewerV2.vue'

// Get PDF URL from URL parameters
const urlParams = new URLSearchParams(window.location.search)
const pdfUrl = urlParams.get('url') || urlParams.get('pdf')
const sourceUrl = urlParams.get('source') || document.referrer

if (!pdfUrl) {
  const currentUrl = window.location.href
  console.error('❌ No PDF URL provided. Current URL:', currentUrl)
  console.error('❌ URL parameters:', window.location.search)
  
  document.body.innerHTML = `
    <div style="
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      background: #1a1a1a;
      color: #e0e0e0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 20px;
      text-align: center;
    ">
      <h2 style="margin-bottom: 16px;">No PDF URL provided</h2>
      <p style="margin-bottom: 8px;">Please provide a PDF URL in the query parameters.</p>
      <p style="font-size: 12px; color: #888; margin-top: 8px;">
        Expected format: ?url=https://example.com/file.pdf
      </p>
      <p style="font-size: 11px; color: #666; margin-top: 16px;">
        Current URL: ${currentUrl}
      </p>
    </div>
  `
} else {
  // Create Vue app
  const app = createApp(PDFViewerV2, {
    pdfUrl,
    sourceUrl
  })
  
  app.mount('#app')
}

