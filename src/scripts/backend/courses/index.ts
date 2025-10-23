// ==========================================================================
// COURSE BUILDER MAIN CONTROLLER - Uses Generic Form Handler
// ==========================================================================

import { CourseFormHandler } from "./shared/courseFormHandler.js";
import { ScheduleCourseManager } from "./schedule/scheduleCourse.js";
import { CurriculumManager } from "./curriculum/curriculumManager.js";
import { ensureStudentsManager, StudentsManager } from "./students/studentsManager.js";

// Re-export course creation and classification functions
export * from "./essentials/createCourse";
export * from "./classification/classifyCourse";

// ==========================================================================
// COURSE BUILDER CLASS
// ==========================================================================

export class CourseBuilder {
 private currentFormHandler: CourseFormHandler | null = null;
 private scheduleManager: ScheduleCourseManager | null = null;
 private curriculumManager: CurriculumManager | null = null;
 private studentsManager: StudentsManager | null = null;
 private currentSection: string = "essentials";
 private courseId: string | null = null;

 constructor() {
 this.initialize();
 
 // Make this instance globally accessible
 if (typeof window !== 'undefined') {
 (window as any).courseBuilderInstance = this;
 }
 }

 // ==========================================================================
 // INITIALIZATION
 // ==========================================================================

 private initialize(): void {
 this.getCourseId();
 this.initializeCurrentSection();
 this.setupSectionNavigation();
 
 // Only initialize managers if we have a course ID (existing course mode)
 if (this.courseId) {
 this.initializeAllManagers();
 } else {
  
 }
 }

 private getCourseId(): void {
 const resolvedCourseId = this.resolveInitialCourseId();

 if (resolvedCourseId) {
 this.courseId = resolvedCourseId;
 this.persistCourseId(resolvedCourseId);
 return;
 }

 this.courseId = null;
 this.clearPersistedCourseId();
 }

 private resolveInitialCourseId(): string | null {
 // Prefer explicit URL parameters so shared links stay authoritative.
 const urlParams = new URLSearchParams(window.location.search);
 const courseIdFromUrl = urlParams.get('courseId') || urlParams.get('id');
 if (this.isValidCourseId(courseIdFromUrl)) {
 return courseIdFromUrl!;
 }

 // Fall back to session storage when refreshing the page mid-build.
 const courseIdFromSession = this.getCourseIdFromSession();
 if (courseIdFromSession) {
 return courseIdFromSession;
 }

 // Finally, check any global window state that other modules may have set.
 if (typeof window !== 'undefined') {
 const globalCandidate = (window as any).currentCourseId;
 if (this.isValidCourseId(globalCandidate)) {
 return globalCandidate;
 }
 }

 return null;
 }

 private isValidCourseId(candidate: unknown): candidate is string {
 return typeof candidate === 'string' && candidate.trim() !== '' && candidate !== 'undefined';
 }

 private getCourseIdFromSession(): string | null {
 try {
 const candidate = sessionStorage.getItem("currentCourseId");
 return this.isValidCourseId(candidate) ? candidate : null;
 } catch (error) {
 console.warn('⚠️ Unable to read course ID from sessionStorage:', error);
 return null;
 }
 }

 private clearPersistedCourseId(): void {
 if (typeof window !== 'undefined') {
 delete (window as any).currentCourseId;
 }

 try {
 sessionStorage.removeItem("currentCourseId");
 } catch (error) {
 console.warn('⚠️ Unable to clear course ID from sessionStorage:', error);
 }
 }

 private initializeAllManagers(): void {
 if (!this.courseId) {
 return;
 }

 try {
 // Initialize all managers once with the course ID
 
 // Initialize schedule manager (always ready)
 this.scheduleManager = new ScheduleCourseManager(this.courseId);
 
 // Initialize curriculum manager (always ready)
 this.curriculumManager = new CurriculumManager(this.courseId);

 if (this.studentsManager) {
 this.studentsManager.setCourseId(this.courseId);
 }
 
 // Initialize page setup handler with course ID
 import('./settings/pageSetupHandler.js').then(({ pageSetupHandler }) => {
 pageSetupHandler.setCourseId(this.courseId!);
 });

 // Initialize coursebuilder with course ID if available
 if (typeof window !== 'undefined' && (window as any).courseBuilder) {
 (window as any).courseBuilder.setCourseId(this.courseId);
 }
 
 } catch (error) {
  
 }
 }

 /**
 * Update course ID for all managers
 */
 public setCourseId(courseId: string): void {
 this.courseId = courseId;
 
 // Store in session storage for consistency
 this.persistCourseId(courseId);
 
 // If managers aren't initialized yet, initialize them now
 if (!this.scheduleManager && !this.curriculumManager) {
 this.initializeAllManagers();
 } else {
 // Update existing managers with new course ID
 if (this.scheduleManager) {
 this.scheduleManager.setCourseId(courseId);
 }
 if (this.curriculumManager) {
 this.curriculumManager.setCourseId(courseId);
 }
 if (this.studentsManager) {
 this.studentsManager.setCourseId(courseId);
 }
 }
 
 // Update classification handler if available
 if (typeof window !== 'undefined' && (window as any).classificationHandler) {
 (window as any).classificationHandler.setCourseId(courseId);
 }
 
 // Update page setup handler
 import('./settings/pageSetupHandler.js').then(({ pageSetupHandler }) => {
 pageSetupHandler.setCourseId(courseId);
 });

 // Update coursebuilder
 if (typeof window !== 'undefined' && (window as any).courseBuilder) {
 (window as any).courseBuilder.setCourseId(courseId);
 }

 // Update URL to include course ID (so refresh works properly)
 this.updateUrlWithCourseId(courseId);
 }

 /**
 * Update the URL to include the course ID parameter
 */
 private updateUrlWithCourseId(courseId: string): void {
 const url = new URL(window.location.href);
 url.searchParams.set('courseId', courseId);
 
 // Update URL without reloading the page
 window.history.replaceState({}, '', url.toString());
 }

 private persistCourseId(courseId: string): void {
 if (typeof window !== 'undefined') {
 (window as any).currentCourseId = courseId;
 }

 try {
 sessionStorage.setItem("currentCourseId", courseId);
 } catch (error) {
 console.warn('⚠️ Unable to persist course ID to sessionStorage:', error);
 }

 if (typeof window !== 'undefined') {
 const detail = { courseId };
 window.dispatchEvent(new CustomEvent('courseIdResolved', { detail }));
 window.dispatchEvent(new CustomEvent('courseIdUpdated', { detail }));
 }
 }

 private initializeCurrentSection(): void {
 console.log('🔍 CourseBuilder - Initializing current section...');
 // Initialize the currently active section
const activeSection = document.querySelector('[data-course-section].is-active');
 if (activeSection) {
 const sectionId = activeSection.id;
 console.log('✅ Found active section:', sectionId);
 this.loadSection(sectionId);
 } else {
 console.warn('⚠️ No active section found, defaulting to essentials');
 // Default to essentials if no active section
 this.loadSection('essentials');
 }
 }

 private setupSectionNavigation(): void {
 // Listen for aside navigation clicks
 const asideLinks = document.querySelectorAll('.aside__link[data-section]');
 asideLinks.forEach((link) => {
 link.addEventListener("click", (e) => {
 e.preventDefault();
 const section = (e.target as HTMLElement).getAttribute("data-section");
 if (section) {
 this.navigateToSection(section);
 }
 });
 });
 }

 // ==========================================================================
 // SECTION MANAGEMENT
 // ==========================================================================

 private navigateToSection(sectionId: string): void {
 // Hide all articles
const articles = document.querySelectorAll<HTMLElement>('[data-course-section]');
articles.forEach((article) => {
  article.classList.remove('is-active');
 });

 // Show target article
 const targetArticle = document.getElementById(sectionId);
 if (targetArticle) {
  targetArticle.classList.add('is-active');
 this.currentSection = sectionId;
 this.loadSection(sectionId);
 }

 // Update aside navigation - Now handled by AsideNavigation class
 // this.updateAsideNavigation(sectionId);
 }

 private loadSection(sectionId: string): void {
 try {
 console.log('📂 CourseBuilder - Loading section:', sectionId);
 console.log('📋 Current course ID:', this.courseId);
 
 if (!this.courseId) {
 console.warn('⚠️ No course ID available');
 }

 // Cleanup previous form handler
 if (this.currentFormHandler) {
 this.currentFormHandler = null;
 }
 
 // Only initialize form handlers for specific sections
 
 if (sectionId === "schedule") {
 // Schedule manager is already initialized - just ensure preview is visible
 if (this.scheduleManager) {
 // If we have a course ID, make sure the schedule manager has the latest data
 if (this.courseId) {
 this.scheduleManager.setCourseId(this.courseId);
 }

 } else {
  
 }
 } else if (sectionId === "curriculum") {
 // Curriculum manager is already initialized - just ensure preview is visible
 if (this.curriculumManager) {
 // Trigger a refresh to show/hide preview as needed
 this.curriculumManager.refreshDisplay();
 } else {
  
 }
 // Also initialize form handler for curriculum form data
 this.currentFormHandler = new CourseFormHandler(sectionId, this.courseId || undefined);
    } else if (sectionId === "students") {
      this.studentsManager = ensureStudentsManager(this.courseId || null);
      this.studentsManager.activate();
    } else if (sectionId === "essentials" || sectionId === "settings" || sectionId === "pedagogy") {
      // Initialize generic form handler for form-based sections
      console.log('✅ Creating CourseFormHandler for section:', sectionId);
  this.currentFormHandler = new CourseFormHandler(sectionId, this.courseId || undefined);
    }

 // Log form handler initialization
 if (this.currentFormHandler) {
 console.log('✅ Form handler created successfully');
 }
 } catch (error) {
 console.warn(`No handler available for section: ${sectionId}`, error);
 }
 }

 // NOTE: Aside navigation is now handled by the AsideNavigation class
 // private updateAsideNavigation(activeSectionId: string): void {
 // // Remove active class from all links
 // const asideLinks = document.querySelectorAll('elements');
 // asideLinks.forEach((link) => {
 // link
 // });

 // // Add active class to current link
 // const activeLink = document.querySelector(
 // `[data-section="${activeSectionId}"]`,
 // );
 // if (activeLink) {
 // activeLink
 // }
 // }

 // ==========================================================================
 // PUBLIC METHODS
 // ==========================================================================

 public getCurrentSection(): string {
 return this.currentSection;
 }

 public goToSection(sectionId: string): void {
 this.navigateToSection(sectionId);
 }
}

// ==========================================================================
// AUTO-INITIALIZATION
// ==========================================================================

// Initialize when DOM is ready - but only once
let courseBuilderInitialized = false;

document.addEventListener("DOMContentLoaded", () => {
 // Only initialize if we're on the coursebuilder page, in the setup section, and not already initialized
 const isInSetupSection =
 document.querySelector('.coursebuilder__setup') ||
 window.location.hash === "#setup" ||
 window.location.hash === "";
 const hasSetupSection = document.querySelector('.coursebuilder__setup');

 if (hasSetupSection && isInSetupSection && !courseBuilderInitialized) {
 courseBuilderInitialized = true;
 new CourseBuilder();

 }
});

// Also listen for hash changes to initialize when entering setup
window.addEventListener("hashchange", () => {
 const isInSetupSection =
 window.location.hash === "#setup" || window.location.hash === "";
 const hasSetupSection = document.querySelector('.coursebuilder__setup');

 if (hasSetupSection && isInSetupSection && !courseBuilderInitialized) {
 courseBuilderInitialized = true;
 new CourseBuilder();
 console.log(
 "CourseBuilder (form handler) initialized on hash change to setup",
 );
 }
});
