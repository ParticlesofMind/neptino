/**
 * Authentication System
 * Handles user sign up, sign in, sign out, and role-based redirects
 */

import { supabase } from '../supabase'

let currentUser: any = null

// Sign up new user
export async function signUp(email: string, password: string, fullName: string, userRole: string) {
  try {
    const { error } = await supabase.auth.signUp({
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

    // The database trigger will automatically create the user profile
    // No need to manually insert into users table anymore!
    
    return { success: true }
  } catch (error) {
    console.error('Unexpected error during sign up:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// Sign in existing user
export async function signIn(email: string, password: string) {
  try {
    console.log('Attempting to sign in user:', email)
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    console.log('📋 SignIn response - data:', data)
    console.log('📋 SignIn response - error:', error)

    if (error) {
      console.error('Sign in error:', error)
      return { success: false, error: error.message }
    }

    if (data.user) {
      console.log('User signed in successfully:', data.user.id)
      currentUser = data.user
      
      // Don't redirect immediately - let the auth state listener handle it
      // This prevents the "connection refused" issue
      console.log('✅ Sign in successful - auth state listener will handle redirect')
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

// Helper function to create user profile
async function createUserProfile(user: any) {
  try {
    console.log('🔧 Creating user profile for:', user.id)
    
    const userMetadata = user.user_metadata || {}
    const fullName = userMetadata.full_name || user.email?.split('@')[0] || 'User'
    const userRole = userMetadata.user_role || 'student'
    
    const nameParts = fullName.split(' ')
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''
    
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id: user.id,
        first_name: firstName,
        last_name: lastName,
        email: user.email,
        role: userRole
      })
    
    if (!insertError) {
      console.log('✅ Profile created successfully, redirecting to:', userRole)
      redirectUser(userRole)
    } else {
      console.error('❌ Failed to create profile:', insertError)
      // Still redirect as fallback
      redirectUser('student')
    }
  } catch (error) {
    console.error('❌ Unexpected error creating profile:', error)
    redirectUser('student')
  }
}

// Initialize auth state listener
export function initAuth() {
  supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('🔐 Auth state change:', event, session?.user?.id)
    
    if (event === 'SIGNED_IN' && session?.user) {
      currentUser = session.user
      
      // Check if we're already on a dashboard page to prevent infinite redirects
      const currentPath = window.location.pathname
      const isDashboardPage = currentPath.includes('/pages/student/home.html') || 
                             currentPath.includes('/pages/teacher/home.html') || 
                             currentPath.includes('/pages/admin/home.html')
      
      if (isDashboardPage) {
        console.log('✅ Already on dashboard page, skipping redirect')
        return
      }
      
      // Add a small delay to ensure everything is ready
      setTimeout(async () => {
        try {
          // Fetch user profile to get role
          console.log('Fetching user profile for auth state change...')
          const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('role, first_name, last_name')
            .eq('id', session.user.id)
            .single()
          
          console.log('📋 Profile query (auth state) - data:', profile)
          console.log('📋 Profile query (auth state) - error:', profileError)
          
          if (profileError) {
            console.error('❌ Profile query error:', profileError.message, profileError.code)
            
            if (profileError.code === 'PGRST116') {
              console.log('🔧 No profile found, creating one...')
              await createUserProfile(session.user)
            } else {
              console.error('❌ Unexpected profile error, redirecting to student home as fallback')
              redirectUser('student')
            }
          } else if (!profile) {
            console.log('🔧 Profile is null, creating one...')
            await createUserProfile(session.user)
          } else if (profile?.role) {
            console.log('✅ Profile found, redirecting to:', profile.role)
            redirectUser(profile.role)
          } else {
            console.error('❌ Profile exists but no role found, redirecting to student home as fallback')
            redirectUser('student')
          }
        } catch (error) {
          console.error('❌ Unexpected error in auth state change:', error)
          redirectUser('student') // Fallback to student
        }
      }, 500) // 500ms delay to ensure everything is ready
      
    } else if (event === 'SIGNED_OUT') {
      currentUser = null
      console.log('🚪 User signed out, redirecting to signin')
      
      // Only redirect if not already on a public page
      const currentPath = window.location.pathname
      const isPublicPage = currentPath.includes('/pages/shared/') || currentPath === '/' || currentPath.includes('/index.html')
      
      if (!isPublicPage) {
        window.location.href = '/src/pages/shared/signin.html'
      }
    }
  })
  
  // Check if user is already signed in
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session?.user) {
      currentUser = session.user
      console.log('🔍 Found existing session for user:', session.user.id)
    }
  })
}
