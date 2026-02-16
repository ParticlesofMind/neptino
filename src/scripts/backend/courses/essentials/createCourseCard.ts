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
    this.coursesContainer = document.querySelector(
      '[data-js="courses"]',
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
      console.error("❌ Error loading courses:", error);
      this.showErrorState();
    } finally {
      this.hideLoadingState();
    }
  }

  private showLoadingState(): void {
    // Clear existing content
    const existingCards = this.coursesContainer.querySelectorAll('[data-dynamic="true"]');
    existingCards.forEach((card) => card.remove());

    this.coursesContainer.setAttribute('aria-busy', 'true');

    // Show loading message
    const loadingElement = document.createElement('div');
    loadingElement.className = 'flex w-full justify-center py-10';
    loadingElement.dataset.dynamic = 'true';
    loadingElement.dataset.coursesLoading = 'true';
    loadingElement.innerHTML = `
   <div class="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-3 shadow-sm">
   <div class="h-4 w-4 animate-spin rounded-full border-2 border-neutral-200 border-t-primary-600"></div>
   <p class="text-sm text-neutral-600">Loading your courses...</p>
   </div>
 `;
    this.coursesContainer.appendChild(loadingElement);
  }

  private hideLoadingState(): void {
    const loadingElement = this.coursesContainer.querySelector('[data-courses-loading="true"]');
    if (loadingElement) {
      loadingElement.remove();
    }

    this.coursesContainer.setAttribute('aria-busy', 'false');
  }

  private showErrorState(): void {
    const errorElement = document.createElement('div');
    errorElement.className = 'flex w-full justify-center py-10';
    errorElement.dataset.dynamic = 'true';
    errorElement.dataset.coursesError = 'true';
    errorElement.innerHTML = `
   <div class="flex flex-col items-center gap-3 rounded-lg border border-neutral-200 bg-white px-5 py-4 text-center shadow-sm">
   <svg class="h-8 w-8 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
     <circle cx="12" cy="12" r="10"></circle>
     <line x1="12" y1="8" x2="12" y2="12"></line>
     <line x1="12" y1="16" x2="12.01" y2="16"></line>
   </svg>
   <h3 class="text-base font-semibold text-neutral-900">Failed to load courses</h3>
   <p class="text-sm text-neutral-600">There was an error loading your courses. Please try refreshing the page.</p>
   <button class="inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700" onclick="window.location.reload()">
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
      } catch (error) {
        console.error(`Error creating card for course ${course.course_name}:`, error);
        // Create a fallback card without statistics
      }
    }
  }


  private async createCourseCard(course: Course): Promise<HTMLElement> {
    const cardElement = document.createElement("div");
    cardElement.className = "flex flex-col bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow h-full";
    cardElement.dataset.courseId = course.id;
    cardElement.dataset.dynamic = "true"; // Mark as dynamically generated

    // Get course statistics
    let courseStats: CourseWithStats | null = null;
    try {
      courseStats = await getCourseWithStats(course.id);
    } catch (error) {
      console.warn('Error fetching course statistics for course:', course.id, error);
    }

    // Use statistics if available, otherwise use defaults
    const studentCount = courseStats?.student_count || 0;
    const lessonCount = courseStats?.lesson_count || 0;
    const courseStatus = courseStats?.status || 'draft';
    const statusClass = getStatusClassName(courseStatus);
    const statusText = formatCourseStatus(courseStatus);

    // Create course image or placeholder
    const courseImageHtml = course.course_image
      ? `<img src="${course.course_image}" alt="${course.course_name} Course" class="w-full h-full object-cover">`
      : `<div class="w-full h-full flex items-center justify-center text-4xl text-neutral-400 font-bold bg-neutral-100">${this.getInitials(course.course_name)}</div>`;

    // Format description with fallback
    const courseDescription = course.course_description?.trim() || 'No description available.';

    // Generate student and lesson text with proper pluralization
    const studentText = `${studentCount} student${studentCount !== 1 ? 's' : ''}`;
    const lessonText = `${lessonCount} lesson${lessonCount !== 1 ? 's' : ''}`;

    cardElement.innerHTML = `
   <div class="relative w-full aspect-[4/3] bg-neutral-100 overflow-hidden flex-shrink-0">
     ${courseImageHtml}
     <div class="absolute top-2 right-2">
      <span class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass}" data-course-status>${statusText}</span>
     </div>
   </div>
   
   <div class="p-4 border-b border-neutral-100 flex-shrink-0">
     <h3 class="text-lg font-semibold text-neutral-900 mb-1 line-clamp-2">${course.course_name}</h3>
     <p class="text-sm text-neutral-500 line-clamp-2">${courseDescription}</p>
   </div>
   
   <div class="p-4 flex flex-col gap-4 flex-1">
     <div class="flex gap-4 text-sm text-neutral-500">
       <span class="flex items-center gap-1">
         <svg class="h-4 w-4 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
           <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
           <circle cx="9" cy="7" r="4"></circle>
           <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
           <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
         </svg>
         ${studentText}
       </span>
       <span class="flex items-center gap-1">
         <svg class="h-4 w-4 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
           <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
           <path d="M4 4.5A2.5 2.5 0 0 1 6.5 7H20"></path>
           <path d="M6.5 7H20v10H6.5A2.5 2.5 0 0 0 4 19.5v-15A2.5 2.5 0 0 1 6.5 4.5"></path>
         </svg>
         ${lessonText}
       </span>
     </div>
     
     <div class="grid grid-cols-4 gap-2 mt-auto pt-4 border-t border-neutral-100">
       <button class="inline-flex items-center justify-center rounded-lg px-2 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
               data-section="setup" data-course-id="${course.id}"
               title="Configure course settings and details">
         Setup
       </button>
       <button class="inline-flex items-center justify-center rounded-lg px-2 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
               data-section="create" data-course-id="${course.id}"
               title="Create and design course content">
         Create
       </button>
       <button class="inline-flex items-center justify-center rounded-lg px-2 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
               data-section="preview" data-course-id="${course.id}"
               title="Preview course before publishing">
         Preview
       </button>
       <button class="inline-flex items-center justify-center rounded-lg px-2 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 border border-transparent bg-primary-600 text-white hover:bg-primary-700"
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
