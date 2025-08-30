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
   return;
  }

  // Update the course ID value display
  const codeValueElement = document.getElementById('course-id-value');
  if (codeValueElement) {
  codeValueElement.textContent = courseId;
  }

  // Store the course ID in the copy button's data attribute
  if (this.courseCopyBtn) {
  this.courseCopyBtn.setAttribute('data-course-id', courseId);
  this.courseCopyBtn.setAttribute('title', `Copy course ID: ${courseId}`);
  }

  // Show the course code display
  this.courseCodeDisplay.style.display = 'flex';
 }

 /**
 * Copy course ID to clipboard
 */
 private async copyToClipboard(): Promise<void> {
 if (!this.courseCopyBtn) return;

 const courseId = this.courseCopyBtn.getAttribute('data-course-id');
 if (!courseId) {
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
 <svg class="coursebuilder-course-code__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
 <polyline points="20,6 9,17 4,12"></polyline>
 </svg>
 `;
 this.courseCopyBtn.classList.add('coursebuilder-course-code__copy--success');
 } else {
 this.courseCopyBtn.title = 'Copy failed';
 this.courseCopyBtn.classList.add('coursebuilder-course-code__copy--error');
 }

 // Reset after 2 seconds
 setTimeout(() => {
 if (this.courseCopyBtn) {
 this.courseCopyBtn.title = originalTitle;
 this.courseCopyBtn.innerHTML = originalIcon;
 this.courseCopyBtn.classList.remove(
 'coursebuilder-course-code__copy--success',
 'coursebuilder-course-code__copy--error'
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
