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
    this.courseCard = document.querySelector('.card.card--course:not([data-dynamic])') as HTMLElement;
    
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
    const imageContainer = this.courseCard.querySelector('.card__media');
    if (imageContainer) {
      const imgElement = imageContainer.querySelector('img') as HTMLImageElement;
      if (imgElement && courseData.course_image) {
        imgElement.src = courseData.course_image;
        imgElement.alt = `${courseData.course_name} Course`;
      }
    }

    // Update status
    const statusElement = this.courseCard.querySelector('.card__status-badge');
    if (statusElement) {
      statusElement.textContent = formatCourseStatus(courseData.status);
      statusElement.className = `card__status-badge ${getStatusClassName(courseData.status)}`;
    }

    // Update title
    const titleElement = this.courseCard.querySelector('.card__title');
    if (titleElement) {
      titleElement.textContent = courseData.course_name;
    }

    // Update description
    const descriptionElement = this.courseCard.querySelector('.card__description');
    if (descriptionElement) {
      descriptionElement.textContent = courseData.course_description || 'No description available.';
    }

    // Update student count
    const studentsInfo = this.courseCard.querySelector('.card__info');
    if (studentsInfo && studentsInfo.querySelector('.icon--students')) {
      const count = courseData.student_count || 0;
      studentsInfo.innerHTML = `<i class="icon icon--students"></i> ${count} student${count !== 1 ? 's' : ''}`;
    }

    // Update lessons count - find the second card__info element
    const allInfoElements = this.courseCard.querySelectorAll('.card__info');
    const lessonsInfo = Array.from(allInfoElements).find(el => el.querySelector('.icon--lessons'));
    if (lessonsInfo) {
      const count = courseData.lesson_count || 0;
      lessonsInfo.innerHTML = `<i class="icon icon--lessons"></i> ${count} lesson${count !== 1 ? 's' : ''}`;
    }
  }

  private updateCardActions(courseId: string): void {
    if (!this.courseCard) return;

    // Update all action buttons to include courseId
    const actionButtons = this.courseCard.querySelectorAll('.card__action');
    actionButtons.forEach(button => {
      const link = button as HTMLAnchorElement;
      const href = link.getAttribute('href');
      
      if (href) {
        // Add courseId parameter to the URL
        const url = new URL(href, window.location.origin);
        url.searchParams.set('courseId', courseId);
        link.href = url.toString();
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
  const staticCourseCard = document.querySelector('.card.card--course:not([data-dynamic])');
  if (staticCourseCard) {
    initializeStaticCourseCardManager();
  }
});
