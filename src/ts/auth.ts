/**
 * Authentication Manager for Neptino Educational Platform
 */

import { auth, database } from './supabase'

export class AuthManager {
  private currentUser: any = null
  private userProfile: any = null

  constructor() {
    this.initializeAuth()
  }

  /**
   * Initialize authentication state
   */
  private async initializeAuth(): Promise<void> {
    // Check for existing session
    const { data: { user } } = await auth.getCurrentUser()
    if (user) {
      this.currentUser = user
      await this.loadUserProfile()
    }

    // Listen for auth state changes
    auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        this.currentUser = session.user
        await this.loadUserProfile()
        this.redirectToAppropriateView()
      } else if (event === 'SIGNED_OUT') {
        this.currentUser = null
        this.userProfile = null
        this.redirectToLogin()
      }
    })
  }

  /**
   * Load user profile from database
   */
  private async loadUserProfile(): Promise<void> {
    if (!this.currentUser) return

    const { data, error } = await database.profiles.getById(this.currentUser.id)
    if (error) {
      console.error('Error loading user profile:', error)
      return
    }
    this.userProfile = data
  }

  /**
   * Sign up new user
   */
  async signUp(email: string, password: string, fullName: string, userType: 'student' | 'teacher' = 'student'): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await auth.signUp(email, password, {
        full_name: fullName,
        user_type: userType
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred' }
    }
  }

  /**
   * Sign in user
   */
  async signIn(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await auth.signIn(email, password)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred' }
    }
  }

  /**
   * Sign out user
   */
  async signOut(): Promise<void> {
    await auth.signOut()
  }

  /**
   * Get current user
   */
  getCurrentUser() {
    return this.currentUser
  }

  /**
   * Get user profile
   */
  getUserProfile() {
    return this.userProfile
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.currentUser
  }

  /**
   * Get user type
   */
  getUserType(): 'student' | 'teacher' | 'admin' | null {
    return this.userProfile?.user_type || null
  }

  /**
   * Redirect to appropriate view based on user type
   */
  private redirectToAppropriateView(): void {
    const userType = this.getUserType()
    
    switch (userType) {
      case 'admin':
        window.location.hash = '#/admin/dashboard'
        break
      case 'teacher':
        window.location.hash = '#/teacher/dashboard'
        break
      case 'student':
        window.location.hash = '#/student/dashboard'
        break
      default:
        window.location.hash = '#/login'
    }
  }

  /**
   * Redirect to login
   */
  private redirectToLogin(): void {
    window.location.hash = '#/login'
  }
}

// Export singleton instance
export const authManager = new AuthManager()
