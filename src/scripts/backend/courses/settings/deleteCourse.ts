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
      <div class="modal modal--delete" id="delete-course-modal">
        <div class="modal__content">
          <div class="modal__header">
            <h2 class="modal__title">Delete Course</h2>
            <button class="button button--subtle button--small modal__close" type="button">
              &times;
            </button>
          </div>
          <div class="modal__body">
            <p class="modal__text">
              Are you absolutely sure you want to delete this course?
            </p>
            <p class="modal__warning">
              <strong>This action cannot be undone.</strong> All course data, including:
            </p>
            <ul class="modal__list">
              <li>Course content and materials</li>
              <li>Student enrollments and progress</li>
              <li>Templates and configurations</li>
              <li>Schedule and curriculum data</li>
            </ul>
            <p class="modal__text">will be permanently removed.</p>
            
            <div class="modal__confirmation">
              <label class="form__label">
                <input type="text" 
                       class="input" 
                       id="delete-confirmation-input" 
                       placeholder="Type 'DELETE' to confirm">
                Type <strong>DELETE</strong> to confirm deletion
              </label>
            </div>
          </div>
          <div class="modal__footer">
            <button class="button button--outline" type="button" id="cancel-delete-btn">
              Cancel
            </button>
            <button class="button button--delete" type="button" id="confirm-delete-btn" disabled>
              Delete Course Forever
            </button>
          </div>
        </div>
      </div>
    `;

    // Add modal to DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Get modal elements
    this.confirmationModal = document.getElementById('delete-course-modal');
    const confirmationInput = document.getElementById('delete-confirmation-input') as HTMLInputElement;
    const confirmButton = document.getElementById('confirm-delete-btn') as HTMLButtonElement;
    const cancelButton = document.getElementById('cancel-delete-btn') as HTMLButtonElement;
    const closeButton = this.confirmationModal?.querySelector('.modal__close') as HTMLButtonElement;

    // Setup confirmation input validation
    if (confirmationInput && confirmButton) {
      confirmationInput.addEventListener('input', () => {
        const isValid = confirmationInput.value.trim().toUpperCase() === 'DELETE';
        confirmButton.disabled = !isValid;
        
        if (isValid) {
          confirmButton.classList.remove('button--disabled');
        } else {
          confirmButton.classList.add('button--disabled');
        }
      });
    }

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
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.confirmationModal) {
        this.hideDeleteConfirmation();
      }
    });

    // Show modal
    if (this.confirmationModal) {
      this.confirmationModal.classList.add('modal--active');
      document.body.style.overflow = 'hidden';
    }

    // Focus on the confirmation input
    setTimeout(() => {
      confirmationInput?.focus();
    }, 100);
  }

  private hideDeleteConfirmation(): void {
    if (this.confirmationModal) {
      this.confirmationModal.remove();
      this.confirmationModal = null;
      document.body.style.overflow = '';
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
      confirmButton.innerHTML = 'Deleting...';
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
        confirmButton.innerHTML = 'Delete Course Forever';
        confirmButton.disabled = false;
      }
    }
  }

  private async deleteCourseFromDatabase(courseId: string): Promise<CourseDeleteResult> {
    try {
      // Delete related data first (foreign key constraints)

      // Delete course sessions/schedules
      const { error: sessionsError } = await supabase
        .from('course_sessions')
        .delete()
        .eq('course_id', courseId);

      if (sessionsError) {
        throw new Error(`Failed to delete course sessions: ${sessionsError.message}`);
      }

      // Delete course templates (if they exist)
      const { error: templatesError } = await supabase
        .from('templates')
        .delete()
        .eq('course_id', courseId);

      if (templatesError) {
        console.warn('⚠️ Error deleting templates (may not exist):', templatesError.message);
      }

      // Delete enrollments
      const { error: enrollmentsError } = await supabase
        .from('enrollments')
        .delete()
        .eq('course_id', courseId);

      if (enrollmentsError) {
        console.warn('⚠️ Error deleting enrollments (may not exist):', enrollmentsError.message);
      }

      // Delete the main course record
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
    notification.className = `notification notification--${type}`;
    notification.innerHTML = `
      <div class="notification__content">
        <span class="notification__message">${message}</span>
        <button class="notification__close">&times;</button>
      </div>
    `;

    // Add to DOM
    document.body.appendChild(notification);

    // Show with animation
    setTimeout(() => {
      notification.classList.add('notification--show');
    }, 10);

    // Auto-hide after 5 seconds
    setTimeout(() => {
      this.hideNotification(notification);
    }, 5000);

    // Close button functionality
    const closeBtn = notification.querySelector('.notification__close');
    closeBtn?.addEventListener('click', () => {
      this.hideNotification(notification);
    });
  }

  private hideNotification(notification: HTMLElement): void {
    notification.classList.remove('notification--show');
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
