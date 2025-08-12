/**
 * Main application entry point
 * This file serves as the global initialization for all pages
 */

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
