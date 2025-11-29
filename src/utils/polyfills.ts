// Polyfills for service worker environment
// This file should be imported first to set up global polyfills

// Polyfill document for service worker (Supabase and other libraries may need it)
if (typeof document === 'undefined' && typeof globalThis !== 'undefined') {
  try {
    (globalThis as any).document = {
      location: { 
        href: '', 
        origin: '', 
        pathname: '', 
        search: '',
        hash: '',
        host: '',
        hostname: '',
        port: '',
        protocol: 'https:'
      },
      cookie: '',
      getElementById: () => null,
      querySelector: () => null,
      querySelectorAll: () => [],
      getElementsByTagName: () => [],
      getElementsByClassName: () => [],
      createElement: (tag: string) => ({ 
        tagName: tag,
        setAttribute: () => {},
        getAttribute: () => null,
        removeAttribute: () => {},
        appendChild: () => {},
        removeChild: () => {},
        style: {},
        innerHTML: '',
        textContent: '',
        addEventListener: () => {},
        removeEventListener: () => {}
      }),
      createTextNode: () => ({ textContent: '' }),
      addEventListener: () => {},
      removeEventListener: () => {},
      body: { 
        appendChild: () => {}, 
        removeChild: () => {},
        style: {}
      },
      head: { 
        appendChild: () => {}, 
        removeChild: () => {},
        style: {}
      },
      defaultView: null,
      readyState: 'complete'
    }
    console.log('✅ Document polyfill initialized for service worker')
  } catch (e) {
    console.warn('⚠️ Failed to polyfill document:', e)
  }
}

// Polyfill window if needed
if (typeof window === 'undefined' && typeof globalThis !== 'undefined') {
  try {
    (globalThis as any).window = globalThis
  } catch (e) {
    // Ignore
  }
}

