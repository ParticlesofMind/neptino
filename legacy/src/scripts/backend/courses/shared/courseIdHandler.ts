// ==========================================================================
// COURSE ID DISPLAY AND COPY HANDLER
// ==========================================================================

export class CourseIdHandler {
 private static instance: CourseIdHandler;
 private courseCodeDisplay: HTMLElement | null = null;
 private courseCopyBtn: HTMLButtonElement | null = null;

 constructor() {
 if (CourseIdHandler.instance) {
 return CourseIdHandler.instance;
 }

 CourseIdHandler.instance = this;
 this.initialize();
 }

 private initialize(): void {
 this.courseCodeDisplay = document.getElementById('course-code-display');
 this.courseCopyBtn = document.getElementById('course-code-copy-btn') as HTMLButtonElement;

 if (this.courseCopyBtn) {
 this.courseCopyBtn.addEventListener('click', () => this.copyToClipboard());
 }
 }

 /**
 * Show the course ID after course creation
 */
 public showCourseId(courseId: string): void {
 if (!this.courseCodeDisplay) {
 console.warn('Course code display element not found');
 return;
 }

 // Update the course ID value display
 const codeValueElement = document.getElementById('course-id-value');
 if (codeValueElement) {
 codeValueElement.textContent = courseId;
 }
 
 // Store the course ID in the copy button's data attribute and enable it
 if (this.courseCopyBtn) {
 this.courseCopyBtn.setAttribute('data-course-id', courseId);
 this.courseCopyBtn.setAttribute('title', `Copy course ID: ${courseId}`);
 this.courseCopyBtn.disabled = false;
 }

 // Show the course code display
 this.courseCodeDisplay.removeAttribute('hidden');
 
 }

 /**
 * Copy course ID to clipboard
 */
 private async copyToClipboard(): Promise<void> {
 if (!this.courseCopyBtn) return;

 const courseId = this.courseCopyBtn.getAttribute('data-course-id');
 if (!courseId) {
 console.warn('No course ID to copy');
 return;
 }

 try {
 if (navigator.clipboard && window.isSecureContext) {
 // Use modern clipboard API
 await navigator.clipboard.writeText(courseId);
 } else {
 // Fallback for older browsers
 this.fallbackCopyToClipboard(courseId);
 }

 // Show success feedback
 this.showCopyFeedback(true);


 } catch (error) {
 console.error('Failed to copy course ID:', error);
 this.showCopyFeedback(false);
 }
 }

 /**
 * Fallback copy method for older browsers
 */
 private fallbackCopyToClipboard(text: string): void {
 const textArea = document.createElement('textarea');
 textArea.value = text;
 textArea.style.position = 'fixed';
 textArea.style.left = '-9999px';
 textArea.style.top = '-9999px';
 document.body.appendChild(textArea);
 textArea.focus();
 textArea.select();

 try {
 const successful = document.execCommand('copy');
 if (!successful) {
 throw new Error('execCommand failed');
 }
 } finally {
 document.body.removeChild(textArea);
 }
 }

 /**
 * Show visual feedback for copy action
 */
 private showCopyFeedback(success: boolean): void {
 if (!this.courseCopyBtn) return;

 const originalTitle = this.courseCopyBtn.title;
 const originalIcon = this.courseCopyBtn.innerHTML;

 if (success) {
 this.courseCopyBtn.title = 'Copied!';
 this.courseCopyBtn.innerHTML = `
 <svg class="h-4 w-4" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
 <polyline points="20,6 9,17 4,12"></polyline>
 </svg>
 `;
 this.courseCopyBtn.classList.add('text-emerald-600');
 } else {
 this.courseCopyBtn.title = 'Copy failed';
 this.courseCopyBtn.classList.add('text-red-600');
 }

 // Reset after 2 seconds
 setTimeout(() => {
 if (this.courseCopyBtn) {
 this.courseCopyBtn.title = originalTitle;
 this.courseCopyBtn.innerHTML = originalIcon;
 this.courseCopyBtn.classList.remove(
 'text-emerald-600',
 'text-red-600'
 );
 }
 }, 2000);
 }

 /**
 * Hide the course ID display
 */
 public hideCourseId(): void {
 if (this.courseCodeDisplay) {
 this.courseCodeDisplay.style.display = 'none';
 }
 }

 /**
 * Get singleton instance
 */
 public static getInstance(): CourseIdHandler {
 if (!CourseIdHandler.instance) {
 CourseIdHandler.instance = new CourseIdHandler();
 }
 return CourseIdHandler.instance;
 }
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
 if (document.getElementById('course-code-display')) {
 new CourseIdHandler();
 }
});
