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
 return;
 }

 
 this.sections = document.querySelectorAll('.coursebuilder__setup, .coursebuilder__create, .coursebuilder__preview, .coursebuilder__launch');
 this.nextButton = document.getElementById('next-btn');
 this.previousButton = document.getElementById('previous-btn');
 
 this.initialize();
 
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

 window.addEventListener('popstate', (event) => {
 this.handlePopState(event);
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
 
 if (hash && this.isValidSection(hash)) {
 this.currentSection = hash;
 } else {
 this.currentSection = 'setup';
 if (!hash) {
 this.updateHistoryState(this.currentSection, 'replace');
 }
 }
 this.activateSection(this.currentSection);
 this.updateHistoryState(this.currentSection, 'replace');
 }

 private handleHashChange(): void {
 const hash = window.location.hash.substring(1);
 if (hash && this.isValidSection(hash)) {
 this.currentSection = hash;
 this.activateSection(this.currentSection);
 this.updateButtons();
 this.updateHistoryState(this.currentSection, 'replace');
 }
 }

 private handlePopState(event: PopStateEvent): void {
 const stateSection = (event.state && event.state.sectionId) as string | undefined;
 const hashSection = window.location.hash.substring(1);
 const targetSection = stateSection || (hashSection && this.isValidSection(hashSection) ? hashSection : undefined);

 if (targetSection && this.isValidSection(targetSection)) {
 this.currentSection = targetSection;
 this.activateSection(this.currentSection);
 this.updateButtons();
 } else if (!hashSection) {
 this.currentSection = 'setup';
 this.activateSection(this.currentSection);
 this.updateButtons();
 }
 }

 private isValidSection(section: string): boolean {
 return ['setup', 'create', 'preview', 'launch'].includes(section);
 }

 private activateSection(sectionId: string): void {
 
 // Get all coursebuilder sections
 // Hide all coursebuilder elements
 this.sections.forEach(element => {
 element.classList.remove('coursebuilder__setup--active', 'coursebuilder__create--active', 'coursebuilder__preview--active', 'coursebuilder__launch--active');
 element.setAttribute('aria-hidden', 'true');
 });
 
 // Show target coursebuilder element
 const targetElement = document.querySelector(`.coursebuilder__${sectionId}`);
 if (targetElement) {
 targetElement.classList.add(`coursebuilder__${sectionId}--active`);
 targetElement.setAttribute('aria-hidden', 'false');
 
 // Initialize aside navigation when entering setup section
 if (sectionId === 'setup') {
 setTimeout(() => {
 new AsideNavigation();
 }, 50); // Small delay to ensure DOM is ready
 }

      this.resetScrollPosition();
 } else {
 console.error(`❌ Coursebuilder element not found: ${sectionId}`);
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
 if (!this.isValidSection(sectionId) || sectionId === this.currentSection) {
 return;
 }

 this.updateHistoryState(sectionId, 'push');

 this.currentSection = sectionId;
 this.activateSection(this.currentSection);
 this.updateButtons();
 }

 private updateButtons(): void {
 const sectionOrder = ['setup', 'create', 'preview', 'launch'];
 const currentIndex = sectionOrder.indexOf(this.currentSection);

 // Update previous button
 if (this.previousButton) {
 if (currentIndex === 0) {
 this.previousButton.innerHTML = `
 <span class="">← Courses</span>
 `;
 } else {
 const prevSection = sectionOrder[currentIndex - 1];
 this.previousButton.innerHTML = `
 <span class="">←</span>
 <span class="">${this.getSectionDisplayName(prevSection)}</span>
 `;
 }
 }

 // Update next button
 if (this.nextButton) {
 if (currentIndex === sectionOrder.length - 1) {
 // Hide next button on launch section
 this.nextButton.style.display = 'none';
 } else {
 const nextSection = sectionOrder[currentIndex + 1];
 this.nextButton.style.display = 'block';
 this.nextButton.innerHTML = `
 <span class="">${this.getSectionDisplayName(nextSection)}</span>
 <span class="">→</span>
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

  private resetScrollPosition(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const reset = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });

      if (typeof document !== 'undefined') {
        if (document.body) {
          document.body.scrollTop = 0;
        }
        if (document.documentElement) {
          document.documentElement.scrollTop = 0;
        }
      }
    };

    reset();
    requestAnimationFrame(reset);
    setTimeout(reset, 50);
  }

  private updateHistoryState(sectionId: string, mode: 'push' | 'replace'): void {
    if (typeof window === 'undefined' || typeof history === 'undefined') {
      return;
    }

    const url = new URL(window.location.href);
    url.hash = sectionId;

    if (mode === 'push') {
      history.pushState({ sectionId }, '', url);
    } else {
      history.replaceState({ sectionId }, '', url);
    }
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
 return;
 }

 
 this.asideLinks = document.querySelectorAll('.link--menu[data-section]');
    this.contentSections = document.querySelectorAll('.coursebuilder__section[id]');
 this.boundHandleLinkClick = this.handleLinkClick.bind(this);

 this.init();
 }

    private isInSetupSection(): boolean {
        const setupElement = document.querySelector('.coursebuilder__setup');
        return setupElement !== null;
    } private init(): void {
 if (this.asideLinks.length === 0) {
 console.warn("No aside links found - aside navigation disabled");
 return;
 }

 if (this.contentSections.length === 0) {
 console.warn("No content sections found - aside navigation disabled");
 return;
 }


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


 this.activateSection(target, targetSection);
 this.saveActiveSection(targetSection);
 }

 private activateSection(activeLink: HTMLAnchorElement, targetSectionId: string): void {
 // ATOMIC OPERATION: Validate first, then change state
 // This prevents the content from disappearing if activation fails
 
 // First, validate that the target section exists
 const targetSection = document.getElementById(targetSectionId);
 if (!targetSection) {
 console.error("Cannot activate section - target section not found:", targetSectionId);
 return; // Fail fast - don't change anything if target doesn't exist
 }
 
 // If we're already on the target section, do nothing (prevents double-click issues)
    if (activeLink.classList.contains('link--menu-active') && 
        targetSection.classList.contains('coursebuilder__section--active')) {
 return;
 }
 
 // Only now that we've validated everything, remove current active states
 this.removeActiveStates();
 
 // Set new active states (we know this will succeed because we validated above)
 this.setActiveStates(activeLink, targetSection);
 }

 private removeActiveStates(): void {
 this.asideLinks.forEach((link: HTMLAnchorElement) => {
 link.classList.remove('link--menu-active');
 });

    this.contentSections.forEach((section: HTMLElement) => {
      section.classList.remove('coursebuilder__section--active');
    });
  }

  private setActiveStates(activeLink: HTMLAnchorElement, targetSection: HTMLElement): void {
    // Accept the actual element instead of searching for it again
    activeLink.classList.add('link--menu-active');
    targetSection.classList.add('coursebuilder__section--active');
  }

 private restoreActiveSection(): void {
 const savedSection = localStorage.getItem(this.STORAGE_KEY);

 if (savedSection) {
 const savedLink = document.querySelector(`[data-section="${savedSection}"]`) as HTMLAnchorElement;
 
 if (savedLink && document.getElementById(savedSection)) {
 this.activateSection(savedLink, savedSection);
 return;
 } else {
 console.warn("Saved section not found, setting default");
 }
 }
 
 this.setDefaultSection();
 }

 private setDefaultSection(): void {
 // Always default to the first link - with robust error handling
 const firstLink = this.asideLinks[0];
 const firstSectionId = firstLink?.getAttribute("data-section");

 if (firstLink && firstSectionId) {
 this.activateSection(firstLink, firstSectionId);
 } else {
 console.error('🚨 No valid first link found - navigation may be broken');
 // As a last resort, try to activate the first article directly
 const firstArticle = this.contentSections[0];
 if (firstArticle) {
      firstArticle.classList.add('coursebuilder__section--active');
    }
  }
 }

 private saveActiveSection(sectionId: string): void {
 localStorage.setItem(this.STORAGE_KEY, sectionId);
 }

 public destroy(): void {
 this.asideLinks.forEach((link: HTMLAnchorElement) => {
 link.removeEventListener("click", this.boundHandleLinkClick);
 });
 }
}

/**
 * Modal Handler for CourseBuilder
 * Simple utility to show/hide modals with proper overlay behavior
 */
export class ModalHandler {
  private static instance: ModalHandler;
  private activeModal: HTMLElement | null = null;

  constructor() {
    if (ModalHandler.instance) {
      return ModalHandler.instance;
    }
    
    ModalHandler.instance = this;
    this.init();
  }

  private init(): void {
    // Close modal when clicking backdrop
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('modal__backdrop')) {
        this.hideModal();
      }
    });

    // Close modal when clicking close button
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.closest('.modal__close')) {
        e.preventDefault();
        this.hideModal();
      }
    });

    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.activeModal) {
        this.hideModal();
      }
    });

    // Handle modal trigger buttons
    this.setupModalTriggers();
  }

  private setupModalTriggers(): void {
    // Create Template modal
    const createTemplateBtn = document.getElementById('create-template-btn');
    if (createTemplateBtn) {
      createTemplateBtn.addEventListener('click', () => {
        this.showModal('create-template-modal');
      });
    }

    // Load Template modal  
    const loadTemplateBtn = document.getElementById('load-template-btn');
    if (loadTemplateBtn) {
      loadTemplateBtn.addEventListener('click', () => {
        this.showModal('load-template-modal');
      });
    }
  }

  public showModal(modalId: string): void {
    const modal = document.getElementById(modalId);
    if (!modal) {
      console.error(`Modal not found: ${modalId}`);
      return;
    }

    // Hide any currently active modal
    this.hideModal();

    // Show the new modal
    modal.classList.add('modal--active');
    this.activeModal = modal;

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

  }

  public hideModal(): void {
    if (!this.activeModal) return;

    this.activeModal.classList.remove('modal--active');
    this.activeModal = null;

    // Restore body scroll
    document.body.style.overflow = '';

  }

  public static getInstance(): ModalHandler {
    if (!ModalHandler.instance) {
      ModalHandler.instance = new ModalHandler();
    }
    return ModalHandler.instance;
  }
}

// Initialize CourseBuilder navigation when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
 if (window.location.pathname.includes('coursebuilder.html')) {
 new CourseBuilderNavigation();
 new ModalHandler();
 }
});
