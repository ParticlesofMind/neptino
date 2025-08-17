// ==========================================================================
// COURSES PAGE - Load and display user courses with navigation
// ==========================================================================

import { getUserCourses } from "./createCourse";

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
 const courses = await getUserCourses();

 if (courses && courses.length > 0) {
 this.displayCourses(courses);
 this.hideNoCoursesMessage();
 } else {
 this.showNoCoursesMessage();
 }
 } catch (error) {
 console.error("Error loading courses:", error);
 this.showNoCoursesMessage();
 }
 }

 private displayCourses(courses: Course[]): void {
 // Clear existing dynamically generated courses only (not static cards)
 const existingCards =
 this.coursesContainer.querySelectorAll('[data-dynamic="true"]');
 existingCards.forEach((card) => card.remove());

 courses.forEach((course) => {
 const courseCard = this.createCourseCard(course);
 this.coursesContainer.appendChild(courseCard);
 });
 }

 private createCourseCard(course: Course): HTMLElement {
 const cardElement = document.createElement("div");
 cardElement.className = "card card--course";
 cardElement.dataset.courseId = course.id;
 cardElement.dataset.dynamic = "true"; // Mark as dynamically generated

 cardElement.innerHTML = `
 <div class="card__image">
 ${
 course.course_image
 ? `<img src="${course.course_image}" alt="${course.course_name}" class="card__img">`
 : `<div class="card__placeholder">${this.getInitials(course.course_name)}</div>`
 }
 <div class="card__overlay">
 <span class="card__status card__status--draft">Draft</span>
 </div>
 </div>
 
 <div class="card__header">
 <h3 class="heading heading--h3 card__title">${course.course_name}</h3>
 <p class="card__description">${course.course_description || 'No description available.'}</p>
 </div>
 
 <div class="card__body">
 <div class="card__meta">
 <span class="card__info">
 <i class="icon icon--students"></i>
 0 students
 </span>
 <span class="card__info">
 <i class="icon icon--lessons"></i>
 0 lessons
 </span>
 </div>
 <div class="card__actions">
 <button class="button button--outline button--small card__action" 
 data-section="setup" data-course-id="${course.id}">
 Setup
 </button>
 <button class="button button--outline button--small card__action" 
 data-section="create" data-course-id="${course.id}">
 Create
 </button>
 <button class="button button--outline button--small card__action" 
 data-section="preview" data-course-id="${course.id}">
 Preview
 </button>
 <button class="button button--primary button--small card__action" 
 data-section="launch" data-course-id="${course.id}">
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
