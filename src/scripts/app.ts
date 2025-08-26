/**
 * Main application entry point
 * This file serves as the global initialization for all pages
 */

import { initializeGlobalNavigation, initializeDashboardNavigation } from './navigation';
import { initAuth, AuthFormHandler } from './backend/auth/auth';
import './backend/courses/settings/pageSetupHandler';
import './coursebuilder/canvasInit'; // Initialize canvas system
// import PageTransitions from './navigation/PageTransitions'; // DISABLED

// Initialize global navigation system
console.log('📱 Initializing Neptino app...');

// Initialize authentication system
initAuth();

// Initialize global navigation
initializeGlobalNavigation();
console.log('🧭 Global navigation initialized');

// Initialize dashboard navigation if present
const dashboardNav = initializeDashboardNavigation();
if (dashboardNav) {
  console.log('📊 Dashboard navigation initialized');
}

// Initialize page transitions for smooth navigation
// new PageTransitions(); // DISABLED - causing script initialization issues
// console.log('🔄 Page transitions initialized');

// Initialize auth form handlers on auth pages
document.addEventListener('DOMContentLoaded', () => {
 // Check if we're on an auth page
 const isAuthPage = window.location.pathname.includes('/pages/shared/signin.html') || 
 window.location.pathname.includes('/pages/shared/signup.html');
 
 if (isAuthPage) {
 new AuthFormHandler();
 console.log('🔐 Auth form handler initialized');
 }

 // Initialize page setup handler for coursebuilder pages
 const isCourseBuilderPage = window.location.pathname.includes('coursebuilder');
 if (isCourseBuilderPage) {
   // Import and initialize page setup handler
   import('./backend/courses/settings/pageSetupHandler').then(({ pageSetupHandler }) => {
     // Get course ID from URL or session storage
     const urlParams = new URLSearchParams(window.location.search);
     const courseId = urlParams.get('courseId') || urlParams.get('id') || sessionStorage.getItem('currentCourseId');
     
     if (courseId) {
       pageSetupHandler.setCourseId(courseId);
       console.log('📄 Page setup handler initialized with course ID:', courseId);
     } else {
       console.log('📄 Page setup handler initialized (no course ID yet)');
     }
   }).catch(error => {
     console.error('Failed to initialize page setup handler:', error);
   });
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
