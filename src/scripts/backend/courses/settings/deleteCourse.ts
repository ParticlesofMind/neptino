/**
 * Delete Course Functionality
 * Handles the deletion of courses with confirmation and cleanup
 */

import { supabase } from '../../supabase';

interface CourseDeleteResult {
  success: boolean;
  message: string;
  error?: any;
}

/**
 * Delete Course Manager
 * Handles course deletion with proper confirmation flow
 */
export class DeleteCourseManager {
  private courseId: string | null = null;
  private deleteButton: HTMLButtonElement | null = null;
  private confirmationModal: HTMLElement | null = null;

  constructor(courseId?: string) {
    this.courseId = courseId || this.getCourseIdFromStorage();
    this.initialize();
  }

  private initialize(): void {
    this.deleteButton = document.getElementById('delete-course-btn') as HTMLButtonElement;
    this.setupEventListeners();
  }

  private getCourseIdFromStorage(): string | null {
    return sessionStorage.getItem("currentCourseId");
  }

  private setupEventListeners(): void {
    if (this.deleteButton) {
      this.deleteButton.addEventListener('click', (e) => {
        e.preventDefault();
        this.showDeleteConfirmation();
      });
    }
  }

  private showDeleteConfirmation(): void {
    // Create confirmation modal dynamically
    const modalHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" data-modal id="delete-course-modal">
        <div class="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" data-modal-content>
          <div class="flex items-start justify-between">
            <h2 class="text-xl font-semibold text-neutral-900">Delete Course</h2>
            <button class="inline-flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100" data-modal-close type="button">
              &times;
            </button>
          </div>
          <div class="mt-4 space-y-2 text-sm text-neutral-700">
            <p>
              Are you sure you want to delete this course?
            </p>
            <p class="text-sm text-red-600">
              <strong>This action cannot be undone.</strong> All course data will be permanently removed.
            </p>
          </div>
          <div class="mt-6 flex justify-end gap-3">
            <button class="inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-50" type="button" id="cancel-delete-btn">
              No
            </button>
            <button class="inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700" type="button" id="confirm-delete-btn">
              Yes
            </button>
          </div>
        </div>
      </div>
    `;

    // Add modal to DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Get modal elements
    this.confirmationModal = document.getElementById('delete-course-modal');
    const confirmButton = document.getElementById('confirm-delete-btn') as HTMLButtonElement;
    const cancelButton = document.getElementById('cancel-delete-btn') as HTMLButtonElement;
    const closeButton = this.confirmationModal?.querySelector('[data-modal-close]') as HTMLButtonElement;

    // Setup event listeners
    confirmButton?.addEventListener('click', () => this.confirmDelete());
    cancelButton?.addEventListener('click', () => this.hideDeleteConfirmation());
    closeButton?.addEventListener('click', () => this.hideDeleteConfirmation());

    // Close on backdrop click
    this.confirmationModal?.addEventListener('click', (e) => {
      if (e.target === this.confirmationModal) {
        this.hideDeleteConfirmation();
      }
    });

    // Close on Escape key
    const escapeHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && this.confirmationModal) {
        this.hideDeleteConfirmation();
        document.removeEventListener('keydown', escapeHandler);
      }
    };
    document.addEventListener('keydown', escapeHandler);

    // Show modal
    if (this.confirmationModal) {
      this.confirmationModal.classList.remove('hidden');
      document.body.classList.add('overflow-hidden');
    }
  }

  private hideDeleteConfirmation(): void {
    if (this.confirmationModal) {
      this.confirmationModal.remove();
      this.confirmationModal = null;
      document.body.classList.remove('overflow-hidden');
    }
  }

  private async confirmDelete(): Promise<void> {
    if (!this.courseId) {
      this.showNotification('No course ID found', 'error');
      return;
    }

    // Update button state
    const confirmButton = document.getElementById('confirm-delete-btn') as HTMLButtonElement;
    if (confirmButton) {
      confirmButton.textContent = 'Deleting...';
      confirmButton.disabled = true;
    }

    try {
      
      const result = await this.deleteCourseFromDatabase(this.courseId);

      if (result.success) {
        this.showNotification('Course deleted successfully', 'success');
        
        // Clean up local storage
        sessionStorage.removeItem("currentCourseId");
        localStorage.removeItem("coursebuilder_active_section");
        
        // Hide modal
        this.hideDeleteConfirmation();
        
        // Redirect to courses page after short delay
        setTimeout(() => {
          window.location.href = '/src/pages/teacher/courses.html';
        }, 2000);
        
      } else {
        throw new Error(result.message || 'Failed to delete course');
      }

    } catch (error) {
      console.error('❌ Error deleting course:', error);
      this.showNotification(`Failed to delete course: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      
      // Reset button state
      if (confirmButton) {
        confirmButton.textContent = 'Yes';
        confirmButton.disabled = false;
      }
    }
  }

  private async deleteCourseFromDatabase(courseId: string): Promise<CourseDeleteResult> {
    try {
      // Delete related data first (foreign key constraints)
      // Note: Some tables have ON DELETE CASCADE, but we'll delete explicitly for clarity

      // Delete course sessions/schedules
      const { error: sessionsError } = await supabase
        .from('course_sessions')
        .delete()
        .eq('course_id', courseId);

      if (sessionsError) {
        console.warn('⚠️ Error deleting course sessions:', sessionsError.message);
      }

      // Delete lessons (has CASCADE but delete explicitly)
      const { error: lessonsError } = await supabase
        .from('lessons')
        .delete()
        .eq('course_id', courseId);

      if (lessonsError) {
        console.warn('⚠️ Error deleting lessons:', lessonsError.message);
      }

      // Delete canvases (has CASCADE but delete explicitly)
      const { error: canvasesError } = await supabase
        .from('canvases')
        .delete()
        .eq('course_id', courseId);

      if (canvasesError) {
        console.warn('⚠️ Error deleting canvases:', canvasesError.message);
      }

      // Delete course templates (has CASCADE but delete explicitly)
      const { error: templatesError } = await supabase
        .from('templates')
        .delete()
        .eq('course_id', courseId);

      if (templatesError) {
        console.warn('⚠️ Error deleting templates:', templatesError.message);
      }

      // Delete students (has CASCADE but delete explicitly)
      const { error: studentsError } = await supabase
        .from('students')
        .delete()
        .eq('course_id', courseId);

      if (studentsError) {
        console.warn('⚠️ Error deleting students:', studentsError.message);
      }

      // Delete enrollments (no CASCADE, must delete manually)
      const { error: enrollmentsError } = await supabase
        .from('enrollments')
        .delete()
        .eq('course_id', courseId);

      if (enrollmentsError) {
        console.warn('⚠️ Error deleting enrollments:', enrollmentsError.message);
      }

      // Delete the main course record (this will cascade to tables with CASCADE)
      const { error: courseError } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId);

      if (courseError) {
        throw new Error(`Failed to delete course: ${courseError.message}`);
      }

      return {
        success: true,
        message: 'Course deleted successfully'
      };

    } catch (error) {
      console.error('❌ Database deletion error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown database error',
        error
      };
    }
  }

  private showNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    // Create notification element
    const notification = document.createElement('div');
    const toneClasses =
      type === 'success'
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : type === 'error'
        ? 'bg-red-50 text-red-700 border-red-200'
        : 'bg-slate-50 text-slate-700 border-slate-200';
    notification.className = `fixed right-6 top-6 z-50 w-[320px] rounded-lg border px-4 py-3 shadow-lg opacity-0 translate-y-2 transition ${toneClasses}`;
    notification.innerHTML = `
      <div class="flex items-center justify-between gap-3">
        <span class="text-sm font-medium">${message}</span>
        <button class="inline-flex h-6 w-6 items-center justify-center rounded-md text-current/70 hover:text-current">&times;</button>
      </div>
    `;

    // Add to DOM
    document.body.appendChild(notification);

    // Show with animation
    setTimeout(() => {
      notification.classList.remove('opacity-0', 'translate-y-2');
      notification.classList.add('opacity-100', 'translate-y-0');
    }, 10);

    // Auto-hide after 5 seconds
    setTimeout(() => {
      this.hideNotification(notification);
    }, 5000);

    // Close button functionality
    const closeBtn = notification.querySelector('button');
    closeBtn?.addEventListener('click', () => {
      this.hideNotification(notification);
    });
  }

  private hideNotification(notification: HTMLElement): void {
    notification.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => {
      notification.remove();
    }, 300);
  }

  /**
   * Update course ID for the delete manager
   */
  public setCourseId(courseId: string): void {
    this.courseId = courseId;
  }

  /**
   * Get current course ID
   */
  public getCourseId(): string | null {
    return this.courseId;
  }

  /**
   * Destroy the delete manager and clean up event listeners
   */
  public destroy(): void {
    if (this.confirmationModal) {
      this.hideDeleteConfirmation();
    }
  }
}

// Export for use in other modules
export default DeleteCourseManager;
