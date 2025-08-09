// ==========================================================================
// COURSE BUILDER NAVIGATION
// ==========================================================================

export class CourseBuilderNavigation {
  private sections: string[] = ['setup', 'create', 'preview', 'launch'];
  private currentSectionIndex: number = 0;
  private previousBtn: HTMLButtonElement;
  private nextBtn: HTMLButtonElement;

  constructor() {
    this.previousBtn = document.getElementById('previous-btn') as HTMLButtonElement;
    this.nextBtn = document.getElementById('next-btn') as HTMLButtonElement;
    
    this.init();
  }

  private init(): void {
    if (!this.previousBtn || !this.nextBtn) {
      console.error('Previous or Next button not found');
      return;
    }

    // Set initial section based on URL hash
    this.setInitialSection();
    
    // Bind button events
    this.bindEvents();
    
    // Update UI
    this.updateUI();
    
    console.log('Course builder navigation initialized');
  }

  private setInitialSection(): void {
    const hash = window.location.hash.substring(1); // Remove #
    const sectionIndex = this.sections.indexOf(hash);
    
    if (sectionIndex !== -1) {
      this.currentSectionIndex = sectionIndex;
    } else {
      this.currentSectionIndex = 0; // Default to setup
    }
  }

  private bindEvents(): void {
    this.previousBtn.addEventListener('click', () => this.goToPrevious());
    this.nextBtn.addEventListener('click', () => this.goToNext());
  }

  private goToPrevious(): void {
    if (this.currentSectionIndex > 0) {
      this.currentSectionIndex--;
      this.navigateToSection();
    }
  }

  private goToNext(): void {
    if (this.currentSectionIndex < this.sections.length - 1) {
      this.currentSectionIndex++;
      this.navigateToSection();
    }
  }

  private navigateToSection(): void {
    const targetSection = this.sections[this.currentSectionIndex];
    
    // Hide all sections
    this.sections.forEach(sectionId => {
      const section = document.getElementById(sectionId);
      if (section) {
        section.classList.remove('section--active');
      }
    });
    
    // Show target section
    const activeSection = document.getElementById(targetSection);
    if (activeSection) {
      activeSection.classList.add('section--active');
    }
    
    // Update URL hash
    window.location.hash = targetSection;
    
    // Update UI
    this.updateUI();
    
    console.log(`Navigated to section: ${targetSection}`);
  }

  private updateUI(): void {
    // Update button states
    this.previousBtn.disabled = this.currentSectionIndex === 0;
    this.nextBtn.disabled = this.currentSectionIndex === this.sections.length - 1;
    
    // Update button text based on current section
    this.updateButtonText();
  }

  private updateButtonText(): void {
    // Update Previous button
    if (this.currentSectionIndex > 0) {
      const previousSection = this.sections[this.currentSectionIndex - 1];
      this.previousBtn.textContent = `← ${this.capitalizeFirst(previousSection)}`;
    } else {
      this.previousBtn.textContent = 'Previous';
    }
    
    // Update Next button
    if (this.currentSectionIndex < this.sections.length - 1) {
      const nextSection = this.sections[this.currentSectionIndex + 1];
      this.nextBtn.textContent = `${this.capitalizeFirst(nextSection)} →`;
    } else {
      this.nextBtn.textContent = 'Launch Course';
    }
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
