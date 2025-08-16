/**
 * Authentication Form Handlers
 * Handles sign in and sign up form submissions
 */

import { signIn, signUp } from '../backend/auth/auth';

export class AuthFormHandler {
 private signinForm: HTMLFormElement | null = null;
 private signupForm: HTMLFormElement | null = null;

 constructor() {
 this.initialize();
 }

 private initialize(): void {
 // Find forms
 this.signinForm = document.getElementById('signin-form') as HTMLFormElement;
 this.signupForm = document.getElementById('signup-form') as HTMLFormElement;

 // Setup event listeners
 if (this.signinForm) {
 this.setupSigninForm();
 }

 if (this.signupForm) {
 this.setupSignupForm();
 }
 }

 private setupSigninForm(): void {
 if (!this.signinForm) return;

 this.signinForm.addEventListener('submit', async (e) => {
 e.preventDefault();
 await this.handleSignin(e);
 });
 }

 private setupSignupForm(): void {
 if (!this.signupForm) return;

 this.signupForm.addEventListener('submit', async (e) => {
 e.preventDefault();
 await this.handleSignup(e);
 });
 }

 private async handleSignin(event: Event): Promise<void> {
 const form = event.target as HTMLFormElement;
 const formData = new FormData(form);
 
 const email = formData.get('email') as string;
 const password = formData.get('password') as string;

 if (!email || !password) {
 this.showMessage('Please fill in all fields', 'error');
 return;
 }

 // Show loading state
 const submitButton = form.querySelector('button[type="submit"]') as HTMLButtonElement;
 const originalText = submitButton.textContent;
 submitButton.textContent = 'Signing in...';
 submitButton.disabled = true;

 try {
 console.log('🔐 Attempting to sign in with:', email);
 
 const result = await signIn(email, password);

 if (result.success) {
 this.showMessage('Sign in successful! Redirecting...', 'success');
 // The auth state listener in auth.ts will handle the redirect
 } else {
 this.showMessage(result.error || 'Sign in failed', 'error');
 console.error('❌ Sign in failed:', result.error);
 }
 } catch (error) {
 console.error('❌ Sign in error:', error);
 this.showMessage('An unexpected error occurred', 'error');
 } finally {
 // Restore button state
 submitButton.textContent = originalText;
 submitButton.disabled = false;
 }
 }

 private async handleSignup(event: Event): Promise<void> {
 const form = event.target as HTMLFormElement;
 const formData = new FormData(form);
 
 const firstName = formData.get('firstName') as string;
 const lastName = formData.get('lastName') as string;
 const email = formData.get('email') as string;
 const role = formData.get('role') as string;
 const password = formData.get('password') as string;

 // Validation
 if (!firstName || !email || !role || !password) {
 this.showMessage('Please fill in all required fields', 'error');
 return;
 }

 if (password.length < 6) {
 this.showMessage('Password must be at least 6 characters long', 'error');
 return;
 }

 // Create full name
 const fullName = lastName ? `${firstName} ${lastName}` : firstName;

 // Show loading state
 const submitButton = form.querySelector('button[type="submit"]') as HTMLButtonElement;
 const originalText = submitButton.textContent;
 submitButton.textContent = 'Creating account...';
 submitButton.disabled = true;

 try {
 console.log('📝 Attempting to sign up:', { email, fullName, role });
 
 const result = await signUp(email, password, fullName, role);

 if (result.success) {
 this.showMessage('Account created successfully! Please check your email to verify your account.', 'success');
 // Clear form
 form.reset();
 } else {
 this.showMessage(result.error || 'Account creation failed', 'error');
 console.error('❌ Sign up failed:', result.error);
 }
 } catch (error) {
 console.error('❌ Sign up error:', error);
 this.showMessage('An unexpected error occurred', 'error');
 } finally {
 // Restore button state
 submitButton.textContent = originalText;
 submitButton.disabled = false;
 }
 }

 private showMessage(message: string, type: 'success' | 'error'): void {
 // Remove any existing messages
 const existingMessage = document.querySelector('element');
 if (existingMessage) {
 existingMessage.remove();
 }

 // Create new message element
 const messageElement = document.createElement('div');
 messageElement
 messageElement.textContent = message;

 // Insert message after the form header
 const authForm = document.querySelector('element');
 const header = authForm?.querySelector('element');
 
 if (header && authForm) {
 header.insertAdjacentElement('afterend', messageElement);
 
 // Auto-remove success messages after 5 seconds
 if (type === 'success') {
 setTimeout(() => {
 messageElement.remove();
 }, 5000);
 }
 }
 }
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
 // Only initialize on auth pages
 if (window.location.pathname.includes('/pages/shared/signin.html') || 
 window.location.pathname.includes('/pages/shared/signup.html')) {
 new AuthFormHandler();
 console.log('🔐 Auth form handler initialized');
 }
});
