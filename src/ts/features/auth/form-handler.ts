/**
 * Form Handler for Authentication
 * Connects sign-up and sign-in forms to the authentication service
 */

import { authService } from '../../core/auth/auth-service'
import type { SignUpData, SignInData } from '../../core/types/user'

export class FormHandler {
  private static instance: FormHandler

  private constructor() {
    this.initializeEventListeners()
  }

  public static getInstance(): FormHandler {
    if (!FormHandler.instance) {
      FormHandler.instance = new FormHandler()
    }
    return FormHandler.instance
  }

  /**
   * Initialize form event listeners
   */
  private initializeEventListeners(): void {
    // Wait for DOM to be ready
    document.addEventListener('DOMContentLoaded', () => {
      this.attachSignUpHandler()
      this.attachSignInHandler()
    })
  }

  /**
   * Attach sign-up form handler
   */
  private attachSignUpHandler(): void {
    const signUpForm = document.getElementById('signup-form') as HTMLFormElement
    if (!signUpForm) return

    signUpForm.addEventListener('submit', async (e) => {
      e.preventDefault()
      await this.handleSignUp(signUpForm)
    })
  }

  /**
   * Attach sign-in form handler
   */
  private attachSignInHandler(): void {
    const signInForm = document.getElementById('signin-form') as HTMLFormElement
    if (!signInForm) return

    signInForm.addEventListener('submit', async (e) => {
      e.preventDefault()
      await this.handleSignIn(signInForm)
    })
  }

  /**
   * Handle sign-up form submission
   */
  private async handleSignUp(form: HTMLFormElement): Promise<void> {
    try {
      // Show loading state
      this.setFormLoading(form, true)
      this.clearFormErrors(form)

      // Extract form data
      const formData = new FormData(form)
      const signUpData: SignUpData = {
        firstName: (formData.get('firstName') as string)?.trim() || '',
        lastName: (formData.get('lastName') as string)?.trim() || '',
        email: (formData.get('email') as string)?.trim() || '',
        password: formData.get('password') as string || '',
        role: formData.get('role') as 'student' | 'teacher' | 'administrator'
      }

      console.log('📝 Sign-up form data:', { ...signUpData, password: '[HIDDEN]' })

      // Attempt registration
      const result = await authService.signUp(signUpData)

      if (result.success) {
        console.log('✅ Registration successful')
        this.showSuccessMessage(form, result.message || 'Registration successful!')
        
        // Redirect after short delay
        setTimeout(() => {
          window.location.href = '/src/pages/shared/signin.html'
        }, 2000)
      } else {
        console.log('❌ Registration failed:', result.error)
        this.showErrorMessage(form, result.error || 'Registration failed')
      }

    } catch (error) {
      console.error('❌ Sign-up error:', error)
      this.showErrorMessage(form, 'An unexpected error occurred. Please try again.')
    } finally {
      this.setFormLoading(form, false)
    }
  }

  /**
   * Handle sign-in form submission
   */
  private async handleSignIn(form: HTMLFormElement): Promise<void> {
    try {
      // Show loading state
      this.setFormLoading(form, true)
      this.clearFormErrors(form)

      // Extract form data
      const formData = new FormData(form)
      const signInData: SignInData = {
        email: (formData.get('email') as string)?.trim() || '',
        password: formData.get('password') as string || ''
      }

      console.log('🔐 Sign-in attempt for:', signInData.email)

      // Attempt login
      const result = await authService.signIn(signInData)

      if (result.success) {
        console.log('✅ Login successful')
        this.showSuccessMessage(form, result.message || 'Login successful!')
        
        // Redirect based on user role after short delay
        setTimeout(() => {
          const user = authService.getCurrentUser()
          if (user) {
            this.redirectByRole(user.role)
          } else {
            window.location.href = '/'
          }
        }, 1500)
      } else {
        console.log('❌ Login failed:', result.error)
        this.showErrorMessage(form, result.error || 'Login failed')
      }

    } catch (error) {
      console.error('❌ Sign-in error:', error)
      this.showErrorMessage(form, 'An unexpected error occurred. Please try again.')
    } finally {
      this.setFormLoading(form, false)
    }
  }

  /**
   * Redirect user based on their role
   */
  private redirectByRole(role: string): void {
    switch (role) {
      case 'administrator':
        window.location.href = '/src/pages/admin/dashboard.html'
        break
      case 'teacher':
        window.location.href = '/src/pages/teacher/dashboard.html'
        break
      case 'student':
        window.location.href = '/src/pages/student/dashboard.html'
        break
      default:
        window.location.href = '/'
    }
  }

  /**
   * Set form loading state
   */
  private setFormLoading(form: HTMLFormElement, isLoading: boolean): void {
    const submitButton = form.querySelector('button[type="submit"]') as HTMLButtonElement
    const inputs = form.querySelectorAll('input, select')

    if (submitButton) {
      submitButton.disabled = isLoading
      submitButton.textContent = isLoading ? 'Please wait...' : submitButton.dataset.originalText || 'Submit'
      
      if (!submitButton.dataset.originalText) {
        submitButton.dataset.originalText = submitButton.textContent
      }
    }

    inputs.forEach(input => {
      (input as HTMLInputElement).disabled = isLoading
    })
  }

  /**
   * Show success message
   */
  private showSuccessMessage(form: HTMLFormElement, message: string): void {
    this.showMessage(form, message, 'success')
  }

  /**
   * Show error message
   */
  private showErrorMessage(form: HTMLFormElement, message: string): void {
    this.showMessage(form, message, 'error')
  }

  /**
   * Show message (success or error)
   */
  private showMessage(form: HTMLFormElement, message: string, type: 'success' | 'error'): void {
    // Remove any existing messages
    const existingMessage = form.querySelector('.form-message')
    if (existingMessage) {
      existingMessage.remove()
    }

    // Create message element
    const messageElement = document.createElement('div')
    messageElement.className = `form-message form-message--${type}`
    messageElement.textContent = message

    // Insert at the top of the form
    form.insertBefore(messageElement, form.firstChild)

    // Auto-remove after 5 seconds for error messages
    if (type === 'error') {
      setTimeout(() => {
        if (messageElement.parentNode) {
          messageElement.remove()
        }
      }, 5000)
    }
  }

  /**
   * Clear form error messages
   */
  private clearFormErrors(form: HTMLFormElement): void {
    const errorMessages = form.querySelectorAll('.form-message--error')
    errorMessages.forEach(message => message.remove())
  }
}

// Initialize form handler
export const formHandler = FormHandler.getInstance()
