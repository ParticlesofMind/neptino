/**
 * Authentication System
 * Handles user sign up, sign in, sign out, role-based redirects, and form handling
 */

import { supabase } from "../supabase";

let currentUser: any = null;

// Sign up new user
export async function signUp(
 email: string,
 password: string,
 fullName: string,
 userRole: string,
) {
 try {
 const { error } = await supabase.auth.signUp({
 email,
 password,
 options: {
 data: {
 full_name: fullName,
 user_role: userRole,
 },
 },
 });

 if (error) {
 return { success: false, error: error.message };
 }

 // The database trigger will automatically create the user profile
 // No need to manually insert into users table anymore!

 return { success: true };
 } catch (error) {
 console.error("Unexpected error during sign up:", error);
 return { success: false, error: "An unexpected error occurred" };
 }
}

// Sign in existing user
export async function signIn(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Sign in error:", error);

      // Development convenience: auto-create account on first sign-in attempt
      // Only enable in development to avoid accidental account creation in prod
      const isDev = (import.meta as any)?.env?.VITE_APP_ENV === 'development';
      const isInvalidCreds =
        typeof (error as any)?.message === 'string' &&
        (error as any).message.toLowerCase().includes('invalid login credentials');

      if (isDev && isInvalidCreds) {
        try {
          // Heuristic: guess a sensible default role from current path
          const path = typeof window !== 'undefined' ? window.location.pathname : '';
          const inferredRole = path.includes('/teacher/')
            ? 'teacher'
            : path.includes('/admin/')
              ? 'admin'
              : 'student';

          const signupResult = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name: email.split('@')[0],
                user_role: inferredRole,
              },
            },
          });

          if (signupResult.error) {
            // If user already exists, it's truly a bad password
            const msg = signupResult.error.message || 'Sign up failed';
            console.warn('Auto sign-up skipped:', msg);
            return { success: false, error: 'Incorrect password or user already exists.' };
          }

          // In local dev with confirmations disabled, we usually get a session immediately
          if (signupResult.data.user) {
            currentUser = signupResult.data.user;
            return { success: true, info: 'Account created and signed in (dev).' };
          }

          // Fallback: attempt a fresh sign-in now that the account exists
          const retry = await supabase.auth.signInWithPassword({ email, password });
          if (retry.error) {
            console.error('Retry sign-in after auto sign-up failed:', retry.error);
            return { success: false, error: retry.error.message };
          }
          if (retry.data.user) {
            currentUser = retry.data.user;
            return { success: true, info: 'Account created and signed in (dev).' };
          }
        } catch (autoErr) {
          console.error('Auto sign-up flow error:', autoErr);
          // Fall through to the original error handling below
        }
      }

      return { success: false, error: error.message };
    }

    if (data.user) {
      currentUser = data.user;

 // Don't redirect immediately - let the auth state listener handle it
 // This prevents the "connection refused" issue
 console.log(
 "✅ Sign in successful - auth state listener will handle redirect",
 );
 }

    return { success: true };
  } catch (error) {
    console.error("Unexpected error during sign in:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

// Sign out user
export async function signOut() {
 try {
 const { error } = await supabase.auth.signOut();
 if (error) {
 return { success: false, error: error.message };
 }
 currentUser = null;
 return { success: true };
 } catch (error) {
 return { success: false, error: "An unexpected error occurred" };
 }
}

// Get current user
export function getCurrentUser() {
 return currentUser;
}

// Redirect based on user role
export function redirectUser(userRole: string) {
  const origin = window.location.origin;

  switch (userRole) {
    case "administrator":
    case "admin":
      const adminUrl = `${origin}/src/pages/admin/home.html`;
      window.location.href = adminUrl;
      break;
 case "teacher":
 const teacherUrl = `${origin}/src/pages/teacher/home.html`;
 window.location.href = teacherUrl;
 break;
 case "student":
 const studentUrl = `${origin}/src/pages/student/home.html`;
 window.location.href = studentUrl;
 break;
 default:
 console.warn("❌ Unknown role, defaulting to student:", userRole);
 const defaultUrl = `${origin}/src/pages/student/home.html`;
 window.location.href = defaultUrl;
 }
}

// Initialize auth state listener
export function initAuth() {
 supabase.auth.onAuthStateChange(async (event, session) => {

 if (event === "SIGNED_IN" && session?.user) {
 currentUser = session.user;

 // Check current page context - ONLY redirect from actual signin/signup pages
 const currentPath = window.location.pathname;

 // ONLY redirect from signin and signup pages - nowhere else!
 const shouldRedirect =
 currentPath.includes("/pages/shared/signin.html") ||
 currentPath.includes("/pages/shared/signup.html");

 if (!shouldRedirect) {
 return;
 }

 console.log(
 "📍 On signin/signup page, proceeding with role-based redirect",
 );

 // Get role from user metadata - this is where the role is actually stored!
 const userMetadata = session.user.user_metadata || {};
 const userRole = userMetadata.user_role || "student";

 // Add a small delay to ensure everything is ready
 setTimeout(() => {
 redirectUser(userRole);
 }, 500);
 } else if (event === "SIGNED_OUT") {
 currentUser = null;

 // Only redirect to signin if we're on a protected page
 const currentPath = window.location.pathname;
 const isProtectedPage =
 currentPath.includes("/pages/student/") ||
 currentPath.includes("/pages/teacher/") ||
 currentPath.includes("/pages/admin/");

 if (isProtectedPage) {
 console.log(
 "📍 On protected page after sign out, redirecting to signin",
 );
 window.location.href = "/src/pages/shared/signin.html";
 } else {
 }
 }
 });

 // Check if user is already signed in
 supabase.auth.getSession().then(({ data: { session } }) => {
 if (session?.user) {
 currentUser = session.user;
 }
 });
}

/**
 * Authentication Form Handler
 * Handles sign in and sign up form submissions
 */
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
      
      const result = await signIn(email, password);

      if (result.success) {
        const msg = (result as any).info || 'Sign in successful! Redirecting...';
        this.showMessage(msg, 'success');
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
 const existingMessage = document.querySelector('.form__message');
 if (existingMessage) {
 existingMessage.remove();
 }

 // Create new message element
 const messageElement = document.createElement('div');
 messageElement.className = `form__message form__message--${type}`;
 messageElement.textContent = message;

 // Insert message after the form header
 const form = document.querySelector('.form--signin, .form--signup');
 const header = form?.querySelector('.form__header');
 
 if (header && form) {
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

// Initialization of AuthFormHandler is handled centrally in src/scripts/app.ts
