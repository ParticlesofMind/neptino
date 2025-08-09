/**
 * Authentication Service
 * Handles user registration, login, logout, and session management
 */

import { supabase } from '../../supabase'
import type { User, UserRole, AuthResponse, SignUpData, SignInData } from '../types/user'
import { Logger } from '../utils/logger'
import { ValidationError, AuthError } from '../utils/errors'

export class AuthService {
  private static instance: AuthService
  private currentUser: User | null = null
  private logger = new Logger('AuthService')

  private constructor() {
    // Initialize session check
    this.initializeSession()
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService()
    }
    return AuthService.instance
  }

  /**
   * Initialize user session on app start
   */
  private async initializeSession(): Promise<void> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        this.logger.error('Session initialization failed:', error)
        return
      }

      if (session?.user) {
        await this.loadUserProfile(session.user.id)
        this.logger.info('User session restored')
      }
    } catch (error) {
      this.logger.error('Session initialization error:', error)
    }
  }

  /**
   * Sign up a new user
   */
  public async signUp(signUpData: SignUpData): Promise<AuthResponse> {
    try {
      this.logger.info('Attempting user registration')

      // Validate input
      this.validateSignUpData(signUpData)

      const { email, password, firstName, lastName, role } = signUpData

      // Create auth user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            role: role
          }
        }
      })

      if (error) {
        this.logger.error('Sign up failed:', error)
        throw new AuthError(error.message, 'SIGNUP_FAILED')
      }

      if (!data.user) {
        throw new AuthError('User creation failed', 'USER_CREATION_FAILED')
      }

      // Create user profile in our users table
      const profileResult = await this.createUserProfile(data.user.id, {
        email,
        firstName,
        lastName,
        role
      })

      if (!profileResult.success) {
        this.logger.error('Profile creation failed:', profileResult.error)
        // Still return success since auth user was created
      }

      this.logger.info('User registration successful')

      return {
        success: true,
        user: data.user,
        message: 'Registration successful! Please check your email to verify your account.'
      }

    } catch (error) {
      this.logger.error('Sign up error:', error)
      
      if (error instanceof ValidationError || error instanceof AuthError) {
        return { success: false, error: error.message }
      }
      
      return { 
        success: false, 
        error: 'Registration failed. Please try again.' 
      }
    }
  }

  /**
   * Sign in an existing user
   */
  public async signIn(signInData: SignInData): Promise<AuthResponse> {
    try {
      this.logger.info('Attempting user login')

      // Validate input
      this.validateSignInData(signInData)

      const { email, password } = signInData

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        this.logger.error('Sign in failed:', error)
        throw new AuthError(error.message, 'SIGNIN_FAILED')
      }

      if (!data.user) {
        throw new AuthError('Login failed', 'LOGIN_FAILED')
      }

      // Load user profile
      await this.loadUserProfile(data.user.id)

      this.logger.info('User login successful')

      return {
        success: true,
        user: data.user,
        message: 'Login successful!'
      }

    } catch (error) {
      this.logger.error('Sign in error:', error)
      
      if (error instanceof ValidationError || error instanceof AuthError) {
        return { success: false, error: error.message }
      }
      
      return { 
        success: false, 
        error: 'Login failed. Please check your credentials.' 
      }
    }
  }

  /**
   * Sign out the current user
   */
  public async signOut(): Promise<AuthResponse> {
    try {
      this.logger.info('Attempting user logout')

      const { error } = await supabase.auth.signOut()

      if (error) {
        this.logger.error('Sign out failed:', error)
        throw new AuthError(error.message, 'SIGNOUT_FAILED')
      }

      this.currentUser = null
      this.logger.info('User logout successful')

      return {
        success: true,
        message: 'Logged out successfully!'
      }

    } catch (error) {
      this.logger.error('Sign out error:', error)
      return { 
        success: false, 
        error: 'Logout failed. Please try again.' 
      }
    }
  }

  /**
   * Get current user
   */
  public getCurrentUser(): User | null {
    return this.currentUser
  }

  /**
   * Check if user is authenticated
   */
  public isAuthenticated(): boolean {
    return this.currentUser !== null
  }

  /**
   * Check if user has specific role
   */
  public hasRole(role: UserRole): boolean {
    return this.currentUser?.role === role
  }

  /**
   * Load user profile from database
   */
  private async loadUserProfile(userId: string): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        this.logger.error('Failed to load user profile:', error)
        return
      }

      this.currentUser = data as User
    } catch (error) {
      this.logger.error('Load user profile error:', error)
    }
  }

  /**
   * Create user profile in database
   */
  private async createUserProfile(
    userId: string, 
    userData: { email: string; firstName: string; lastName: string; role: UserRole }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('users')
        .insert([{
          id: userId,
          email: userData.email,
          first_name: userData.firstName,
          last_name: userData.lastName,
          role: userData.role,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: 'Failed to create user profile' }
    }
  }

  /**
   * Validate sign up data
   */
  private validateSignUpData(data: SignUpData): void {
    if (!data.email || !this.isValidEmail(data.email)) {
      throw new ValidationError('Please enter a valid email address', 'email', 'INVALID_EMAIL')
    }

    if (!data.password || data.password.length < 6) {
      throw new ValidationError('Password must be at least 6 characters long', 'password', 'WEAK_PASSWORD')
    }

    if (!data.firstName || data.firstName.trim().length < 2) {
      throw new ValidationError('First name must be at least 2 characters long', 'firstName', 'INVALID_FIRST_NAME')
    }

    if (!data.lastName || data.lastName.trim().length < 2) {
      throw new ValidationError('Last name must be at least 2 characters long', 'lastName', 'INVALID_LAST_NAME')
    }

    if (!data.role || !['student', 'teacher', 'admin'].includes(data.role)) {
      throw new ValidationError('Please select a valid role', 'role', 'INVALID_ROLE')
    }
  }

  /**
   * Validate sign in data
   */
  private validateSignInData(data: SignInData): void {
    if (!data.email || !this.isValidEmail(data.email)) {
      throw new ValidationError('Please enter a valid email address', 'email', 'INVALID_EMAIL')
    }

    if (!data.password) {
      throw new ValidationError('Please enter your password', 'password', 'MISSING_PASSWORD')
    }
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }
}

// Export singleton instance
export const authService = AuthService.getInstance()

import { supabase } from '../../supabase'
import type { User, UserRole, AuthResponse, SignUpData, SignInData } from '../types/user'
import { Logger } from '../utils/logger'
import { ValidationError, AuthError } from '../utils/errors'

export class AuthService {
  private static instance: AuthService
  private currentUser: User | null = null
  private logger = new Logger('AuthService')

  private constructor() {
    // Initialize session check
    this.initializeSession()
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService()
    }
    return AuthService.instance
  }

  /**
   * Initialize user session on app start
   */
  private async initializeSession(): Promise<void> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        this.logger.error('Session initialization failed:', error)
        return
      }

      if (session?.user) {
        await this.loadUserProfile(session.user.id)
        this.logger.info('User session restored')
      }
    } catch (error) {
      this.logger.error('Session initialization error:', error)
    }
  }

  /**
   * Sign up a new user
   */
  public async signUp(signUpData: SignUpData): Promise<AuthResponse> {
    try {
      this.logger.info('Attempting user registration')

      // Validate input
      this.validateSignUpData(signUpData)

      const { email, password, firstName, lastName, role } = signUpData

      // Create auth user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            role: role
          }
        }
      })

      if (error) {
        this.logger.error('Sign up failed:', error)
        throw new AuthError(error.message, 'SIGNUP_FAILED')
      }

      if (!data.user) {
        throw new AuthError('User creation failed', 'USER_CREATION_FAILED')
      }

      // Create user profile in our users table
      const profileResult = await this.createUserProfile({
        id: data.user.id,
        email,
        first_name: firstName,
        last_name: lastName,
        role
      })

      if (!profileResult.success) {
        this.logger.error('Profile creation failed:', profileResult.error)
        // Still return success since auth user was created
      }

      this.logger.info('User registration successful')

      return {
        success: true,
        user: data.user,
        message: 'Registration successful! Please check your email to verify your account.'
      }

    } catch (error) {
      this.logger.error('Sign up error:', error)
      
      if (error instanceof ValidationError || error instanceof AuthError) {
        return { success: false, error: error.message }
      }
      
      return { 
        success: false, 
        error: 'Registration failed. Please try again.' 
      }
    }
  }

  /**
   * Sign in an existing user
   */
  public async signIn(signInData: SignInData): Promise<AuthResponse> {
    try {
      this.logger.info('Attempting user login')

      // Validate input
      this.validateSignInData(signInData)

      const { email, password } = signInData

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        this.logger.error('Sign in failed:', error)
        throw new AuthError(error.message)
      }

      if (!data.user) {
        throw new AuthError('Login failed')
      }

      // Load user profile
      await this.loadUserProfile(data.user.id)

      this.logger.info('User login successful')

      return {
        success: true,
        user: data.user,
        message: 'Login successful!'
      }

    } catch (error) {
      this.logger.error('Sign in error:', error)
      
      if (error instanceof ValidationError || error instanceof AuthError) {
        return { success: false, error: error.message }
      }
      
      return { 
        success: false, 
        error: 'Login failed. Please check your credentials.' 
      }
    }
  }

  /**
   * Sign out the current user
   */
  public async signOut(): Promise<AuthResponse> {
    try {
      this.logger.info('Attempting user logout')

      const { error } = await supabase.auth.signOut()

      if (error) {
        this.logger.error('Sign out failed:', error)
        throw new AuthError(error.message)
      }

      this.currentUser = null
      this.logger.info('User logout successful')

      return {
        success: true,
        message: 'Logged out successfully!'
      }

    } catch (error) {
      this.logger.error('Sign out error:', error)
      return { 
        success: false, 
        error: 'Logout failed. Please try again.' 
      }
    }
  }

  /**
   * Get current user
   */
  public getCurrentUser(): User | null {
    return this.currentUser
  }

  /**
   * Check if user is authenticated
   */
  public isAuthenticated(): boolean {
    return this.currentUser !== null
  }

  /**
   * Check if user has specific role
   */
  public hasRole(role: UserRole): boolean {
    return this.currentUser?.role === role
  }

  /**
   * Load user profile from database
   */
  private async loadUserProfile(userId: string): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        this.logger.error('Failed to load user profile:', error)
        return
      }

      this.currentUser = data as User
    } catch (error) {
      this.logger.error('Load user profile error:', error)
    }
  }

  /**
   * Create user profile in database
   */
  private async createUserProfile(userData: Omit<User, 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('users')
        .insert([{
          id: userData.id,
          email: userData.email,
          first_name: userData.firstName,
          last_name: userData.lastName,
          role: userData.role,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: 'Failed to create user profile' }
    }
  }

  /**
   * Validate sign up data
   */
  private validateSignUpData(data: SignUpData): void {
    if (!data.email || !this.isValidEmail(data.email)) {
      throw new ValidationError('Please enter a valid email address')
    }

    if (!data.password || data.password.length < 6) {
      throw new ValidationError('Password must be at least 6 characters long')
    }

    if (!data.firstName || data.firstName.trim().length < 2) {
      throw new ValidationError('First name must be at least 2 characters long')
    }

    if (!data.lastName || data.lastName.trim().length < 2) {
      throw new ValidationError('Last name must be at least 2 characters long')
    }

    if (!data.role || !['student', 'teacher', 'admin'].includes(data.role)) {
      throw new ValidationError('Please select a valid role')
    }
  }

  /**
   * Validate sign in data
   */
  private validateSignInData(data: SignInData): void {
    if (!data.email || !this.isValidEmail(data.email)) {
      throw new ValidationError('Please enter a valid email address')
    }

    if (!data.password) {
      throw new ValidationError('Please enter your password')
    }
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }
}

// Export singleton instance
export const authService = AuthService.getInstance()
