/**
 * Neptino Educational Platform
 * Main TypeScript entry point
 */

import { authManager } from './auth'
import { supabase } from './supabase'

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Neptino Educational Platform - Loading...');
  
  // Initialize app components
  initializeApp();
});

/**
 * Initialize the main application
 */
async function initializeApp(): Promise<void> {
  console.log('🔗 Connecting to Supabase...');
  
  try {
    // Test Supabase connection
    const { data, error } = await supabase.from('profiles').select('count').limit(1)
    if (error && error.code !== 'PGRST116') { // PGRST116 = table doesn't exist yet
      console.warn('⚠️ Supabase connection issue:', error.message)
      console.log('📋 Please set up your database schema first')
    } else {
      console.log('✅ Supabase connected successfully')
    }
  } catch (error) {
    console.warn('⚠️ Supabase connection failed:', error)
    console.log('🔧 Please check your .env configuration')
  }
  
  // Initialize authentication
  console.log('🔐 Initializing authentication...')
  
  // Initialize router
  initializeRouter()
  
  console.log('✅ Neptino Educational Platform - Ready!');
}

/**
 * Simple router for different views
 */
function initializeRouter(): void {
  // Handle hash-based routing
  function handleRoute() {
    const hash = window.location.hash.slice(1) || '/'
    const app = document.getElementById('app')
    
    if (!app) return
    
    // Check authentication for protected routes
    if (hash !== '/login' && hash !== '/signup' && hash !== '/' && !authManager.isAuthenticated()) {
      window.location.hash = '#/login'
      return
    }
    
    // Route to appropriate view
    switch (hash) {
      case '/':
        renderLandingPage(app)
        break
      case '/login':
        renderLoginPage(app)
        break
      case '/signup':
        renderSignupPage(app)
        break
      case '/student/dashboard':
        renderStudentDashboard(app)
        break
      case '/teacher/dashboard':
        renderTeacherDashboard(app)
        break
      case '/admin/dashboard':
        renderAdminDashboard(app)
        break
      default:
        render404Page(app)
    }
  }
  
  // Listen for hash changes
  window.addEventListener('hashchange', handleRoute)
  
  // Initial route
  handleRoute()
}

/**
 * Render functions for different pages
 */
function renderLandingPage(app: HTMLElement): void {
  app.innerHTML = `
    <div class="landing-page">
      <h1>Welcome to Neptino Educational Platform</h1>
      <p>Your interactive learning experience awaits!</p>
      <div class="auth-buttons">
        <a href="#/login" class="btn btn-primary">Login</a>
        <a href="#/signup" class="btn btn-secondary">Sign Up</a>
      </div>
    </div>
  `
}

function renderLoginPage(app: HTMLElement): void {
  app.innerHTML = `
    <div class="auth-page">
      <h2>Login to Neptino</h2>
      <form id="login-form">
        <input type="email" id="email" placeholder="Email" required>
        <input type="password" id="password" placeholder="Password" required>
        <button type="submit">Login</button>
      </form>
      <p><a href="#/signup">Don't have an account? Sign up</a></p>
    </div>
  `
  
  // Add form handler
  const form = document.getElementById('login-form') as HTMLFormElement
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const email = (document.getElementById('email') as HTMLInputElement).value
    const password = (document.getElementById('password') as HTMLInputElement).value
    
    const { success, error } = await authManager.signIn(email, password)
    if (!success) {
      alert(`Login failed: ${error}`)
    }
  })
}

function renderSignupPage(app: HTMLElement): void {
  app.innerHTML = `
    <div class="auth-page">
      <h2>Sign Up for Neptino</h2>
      <form id="signup-form">
        <input type="text" id="fullName" placeholder="Full Name" required>
        <input type="email" id="email" placeholder="Email" required>
        <input type="password" id="password" placeholder="Password" required>
        <select id="userType" required>
          <option value="">Select User Type</option>
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
        </select>
        <button type="submit">Sign Up</button>
      </form>
      <p><a href="#/login">Already have an account? Login</a></p>
    </div>
  `
  
  // Add form handler
  const form = document.getElementById('signup-form') as HTMLFormElement
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const fullName = (document.getElementById('fullName') as HTMLInputElement).value
    const email = (document.getElementById('email') as HTMLInputElement).value
    const password = (document.getElementById('password') as HTMLInputElement).value
    const userType = (document.getElementById('userType') as HTMLSelectElement).value as 'student' | 'teacher'
    
    const { success, error } = await authManager.signUp(email, password, fullName, userType)
    if (success) {
      alert('Sign up successful! Please check your email to verify your account.')
      window.location.hash = '#/login'
    } else {
      alert(`Sign up failed: ${error}`)
    }
  })
}

function renderStudentDashboard(app: HTMLElement): void {
  const user = authManager.getUserProfile()
  app.innerHTML = `
    <div class="dashboard student-dashboard">
      <h2>Student Dashboard</h2>
      <p>Welcome, ${user?.full_name || 'Student'}!</p>
      <button id="logout-btn">Logout</button>
    </div>
  `
  
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    authManager.signOut()
  })
}

function renderTeacherDashboard(app: HTMLElement): void {
  const user = authManager.getUserProfile()
  app.innerHTML = `
    <div class="dashboard teacher-dashboard">
      <h2>Teacher Dashboard</h2>
      <p>Welcome, ${user?.full_name || 'Teacher'}!</p>
      <button id="logout-btn">Logout</button>
    </div>
  `
  
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    authManager.signOut()
  })
}

function renderAdminDashboard(app: HTMLElement): void {
  const user = authManager.getUserProfile()
  app.innerHTML = `
    <div class="dashboard admin-dashboard">
      <h2>Admin Dashboard</h2>
      <p>Welcome, ${user?.full_name || 'Admin'}!</p>
      <button id="logout-btn">Logout</button>
    </div>
  `
  
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    authManager.signOut()
  })
}

function render404Page(app: HTMLElement): void {
  app.innerHTML = `
    <div class="error-page">
      <h2>404 - Page Not Found</h2>
      <p>The page you're looking for doesn't exist.</p>
      <a href="#/" class="btn">Go Home</a>
    </div>
  `
}
