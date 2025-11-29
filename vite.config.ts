import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve, dirname } from 'path'
import { copyFileSync, mkdirSync, existsSync, readdirSync, renameSync, statSync, readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Plugin to rename files starting with underscore after build
function renameUnderscoreFiles() {
  return {
    name: 'rename-underscore-files',
    closeBundle() {
      const distDir = resolve(__dirname, 'dist')
      renameUnderscoreFilesRecursive(distDir)
    }
  }
}

function renameUnderscoreFilesRecursive(dir: string) {
  try {
    const entries = readdirSync(dir, { withFileTypes: true })
    
    for (const entry of entries) {
      const fullPath = resolve(dir, entry.name)
      
      if (entry.isDirectory()) {
        renameUnderscoreFilesRecursive(fullPath)
      } else if (entry.name.startsWith('_')) {
        const newName = entry.name.replace(/^_/, 'x')
        const newPath = resolve(dir, newName)
        renameSync(fullPath, newPath)
        console.log(`  ✅ Renamed: ${entry.name} → ${newName}`)
        
        // Update references in HTML files
        updateHtmlReferences(dir, entry.name, newName)
      }
    }
  } catch (error) {
    // Silently ignore errors
  }
}

function updateHtmlReferences(dir: string, oldName: string, newName: string) {
  try {
    const entries = readdirSync(dir, { withFileTypes: true })
    
    for (const entry of entries) {
      const fullPath = resolve(dir, entry.name)
      
      if (entry.isFile() && entry.name.endsWith('.html')) {
        let content = readFileSync(fullPath, 'utf-8')
        const updated = content.replace(new RegExp(oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newName)
        if (content !== updated) {
          writeFileSync(fullPath, updated, 'utf-8')
          console.log(`  ✅ Updated references in ${entry.name}`)
        }
      }
    }
  } catch (error) {
    // Silently ignore errors
  }
}

export default defineConfig({
  plugins: [
    vue(),
    {
      name: 'copy-pdf-worker',
      closeBundle() {
        // Copy PDF.js worker to dist directory
        const workerSrc = resolve(__dirname, 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs')
        const workerDest = resolve(__dirname, 'dist/pdf.worker.min.mjs')
        
        try {
          copyFileSync(workerSrc, workerDest)
          console.log('✅ PDF.js worker copied to dist/')
        } catch (error) {
          console.error('❌ Failed to copy PDF.js worker:', error)
        }
      }
    },
    renameUnderscoreFiles()
  ],
  build: {
    outDir: 'dist',
    modulePreload: { polyfill: false },
    rollupOptions: {
        input: {
          popup: resolve(__dirname, 'src/popup/index.html'),
          content: resolve(__dirname, 'src/content/content.ts'),
          background: resolve(__dirname, 'src/background/background.ts'),
          'pdf-viewer': resolve(__dirname, 'src/pdf-viewer/pdf-viewer.html'),
          'pdf-viewer-vue': resolve(__dirname, 'src/pdf-viewer/pdf-viewer-vue.ts'),
          dashboard: resolve(__dirname, 'src/dashboard/index.html')
        },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: (chunkInfo) => {
          // Replace leading underscores with 'x' to avoid Chrome extension restrictions
          const name = chunkInfo.name || 'chunk'
          return name.startsWith('_') ? `x${name.slice(1)}.js` : `${name}.js`
        },
        assetFileNames: (assetInfo) => {
          // Replace leading underscores in asset names
          const name = assetInfo.name || 'asset'
          if (name.startsWith('_')) {
            return `x${name.slice(1)}`
          }
          return '[name].[ext]'
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
})
