// ==========================================================================
// COURSE BUILDER MAIN CONTROLLER - Uses Generic Form Handler
// ==========================================================================

import { CourseFormHandler } from './courseFormHandler';

// ==========================================================================
// COURSE BUILDER CLASS
// ==========================================================================

export class CourseBuilder {
  private currentFormHandler: CourseFormHandler | null = null;
  private currentSection: string = 'essentials';

  constructor() {
    this.initialize();
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  private initialize(): void {
    this.initializeCurrentSection();
    this.setupSectionNavigation();
    console.log('Course Builder initialized with generic form handler');
  }

  private initializeCurrentSection(): void {
    // Initialize the currently active section
    const activeSection = document.querySelector('.article--active');
    if (activeSection) {
      const sectionId = activeSection.id;
      this.loadSection(sectionId);
    }
  }

  private setupSectionNavigation(): void {
    // Listen for aside navigation clicks
    const asideLinks = document.querySelectorAll('.aside__link[data-section]');
    asideLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const section = (e.target as HTMLElement).getAttribute('data-section');
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
    const articles = document.querySelectorAll('.article');
    articles.forEach(article => {
      article.classList.remove('article--active');
    });

    // Show target article
    const targetArticle = document.getElementById(sectionId);
    if (targetArticle) {
      targetArticle.classList.add('article--active');
      this.currentSection = sectionId;
      this.loadSection(sectionId);
    }

    // Update aside navigation
    this.updateAsideNavigation(sectionId);
  }

  private loadSection(sectionId: string): void {
    try {
      // Clean up previous handler
      this.currentFormHandler = null;
      
      // Initialize generic form handler for any section
      this.currentFormHandler = new CourseFormHandler(sectionId);
    } catch (error) {
      console.warn(`No form handler available for section: ${sectionId}`, error);
    }
  }

  private updateAsideNavigation(activeSectionId: string): void {
    // Remove active class from all links
    const asideLinks = document.querySelectorAll('.aside__link');
    asideLinks.forEach(link => {
      link.classList.remove('aside__link--active');
    });

    // Add active class to current link
    const activeLink = document.querySelector(`[data-section="${activeSectionId}"]`);
    if (activeLink) {
      activeLink.classList.add('aside__link--active');
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

document.addEventListener('DOMContentLoaded', () => {
  // Only initialize if we're on the coursebuilder page and not already initialized
  if (document.querySelector('.section#setup') && !courseBuilderInitialized) {
    courseBuilderInitialized = true;
    new CourseBuilder();
    console.log('CourseBuilder initialized from index.ts');
  }
});
