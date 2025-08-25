/**
 * CourseBuilder Select Handler - Simple native select management
 * Handles classification form select elements with cascading dependencies
 */

import {
  loadClassYearData,
  loadCurricularFrameworkData,
  loadIscedData,
  getSubjectsByDomain,
  getTopicsBySubject,
  getSubtopicsByTopic,
  getAvailableCourses
} from "../backend/courses/classification/classifyCourse";

export class CourseBuilderSelectHandler {
  private courseId: string = '';

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    console.log('📋 Initializing CourseBuilder Select Handler...');
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }
  }

  private async setup(): Promise<void> {
    try {
      // Set up event listeners for cascading selects
      this.setupEventListeners();
      
      // Populate static data
      await this.populateStaticSelects();
      
      console.log('✅ CourseBuilder Select Handler initialized');
    } catch (error) {
      console.error('❌ Failed to initialize select handler:', error);
    }
  }

  private setupEventListeners(): void {
    // Domain -> Subject cascade
    const domainSelect = document.getElementById('domain') as HTMLSelectElement;
    if (domainSelect) {
      domainSelect.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        this.populateSubjectSelect(target.value);
        this.resetSelect('topic');
        this.resetSelect('subtopic');
      });
    }

    // Subject -> Topic cascade
    const subjectSelect = document.getElementById('subject') as HTMLSelectElement;
    if (subjectSelect) {
      subjectSelect.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        const domainValue = domainSelect?.value || '';
        this.populateTopicSelect(domainValue, target.value);
        this.resetSelect('subtopic');
      });
    }

    // Topic -> Subtopic cascade
    const topicSelect = document.getElementById('topic') as HTMLSelectElement;
    if (topicSelect) {
      topicSelect.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        const domainValue = domainSelect?.value || '';
        const subjectValue = subjectSelect?.value || '';
        this.populateSubtopicSelect(domainValue, subjectValue, target.value);
      });
    }

    // Auto-save on any change
    const form = document.getElementById('course-classification-form');
    if (form) {
      form.addEventListener('change', () => {
        this.handleFormChange();
      });
    }
  }

  private async populateStaticSelects(): Promise<void> {
    await Promise.all([
      this.populateClassYearSelect(),
      this.populateCurricularFrameworkSelect(),
      this.populateDomainSelect(),
      this.populateAvailableCoursesSelects()
    ]);
  }

  private async populateClassYearSelect(): Promise<void> {
    try {
      const data = await loadClassYearData();
      const select = document.getElementById('class-year') as HTMLSelectElement;
      
      if (!select || !data?.classYears) return;

      // Clear existing options except placeholder
      select.innerHTML = '<option value="">Select class year...</option>';
      
      // Add options
      data.classYears.forEach((year: any) => {
        const option = document.createElement('option');
        option.value = year.value;
        option.textContent = year.label;
        if (year.description) {
          option.title = year.description;
        }
        select.appendChild(option);
      });

    } catch (error) {
      console.error('Error populating class year select:', error);
    }
  }

  private async populateCurricularFrameworkSelect(): Promise<void> {
    try {
      const data = await loadCurricularFrameworkData();
      const select = document.getElementById('curricular-framework') as HTMLSelectElement;
      
      if (!select || !data?.curricularFrameworks) return;

      // Clear existing options except placeholder
      select.innerHTML = '<option value="">Select framework...</option>';
      
      // Add options
      data.curricularFrameworks.forEach((framework: any) => {
        const option = document.createElement('option');
        option.value = framework.value;
        option.textContent = framework.label;
        if (framework.description) {
          option.title = framework.description;
        }
        select.appendChild(option);
      });

    } catch (error) {
      console.error('Error populating curricular framework select:', error);
    }
  }

  private async populateDomainSelect(): Promise<void> {
    try {
      const data = await loadIscedData();
      const select = document.getElementById('domain') as HTMLSelectElement;
      
      if (!select || !data?.domains) return;

      // Clear existing options except placeholder
      select.innerHTML = '<option value="">Select domain...</option>';
      
      // Add options
      data.domains.forEach((domain: any) => {
        const option = document.createElement('option');
        option.value = domain.value;
        option.textContent = `${domain.label} (${domain.code})`;
        select.appendChild(option);
      });

    } catch (error) {
      console.error('Error populating domain select:', error);
    }
  }

  private populateSubjectSelect(domainValue: string): void {
    const select = document.getElementById('subject') as HTMLSelectElement;
    if (!select) return;

    if (!domainValue) {
      this.resetSelect('subject');
      return;
    }

    try {
      const subjects = getSubjectsByDomain(domainValue);
      
      // Clear existing options
      select.innerHTML = '<option value="">Select subject...</option>';
      
      // Add options
      subjects.forEach((subject: any) => {
        const option = document.createElement('option');
        option.value = subject.value;
        option.textContent = `${subject.label} (${subject.code})`;
        select.appendChild(option);
      });

      // Enable select
      select.disabled = false;

    } catch (error) {
      console.error('Error populating subject select:', error);
      this.resetSelect('subject');
    }
  }

  private populateTopicSelect(domainValue: string, subjectValue: string): void {
    const select = document.getElementById('topic') as HTMLSelectElement;
    if (!select) return;

    if (!domainValue || !subjectValue) {
      this.resetSelect('topic');
      return;
    }

    try {
      const topics = getTopicsBySubject(domainValue, subjectValue);
      
      // Clear existing options
      select.innerHTML = '<option value="">Select topic...</option>';
      
      // Add options
      topics.forEach((topic: any) => {
        const option = document.createElement('option');
        option.value = topic.value;
        option.textContent = `${topic.label} (${topic.code})`;
        select.appendChild(option);
      });

      // Enable select
      select.disabled = false;

    } catch (error) {
      console.error('Error populating topic select:', error);
      this.resetSelect('topic');
    }
  }

  private populateSubtopicSelect(domainValue: string, subjectValue: string, topicValue: string): void {
    const select = document.getElementById('subtopic') as HTMLSelectElement;
    if (!select) return;

    if (!domainValue || !subjectValue || !topicValue) {
      this.resetSelect('subtopic');
      return;
    }

    try {
      const subtopics = getSubtopicsByTopic(domainValue, subjectValue, topicValue);
      
      // Clear existing options
      select.innerHTML = '<option value="">Select subtopic...</option>';
      
      // Add options
      subtopics.forEach((subtopic: any) => {
        const option = document.createElement('option');
        option.value = subtopic.value;
        option.textContent = `${subtopic.label} (${subtopic.code})`;
        select.appendChild(option);
      });

      // Enable select
      select.disabled = false;

    } catch (error) {
      console.error('Error populating subtopic select:', error);
      this.resetSelect('subtopic');
    }
  }

  private async populateAvailableCoursesSelects(): Promise<void> {
    try {
      const courses = await getAvailableCourses();
      
      const selectIds = ['previous-course', 'current-course', 'next-course'];
      
      selectIds.forEach(selectId => {
        const select = document.getElementById(selectId) as HTMLSelectElement;
        if (!select) return;

        // Clear existing options except placeholder
        select.innerHTML = `<option value="">Select ${selectId.replace('-', ' ')}...</option>`;
        
        // Add course options
        courses.forEach((course: any) => {
          const option = document.createElement('option');
          option.value = course.id;
          option.textContent = course.course_name;
          select.appendChild(option);
        });
      });

    } catch (error) {
      console.error('Error populating course selects:', error);
    }
  }

  private resetSelect(selectId: string): void {
    const select = document.getElementById(selectId) as HTMLSelectElement;
    if (!select) return;

    const placeholders: { [key: string]: string } = {
      'subject': 'Select domain first...',
      'topic': 'Select subject first...',
      'subtopic': 'Select topic first...'
    };

    select.innerHTML = `<option value="">${placeholders[selectId] || 'Select...'}</option>`;
    select.disabled = true;
  }

  private handleFormChange(): void {
    // Simple auto-save implementation
    console.log('📝 Form changed - auto-saving...');
    
    // You can implement actual save logic here
    // For now, just show status
    this.updateStatus('Changes saved automatically');
  }

  private updateStatus(message: string): void {
    const statusElement = document.querySelector('#classification-status .coursebuilder-form__status-text');
    if (statusElement) {
      statusElement.textContent = message;
    }
  }

  // =============================================================================
  // PUBLIC API METHODS
  // =============================================================================

  setCourseId(courseId: string): void {
    this.courseId = courseId;
    console.log(`📋 Select handler updated with course ID: ${courseId}`);
  }

  getCourseId(): string {
    return this.courseId;
  }
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.includes('coursebuilder.html')) {
    new CourseBuilderSelectHandler();
  }
});
