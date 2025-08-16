// ==========================================================================
// RESPONSIVE NAVIGATION HANDLER
// ==========================================================================

export class ResponsiveNavigation {
  private navToggle: HTMLButtonElement;
  private navMenu: HTMLElement;
  private body: HTMLElement;

  constructor() {
    this.navToggle = document.getElementById('nav-toggle') as HTMLButtonElement;
    this.navMenu = document.getElementById('nav-menu') as HTMLElement;
    this.body = document.body;

    if (this.navToggle && this.navMenu) {
      this.init();
    }
  }

  private init(): void {
    // Toggle menu on hamburger click
    this.navToggle.addEventListener('click', () => {
      this.toggleMenu();
    });

    // Close menu when clicking on menu links
    this.navMenu.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('nav__link')) {
        this.closeMenu();
      }
    });

    // Close menu on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isMenuOpen()) {
        this.closeMenu();
      }
    });

    // Close menu on outside click (desktop only)
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (this.isMenuOpen() && 
          !this.navMenu.contains(target) && 
          !this.navToggle.contains(target)) {
        this.closeMenu();
      }
    });

    // Handle window resize
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768 && this.isMenuOpen()) {
        this.closeMenu();
      }
    });
  }

  private toggleMenu(): void {
    if (this.isMenuOpen()) {
      this.closeMenu();
    } else {
      this.openMenu();
    }
  }

  private openMenu(): void {
    this.navMenu.classList.add('nav__menu--active');
    this.navToggle.classList.add('nav__toggle--active');
    this.body.classList.add('nav-open');
    this.navToggle.setAttribute('aria-expanded', 'true');
  }

  private closeMenu(): void {
    this.navMenu.classList.remove('nav__menu--active');
    this.navToggle.classList.remove('nav__toggle--active');
    this.body.classList.remove('nav-open');
    this.navToggle.setAttribute('aria-expanded', 'false');
  }

  private isMenuOpen(): boolean {
    return this.navMenu.classList.contains('nav__menu--active');
  }

  // Public method to close menu (useful for other components)
  public close(): void {
    this.closeMenu();
  }
}

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new ResponsiveNavigation();
});
