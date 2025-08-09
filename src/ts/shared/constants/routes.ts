/**
 * Route constants for the application
 */

export const ROUTES = {
  // Public routes
  HOME: '/',
  ABOUT: '/src/pages/shared/about.html',
  PRICING: '/src/pages/shared/pricing.html',
  SIGNIN: '/src/pages/shared/signin.html',
  SIGNUP: '/src/pages/shared/signup.html',

  // Protected routes - will be created later
  STUDENT_DASHBOARD: '/src/pages/student/dashboard.html',
  TEACHER_DASHBOARD: '/src/pages/teacher/dashboard.html',
  ADMIN_DASHBOARD: '/src/pages/admin/dashboard.html',

  // API endpoints (if needed for client-side routing)
  API: {
    AUTH: '/auth',
    USERS: '/users',
    COURSES: '/courses'
  }
} as const;

export const PUBLIC_ROUTES = [
  ROUTES.HOME,
  ROUTES.ABOUT,
  ROUTES.PRICING,
  ROUTES.SIGNIN,
  ROUTES.SIGNUP
] as const;

export const ROLE_ROUTES = {
  student: ROUTES.STUDENT_DASHBOARD,
  teacher: ROUTES.TEACHER_DASHBOARD,
  administrator: ROUTES.ADMIN_DASHBOARD
} as const;
