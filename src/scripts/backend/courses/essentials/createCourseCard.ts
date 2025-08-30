// ==========================================================================
// COURSES PAGE - Load and display user courses with navigation
// ==========================================================================

import { getUserCourses } from "./createCourse";
import { getCourseWithStats, CourseWithStats, formatCourseStatus, getStatusClassName } from "../../../utils/courseStatistics";

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
    this.coursesContainer = document.getElementById(
      "courses-container",
    ) as HTMLElement;
    this.noCoursesMessage = document.getElementById(
      "no-courses-message",
    ) as HTMLElement;

    this.initialize();
  }

  private async initialize(): Promise<void> {
    await this.loadCourses();
  }

  private async loadCourses(): Promise<void> {
    try {
      // Show loading state
      this.showLoadingState();

      const courses = await getUserCourses();

      if (courses && courses.length > 0) {
        this.displayCourses(courses);
        this.hideNoCoursesMessage();
      } else {
        this.showNoCoursesMessage();
      }
    } catch (error) {
      this.showErrorState();
    } finally {
      this.hideLoadingState();
    }
  }

  private showLoadingState(): void {
    // Clear existing content
    const existingCards = this.coursesContainer.querySelectorAll('[data-dynamic="true"]');
    existingCards.forEach((card) => card.remove());

    // Show loading message
    const loadingElement = document.createElement('div');
    loadingElement.className = 'courses-loading';
    loadingElement.dataset.dynamic = 'true';
    loadingElement.innerHTML = `
 <div class="courses-loading__content">
 <div class="courses-loading__spinner"></div>
 <p class="courses-loading__text">Loading your courses...</p>
 </div>
 `;
    this.coursesContainer.appendChild(loadingElement);
  }

  private hideLoadingState(): void {
    const loadingElement = this.coursesContainer.querySelector('.courses-loading');
    if (loadingElement) {
      loadingElement.remove();
    }
  }

  private showErrorState(): void {
    const errorElement = document.createElement('div');
    errorElement.className = 'courses-error';
    errorElement.dataset.dynamic = 'true';
    errorElement.innerHTML = `
 <div class="courses-error__content">
 <i class="icon icon--error icon--large"></i>
 <h3 class="heading heading--h3">Failed to load courses</h3>
 <p class="paragraph">There was an error loading your courses. Please try refreshing the page.</p>
 <button class="button button--primary" onclick="window.location.reload()">
 Refresh Page
 </button>
 </div>
 `;
    this.coursesContainer.appendChild(errorElement);
  }

  private async displayCourses(courses: Course[]): Promise<void> {
    // Clear existing dynamically generated courses only (not static cards)
    const existingCards =
      this.coursesContainer.querySelectorAll('[data-dynamic="true"]');
    existingCards.forEach((card) => card.remove());

    // Create course cards sequentially to maintain order
    for (const course of courses) {
      try {
        const courseCard = await this.createCourseCard(course);
        this.coursesContainer.appendChild(courseCard);
      }
    }
  }


  private async createCourseCard(course: Course): Promise<HTMLElement> {
    const cardElement = document.createElement("div");
    cardElement.className = "card card-courses";
    cardElement.dataset.courseId = course.id;
    cardElement.dataset.dynamic = "true"; // Mark as dynamically generated

    // Get course statistics
    let courseStats: CourseWithStats | null = null;
    try {
      courseStats = await getCourseWithStats(course.id);
    }

    // Use statistics if available, otherwise use defaults
    const studentCount = courseStats?.student_count || 0;
    const lessonCount = courseStats?.lesson_count || 0;
    const courseStatus = courseStats?.status || 'draft';
    const statusClass = getStatusClassName(courseStatus);
    const statusText = formatCourseStatus(courseStatus);

    // Create course image or placeholder
    const courseImageHtml = course.course_image
      ? `<img src="${course.course_image}" alt="${course.course_name} Course" class="card-courses__img">`
      : `<div class="card-courses__placeholder">${this.getInitials(course.course_name)}</div>`;

    // Format description with fallback
    const courseDescription = course.course_description?.trim() || 'No description available.';

    // Generate student and lesson text with proper pluralization
    const studentText = `${studentCount} student${studentCount !== 1 ? 's' : ''}`;
    const lessonText = `${lessonCount} lesson${lessonCount !== 1 ? 's' : ''}`;

    cardElement.innerHTML = `
   <div class="card-courses__image">
     ${courseImageHtml}
     <div class="card-courses__overlay">
       <span class="card-courses__status ${statusClass}">${statusText}</span>
     </div>
   </div>
   
   <div class="card-courses__header">
     <h3 class="heading heading--h3 card-courses__title">${course.course_name}</h3>
     <p class="card-courses__description">${courseDescription}</p>
   </div>
   
   <div class="card-courses__body">
     <div class="card-courses__meta">
       <span class="card-courses__info">
         <i class="icon icon--students"></i>
         ${studentText}
       </span>
       <span class="card-courses__info">
         <i class="icon icon--lessons"></i>
         ${lessonText}
       </span>
     </div>
     
     <div class="card-courses__actions">
       <button class="button button--outline button--small card-courses__action" 
               data-section="setup" data-course-id="${course.id}"
               title="Configure course settings and details">
         Setup
       </button>
       <button class="button button--outline button--small card-courses__action" 
               data-section="create" data-course-id="${course.id}"
               title="Create and design course content">
         Create
       </button>
       <button class="button button--outline button--small card-courses__action" 
               data-section="preview" data-course-id="${course.id}"
               title="Preview course before publishing">
         Preview
       </button>
       <button class="button button--primary button--small card-courses__action" 
               data-section="launch" data-course-id="${course.id}"
               title="Launch course for students">
         Launch
       </button>
     </div>
   </div>
 `;

    // Add click event listeners to navigation items
    this.addNavigationEventListeners(cardElement);

    return cardElement;
  }

  private addNavigationEventListeners(cardElement: HTMLElement): void {
    const navItems = cardElement.querySelectorAll('[data-section]');

    navItems.forEach((item) => {
      item.addEventListener("click", (e) => {
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
    // Navigate to the course builder with the course ID as URL parameter and hash for section
    const url = `/src/pages/teacher/coursebuilder.html?courseId=${courseId}#${section}`;
    window.location.href = url;
  }

  private getInitials(courseName: string): string {
    return courseName
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join("");
  }

  private showNoCoursesMessage(): void {
    if (this.noCoursesMessage) {
      this.noCoursesMessage.style.display = "block";
    }
  }

  private hideNoCoursesMessage(): void {
    if (this.noCoursesMessage) {
      this.noCoursesMessage.style.display = "none";
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
document.addEventListener("DOMContentLoaded", () => {
  new CoursesManager();
});

// Export for use in other modules
export function initializeCoursesManager(): CoursesManager {
  return new CoursesManager();
}
