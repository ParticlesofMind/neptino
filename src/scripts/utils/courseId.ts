/**
 * Centralized Course ID Management Utilities
 * 
 * This module provides a single source of truth for course ID detection
 * and eliminates the need for session storage synchronization.
 */

/**
 * Get course ID from URL parameters
 * @returns Course ID if present in URL, null otherwise
 */
export function getCourseId(): string | null {
 const urlParams = new URLSearchParams(window.location.search);
 const courseId = urlParams.get('courseId') || urlParams.get('id');
 
 if (courseId) {
   /* empty */
 }
 
 return courseId;
}

/**
 * Check if we're in "create new course" mode (no course ID in URL)
 * @returns True if no course ID is present
 */
export function isNewCourseMode(): boolean {
 return getCourseId() === null;
}

/**
 * Navigate to course builder with specific course ID
 * @param courseId Course ID to navigate to
 * @param section Optional section to navigate to (e.g., 'classification')
 */
export function navigateToCourse(courseId: string, section?: string): void {
 const url = new URL(window.location.href);
 url.searchParams.set('courseId', courseId);
 
 if (section) {
 url.hash = `#${section}`;
 }
 
 window.location.href = url.toString();
}

/**
 * Validate that user has access to the course ID
 * This should be called by components that need to ensure data security
 * @param courseId Course ID to validate
 * @returns Promise that resolves to true if user has access
 */
export async function validateCourseAccess(courseId: string): Promise<boolean> {
 try {
 // This would make a backend call to verify access
 const { supabase } = await import('../backend/supabase.js');
 
 const { data, error } = await supabase
 .from('courses')
 .select('id')
 .eq('id', courseId)
 .single();
 
 return !error && data !== null;
 } catch (error) {
 console.error('Error validating course access:', error);
 return false;
 }
}

/**
 * Get course ID with validation
 * @returns Promise that resolves to course ID if valid, null otherwise
 */
export async function getValidatedCourseId(): Promise<string | null> {
 const courseId = getCourseId();
 
 if (!courseId) {
 return null;
 }
 
 const hasAccess = await validateCourseAccess(courseId);
 if (!hasAccess) {
 console.warn('⚠️ User does not have access to course:', courseId);
 return null;
 }
 
 return courseId;
}
