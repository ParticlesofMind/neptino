/**
 * Main application entry point
 * This file serves as the global initialization for all pages
 */

import { initializeGlobalNavigation, initializeDashboardNavigation } from './navigation';
import { initAuth, AuthFormHandler } from './backend/auth/auth';
import './backend/courses/settings/pageSetupHandler';
import './coursebuilder/canvasInit'; // Initialize canvas system
// import PageTransitions from './navigation/PageTransitions'; // DISABLED



// Initialize authentication system
initAuth();

// Initialize global navigation
initializeGlobalNavigation();


// Initialize dashboard navigation if present
const dashboardNav = initializeDashboardNavigation();
if (dashboardNav) {

}


// Initialize auth form handlers on auth pages
document.addEventListener('DOMContentLoaded', () => {
 // Check if we're on an auth page
 const isAuthPage = window.location.pathname.includes('/pages/shared/signin.html') || 
 window.location.pathname.includes('/pages/shared/signup.html');
 
 if (isAuthPage) {
 new AuthFormHandler();

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
    
     } else {
    
     }
   }).catch(error => {
     console.error('Failed to initialize page setup handler:', error);
   });
 }
});



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
