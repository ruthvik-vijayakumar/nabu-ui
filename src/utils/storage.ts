// Storage utility for NabuAI extension
import { databaseService } from "./database";
import type { CreateDocumentInput } from "./types";
import { uploadDataUrl, uploadFromUrl } from "./storageUpload";
import { getCurrentUser } from "./auth";
import { edgeFunctionService } from "./edgeFunctions";

export interface SavedContent {
  id: string;
  type: "page" | "text" | "image" | "video" | "pdf";
  title: string;
  url: string;
  content?: string;
  notes?: string;
  tags?: string[];
  timestamp: string;
  metadata?: Record<string, any>;
}

export class StorageManager {
  private static instance: StorageManager;
  private storageBackend: "chrome" | "localStorage" | "supabase" = "supabase";

  private constructor() {}

  static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }

  // Save content to storage
  async saveContent(content: Omit<SavedContent, "id">): Promise<string> {
    try {
      // Handle image/video/PDF upload to Supabase Storage
      let storagePath: string | undefined = (content as any).storage_object_path;
      let mediaUrl: string | undefined = (content as any).media_url;
      const isImage = content.type === 'image';
      const isVideo = content.type === 'video';
      const isPDF = content.type === 'pdf';
      
      console.log('💾 StorageManager.saveContent:', {
        type: content.type,
        isImage,
        isVideo,
        isPDF,
        hasStoragePath: !!storagePath,
        hasMediaUrl: !!mediaUrl,
        hasContent: !!content.content
      })
      
      // Upload media if it's an image/video/PDF and not already uploaded
      // Note: PDFs are handled in background.ts, so we use the already-uploaded paths
      if ((isImage || isVideo || isPDF) && content.content && !storagePath) {
        try {
          const { user } = await getCurrentUser();
          if (!user) {
            throw new Error('User not authenticated');
          }
          
          const contentStr = content.content;
          
          if (contentStr.startsWith('data:')) {
            // Data URL (base64 encoded image/video)
            const prefix = isImage ? 'images' : (isVideo ? 'videos' : 'pdfs');
            const uploadResult = await uploadDataUrl(contentStr, user.id, prefix);
            storagePath = uploadResult.path;
            mediaUrl = uploadResult.publicUrl;
            console.log('✅ Media uploaded from data URL:', storagePath);
          } else if (contentStr.startsWith('http://') || contentStr.startsWith('https://')) {
            // HTTP(S) URL - fetch and upload the media file
            const prefix = isImage ? 'images' : (isVideo ? 'videos' : 'pdfs');
            const uploadResult = await uploadFromUrl(contentStr, user.id, prefix);
            storagePath = uploadResult.path;
            mediaUrl = uploadResult.publicUrl;
            console.log('✅ Media uploaded from URL:', storagePath, mediaUrl);
          }
        } catch (uploadError) {
          console.error('❌ Upload failed:', uploadError);
          // Continue saving even if upload fails - will store original URL
          // Fallback to original content as media_url
          if (!mediaUrl && content.content) {
            mediaUrl = content.content;
          }
        }
      }
      
      // Use provided storage paths if available (from background.ts upload)
      if ((content as any).storage_object_path) {
        storagePath = (content as any).storage_object_path;
      }
      if ((content as any).media_url) {
        mediaUrl = (content as any).media_url;
      }
      
      const documentInput: CreateDocumentInput = {
        type: content.type as any,
        title: content.title,
        url: content.url,
        content: content.content,
        notes: content.notes,
        tags: content.tags || [],
        scribe_id: (content as any).scribe_id, // Include scribe_id if provided
        storage_object_path: storagePath,
        media_url: mediaUrl || (isImage && content.content ? content.content : (isPDF && (content as any).pdfUrl ? (content as any).pdfUrl : undefined)),
        media_type: isImage ? 'image' : (isVideo ? 'video' : (isPDF ? 'application/pdf' : undefined)),
        metadata: content.metadata || {},
      };
      
      console.log('📎 Document input includes scribe_id:', !!documentInput.scribe_id, documentInput.scribe_id)
      
      console.log('📝 Saving document to database:', {
        type: documentInput.type,
        title: documentInput.title,
        contentLength: documentInput.content?.length || 0,
        hasContent: !!documentInput.content,
        hasStoragePath: !!documentInput.storage_object_path,
        hasMediaUrl: !!documentInput.media_url,
        mediaType: documentInput.media_type
      })
      
      const savedDoc = await databaseService.saveDocument(documentInput);
      console.log("✅ Content saved successfully to Supabase:", savedDoc);
      
      // Process document for vector storage (async, don't wait)
      // Text/Page/PDF: use process-document
      // Images: use process-image (extracts text from images)
      const isTextDocument = savedDoc.type === 'text' || savedDoc.type === 'page'
      const isPDFDoc = savedDoc.type === 'pdf'
      const isImageDoc = savedDoc.type === 'image'
      
      // For text/page: need content
      const shouldProcessText = isTextDocument && 
                                savedDoc.content && 
                                savedDoc.content.trim().length > 0
      
      // For PDFs: can process if we have storage path or content (base64 PDFs need special handling)
      const shouldProcessPDF = isPDFDoc && 
                               (savedDoc.storage_object_path || savedDoc.media_url || 
                                (savedDoc.content && savedDoc.content.trim().length > 0))
      
      const shouldProcessImage = isImageDoc && 
                                 (savedDoc.media_url || savedDoc.storage_object_path)
      
      console.log('🔍 Vector processing check:', {
        documentId: savedDoc.id,
        type: savedDoc.type,
        hasContent: !!savedDoc.content,
        contentLength: savedDoc.content?.length || 0,
        hasMediaUrl: !!savedDoc.media_url,
        hasStoragePath: !!savedDoc.storage_object_path,
        shouldProcessText,
        shouldProcessImage
      })
      
      if (shouldProcessText || shouldProcessPDF) {
        console.log('🚀 Starting vector processing for document:', savedDoc.id, 'type:', savedDoc.type)
        // Call process-document edge function (async, don't wait)
        // Note: For PDFs with base64 content, the edge function will need to handle PDF parsing
        edgeFunctionService.processDocument(savedDoc.id)
          .then(result => {
            console.log('✅ Document processed for vector storage:', result)
          })
          .catch(error => {
            console.error('❌ Failed to process document for vectors:', error)
            console.error('❌ Error details:', {
              message: error?.message,
              stack: error?.stack,
              error: error
            })
            // Don't throw - vector processing is optional
          })
      } else if (shouldProcessImage) {
        console.log('🖼️ Starting image processing for vector storage:', savedDoc.id)
        // Call process-image edge function (async, don't wait)
        edgeFunctionService.processImage(savedDoc.id)
          .then(result => {
            console.log('✅ Image processed for vector storage:', result)
            if (result.extractedTextLength) {
              console.log('📝 Extracted', result.extractedTextLength, 'characters from image')
            }
          })
          .catch(error => {
            console.error('❌ Failed to process image for vectors:', error)
            console.error('❌ Error details:', {
              message: error?.message,
              stack: error?.stack,
              error: error
            })
            // Don't throw - vector processing is optional
          })
      } else {
        console.log('⏭️ Skipping vector processing:', {
          reason: isTextDocument ? (!savedDoc.content ? 'no content' : 'empty content') :
                  isPDFDoc ? (!savedDoc.storage_object_path && !savedDoc.media_url && !savedDoc.content ? 'no PDF data' : 'unknown') :
                  isImageDoc ? (!savedDoc.media_url && !savedDoc.storage_object_path ? 'no image URL' : 'unknown') :
                  'unsupported type'
        })
      }
      
      return savedDoc.id;

    } catch (error: any) {
      console.error("❌ Error saving content:", error);
      console.error("❌ Error details:", {
        message: error?.message,
        name: error?.name,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        stack: error?.stack,
        error: error
      });
      
      // Provide more helpful error messages
      if (error?.message?.includes('Not authenticated') || error?.code === 'PGRST301') {
        throw new Error('You are not logged in. Please log in and try again.')
      }
      if (error?.message?.includes('violates row-level security') || error?.code === '42501') {
        throw new Error('Permission denied. Please check your database permissions.')
      }
      if (error?.message?.includes('violates check constraint')) {
        throw new Error('Invalid data format. Please check the content type.')
      }
      
      throw error;
    }
  }

  // Get all saved content
  async getAllContent(): Promise<SavedContent[]> {
    try {
      switch (this.storageBackend) {
        case "supabase":
          const documents = await databaseService.getDocuments();
          return documents.map((doc) => ({
            id: doc.id,
            type: doc.type as any,
            title: doc.title,
            url: doc.url,
            content: doc.content,
            notes: doc.notes,
            tags: doc.tags,
            timestamp: doc.created_at,
            metadata: doc.metadata,
          }));

        case "chrome":
          const result = await chrome.storage.local.get(null);
          return Object.values(result).filter(
            (item) => item && typeof item === "object" && "id" in item
          ) as SavedContent[];

        case "localStorage":
          const items: SavedContent[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith("saved_")) {
              try {
                const item = JSON.parse(localStorage.getItem(key) || "{}");
                if (item.id) items.push(item);
              } catch (e) {
                console.warn("Invalid item in localStorage:", key);
              }
            }
          }
          return items;

        default:
          return [];
      }
    } catch (error) {
      console.error("Error getting content:", error);
      return [];
    }
  }

  // Get content by ID
  async getContentById(id: string): Promise<SavedContent | null> {
    try {
      switch (this.storageBackend) {
        case "supabase":
          const doc = await databaseService.getDocumentById(id);
          if (!doc) return null;
          return {
            id: doc.id,
            type: doc.type as any,
            title: doc.title,
            url: doc.url,
            content: doc.content,
            notes: doc.notes,
            tags: doc.tags,
            timestamp: doc.created_at,
            metadata: doc.metadata,
          };

        case "chrome":
          const result = await chrome.storage.local.get(id);
          return result[id] || null;

        case "localStorage":
          const item = localStorage.getItem(id);
          return item ? JSON.parse(item) : null;

        default:
          return null;
      }
    } catch (error) {
      console.error("Error getting content by ID:", error);
      return null;
    }
  }

  // Delete content by ID
  async deleteContent(id: string): Promise<boolean> {
    try {
      switch (this.storageBackend) {
        case "supabase":
          await databaseService.deleteDocument(id);
          console.log("Content deleted successfully from Supabase:", id);
          break;

        case "chrome":
          await chrome.storage.local.remove(id);
          break;

        case "localStorage":
          localStorage.removeItem(id);
          break;
      }

      console.log("Content deleted successfully:", id);
      return true;
    } catch (error) {
      console.error("Error deleting content:", error);
      return false;
    }
  }

  // Search content by tags or text
  async searchContent(query: string): Promise<SavedContent[]> {
    try {
      if (this.storageBackend === "supabase") {
        const documents = await databaseService.searchDocuments(query);
        return documents.map((doc) => ({
          id: doc.id,
          type: doc.type as any,
          title: doc.title,
          url: doc.url,
          content: doc.content,
          notes: doc.notes,
          tags: doc.tags,
          timestamp: doc.created_at,
          metadata: doc.metadata,
        }));
      }

      const allContent = await this.getAllContent();
      const lowerQuery = query.toLowerCase();

      return allContent.filter(
        (item) =>
          item.title.toLowerCase().includes(lowerQuery) ||
          item.notes?.toLowerCase().includes(lowerQuery) ||
          (item.tags || []).some((tag) => tag.toLowerCase().includes(lowerQuery)) ||
          item.url.toLowerCase().includes(lowerQuery)
      );
    } catch (error) {
      console.error("Error searching content:", error);
      return [];
    }
  }

  // Export all content as JSON
  async exportContent(): Promise<string> {
    const content = await this.getAllContent();
    return JSON.stringify(content, null, 2);
  }

  // Import content from JSON
  async importContent(jsonData: string): Promise<number> {
    try {
      const content = JSON.parse(jsonData);
      let importedCount = 0;

      if (Array.isArray(content)) {
        for (const item of content) {
          if (item.id && item.type) {
            await this.saveContent(item);
            importedCount++;
          }
        }
      }

      console.log(`Imported ${importedCount} items`);
      return importedCount;
    } catch (error) {
      console.error("Error importing content:", error);
      throw error;
    }
  }

  // Get storage statistics
  async getStorageStats(): Promise<{
    totalItems: number;
    totalSize: number;
    byType: Record<string, number>;
  }> {
    const content = await this.getAllContent();
    const byType: Record<string, number> = {};

    content.forEach((item) => {
      byType[item.type] = (byType[item.type] || 0) + 1;
    });

    const totalSize = JSON.stringify(content).length;

    return {
      totalItems: content.length,
      totalSize,
      byType,
    };
  }

  // Change storage backend
  setStorageBackend(backend: "chrome" | "localStorage" | "supabase") {
    this.storageBackend = backend;
    console.log(`Storage backend changed to: ${backend}`);
  }

  // Get current storage backend
  getStorageBackend(): string {
    return this.storageBackend;
  }
}

// Export singleton instance
export const storageManager = StorageManager.getInstance();
