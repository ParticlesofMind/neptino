/**
 * Pages Module - Multi-page scrollable canvas system
 * 
 * This module provides a complete multi-page canvas system with:
 * - Single canvas, multiple scrollable pages
 * - Metadata-populated headers and footers
 * - Lazy loading and virtualization
 * - Smooth scrolling and navigation
 */

export { PageContainer } from "./PageContainer";
export { PageManager } from "./PageManager";
export {
  type PageMetadata,
  type MethodType,
  type SocialFormType,
  createDefaultMetadata,
  createSampleCourseData,
  formatDate,
  formatDuration,
} from "./PageMetadata";
