import { supabase } from './supabase'

export interface User {
  id: string
  email: string
  created_at: string
}

// Sign up with email and password
export async function signUp(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })
    
    if (error) throw error
    
    return { user: data.user, error: null }
  } catch (error: any) {
    console.error('Error signing up:', error)
    return { user: null, error: error.message }
  }
}

// Sign in with email and password
export async function signIn(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) throw error
    
    return { user: data.user, session: data.session, error: null }
  } catch (error: any) {
    console.error('Error signing in:', error)
    return { user: null, session: null, error: error.message }
  }
}

// Sign out
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    return { error: null }
  } catch (error: any) {
    console.error('Error signing out:', error)
    return { error: error.message }
  }
}

// Cache for current user to avoid repeated auth requests
let userCache: { user: any; timestamp: number } | null = null
const CACHE_TTL = 60000 // 1 minute cache

// Get current user with caching
export async function getCurrentUser() {
  try {
    // Check cache first
    if (userCache && Date.now() - userCache.timestamp < CACHE_TTL) {
      return { user: userCache.user, error: null }
    }

    // Try session first (faster, no network request)
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      userCache = { user: session.user, timestamp: Date.now() }
      return { user: session.user, error: null }
    }

    // Fallback to getUser if no session
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) throw error
    
    if (user) {
      userCache = { user, timestamp: Date.now() }
    }
    
    return { user, error: null }
  } catch (error: any) {
    console.error('Error getting user:', error)
    userCache = null // Clear cache on error
    return { user: null, error: error.message }
  }
}

// Clear user cache (call on logout)
export function clearUserCache() {
  userCache = null
}

// Listen to auth state changes
export function onAuthStateChange(callback: (user: any) => void) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user || null)
  })
}

