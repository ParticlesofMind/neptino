/**
 * Simple Authentication Functions
 */

import { supabase } from './supabase'

let currentUser: any = null

// Sign up new user
export async function signUp(email: string, password: string, fullName: string, userType: string) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          user_type: userType
        }
      }
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// Sign in existing user
export async function signIn(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      return { success: false, error: error.message }
    }

    if (data.user) {
      currentUser = data.user
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// Sign out user
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) {
      return { success: false, error: error.message }
    }
    currentUser = null
    return { success: true }
  } catch (error) {
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// Get current user
export function getCurrentUser() {
  return currentUser
}

// Redirect based on user type
export function redirectUser(userType: string) {
  const origin = window.location.origin
  
  switch (userType) {
    case 'admin':
      window.location.href = `${origin}/src/pages/admin/home.html`
      break
    case 'teacher':
      window.location.href = `${origin}/src/pages/teacher/home.html`
      break
    case 'student':
      window.location.href = `${origin}/src/pages/student/home.html`
      break
    default:
      window.location.href = `${origin}/src/pages/shared/signin.html`
  }
}

// Initialize auth state listener
export function initAuth() {
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      currentUser = session.user
      const userType = session.user.user_metadata?.user_type
      if (userType) {
        redirectUser(userType)
      }
    } else if (event === 'SIGNED_OUT') {
      currentUser = null
      window.location.href = `${window.location.origin}/src/pages/shared/signin.html`
    }
  })
}
