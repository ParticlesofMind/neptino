// ==========================================================================
// ASIDE NAVIGATION
// ==========================================================================

export class AsideNavigation {
  private asideLinks: NodeListOf<HTMLAnchorElement>;
  private contentSections: NodeListOf<HTMLElement>;

  constructor() {
    this.asideLinks = document.querySelectorAll('.aside__link');
    this.contentSections = document.querySelectorAll('.article');
    
    console.log('Aside links found:', this.asideLinks.length);
    console.log('Content sections found:', this.contentSections.length);
    
    this.init();
  }

  private init(): void {
    if (this.asideLinks.length === 0) {
      console.error('No aside links found');
      return;
    }
    
    if (this.contentSections.length === 0) {
      console.error('No content sections found');
      return;
    }
    
    this.bindEvents();
    console.log('Aside navigation initialized');
  }

  private bindEvents(): void {
    this.asideLinks.forEach((link: HTMLAnchorElement, index: number) => {
      console.log(`Binding event to link ${index}:`, link.textContent);
      link.addEventListener('click', (e: Event) => this.handleLinkClick(e));
    });
  }

  private handleLinkClick(e: Event): void {
    const target = e.target as HTMLAnchorElement;
    const href = target.getAttribute('href');
    const targetSection = target.getAttribute('data-section');
    
    console.log('Link clicked:', target.textContent, 'Href:', href, 'Target section:', targetSection);
    
    // If the href is a full page URL (not a hash), allow normal navigation
    if (href && href.startsWith('/') && !href.startsWith('#')) {
      console.log('Full page navigation detected, allowing default behavior');
      return; // Don't prevent default, let the browser navigate
    }
    
    // For hash navigation (single-page), prevent default and handle manually
    e.preventDefault();
    
    if (!targetSection) {
      console.error('No data-section attribute found');
      return;
    }

    // Only handle aside navigation if we're in course builder setup section
    if (this.isInCourseBuilderSetup()) {
      this.removeActiveStates();
      this.setActiveStates(target, targetSection);
    } else {
      // For home page or other contexts, handle normally
      this.removeActiveStates();
      this.setActiveStates(target, targetSection);
    }
  }

  private isInCourseBuilderSetup(): boolean {
    const setupSection = document.getElementById('setup');
    return setupSection ? setupSection.classList.contains('section--active') : false;
  }

  private removeActiveStates(): void {
    this.asideLinks.forEach((link: HTMLAnchorElement) => {
      link.classList.remove('aside__link--active');
    });
    
    this.contentSections.forEach((section: HTMLElement) => {
      section.classList.remove('article--active');
    });
    
    console.log('Removed all active states');
  }

  private setActiveStates(activeLink: HTMLAnchorElement, targetSectionId: string): void {
    activeLink.classList.add('aside__link--active');
    
    const targetSection = document.getElementById(targetSectionId);
    if (targetSection) {
      targetSection.classList.add('article--active');
      console.log('Activated section:', targetSectionId);
    } else {
      console.error('Target section not found:', targetSectionId);
    }
  }
}
