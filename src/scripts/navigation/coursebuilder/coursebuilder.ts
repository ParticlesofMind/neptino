// ==========================================================================
// COURSE BUILDER NAVIGATION
// ==========================================================================

export class CourseBuilderNavigation {
  private sections: string[] = ['setup', 'create', 'preview', 'launch'];
  private currentSectionIndex: number = 0;
  private previousBtn: HTMLButtonElement;
  private nextBtn: HTMLButtonElement;
  private static instanceCount: number = 0;
  private instanceId: number;

  constructor() {
    CourseBuilderNavigation.instanceCount++;
    this.instanceId = CourseBuilderNavigation.instanceCount;
    console.log(`🎯 CourseBuilderNavigation instance ${this.instanceId} created (total: ${CourseBuilderNavigation.instanceCount})`);
    
    this.previousBtn = document.getElementById('previous-btn') as HTMLButtonElement;
    this.nextBtn = document.getElementById('next-btn') as HTMLButtonElement;
    
    this.init();
  }

  private init(): void {
    console.log(`🎯 CourseBuilderNavigation instance ${this.instanceId} initializing...`);
    
    if (!this.previousBtn || !this.nextBtn) {
      console.error(`🎯 Instance ${this.instanceId}: Previous or Next button not found`);
      return;
    }

    // Set initial section based on URL hash
    this.setInitialSection();
    
    // Bind button events
    this.bindEvents();
    
    // Update UI
    this.updateUI();
    
    console.log(`🎯 Instance ${this.instanceId}: Course builder navigation initialized`);
  }

  private setInitialSection(): void {
    const hash = window.location.hash.substring(1); // Remove #
    console.log(`🎯 CourseBuilderNavigation.setInitialSection() called with hash: "${hash}"`);
    console.log(`🎯 Available sections: [${this.sections.join(', ')}]`);
    
    const sectionIndex = this.sections.indexOf(hash);
    console.log(`🎯 Section index for "${hash}": ${sectionIndex}`);
    
    if (sectionIndex !== -1) {
      this.currentSectionIndex = sectionIndex;
      console.log(`🎯 Set current section index to: ${sectionIndex} (${this.sections[sectionIndex]})`);
      // Force navigate to the correct section immediately
      this.navigateToSection();
    } else {
      console.log(`🎯 Hash "${hash}" not found in sections, defaulting to setup`);
      this.currentSectionIndex = 0; // Default to setup
      // Only navigate if we're not already on setup and the hash isn't empty
      if (hash && hash !== 'setup') {
        console.log(`🎯 Navigating to setup because unknown hash: "${hash}"`);
        this.navigateToSection();
      } else {
        console.log(`🎯 Staying on current section, no navigation needed`);
      }
    }
  }

  private bindEvents(): void {
    this.previousBtn.addEventListener('click', () => {
      console.log(`🎯 Instance ${this.instanceId}: Previous button clicked!`);
      this.goToPrevious();
    });
    this.nextBtn.addEventListener('click', () => {
      console.log(`🎯 Instance ${this.instanceId}: Next button clicked!`);
      this.goToNext();
    });
  }

  private goToPrevious(): void {
    console.log(`🎯 Instance ${this.instanceId}: goToPrevious() called - current index: ${this.currentSectionIndex}`);
    
    // If we're in the first section (setup), navigate to courses.html
    if (this.currentSectionIndex === 0) {
      console.log(`🎯 Instance ${this.instanceId}: Navigating to courses.html from setup`);
      window.location.href = '/src/pages/teacher/courses.html';
      return;
    }
    
    // Otherwise, go to previous section
    this.currentSectionIndex--;
    console.log(`🎯 Instance ${this.instanceId}: Going to previous section, new index: ${this.currentSectionIndex}`);
    this.navigateToSection();
  }

  private goToNext(): void {
    console.log(`🎯 Instance ${this.instanceId}: goToNext() called - current index: ${this.currentSectionIndex}`);
    
    if (this.currentSectionIndex < this.sections.length - 1) {
      this.currentSectionIndex++;
      console.log(`🎯 Instance ${this.instanceId}: Going to next section, new index: ${this.currentSectionIndex}`);
      this.navigateToSection();
    } else {
      console.log(`🎯 Instance ${this.instanceId}: Already at last section, no navigation`);
    }
  }

  private navigateToSection(): void {
    const targetSection = this.sections[this.currentSectionIndex];
    console.log(`🚀 Instance ${this.instanceId}: Navigating to section: ${targetSection} (index: ${this.currentSectionIndex})`);
    console.log(`🚀 Instance ${this.instanceId}: Call stack:`, new Error().stack);
    
    // Check if DOM is ready
    console.log(`🚀 Instance ${this.instanceId}: DOM sections found:`, this.sections.map(id => {
      const element = document.getElementById(id);
      return `${id}: ${element ? 'exists' : 'MISSING'}`;
    }).join(', '));
    
    // Hide all sections
    this.sections.forEach(sectionId => {
      const section = document.getElementById(sectionId);
      if (section) {
        section.classList.remove('section--active');
        console.log(`🚀 Instance ${this.instanceId}: Hiding section: ${sectionId}`);
      } else {
        console.error(`🚀 Instance ${this.instanceId}: Section element not found when hiding: ${sectionId}`);
      }
    });
    
    // Show target section
    const activeSection = document.getElementById(targetSection);
    if (activeSection) {
      activeSection.classList.add('section--active');
      console.log(`🚀 Instance ${this.instanceId}: Showing section: ${targetSection}`);
    } else {
      console.error(`🚀 Instance ${this.instanceId}: Target section element not found: ${targetSection}`);
    }
    
    // Update URL hash - this will trigger the hashchange event
    console.log(`🚀 Instance ${this.instanceId}: Setting hash to: ${targetSection}`);
    window.location.hash = targetSection;
    
    // For the create section, we need to trigger coursebuilder initialization
    // after the DOM has updated but before the hashchange event fires
    if (targetSection === 'create') {
      // Dispatch a custom event that the coursebuilder can listen to
      setTimeout(() => {
        console.log(`🚀 Instance ${this.instanceId}: Dispatching coursebuilder:section-activated event for ${targetSection}`);
        const event = new CustomEvent('coursebuilder:section-activated', {
          detail: { section: targetSection }
        });
        window.dispatchEvent(event);
      }, 50);
    }
    
    // Update UI
    this.updateUI();
    
    console.log(`🚀 Instance ${this.instanceId}: Navigation complete. Active section: ${targetSection}`);
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
