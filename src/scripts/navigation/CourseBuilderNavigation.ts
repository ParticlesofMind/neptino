/**
 * CourseBuilder Navigation System
 * Handles navigation within the coursebuilder interface ONLY
 * - Main sections: setup, create, preview, launch
 * - Aside articles within setup section
 * - Clear, single responsibility
 */

export class CourseBuilderNavigation {
  private currentSection: string = 'setup';
  private sections!: NodeListOf<HTMLElement>;
  private nextButton!: HTMLElement | null;
  private previousButton!: HTMLElement | null;

  constructor() {
    // Only initialize if we're actually on the coursebuilder page
    if (!this.isOnCourseBuilderPage()) {
      console.log('🧭 Not on coursebuilder page - skipping CourseBuilder navigation');
      return;
    }

    console.log('🧭 Initializing CourseBuilder Navigation...');
    
    this.sections = document.querySelectorAll('.section');
    this.nextButton = document.getElementById('next-btn');
    this.previousButton = document.getElementById('previous-btn');
    
    this.initialize();
    
    console.log('🧭 CourseBuilder Navigation initialized');
  }

  private isOnCourseBuilderPage(): boolean {
    return window.location.pathname.includes('coursebuilder.html');
  }

  private initialize(): void {
    this.setupEventListeners();
    this.initializeFromHash();
    this.updateButtons();
    
    // Initialize aside navigation for setup section
    setTimeout(() => {
      new AsideNavigation();
    }, 100);
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
    const hash = window.location.hash.substring(1);
    console.log('🧭 Initializing from hash:', hash);
    
    if (hash && this.isValidSection(hash)) {
      this.currentSection = hash;
      console.log('🧭 Valid hash detected, setting current section to:', hash);
    } else {
      this.currentSection = 'setup';
      console.log('🧭 No valid hash, defaulting to setup');
      if (!hash) {
        history.replaceState(null, '', '#setup');
      }
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
    return ['setup', 'create', 'preview', 'launch'].includes(section);
  }

  private activateSection(sectionId: string): void {
    console.log(`🧭 Activating section: ${sectionId}`);
    
    // Hide all sections
    this.sections.forEach(section => {
      section.classList.remove('section--active');
    });
    
    // Show target section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
      targetSection.classList.add('section--active');
      console.log(`🎯 Successfully navigated to section: ${sectionId}`);
    } else {
      console.error(`❌ Section not found: ${sectionId}`);
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
      // Go back to courses page
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

    // Update previous button
    if (this.previousButton) {
      if (currentIndex === 0) {
        this.previousButton.innerHTML = `
          <span class="button__icon">←</span>
          <span class="button__text">Back to Courses</span>
        `;
      } else {
        const prevSection = sectionOrder[currentIndex - 1];
        this.previousButton.innerHTML = `
          <span class="button__icon">←</span>
          <span class="button__text">Back to ${this.getSectionDisplayName(prevSection)}</span>
        `;
      }
    }

    // Update next button
    if (this.nextButton) {
      if (currentIndex === sectionOrder.length - 1) {
        this.nextButton.innerHTML = `
          <span class="button__text">Launch Course</span>
          <span class="button__icon">🚀</span>
        `;
      } else {
        const nextSection = sectionOrder[currentIndex + 1];
        this.nextButton.innerHTML = `
          <span class="button__text">Continue to ${this.getSectionDisplayName(nextSection)}</span>
          <span class="button__icon">→</span>
        `;
      }
    }
  }

  private getSectionDisplayName(sectionId: string): string {
    const displayNames: { [key: string]: string } = {
      'setup': 'Setup',
      'create': 'Create',
      'preview': 'Preview',
      'launch': 'Launch'
    };
    return displayNames[sectionId] || sectionId;
  }
}

/**
 * Aside Navigation for CourseBuilder Setup Section
 * Handles navigation between articles within the setup section
 */
export class AsideNavigation {
  private asideLinks!: NodeListOf<HTMLAnchorElement>;
  private contentSections!: NodeListOf<HTMLElement>;
  private readonly STORAGE_KEY = "coursebuilder_active_section";
  private boundHandleLinkClick!: (e: Event) => void;

  constructor() {
    // Only initialize if we're in the setup section
    if (!this.isInSetupSection()) {
      console.log('🧭 Not in setup section - skipping aside navigation');
      return;
    }

    console.log('🧭 Initializing Aside Navigation...');
    
    this.asideLinks = document.querySelectorAll(".aside__link");
    this.contentSections = document.querySelectorAll(".article");
    this.boundHandleLinkClick = this.handleLinkClick.bind(this);

    this.init();
  }

  private isInSetupSection(): boolean {
    const setupSection = document.getElementById('setup');
    return setupSection?.classList.contains('section--active') || 
           window.location.hash === '#setup' || 
           !window.location.hash;
  }

  private init(): void {
    if (this.asideLinks.length === 0) {
      console.warn("No aside links found - aside navigation disabled");
      return;
    }

    if (this.contentSections.length === 0) {
      console.warn("No content sections found - aside navigation disabled");
      return;
    }

    console.log('🧭 Aside navigation initializing with', this.asideLinks.length, 'links and', this.contentSections.length, 'sections');

    this.bindEvents();
    this.restoreActiveSection();
  }

  private bindEvents(): void {
    this.asideLinks.forEach((link: HTMLAnchorElement) => {
      link.addEventListener("click", this.boundHandleLinkClick);
    });
  }

  private handleLinkClick(e: Event): void {
    e.preventDefault();
    
    const target = e.currentTarget as HTMLAnchorElement;
    const targetSection = target.getAttribute("data-section");

    if (!targetSection) {
      console.error("No data-section attribute found");
      return;
    }

    console.log('🧭 Aside link clicked:', target.textContent, 'Target section:', targetSection);

    this.activateSection(target, targetSection);
    this.saveActiveSection(targetSection);
  }

  private activateSection(activeLink: HTMLAnchorElement, targetSectionId: string): void {
    // Remove all active states
    this.removeActiveStates();
    
    // Set new active states
    this.setActiveStates(activeLink, targetSectionId);
  }

  private removeActiveStates(): void {
    this.asideLinks.forEach((link: HTMLAnchorElement) => {
      link.classList.remove("aside__link--active");
    });

    this.contentSections.forEach((section: HTMLElement) => {
      section.classList.remove("article--active");
    });
  }

  private setActiveStates(activeLink: HTMLAnchorElement, targetSectionId: string): void {
    activeLink.classList.add("aside__link--active");

    const targetSection = document.getElementById(targetSectionId);
    if (targetSection) {
      targetSection.classList.add("article--active");
      console.log('🎯 Successfully activated article:', targetSectionId);
    } else {
      console.error("Target section not found:", targetSectionId);
    }
  }

  private restoreActiveSection(): void {
    const savedSection = localStorage.getItem(this.STORAGE_KEY);

    if (savedSection) {
      console.log('🧭 Restoring saved section:', savedSection);
      const savedLink = document.querySelector(`[data-section="${savedSection}"]`) as HTMLAnchorElement;
      
      if (savedLink && document.getElementById(savedSection)) {
        this.activateSection(savedLink, savedSection);
      } else {
        console.warn("Saved section not found, setting default");
        this.setDefaultSection();
      }
    } else {
      console.log('🧭 No saved section, setting default');
      this.setDefaultSection();
    }
  }

  private setDefaultSection(): void {
    // Always default to the first link
    const firstLink = this.asideLinks[0];
    const firstSectionId = firstLink?.getAttribute("data-section");

    if (firstLink && firstSectionId) {
      console.log('🎯 Setting default section:', firstSectionId);
      this.activateSection(firstLink, firstSectionId);
    }
  }

  private saveActiveSection(sectionId: string): void {
    localStorage.setItem(this.STORAGE_KEY, sectionId);
    console.log('🧭 Saved active section to localStorage:', sectionId);
  }

  public destroy(): void {
    this.asideLinks.forEach((link: HTMLAnchorElement) => {
      link.removeEventListener("click", this.boundHandleLinkClick);
    });
  }
}

// Initialize CourseBuilder navigation when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.includes('coursebuilder.html')) {
    new CourseBuilderNavigation();
  }
});
