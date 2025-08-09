// ==========================================================================
// NAVIGATION INDEX
// ==========================================================================

import { AsideNavigation } from './aside/aside';
import { CourseBuilderNavigation } from './coursebuilder/coursebuilder';

// Navigation initialization based on page type
export function initNavigation(): void {
  const path = window.location.pathname;
  
  // Initialize aside navigation for pages that have it
  if (hasAsideNavigation(path)) {
    new AsideNavigation();
  }
  
  // Initialize course builder navigation
  if (isCourseBuilderPage(path)) {
    new CourseBuilderNavigation();
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
