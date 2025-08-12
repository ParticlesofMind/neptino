// ==========================================================================
// ASIDE NAVIGATION
// ==========================================================================

export class AsideNavigation {
  private asideLinks: NodeListOf<HTMLAnchorElement>;
  private contentSections: NodeListOf<HTMLElement>;
  private readonly STORAGE_KEY = "coursebuilder_active_section";
  private boundHandleLinkClick: (e: Event) => void;

  constructor() {
    this.asideLinks = document.querySelectorAll(".aside__link");
    this.contentSections = document.querySelectorAll(".article");
    this.boundHandleLinkClick = this.handleLinkClick.bind(this);


    this.init();
  }

  private init(): void {
    if (this.asideLinks.length === 0) {
      console.error("No aside links found");
      return;
    }

    if (this.contentSections.length === 0) {
      console.error("No content sections found");
      return;
    }

    // Restore last active section before binding events
    this.restoreActiveSection();

    this.bindEvents();
  }

  /**
   * Restores the last active section from localStorage
   */
  private restoreActiveSection(): void {
    const savedSection = localStorage.getItem(this.STORAGE_KEY);

    if (savedSection) {

      // Find the link and section elements
      const savedLink = document.querySelector(
        `[data-section="${savedSection}"]`,
      ) as HTMLAnchorElement;
      const savedSectionElement = document.getElementById(savedSection);

      if (savedLink && savedSectionElement) {
        // Remove all active states first
        this.removeActiveStates();

        // Set the saved section as active
        this.setActiveStates(savedLink, savedSection);

      } else {
        console.warn("Saved section not found in DOM:", savedSection);
      }
    } else {
    }
  }

  /**
   * Saves the active section to localStorage
   */
  private saveActiveSection(sectionId: string): void {
    localStorage.setItem(this.STORAGE_KEY, sectionId);
  }

  private bindEvents(): void {
    this.asideLinks.forEach((link: HTMLAnchorElement) => {
      link.addEventListener("click", this.boundHandleLinkClick);
    });
  }

  private handleLinkClick(e: Event): void {
    const target = e.target as HTMLAnchorElement;
    const href = target.getAttribute("href");
    const targetSection = target.getAttribute("data-section");

    console.log(
      "Aside link clicked:",
      target.textContent,
      "Href:",
      href,
      "Target section:",
      targetSection,
    );

    // Only handle aside navigation if we're currently in the setup section
    const currentHash = window.location.hash.substring(1);
    const setupSection = document.getElementById("setup");
    const isInSetupSection =
      (currentHash === "setup" || !currentHash) &&
      setupSection?.classList.contains("section--active");

    if (!isInSetupSection) {
      return; // Don't handle clicks when not in setup section
    }

    // If the href is a full page URL (not a hash), allow normal navigation
    if (href && href.startsWith("/") && !href.startsWith("#")) {
      return; // Don't prevent default, let the browser navigate
    }

    // For hash navigation (single-page), prevent default and handle manually
    e.preventDefault();

    if (!targetSection) {
      console.error("No data-section attribute found");
      return;
    }

    // Only handle aside navigation if we're in course builder setup section
    if (this.isInCourseBuilderSetup()) {
      this.removeActiveStates();
      this.setActiveStates(target, targetSection);

      // Save the active section to localStorage
      this.saveActiveSection(targetSection);
    } else {
      // For home page or other contexts, handle normally
      this.removeActiveStates();
      this.setActiveStates(target, targetSection);

      // Save the active section to localStorage
      this.saveActiveSection(targetSection);
    }
  }

  private isInCourseBuilderSetup(): boolean {
    const setupSection = document.getElementById("setup");
    return setupSection
      ? setupSection.classList.contains("section--active")
      : false;
  }

  private removeActiveStates(): void {
    this.asideLinks.forEach((link: HTMLAnchorElement) => {
      link.classList.remove("aside__link--active");
    });

    this.contentSections.forEach((section: HTMLElement) => {
      section.classList.remove("article--active");
    });

  }

  private setActiveStates(
    activeLink: HTMLAnchorElement,
    targetSectionId: string,
  ): void {
    activeLink.classList.add("aside__link--active");

    const targetSection = document.getElementById(targetSectionId);
    if (targetSection) {
      targetSection.classList.add("article--active");
    } else {
      console.error("Target section not found:", targetSectionId);
    }
  }

  /**
   * Clean up event listeners and references
   */
  public destroy(): void {
    // Remove event listeners
    this.asideLinks.forEach((link: HTMLAnchorElement) => {
      link.removeEventListener("click", this.boundHandleLinkClick);
    });

  }
}
