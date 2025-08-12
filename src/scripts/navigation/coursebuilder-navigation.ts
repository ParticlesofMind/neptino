/**
 * Course Builder Navigation
 * Handles navigation between main sections: setup, create, preview, launch
 */

export class CourseBuilderNavigation {
  private currentSection: string = 'setup';
  private sections: NodeListOf<HTMLElement>;
  private nextButton: HTMLElement | null;
  private previousButton: HTMLElement | null;

  constructor() {
    this.sections = document.querySelectorAll('.section');
    this.nextButton = document.getElementById('next-btn');
    this.previousButton = document.getElementById('previous-btn');
    
    this.initialize();
  }

  private initialize(): void {
    this.setupEventListeners();
    this.initializeFromHash();
    this.updateButtons();
  }

  private setupEventListeners(): void {
    // Listen for hash changes
    window.addEventListener('hashchange', () => {
      this.handleHashChange();
    });

    // Next button functionality
    if (this.nextButton) {
      this.nextButton.addEventListener('click', () => {
        this.navigateNext();
      });
    }

    // Previous button functionality
    if (this.previousButton) {
      this.previousButton.addEventListener('click', () => {
        this.navigatePrevious();
      });
    }
  }

  private initializeFromHash(): void {
    const hash = window.location.hash.substring(1); // Remove #
    if (hash && this.isValidSection(hash)) {
      this.currentSection = hash;
    } else {
      this.currentSection = 'setup'; // Default section
      // Update URL without triggering hashchange
      history.replaceState(null, '', '#setup');
    }
    this.activateSection(this.currentSection);
  }

  private handleHashChange(): void {
    const hash = window.location.hash.substring(1);
    if (hash && this.isValidSection(hash)) {
      this.currentSection = hash;
      this.activateSection(this.currentSection);
      this.updateButtons();
    }
  }

  private isValidSection(section: string): boolean {
    const validSections = ['setup', 'create', 'preview', 'launch'];
    return validSections.includes(section);
  }

  private activateSection(sectionId: string): void {
    // Hide all sections
    this.sections.forEach(section => {
      section.classList.remove('section--active');
    });

    // Show the target section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
      targetSection.classList.add('section--active');
      console.log(`🎯 Navigated to section: ${sectionId}`);
    }
  }

  private navigateNext(): void {
    const sectionOrder = ['setup', 'create', 'preview', 'launch'];
    const currentIndex = sectionOrder.indexOf(this.currentSection);
    
    if (currentIndex < sectionOrder.length - 1) {
      const nextSection = sectionOrder[currentIndex + 1];
      this.navigateToSection(nextSection);
    }
  }

  private navigatePrevious(): void {
    const sectionOrder = ['setup', 'create', 'preview', 'launch'];
    const currentIndex = sectionOrder.indexOf(this.currentSection);
    
    if (currentIndex > 0) {
      const prevSection = sectionOrder[currentIndex - 1];
      this.navigateToSection(prevSection);
    } else {
      // If we're at the first section, go back to courses page
      window.location.href = '/src/pages/teacher/courses.html';
    }
  }

  private navigateToSection(sectionId: string): void {
    if (this.isValidSection(sectionId)) {
      window.location.hash = sectionId;
    }
  }

  private updateButtons(): void {
    const sectionOrder = ['setup', 'create', 'preview', 'launch'];
    const currentIndex = sectionOrder.indexOf(this.currentSection);

    // Update next button
    if (this.nextButton) {
      if (currentIndex < sectionOrder.length - 1) {
        this.nextButton.style.display = 'block';
        const nextSection = sectionOrder[currentIndex + 1];
        this.nextButton.textContent = this.getSectionDisplayName(nextSection);
      } else {
        this.nextButton.textContent = 'Finish';
        // Could add functionality to save/publish course
      }
    }

    // Update previous button
    if (this.previousButton) {
      if (currentIndex > 0) {
        const prevSection = sectionOrder[currentIndex - 1];
        this.previousButton.textContent = this.getSectionDisplayName(prevSection);
      } else {
        this.previousButton.textContent = 'Courses';
      }
    }
  }

  private getSectionDisplayName(sectionId: string): string {
    const displayNames: Record<string, string> = {
      'setup': 'Setup',
      'create': 'Create',
      'preview': 'Preview',
      'launch': 'Launch'
    };
    return displayNames[sectionId] || sectionId;
  }

  /**
   * Public method to get current section
   */
  public getCurrentSection(): string {
    return this.currentSection;
  }

  /**
   * Public method to navigate to a specific section
   */
  public goToSection(sectionId: string): void {
    this.navigateToSection(sectionId);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Only initialize on coursebuilder page
  if (document.querySelector('.nav--coursebuilder')) {
    new CourseBuilderNavigation();
    console.log('🧭 Course Builder Navigation initialized');
  }
});
