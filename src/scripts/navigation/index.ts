// ==========================================================================
// NAVIGATION INDEX
// ==========================================================================

import { AsideNavigation } from './aside/aside';
import { CourseBuilderNavigation } from './coursebuilder/coursebuilder';

// Global navigation instances
let asideNavigationInstance: AsideNavigation | null = null;
let courseBuilderNavigationInstance: CourseBuilderNavigation | null = null;

// Navigation initialization based on page type
export function initNavigation(): void {
  const path = window.location.pathname;
  
  // Initialize course builder navigation first (it handles section switching)
  if (isCourseBuilderPage(path)) {
    courseBuilderNavigationInstance = new CourseBuilderNavigation();
    
    // Listen for section changes to manage aside navigation
    window.addEventListener('hashchange', handleCourseBuilderSectionChange);
    
    // Initialize aside navigation based on current section
    handleCourseBuilderSectionChange();
  }
  
  // For non-coursebuilder pages, initialize aside navigation normally
  if (hasAsideNavigation(path) && !isCourseBuilderPage(path)) {
    asideNavigationInstance = new AsideNavigation();
  }
}

// Handle section changes in coursebuilder to manage aside navigation
function handleCourseBuilderSectionChange(): void {
  if (!isCourseBuilderPage(window.location.pathname)) return;
  
  const hash = window.location.hash.substring(1);
  console.log(`🧭 Section changed to: ${hash}`);
  
  // Only initialize aside navigation for setup section
  if (hash === 'setup' || (!hash && window.location.pathname.includes('coursebuilder.html'))) {
    if (!asideNavigationInstance) {
      console.log('🧭 Initializing aside navigation for setup section');
      asideNavigationInstance = new AsideNavigation();
    }
  } else {
    // Clean up aside navigation when leaving setup
    if (asideNavigationInstance) {
      console.log('🧭 Cleaning up aside navigation (leaving setup section)');
      asideNavigationInstance.destroy();
      asideNavigationInstance = null;
    }
  }
}

// Check if current page has aside navigation
function hasAsideNavigation(path: string): boolean {
  return path.includes('/pages/teacher/home.html') ||
         path.includes('/pages/teacher/coursebuilder.html') ||
         path.includes('/pages/student/home.html') ||
         path.includes('/pages/admin/home.html');
}

// Check if current page is course builder
function isCourseBuilderPage(path: string): boolean {
  return path.includes('/pages/teacher/coursebuilder.html');
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
});
