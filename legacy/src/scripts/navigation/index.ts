/**
 * Centralized Navigation System
 * Clean, unified navigation for the entire Neptino platform
 */

// Global navigation for all pages
export { GlobalNavigation, initializeGlobalNavigation } from './GlobalNavigation';

// Specialized CourseBuilder navigation
export { CourseBuilderNavigation, AsideNavigation } from './CourseBuilderNavigation';

// Dashboard sidebar navigation
export { DashboardNavigation, initializeDashboardNavigation } from './DashboardNavigation';

// Canvas navigation for coursebuilder multi-canvas support
export { CanvasNavigator } from './CanvasNavigator';

// Canvas scroll navigation controls
export { CanvasScrollNav } from './CanvasScrollNav';
