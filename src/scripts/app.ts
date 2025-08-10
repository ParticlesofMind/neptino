/**
 * Application Entry Point
 * Main script that initializes the application and handles page-specific functionality
 */

import { signIn, signUp, signOut, initAuth } from './backend/auth/auth'

// Import coursebuilder for the course creation page
import './coursebuilder/coursebuilder'

// Check if we're on a protected page that requires authentication
function isProtectedPage() {
  const path = window.location.pathname
  return path.includes('/pages/student/') || 
         path.includes('/pages/teacher/') || 
         path.includes('/pages/admin/')
}

// Always initialize auth state listener
// The auth system is now smart about when to redirect
initAuth()

// On protected pages, also check session immediately
if (isProtectedPage()) {
  console.log('📍 On protected page, checking session...')
  import('./backend/supabase').then(({ supabase }) => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        console.log('❌ No session on protected page, redirecting to signin')
        window.location.href = '/src/pages/shared/signin.html'
      } else {
        console.log('✅ Valid session on protected page')
      }
    })
  })
}

// Handle logout functionality
function handleLogout() {
  const logoutBtn = document.getElementById('logout-btn')
  if (!logoutBtn) return

  logoutBtn.addEventListener('click', async (e) => {
    e.preventDefault()
    
    try {
      const result = await signOut()
      if (result.success) {
        // Redirect to signin page
        window.location.href = '/src/pages/shared/signin.html'
      } else {
        console.error('Logout failed:', result.error)
        // Still redirect even if logout fails
        window.location.href = '/src/pages/shared/signin.html'
      }
    } catch (error) {
      console.error('Logout error:', error)
      // Still redirect even if logout fails
      window.location.href = '/src/pages/shared/signin.html'
    }
  })
}

// Handle sign-in form
function handleSignInForm() {
  const form = document.getElementById('signin-form') as HTMLFormElement
  if (!form) return

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    
    const emailInput = document.getElementById('email') as HTMLInputElement
    const passwordInput = document.getElementById('password') as HTMLInputElement
    const submitButton = form.querySelector('button[type="submit"]') as HTMLButtonElement
    
    if (!emailInput || !passwordInput) return

    const email = emailInput.value.trim()
    const password = passwordInput.value

    if (!email || !password) {
      showError('Please fill in all fields')
      return
    }

    // Disable submit button and show loading state
    submitButton.disabled = true
    submitButton.textContent = 'Signing in...'

    try {
      console.log('Sign in form submitted:', { email })
      const result = await signIn(email, password)
      console.log('Sign in result:', result)
      
      if (result.success) {
        // Success! The signIn function will handle the redirect
        showSuccess('Sign in successful! Redirecting...')
      } else {
        showError(result.error || 'Sign in failed')
      }
    } catch (error) {
      console.error('Sign in form error:', error)
      showError('An unexpected error occurred')
    } finally {
      // Re-enable submit button
      submitButton.disabled = false
      submitButton.textContent = 'Sign In'
    }
  })
}

// Handle sign-up form
function handleSignUpForm() {
  const form = document.getElementById('signup-form') as HTMLFormElement
  if (!form) return

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    
    const firstNameInput = document.getElementById('first-name') as HTMLInputElement
    const lastNameInput = document.getElementById('last-name') as HTMLInputElement
    const emailInput = document.getElementById('email') as HTMLInputElement
    const passwordInput = document.getElementById('password') as HTMLInputElement
    const roleInput = document.getElementById('role') as HTMLSelectElement
    const submitButton = form.querySelector('button[type="submit"]') as HTMLButtonElement
    
    if (!firstNameInput || !emailInput || !passwordInput || !roleInput) return

    const firstName = firstNameInput.value.trim()
    const lastName = lastNameInput?.value.trim() || ''
    const email = emailInput.value.trim()
    const password = passwordInput.value
    const role = roleInput.value

    if (!firstName || !email || !password || !role) {
      showError('Please fill in all required fields')
      return
    }

    if (password.length < 6) {
      showError('Password must be at least 6 characters long')
      return
    }

    // Disable submit button and show loading state
    submitButton.disabled = true
    submitButton.textContent = 'Creating account...'

    try {
      const fullName = lastName ? `${firstName} ${lastName}` : firstName
      const result = await signUp(email, password, fullName, role)
      
      if (result.success) {
        showSuccess('Account created successfully! Please check your email for verification.')
        form.reset()
      } else {
        showError(result.error || 'Sign up failed')
      }
    } catch (error) {
      showError('An unexpected error occurred')
    } finally {
      // Re-enable submit button
      submitButton.disabled = false
      submitButton.textContent = 'Create Account'
    }
  })
}

// Show error message
function showError(message: string) {
  // Remove any existing messages
  removeMessages()
  
  const errorDiv = document.createElement('div')
  errorDiv.className = 'alert alert--error'
  errorDiv.textContent = message
  
  const form = document.querySelector('.form')
  if (form) {
    form.insertBefore(errorDiv, form.firstChild)
  }
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    errorDiv.remove()
  }, 5000)
}

// Show success message
function showSuccess(message: string) {
  // Remove any existing messages
  removeMessages()
  
  const successDiv = document.createElement('div')
  successDiv.className = 'alert alert--success'
  successDiv.textContent = message
  
  const form = document.querySelector('.form')
  if (form) {
    form.insertBefore(successDiv, form.firstChild)
  }
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    successDiv.remove()
  }, 5000)
}

// Remove existing messages
function removeMessages() {
  const existingMessages = document.querySelectorAll('.alert')
  existingMessages.forEach(msg => msg.remove())
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  handleSignInForm()
  handleSignUpForm()
  handleLogout()
})
