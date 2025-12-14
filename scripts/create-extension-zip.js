import { createWriteStream } from 'fs'
import { readdir, stat } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import archiver from 'archiver'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function createExtensionZip() {
  try {
    console.log('Creating extension ZIP file...')
    
    const distDir = join(__dirname, '..', 'dist')
    const outputPath = join(__dirname, '..', 'landing', 'nabu-ai-plus-extension.zip')
    
    // Check if dist directory exists
    try {
      await stat(distDir)
    } catch (error) {
      console.error('❌ Error: dist/ directory not found. Please run "npm run build:extension" first.')
      process.exit(1)
    }

    // Create a file to stream archive data to
    const output = createWriteStream(outputPath)
    const archive = archiver('zip', {
      zlib: { level: 9 } // Sets the compression level
    })

    // Listen for all archive data to be written
    output.on('close', () => {
      console.log(`✅ Extension ZIP created successfully!`)
      console.log(`   Location: ${outputPath}`)
      console.log(`   Total bytes: ${archive.pointer()}`)
    })

    // Good practice to catch warnings (e.g. stat failures and other non-blocking errors)
    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        console.warn('⚠️  Warning:', err)
      } else {
        throw err
      }
    })

    // Good practice to catch this error explicitly
    archive.on('error', (err) => {
      throw err
    })

    // Pipe archive data to the file
    archive.pipe(output)

    // Add all files from dist directory (contents only, not the dist folder itself)
    await addDirectoryToArchive(archive, distDir, '')

    // Finalize the archive (i.e. we are done appending files but streams have to finish yet)
    await archive.finalize()

  } catch (error) {
    console.error('❌ Error creating ZIP file:', error)
    process.exit(1)
  }
}

async function addDirectoryToArchive(archive, dirPath, archivePath) {
  const entries = await readdir(dirPath, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = join(dirPath, entry.name)
    const archiveEntryPath = join(archivePath, entry.name)

    if (entry.isDirectory()) {
      // Recursively add subdirectories
      await addDirectoryToArchive(archive, fullPath, archiveEntryPath)
    } else {
      // Add file to archive
      archive.file(fullPath, { name: archiveEntryPath })
    }
  }
}

createExtensionZip()

