// PDF Viewer using PDF.js with text layer support
import * as pdfjsLib from 'pdfjs-dist';

// Set worker path to the bundled worker file
pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('pdf.worker.min.mjs');

class PDFViewer {
  constructor() {
    this.pdfUrl = null;
    this.sourceUrl = null;
    this.filename = null;
    this.pdfDocument = null;
    this.scale = 1.5;
    this.scribes = [];
    this.isLoadingScribes = false;
    this.scribeLoadError = '';
    this.selectedScribeId = '';
    
    // Initialize
    this.init();
  }
  
  async init() {
    console.log('🚀 Initializing PDF.js viewer...');
    console.log('✅ PDF.js loaded from local package');
    
    // Get PDF URL from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    this.pdfUrl = urlParams.get('url');
    this.sourceUrl = urlParams.get('source') || document.referrer;
    
    if (!this.pdfUrl) {
      this.showError('No PDF URL provided');
      return;
    }
    
    console.log('📄 PDF URL:', this.pdfUrl);
    console.log('🔗 Source URL:', this.sourceUrl);
    
    // Extract filename from URL
    this.filename = this.extractFilename(this.pdfUrl);
    
    // Update UI
    this.updateUI();
    
    // Load PDF
    await this.loadPDF();
    
    // Setup event listeners
    this.setupEventListeners();

    // Load scribes for modal selection
    this.loadScribes();
  }
  
  extractFilename(url) {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const parts = pathname.split('/');
      let filename = parts[parts.length - 1];
      filename = filename.split('?')[0];
      return filename || 'document.pdf';
    } catch (e) {
      console.error('Error extracting filename:', e);
      return 'document.pdf';
    }
  }
  
  updateUI() {
    const filenameElement = document.getElementById('pdf-filename');
    if (filenameElement) {
      filenameElement.textContent = this.filename;
    }
  }
  
  async loadPDF() {
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const container = document.getElementById('pdf-container');
    
    console.log('📥 Loading PDF with PDF.js...');
    
    // Show loading state
    if (loading) loading.style.display = 'flex';
    if (error) error.style.display = 'none';
    if (container) container.innerHTML = '';
    
    try {
      // Fetch PDF as array buffer
      console.log('📥 Fetching PDF:', this.pdfUrl);
      const response = await fetch(this.pdfUrl, {
        mode: 'cors',
        credentials: 'omit'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      console.log('✅ PDF downloaded, size:', arrayBuffer.byteLength, 'bytes');
      
      // Load PDF with PDF.js
      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer
      });
      
      this.pdfDocument = await loadingTask.promise;
      console.log('✅ PDF loaded, pages:', this.pdfDocument.numPages);
      
      // Hide loading
      if (loading) loading.style.display = 'none';
      
      // Render all pages
      await this.renderAllPages();
      
    } catch (err) {
      console.error('❌ Error loading PDF:', err);
      if (loading) loading.style.display = 'none';
      if (error) {
        error.style.display = 'flex';
        const errorText = error.querySelector('p');
        if (errorText) {
          errorText.textContent = `Failed to load PDF: ${err.message}`;
        }
      }
    }
  }
  
  async renderAllPages() {
    const container = document.getElementById('pdf-container');
    if (!container || !this.pdfDocument) return;
    
    console.log('🎨 Rendering all pages...');
    
    for (let pageNum = 1; pageNum <= this.pdfDocument.numPages; pageNum++) {
      await this.renderPage(pageNum, container);
    }
    
    console.log('✅ All pages rendered');
  }
  
  async renderPage(pageNum, container) {
    try {
      const page = await this.pdfDocument.getPage(pageNum);
      const viewport = page.getViewport({ scale: this.scale });
      
      // Account for device pixel ratio (important for Retina/high-DPI displays)
      const dpr = window.devicePixelRatio || 1;
      
      // Create page container
      const pageContainer = document.createElement('div');
      pageContainer.className = 'page-container';
      pageContainer.style.width = viewport.width + 'px';
      pageContainer.style.height = viewport.height + 'px';
      
      // Create canvas for PDF rendering
      const canvas = document.createElement('canvas');
      canvas.className = 'pdf-page-canvas';
      const context = canvas.getContext('2d');
      
      // Set canvas size accounting for device pixel ratio
      canvas.height = viewport.height * dpr;
      canvas.width = viewport.width * dpr;
      canvas.style.height = viewport.height + 'px';
      canvas.style.width = viewport.width + 'px';
      
      // Scale the canvas context
      context.scale(dpr, dpr);
      
      // Render PDF page to canvas
      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };
      
      await page.render(renderContext).promise;
      
      // Create text layer for text selection
      const textLayerDiv = document.createElement('div');
      textLayerDiv.className = 'textLayer';
      textLayerDiv.style.width = viewport.width + 'px';
      textLayerDiv.style.height = viewport.height + 'px';
      
      // Get text content
      const textContent = await page.getTextContent();
      
      // Create text layer using PDF.js's internal text layer rendering
      const textDivs = [];
      
      textContent.items.forEach((item) => {
        if (!item.str || item.str.trim() === '') return;
        
        const textDiv = document.createElement('span');
        
        // Calculate transform matrix
        const transform = item.transform;
        const fontHeight = Math.abs(transform[3]);
        const fontWidth = Math.abs(transform[0]);
        
        // PDF coordinates to CSS coordinates
        // PDF has Y=0 at bottom, CSS has Y=0 at top
        // transform[5] is the baseline Y position in PDF coordinates
        const x = transform[4];
        const y = viewport.height - transform[5];
        
        // Debug logging for first few items
        if (textDivs.length < 5) {
          console.log('Text item:', {
            str: item.str,
            transform: transform,
            x: x,
            y: y,
            fontHeight: fontHeight,
            viewportHeight: viewport.height
          });
        }
        
        // Set position and size
        textDiv.style.position = 'absolute';
        textDiv.style.left = x + 'px';
        textDiv.style.top = y + 'px';
        textDiv.style.fontSize = fontHeight + 'px';
        textDiv.style.fontFamily = 'sans-serif';
        textDiv.style.lineHeight = '1';
        textDiv.style.whiteSpace = 'pre';
        textDiv.style.color = 'transparent';
        textDiv.style.cursor = 'text';
        
        // Handle text scaling and rotation
        let transformStr = '';
        if (transform[0] < 0) transformStr += 'scaleX(-1) ';
        if (transform[3] < 0) transformStr += 'scaleY(-1) ';
        if (transformStr) {
          textDiv.style.transform = transformStr.trim();
        }
        
        // Set text content
        textDiv.textContent = item.str;
        
        // Store for PDF.js compatibility
        textDivs.push(textDiv);
        textLayerDiv.appendChild(textDiv);
      });
      
      // Try to use PDF.js renderTextLayer if available
      try {
        if (pdfjsLib.renderTextLayer) {
          pdfjsLib.renderTextLayer({
            textContentSource: textContent,
            container: textLayerDiv,
            viewport: viewport,
            textDivs: textDivs
          });
        }
      } catch (e) {
        console.log('Using manual text layer rendering');
      }
      
      // Append canvas and text layer to page container
      pageContainer.appendChild(canvas);
      pageContainer.appendChild(textLayerDiv);
      
      // Append page container to main container
      container.appendChild(pageContainer);
      
      console.log(`✅ Page ${pageNum} rendered`);
      
    } catch (error) {
      console.error(`❌ Error rendering page ${pageNum}:`, error);
    }
  }
  
  setupEventListeners() {
    // Open original button
    const openOriginalBtn = document.getElementById('open-original');
    if (openOriginalBtn) {
      openOriginalBtn.addEventListener('click', () => {
        window.open(this.pdfUrl, '_blank');
      });
    }

    // Save to NabuAI button
    const saveToNabuAIBtn = document.getElementById('save-to-nabuai');
    if (saveToNabuAIBtn) {
      saveToNabuAIBtn.addEventListener('click', () => {
        this.showSaveModal();
      });
    }
    
    // Zoom with scroll wheel (Ctrl+Scroll or Cmd+Scroll)
    const pdfViewer = document.querySelector('.pdf-viewer');
    if (pdfViewer) {
      pdfViewer.addEventListener('wheel', async (e) => {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          const delta = e.deltaY > 0 ? -0.1 : 0.1;
          const newScale = Math.max(0.5, Math.min(3.0, this.scale + delta));
          
          if (newScale !== this.scale) {
            this.scale = newScale;
            console.log(`🔍 Zoom: ${Math.round(this.scale * 100)}%`);
            await this.reloadPDF();
          }
        }
      }, { passive: false });
    }
    
    // Save modal event listeners
    this.setupSaveModalListeners();
  }
  
  async reloadPDF() {
    const container = document.getElementById('pdf-container');
    if (container) {
      container.innerHTML = '';
    }
    await this.renderAllPages();
  }
  
  showSaveModal() {
    const modal = document.getElementById('save-modal');
    const pdfFileDisplay = document.getElementById('pdf-file-display');
    const pdfUrlDisplay = document.getElementById('pdf-url-display');
    const sourcePageDisplay = document.getElementById('source-page-display');
    const pdfTitle = document.getElementById('pdf-title');
    
    if (pdfFileDisplay) {
      pdfFileDisplay.textContent = this.filename;
    }
    
    if (pdfUrlDisplay) {
      pdfUrlDisplay.textContent = this.pdfUrl;
    }
    
    if (sourcePageDisplay) {
      sourcePageDisplay.textContent = this.sourceUrl || 'Unknown';
    }
    
    if (pdfTitle) {
      pdfTitle.value = this.filename.replace('.pdf', '');
    }
    
    if (modal) {
      modal.classList.add('show');
    }

    this.populateScribeSelect();
  }
  
  hideSaveModal() {
    const modal = document.getElementById('save-modal');
    if (modal) {
      modal.classList.remove('show');
    }
  }
  
  setupSaveModalListeners() {
    const modal = document.getElementById('save-modal');
    const closeBtn = document.getElementById('close-modal');
    const cancelBtn = document.getElementById('cancel-save');
    const saveBtn = document.getElementById('save-pdf-btn');
    
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.hideSaveModal();
      });
    }
    
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.hideSaveModal();
      });
    }
    
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.hideSaveModal();
        }
      });
    }
    
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        this.savePDF();
      });
    }
  }
  
  async savePDF() {
    const titleInput = document.getElementById('pdf-title');
    const scribeSelect = document.getElementById('pdf-scribe-select');
    const newScribeInput = document.getElementById('pdf-new-scribe');
    
    const title = titleInput ? titleInput.value.trim() : this.filename;
    const selectedScribeValue = scribeSelect ? scribeSelect.value : '';
    const newScribeName = newScribeInput ? newScribeInput.value.trim() : '';
    let scribeId = '';
    let scribeName = '';
    
    if (selectedScribeValue === '__new__') {
      if (!newScribeName) {
        alert('Please enter a name for the new scribe.');
        return;
      }
      scribeName = newScribeName;
    } else if (selectedScribeValue && selectedScribeValue !== '__new__') {
      scribeId = selectedScribeValue;
    }
    
    if (!title) {
      alert('Please enter a title for the PDF');
      return;
    }
    
    console.log('💾 Saving PDF to NabuAI:', { title, tags, url: this.pdfUrl });
    
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'saveContent',
        data: {
          type: 'pdf',
          title: title,
          url: this.sourceUrl || this.pdfUrl,
          content: this.pdfUrl,
        scribeId,
        scribeName,
          notes: `PDF: ${this.filename}`,
          timestamp: new Date().toISOString()
        }
      });
      
      if (response && response.success) {
        this.showSaveSuccess();
      } else {
        throw new Error(response?.error || 'Failed to save PDF');
      }
      
    } catch (error) {
      console.error('❌ Error saving PDF:', error);
      alert('Failed to save PDF: ' + error.message);
    }
  }
  
  showSaveSuccess() {
    const modalBody = document.getElementById('modal-body');
    if (modalBody) {
      modalBody.innerHTML = `
        <div class="success-message">
          <div class="success-icon">
            <svg width="32" height="32" fill="#16a34a" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
            </svg>
          </div>
          <h3 class="success-title">PDF Saved Successfully!</h3>
          <p class="success-text">The PDF has been added to your NabuAI knowledge base.</p>
          <div class="modal-actions">
            <button class="btn btn-primary" onclick="this.closest('.save-modal').classList.remove('show')">Close</button>
          </div>
        </div>
      `;
    }
  }

  showError(message) {
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    if (loading) loading.style.display = 'none';
    if (error) {
      error.style.display = 'flex';
      const errorText = error.querySelector('p');
      if (errorText) {
        errorText.textContent = message;
      }
    }
  }

  async loadScribes() {
    try {
      this.isLoadingScribes = true;
      this.scribeLoadError = '';
      const response = await chrome.runtime.sendMessage({ action: 'getUserScribes' });
      if (response?.success) {
        this.scribes = response.scribes || [];
      } else {
        throw new Error(response?.error || 'Failed to load scribes');
      }
    } catch (error) {
      console.error('❌ Failed to load scribes:', error);
      this.scribes = [];
      this.scribeLoadError = error instanceof Error ? error.message : 'Failed to load scribes';
    } finally {
      this.isLoadingScribes = false;
      this.populateScribeSelect();
    }
  }

  populateScribeSelect() {
    const select = document.getElementById('pdf-scribe-select');
    const helper = document.getElementById('scribe-helper-text');
    const newScribeRow = document.getElementById('new-scribe-row');
    if (!select) return;

    select.innerHTML = '';

    if (this.isLoadingScribes) {
      const loadingOpt = document.createElement('option');
      loadingOpt.value = '';
      loadingOpt.textContent = 'Loading scribes...';
      loadingOpt.disabled = true;
      select.appendChild(loadingOpt);
      select.disabled = true;
      if (helper) helper.textContent = 'Fetching your scribes...';
      if (newScribeRow) newScribeRow.style.display = 'none';
      return;
    }

    select.disabled = false;

    const noneOpt = document.createElement('option');
    noneOpt.value = '';
    noneOpt.textContent = 'No scribe';
    select.appendChild(noneOpt);

    const newOpt = document.createElement('option');
    newOpt.value = '__new__';
    newOpt.textContent = '➕ Create new scribe';
    select.appendChild(newOpt);

    (this.scribes || []).forEach((scribe) => {
      const opt = document.createElement('option');
      opt.value = scribe.id;
      opt.textContent = scribe.name || 'Untitled';
      select.appendChild(opt);
    });

    if (!select.dataset.bound) {
      select.addEventListener('change', () => this.handleScribeChange());
      select.dataset.bound = 'true';
    }

    this.handleScribeChange();

    if (helper) {
      if (this.scribeLoadError) {
        helper.textContent = this.scribeLoadError;
      } else if (!this.scribes.length) {
        helper.textContent = 'No scribes yet. Choose "Create new scribe" to add one.';
      } else {
        helper.textContent = 'Choose an existing scribe or create a new one.';
      }
    }
  }

  handleScribeChange() {
    const select = document.getElementById('pdf-scribe-select');
    const newScribeRow = document.getElementById('new-scribe-row');
    const newScribeInput = document.getElementById('pdf-new-scribe');
    if (!select) return;

    const value = select.value;
    if (value === '__new__') {
      if (newScribeRow) newScribeRow.style.display = 'block';
      this.selectedScribeId = '';
    } else {
      if (newScribeRow) newScribeRow.style.display = 'none';
      if (newScribeInput) newScribeInput.value = '';
      this.selectedScribeId = value || '';
    }
  }
}

// Initialize PDF viewer when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 DOM loaded, initializing PDF viewer...');
  new PDFViewer();
});
