/**
 * Authentication Helper Functions for Playwright Tests
 */

import { Page, expect } from '@playwright/test';
import { TestUser, getTestUser } from './test-users';

export class AuthHelpers {
  constructor(private page: Page) {}

  /**
   * Navigate to signin page
   */
  async goToSignIn(): Promise<void> {
    await this.page.goto('/src/pages/shared/signin.html');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Sign in with test user credentials
   */
  async signIn(userKey: keyof typeof import('./test-users').testUsers): Promise<void> {
    const user = getTestUser(userKey);
    
    await this.goToSignIn();
    
    // Fill in email and password
    await this.page.fill('input[type="email"]', user.email);
    await this.page.fill('input[type="password"]', user.password);
    
    // Click sign in button
    await this.page.click('button[type="submit"]');
    
    // Wait for redirect to home page
    await this.page.waitForURL(/\/pages\/(student|teacher|admin)\/home\.html/);
  }

  /**
   * Sign up a new test user
   */
  async signUp(user: TestUser): Promise<void> {
    await this.page.goto('/src/pages/shared/signup.html');
    await this.page.waitForLoadState('networkidle');
    
    // Fill in signup form
    await this.page.fill('input[name="fullName"]', user.fullName);
    await this.page.fill('input[name="email"]', user.email);
    await this.page.fill('input[name="password"]', user.password);
    await this.page.fill('input[name="confirmPassword"]', user.password);
    
    // Select role
    await this.page.selectOption('select[name="userRole"]', user.role);
    
    // Submit form
    await this.page.click('button[type="submit"]');
    
    // Wait for redirect
    await this.page.waitForURL(/\/pages\/(student|teacher|admin)\/home\.html/);
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<void> {
    await this.page.click('#logout-btn');
    await this.page.waitForURL(/\/pages\/shared\/signin\.html/);
  }

  /**
   * Verify user is redirected to correct home page based on role
   */
  async verifyRoleRedirect(role: 'student' | 'teacher' | 'admin'): Promise<void> {
    const expectedUrl = `/src/pages/${role}/home.html`;
    await expect(this.page).toHaveURL(expectedUrl);
  }

  /**
   * Verify user is on a protected page (requires authentication)
   */
  async verifyProtectedPage(): Promise<void> {
    // Should not be on signin page
    await expect(this.page).not.toHaveURL(/\/pages\/shared\/signin\.html/);
    
    // Should be on a role-specific page
    await expect(this.page).toHaveURL(/\/pages\/(student|teacher|admin)\//);
  }

  /**
   * Get current user role from URL
   */
  getCurrentUserRole(): 'student' | 'teacher' | 'admin' | null {
    const url = this.page.url();
    if (url.includes('/student/')) return 'student';
    if (url.includes('/teacher/')) return 'teacher';
    if (url.includes('/admin/')) return 'admin';
    return null;
  }

  /**
   * Wait for authentication to complete
   */
  async waitForAuth(): Promise<void> {
    // Wait for any auth-related network requests to complete
    await this.page.waitForLoadState('networkidle');
    
    // Wait for any auth state changes
    await this.page.waitForTimeout(1000);
  }
}