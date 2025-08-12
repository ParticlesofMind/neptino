/**
 * Main application entry point
 * This file serves as the global initialization for all pages
 */

import { initializeGlobalNavigation } from './navigation';
import { initAuth } from './backend/auth/auth';
import { AuthFormHandler } from './auth/AuthFormHandler';

// Initialize global navigation system
console.log('📱 Initializing Neptino app...');

// Initialize authentication system
initAuth();

// Initialize global navigation
initializeGlobalNavigation();
console.log('🧭 Global navigation initialized');

// Initialize auth form handlers on auth pages
document.addEventListener('DOMContentLoaded', () => {
  // Check if we're on an auth page
  const isAuthPage = window.location.pathname.includes('/pages/shared/signin.html') || 
                     window.location.pathname.includes('/pages/shared/signup.html');
  
  if (isAuthPage) {
    new AuthFormHandler();
    console.log('🔐 Auth form handler initialized');
  }
});

// Global app initialization
console.log('📱 Neptino app initialized');

// Global error handling
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

// Global unhandled promise rejection handling
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

// Export for module system
export {};
