/**
 * Static Course Card Manager
 * 
 * This module handles updating static course cards with real course data
 * when a courseId is available (e.g., from URL parameters).
 */

import { getCurrentPageCourseWithStats, formatCourseStatus, getStatusClassName } from './courseStatistics';
import { getCourseId } from './courseId';

export class StaticCourseCardManager {
  private courseCard: HTMLElement | null = null;

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    // Find the static course card
    this.courseCard = document.querySelector('[data-course-card][data-static-course-card]') as HTMLElement;
    
    if (!this.courseCard) {
      return;
    }

    // Try to update with real data if courseId is available
    await this.updateWithRealData();
  }

  private async updateWithRealData(): Promise<void> {
    if (!this.courseCard) {
      return;
    }

    const courseId = getCourseId();
    if (!courseId) {
      return;
    }

    try {
      const courseData = await getCurrentPageCourseWithStats();
      
      if (!courseData) {
        console.warn('⚠️ Could not load course data for courseId:', courseId);
        return;
      }

      this.updateCardContent(courseData);
      this.updateCardActions(courseId);
      
    } catch (error) {
      console.error('❌ Error updating static course card:', error);
    }
  }

  private updateCardContent(courseData: any): void {
    if (!this.courseCard) return;

    // Update course image
    const imageContainer = this.courseCard.querySelector('[data-course-card-media]');
    if (imageContainer) {
      const imgElement = imageContainer.querySelector('img') as HTMLImageElement;
      if (imgElement && courseData.course_image) {
        imgElement.src = courseData.course_image;
        imgElement.alt = `${courseData.course_name} Course`;
      }
    }

    // Update status
    const statusElement = this.courseCard.querySelector('[data-course-card-status]');
    if (statusElement) {
      statusElement.textContent = formatCourseStatus(courseData.status);
      statusElement.className = `inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${getStatusClassName(courseData.status)}`;
    }

    // Update title
    const titleElement = this.courseCard.querySelector('[data-course-card-title]');
    if (titleElement) {
      titleElement.textContent = courseData.course_name;
    }

    // Update description
    const descriptionElement = this.courseCard.querySelector('[data-course-card-description]');
    if (descriptionElement) {
      descriptionElement.textContent = courseData.course_description || 'No description available.';
    }

    // Update student count
    const studentsInfo = this.courseCard.querySelector('[data-course-card-info="students"]');
    if (studentsInfo) {
      const count = courseData.student_count || 0;
      const valueEl = studentsInfo.querySelector('[data-course-card-info-value]');
      const text = `${count} student${count !== 1 ? 's' : ''}`;
      if (valueEl) {
        valueEl.textContent = text;
      } else {
        studentsInfo.textContent = text;
      }
    }

    // Update lessons count
    const lessonsInfo = this.courseCard.querySelector('[data-course-card-info="lessons"]');
    if (lessonsInfo) {
      const count = courseData.lesson_count || 0;
      const valueEl = lessonsInfo.querySelector('[data-course-card-info-value]');
      const text = `${count} lesson${count !== 1 ? 's' : ''}`;
      if (valueEl) {
        valueEl.textContent = text;
      } else {
        lessonsInfo.textContent = text;
      }
    }
  }

  private updateCardActions(courseId: string): void {
    if (!this.courseCard) return;

    // Update all action buttons to include courseId
    const actionButtons = this.courseCard.querySelectorAll('[data-course-card-action]');
    actionButtons.forEach((button) => {
      if (!(button instanceof HTMLAnchorElement)) {
        return;
      }
      const href = button.getAttribute('href');

      if (href) {
        // Add courseId parameter to the URL
        const url = new URL(href, window.location.origin);
        url.searchParams.set('courseId', courseId);
        button.href = url.toString();
      }
    });
  }

  /**
   * Public method to refresh the card data
   */
  public async refresh(): Promise<void> {
    await this.updateWithRealData();
  }
}

/**
 * Initialize static course card manager for the current page
 */
export function initializeStaticCourseCardManager(): StaticCourseCardManager {
  return new StaticCourseCardManager();
}

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Only initialize if we're on a page that has static course cards
  const staticCourseCard = document.querySelector('[data-course-card][data-static-course-card]');
  if (staticCourseCard) {
    initializeStaticCourseCardManager();
  }
});
