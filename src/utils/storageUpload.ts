import { supabase } from './supabase'
import { getCurrentUser } from './auth'

const BUCKET = 'nabu-ai-object-storage'

export async function uploadDataUrl(dataUrl: string, userId: string, prefix = 'images'): Promise<{ path: string, publicUrl?: string }> {
  // Ensure user is authenticated (uses cached version)
  const { user } = await getCurrentUser()
  if (!user || user.id !== userId) {
    throw new Error('User not authenticated or user ID mismatch')
  }
  
  // Verify session is active (getSession is fast, no network request)
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    throw new Error('No active session. Please log in again.')
  }
  
  const res = await fetch(dataUrl)
  const blob = await res.blob()
  const contentType = blob.type || 'image/png'
  const ext = contentType.split('/')[1] || 'png'
  const filename = `${prefix}/${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  
  console.log('📤 Uploading to Supabase Storage:', filename, 'User:', userId, 'Session:', !!session)
  
  const { data, error } = await supabase.storage.from(BUCKET).upload(filename, blob, { contentType, upsert: false })
  if (error) {
    console.error('❌ Upload error:', error)
    if (error.message?.includes('row-level security')) {
      throw new Error('Storage policy violation. Please check your Supabase Storage policies. User must be authenticated and policies must allow uploads to this path.')
    }
    throw error
  }
  const path = data.path
  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)
  // Return path without bucket prefix (Supabase handles bucket internally)
  return { path, publicUrl: pub?.publicUrl }
}

export async function uploadFromUrl(url: string, userId: string, prefix = 'images'): Promise<{ path: string, publicUrl?: string }> {
  try {
    // Ensure user is authenticated
    const { user } = await getCurrentUser()
    if (!user || user.id !== userId) {
      throw new Error('User not authenticated or user ID mismatch')
    }
    
    // Verify session is active
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      throw new Error('No active session. Please log in again.')
    }
    
    console.log('📥 Fetching raw file from URL:', url, 'User:', userId, 'Session:', !!session)
    // Chrome extensions can fetch from any URL (CORS bypassed)
    const res = await fetch(url, {
      method: 'GET',
      // Don't set credentials for cross-origin requests
      credentials: 'omit',
      // Chrome extension context automatically bypasses CORS
    })
    
    if (!res.ok) {
      throw new Error(`Failed to fetch media: ${res.status} ${res.statusText}`)
    }
    
    // Get the raw blob/file
    const blob = await res.blob()
    console.log('📦 Fetched blob:', {
      type: blob.type,
      size: blob.size,
      sizeInMB: (blob.size / 1024 / 1024).toFixed(2),
      bytes: blob.size
    })
    
    // Verify we got actual data
    if (blob.size === 0) {
      throw new Error('Fetched file is empty (0 bytes)')
    }
    
    // For PDFs, verify it's actually a PDF by checking the first bytes
    if (prefix === 'pdfs') {
      const arrayBuffer = await blob.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer.slice(0, 4))
      const pdfSignature = String.fromCharCode(...uint8Array)
      
      console.log('🔍 PDF signature check:', {
        firstBytes: Array.from(uint8Array).map(b => b.toString(16).padStart(2, '0')).join(' '),
        signature: pdfSignature,
        isPDF: pdfSignature === '%PDF'
      })
      
      if (pdfSignature !== '%PDF') {
        console.warn('⚠️ File does not appear to be a valid PDF (missing %PDF signature)')
        // Continue anyway - might be a valid PDF with different encoding
      }
      
      // Recreate blob from arrayBuffer to ensure we have the raw file
      const pdfBlob = new Blob([arrayBuffer], { type: 'application/pdf' })
      console.log('📄 Created PDF blob:', {
        type: pdfBlob.type,
        size: pdfBlob.size,
        sizeInMB: (pdfBlob.size / 1024 / 1024).toFixed(2)
      })
      
      // Use the verified PDF blob
      const verifiedBlob = pdfBlob
      const verifiedContentType = 'application/pdf'
      const verifiedExt = 'pdf'
      
      const filename = `${prefix}/${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${verifiedExt}`
      console.log('📤 Uploading PDF to Supabase Storage:', filename, 'Content-Type:', verifiedContentType, 'Size:', verifiedBlob.size, 'bytes')
      
      const { data, error } = await supabase.storage.from(BUCKET).upload(filename, verifiedBlob, { 
        contentType: verifiedContentType, 
        upsert: false 
      })
      
      if (error) {
        console.error('❌ Supabase upload error:', error)
        if (error.message?.includes('row-level security') || error.message?.includes('RLS')) {
          throw new Error(`Storage policy violation: ${error.message}. Please check your Supabase Storage policies. The user must be authenticated and policies must allow uploads to paths like: ${prefix}/${userId}/*`)
        }
        throw error
      }
      
      const path = data.path
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)
      console.log('✅ PDF upload successful:', path, 'Public URL:', pub?.publicUrl)
      
      return { path, publicUrl: pub?.publicUrl }
    }
    
    // Determine content type and extension
    const contentType = blob.type || 'application/octet-stream'
    let ext = 'bin'
    
    // Try to get extension from content type
    if (contentType.includes('/')) {
      const typeParts = contentType.split('/')
      if (typeParts[1]) {
        ext = typeParts[1].split(';')[0].trim()
        // Clean extension (remove invalid chars)
        ext = ext.replace(/[^a-z0-9]/gi, '') || 'bin'
      }
    }
    
    // Fallback: try to get extension from URL
    if (ext === 'bin' || ext === 'octet-stream') {
      try {
        const urlObj = new URL(url)
        const pathname = urlObj.pathname
        const urlExt = pathname.split('.').pop()?.toLowerCase()
        if (urlExt && /^[a-z0-9]+$/i.test(urlExt)) {
          ext = urlExt
        }
      } catch (e) {
        // URL parsing failed, use default
      }
    }
    
    // Default to common extensions if still unknown
    if (ext === 'bin' || ext === 'octet-stream') {
      if (contentType.startsWith('image/')) {
        ext = 'png' // Default for images
      } else if (contentType.startsWith('video/')) {
        ext = 'mp4' // Default for videos
      } else if (contentType === 'application/pdf') {
        ext = 'pdf' // Default for PDFs
      }
    }
    
    const filename = `${prefix}/${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    console.log('📤 Uploading to Supabase Storage:', filename, 'Content-Type:', contentType)
    
    const { data, error } = await supabase.storage.from(BUCKET).upload(filename, blob, { 
      contentType, 
      upsert: false 
    })
    
    if (error) {
      console.error('❌ Supabase upload error:', error)
      if (error.message?.includes('row-level security') || error.message?.includes('RLS')) {
        throw new Error(`Storage policy violation: ${error.message}. Please check your Supabase Storage policies. The user must be authenticated and policies must allow uploads to paths like: ${prefix}/${userId}/*`)
      }
      throw error
    }
    
    const path = data.path
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)
    console.log('✅ Upload successful:', path, 'Public URL:', pub?.publicUrl)
    
    // Return path without bucket prefix (Supabase handles bucket internally)
    return { path, publicUrl: pub?.publicUrl }
  } catch (error: any) {
    console.error('❌ Error uploading from URL:', error)
    // Re-throw with more context
    throw new Error(`Failed to upload from URL: ${error.message || error}`)
  }
}
