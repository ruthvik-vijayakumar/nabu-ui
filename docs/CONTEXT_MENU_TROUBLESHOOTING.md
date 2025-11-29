# Context Menu Troubleshooting Guide

## Issue: Context Menu Items Missing

If you don't see the NabuAI context menu options when right-clicking, follow these troubleshooting steps:

---

## ✅ Quick Fix

1. **Reload the Extension**
   - Go to `chrome://extensions/`
   - Find "NabuAI"
   - Click the **reload icon** (circular arrow)
   - Or toggle it off and back on

2. **Check Browser Console**
   - Open background script inspector:
     - Go to `chrome://extensions/`
     - Find NabuAI
     - Click "Inspect views: background page"
   - Look for these logs:
     ```
     🚀 NabuAI Background Service initializing...
     🔧 Creating context menus...
     ✅ Text context menu created
     ✅ Image context menu created
     ✅ Video context menu created
     ✅ Screenshot context menu created
     ✅ Partial screenshot context menu created
     ✅ PDF context menu created
     🎯 All context menus created successfully
     ✅ NabuAI Background Service initialized
     ```

---

## 🔍 Debugging Steps

### Step 1: Verify Permissions

Check `manifest.json`:

```json
{
  "permissions": [
    "activeTab",
    "contextMenus",  // ← Must be present!
    "storage",
    "scripting",
    "tabs"
  ],
  "host_permissions": [
    "<all_urls>"     // ← Must be present!
  ]
}
```

**Action:** If missing, add and rebuild:
```bash
npm run build
# Reload extension in Chrome
```

---

### Step 2: Check Background Script

Verify `background.js` exists and is loaded:

1. Go to `chrome://extensions/`
2. Enable "Developer mode"
3. Find NabuAI extension
4. Click "Inspect views: background page"
5. Check console for errors

**Expected:** Should see initialization logs

**Common Errors:**
- ❌ "Failed to load manifest"
- ❌ "Background script failed to load"
- ❌ "Import error"

**Fix:** Rebuild extension and reload

---

### Step 3: Verify Context Menu Registration

In background script console, run:

```javascript
chrome.contextMenus.getAll((menus) => {
  console.log('Registered menus:', menus)
  menus.forEach(menu => {
    console.log(`- ${menu.id}: ${menu.title}`)
  })
})
```

**Expected Output:**
```
Registered menus: [
  {id: "nabu-save-text", title: "Save to NabuAI", ...},
  {id: "nabu-save-image", title: "Save Image to NabuAI", ...},
  {id: "nabu-save-video", title: "Save Video to NabuAI", ...},
  {id: "nabu-take-screenshot", title: "Take Full Screenshot", ...},
  {id: "nabu-take-partial-screenshot", title: "Select Area to Screenshot", ...},
  {id: "nabu-save-pdf", title: "Open PDF in NabuAI Viewer", ...}
]
```

**If Empty:** Context menus weren't registered

---

### Step 4: Test Context Menu Click

1. Right-click on a webpage
2. Look for NabuAI options:
   - **On selected text:** "Save to NabuAI"
   - **On images:** "Save Image to NabuAI"
   - **On videos:** "Save Video to NabuAI"
   - **On any page:** "Take Full Screenshot" / "Select Area to Screenshot"
   - **On PDF links:** "Open PDF in NabuAI Viewer"

3. If you see them but nothing happens on click:
   - Check background console for errors
   - Look for: `🖱️ Context menu clicked`

---

## 🐛 Common Issues

### Issue 1: Context Menus Don't Appear

**Symptoms:**
- No NabuAI options when right-clicking
- Background console shows no registration logs

**Causes:**
- Extension not reloaded after build
- Background script failed to initialize
- Missing permissions in manifest

**Solutions:**
1. Rebuild: `npm run build`
2. **Fully reload extension**
3. Check manifest.json permissions
4. Check background console for errors

---

### Issue 2: "Duplicate" Error

**Symptoms:**
- Console shows: "Duplicate menu item"
- Some menus appear, others don't

**Causes:**
- Menus registered multiple times
- Extension updated without proper cleanup

**Solutions:**
1. **Remove and reinstall extension:**
   - Go to `chrome://extensions/`
   - Click "Remove" on NabuAI
   - Click "Load unpacked" with `dist/` folder
   
2. Clear storage:
   ```javascript
   // In background console
   chrome.contextMenus.removeAll()
   // Then reload extension
   ```

**Note:** The code now handles this gracefully with log message

---

### Issue 3: Menus Appear But Don't Work

**Symptoms:**
- Context menus visible
- Clicking does nothing
- No console logs on click

**Causes:**
- Click handler not attached
- Background script crashed
- Permission denied

**Solutions:**
1. Check background console for errors
2. Verify `handleContextMenuClick` is bound:
   ```javascript
   // In background console
   console.log(chrome.contextMenus.onClicked.hasListeners())
   // Should return: true
   ```
3. Reload extension

---

### Issue 4: "Cannot Access" Error

**Symptoms:**
- Error: "Cannot access chrome.contextMenus"
- Permissions denied

**Causes:**
- `contextMenus` permission missing
- Extension in wrong mode

**Solutions:**
1. Add to manifest.json:
   ```json
   "permissions": ["contextMenus"]
   ```
2. Rebuild and reload
3. Ensure Developer mode is ON

---

## 🧪 Testing Checklist

### Test Each Context Menu Type

#### ✅ Text Selection
1. Visit any webpage
2. Select some text
3. Right-click
4. **Expected:** See "Save to NabuAI"

#### ✅ Image
1. Right-click any image
2. **Expected:** See "Save Image to NabuAI"

#### ✅ Video
1. Right-click any video
2. **Expected:** See "Save Video to NabuAI"

#### ✅ Screenshot
1. Right-click on any webpage (no selection)
2. **Expected:** See:
   - "Take Full Screenshot"
   - "Select Area to Screenshot"

#### ✅ PDF Link
1. Right-click a PDF link
2. **Expected:** See "Open PDF in NabuAI Viewer"

---

## 🔧 Manual Verification

### Check Background Script

In Chrome DevTools (background console):

```javascript
// 1. Check if service initialized
// Look for: "✅ NabuAI Background Service initialized"

// 2. List all registered menus
chrome.contextMenus.getAll(console.log)

// 3. Test click handler
console.log('Has click listeners:', 
  chrome.contextMenus.onClicked.hasListeners())

// 4. Remove all and test recreation
chrome.contextMenus.removeAll(() => {
  console.log('All menus removed')
  chrome.runtime.reload() // This will recreate
})
```

---

## 📋 Complete Reset Procedure

If nothing works, do a complete reset:

### Step 1: Clean Build
```bash
# Remove old build
rm -rf dist/

# Clean install
rm -rf node_modules/
npm install

# Fresh build
npm run build
```

### Step 2: Remove Extension
1. Go to `chrome://extensions/`
2. Remove NabuAI extension completely

### Step 3: Reinstall
1. Click "Load unpacked"
2. Select `dist/` folder
3. Wait for initialization

### Step 4: Verify
1. Check background console
2. Right-click on a page
3. Verify menus appear

---

## 🔍 Debugging Commands

### In Background Console

```javascript
// Check if menus registered
chrome.contextMenus.getAll((menus) => {
  console.table(menus.map(m => ({
    id: m.id,
    title: m.title,
    contexts: m.contexts
  })))
})

// Check click listener
console.log('Click listener attached:', 
  chrome.contextMenus.onClicked.hasListeners())

// Manually trigger menu creation
chrome.runtime.reload()

// Check extension state
chrome.management.getSelf(console.log)
```

### In Page Console

```javascript
// Check if extension injected
console.log('Extension loaded:', typeof chrome !== 'undefined')

// Check context menu actions
chrome.runtime.sendMessage({
  action: 'test'
}, (response) => {
  console.log('Message response:', response)
})
```

---

## 📝 Expected Behavior

### On Extension Load

**Background Console:**
```
🚀 NabuAI Background Service initializing...
🔧 Creating context menus...
✅ Text context menu created
✅ Image context menu created
✅ Video context menu created
✅ Screenshot context menu created
✅ Partial screenshot context menu created
✅ PDF context menu created
🎯 All context menus created successfully
✅ NabuAI Background Service initialized
```

**On Right-Click:**
```
🖱️ Context menu clicked: nabu-save-text
📝 Text selected, showing save dialog...
🎬 Injecting text save dialog into tab 123
✅ Text save dialog added to page
```

---

## 🆘 Still Not Working?

If context menus still don't work after all steps:

1. **Check Chrome Version**
   - Must be Chrome 88+ (Manifest V3 support)
   - Update Chrome if needed

2. **Check for Conflicts**
   - Disable other extensions temporarily
   - Test with clean Chrome profile

3. **Verify Files**
   - `dist/background.js` exists and is latest
   - `dist/manifest.json` has correct permissions

4. **Report Issue**
   - Include Chrome version
   - Background console logs
   - manifest.json contents
   - Steps to reproduce

---

## ✅ Success Indicators

When everything works:

1. ✅ All 6 context menu items appear
2. ✅ Background console shows registration logs
3. ✅ Clicking menus shows appropriate dialogs
4. ✅ No errors in console
5. ✅ Menus persist after page reload

---

**The extension should work perfectly after a proper reload!** 🎉

