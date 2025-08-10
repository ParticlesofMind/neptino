// ==========================================================================
// CLASSIFICATION FORM HANDLER
// ==========================================================================

import {
  initializeClassificationData,
  loadClassYearData,
  loadCurricularFrameworkData,
  loadIscedData,
  getSubjectsByDomain,
  getSubtopicsByTopic,
  getAvailableCourses,
  savePartialCourseClassification,
  getCourseClassification,
  ClassificationFormState,
  initializeClassificationFormState,
  updateClassificationFormState,
  CourseClassificationData
} from './classifyCourse';

export class ClassificationFormHandler {
  private formState: ClassificationFormState;
  private currentCourseId: string | null = null;
  private autoSaveTimeout: NodeJS.Timeout | null = null;
  private lastSavedData: string = '';

  constructor() {
    this.formState = initializeClassificationFormState();
    this.initialize();
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  private async initialize(): Promise<void> {
    console.log('Initializing Classification Form Handler');
    
    try {
      // Get course ID from sessionStorage (set when course is created)
      this.currentCourseId = sessionStorage.getItem('currentCourseId');
      
      // Initialize classification data
      await initializeClassificationData();
      
      // Setup form event listeners
      this.setupFormHandlers();
      
      // Setup dropdown functionality
      this.setupDropdowns();
      
      // Populate static dropdowns
      await this.populateStaticDropdowns();
      
      // Load available courses for sequence dropdowns
      await this.populateAvailableCourses();
      
      // Load existing classification if course exists
      if (this.currentCourseId) {
        await this.loadExistingClassification(this.currentCourseId);
        this.updateSaveStatus('Loaded existing data');
      } else {
        this.updateSaveStatus('Waiting for course creation...');
      }
      
      console.log('Classification Form Handler initialized successfully');
    } catch (error) {
      console.error('Error initializing Classification Form Handler:', error);
      this.updateSaveStatus('Error loading data', true);
    }
  }

  // ==========================================================================
  // DROPDOWN SETUP
  // ==========================================================================

  private setupDropdowns(): void {
    const dropdowns = [
      'class-year',
      'curricular-framework',
      'domain',
      'subject',
      'topic',
      'subtopic',
      'previous-course',
      'current-course',
      'next-course'
    ];

    dropdowns.forEach(dropdownId => {
      this.setupSingleDropdown(dropdownId);
    });
  }

  private setupSingleDropdown(dropdownId: string): void {
    const trigger = document.getElementById(`${dropdownId}-dropdown`);
    const menu = document.getElementById(`${dropdownId}-menu`);
    const hiddenInput = document.getElementById(`${dropdownId}-value`) as HTMLInputElement;

    if (!trigger || !menu || !hiddenInput) {
      console.warn(`Dropdown elements not found for: ${dropdownId}`);
      return;
    }

    // Toggle dropdown
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      this.toggleDropdown(dropdownId);
    });

    // Handle option selection
    menu.addEventListener('click', (e) => {
      const option = (e.target as HTMLElement).closest('.dropdown__option') as HTMLElement;
      if (option && !option.classList.contains('dropdown__option--disabled') && !option.classList.contains('dropdown__option--header')) {
        this.selectOption(dropdownId, option);
      }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!trigger.contains(e.target as Node) && !menu.contains(e.target as Node)) {
        this.closeDropdown(dropdownId);
      }
    });
  }

  private toggleDropdown(dropdownId: string): void {
    const trigger = document.getElementById(`${dropdownId}-dropdown`);
    const menu = document.getElementById(`${dropdownId}-menu`);

    if (!trigger || !menu) return;

    const isOpen = trigger.getAttribute('aria-expanded') === 'true';
    
    // Close all other dropdowns first
    this.closeAllDropdowns();

    if (!isOpen) {
      trigger.setAttribute('aria-expanded', 'true');
      trigger.classList.add('dropdown__trigger--open');
      menu.classList.add('dropdown__menu--open');
      
      const icon = trigger.querySelector('.dropdown__icon');
      if (icon) icon.classList.add('dropdown__icon--open');
    }
  }

  private closeDropdown(dropdownId: string): void {
    const trigger = document.getElementById(`${dropdownId}-dropdown`);
    const menu = document.getElementById(`${dropdownId}-menu`);

    if (!trigger || !menu) return;

    trigger.setAttribute('aria-expanded', 'false');
    trigger.classList.remove('dropdown__trigger--open');
    menu.classList.remove('dropdown__menu--open');
    
    const icon = trigger.querySelector('.dropdown__icon');
    if (icon) icon.classList.remove('dropdown__icon--open');
  }

  private closeAllDropdowns(): void {
    const triggers = document.querySelectorAll('.dropdown__trigger');
    triggers.forEach(trigger => {
      const dropdownId = trigger.id.replace('-dropdown', '');
      this.closeDropdown(dropdownId);
    });
  }

  private selectOption(dropdownId: string, option: HTMLElement): void {
    const trigger = document.getElementById(`${dropdownId}-dropdown`);
    const hiddenInput = document.getElementById(`${dropdownId}-value`) as HTMLInputElement;
    const label = trigger?.querySelector('.dropdown__label');

    if (!trigger || !hiddenInput || !label) return;

    const value = option.dataset.value || '';
    const text = option.textContent?.trim() || '';

    // Update UI
    hiddenInput.value = value;
    label.textContent = text;
    label.classList.remove('dropdown__label--placeholder');

    // Handle cascading updates for ISCED hierarchy
    this.handleCascadingUpdates(dropdownId, value);

    // Close dropdown
    this.closeDropdown(dropdownId);

    // Mark as success
    trigger.classList.add('dropdown__trigger--success');

    // Trigger auto-save
    this.triggerAutoSave();

    console.log(`Selected ${dropdownId}: ${value} (${text})`);
  }

  // ==========================================================================
  // CASCADING UPDATES
  // ==========================================================================

  private handleCascadingUpdates(dropdownId: string, value: string): void {
    switch (dropdownId) {
      case 'domain':
        this.formState = updateClassificationFormState(this.formState, 'selectedDomain', value);
        // Reset dependent dropdowns first
        this.resetDropdown('topic');
        this.resetDropdown('subtopic');
        // Then populate the immediate next dropdown
        this.populateSubjectDropdown();
        break;
        
      case 'subject':
        this.formState = updateClassificationFormState(this.formState, 'selectedSubject', value);
        // Reset dependent dropdowns first
        this.resetDropdown('subtopic');
        // Then populate the immediate next dropdown
        this.populateTopicDropdown();
        break;
        
      case 'topic':
        this.formState = updateClassificationFormState(this.formState, 'selectedTopic', value);
        // Then populate the immediate next dropdown
        this.populateSubtopicDropdown();
        break;
    }
  }

  private resetDropdown(dropdownId: string): void {
    const trigger = document.getElementById(`${dropdownId}-dropdown`);
    const menu = document.getElementById(`${dropdownId}-menu`);
    const hiddenInput = document.getElementById(`${dropdownId}-value`) as HTMLInputElement;
    const label = trigger?.querySelector('.dropdown__label');

    if (!trigger || !menu || !hiddenInput || !label) return;

    // Reset values
    hiddenInput.value = '';
    label.classList.add('dropdown__label--placeholder');
    
    // Clear menu
    menu.innerHTML = '';
    
    // Disable trigger
    trigger.classList.add('dropdown__trigger--disabled');
    trigger.setAttribute('disabled', 'true');
    
    // Update placeholder text
    switch (dropdownId) {
      case 'subject':
        label.textContent = 'Select domain first...';
        break;
      case 'topic':
        label.textContent = 'Select subject first...';
        break;
      case 'subtopic':
        label.textContent = 'Select topic first...';
        break;
      default:
        label.textContent = `Select ${dropdownId.replace('-', ' ')}...`;
    }

    // Remove success styling
    trigger.classList.remove('dropdown__trigger--success');
  }

  // ==========================================================================
  // DROPDOWN POPULATION
  // ==========================================================================

  private async populateStaticDropdowns(): Promise<void> {
    await Promise.all([
      this.populateClassYearDropdown(),
      this.populateCurricularFrameworkDropdown(),
      this.populateDomainDropdown()
    ]);
  }

  private async populateClassYearDropdown(): Promise<void> {
    try {
      const data = await loadClassYearData();
      const menu = document.getElementById('class-year-menu');
      
      if (!menu || !data.classYears) return;

      menu.innerHTML = data.classYears.map((year: any) => `
        <div class="dropdown__option" data-value="${year.value}" role="option">
          <div class="dropdown__option-text">
            ${year.label}
            ${year.description ? `<div class="dropdown__option-description">${year.description}</div>` : ''}
          </div>
        </div>
      `).join('');

      // Enable dropdown
      this.enableDropdown('class-year');
    } catch (error) {
      console.error('Error populating class year dropdown:', error);
    }
  }

  private async populateCurricularFrameworkDropdown(): Promise<void> {
    try {
      const data = await loadCurricularFrameworkData();
      const menu = document.getElementById('curricular-framework-menu');
      
      if (!menu || !data.curricularFrameworks) return;

      menu.innerHTML = data.curricularFrameworks.map((framework: any) => `
        <div class="dropdown__option" data-value="${framework.value}" role="option">
          <div class="dropdown__option-text">
            ${framework.label}
            ${framework.description ? `<div class="dropdown__option-description">${framework.description}</div>` : ''}
          </div>
        </div>
      `).join('');

      // Enable dropdown
      this.enableDropdown('curricular-framework');
    } catch (error) {
      console.error('Error populating curricular framework dropdown:', error);
    }
  }

  private async populateDomainDropdown(): Promise<void> {
    try {
      const data = await loadIscedData();
      const menu = document.getElementById('domain-menu');
      
      if (!menu || !data.domains) return;

      menu.innerHTML = data.domains.map((domain: any) => `
        <div class="dropdown__option" data-value="${domain.value}" role="option">
          <div class="dropdown__option-text">
            ${domain.label}
            <div class="dropdown__option-code">${domain.code}</div>
          </div>
        </div>
      `).join('');

      // Enable dropdown
      this.enableDropdown('domain');
    } catch (error) {
      console.error('Error populating domain dropdown:', error);
    }
  }

  private populateSubjectDropdown(): void {
    const subjects = this.formState.availableSubjects;
    const menu = document.getElementById('subject-menu');
    
    if (!menu) return;

    if (subjects.length === 0) {
      menu.innerHTML = '<div class="dropdown__option dropdown__option--disabled">No subjects available</div>';
      return;
    }

    menu.innerHTML = subjects.map((subject: any) => `
      <div class="dropdown__option" data-value="${subject.value}" role="option">
        <div class="dropdown__option-text">
          ${subject.label}
          <div class="dropdown__option-code">${subject.code}</div>
        </div>
      </div>
    `).join('');

    // Enable dropdown
    this.enableDropdown('subject');
  }

  private populateTopicDropdown(): void {
    const topics = this.formState.availableTopics;
    const menu = document.getElementById('topic-menu');
    
    if (!menu) return;

    if (topics.length === 0) {
      menu.innerHTML = '<div class="dropdown__option dropdown__option--disabled">No topics available</div>';
      return;
    }

    menu.innerHTML = topics.map((topic: any) => `
      <div class="dropdown__option" data-value="${topic.value}" role="option">
        <div class="dropdown__option-text">
          ${topic.label}
          <div class="dropdown__option-code">${topic.code}</div>
        </div>
      </div>
    `).join('');

    // Enable dropdown
    this.enableDropdown('topic');
  }

  private populateSubtopicDropdown(): void {
    const subtopics = this.formState.availableSubtopics;
    const menu = document.getElementById('subtopic-menu');
    
    if (!menu) return;

    if (subtopics.length === 0) {
      menu.innerHTML = '<div class="dropdown__option dropdown__option--disabled">No subtopics available</div>';
      return;
    }

    menu.innerHTML = subtopics.map((subtopic: any) => `
      <div class="dropdown__option" data-value="${subtopic.value}" role="option">
        <div class="dropdown__option-text">
          ${subtopic.label}
          <div class="dropdown__option-code">${subtopic.code}</div>
        </div>
      </div>
    `).join('');

    // Enable dropdown
    this.enableDropdown('subtopic');
  }

  private async populateAvailableCourses(): Promise<void> {
    try {
      const courses = await getAvailableCourses();
      const courseDropdowns = ['previous-course', 'current-course', 'next-course'];

      courseDropdowns.forEach(dropdownId => {
        const menu = document.getElementById(`${dropdownId}-menu`);
        if (!menu) return;

        const coursesHtml = courses.map(course => `
          <div class="dropdown__option" data-value="${course.id}" role="option">
            <div class="dropdown__option-text">${course.course_name}</div>
          </div>
        `).join('');

        // Keep the header and add courses
        const existingHeader = menu.querySelector('.dropdown__option--header');
        if (existingHeader) {
          menu.innerHTML = existingHeader.outerHTML + coursesHtml;
        } else {
          menu.innerHTML = coursesHtml;
        }

        // Enable dropdown
        this.enableDropdown(dropdownId);
      });
    } catch (error) {
      console.error('Error populating available courses:', error);
    }
  }

  private enableDropdown(dropdownId: string): void {
    const trigger = document.getElementById(`${dropdownId}-dropdown`);
    if (!trigger) return;

    trigger.classList.remove('dropdown__trigger--disabled');
    trigger.removeAttribute('disabled');
    
    // Update placeholder if needed
    const label = trigger.querySelector('.dropdown__label');
    if (label && label.classList.contains('dropdown__label--placeholder')) {
      switch (dropdownId) {
        case 'subject':
          label.textContent = 'Select subject...';
          break;
        case 'topic':
          label.textContent = 'Select topic...';
          break;
        case 'subtopic':
          label.textContent = 'Select subtopic...';
          break;
      }
    }
  }

  // ==========================================================================
  // FORM HANDLING & AUTO-SAVE
  // ==========================================================================

  private setupFormHandlers(): void {
    // No more manual form submission - everything is auto-saved
    // Just listen for course ID updates from sessionStorage
    this.watchForCourseId();
  }

  private watchForCourseId(): void {
    // Check for course ID periodically in case it's set after initialization
    const checkInterval = setInterval(() => {
      const courseId = sessionStorage.getItem('currentCourseId');
      if (courseId && courseId !== this.currentCourseId) {
        this.currentCourseId = courseId;
        this.updateSaveStatus('Course connected - auto-save enabled');
        clearInterval(checkInterval);
      }
    }, 500);

    // Stop checking after 30 seconds to prevent infinite checking
    setTimeout(() => clearInterval(checkInterval), 30000);
  }

  private triggerAutoSave(): void {
    // Clear existing timeout
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }

    // Set new timeout for auto-save (debounced)
    this.autoSaveTimeout = setTimeout(() => {
      this.performAutoSave();
    }, 1000); // Save 1 second after last change

    this.updateSaveStatus('Saving...');
  }

  private async performAutoSave(): Promise<void> {
    if (!this.currentCourseId) {
      this.updateSaveStatus('Waiting for course creation...', true);
      return;
    }

    try {
      const classificationData = this.getCurrentFormData();
      
      // Check if data has actually changed
      const currentDataString = JSON.stringify(classificationData);
      if (currentDataString === this.lastSavedData) {
        return; // No changes to save
      }

      // Use partial save for auto-save (doesn't require all fields to be filled)
      const result = await savePartialCourseClassification(this.currentCourseId, classificationData);

      if (result.success) {
        this.lastSavedData = currentDataString;
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        this.updateSaveStatus(`Last saved at ${timeString}`);
      } else {
        throw new Error(result.error || 'Failed to save classification');
      }
    } catch (error) {
      console.error('Error in auto-save:', error);
      this.updateSaveStatus('Save failed - will retry', true);
      
      // Retry after 3 seconds
      setTimeout(() => {
        this.triggerAutoSave();
      }, 3000);
    }
  }

  private getCurrentFormData(): CourseClassificationData {
    const form = document.getElementById('course-classification-form') as HTMLFormElement;
    if (!form) throw new Error('Classification form not found');

    const formData = new FormData(form);
    return {
      class_year: formData.get('class_year') as string || '',
      curricular_framework: formData.get('curricular_framework') as string || '',
      domain: formData.get('domain') as string || '',
      subject: formData.get('subject') as string || '',
      topic: formData.get('topic') as string || '',
      subtopic: formData.get('subtopic') as string || undefined,
      previous_course: formData.get('previous_course') as string || undefined,
      current_course: formData.get('current_course') as string || undefined,
      next_course: formData.get('next_course') as string || undefined,
    };
  }

  private updateSaveStatus(message: string, isError: boolean = false): void {
    const statusElement = document.getElementById('classification-save-status');
    if (!statusElement) return;

    statusElement.textContent = message;
    
    // Update styling based on status
    const indicator = document.getElementById('classification-last-saved');
    if (indicator) {
      indicator.className = `save-indicator ${isError ? 'save-indicator--error' : 'save-indicator--success'}`;
    }
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  public setCourseId(courseId: string): void {
    this.currentCourseId = courseId;
    sessionStorage.setItem('currentCourseId', courseId);
    this.updateSaveStatus('Course connected - auto-save enabled');
  }

  public async loadExistingClassification(courseId: string): Promise<void> {
    try {
      const classification = await getCourseClassification(courseId);
      if (classification) {
        this.populateFormWithData(classification);
        this.lastSavedData = JSON.stringify(classification);
        this.updateSaveStatus('Loaded existing data');
      }
    } catch (error) {
      console.error('Error loading existing classification:', error);
      this.updateSaveStatus('Error loading existing data', true);
    }
  }

  private populateFormWithData(data: CourseClassificationData): void {
    // Update form state
    this.formState.selectedDomain = data.domain || '';
    this.formState.selectedSubject = data.subject || '';
    this.formState.selectedTopic = data.topic || '';
    this.formState.selectedSubtopic = data.subtopic || '';

    // Populate dropdowns with cascade
    if (data.domain) {
      this.setDropdownValue('domain', data.domain);
      this.formState = updateClassificationFormState(this.formState, 'selectedDomain', data.domain);
      this.populateSubjectDropdown();
      
      if (data.subject) {
        this.setDropdownValue('subject', data.subject);
        this.formState = updateClassificationFormState(this.formState, 'selectedSubject', data.subject);
        this.populateTopicDropdown();
        
        if (data.topic) {
          this.setDropdownValue('topic', data.topic);
          this.formState = updateClassificationFormState(this.formState, 'selectedTopic', data.topic);
          this.populateSubtopicDropdown();
          
          if (data.subtopic) {
            this.setDropdownValue('subtopic', data.subtopic);
          }
        }
      }
    }

    // Set other dropdowns
    if (data.class_year) this.setDropdownValue('class-year', data.class_year);
    if (data.curricular_framework) this.setDropdownValue('curricular-framework', data.curricular_framework);
    if (data.previous_course) this.setDropdownValue('previous-course', data.previous_course);
    if (data.current_course) this.setDropdownValue('current-course', data.current_course);
    if (data.next_course) this.setDropdownValue('next-course', data.next_course);
  }

  private setDropdownValue(dropdownId: string, value: string): void {
    const trigger = document.getElementById(`${dropdownId}-dropdown`);
    const hiddenInput = document.getElementById(`${dropdownId}-value`) as HTMLInputElement;
    const label = trigger?.querySelector('.dropdown__label');

    if (!trigger || !hiddenInput || !label) return;

    hiddenInput.value = value;
    
    // Find the option with this value to get the display text
    const menu = document.getElementById(`${dropdownId}-menu`);
    const option = menu?.querySelector(`[data-value="${value}"]`);
    if (option) {
      label.textContent = option.textContent?.trim() || value;
      label.classList.remove('dropdown__label--placeholder');
      trigger.classList.add('dropdown__trigger--success');
      this.enableDropdown(dropdownId);
    }
  }
}

// ==========================================================================
// AUTO-INITIALIZATION
// ==========================================================================

// Initialize when DOM is ready - but only on the classification section
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('course-classification-form')) {
    new ClassificationFormHandler();
    console.log('ClassificationFormHandler initialized');
  }
});
