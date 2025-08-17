/**
 * Dashboard Navigation System
 * Handles sidebar navigation for dashboard pages with multiple sections
 */

export class DashboardNavigation {
  private currentSection: string = 'home';
  private navLinks: NodeListOf<HTMLAnchorElement>;
  private articles: NodeListOf<HTMLElement>;

  constructor() {
    this.navLinks = document.querySelectorAll('.sidebar .nav__link');
    this.articles = document.querySelectorAll('.dashboard-content__article');
    this.init();
  }

  private init(): void {
    this.setupEventListeners();
    this.initializeFromHash();
  }

  private setupEventListeners(): void {
    // Navigation link clicks
    this.navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const section = link.getAttribute('data-section');
        if (section) {
          this.navigateToSection(section);
        }
      });
    });

    // Handle action links with data-section attributes (like quick action buttons)
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const actionLink = target.closest('[data-section]') as HTMLAnchorElement;
      if (actionLink && !actionLink.matches('.sidebar .nav__link')) {
        e.preventDefault();
        const section = actionLink.getAttribute('data-section');
        if (section && this.isValidSection(section)) {
          this.navigateToSection(section);
        }
      }
    });

    // Handle browser back/forward buttons
    window.addEventListener('hashchange', () => {
      this.initializeFromHash();
    });
  }

  private initializeFromHash(): void {
    const hash = window.location.hash.substring(1);
    if (hash && this.isValidSection(hash)) {
      this.navigateToSection(hash, false);
    }
  }

  private isValidSection(section: string): boolean {
    return document.getElementById(section) !== null;
  }

  public navigateToSection(section: string, updateHash: boolean = true): void {
    // Update hash if requested
    if (updateHash) {
      window.location.hash = section;
    }

    // Update current section
    this.currentSection = section;

    // Hide all articles
    this.articles.forEach(article => {
      article.classList.remove('dashboard-content__article--active');
    });

    // Show target article
    const targetArticle = document.getElementById(section);
    if (targetArticle) {
      targetArticle.classList.add('dashboard-content__article--active');
    }

    // Update navigation link states
    this.updateNavLinkStates(section);
  }

  private updateNavLinkStates(activeSection: string): void {
    this.navLinks.forEach(link => {
      link.classList.remove('nav__link--active');
      
      const linkSection = link.getAttribute('data-section');
      if (linkSection === activeSection) {
        link.classList.add('nav__link--active');
      }
    });
  }

  public getCurrentSection(): string {
    return this.currentSection;
  }
}

// Auto-initialize dashboard navigation if elements are present
export function initializeDashboardNavigation(): DashboardNavigation | null {
  const dashboardNav = document.querySelector('.nav--main');
  if (dashboardNav) {
    return new DashboardNavigation();
  }
  return null;
}
