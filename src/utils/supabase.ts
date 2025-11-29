// Import polyfills first (must be before other imports)
import './polyfills'

import { createClient, type SupabaseClientOptions } from '@supabase/supabase-js'

// Replace these with your Supabase project credentials
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://nsgpnhxaambdziptqvyp.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zZ3BuaHhhYW1iZHppcHRxdnlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2MjM3NTksImV4cCI6MjA3NzE5OTc1OX0.rNsTiJveGo6dWKyr_YgSqNK3Wt9uKKpGSTY3ois5rHY'

// Detect if we're in a service worker environment
// Check for service worker context (no window, no document)
const isWorker = (() => {
  try {
    return typeof window === 'undefined' && 
           typeof document === 'undefined' &&
           typeof globalThis !== 'undefined' && 
           typeof globalThis.chrome !== 'undefined'
  } catch {
    return false
  }
})()

// Storage adapter for service worker (no window/localStorage/document)
const workerStorage = {
  getItem: async (key: string) => {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const result = await chrome.storage.local.get(key)
        return (result && result[key]) ?? null
      }
      return null
    } catch {
      return null
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set({ [key]: value })
      }
    } catch {
      // Ignore errors
    }
  },
  removeItem: async (key: string) => {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.remove(key)
      }
    } catch {
      // Ignore errors
    }
  }
}

// Create Supabase client with service worker-safe configuration
let supabase: ReturnType<typeof createClient>

try {
  const options: SupabaseClientOptions<any> = {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false, // Disable URL detection (requires document)
      storage: isWorker ? (workerStorage as any) : undefined,
      flowType: 'pkce' // Use PKCE flow (more secure, no document access needed)
    },
    global: {
      headers: {}
    }
  }

  supabase = createClient(supabaseUrl, supabaseAnonKey, options)
} catch (error) {
  console.error('❌ Failed to create Supabase client:', error)
  // Fallback: create client with minimal options
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storage: isWorker ? (workerStorage as any) : undefined
    }
  })
}

export { supabase }

