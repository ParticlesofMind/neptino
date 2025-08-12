/**
 * Navigation Index
 * Main entry point for navigation functionality
 */

export { CourseBuilderNavigation } from './coursebuilder-navigation.js';
export { AsideNavigation } from './aside.js';

// Initialize AsideNavigation when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Check if we're on a page that needs aside navigation
  const aside = document.querySelector('.aside');
  if (aside) {
    import('./aside.js').then(({ AsideNavigation }) => {
      new AsideNavigation();
      console.log('🧭 Aside Navigation initialized');
    });
  }
});
