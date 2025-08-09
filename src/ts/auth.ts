/**
 * Simple Authentication Functions
 */

import { supabase } from './supabase'

let currentUser: any = null

// Sign up new user
export async function signUp(email: string, password: string, fullName: string, userRole: string) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          user_role: userRole
        }
      }
    })

    if (error) {
      return { success: false, error: error.message }
    }

    // If user was created successfully, create a record in the users table
    if (data.user) {
      const nameParts = fullName.split(' ')
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''
      
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: data.user.id,
          first_name: firstName,
          last_name: lastName,
          email: email,
          role: userRole
        })
      
      if (insertError) {
        console.error('Error creating user profile:', insertError)
        // Don't return an error here as the auth user was created successfully
        // The user can still sign in, but they might need to set up their profile
      }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// Sign in existing user
export async function signIn(email: string, password: string) {
  try {
    console.log('Attempting to sign in user:', email)
    
    // Add a timeout to see if the request is hanging
    console.log('🚀 Calling supabase.auth.signInWithPassword...')
    
    const signInPromise = supabase.auth.signInWithPassword({
      email,
      password
    })
    
    // Race the auth call with a timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Sign-in request timed out after 10 seconds')), 10000)
    })
    
    const { data, error } = await Promise.race([signInPromise, timeoutPromise]) as any

    console.log('📋 SignIn response - data:', data)
    console.log('📋 SignIn response - error:', error)

    if (error) {
      console.error('Sign in error:', error)
      return { success: false, error: error.message }
    }

    if (data.user) {
      console.log('User signed in successfully:', data.user.id)
      currentUser = data.user
      
      // Fetch user profile to get role
      console.log('Fetching user profile...')
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.user.id)
        .single()
      
      console.log('📋 Profile query - data:', profile)
      console.log('📋 Profile query - error:', profileError)
      
      if (profileError) {
        console.error('Error fetching user profile:', profileError)
        return { success: false, error: 'Could not fetch user profile' }
      }
      
      console.log('User profile:', profile)
      
      if (profile?.role) {
        // Redirect immediately based on user role
        console.log('Redirecting user with role:', profile.role)
        redirectUser(profile.role)
      } else {
        console.error('No role found in user profile')
        return { success: false, error: 'User role not found' }
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Unexpected error during sign in:', error)
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

// Redirect based on user role
export function redirectUser(userRole: string) {
  console.log('🔄 Redirecting user with role:', userRole)
  const origin = window.location.origin
  console.log('🌐 Origin:', origin)
  
  switch (userRole) {
    case 'administrator':
      const adminUrl = `${origin}/src/pages/admin/home.html`
      console.log('🔗 Redirecting to admin:', adminUrl)
      window.location.href = adminUrl
      break
    case 'teacher':
      const teacherUrl = `${origin}/src/pages/teacher/home.html`
      console.log('🔗 Redirecting to teacher:', teacherUrl)
      window.location.href = teacherUrl
      break
    case 'student':
      const studentUrl = `${origin}/src/pages/student/home.html`
      console.log('🔗 Redirecting to student:', studentUrl)
      window.location.href = studentUrl
      break
    default:
      const defaultUrl = `${origin}/src/pages/shared/signin.html`
      console.log('🔗 Redirecting to default (signin):', defaultUrl)
      window.location.href = defaultUrl
  }
}

// Initialize auth state listener
export function initAuth() {
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      currentUser = session.user
      
      // Fetch user profile to get role
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single()
      
      if (!profileError && profile?.role) {
        redirectUser(profile.role)
      }
    } else if (event === 'SIGNED_OUT') {
      currentUser = null
      window.location.href = `${window.location.origin}/src/pages/shared/signin.html`
    }
  })
  
  // Check if user is already signed in
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session?.user) {
      currentUser = session.user
    }
  })
}
