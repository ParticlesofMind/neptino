// ==========================================================================
// NAVIGATION INDEX
// ==========================================================================

import { AsideNavigation } from './aside/aside';

// Navigation initialization based on page type
export function initNavigation(): void {
  const path = window.location.pathname;
  
  // Initialize aside navigation for pages that have it
  if (hasAsideNavigation(path)) {
    new AsideNavigation();
  }
  
  // Add other navigation types here as needed
  // if (hasHeaderNavigation(path)) {
  //   new HeaderNavigation();
  // }
}

// Check if current page has aside navigation
function hasAsideNavigation(path: string): boolean {
  return path.includes('/pages/teacher/home.html') ||
         path.includes('/pages/student/home.html') ||
         path.includes('/pages/admin/home.html');
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
});
