// ==========================================================================
// CLASSIFICATION FORM HANDLER
// ==========================================================================

import {
  initializeClassificationData,
  loadClassYearData,
  loadCurricularFrameworkData,
  loadIscedData,
  getSubjectsByDomain,
  getTopicsBySubject,
  getSubtopicsByTopic,
  getAvailableCourses,
  updateCourseClassification,
  getCourseClassification,
  ClassificationFormState,
  initializeClassificationFormState,
  updateClassificationFormState,
  CourseClassificationData
} from '../backend/courses/classifyCourse';

export class ClassificationFormHandler {
  private formState: ClassificationFormState;
  private currentCourseId: string | null = null;

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
      
      console.log('Classification Form Handler initialized successfully');
    } catch (error) {
      console.error('Error initializing Classification Form Handler:', error);
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

    console.log(`Selected ${dropdownId}: ${value} (${text})`);
  }

  // ==========================================================================
  // CASCADING UPDATES
  // ==========================================================================

  private handleCascadingUpdates(dropdownId: string, value: string): void {
    switch (dropdownId) {
      case 'domain':
        this.formState = updateClassificationFormState(this.formState, 'selectedDomain', value);
        this.populateSubjectDropdown();
        this.resetDropdown('subject');
        this.resetDropdown('topic');
        this.resetDropdown('subtopic');
        break;
        
      case 'subject':
        this.formState = updateClassificationFormState(this.formState, 'selectedSubject', value);
        this.populateTopicDropdown();
        this.resetDropdown('topic');
        this.resetDropdown('subtopic');
        break;
        
      case 'topic':
        this.formState = updateClassificationFormState(this.formState, 'selectedTopic', value);
        this.populateSubtopicDropdown();
        this.resetDropdown('subtopic');
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
  // FORM HANDLING
  // ==========================================================================

  private setupFormHandlers(): void {
    const form = document.getElementById('course-classification-form') as HTMLFormElement;
    if (!form) return;

    form.addEventListener('submit', (e) => this.handleFormSubmit(e));
  }

  private async handleFormSubmit(e: Event): Promise<void> {
    e.preventDefault();
    
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const statusElement = document.getElementById('classification-form-status');
    const submitButton = document.getElementById('save-classification-btn') as HTMLButtonElement;

    if (!statusElement || !submitButton) return;

    try {
      // Disable submit button
      submitButton.disabled = true;
      submitButton.textContent = 'Saving...';
      statusElement.textContent = 'Saving classification...';
      statusElement.className = 'form__status form__status--loading';

      // Get form data
      const classificationData: CourseClassificationData = {
        class_year: formData.get('class_year') as string,
        curricular_framework: formData.get('curricular_framework') as string,
        domain: formData.get('domain') as string,
        subject: formData.get('subject') as string,
        topic: formData.get('topic') as string,
        subtopic: formData.get('subtopic') as string || undefined,
        previous_course: formData.get('previous_course') as string || undefined,
        current_course: formData.get('current_course') as string || undefined,
        next_course: formData.get('next_course') as string || undefined,
      };

      // TODO: Get actual course ID from URL or context
      const courseId = this.getCurrentCourseId();
      if (!courseId) {
        throw new Error('No course ID found. Please create a course first.');
      }

      // Update classification
      const result = await updateCourseClassification(courseId, classificationData);

      if (result.success) {
        statusElement.textContent = 'Classification saved successfully!';
        statusElement.className = 'form__status form__status--success';
      } else {
        throw new Error(result.error || 'Failed to save classification');
      }
    } catch (error) {
      console.error('Error saving classification:', error);
      statusElement.textContent = error instanceof Error ? error.message : 'An error occurred';
      statusElement.className = 'form__status form__status--error';
    } finally {
      // Re-enable submit button
      submitButton.disabled = false;
      submitButton.textContent = 'Save Classification';
    }
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  private getCurrentCourseId(): string | null {
    // This could be improved to get from URL params or global state
    // For now, return null to indicate course needs to be created first
    return this.currentCourseId;
  }

  public setCourseId(courseId: string): void {
    this.currentCourseId = courseId;
  }

  public async loadExistingClassification(courseId: string): Promise<void> {
    try {
      const classification = await getCourseClassification(courseId);
      if (classification) {
        this.populateFormWithData(classification);
      }
    } catch (error) {
      console.error('Error loading existing classification:', error);
    }
  }

  private populateFormWithData(data: CourseClassificationData): void {
    // TODO: Implement form population with existing data
    console.log('TODO: Populate form with existing classification data:', data);
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
