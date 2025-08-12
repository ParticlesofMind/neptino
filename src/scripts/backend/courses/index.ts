// ==========================================================================
// COURSE BUILDER MAIN CONTROLLER - Uses Generic Form Handler
// ==========================================================================

import { CourseFormHandler } from "./courseFormHandler.js";
import { ScheduleCourseManager } from "./scheduleCourse.js";
import { CurriculumManager } from "./curriculumManager.js";

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
  private courseId: string | null = null;

  constructor() {
    this.initialize();
    
    // Make this instance globally accessible
    if (typeof window !== 'undefined') {
      (window as any).courseBuilderInstance = this;
      console.log('📋 CourseBuilder instance registered globally');
    }
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  private initialize(): void {
    console.log('📋 CourseBuilder initializing...');
    
    // Clear any existing course data from sessionStorage to ensure fresh start if no courseId in URL
    const urlParams = new URLSearchParams(window.location.search);
    const hasUrlCourseId = urlParams.get('courseId') || urlParams.get('id');
    
    if (!hasUrlCourseId) {
      console.log('📋 No courseId in URL - clearing sessionStorage for fresh start');
      sessionStorage.removeItem("currentCourseId");
    }
    
    this.getCourseId();
    this.initializeCurrentSection();
    this.setupSectionNavigation();
    
    // Only initialize managers if we have a course ID (existing course mode)
    if (this.courseId) {
      console.log('📋 EXISTING COURSE MODE - Initializing with course ID:', this.courseId);
      this.initializeAllManagers();
    } else {
      console.log('📋 CREATE NEW COURSE MODE - Managers will be initialized after course creation');
    }
  }

  private getCourseId(): void {
    // First try to get course ID from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const courseIdFromUrl = urlParams.get('courseId') || urlParams.get('id');
    
    if (courseIdFromUrl) {
      this.courseId = courseIdFromUrl;
      console.log('📋 EXISTING COURSE MODE - Course ID from URL:', courseIdFromUrl);
      return;
    }

    // If no URL parameter, check if we're in "create new course" mode
    console.log('📋 CREATE NEW COURSE MODE - No course ID in URL');
    
    // Clear any existing course data from sessionStorage to ensure fresh start
    sessionStorage.removeItem("currentCourseId");
    
    this.courseId = null;
  }

  private initializeAllManagers(): void {
    if (!this.courseId) {
      console.log('📋 Skipping managers initialization - no course ID (create new course mode)');
      return;
    }

    try {
      // Initialize all managers once with the course ID
      console.log('📋 Initializing managers with course ID:', this.courseId);
      
      // Initialize schedule manager (always ready)
      this.scheduleManager = new ScheduleCourseManager(this.courseId);
      
      // Initialize curriculum manager (always ready)
      this.curriculumManager = new CurriculumManager(this.courseId);
      
      // Initialize margin settings with course ID
      import('./marginSettings.js').then(({ marginSettingsHandler }) => {
        marginSettingsHandler.setCourseId(this.courseId!);
      });

      // Initialize coursebuilder with course ID if available
      if (typeof window !== 'undefined' && (window as any).courseBuilder) {
        (window as any).courseBuilder.setCourseId(this.courseId);
      }
      
      console.log('📋 All managers initialized successfully');
    } catch (error) {
      console.error('📋 Error initializing managers:', error);
    }
  }

  /**
   * Update course ID for all managers
   */
  public setCourseId(courseId: string): void {
    this.courseId = courseId;
    console.log('📋 Course ID set to:', courseId);
    
    // If managers aren't initialized yet, initialize them now
    if (!this.scheduleManager && !this.curriculumManager) {
      console.log('📋 Initializing managers for newly created course');
      this.initializeAllManagers();
    } else {
      // Update existing managers with new course ID
      if (this.scheduleManager) {
        this.scheduleManager.setCourseId(courseId);
      }
      if (this.curriculumManager) {
        this.curriculumManager.setCourseId(courseId);
      }
    }
    
    // Update margin settings
    import('./marginSettings.js').then(({ marginSettingsHandler }) => {
      marginSettingsHandler.setCourseId(courseId);
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
    console.log('📋 Updated URL with course ID:', url.toString());
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

    // Update aside navigation - Now handled by AsideNavigation class
    // this.updateAsideNavigation(sectionId);
  }

  private loadSection(sectionId: string): void {
    try {
      console.log(`📋 Loading section: ${sectionId}`);
      
      if (!this.courseId) {
        console.log('📋 CREATE NEW COURSE MODE - Limited functionality until course is created');
      }
      
      // Only initialize form handlers for specific sections
      
      if (sectionId === "schedule") {
        // Schedule manager is already initialized - just ensure preview is visible
        if (this.scheduleManager) {
          // Trigger a refresh to show/hide preview as needed
          this.scheduleManager.refreshDisplay();
        } else {
          console.log('📋 Schedule manager not initialized (create new course mode)');
        }
      } else if (sectionId === "curriculum") {
        // Curriculum manager is already initialized - just ensure preview is visible
        if (this.curriculumManager) {
          // Trigger a refresh to show/hide preview as needed
          this.curriculumManager.refreshDisplay();
        } else {
          console.log('📋 Curriculum manager not initialized (create new course mode)');
        }
        // Also initialize form handler for curriculum form data
        this.currentFormHandler = new CourseFormHandler(sectionId);
      } else if (sectionId === "essentials" || sectionId === "settings") {
        // Initialize generic form handler for form-based sections
        this.currentFormHandler = new CourseFormHandler(sectionId);
      }
    } catch (error) {
      console.warn(`No handler available for section: ${sectionId}`, error);
    }
  }

  // NOTE: Aside navigation is now handled by the AsideNavigation class
  // private updateAsideNavigation(activeSectionId: string): void {
  //   // Remove active class from all links
  //   const asideLinks = document.querySelectorAll(".aside__link");
  //   asideLinks.forEach((link) => {
  //     link.classList.remove("aside__link--active");
  //   });

  //   // Add active class to current link
  //   const activeLink = document.querySelector(
  //     `[data-section="${activeSectionId}"]`,
  //   );
  //   if (activeLink) {
  //     activeLink.classList.add("aside__link--active");
  //   }
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
