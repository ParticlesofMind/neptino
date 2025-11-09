/**
 * Authentication System
 * Handles user sign up, sign in, sign out, role-based redirects, and form handling
 */

import type { User } from "@supabase/supabase-js";
import { supabase } from "../supabase";
import { rocketChatService } from "../rocketchat/RocketChatService";
import {
  clearRememberedRocketChatPassword,
  rememberRocketChatPassword,
} from "../rocketchat/passwordMemory";

let currentUser: User | null = null;

async function syncRocketChatAccount(
  user: User,
  password: string,
  _fullName?: string,
): Promise<void> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      console.warn(
        "Skipping Rocket.Chat sync because no active Supabase session is available yet.",
      );
      return;
    }

    const displayName =
      user.user_metadata?.display_name ||
      user.user_metadata?.full_name ||
      user.email?.split("@")[0] || 'Unknown';

    const credentials = await rocketChatService.ensureUserCredentials(
      user.email || '',
      password,
      displayName,
    );

    if (!credentials) {
      console.warn(
        "Unable to obtain Rocket.Chat credentials for user:",
        user.email,
      );
      return;
    }

    // Upsert Rocket.Chat credentials in private.user_integrations
    await supabase
      .from("user_integrations")
      .upsert({
        user_id: user.id,
        rocketchat_user_id: credentials.userId,
        rocketchat_auth_token: credentials.authToken,
        rocketchat_username: credentials.username,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id",
      });
  } catch (error) {
    console.error("Failed to sync Rocket.Chat account:", error);
  }
}

// Sign up new user
export async function signUp(
  email: string,
  password: string,
  firstName: string,
  lastName: string | null,
  userRole: string,
) {
 try {
 rememberRocketChatPassword(password);

 const normalizedFirstName =
   typeof firstName === "string" && firstName.trim().length
     ? firstName.trim()
     : email.split("@")[0];
 const normalizedLastName =
   typeof lastName === "string" && lastName.trim().length ? lastName.trim() : "";
 const fullName = [normalizedFirstName, normalizedLastName].filter(Boolean).join(" ") || normalizedFirstName;

 const { data, error } = await supabase.auth.signUp({
 email,
 password,
 options: {
 data: {
 full_name: fullName,
 first_name: normalizedFirstName,
 last_name: normalizedLastName,
 user_role: userRole,
 },
 },
 });

 if (error) {
 return { success: false, error: error.message };
 }

 const createdUser = data?.user;

 if (createdUser) {
   await syncRocketChatAccount(createdUser as User, password, fullName);
 } else {
   // Provision a Rocket.Chat account even if the Supabase session is pending verification
   try {
     await rocketChatService.ensureUserCredentials(email, password, fullName);
   } catch (syncError) {
     console.error(
       "Failed to provision Rocket.Chat user during signup:",
       syncError,
     );
   }
 }

 return { success: true };
 } catch (error) {
 console.error("Unexpected error during sign up:", error);
 return { success: false, error: "An unexpected error occurred" };
 }
}

// Sign in existing user
export async function signIn(email: string, password: string) {
  try {
    let signedInUser: User | null = null;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Sign in error:", error);

      const isDev = import.meta.env?.VITE_APP_ENV === "development";
      const isInvalidCreds =
        typeof error.message === "string" &&
        error.message.toLowerCase().includes("invalid login credentials");

      if (isDev && isInvalidCreds) {
        try {
          const path =
            typeof window !== "undefined" ? window.location.pathname : "";
          const inferredRole = path.includes("/teacher/")
            ? "teacher"
            : path.includes("/admin/")
              ? "admin"
              : "student";

          const inferredName = email.split("@")[0];
          const signupResult = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name: inferredName,
                first_name: inferredName,
                last_name: "",
                user_role: inferredRole,
              },
            },
          });

          if (signupResult.error) {
            const msg = signupResult.error.message || "Sign up failed";
            console.warn("Auto sign-up skipped:", msg);
            return {
              success: false,
              error: "Incorrect password or user already exists.",
            };
          }

          if (signupResult.data.user) {
            signedInUser = signupResult.data.user as User;
            currentUser = signedInUser;
            rememberRocketChatPassword(password);
            await syncRocketChatAccount(signedInUser, password);
            return {
              success: true,
              info: "Account created and signed in (dev).",
            };
          }

          const retry = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (retry.error) {
            console.error(
              "Retry sign-in after auto sign-up failed:",
              retry.error,
            );
            return { success: false, error: retry.error.message };
          }
          if (retry.data.user) {
            signedInUser = retry.data.user as User;
            currentUser = signedInUser;
            rememberRocketChatPassword(password);
            await syncRocketChatAccount(signedInUser, password);
            return {
              success: true,
              info: "Account created and signed in (dev).",
            };
          }
        } catch (autoErr) {
          console.error("Auto sign-up flow error:", autoErr);
        }
      }

      return { success: false, error: error.message };
    }

    if (data.user) {
      signedInUser = data.user as User;
      currentUser = data.user;

      rememberRocketChatPassword(password);
      console.log(
        "✅ Sign in successful - auth state listener will handle redirect",
      );
    }

    if (signedInUser) {
      await syncRocketChatAccount(signedInUser, password);
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
 console.log("🔍 Attempting sign out...");
 
 // Get current session to validate
 const { data: { session }, error: sessionError } = await supabase.auth.getSession();
 if (sessionError) {
 console.warn("⚠️ Could not retrieve session:", sessionError.message);
 }
 console.log("📊 Current session:", session ? "Active" : "None");
 
 const { error } = await supabase.auth.signOut();
 
 if (error) {
 console.error("❌ Supabase signOut error:", {
 message: error.message,
 status: (error as any).status,
 statusText: (error as any).statusText,
 fullError: error
 });
 
 // Even if signOut fails, clear local state
 // This ensures the user can at least be redirected away
 currentUser = null;
 clearRememberedRocketChatPassword();
 console.log("⚠️ Forcing local sign-out due to server error");
 return { success: false, error: error.message };
 }
 
 console.log("✅ Sign out successful");
 currentUser = null;
 clearRememberedRocketChatPassword();
 return { success: true };
 } catch (error) {
 console.error("❌ Sign out exception:", {
 message: error instanceof Error ? error.message : String(error),
 error
 });
 
 // Force local sign-out even on exception
 currentUser = null;
 clearRememberedRocketChatPassword();
 const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
 return { success: false, error: errorMessage };
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
    case "admin": {
      const adminUrl = `${origin}/src/pages/admin/home.html`;
      window.location.href = adminUrl;
      break;
    }
 case "teacher": {
 const teacherUrl = `${origin}/src/pages/teacher/home.html`;
 window.location.href = teacherUrl;
 break;
 }
 case "student": {
 const studentUrl = `${origin}/src/pages/student/home.html`;
 window.location.href = studentUrl;
 break;
 }
 default: {
 console.warn("❌ Unknown role, defaulting to student:", userRole);
 const defaultUrl = `${origin}/src/pages/student/home.html`;
 window.location.href = defaultUrl;
 }
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

 // Show loading state
 const submitButton = form.querySelector('button[type="submit"]') as HTMLButtonElement;
 const originalText = submitButton.textContent;
 submitButton.textContent = 'Creating account...';
 submitButton.disabled = true;

 try {
 
 const result = await signUp(email, password, firstName, lastName || null, role);

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
