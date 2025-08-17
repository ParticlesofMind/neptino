/**
 * CourseBuilder Classification Dropdown Handler
 * Handles dropdown functionality for classification forms with proper BEM styling
 */

import { 
  loadClassYearData, 
  loadCurricularFrameworkData, 
  loadIscedData,
  getSubjectsByDomain,
  getTopicsBySubject,
  getSubtopicsByTopic,
  getAvailableCourses 
} from '../backend/courses/classifyCourse';

export interface DropdownOption {
  value: string;
  label: string;
  description?: string;
  code?: string;
}

export class CourseBuilderDropdownHandler {
  private courseId: string = '';
  private activeDropdownId: string | null = null;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      console.log('🔧 Initializing CourseBuilder Dropdown Handler...');
      
      // Setup event listeners for all dropdowns
      this.setupDropdownEventListeners();
      
      // Populate static dropdowns with data
      await this.populateStaticDropdowns();
      
      console.log('✅ CourseBuilder Dropdown Handler initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing CourseBuilder Dropdown Handler:', error);
    }
  }

  private setupDropdownEventListeners(): void {
    const dropdownIds = [
      'class-year', 'curricular-framework', 'domain', 
      'subject', 'topic', 'subtopic',
      'previous-course', 'current-course', 'next-course'
    ];

    dropdownIds.forEach(id => {
      const toggle = document.getElementById(`${id}-dropdown`);
      const menu = document.getElementById(`${id}-menu`);

      if (toggle && menu) {
        // Toggle dropdown on button click
        toggle.addEventListener('click', (e) => {
          e.preventDefault();
          this.toggleDropdown(id);
        });

        // Handle option selection
        menu.addEventListener('click', (e) => {
          const link = (e.target as HTMLElement).closest('.dropdown__link') as HTMLElement;
          if (link) {
            e.preventDefault();
            const value = link.dataset.value || '';
            const text = link.textContent?.trim() || '';
            this.selectOption(id, value, text);
          }
        });
      }
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
      if (!this.activeDropdownId) return;
      
      const toggle = document.getElementById(`${this.activeDropdownId}-dropdown`);
      const menu = document.getElementById(`${this.activeDropdownId}-menu`);
      
      if (toggle && menu && 
          !toggle.contains(e.target as Node) && 
          !menu.contains(e.target as Node)) {
        this.closeDropdown(this.activeDropdownId);
      }
    });
  }

  private toggleDropdown(dropdownId: string): void {
    const toggle = document.getElementById(`${dropdownId}-dropdown`);
    const menu = document.getElementById(`${dropdownId}-menu`);

    if (!toggle || !menu) return;

    const isOpen = toggle.getAttribute('aria-expanded') === 'true';

    // Close all dropdowns first
    this.closeAllDropdowns();

    if (!isOpen) {
      // Open this dropdown
      toggle.setAttribute('aria-expanded', 'true');
      menu.classList.add('dropdown__menu--active');
      this.activeDropdownId = dropdownId;

      // Update icon rotation
      const icon = toggle.querySelector('.dropdown__icon') as HTMLElement;
      if (icon) {
        icon.style.transform = 'rotate(180deg)';
      }
    }
  }

  private closeDropdown(dropdownId: string): void {
    const toggle = document.getElementById(`${dropdownId}-dropdown`);
    const menu = document.getElementById(`${dropdownId}-menu`);

    if (!toggle || !menu) return;

    toggle.setAttribute('aria-expanded', 'false');
    menu.classList.remove('dropdown__menu--active');
    
    if (this.activeDropdownId === dropdownId) {
      this.activeDropdownId = null;
    }

    // Reset icon rotation
    const icon = toggle.querySelector('.dropdown__icon') as HTMLElement;
    if (icon) {
      icon.style.transform = 'rotate(0deg)';
    }
  }

  private closeAllDropdowns(): void {
    const dropdowns = document.querySelectorAll('.coursebuilder-dropdown [aria-expanded="true"]');
    dropdowns.forEach(dropdown => {
      const id = dropdown.id.replace('-dropdown', '');
      this.closeDropdown(id);
    });
  }

  private selectOption(dropdownId: string, value: string, text: string): void {
    const toggle = document.getElementById(`${dropdownId}-dropdown`);
    const hiddenInput = document.getElementById(`${dropdownId}-value`) as HTMLInputElement;
    const textElement = toggle?.querySelector('.dropdown__text');

    if (!toggle || !hiddenInput || !textElement) return;

    // Update the dropdown display
    textElement.textContent = text;
    hiddenInput.value = value;

    // Add visual feedback
    toggle.classList.add('coursebuilder-dropdown__toggle--selected');

    // Handle cascading updates
    this.handleCascadingUpdates(dropdownId, value);

    // Close the dropdown
    this.closeDropdown(dropdownId);

    console.log(`📝 Selected ${dropdownId}:`, { value, text });
  }

  private handleCascadingUpdates(dropdownId: string, value: string): void {
    switch (dropdownId) {
      case 'domain':
        this.resetDependentDropdowns(['subject', 'topic', 'subtopic']);
        this.populateSubjectDropdown(value);
        break;
        
      case 'subject':
        this.resetDependentDropdowns(['topic', 'subtopic']);
        this.populateTopicDropdown(value);
        break;
        
      case 'topic':
        this.resetDependentDropdowns(['subtopic']);
        this.populateSubtopicDropdown(value);
        break;
    }
  }

  private resetDependentDropdowns(dropdownIds: string[]): void {
    dropdownIds.forEach(id => {
      const toggle = document.getElementById(`${id}-dropdown`);
      const menu = document.getElementById(`${id}-menu`);
      const hiddenInput = document.getElementById(`${id}-value`) as HTMLInputElement;
      const textElement = toggle?.querySelector('.dropdown__text');

      if (toggle && menu && hiddenInput && textElement) {
        // Reset values
        hiddenInput.value = '';
        textElement.textContent = this.getPlaceholderText(id);
        
        // Clear menu
        menu.innerHTML = `<div class="coursebuilder-dropdown__empty">${this.getEmptyStateText(id)}</div>`;
        
        // Disable dropdown
        toggle.setAttribute('disabled', 'true');
        toggle.classList.remove('coursebuilder-dropdown__toggle--selected');
      }
    });
  }

  private getPlaceholderText(dropdownId: string): string {
    const placeholders: { [key: string]: string } = {
      'subject': 'Select domain first...',
      'topic': 'Select subject first...',
      'subtopic': 'Select topic first...'
    };
    return placeholders[dropdownId] || `Select ${dropdownId.replace('-', ' ')}...`;
  }

  private getEmptyStateText(dropdownId: string): string {
    const emptyStates: { [key: string]: string } = {
      'subject': 'Select a domain first',
      'topic': 'Select a subject first',
      'subtopic': 'Select a topic first'
    };
    return emptyStates[dropdownId] || 'No options available';
  }

  private async populateStaticDropdowns(): Promise<void> {
    await Promise.all([
      this.populateClassYearDropdown(),
      this.populateCurricularFrameworkDropdown(),
      this.populateDomainDropdown(),
      this.populateAvailableCourses()
    ]);
  }

  private async populateClassYearDropdown(): Promise<void> {
    try {
      const data = await loadClassYearData();
      const menu = document.getElementById('class-year-menu');
      const loading = document.getElementById('class-year-loading');

      if (!menu || !data?.classYears) return;

      // Hide loading
      if (loading) loading.style.display = 'none';

      // Populate options
      menu.innerHTML = data.classYears
        .map((year: any) => `
          <div class="dropdown__item" role="none">
            <button class="dropdown__link" data-value="${year.value}" role="option" type="button">
              <div class="dropdown__option-content">
                <div class="dropdown__option-title">${year.label}</div>
                ${year.description ? `<div class="dropdown__option-description">${year.description}</div>` : ''}
              </div>
            </button>
          </div>
        `)
        .join('');

      // Enable dropdown
      this.enableDropdown('class-year');

    } catch (error) {
      console.error('Error populating class year dropdown:', error);
      this.showDropdownError('class-year', 'Error loading class years');
    }
  }

  private async populateCurricularFrameworkDropdown(): Promise<void> {
    try {
      const data = await loadCurricularFrameworkData();
      const menu = document.getElementById('curricular-framework-menu');
      const loading = document.getElementById('curricular-framework-loading');

      if (!menu || !data?.curricularFrameworks) return;

      // Hide loading
      if (loading) loading.style.display = 'none';

      // Populate options
      menu.innerHTML = data.curricularFrameworks
        .map((framework: any) => `
          <div class="dropdown__item" role="none">
            <button class="dropdown__link" data-value="${framework.value}" role="option" type="button">
              <div class="dropdown__option-content">
                <div class="dropdown__option-title">${framework.label}</div>
                ${framework.description ? `<div class="dropdown__option-description">${framework.description}</div>` : ''}
              </div>
            </button>
          </div>
        `)
        .join('');

      // Enable dropdown
      this.enableDropdown('curricular-framework');

    } catch (error) {
      console.error('Error populating curricular framework dropdown:', error);
      this.showDropdownError('curricular-framework', 'Error loading frameworks');
    }
  }

  private async populateDomainDropdown(): Promise<void> {
    try {
      const data = await loadIscedData();
      const menu = document.getElementById('domain-menu');
      const loading = document.getElementById('domain-loading');

      if (!menu || !data?.domains) return;

      // Hide loading
      if (loading) loading.style.display = 'none';

      // Populate options
      menu.innerHTML = data.domains
        .map((domain: any) => `
          <div class="dropdown__item" role="none">
            <button class="dropdown__link" data-value="${domain.value}" role="option" type="button">
              <div class="dropdown__option-content">
                <div class="dropdown__option-title">${domain.label}</div>
                <div class="dropdown__option-description">Code: ${domain.code}</div>
              </div>
            </button>
          </div>
        `)
        .join('');

      // Enable dropdown
      this.enableDropdown('domain');

    } catch (error) {
      console.error('Error populating domain dropdown:', error);
      this.showDropdownError('domain', 'Error loading domains');
    }
  }

  private populateSubjectDropdown(domainValue: string): void {
    try {
      const subjects = getSubjectsByDomain(domainValue);
      const menu = document.getElementById('subject-menu');

      if (!menu) return;

      if (subjects.length === 0) {
        menu.innerHTML = '<div class="coursebuilder-dropdown__empty">No subjects available</div>';
        return;
      }

      menu.innerHTML = subjects
        .map((subject: any) => `
          <div class="dropdown__item" role="none">
            <button class="dropdown__link" data-value="${subject.value}" role="option" type="button">
              <div class="dropdown__option-content">
                <div class="dropdown__option-title">${subject.label}</div>
                <div class="dropdown__option-description">Code: ${subject.code}</div>
              </div>
            </button>
          </div>
        `)
        .join('');

      this.enableDropdown('subject');

    } catch (error) {
      console.error('Error populating subject dropdown:', error);
      this.showDropdownError('subject', 'Error loading subjects');
    }
  }

  private populateTopicDropdown(subjectValue: string): void {
    try {
      const domainValue = (document.getElementById('domain-value') as HTMLInputElement)?.value || '';
      const topics = getTopicsBySubject(domainValue, subjectValue);
      const menu = document.getElementById('topic-menu');

      if (!menu) return;

      if (topics.length === 0) {
        menu.innerHTML = '<div class="coursebuilder-dropdown__empty">No topics available</div>';
        return;
      }

      menu.innerHTML = topics
        .map((topic: any) => `
          <div class="dropdown__item" role="none">
            <button class="dropdown__link" data-value="${topic.value}" role="option" type="button">
              <div class="dropdown__option-content">
                <div class="dropdown__option-title">${topic.label}</div>
                <div class="dropdown__option-description">Code: ${topic.code}</div>
              </div>
            </button>
          </div>
        `)
        .join('');

      this.enableDropdown('topic');

    } catch (error) {
      console.error('Error populating topic dropdown:', error);
      this.showDropdownError('topic', 'Error loading topics');
    }
  }

  private populateSubtopicDropdown(topicValue: string): void {
    try {
      const domainValue = (document.getElementById('domain-value') as HTMLInputElement)?.value || '';
      const subjectValue = (document.getElementById('subject-value') as HTMLInputElement)?.value || '';
      const subtopics = getSubtopicsByTopic(domainValue, subjectValue, topicValue);
      const menu = document.getElementById('subtopic-menu');

      if (!menu) return;

      if (subtopics.length === 0) {
        menu.innerHTML = '<div class="coursebuilder-dropdown__empty">No subtopics available</div>';
        return;
      }

      menu.innerHTML = subtopics
        .map((subtopic: any) => `
          <div class="dropdown__item" role="none">
            <button class="dropdown__link" data-value="${subtopic.value}" role="option" type="button">
              <div class="dropdown__option-content">
                <div class="dropdown__option-title">${subtopic.label}</div>
                <div class="dropdown__option-description">Code: ${subtopic.code}</div>
              </div>
            </button>
          </div>
        `)
        .join('');

      this.enableDropdown('subtopic');

    } catch (error) {
      console.error('Error populating subtopic dropdown:', error);
      this.showDropdownError('subtopic', 'Error loading subtopics');
    }
  }

  private async populateAvailableCourses(): Promise<void> {
    try {
      const courses = await getAvailableCourses();
      
      // Populate all course sequence dropdowns
      ['previous-course', 'current-course', 'next-course'].forEach(dropdownId => {
        const menu = document.getElementById(`${dropdownId}-menu`);
        const loading = document.getElementById(`${dropdownId}-loading`);

        if (!menu) return;

        // Hide loading
        if (loading) loading.style.display = 'none';

        if (courses.length === 0) {
          menu.innerHTML = `
            <div class="dropdown__header coursebuilder-dropdown__header">Your Courses</div>
            <div class="coursebuilder-dropdown__empty">No courses available</div>
          `;
          return;
        }

        menu.innerHTML = `
          <div class="dropdown__header coursebuilder-dropdown__header">Your Courses</div>
          ${courses
            .map((course: any) => `
              <div class="dropdown__item" role="none">
                <button class="dropdown__link" data-value="${course.id}" role="option" type="button">
                  <div class="dropdown__option-content">
                    <div class="dropdown__option-title">${course.course_name}</div>
                  </div>
                </button>
              </div>
            `)
            .join('')}
        `;

        this.enableDropdown(dropdownId);
      });

    } catch (error) {
      console.error('Error populating available courses:', error);
      ['previous-course', 'current-course', 'next-course'].forEach(dropdownId => {
        this.showDropdownError(dropdownId, 'Error loading courses');
      });
    }
  }

  private enableDropdown(dropdownId: string): void {
    const toggle = document.getElementById(`${dropdownId}-dropdown`);
    if (toggle) {
      toggle.removeAttribute('disabled');
      toggle.classList.remove('dropdown__toggle--disabled');
    }
  }

  private showDropdownError(dropdownId: string, message: string): void {
    const menu = document.getElementById(`${dropdownId}-menu`);
    const loading = document.getElementById(`${dropdownId}-loading`);
    
    if (loading) loading.style.display = 'none';
    if (menu) {
      menu.innerHTML = `<div class="coursebuilder-dropdown__empty">${message}</div>`;
    }
  }

  // =============================================================================
  // PUBLIC API METHODS
  // =============================================================================

  /**
   * Update course ID and refresh dropdowns if needed
   */
  setCourseId(courseId: string): void {
    this.courseId = courseId;
    console.log(`📋 Dropdown handler updated with course ID: ${courseId}`);
    
    // If we have course sequence data, we might want to refresh those dropdowns
    // This could be expanded to load course-specific data in the future
  }

  /**
   * Get current course ID
   */
  getCourseId(): string {
    return this.courseId;
  }
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.includes('coursebuilder.html')) {
    new CourseBuilderDropdownHandler();
  }
});
