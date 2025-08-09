// ==========================================================================
// ASIDE NAVIGATION
// ==========================================================================

export class AsideNavigation {
  private asideLinks: NodeListOf<HTMLAnchorElement>;
  private contentSections: NodeListOf<HTMLElement>;

  constructor() {
    this.asideLinks = document.querySelectorAll('.aside a');
    this.contentSections = document.querySelectorAll('.content__section');
    this.init();
  }

  private init(): void {
    this.bindEvents();
  }

  private bindEvents(): void {
    this.asideLinks.forEach((link: HTMLAnchorElement) => {
      link.addEventListener('click', (e: Event) => this.handleLinkClick(e));
    });
  }

  private handleLinkClick(e: Event): void {
    e.preventDefault();
    
    const target = e.target as HTMLAnchorElement;
    const targetSection = target.getAttribute('data-section');
    
    if (!targetSection) return;

    this.removeActiveStates();
    this.setActiveStates(target, targetSection);
  }

  private removeActiveStates(): void {
    this.asideLinks.forEach((link: HTMLAnchorElement) => {
      link.classList.remove('active');
    });
    
    this.contentSections.forEach((section: HTMLElement) => {
      section.classList.remove('content__section--active');
    });
  }

  private setActiveStates(activeLink: HTMLAnchorElement, targetSectionId: string): void {
    activeLink.classList.add('active');
    
    const targetSection = document.getElementById(targetSectionId);
    if (targetSection) {
      targetSection.classList.add('content__section--active');
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new AsideNavigation();
});
