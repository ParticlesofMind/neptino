// ==========================================================================
// COURSES PAGE - Load and display user courses with navigation
// ==========================================================================

import { getUserCourses } from '../backend/courses/createCourse';

interface Course {
  id: string;
  course_name: string;
  course_description: string;
  course_image?: string;
  course_language: string;
  created_at: string;
  updated_at: string;
  // Add other course properties as needed
}

export class CoursesManager {
  private coursesContainer: HTMLElement;
  private noCoursesMessage: HTMLElement;

  constructor() {
    this.coursesContainer = document.getElementById('courses-container') as HTMLElement;
    this.noCoursesMessage = document.getElementById('no-courses-message') as HTMLElement;
    
    this.initialize();
  }

  private async initialize(): Promise<void> {
    console.log('Initializing courses manager...');
    await this.loadCourses();
  }

  private async loadCourses(): Promise<void> {
    try {
      const courses = await getUserCourses();
      console.log('Loaded courses:', courses);
      
      if (courses && courses.length > 0) {
        this.displayCourses(courses);
        this.hideNoCoursesMessage();
      } else {
        this.showNoCoursesMessage();
      }
    } catch (error) {
      console.error('Error loading courses:', error);
      this.showNoCoursesMessage();
    }
  }

  private displayCourses(courses: Course[]): void {
    // Clear existing courses (except no-courses message)
    const existingCards = this.coursesContainer.querySelectorAll('.course-card');
    existingCards.forEach(card => card.remove());

    courses.forEach(course => {
      const courseCard = this.createCourseCard(course);
      this.coursesContainer.appendChild(courseCard);
    });
  }

  private createCourseCard(course: Course): HTMLElement {
    const cardElement = document.createElement('div');
    cardElement.className = 'course-card';
    cardElement.dataset.courseId = course.id;

    cardElement.innerHTML = `
      <div class="course-card__image-container">
        ${course.course_image 
          ? `<img src="${course.course_image}" alt="${course.course_name}" class="course-card__image">`
          : `<div class="course-card__image-placeholder">${this.getInitials(course.course_name)}</div>`
        }
      </div>
      
      <div class="course-card__content">
        <h3 class="course-card__title">${course.course_name}</h3>
      </div>
      
      <div class="course-card__navigation">
        <div class="course-card__nav-item" 
             data-section="setup" data-course-id="${course.id}">
          Setup
        </div>
        <div class="course-card__nav-item" 
             data-section="create" data-course-id="${course.id}">
          Create
        </div>
        <div class="course-card__nav-item" 
             data-section="preview" data-course-id="${course.id}">
          Preview
        </div>
        <div class="course-card__nav-item" 
             data-section="launch" data-course-id="${course.id}">
          Launch
        </div>
      </div>
    `;

    // Add click event listeners to navigation items
    this.addNavigationEventListeners(cardElement);

    return cardElement;
  }

  private addNavigationEventListeners(cardElement: HTMLElement): void {
    const navItems = cardElement.querySelectorAll('.course-card__nav-item');
    
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        
        const section = (item as HTMLElement).dataset.section;
        const courseId = (item as HTMLElement).dataset.courseId;
        
        if (section && courseId) {
          this.navigateToCourseSection(courseId, section);
        }
      });
    });
  }

  private navigateToCourseSection(courseId: string, section: string): void {
    console.log(`Navigating to course ${courseId}, section: ${section}`);
    
    // Store the course ID in session storage for the course builder
    sessionStorage.setItem('currentCourseId', courseId);
    
    // Navigate to the course builder with the specific section
    const url = `/src/pages/teacher/coursebuilder.html#${section}`;
    console.log(`Navigating to: ${url}`);
    window.location.href = url;
  }

  private getInitials(courseName: string): string {
    return courseName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  }

  private showNoCoursesMessage(): void {
    if (this.noCoursesMessage) {
      this.noCoursesMessage.style.display = 'block';
    }
  }

  private hideNoCoursesMessage(): void {
    if (this.noCoursesMessage) {
      this.noCoursesMessage.style.display = 'none';
    }
  }

  // Public method to refresh courses (called after creating a new course)
  public async refreshCourses(): Promise<void> {
    await this.loadCourses();
  }
}

// ==========================================================================
// INITIALIZE COURSES MANAGER
// ==========================================================================

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new CoursesManager();
});

// Export for use in other modules
export function initializeCoursesManager(): CoursesManager {
  return new CoursesManager();
}
