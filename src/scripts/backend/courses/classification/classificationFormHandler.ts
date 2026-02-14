// ==========================================================================
// CLASSIFICATION FORM HANDLER
// ==========================================================================
// Uses standard <select> elements with programmatic population
// Handles all course classification form functionality

import {
  initializeClassificationData,
  loadClassYearData,
  loadCurricularFrameworkData,
  loadIscedData,
  getSubjectsByDomain,
  getTopicsBySubject,
  getSubtopicsByTopic,
  getAvailableCourses,
  savePartialCourseClassification,
  getCourseClassification,
  CourseClassificationData,
} from "./classifyCourse";

import { getCourseId, isNewCourseMode } from "../../../utils/courseId.js";

export class ClassificationFormHandler {
  // Private state tracking
  private autoSaveTimeout: ReturnType<typeof setTimeout> | null = null;
  private lastSavedData: string = "";
  private selectedDomain: string = "";
  private selectedSubject: string = "";
  private _selectedTopic: string = "";
  private isLoadingData: boolean = false;
  private resolvedCourseId: string | null = null;

  /**
   * Get/set selected topic with proper tracking
   */
  private get selectedTopic(): string {
    return this._selectedTopic;
  }
  
  private set selectedTopic(value: string) {
    this._selectedTopic = value;
  }

  /**
   * Get current course ID from URL
   */
  private get courseId(): string | null {
    return this.resolvedCourseId || getCourseId();
  }

  /**
   * Check if we're in new course creation mode
   */
  private get isNewCourse(): boolean {
    const isNew = isNewCourseMode();
    return isNew;
  }

  constructor() {
    this.resolvedCourseId = getCourseId();
    if (typeof window !== "undefined") {
      (window as any).classificationHandler = this;
    }
    this.initialize();
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  private async initialize(): Promise<void> {
    try {
      // Initialize classification data
      await initializeClassificationData();

      // Setup form event listeners
      this.setupFormHandlers();

      // Populate static dropdowns
      await this.populateStaticDropdowns();

      // Load available courses for sequence dropdowns
      await this.populateAvailableCourses();

      // Load existing classification if course exists
      const courseId = this.courseId;
      if (courseId && !this.isNewCourse) {
        await this.loadExistingClassification(courseId);
        this.updateSaveStatus("Loaded existing data");
      } else if (this.isNewCourse) {
        this.updateSaveStatus("New course - ready for classification");
      } else {
        this.updateSaveStatus("Waiting for course creation...");
      }

    } catch (error) {
      console.error("Error initializing Classification Form Handler:", error);
      this.updateSaveStatus("Error loading data");
    }
  }

  // ==========================================================================
  // FORM SETUP
  // ==========================================================================

  private setupFormHandlers(): void {
    // Domain change handler
    const domainSelect = document.getElementById('domain-select') as HTMLSelectElement;
    if (domainSelect) {
      domainSelect.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        this.selectedDomain = target.value;
        this.handleDomainChange(target.value);
        this.triggerAutoSave();
      });
    }

    // Subject change handler
    const subjectSelect = document.getElementById('subject-select') as HTMLSelectElement;
    if (subjectSelect) {
      subjectSelect.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        this.selectedSubject = target.value;
        this.handleSubjectChange(target.value);
        this.triggerAutoSave();
      });
    }

    // Topic change handler
    const topicSelect = document.getElementById('topic-select') as HTMLSelectElement;
    if (topicSelect) {
      topicSelect.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        this.selectedTopic = target.value;
        this.handleTopicChange(target.value);
        this.triggerAutoSave();
      });
    }

    // Auto-save for all other selects
    const autoSaveSelects = ['class-year-select', 'curricular-framework-select', 'subtopic-select', 
                             'previous-course-select', 'current-course-select', 'next-course-select'];
    
    autoSaveSelects.forEach(selectId => {
      const select = document.getElementById(selectId);
      if (select) {
        select.addEventListener('change', () => this.triggerAutoSave());
      }
    });

    this.watchForCourseId();
  }

  // ==========================================================================
  // DROPDOWN POPULATION
  // ==========================================================================

  private async populateStaticDropdowns(): Promise<void> {
    await Promise.all([
      this.populateClassYearDropdown(),
      this.populateCurricularFrameworkDropdown(),
      this.populateDomainDropdown(),
    ]);
  }

  private async populateClassYearDropdown(): Promise<void> {
    try {
      const data = await loadClassYearData();
      const select = document.getElementById("class-year-select") as HTMLSelectElement;

      if (!select || !data.classYears) return;

      // Clear loading option
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
      console.error("Error populating class year dropdown:", error);
    }
  }

  private async populateCurricularFrameworkDropdown(): Promise<void> {
    try {
      const data = await loadCurricularFrameworkData();
      const select = document.getElementById("curricular-framework-select") as HTMLSelectElement;

      if (!select || !data.curricularFrameworks) return;

      // Clear loading option
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
      console.error("Error populating curricular framework dropdown:", error);
    }
  }

  private async populateDomainDropdown(): Promise<void> {
    try {
      const data = await loadIscedData();
      const select = document.getElementById("domain-select") as HTMLSelectElement;

      if (!select || !data.domains) return;

      // Clear loading option
      select.innerHTML = '<option value="">Select domain...</option>';

      // Add options
      data.domains.forEach((domain: any) => {
        const option = document.createElement('option');
        option.value = domain.value;
        option.textContent = `${domain.label} (${domain.code})`;
        select.appendChild(option);
      });

    } catch (error) {
      console.error("Error populating domain dropdown:", error);
    }
  }

  private async populateAvailableCourses(): Promise<void> {
    try {
      const courses = await getAvailableCourses();
      const courseSelects = [
        'previous-course-select',
        'current-course-select', 
        'next-course-select'
      ];

      courseSelects.forEach(selectId => {
        const select = document.getElementById(selectId) as HTMLSelectElement;
        if (!select) return;

        // Clear loading option
        select.innerHTML = '<option value="">Select course...</option>';

        // Add course options
        courses.forEach((course) => {
          const option = document.createElement('option');
          option.value = course.id;
          option.textContent = course.course_name;
          select.appendChild(option);
        });
      });

    } catch (error) {
      console.error("Error populating available courses:", error);
    }
  }

  // ==========================================================================
  // CASCADING UPDATES
  // ==========================================================================

  private async handleDomainChange(domainValue: string): Promise<void> {
    const subjectSelect = document.getElementById('subject-select') as HTMLSelectElement;
    const topicSelect = document.getElementById('topic-select') as HTMLSelectElement;
    const subtopicSelect = document.getElementById('subtopic-select') as HTMLSelectElement;

    if (!subjectSelect) return;

    // Reset dependent selects
    this.resetSelect(topicSelect, "Select subject first...");
    this.resetSelect(subtopicSelect, "Select topic first...");

    if (!domainValue) {
      this.resetSelect(subjectSelect, "Select domain first...");
      return;
    }

    try {
      const subjects = await getSubjectsByDomain(domainValue);
      
      // Clear and enable subject select
      subjectSelect.innerHTML = '<option value="">Select subject...</option>';
      subjectSelect.disabled = false;

      // Populate subjects
      subjects.forEach((subject: any) => {
        const option = document.createElement('option');
        option.value = subject.value;
        option.textContent = `${subject.label} (${subject.code})`;
        subjectSelect.appendChild(option);
      });

    } catch (error) {
      console.error("Error loading subjects:", error);
      this.resetSelect(subjectSelect, "Error loading subjects");
    }
  }

  private async handleSubjectChange(subjectValue: string): Promise<void> {
    const topicSelect = document.getElementById('topic-select') as HTMLSelectElement;
    const subtopicSelect = document.getElementById('subtopic-select') as HTMLSelectElement;

    if (!topicSelect) return;

    // Reset dependent select
    this.resetSelect(subtopicSelect, "Select topic first...");

    if (!subjectValue || !this.selectedDomain) {
      this.resetSelect(topicSelect, "Select subject first...");
      return;
    }

    try {
      const topics = await getTopicsBySubject(this.selectedDomain, subjectValue);
      
      // Clear and enable topic select
      topicSelect.innerHTML = '<option value="">Select topic...</option>';
      topicSelect.disabled = false;

      // Populate topics
      topics.forEach((topic: any) => {
        const option = document.createElement('option');
        option.value = topic.value;
        option.textContent = `${topic.label} (${topic.code})`;
        topicSelect.appendChild(option);
      });

    } catch (error) {
      console.error("Error loading topics:", error);
      this.resetSelect(topicSelect, "Error loading topics");
    }
  }

  private async handleTopicChange(topicValue: string): Promise<void> {
    const subtopicSelect = document.getElementById('subtopic-select') as HTMLSelectElement;

    if (!subtopicSelect) return;

    if (!topicValue || !this.selectedDomain || !this.selectedSubject) {
      this.resetSelect(subtopicSelect, "Select topic first...");
      return;
    }

    try {
      const subtopics = await getSubtopicsByTopic(this.selectedDomain, this.selectedSubject, topicValue);
      
      // Clear and enable subtopic select
      subtopicSelect.innerHTML = '<option value="">Select subtopic (optional)...</option>';
      subtopicSelect.disabled = false;

      // Populate subtopics
      subtopics.forEach((subtopic: any) => {
        const option = document.createElement('option');
        option.value = subtopic.value;
        option.textContent = `${subtopic.label} (${subtopic.code})`;
        subtopicSelect.appendChild(option);
      });

    } catch (error) {
      console.error("Error loading subtopics:", error);
      this.resetSelect(subtopicSelect, "Error loading subtopics");
    }
  }

  private resetSelect(select: HTMLSelectElement, placeholder: string): void {
    if (!select) return;
    
    select.innerHTML = `<option value="">${placeholder}</option>`;
    select.disabled = true;
  }

  // ==========================================================================
  // AUTO-SAVE FUNCTIONALITY
  // ==========================================================================

  private watchForCourseId(): void {
    // Check for course ID changes periodically
    const checkInterval = setInterval(() => {
      const currentCourseId = this.courseId;
      if (currentCourseId) {
        this.updateSaveStatus("Course connected - auto-save enabled");
        clearInterval(checkInterval);
      }
    }, 500);

    // Stop checking after 30 seconds
    setTimeout(() => clearInterval(checkInterval), 30000);
  }

  private triggerAutoSave(): void {
    // Don't auto-save while loading data to prevent overwriting with incomplete data
    if (this.isLoadingData) {
      return;
    }

    // Clear existing timeout
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }

    // Set new timeout for auto-save (debounced)
    this.autoSaveTimeout = setTimeout(() => {
      this.performAutoSave();
    }, 1000);

    this.updateSaveStatus("Saving changes…", "saving");
  }

  private async performAutoSave(): Promise<void> {
    const courseId = this.courseId;
    if (!courseId) {
      this.updateSaveStatus("Waiting for course creation...", "saving");
      return;
    }

    try {
      const classificationData = this.getCurrentFormData();
      
      console.log("Auto-save: Form data being sent:", classificationData);

      // Check if data has actually changed
      const currentDataString = JSON.stringify(classificationData);
      if (currentDataString === this.lastSavedData) {
        return; // No changes to save
      }

      const result = await savePartialCourseClassification(courseId, classificationData);

      if (result.success) {
        this.lastSavedData = currentDataString;
        this.updateSaveStatus(this.formatSavedMessage(), "saved");
      } else {
        throw new Error(result.error || "Failed to save classification");
      }
    } catch (error) {
      console.error("Error in auto-save:", error);
      this.updateSaveStatus("Save failed - will retry", "error");
      
      // Retry after 3 seconds
      setTimeout(() => {
        this.triggerAutoSave();
      }, 3000);
    }
  }

  private getCurrentFormData(): CourseClassificationData {
    const form = document.getElementById("course-classification-form") as HTMLFormElement;
    if (!form) throw new Error("Classification form not found");

    // Get values directly from select elements (not FormData) because disabled selects
    // are not included in FormData, but we still need their values
    const getSelectValue = (id: string): string => {
      const select = document.getElementById(id) as HTMLSelectElement;
      return select?.value || "";
    };

    return {
      class_year: getSelectValue("class-year-select"),
      curricular_framework: getSelectValue("curricular-framework-select"),
      domain: getSelectValue("domain-select"),
      subject: getSelectValue("subject-select"),
      topic: getSelectValue("topic-select"),
      subtopic: getSelectValue("subtopic-select") || undefined,
      previous_course: getSelectValue("previous-course-select") || undefined,
      current_course: getSelectValue("current-course-select") || undefined,
      next_course: getSelectValue("next-course-select") || undefined,
    };
  }

  private updateSaveStatus(
    message: string,
    state: "empty" | "saving" | "saved" | "error" = "saved",
  ): void {
    const statusElement = document.querySelector(
      '[data-course-section="classification"] .card--save-status',
    ) as HTMLElement | null;
    if (!statusElement) return;

    statusElement.dataset.status = state;
    const textElement = statusElement.querySelector(
      "[data-status-text]",
    ) as HTMLElement | null;
    if (textElement) {
      textElement.textContent = message;
    }
  }

  private formatSavedMessage(): string {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const day = now.getDate().toString().padStart(2, "0");
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const year = now.getFullYear();
    return `Last Saved: ${day}.${month}.${year}, ${hours}:${minutes}`;
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  public async setCourseId(courseId: string | null): Promise<void> {
    if (!courseId) {
      this.resolvedCourseId = null;
      this.lastSavedData = "";
      this.updateSaveStatus("Waiting for course creation...", "empty");
      return;
    }

    if (this.resolvedCourseId === courseId) {
      return;
    }

    this.resolvedCourseId = courseId;
    await this.loadExistingClassification(courseId);
  }

  public async loadExistingClassification(courseId: string): Promise<void> {
    try {
      // Set loading flag to prevent auto-save during form population
      this.isLoadingData = true;
      
      // Clear any pending auto-save
      if (this.autoSaveTimeout) {
        clearTimeout(this.autoSaveTimeout);
        this.autoSaveTimeout = null;
      }

      const classification = await getCourseClassification(courseId);
      if (classification) {
        console.log("Loading classification into form:", classification);
        
        this.populateFormWithData(classification);
        
        // Set lastSavedData immediately to prevent auto-save from triggering
        this.lastSavedData = JSON.stringify(classification);
        
        // Wait for all cascading dropdowns to populate before re-enabling auto-save
        setTimeout(() => {
          this.isLoadingData = false;
          this.updateSaveStatus(this.formatSavedMessage(), "saved");
        }, 1500); // Give enough time for all setTimeout chains to complete
      } else {
        this.isLoadingData = false;
      }
    } catch (error) {
      console.error("Error loading existing classification:", error);
      this.isLoadingData = false;
      this.updateSaveStatus("Error loading existing data", "error");
    }
  }

  private populateFormWithData(data: CourseClassificationData): void {
    // Set form values
    this.setSelectValue('class-year-select', data.class_year);
    this.setSelectValue('curricular-framework-select', data.curricular_framework);
    
    // Handle cascading selects
    if (data.domain) {
      this.setSelectValue('domain-select', data.domain);
      this.selectedDomain = data.domain;
      
      if (data.subject) {
        // Wait for subjects to load then set value
        setTimeout(async () => {
          await this.handleDomainChange(data.domain);
          this.setSelectValue('subject-select', data.subject);
          this.selectedSubject = data.subject;
          
          if (data.topic) {
            // Wait for topics to load then set value
            setTimeout(async () => {
              await this.handleSubjectChange(data.subject);
              this.setSelectValue('topic-select', data.topic);
              this.selectedTopic = data.topic;
              
              if (data.subtopic) {
                // Wait for subtopics to load then set value
                setTimeout(async () => {
                  await this.handleTopicChange(data.topic);
                  this.setSelectValue('subtopic-select', data.subtopic);
                }, 100);
              }
            }, 100);
          }
        }, 100);
      }
    }

    // Set course sequence values
    if (data.previous_course) this.setSelectValue('previous-course-select', data.previous_course);
    if (data.current_course) this.setSelectValue('current-course-select', data.current_course);
    if (data.next_course) this.setSelectValue('next-course-select', data.next_course);
  }

  private setSelectValue(selectId: string, value: string | undefined): void {
    const select = document.getElementById(selectId) as HTMLSelectElement;
    if (select && value) {
      select.value = value;
    }
  }
}

// ==========================================================================
// AUTO-INITIALIZATION
// ==========================================================================

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("course-classification-form")) {
    new ClassificationFormHandler();
  }
});
