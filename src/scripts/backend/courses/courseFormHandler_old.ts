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

  private async initialize(): Promise<void> {
    this.findForm();
    if (this.form) {
      await this.initializeFields();
      await this.loadExistingData();
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

  private async loadExistingData(): Promise<void> {
    if (!this.form || !this.currentCourseId) return;

    try {
      console.log(`📄 Loading existing data for course: ${this.currentCourseId}`);
      
      // Fetch the existing course data
      const { data: courseData, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', this.currentCourseId)
        .single();

      if (error) {
        console.warn('Could not load existing course data:', error);
        return;
      }

      if (!courseData) {
        console.warn('No course data found for ID:', this.currentCourseId);
        return;
      }

      console.log(`✅ Loaded course data:`, courseData);

      // Populate form fields based on section
      if (this.sectionConfig.section === 'essentials') {
        // Load essential fields
        console.log(`🔍 Setting course_name to: "${courseData.course_name}"`);
        this.setFieldValue('course_name', courseData.course_name);
        
        console.log(`🔍 Setting course_description to: "${courseData.course_description}"`);
        this.setFieldValue('course_description', courseData.course_description);
        
        console.log(`🔍 Setting course_language to: "${courseData.course_language}"`);
        this.setFieldValue('course_language', courseData.course_language);
        
        // Handle course image display
        if (courseData.course_image) {
          this.displayExistingImage(courseData.course_image);
        }
        
        // Note: teacher_id and institution are display fields and will be set by displayFunction
        // Note: course_image file input can't be pre-populated for security reasons
      } else if (this.sectionConfig.jsonbField && courseData[this.sectionConfig.jsonbField]) {
        // Load JSONB field data for other sections
        const sectionData = courseData[this.sectionConfig.jsonbField];
        
        this.sectionConfig.fields.forEach(fieldConfig => {
          if (sectionData[fieldConfig.name]) {
            this.setFieldValue(fieldConfig.name, sectionData[fieldConfig.name]);
          }
        });
      }

      // Re-validate after loading data
      setTimeout(() => this.validateForm(), 100);

    } catch (error) {
      console.error('Error loading existing course data:', error);
    }
  }

  private displayExistingImage(imageUrl: string): void {
    const imagePreview = document.getElementById('image-preview');
    const previewImg = document.getElementById('preview-img') as HTMLImageElement;
    const fileUploadLabel = this.form?.querySelector('.file-upload__compact-label');
    
    if (imagePreview && previewImg) {
      previewImg.src = imageUrl;
      imagePreview.style.display = 'block';
      
      // Update the upload label to show "Change image" instead of "Choose image"
      if (fileUploadLabel) {
        const textElement = fileUploadLabel.querySelector('.file-upload__text');
        if (textElement) {
          textElement.textContent = 'Change course image';
        }
      }
      
      console.log(`✅ Displayed existing course image: ${imageUrl}`);
    }
  }

  private setFieldValue(fieldName: string, value: any): void {
    if (!this.form) {
      console.warn(`❌ No form found when trying to set ${fieldName}`);
      return;
    }
    
    if (value === null || value === undefined) {
      console.warn(`❌ Value is null/undefined for field ${fieldName}`);
      return;
    }

    const field = this.form.querySelector(`[name="${fieldName}"]`) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    if (!field) {
      console.warn(`❌ Field not found: ${fieldName}`);
      return;
    }

    try {
      console.log(`🔧 Setting field ${fieldName} (type: ${field.tagName}) to value: "${value}"`);
      
      if (field.tagName === 'SELECT') {
        const select = field as HTMLSelectElement;
        select.value = value;
        
        // Check if the value was actually set
        if (select.value !== value) {
          console.warn(`⚠️  Select field ${fieldName} value didn't stick. Attempted: "${value}", Actual: "${select.value}"`);
          console.warn(`Available options:`, Array.from(select.options).map(opt => `"${opt.value}"`));
        }
      } else if (field.type === 'file') {
        // Can't set file input values for security reasons
        console.log(`⚠️  Cannot pre-populate file field: ${fieldName}`);
      } else {
        field.value = value;
      }

      // Trigger input event to update validation
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
      
      console.log(`✅ Successfully set field ${fieldName} = "${value}"`);
    } catch (error) {
      console.warn(`❌ Failed to set field ${fieldName}:`, error);
    }
  }

  private setupEventListeners(): void {
    if (!this.form) return;

    // Check if event listeners are already attached to prevent duplicates
    if (this.form.dataset.listenersAttached === 'true') {
      console.warn('Event listeners already attached to this form, skipping...');
      return;
    }

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

    // Handle form submission - but only once
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    
    // Handle remove image button
    const removeImageBtn = this.form.querySelector('#remove-image');
    if (removeImageBtn) {
      removeImageBtn.addEventListener('click', () => this.handleRemoveImage());
    }
    
    // Mark that listeners are attached
    this.form.dataset.listenersAttached = 'true';
    console.log('Event listeners attached to form');
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

  private handleRemoveImage(): void {
    const imagePreview = document.getElementById('image-preview');
    const previewImg = document.getElementById('preview-img') as HTMLImageElement;
    const fileInput = document.getElementById('course-image') as HTMLInputElement;
    
    if (imagePreview && previewImg && fileInput) {
      // Hide the preview
      imagePreview.style.display = 'none';
      
      // Clear the file input
      fileInput.value = '';
      
      // Clear the preview image source
      previewImg.src = '';
      
      // Re-validate the form
      this.validateForm();
      
      console.log('Course image removed');
    }
  }

  private async handleSubmit(event: Event): Promise<void> {
    event.preventDefault();
    
    // Prevent double submission
    if (this.form?.dataset.submitting === 'true') {
      console.warn('Form is already being submitted, ignoring duplicate submission');
      return;
    }
    
    if (!this.isFormValid()) {
      this.showStatus('Please fill in all required fields', 'error');
      return;
    }

    // Mark form as submitting
    if (this.form) {
      this.form.dataset.submitting = 'true';
    }

    try {
      if (this.sectionConfig.section === 'essentials') {
        await this.createNewCourse();
      } else {
        await this.updateExistingCourse();
      }
    } finally {
      // Always clear the submitting flag
      if (this.form) {
        this.form.dataset.submitting = 'false';
      }
    }
  }

  // ==========================================================================
  // DATABASE OPERATIONS
  // ==========================================================================

  private async createNewCourse(): Promise<void> {
    try {
      const timestamp = new Date().toISOString();
      console.log(`🚀 [${timestamp}] Starting course creation...`);
      
      this.showStatus('Creating course...', 'loading');
      
      // Enhanced authentication check with session validation
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('Session error:', sessionError);
        throw new Error('Authentication session error');
      }

      if (!session?.user) {
        console.error('No valid session or user found');
        throw new Error('User not authenticated - please sign in again');
      }

      const user = session.user;
      console.log(`👤 [${timestamp}] Creating course for user:`, user.id);

      // Simplified user profile ensuring - just try both methods without failing
      await this.ensureUserProfileSimple(user);

      const formData = this.getFormData();
      
      // Create course record
      const courseInsertData = {
        course_name: formData.course_name,
        course_description: formData.course_description,
        course_language: formData.course_language,
        teacher_id: user.id,
        canvas_count: 1,
        lesson_days_count: 1
      };

      console.log(`📝 [${timestamp}] Inserting course data:`, courseInsertData);

      const { data: courseData, error } = await supabase
        .from('courses')
        .insert(courseInsertData)
        .select('id')
        .single();

      if (error) {
        console.error('Database error creating course:', error);
        throw new Error(`Failed to create course: ${error.message}`);
      }

      const courseId = courseData.id;
      this.currentCourseId = courseId;
      sessionStorage.setItem('currentCourseId', courseId);

      console.log(`✅ [${timestamp}] Course created successfully with ID:`, courseId);

      // Upload image if provided (but don't fail if it doesn't work)
      if (formData.course_image instanceof File) {
        console.log(`🖼️  [${timestamp}] Uploading course image...`);
        try {
          await this.uploadCourseImage(formData.course_image, courseId);
          console.log(`✅ [${timestamp}] Image uploaded successfully`);
        } catch (imageError) {
          console.warn(`⚠️  [${timestamp}] Image upload failed, but course was created:`, imageError);
          // Don't fail the entire process for image upload issues
        }
      }

      this.showStatus('Course created successfully! 🎉', 'success');
      this.navigateToNextSection();

    } catch (error) {
      console.error('Error creating course:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.showStatus(`Failed to create course: ${errorMessage}`, 'error');
    }
  }

  // Simplified user profile ensuring - try multiple methods but don't fail
  private async ensureUserProfileSimple(user: any): Promise<void> {
    try {
      // Method 1: Try the RPC function
      console.log('Trying RPC function...');
      const { error: rpcError } = await supabase.rpc('ensure_user_profile', {
        user_id: user.id,
        user_email: user.email,
        user_role: 'teacher'
      });

      if (!rpcError) {
        console.log('✅ User profile ensured via RPC');
        return;
      }
      console.warn('RPC failed:', rpcError);
    } catch (rpcErr) {
      console.warn('RPC call failed:', rpcErr);
    }

    try {
      // Method 2: Try direct upsert
      console.log('Trying direct upsert...');
      const userMetadata = user.user_metadata || {};
      const fullName = userMetadata.full_name || user.email?.split('@')[0] || 'User';
      const userRole = userMetadata.user_role || 'teacher';
      
      const nameParts = fullName.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const { error } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          first_name: firstName,
          last_name: lastName,
          email: user.email,
          role: userRole,
          institution: 'Independent'
        }, {
          onConflict: 'id'
        });

      if (!error) {
        console.log('✅ User profile ensured via upsert');
        return;
      }
      console.warn('Upsert failed:', error);
    } catch (upsertErr) {
      console.warn('Upsert failed:', upsertErr);
    }

    // Method 3: Check if profile already exists
    try {
      console.log('Checking if profile exists...');
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single();

      if (existingUser) {
        console.log('✅ User profile already exists');
        return;
      }
    } catch (checkErr) {
      console.warn('Profile check failed:', checkErr);
    }

    // If all methods fail, just continue - the course creation might still work
    console.warn('All user profile creation methods failed, continuing with course creation...');
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
    // Auto-detect preview container for compact layout
    const preview = input.parentElement?.querySelector('.file-upload__thumbnail') as HTMLElement;
    const img = preview?.querySelector('.file-upload__thumbnail-image') as HTMLImageElement;
    
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
// EXPORT
// ==========================================================================

export function initializeCourseForm(sectionName: string): CourseFormHandler {
  return new CourseFormHandler(sectionName);
}
