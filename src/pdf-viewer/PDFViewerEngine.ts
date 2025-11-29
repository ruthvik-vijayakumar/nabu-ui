import type { 
  PDFViewerConfig, 
  Annotation, 
  Tool, 
  Color, 
  TextItem, 
  HighlightAnnotation, 
  NoteAnnotation, 
  DrawingAnnotation, 
  NoteRequestContext 
} from './types'

type PointerPosition = {
  pageNumber: number
  offsetX: number
  offsetY: number
  pageWidth: number
  pageHeight: number
}

export class PDFViewerEngine {
  private config: PDFViewerConfig
  private pdfDocument: any = null
  private currentPage = 1
  private totalPages = 0
  private scale = 1.0
  private renderedPages = new Map()
  private annotations = new Map<number, Annotation[]>()
  private textContent = new Map<number, TextItem[]>()
  private pageLayers = new Map<number, HTMLElement>()
  private currentTool: Tool = 'select'
  private currentColor: Color = 'yellow'
  private tempHighlight: HighlightAnnotation | null = null
  private tempHighlightElement: HTMLDivElement | null = null
  private isDrawing = false
  private drawingPath: Array<{ x: number; y: number }> = []
  private activeDrawingPage: number | null = null
  private drawingViewport = { width: 0, height: 0 }
  private drawingSvg: SVGSVGElement | null = null
  private drawingPathElement: SVGPathElement | null = null
  private textSelection: {
    start: { x: number; y: number }
    end: { x: number; y: number }
    page: number
    pageWidth: number
    pageHeight: number
  } | null = null
  private textSelectionOverlay: HTMLDivElement | null = null
  private isSelectingText = false
  private windowMouseUpHandler: (() => void) | null = null

  constructor(config: PDFViewerConfig) {
    this.config = config
  }

  async init() {
    console.log('🚀 Initializing PDF.js viewer...')
    
    // Configure PDF.js worker
    if (typeof (window as any).pdfjsLib !== 'undefined') {
      (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('lib/pdf.worker.min.js')
      console.log('✅ PDF.js worker configured')
    } else {
      console.error('❌ PDF.js library not loaded')
      this.config.onError?.('PDF.js library failed to load')
      return
    }

    this.config.onFilenameChange?.(this.extractFilename(this.config.pdfUrl))
    this.config.onLoadingChange?.(true)

    await this.loadPDF()
    this.setupEventListeners()
  }

  private extractFilename(url: string): string {
    try {
      const urlObj = new URL(url)
      const pathname = urlObj.pathname
      const parts = pathname.split('/')
      let filename = parts[parts.length - 1]
      filename = filename.split('?')[0]
      return filename || 'document.pdf'
    } catch (e) {
      console.error('Error extracting filename:', e)
      return 'document.pdf'
    }
  }

  private async loadPDF() {
    try {
      console.log('📥 Loading PDF with PDF.js...')
      
      const response = await fetch(this.config.pdfUrl, {
        mode: 'cors',
        credentials: 'omit'
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const arrayBuffer = await response.arrayBuffer()
      console.log('✅ PDF downloaded successfully, size:', arrayBuffer.byteLength, 'bytes')
      
      const loadingTask = (window as any).pdfjsLib.getDocument({
        data: arrayBuffer,
        cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
        cMapPacked: true
      })
      
      this.pdfDocument = await loadingTask.promise
      this.totalPages = this.pdfDocument.numPages
      
      console.log('✅ PDF loaded with PDF.js, pages:', this.totalPages)
      
      this.config.onLoadingChange?.(false)
      this.config.onPageChange?.(this.currentPage, this.totalPages)
      
      await this.renderPage(1)
      
    } catch (error) {
      console.error('❌ Error loading PDF:', error)
      this.config.onError?.(`Failed to load PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async renderPage(pageNum: number) {
    if (!this.pdfDocument) return
    
    console.log(`🎨 Rendering page ${pageNum}...`)
    
    try {
      const page = await this.pdfDocument.getPage(pageNum)
      const viewport = page.getViewport({ scale: this.scale })
      const container = document.getElementById('pdf-canvas-container')
      if (!container) return

      let pageWrapper = document.getElementById(`pdf-page-wrapper-${pageNum}`) as HTMLElement | null
      if (!pageWrapper) {
        pageWrapper = document.createElement('div')
        pageWrapper.id = `pdf-page-wrapper-${pageNum}`
        pageWrapper.className = 'pdf-page-wrapper'
        pageWrapper.dataset.pageNumber = pageNum.toString()
        container.appendChild(pageWrapper)
      }

      pageWrapper.style.width = `${viewport.width}px`
      pageWrapper.style.height = `${viewport.height}px`

      // Ensure proper element order: canvas -> textLayer -> annotationLayer
      let canvas = pageWrapper.querySelector('canvas.pdf-canvas') as HTMLCanvasElement | null
      if (!canvas) {
        canvas = document.createElement('canvas')
        canvas.id = `pdf-page-${pageNum}`
        canvas.className = 'pdf-canvas'
        pageWrapper.appendChild(canvas)
      }

        canvas.width = viewport.width
        canvas.height = viewport.height
        
      // Create or update text layer for native text selection
      let textLayer = pageWrapper.querySelector('.textLayer') as HTMLElement | null
      if (!textLayer) {
        textLayer = document.createElement('div')
        textLayer.className = 'textLayer'
        // Insert text layer right after canvas
        canvas.parentNode?.insertBefore(textLayer, canvas.nextSibling)
      }

      textLayer.style.width = `${viewport.width}px`
      textLayer.style.height = `${viewport.height}px`

      let annotationLayer = pageWrapper.querySelector('.page-annotation-layer') as HTMLElement | null
      if (!annotationLayer) {
        annotationLayer = document.createElement('div')
        annotationLayer.className = 'page-annotation-layer'
        // Insert annotation layer after text layer (or after canvas if no text layer)
        const insertAfter = textLayer || canvas
        insertAfter.parentNode?.insertBefore(annotationLayer, insertAfter.nextSibling)
      }

      annotationLayer.style.width = `${viewport.width}px`
      annotationLayer.style.height = `${viewport.height}px`
      this.pageLayers.set(pageNum, annotationLayer)
      
      const context = canvas.getContext('2d')
      if (!context) return
      
      const renderContext = {
        canvasContext: context,
        viewport: viewport
      }
      
      await page.render(renderContext).promise
      
      // Render text layer for native text selection
      await this.renderTextLayer(page, textLayer, viewport)
      
      await this.extractTextContent(page, pageNum, viewport)
      
      // Apply interactivity after text layer is rendered
      this.applyLayerInteractivity(annotationLayer)
      
      console.log(`✅ Page ${pageNum} rendered successfully`)
      
      this.renderedPages.set(pageNum, {
        canvas: canvas,
        viewport: viewport
      })
      this.renderAnnotationsForPage(pageNum)
      
    } catch (error) {
      console.error(`❌ Error rendering page ${pageNum}:`, error)
    }
  }

  private async renderTextLayer(page: any, textLayerDiv: HTMLElement, viewport: any) {
    try {
      // Clear existing text layer
      textLayerDiv.innerHTML = ''
      
      const textContent = await page.getTextContent()
      const pdfjsLib = (window as any).pdfjsLib
      
      // Try to use PDF.js renderTextLayer if available
      if (pdfjsLib && pdfjsLib.renderTextLayer) {
        try {
          const textDivs: HTMLElement[] = []
          await pdfjsLib.renderTextLayer({
            textContentSource: textContent,
            container: textLayerDiv,
            viewport: viewport,
            textDivs: textDivs
          }).promise
          console.log(`✅ Text layer rendered using PDF.js renderTextLayer`)
          return
        } catch (e) {
          console.warn('PDF.js renderTextLayer failed, using manual rendering', e)
        }
      }
      
      // Fallback to manual text layer rendering
      this.manualTextLayer(textContent, textLayerDiv, viewport)
      
    } catch (error) {
      console.error('❌ Error rendering text layer:', error)
    }
  }

  private manualTextLayer(textContent: any, textLayerDiv: HTMLElement, viewport: any) {
    const pdfjsLib = (window as any).pdfjsLib
    
    textContent.items.forEach((item: any) => {
      if (!item.str?.trim()) return
      
      const textDiv = document.createElement('span')
      textDiv.textContent = item.str
      textDiv.className = 'textLayer-item'
      
      // Use PDF.js transform utility if available
      if (pdfjsLib && pdfjsLib.Util && pdfjsLib.Util.transform) {
        const transform = pdfjsLib.Util.transform(viewport.transform, item.transform)
        const fontHeight = Math.abs(transform[3])
        const fontWidth = Math.abs(transform[0])
        
        textDiv.style.position = 'absolute'
        textDiv.style.fontSize = `${fontHeight}px`
        textDiv.style.transform = `matrix(${transform[0]}, ${transform[1]}, ${transform[2]}, ${transform[3]}, ${transform[4]}, ${transform[5]})`
        textDiv.style.transformOrigin = '0% 0%'
        textDiv.style.height = `${fontHeight}px`
        textDiv.style.width = `${fontWidth}px`
        textDiv.style.left = '0'
        textDiv.style.top = '0'
      } else {
        // Fallback manual positioning
        const transform = item.transform
        const x = transform[4]
        const y = viewport.height - transform[5] - item.height
        
        textDiv.style.position = 'absolute'
        textDiv.style.left = `${x}px`
        textDiv.style.top = `${y}px`
        textDiv.style.fontSize = `${item.height}px`
        textDiv.style.width = `${item.width}px`
        textDiv.style.height = `${item.height}px`
      }
      
      textLayerDiv.appendChild(textDiv)
    })
    
    const renderedItems = textLayerDiv.querySelectorAll('.textLayer-item').length
    console.log(`✅ Text layer rendered manually with ${renderedItems} items (from ${textContent.items.length} total items)`)
  }

  private async extractTextContent(page: any, pageNum: number, viewport: any) {
    try {
      const textContent = await page.getTextContent()
      const textItems = textContent.items.map((item: any) => {
        const transform = item.transform
        const x = transform[4]
        const y = viewport.height - transform[5] - item.height
        
        return {
          text: item.str,
          x: x,
          y: y,
          width: item.width,
          height: item.height,
          fontName: item.fontName,
          fontSize: item.height
        }
      })
      
      this.textContent.set(pageNum, textItems)
      console.log(`📝 Extracted ${textItems.length} text items from page ${pageNum}`)
      
    } catch (error) {
      console.error(`❌ Error extracting text from page ${pageNum}:`, error)
    }
  }

  async goToPage(pageNum: number) {
    if (pageNum < 1 || pageNum > this.totalPages) return
    
    this.currentPage = pageNum
    this.config.onPageChange?.(this.currentPage, this.totalPages)
    
    if (!this.renderedPages.has(pageNum)) {
      await this.renderPage(pageNum)
    }
    
    const canvas = document.getElementById(`pdf-page-${pageNum}`)
    if (canvas) {
      canvas.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  async changeZoom(newScale: number) {
    const minScale = 0.5
    const maxScale = 3.0
    
    this.scale = Math.max(minScale, Math.min(maxScale, newScale))
    
    console.log(`🔍 Zoom changed to ${Math.round(this.scale * 100)}%`)
    
    await this.renderAllPages()
  }

  private async renderAllPages() {
    if (!this.pdfDocument) return
    
    console.log('🎨 Rendering all pages...')
    
    const container = document.getElementById('pdf-canvas-container')
    if (container) {
      container.innerHTML = ''
    }
    this.renderedPages.clear()
    this.textContent.clear()
    this.pageLayers.clear()
    this.tempHighlightElement = null
    
    for (let pageNum = 1; pageNum <= this.totalPages; pageNum++) {
      await this.renderPage(pageNum)
    }
    
    console.log('✅ All pages rendered')
  }

  setTool(tool: Tool) {
    this.currentTool = tool
    this.updateLayerInteractivity()
    console.log(`🛠️ Tool changed to: ${tool}`)
  }

  private updateLayerInteractivity() {
    this.pageLayers.forEach(layer => this.applyLayerInteractivity(layer))
  }

  private applyLayerInteractivity(layer: HTMLElement) {
    const pageWrapper = layer.closest('.pdf-page-wrapper') as HTMLElement | null
    const textLayer = pageWrapper?.querySelector('.textLayer') as HTMLElement | null
    
    if (this.currentTool === 'select') {
      layer.classList.remove('active')
      layer.classList.add('select-mode')
      layer.style.pointerEvents = 'none'
      // Enable text selection when in select mode
      if (textLayer) {
        textLayer.style.pointerEvents = 'auto'
        textLayer.style.userSelect = 'text'
      }
      if (pageWrapper) {
        pageWrapper.classList.remove('annotation-mode')
      }
      } else {
      layer.classList.add('active')
      layer.classList.remove('select-mode')
      layer.style.pointerEvents = 'auto'
      // Disable text selection when annotation tools are active
      if (textLayer) {
        textLayer.style.pointerEvents = 'none'
        textLayer.style.userSelect = 'none'
      }
      if (pageWrapper) {
        pageWrapper.classList.add('annotation-mode')
      }
    }
  }

  setColor(color: Color) {
    this.currentColor = color
    console.log(`🎨 Color changed to: ${color}`)
  }

  private setupEventListeners() {
    const canvasContainer = document.getElementById('pdf-canvas-container')
    if (!canvasContainer) return

    canvasContainer.addEventListener('mousedown', (e) => this.handleMouseDown(e))
    canvasContainer.addEventListener('mousemove', (e) => this.handleMouseMove(e))
    
    this.windowMouseUpHandler = () => this.handleMouseUp()
    window.addEventListener('mouseup', this.windowMouseUpHandler)
    
    canvasContainer.addEventListener('selectstart', (e) => {
      if (this.currentTool !== 'select') {
        e.preventDefault()
      }
    })
  }

  private handleMouseDown(e: MouseEvent) {
    const position = this.getPointerPosition(e)
    if (!position) return
    
    if (this.currentTool === 'select') {
      this.startTextSelection(position)
      return
    }
    
    switch (this.currentTool) {
      case 'highlight':
        e.preventDefault()
        this.startHighlight(position)
        break
      case 'note':
        e.preventDefault()
        this.requestNote(position)
        break
      case 'draw':
        e.preventDefault()
        this.startDrawing(position)
        break
      case 'eraser':
        e.preventDefault()
        this.eraseAt(position)
        break
    }
  }

  private handleMouseMove(e: MouseEvent) {
    const position = this.getPointerPosition(e)
    if (!position) return
    
    if (this.currentTool === 'select' && this.isSelectingText) {
      this.updateTextSelection(position)
      return
    }
    
    if (this.isDrawing && this.activeDrawingPage === position.pageNumber) {
      this.continueDrawing(position)
    } else if (this.currentTool === 'highlight' && this.tempHighlight && this.tempHighlight.page === position.pageNumber) {
      this.updateHighlight(position)
    }
  }

  private handleMouseUp() {
    if (this.currentTool === 'select' && this.isSelectingText) {
      this.finishTextSelection()
      return
    }
    
    if (this.isDrawing) {
      this.finishDrawing()
    } else if (this.currentTool === 'highlight' && this.tempHighlight) {
      this.finishHighlight()
    }
  }

  private getPointerPosition(e: MouseEvent): PointerPosition | null {
    const target = e.target as HTMLElement | null
    let pageWrapper = target ? target.closest('.pdf-page-wrapper') as HTMLElement | null : null
    
    if (!pageWrapper) {
      const elementAtPoint = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null
      pageWrapper = elementAtPoint ? elementAtPoint.closest('.pdf-page-wrapper') as HTMLElement | null : null
    }
    
    if (!pageWrapper) return null
    
    const pageNumber = Number(pageWrapper.dataset.pageNumber)
    if (!pageNumber) return null
    
    const viewport = this.renderedPages.get(pageNumber)?.viewport
    if (!viewport) return null
    
    const rect = pageWrapper.getBoundingClientRect()
    const offsetX = e.clientX - rect.left
    const offsetY = e.clientY - rect.top
    
    if (offsetX < 0 || offsetY < 0 || offsetX > viewport.width || offsetY > viewport.height) {
      return null
    }
    
    return {
      pageNumber,
      offsetX,
      offsetY,
      pageWidth: viewport.width,
      pageHeight: viewport.height
    }
  }

  // Text selection methods
  private startTextSelection(position: PointerPosition) {
    this.isSelectingText = true
    this.textSelection = {
      start: { x: position.offsetX, y: position.offsetY },
      end: { x: position.offsetX, y: position.offsetY },
      page: position.pageNumber,
      pageWidth: position.pageWidth,
      pageHeight: position.pageHeight
    }
    
    this.clearTextSelection()
    this.renderTextSelection()
    console.log('📝 Started text selection')
  }

  private updateTextSelection(position: PointerPosition) {
    if (this.textSelection && this.textSelection.page === position.pageNumber) {
      this.textSelection.end = { x: position.offsetX, y: position.offsetY }
      this.renderTextSelection()
    }
  }

  private finishTextSelection() {
    if (this.textSelection) {
      const selectedText = this.getSelectedText()
      if (selectedText) {
        this.config.onTextSelected?.(selectedText)
        this.copyToClipboard(selectedText)
      }
      this.clearTextSelection()
    }
    this.isSelectingText = false
    this.textSelection = null
  }

  private getSelectedText(): string {
    if (!this.textSelection) return ''
    
    const textItems = this.textContent.get(this.textSelection.page) || []
    const start = this.textSelection.start
    const end = this.textSelection.end
    
    const left = Math.min(start.x, end.x)
    const right = Math.max(start.x, end.x)
    const top = Math.min(start.y, end.y)
    const bottom = Math.max(start.y, end.y)
    
    const selectedItems = textItems.filter(item => {
      return item.x < right && 
             item.x + item.width > left && 
             item.y < bottom && 
             item.y + item.height > top
    })
    
    selectedItems.sort((a, b) => {
      if (Math.abs(a.y - b.y) > 5) {
        return a.y - b.y
      }
      return a.x - b.x
    })
    
    let selectedText = ''
    let lastY = -Infinity
    
    selectedItems.forEach(item => {
      if (Math.abs(item.y - lastY) > 5) {
        if (selectedText) selectedText += '\n'
      } else {
        if (selectedText && !selectedText.endsWith('\n')) {
          selectedText += ' '
        }
      }
      selectedText += item.text
      lastY = item.y
    })
    
    return selectedText.trim()
  }

  private renderTextSelection() {
    if (!this.textSelection) return
    
    const layer = this.pageLayers.get(this.textSelection.page)
    if (!layer) return
    
    if (!this.textSelectionOverlay) {
      this.textSelectionOverlay = document.createElement('div')
      this.textSelectionOverlay.id = 'text-selection-overlay'
      this.textSelectionOverlay.style.cssText = `
        position: absolute;
        background: rgba(0, 123, 255, 0.25);
        border: 1px solid rgba(0, 123, 255, 0.5);
        pointer-events: none;
        z-index: 5;
      `
      }
    
    if (!layer.contains(this.textSelectionOverlay)) {
      layer.appendChild(this.textSelectionOverlay)
    }
    
    const start = this.textSelection.start
    const end = this.textSelection.end
    
    const left = Math.min(start.x, end.x)
    const top = Math.min(start.y, end.y)
    const width = Math.abs(end.x - start.x)
    const height = Math.abs(end.y - start.y)
    
    this.textSelectionOverlay.style.left = `${left}px`
    this.textSelectionOverlay.style.top = `${top}px`
    this.textSelectionOverlay.style.width = `${width}px`
    this.textSelectionOverlay.style.height = `${height}px`
    this.textSelectionOverlay.style.display = 'block'
  }

  private clearTextSelection() {
    if (this.textSelectionOverlay?.parentElement) {
      this.textSelectionOverlay.parentElement.removeChild(this.textSelectionOverlay)
    }
    this.textSelectionOverlay = null
  }

  private async copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      console.log('📋 Text copied to clipboard:', text)
    } catch (error) {
      console.error('❌ Failed to copy to clipboard:', error)
      this.fallbackCopyToClipboard(text)
    }
  }

  private fallbackCopyToClipboard(text: string) {
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    textArea.style.top = '-999999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    
    try {
      document.execCommand('copy')
      console.log('📋 Text copied to clipboard (fallback):', text)
    } catch (error) {
      console.error('❌ Fallback copy failed:', error)
    }
    
    document.body.removeChild(textArea)
  }

  // Annotation methods
  private startHighlight(position: PointerPosition) {
    this.tempHighlight = {
      type: 'highlight',
      start: { x: position.offsetX, y: position.offsetY },
      end: { x: position.offsetX, y: position.offsetY },
      color: this.currentColor,
      page: position.pageNumber,
      pageWidth: position.pageWidth,
      pageHeight: position.pageHeight,
      timestamp: new Date().toISOString()
    }
    this.renderTempHighlight()
  }

  private updateHighlight(position: PointerPosition) {
    if (this.tempHighlight && this.tempHighlight.page === position.pageNumber) {
      this.tempHighlight.end = { x: position.offsetX, y: position.offsetY }
      this.renderTempHighlight()
    }
  }

  private finishHighlight() {
    if (this.tempHighlight) {
      const { start, end } = this.tempHighlight
      const minSizeX = Math.abs(end.x - start.x)
      const minSizeY = Math.abs(end.y - start.y)
      
      if (minSizeX > 4 && minSizeY > 2) {
        this.addAnnotation({ ...this.tempHighlight })
      }
      
      this.clearTempHighlight()
      this.tempHighlight = null
    }
  }

  private renderTempHighlight() {
    if (!this.tempHighlight) return
    
    const layer = this.pageLayers.get(this.tempHighlight.page)
    if (!layer) return
    
    if (!this.tempHighlightElement) {
      this.tempHighlightElement = document.createElement('div')
      this.tempHighlightElement.className = 'highlight-annotation temp-highlight'
      this.tempHighlightElement.style.pointerEvents = 'none'
    }
    
    if (!layer.contains(this.tempHighlightElement)) {
      layer.appendChild(this.tempHighlightElement)
    }
    
    const { start, end, color } = this.tempHighlight
    const left = Math.min(start.x, end.x)
    const top = Math.min(start.y, end.y)
    const width = Math.abs(end.x - start.x)
    const height = Math.abs(end.y - start.y)
    const palette = this.getColorPreset(color)
    
    this.tempHighlightElement.style.left = `${left}px`
    this.tempHighlightElement.style.top = `${top}px`
    this.tempHighlightElement.style.width = `${width}px`
    this.tempHighlightElement.style.height = `${height}px`
    this.tempHighlightElement.style.background = palette.highlight
  }

  private clearTempHighlight() {
    if (this.tempHighlightElement?.parentElement) {
      this.tempHighlightElement.parentElement.removeChild(this.tempHighlightElement)
    }
    this.tempHighlightElement = null
  }

  private async requestNote(position: PointerPosition) {
    let noteText: string | undefined
    
    if (this.config.onNoteRequested) {
      noteText = await this.config.onNoteRequested({
        page: position.pageNumber,
        x: position.offsetX,
        y: position.offsetY,
        pageWidth: position.pageWidth,
        pageHeight: position.pageHeight
      })
    } else {
      const promptValue = prompt('Enter note text')
      noteText = promptValue ? promptValue.trim() : undefined
    }
    
    if (!noteText) {
      console.log('✋ Note creation cancelled')
      return
    }
    
    const note: NoteAnnotation = {
      type: 'note',
      color: this.currentColor,
      page: position.pageNumber,
      x: position.offsetX,
      y: position.offsetY,
      text: noteText,
      pageWidth: position.pageWidth,
      pageHeight: position.pageHeight,
      timestamp: new Date().toISOString()
    }
    
    this.addAnnotation(note)
  }

  private startDrawing(position: PointerPosition) {
    this.isDrawing = true
    this.activeDrawingPage = position.pageNumber
    this.drawingViewport = { width: position.pageWidth, height: position.pageHeight }
    this.drawingPath = [{ x: position.offsetX, y: position.offsetY }]
    this.createTempDrawingLayer(position)
    this.renderTempDrawingPath()
  }

  private continueDrawing(position: PointerPosition) {
    if (!this.isDrawing || this.activeDrawingPage !== position.pageNumber) return
    
    this.drawingPath.push({ x: position.offsetX, y: position.offsetY })
    this.renderTempDrawingPath()
  }

  private finishDrawing() {
    if (this.isDrawing && this.activeDrawingPage && this.drawingPath.length > 1) {
      const drawing: DrawingAnnotation = {
        type: 'drawing',
        color: this.currentColor,
        page: this.activeDrawingPage,
        path: [...this.drawingPath],
        pageWidth: this.drawingViewport.width,
        pageHeight: this.drawingViewport.height,
        timestamp: new Date().toISOString()
      }
      
      this.addAnnotation(drawing)
    }
    
    this.cleanupTempDrawing()
  }
  
  private createTempDrawingLayer(position: PointerPosition) {
    const layer = this.pageLayers.get(position.pageNumber)
    if (!layer) return
    
    this.drawingSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    this.drawingSvg.setAttribute('class', 'drawing-annotation temp-drawing')
    this.drawingSvg.setAttribute('width', position.pageWidth.toString())
    this.drawingSvg.setAttribute('height', position.pageHeight.toString())
    this.drawingSvg.style.pointerEvents = 'none'
    
    this.drawingPathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    this.drawingPathElement.setAttribute('fill', 'none')
    this.drawingPathElement.setAttribute('stroke-width', '3')
    this.drawingPathElement.setAttribute('stroke-linecap', 'round')
    this.drawingPathElement.setAttribute('stroke-linejoin', 'round')
    this.drawingPathElement.setAttribute('stroke', this.getColorPreset(this.currentColor).stroke)
    
    this.drawingSvg.appendChild(this.drawingPathElement)
    layer.appendChild(this.drawingSvg)
  }
  
  private renderTempDrawingPath() {
    if (!this.drawingPathElement || this.drawingPath.length === 0) return
    
    const pathString = this.drawingPath
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ')
    
    this.drawingPathElement.setAttribute('d', pathString)
  }
  
  private cleanupTempDrawing() {
    if (this.drawingSvg?.parentElement) {
      this.drawingSvg.parentElement.removeChild(this.drawingSvg)
    }
    this.drawingSvg = null
    this.drawingPathElement = null
    this.drawingPath = []
    this.isDrawing = false
    this.activeDrawingPage = null
    this.drawingViewport = { width: 0, height: 0 }
  }

  private eraseAt(position: PointerPosition) {
    const annotations = this.annotations.get(position.pageNumber)
    if (!annotations || annotations.length === 0) return
    
    const viewport = this.renderedPages.get(position.pageNumber)?.viewport
    if (!viewport) return
    
    const remaining = annotations.filter(annotation => {
      return !this.doesPointIntersectAnnotation(annotation, position, viewport)
    })
    
    if (remaining.length !== annotations.length) {
      this.annotations.set(position.pageNumber, remaining)
      this.renderAnnotationsForPage(position.pageNumber)
      this.config.onAnnotationsChange?.(this.annotations)
      console.log('🩹 Removed annotation at', position)
    }
  }
  
  private doesPointIntersectAnnotation(annotation: Annotation, position: PointerPosition, viewport: any): boolean {
    switch (annotation.type) {
      case 'highlight': {
        const highlight = annotation as HighlightAnnotation
        const { scaleX, scaleY } = this.getScaleFactors(highlight, viewport)
        const startX = highlight.start.x * scaleX
        const startY = highlight.start.y * scaleY
        const endX = highlight.end.x * scaleX
        const endY = highlight.end.y * scaleY
        const left = Math.min(startX, endX)
        const right = Math.max(startX, endX)
        const top = Math.min(startY, endY)
        const bottom = Math.max(startY, endY)
        return position.offsetX >= left && position.offsetX <= right && position.offsetY >= top && position.offsetY <= bottom
      }
      case 'note': {
        const note = annotation as NoteAnnotation
        const { scaleX, scaleY } = this.getScaleFactors(note, viewport)
        const noteX = note.x * scaleX
        const noteY = note.y * scaleY
        const size = 28
        return position.offsetX >= noteX && position.offsetX <= noteX + size && position.offsetY >= noteY && position.offsetY <= noteY + size
      }
      case 'drawing': {
        const drawing = annotation as DrawingAnnotation
        const { scaleX, scaleY } = this.getScaleFactors(drawing, viewport)
        for (let i = 0; i < drawing.path.length - 1; i++) {
          const start = drawing.path[i]
          const end = drawing.path[i + 1]
          const scaledStart = { x: start.x * scaleX, y: start.y * scaleY }
          const scaledEnd = { x: end.x * scaleX, y: end.y * scaleY }
          const distance = this.distanceToSegment(position.offsetX, position.offsetY, scaledStart, scaledEnd)
          if (distance < 8) {
            return true
          }
        }
        return false
      }
    }
  }
  
  private distanceToSegment(px: number, py: number, start: { x: number; y: number }, end: { x: number; y: number }) {
    const dx = end.x - start.x
    const dy = end.y - start.y
    if (dx === 0 && dy === 0) {
      return Math.hypot(px - start.x, py - start.y)
    }
    
    const t = ((px - start.x) * dx + (py - start.y) * dy) / (dx * dx + dy * dy)
    const clampedT = Math.max(0, Math.min(1, t))
    const closestX = start.x + clampedT * dx
    const closestY = start.y + clampedT * dy
    return Math.hypot(px - closestX, py - closestY)
  }
  
  private renderAnnotationsForPage(pageNum: number) {
    const layer = this.pageLayers.get(pageNum)
    const viewport = this.renderedPages.get(pageNum)?.viewport
    
    if (!layer || !viewport) return
    
    layer.querySelectorAll('[data-annotation="permanent"]').forEach(node => node.remove())
    
    const pageAnnotations = this.annotations.get(pageNum) || []
    pageAnnotations.forEach(annotation => {
      switch (annotation.type) {
        case 'highlight':
          this.renderHighlight(annotation as HighlightAnnotation, layer, viewport)
          break
        case 'note':
          this.renderNote(annotation as NoteAnnotation, layer, viewport)
          break
        case 'drawing':
          this.renderDrawing(annotation as DrawingAnnotation, layer, viewport)
          break
      }
    })
  }
  
  private renderHighlight(annotation: HighlightAnnotation, layer: HTMLElement, viewport: any) {
    const { scaleX, scaleY } = this.getScaleFactors(annotation, viewport)
    const startX = annotation.start.x * scaleX
    const startY = annotation.start.y * scaleY
    const endX = annotation.end.x * scaleX
    const endY = annotation.end.y * scaleY
    const highlightDiv = document.createElement('div')
    highlightDiv.className = 'highlight-annotation'
    highlightDiv.dataset.annotation = 'permanent'
    if (annotation.id) {
      highlightDiv.dataset.annotationId = annotation.id
    }
    
    highlightDiv.style.left = `${Math.min(startX, endX)}px`
    highlightDiv.style.top = `${Math.min(startY, endY)}px`
    highlightDiv.style.width = `${Math.abs(endX - startX)}px`
    highlightDiv.style.height = `${Math.abs(endY - startY)}px`
    highlightDiv.style.background = this.getColorPreset(annotation.color).highlight
    
    layer.appendChild(highlightDiv)
  }
  
  private renderNote(annotation: NoteAnnotation, layer: HTMLElement, viewport: any) {
    const { scaleX, scaleY } = this.getScaleFactors(annotation, viewport)
    const noteDiv = document.createElement('div')
    noteDiv.className = 'note-annotation'
    noteDiv.dataset.annotation = 'permanent'
    if (annotation.id) {
      noteDiv.dataset.annotationId = annotation.id
    }
    
    const palette = this.getColorPreset(annotation.color)
    noteDiv.style.left = `${annotation.x * scaleX}px`
    noteDiv.style.top = `${annotation.y * scaleY}px`
    noteDiv.style.background = palette.noteBg
    noteDiv.style.borderColor = palette.noteBorder
    noteDiv.textContent = annotation.text.length > 18 ? `${annotation.text.slice(0, 18)}…` : annotation.text
    noteDiv.title = annotation.text
    
    layer.appendChild(noteDiv)
  }
  
  private renderDrawing(annotation: DrawingAnnotation, layer: HTMLElement, viewport: any) {
    if (!annotation.path.length) return
    const { scaleX, scaleY } = this.getScaleFactors(annotation, viewport)
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('class', 'drawing-annotation')
    svg.setAttribute('width', viewport.width.toString())
    svg.setAttribute('height', viewport.height.toString())
    svg.style.pointerEvents = 'none'
    svg.dataset.annotation = 'permanent'
    if (annotation.id) {
      svg.dataset.annotationId = annotation.id
    }
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    const d = annotation.path
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x * scaleX} ${point.y * scaleY}`)
      .join(' ')
    path.setAttribute('d', d)
    path.setAttribute('fill', 'none')
    path.setAttribute('stroke-width', '3')
    path.setAttribute('stroke-linecap', 'round')
    path.setAttribute('stroke-linejoin', 'round')
    path.setAttribute('stroke', this.getColorPreset(annotation.color).stroke)
    
    svg.appendChild(path)
    layer.appendChild(svg)
  }
  
  private getScaleFactors(annotation: Annotation, viewport: any) {
    const pageWidth = annotation.pageWidth || viewport.width
    const pageHeight = annotation.pageHeight || viewport.height
    return {
      scaleX: pageWidth ? viewport.width / pageWidth : 1,
      scaleY: pageHeight ? viewport.height / pageHeight : 1
    }
  }
  
  private getColorPreset(color: Color) {
    const palette: Record<Color, { highlight: string; stroke: string; noteBg: string; noteBorder: string }> = {
      yellow: { highlight: 'rgba(254, 240, 138, 0.6)', stroke: '#facc15', noteBg: '#fef08a', noteBorder: '#facc15' },
      green: { highlight: 'rgba(167, 243, 208, 0.6)', stroke: '#22c55e', noteBg: '#bbf7d0', noteBorder: '#22c55e' },
      blue: { highlight: 'rgba(191, 219, 254, 0.6)', stroke: '#3b82f6', noteBg: '#bfdbfe', noteBorder: '#3b82f6' },
      red: { highlight: 'rgba(254, 202, 202, 0.6)', stroke: '#ef4444', noteBg: '#fecaca', noteBorder: '#ef4444' },
      orange: { highlight: 'rgba(254, 215, 170, 0.6)', stroke: '#fb923c', noteBg: '#fed7aa', noteBorder: '#fb923c' }
    }
    
    return palette[color] ?? palette.yellow
  }

  private addAnnotation(annotation: Annotation) {
    if (!this.annotations.has(annotation.page)) {
      this.annotations.set(annotation.page, [])
    }
    
    const pageAnnotations = this.annotations.get(annotation.page)!
    annotation.id = Date.now() + Math.random().toString()
    if (!annotation.timestamp) {
      annotation.timestamp = new Date().toISOString()
    }
    pageAnnotations.push(annotation)
    
    this.renderAnnotationsForPage(annotation.page)
    this.config.onAnnotationsChange?.(this.annotations)
    console.log('📝 Annotation added:', annotation)
  }

  async extractAllText(): Promise<string> {
    if (!this.pdfDocument) {
      throw new Error('PDF not loaded')
    }
    
    console.log('📄 Extracting text from all PDF pages...')
    const allText: string[] = []
    
    try {
      // Extract text from all pages
      for (let pageNum = 1; pageNum <= this.totalPages; pageNum++) {
        const page = await this.pdfDocument.getPage(pageNum)
        const textContent = await page.getTextContent()
        
        // Combine all text items from the page
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ')
        
        if (pageText.trim()) {
          allText.push(`[Page ${pageNum}]\n${pageText}\n`)
        }
      }
      
      const fullText = allText.join('\n\n')
      console.log(`✅ Extracted ${fullText.length} characters from ${this.totalPages} pages`)
      return fullText
    } catch (error) {
      console.error('❌ Error extracting PDF text:', error)
      throw error
    }
  }

  async saveAnnotationsToNabuAI() {
    const allAnnotations: Annotation[] = []
    
    for (const [page, annotations] of this.annotations) {
      annotations.forEach(annotation => {
        allAnnotations.push({
          ...annotation,
          page: page
        })
      })
    }
    
    if (allAnnotations.length === 0) {
      alert('No annotations to save')
      return
    }
    
    console.log('💾 Saving annotations to NabuAI:', allAnnotations)
    
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'saveContent',
        data: {
          type: 'pdf-annotations',
          title: `${this.extractFilename(this.config.pdfUrl)} - Annotations`,
          url: this.config.sourceUrl || this.config.pdfUrl,
          content: JSON.stringify({
            pdfUrl: this.config.pdfUrl,
            filename: this.extractFilename(this.config.pdfUrl),
            annotations: allAnnotations,
            totalAnnotations: allAnnotations.length
          }),
          tags: ['pdf', 'annotations', 'highlights', 'notes'],
          notes: `PDF annotations for ${this.extractFilename(this.config.pdfUrl)}. Contains ${allAnnotations.length} annotations across ${this.annotations.size} pages.`,
          timestamp: new Date().toISOString()
        }
      })
      
      if (response && response.success) {
        alert(`Successfully saved ${allAnnotations.length} annotations to NabuAI!`)
      } else {
        throw new Error(response?.error || 'Failed to save annotations')
      }
      
    } catch (error) {
      console.error('❌ Error saving annotations:', error)
      alert('Failed to save annotations: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  destroy() {
    // Cleanup resources
    if (this.windowMouseUpHandler) {
      window.removeEventListener('mouseup', this.windowMouseUpHandler)
      this.windowMouseUpHandler = null
    }
    this.clearTempHighlight()
    this.cleanupTempDrawing()
    this.clearTextSelection()
    this.pageLayers.clear()
    this.pdfDocument = null
    this.renderedPages.clear()
    this.annotations.clear()
    this.textContent.clear()
  }
}
