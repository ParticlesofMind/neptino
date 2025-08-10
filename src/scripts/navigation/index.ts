// ==========================================================================
// NAVIGATION INDEX
// ==========================================================================

import { AsideNavigation } from './aside/aside';
import { CourseBuilderNavigation } from './coursebuilder/coursebuilder';

// Navigation initialization based on page type
export function initNavigation(): void {
  const path = window.location.pathname;
  
  // Initialize course builder navigation first (it handles section switching)
  if (isCourseBuilderPage(path)) {
    new CourseBuilderNavigation();
  }
  
  // Initialize aside navigation for pages that have it
  // But NOT for coursebuilder unless we're specifically in the setup section
  if (hasAsideNavigation(path)) {
    if (isCourseBuilderPage(path)) {
      // On coursebuilder, only init aside navigation if we're in setup section
      // or if the hash indicates we should be in setup
      const hash = window.location.hash.substring(1);
      if (!hash || hash === 'setup') {
        new AsideNavigation();
      }
    } else {
      // On other pages, always init aside navigation
      new AsideNavigation();
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
