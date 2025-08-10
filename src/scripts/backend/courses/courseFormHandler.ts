// ==========================================================================
// GENERIC COURSE FORM HANDLER - Works for ALL Course Builder Articles
// ==========================================================================

import { supabase } from '../supabase';

// ==========================================================================
// TYPES & INTERFACES
// ==========================================================================

export interface FormFieldConfig {
  name: string;
  type: 'text' | 'textarea' | 'select' | 'file' | 'number' | 'date' | 'time' | 'display';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  accept?: string; // for file inputs
  options?: string[]; // for select dropdowns
  displayFunction?: () => Promise<string>; // for display fields
}

export interface SectionConfig {
  section: string;
  requiredFields: string[];
  jsonbField?: string; // Store in classification_data, schedule_settings, etc.
  fields: FormFieldConfig[];
  submitLabel?: string;
  autoSave?: boolean;
}

export interface ValidationState {
  [fieldName: string]: boolean;
}

// ==========================================================================
// SECTION CONFIGURATIONS
// ==========================================================================

export const SECTION_CONFIGS: { [key: string]: SectionConfig } = {
  essentials: {
    section: 'essentials',
    requiredFields: ['course_name', 'course_description', 'teacher_id', 'institution', 'course_language', 'course_image'],
    fields: [
      { name: 'course_name', type: 'text', required: true, minLength: 3 },
      { name: 'course_description', type: 'textarea', required: true, minLength: 10 },
      { 
        name: 'teacher_id', 
        type: 'display', 
        required: true,
        displayFunction: async () => {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: profile } = await supabase
              .from('users')
              .select('first_name, last_name')
              .eq('id', user.id)
              .single();
            return profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown Teacher';
          }
          return 'Unknown Teacher';
        }
      },
      { 
        name: 'institution', 
        type: 'display', 
        required: true,
        displayFunction: async () => {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: profile } = await supabase
              .from('users')
              .select('institution')
              .eq('id', user.id)
              .single();
            return profile?.institution || 'Independent';
          }
          return 'Independent';
        }
      },
      { 
        name: 'course_language', 
        type: 'select', 
        required: true,
        options: ['English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Dutch', 'Chinese', 'Japanese', 'Korean', 'Arabic', 'Other']
      },
      { name: 'course_image', type: 'file', required: true, accept: 'image/*' }
    ],
    submitLabel: 'Create Course',
    autoSave: false
  },
  
  classification: {
    section: 'classification',
    requiredFields: ['class_year', 'subject'],
    jsonbField: 'classification_data',
    fields: [
      { name: 'class_year', type: 'select', required: true },
      { name: 'curricular_framework', type: 'text', required: false },
      { name: 'subject', type: 'text', required: true },
      { name: 'topic', type: 'text', required: false },
      { name: 'subtopic', type: 'text', required: false }
    ],
    autoSave: true
  },

  schedule: {
    section: 'schedule',
    requiredFields: ['start_date', 'schedule_type'],
    jsonbField: 'schedule_settings',
    fields: [
      { name: 'start_date', type: 'date', required: true },
      { name: 'end_date', type: 'date', required: false },
      { name: 'schedule_type', type: 'select', required: true },
      { name: 'class_time', type: 'time', required: false },
      { name: 'class_duration', type: 'number', required: false }
    ],
    autoSave: true
  },

  // Add more as needed...
  curriculum: {
    section: 'curriculum',
    requiredFields: ['curriculum_approach'],
    jsonbField: 'classification_data', // or create curriculum_data field
    fields: [
      { name: 'curriculum_approach', type: 'select', required: true },
      { name: 'learning_objectives', type: 'textarea', required: false },
      { name: 'assessment_methods', type: 'textarea', required: false }
    ],
    autoSave: true
  }
};

// ==========================================================================
// GENERIC COURSE FORM HANDLER CLASS
// ==========================================================================

export class CourseFormHandler {
  private sectionConfig: SectionConfig;
  private form: HTMLFormElement | null = null;
  private currentCourseId: string | null = null;
  private validationState: ValidationState = {};
  private debounceTimer: NodeJS.Timeout | null = null;

  constructor(sectionName: string) {
    this.sectionConfig = SECTION_CONFIGS[sectionName];
    if (!this.sectionConfig) {
      throw new Error(`No configuration found for section: ${sectionName}`);
    }
    
    this.currentCourseId = sessionStorage.getItem('currentCourseId');
    this.initialize();
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  private initialize(): void {
    this.findForm();
    if (this.form) {
      this.initializeFields();
      this.setupEventListeners();
      this.initializeValidation();
      console.log(`${this.sectionConfig.section} form handler initialized`);
    }
  }

  private async initializeFields(): Promise<void> {
    if (!this.form) return;

    for (const fieldConfig of this.sectionConfig.fields) {
      const field = this.form.querySelector(`[name="${fieldConfig.name}"]`) as HTMLElement;
      
      if (!field) continue;

      // Handle display fields
      if (fieldConfig.type === 'display' && fieldConfig.displayFunction) {
        try {
          const displayValue = await fieldConfig.displayFunction();
          if (field.tagName === 'INPUT') {
            (field as HTMLInputElement).value = displayValue;
            (field as HTMLInputElement).readOnly = true;
          } else {
            field.textContent = displayValue;
          }
        } catch (error) {
          console.error(`Error setting display field ${fieldConfig.name}:`, error);
        }
      }

      // Handle select fields with options
      if (fieldConfig.type === 'select' && fieldConfig.options && field.tagName === 'SELECT') {
        const select = field as HTMLSelectElement;
        select.innerHTML = ''; // Clear existing options
        
        // Add default option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = `Select ${fieldConfig.name.replace('_', ' ')}...`;
        select.appendChild(defaultOption);
        
        // Add options
        fieldConfig.options.forEach(option => {
          const optionElement = document.createElement('option');
          optionElement.value = option;
          optionElement.textContent = option;
          select.appendChild(optionElement);
        });
      }
    }
  }

  private findForm(): void {
    // Auto-detect form in current article
    const activeArticle = document.querySelector('.article--active');
    if (activeArticle) {
      this.form = activeArticle.querySelector('form');
    }
  }

  private setupEventListeners(): void {
    if (!this.form) return;

    // Auto-detect all form inputs
    const inputs = this.form.querySelectorAll('input, textarea, select');
    
    inputs.forEach(input => {
      const inputElement = input as HTMLInputElement;
      if (inputElement.type === 'file') {
        input.addEventListener('change', () => this.handleFileChange(inputElement));
      } else {
        input.addEventListener('input', () => this.handleInputChange());
        input.addEventListener('change', () => this.handleInputChange());
      }
    });

    // Handle form submission
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));
  }

  // ==========================================================================
  // VALIDATION
  // ==========================================================================

  private initializeValidation(): void {
    this.validateForm();
  }

  private validateForm(): void {
    if (!this.form) return;

    const formData = this.getFormData();
    this.validationState = {};

    // Validate each configured field
    this.sectionConfig.fields.forEach(fieldConfig => {
      this.validationState[fieldConfig.name] = this.validateField(fieldConfig, formData[fieldConfig.name]);
    });

    this.updateUI();
  }

  private validateField(config: FormFieldConfig, value: any): boolean {
    if (!value && config.required) return false;
    if (!value && !config.required) return true;

    switch (config.type) {
      case 'text':
      case 'textarea':
        const strValue = String(value).trim();
        if (config.minLength && strValue.length < config.minLength) return false;
        if (config.maxLength && strValue.length > config.maxLength) return false;
        if (config.pattern && !config.pattern.test(strValue)) return false;
        return true;

      case 'file':
        return Boolean(value);

      case 'select':
        return Boolean(value);

      case 'display':
        return true; // Display fields are always valid

      default:
        return Boolean(value);
    }
  }

  private isFormValid(): boolean {
    return this.sectionConfig.requiredFields.every(fieldName => 
      this.validationState[fieldName] === true
    );
  }

  // ==========================================================================
  // DATA HANDLING
  // ==========================================================================

  private getFormData(): { [key: string]: any } {
    if (!this.form) return {};

    const formData = new FormData(this.form);
    const data: { [key: string]: any } = {};

    // Auto-collect all form data
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        data[key] = value;
      } else {
        data[key] = String(value).trim();
      }
    }

    return data;
  }

  // ==========================================================================
  // EVENT HANDLERS
  // ==========================================================================

  private handleInputChange(): void {
    this.validateForm();
    
    // Auto-save for non-essential sections
    if (this.sectionConfig.autoSave && this.currentCourseId) {
      this.debouncedSave();
    }
  }

  private handleFileChange(input: HTMLInputElement): void {
    const file = input.files?.[0];
    if (file) {
      this.showFilePreview(file, input);
    }
    this.validateForm();
  }

  private async handleSubmit(event: Event): Promise<void> {
    event.preventDefault();
    
    if (!this.isFormValid()) {
      this.showStatus('Please fill in all required fields', 'error');
      return;
    }

    if (this.sectionConfig.section === 'essentials') {
      await this.createNewCourse();
    } else {
      await this.updateExistingCourse();
    }
  }

  // ==========================================================================
  // DATABASE OPERATIONS
  // ==========================================================================

  private async createNewCourse(): Promise<void> {
    try {
      this.showStatus('Creating course...', 'loading');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const formData = this.getFormData();
      
      // Create course record
      const { data: courseData, error } = await supabase
        .from('courses')
        .insert({
          course_name: formData.course_name,
          course_description: formData.course_description,
          teacher_id: user.id,
          canvas_count: 1,
          lesson_days_count: 1
        })
        .select('id')
        .single();

      if (error) throw error;

      const courseId = courseData.id;
      this.currentCourseId = courseId;
      sessionStorage.setItem('currentCourseId', courseId);

      // Upload image if provided
      if (formData.course_image instanceof File) {
        await this.uploadCourseImage(formData.course_image, courseId);
      }

      this.showStatus('Course created successfully! 🎉', 'success');
      this.navigateToNextSection();

    } catch (error) {
      console.error('Error creating course:', error);
      this.showStatus('Failed to create course', 'error');
    }
  }

  private async updateExistingCourse(): Promise<void> {
    if (!this.currentCourseId) return;

    try {
      const formData = this.getFormData();
      const updateData: any = {};

      // Prepare update data based on section
      if (this.sectionConfig.jsonbField) {
        // Store in JSONB field
        updateData[this.sectionConfig.jsonbField] = formData;
      } else {
        // Store as direct columns
        Object.assign(updateData, formData);
      }

      updateData.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('courses')
        .update(updateData)
        .eq('id', this.currentCourseId);

      if (error) throw error;

      this.showStatus('Saved ✓', 'success');

    } catch (error) {
      console.error('Error updating course:', error);
      this.showStatus('Failed to save', 'error');
    }
  }

  // ==========================================================================
  // UTILITIES
  // ==========================================================================

  private async uploadCourseImage(file: File, courseId: string): Promise<void> {
    const fileExt = file.name.split('.').pop();
    const filePath = `course-images/${courseId}/cover.${fileExt}`;

    const { error } = await supabase.storage
      .from('courses')
      .upload(filePath, file, { upsert: true });

    if (!error) {
      const { data: { publicUrl } } = supabase.storage
        .from('courses')
        .getPublicUrl(filePath);

      await supabase
        .from('courses')
        .update({ course_image: publicUrl })
        .eq('id', courseId);
    }
  }

  private showFilePreview(file: File, input: HTMLInputElement): void {
    // Auto-detect preview container
    const preview = input.parentElement?.querySelector('.file-upload__preview') as HTMLElement;
    const img = preview?.querySelector('.file-upload__preview-image') as HTMLImageElement;
    
    if (preview && img) {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
        preview.style.display = 'block';
      };
      reader.readAsDataURL(file);
    }
  }

  private updateUI(): void {
    const submitBtn = this.form?.querySelector('button[type="submit"]') as HTMLButtonElement;
    
    if (submitBtn) {
      const isValid = this.isFormValid();
      submitBtn.disabled = !isValid;
      submitBtn.classList.toggle('button--disabled', !isValid);
      submitBtn.classList.toggle('button--primary', isValid);
    }

    // Update field validation states
    this.sectionConfig.fields.forEach(fieldConfig => {
      const field = this.form?.querySelector(`[name="${fieldConfig.name}"]`) as HTMLElement;
      if (field) {
        const isValid = this.validationState[fieldConfig.name];
        field.classList.toggle('form__input--success', isValid);
        field.classList.toggle('form__input--error', !isValid && field.classList.contains('touched'));
      }
    });
  }

  private showStatus(message: string, type: 'success' | 'error' | 'loading'): void {
    const statusDiv = this.form?.querySelector('.form__status') as HTMLElement;
    if (statusDiv) {
      statusDiv.textContent = message;
      statusDiv.className = `form__status form__status--${type}`;
    }
  }

  private navigateToNextSection(): void {
    setTimeout(() => {
      const nextLink = document.querySelector('[data-section="classification"]') as HTMLElement;
      nextLink?.click();
    }, 1500);
  }

  private debouncedSave(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.updateExistingCourse(), 500);
  }
}

// ==========================================================================
// AUTO-INITIALIZATION
// ==========================================================================

export function initializeCourseForm(sectionName: string): CourseFormHandler {
  return new CourseFormHandler(sectionName);
}
