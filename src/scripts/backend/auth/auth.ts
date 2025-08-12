/**
 * Authentication System
 * Handles user sign up, sign in, sign out, and role-based redirects
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

// Helper function to create user profile
async function createUserProfile(user: any) {
  try {

    const userMetadata = user.user_metadata || {};
    const fullName =
      userMetadata.full_name || user.email?.split("@")[0] || "User";
    const userRole = userMetadata.user_role || "student";

    const nameParts = fullName.split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    const { error: insertError } = await supabase.from("users").insert({
      id: user.id,
      first_name: firstName,
      last_name: lastName,
      email: user.email,
      role: userRole,
    });

    if (!insertError) {
      redirectUser(userRole);
    } else {
      console.error("❌ Failed to create profile:", insertError);
      // Still redirect as fallback
      redirectUser("student");
    }
  } catch (error) {
    console.error("❌ Unexpected error creating profile:", error);
    redirectUser("student");
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
