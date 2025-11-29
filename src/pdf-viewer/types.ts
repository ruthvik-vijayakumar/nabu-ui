export type Tool = 'select' | 'highlight' | 'note' | 'draw' | 'eraser'
export type Color = 'yellow' | 'green' | 'blue' | 'red' | 'orange'

export interface AnnotationBase {
  id?: string
  page: number
  color: Color
  pageWidth: number
  pageHeight: number
  timestamp?: string
}

export interface HighlightAnnotation extends AnnotationBase {
  type: 'highlight'
  start: { x: number; y: number }
  end: { x: number; y: number }
}

export interface NoteAnnotation extends AnnotationBase {
  type: 'note'
  x: number
  y: number
  text: string
}

export interface DrawingAnnotation extends AnnotationBase {
  type: 'drawing'
  path: Array<{ x: number; y: number }>
}

export type Annotation = HighlightAnnotation | NoteAnnotation | DrawingAnnotation

export interface TextItem {
  text: string
  x: number
  y: number
  width: number
  height: number
  fontName: string
  fontSize: number
}

export interface PDFViewerConfig {
  pdfUrl: string
  sourceUrl?: string
  onPageChange?: (page: number, total: number) => void
  onFilenameChange?: (filename: string) => void
  onLoadingChange?: (loading: boolean) => void
  onError?: (error: string) => void
  onTextSelected?: (text: string) => void
  onAnnotationsChange?: (annotations: Map<number, Annotation[]>) => void
  onNoteRequested?: (context: NoteRequestContext) => Promise<string | undefined> | string | undefined
}

export interface SaveModalData {
  title: string
  tags: string[]
  notes?: string
}

export interface NoteRequestContext {
  page: number
  x: number
  y: number
  pageWidth: number
  pageHeight: number
}

