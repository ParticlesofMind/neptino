// ==========================================================================
// COURSE BUILDER MAIN CONTROLLER - Uses Generic Form Handler
// ==========================================================================

import { CourseFormHandler } from "./courseFormHandler";
import { ScheduleCourseManager } from "./scheduleCourse";
import { CurriculumManager } from "./curriculumManager";

// Re-export course creation and classification functions
export * from "./createCourse";
export * from "./classifyCourse";

// ==========================================================================
// COURSE BUILDER CLASS
// ==========================================================================

export class CourseBuilder {
  private currentFormHandler: CourseFormHandler | null = null;
  private scheduleManager: ScheduleCourseManager | null = null;
  private curriculumManager: CurriculumManager | null = null;
  private currentSection: string = "essentials";

  constructor() {
    this.initialize();
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  private initialize(): void {
    this.initializeCurrentSection();
    this.setupSectionNavigation();
  }

  private initializeCurrentSection(): void {
    // Initialize the currently active section
    const activeSection = document.querySelector(".article--active");
    if (activeSection) {
      const sectionId = activeSection.id;
      this.loadSection(sectionId);
    }
  }

  private setupSectionNavigation(): void {
    // Listen for aside navigation clicks
    const asideLinks = document.querySelectorAll(".aside__link[data-section]");
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
    const articles = document.querySelectorAll(".article");
    articles.forEach((article) => {
      article.classList.remove("article--active");
    });

    // Show target article
    const targetArticle = document.getElementById(sectionId);
    if (targetArticle) {
      targetArticle.classList.add("article--active");
      this.currentSection = sectionId;
      this.loadSection(sectionId);
    }

    // Update aside navigation
    this.updateAsideNavigation(sectionId);
  }

  private loadSection(sectionId: string): void {
    try {
      // Clean up previous handlers
      this.currentFormHandler = null;
      this.scheduleManager = null;
      this.curriculumManager = null;

      // Initialize appropriate handler based on section
      if (sectionId === "schedule") {
        // Initialize schedule manager - it will auto-detect course ID from session storage
        this.scheduleManager = new ScheduleCourseManager();
      } else if (sectionId === "curriculum") {
        // Initialize curriculum manager - it will auto-detect course ID from session storage
        this.curriculumManager = new CurriculumManager();
      } else {
        // Initialize generic form handler for other sections
        this.currentFormHandler = new CourseFormHandler(sectionId);
      }
    } catch (error) {
      console.warn(`No handler available for section: ${sectionId}`, error);
    }
  }

  private updateAsideNavigation(activeSectionId: string): void {
    // Remove active class from all links
    const asideLinks = document.querySelectorAll(".aside__link");
    asideLinks.forEach((link) => {
      link.classList.remove("aside__link--active");
    });

    // Add active class to current link
    const activeLink = document.querySelector(
      `[data-section="${activeSectionId}"]`,
    );
    if (activeLink) {
      activeLink.classList.add("aside__link--active");
    }
  }

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
    document.querySelector(".section#setup.section--active") ||
    window.location.hash === "#setup" ||
    window.location.hash === "";
  const hasSetupSection = document.querySelector(".section#setup");

  if (hasSetupSection && isInSetupSection && !courseBuilderInitialized) {
    courseBuilderInitialized = true;
    new CourseBuilder();
    console.log(
      "CourseBuilder (form handler) initialized from courses/index.ts",
    );
  }
});

// Also listen for hash changes to initialize when entering setup
window.addEventListener("hashchange", () => {
  const isInSetupSection =
    window.location.hash === "#setup" || window.location.hash === "";
  const hasSetupSection = document.querySelector(".section#setup");

  if (hasSetupSection && isInSetupSection && !courseBuilderInitialized) {
    courseBuilderInitialized = true;
    new CourseBuilder();
    console.log(
      "CourseBuilder (form handler) initialized on hash change to setup",
    );
  }
});
