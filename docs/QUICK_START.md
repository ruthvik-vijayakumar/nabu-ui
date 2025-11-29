# NabuAI Quick Start Guide

Get up and running with NabuAI in minutes!

## 📦 Prerequisites

- Node.js 16+
- Google Chrome browser
- Supabase account (free tier works!)

## 🚀 Setup Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. **Create a Supabase project**: https://supabase.com
2. **Get your credentials** from Settings → API
3. **Run migrations**:
   - Go to SQL Editor in Supabase
   - Run `supabase/migrations/001_initial_schema.sql`
   - Run `supabase/migrations/002_functions.sql`

### 3. Configure Environment

The Supabase credentials are already hardcoded in `src/utils/supabase.ts`, but for production you should use environment variables:

```bash
# Create .env file (optional, credentials already in code)
VITE_SUPABASE_URL=https://nsgpnhxaambdziptqvyp.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Build Extension

```bash
npm run build
```

### 5. Load in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `dist` folder
5. Click the NabuAI icon in the toolbar!

## 🎯 First Steps

### Create an Account

1. Click the NabuAI extension icon
2. Click "Sign Up"
3. Enter your email and password
4. Check your email for confirmation (if enabled)

### Save Your First Content

**Option 1: Save a Page**
1. Visit any webpage
2. Click the extension icon
3. Add notes and tags
4. Click "Save Page"

**Option 2: Save Selected Text**
1. Select text on any webpage
2. Right-click → "Save to NabuAI"
3. Add tags and save

**Option 3: Save an Image/Video**
1. Right-click any image or video
2. Select "Save to NabuAI"
3. Preview and tag
4. Save

**Option 4: View/Annotate PDF**
1. Right-click a PDF link
2. Select "View PDF with NabuAI"
3. Highlight, annotate, or draw

### View Your Dashboard

1. Click the extension icon
2. Click "Go to Dashboard"
3. Browse all your saved content
4. Search, filter, and organize

## 🔑 Key Features

### ✅ Authentication
- Secure email/password auth via Supabase
- Session persistence across browser restarts
- Protected routes

### 💾 Storage Backends
The extension supports multiple storage backends:
- **Supabase** (default) - Cloud storage with full features
- **Chrome Storage** - Local browser storage
- **localStorage** - Simple local storage

Switch between them:
```typescript
import { storageManager } from './utils/storage'
storageManager.setStorageBackend('chrome') // or 'localStorage'
```

### 🔍 Search
- **Full-text search** - Search title, content, notes, tags
- **Semantic search** - AI-powered vector similarity search
- **Hybrid search** - Best of both worlds

### 📊 Database Schema

The extension uses these main tables:
- `document` - All saved content
- `annotation` - PDF highlights/notes/drawings
- `scribe` - AI conversations per document
- `scribe_message` - Individual conversation messages
- `document_vector` - Embeddings for semantic search
- `share` - Document sharing and permissions

## 🛠️ Development

### Run in Development Mode

```bash
npm run build:watch  # Auto-rebuild on changes
```

Then reload the extension in Chrome after each build.

### Project Structure

```
src/
├── popup/          # Main UI (click extension icon)
│   ├── App.vue      # Main app with auth
│   ├── Login.vue    # Login/signup screen
│   └── Dashboard.vue # Content dashboard
├── background/     # Background service worker
├── content/        # Content script for web pages
├── pdf-viewer/     # PDF annotation viewer
└── utils/
    ├── supabase.ts    # Supabase client
    ├── auth.ts        # Auth utilities
    ├── database.ts    # Database operations
    ├── storage.ts     # Storage manager
    └── types.ts       # TypeScript types
```

### Key Files

- `manifest.json` - Extension configuration
- `vite.config.ts` - Build configuration
- `tailwind.config.js` - Styling configuration
- `supabase/migrations/` - Database migrations

## 📚 Documentation

- `README.md` - Project overview
- `INSTALLATION.md` - Detailed installation guide
- `SUPABASE_SETUP.md` - Supabase authentication setup
- `SUPABASE_DATABASE_SCHEMA.md` - Complete database schema
- `SUPABASE_IMPLEMENTATION_GUIDE.md` - Implementation details

## 🐛 Troubleshooting

### "Not authenticated" errors
- Make sure you're logged in
- Check Supabase RLS policies
- Verify your API credentials

### Build errors
```bash
rm -rf node_modules dist
npm install
npm run build
```

### Extension not loading
- Make sure you selected the `dist` folder (not `src`)
- Check for errors in `chrome://extensions/`
- Look at console logs (F12 in popup)

### Database connection issues
- Verify Supabase URL and key
- Check network connectivity
- Verify RLS policies allow your user

## 🚀 Next Steps

### Immediate
1. ✅ Set up Supabase
2. ✅ Run migrations
3. ✅ Build extension
4. ✅ Load in Chrome
5. ✅ Create account
6. ✅ Save first content

### Future Enhancements
- Add PDF annotation saving
- Implement Scribe AI conversations
- Add vector embeddings for semantic search
- Enable document sharing
- Add export/import features

## 💡 Tips

- **Dark mode everywhere** - All UI uses Tailwind UI dark theme
- **Offline fallback** - Can switch to Chrome storage if Supabase is down
- **Full-text search** - Fast keyword search out of the box
- **Semantic search** - Coming soon with vector embeddings
- **RLS security** - All data is user-scoped by default

## 📞 Support

For issues or questions:
1. Check the documentation files
2. Review console logs
3. Verify Supabase setup
4. Check RLS policies

---

**Happy knowledge management! 🎉**

