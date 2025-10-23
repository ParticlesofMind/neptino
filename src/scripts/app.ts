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
  // Check if this is a PIXI.js related error
  if (event.error && event.error.message) {
    const errorMessage = event.error.message.toLowerCase();
    
    // Handle common PIXI.js errors gracefully
    if (errorMessage.includes('cannot read properties of null') || 
        errorMessage.includes('destroy') ||
        errorMessage.includes('batcher') ||
        errorMessage.includes('pool') ||
        errorMessage.includes('graphics') ||
        errorMessage.includes('batchablegraphics') ||
        errorMessage.includes('poolgroup') ||
        errorMessage.includes('globalresourceregistry') ||
        errorMessage.includes('cannot convert undefined or null to object') ||
        errorMessage.includes('glshadersystem') ||
        errorMessage.includes('object.keys')) {
      console.warn('⚠️ PIXI.js rendering error (handled gracefully):', event.error.message);
      event.preventDefault(); // Prevent the error from crashing the app
      return;
    }
  }
  
  console.error('Global error:', event.error);
});

// Global unhandled promise rejection handling
window.addEventListener('unhandledrejection', (event) => {
  // Check if this is a PIXI.js related promise rejection
  if (event.reason && event.reason.message) {
    const errorMessage = event.reason.message.toLowerCase();
    
    // Handle common PIXI.js promise rejections gracefully
    if (errorMessage.includes('cannot read properties of null') || 
        errorMessage.includes('destroy') ||
        errorMessage.includes('batcher') ||
        errorMessage.includes('pool') ||
        errorMessage.includes('graphics') ||
        errorMessage.includes('batchablegraphics') ||
        errorMessage.includes('poolgroup') ||
        errorMessage.includes('globalresourceregistry') ||
        errorMessage.includes('cannot convert undefined or null to object') ||
        errorMessage.includes('glshadersystem') ||
        errorMessage.includes('object.keys')) {
      console.warn('⚠️ PIXI.js promise rejection (handled gracefully):', event.reason.message);
      event.preventDefault(); // Prevent the rejection from crashing the app
      return;
    }
  }
  
  console.error('Unhandled promise rejection:', event.reason);
});

// Export for module system
export {};
