# NabuAI Chrome Extension
NabuAI is the personal AI research assistant that turns your scattered web content, PDFs, and notes into one unified, searchable knowledge graph. We help academics and researchers eliminate the 8-16 hours per week wasted on manual organization and instantly get answers grounded in their saved data.

## Technical Stack

- **Frontend**: Vue 3 with TypeScript
- **Styling**: Tailwind CSS + shadcn
- **Build Tool**: Vite
- **Browser**: Chrome Extension Manifest V3
- **Backend**: Supabase (PostgreSQL + Auth + Storage)

## Project Structure

```
nabu-ui/
├── src/
│   ├── popup/           # Extension popup (clicking extension icon)
│   ├── content/         # Content script for webpage interactions
│   ├── background/      # Background service worker
│   └── context-menu/    # Context menu functionality
├── icons/               # Extension icons (16x16, 32x32, 48x48, 128x128)
├── manifest.json        # Chrome extension manifest
├── package.json         # Dependencies and scripts
├── vite.config.ts       # Vite configuration
├── tailwind.config.js   # Tailwind CSS configuration
└── tsconfig.json        # TypeScript configuration
```

## Installation

### Prerequisites
- Node.js 16+ 
- npm or yarn
- Google Chrome browser
- Supabase account (free tier works!)

### Setup Steps

1. **Clone and install dependencies**
   ```bash
   git clone <repository-url>
   cd nabu-ui
   npm install
   ```

2. **Set up Supabase**
   - Create account at https://supabase.com
   - Create a new project
   - Run migrations in SQL Editor:
   - Get your API credentials from Settings → API


3. **Build the extension**
   ```bash
   npm run build
   ```

4. **Load in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `dist/` folder from your project

5. **Create account**
   - Click the extension icon
   - Sign up with email/password
   - Start saving content!

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:extension` - Build Chrome extension
- `npm run preview` - Preview production build

### Development Workflow

1. **Make changes** to source files in `src/`
2. **Build extension** with `npm run build:extension`
3. **Reload extension** in Chrome extensions page
4. **Test functionality** on any webpage

## Usage

### Saving Text
1. Select any text on a webpage
2. Right-click and choose "Save to NabuAI"
3. Add tags and click Save

### Saving Pages
1. Click the NabuAI extension icon in Chrome toolbar
2. Review page information
3. Add notes and tags
4. Click "Save Page"

### Saving Media
1. Right-click on any image 
2. Choose "Save to NabuAI"
3. Add tags and click Save

## Configuration

### Manifest Settings
The extension uses Manifest V3 with the following permissions:
- `activeTab` - Access to current tab
- `contextMenus` - Create context menu items
- `storage` - Store saved content locally
- `identity` - User authentication
- `scripting` - Content script injection

### Customization
- Modify `tailwind.config.js` for styling changes
- Update `manifest.json` for extension metadata
- Edit component files in `src/` for functionality changes
- Configure Supabase connection in `src/utils/supabase.ts`

## Browser Compatibility

- Chrome 88+ (Manifest V3 support)
- Edge 88+ (Chromium-based)
- Other Chromium-based browsers

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section
- Review Chrome extension documentation
