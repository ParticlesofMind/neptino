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
    console.log(`Course builder detected hash: "${hash}"`);
    console.log(`Available sections: [${this.sections.join(', ')}]`);
    
    const sectionIndex = this.sections.indexOf(hash);
    console.log(`Section index for "${hash}": ${sectionIndex}`);
    
    if (sectionIndex !== -1) {
      this.currentSectionIndex = sectionIndex;
      console.log(`Set current section index to: ${sectionIndex} (${this.sections[sectionIndex]})`);
      // Force navigate to the correct section immediately
      this.navigateToSection();
    } else {
      this.currentSectionIndex = 0; // Default to setup
      console.log(`Hash "${hash}" not found in sections, defaulting to setup`);
      // Only navigate if we're not already on setup
      if (hash && hash !== 'setup') {
        this.navigateToSection();
      }
    }
  }

  private bindEvents(): void {
    this.previousBtn.addEventListener('click', () => this.goToPrevious());
    this.nextBtn.addEventListener('click', () => this.goToNext());
  }

  private goToPrevious(): void {
    // If we're in the first section (setup), navigate to courses.html
    if (this.currentSectionIndex === 0) {
      window.location.href = '/src/pages/teacher/courses.html';
      return;
    }
    
    // Otherwise, go to previous section
    this.currentSectionIndex--;
    this.navigateToSection();
  }

  private goToNext(): void {
    if (this.currentSectionIndex < this.sections.length - 1) {
      this.currentSectionIndex++;
      this.navigateToSection();
    }
  }

  private navigateToSection(): void {
    const targetSection = this.sections[this.currentSectionIndex];
    console.log(`Navigating to section: ${targetSection} (index: ${this.currentSectionIndex})`);
    
    // Check if DOM is ready
    console.log(`DOM sections found:`, this.sections.map(id => {
      const element = document.getElementById(id);
      return `${id}: ${element ? 'exists' : 'MISSING'}`;
    }).join(', '));
    
    // Hide all sections
    this.sections.forEach(sectionId => {
      const section = document.getElementById(sectionId);
      if (section) {
        section.classList.remove('section--active');
        console.log(`Hiding section: ${sectionId}`);
      } else {
        console.error(`Section element not found when hiding: ${sectionId}`);
      }
    });
    
    // Show target section
    const activeSection = document.getElementById(targetSection);
    if (activeSection) {
      activeSection.classList.add('section--active');
      console.log(`Showing section: ${targetSection}`);
    } else {
      console.error(`Target section element not found: ${targetSection}`);
    }
    
    // Update URL hash
    window.location.hash = targetSection;
    
    // Update UI
    this.updateUI();
    
    console.log(`Navigation complete. Active section: ${targetSection}`);
  }

  private updateUI(): void {
    // Update button states
    // Previous button is never disabled, it either goes to previous section or courses.html
    this.previousBtn.disabled = false;
    this.nextBtn.disabled = this.currentSectionIndex === this.sections.length - 1;
    
    // Update button text and styling based on current section
    this.updateButtonText();
  }

  private updateButtonText(): void {
    // Update Previous button - always shows "Courses" when in setup section
    if (this.currentSectionIndex === 0) {
      this.previousBtn.textContent = 'Courses';
      this.previousBtn.classList.add('button--secondary');
      this.previousBtn.classList.remove('button--disabled');
    } else {
      const previousSection = this.sections[this.currentSectionIndex - 1];
      this.previousBtn.textContent = `← ${this.capitalizeFirst(previousSection)}`;
      this.previousBtn.classList.remove('button--secondary', 'button--disabled');
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
