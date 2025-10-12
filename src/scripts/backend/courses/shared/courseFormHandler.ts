// ==========================================================================
// COURSE FORM HANDLER - Generic form UI controller for all course sections
// ==========================================================================

import {
    SectionConfig,
    ValidationState,
    getSectionConfig,
} from "../settings/courseFormConfig";
import { validateFormSection, isFormSectionValid } from "../shared/courseFormValidator";
import { createCourse, updateCourse, getCourse } from "../essentials/createCourse";

// ==========================================================================
// COURSE FORM HANDLER CLASS
// ==========================================================================

export class CourseFormHandler {
    private sectionConfig: SectionConfig;
    private form: HTMLFormElement | null = null;
    private currentCourseId: string | null = null;
    private validationState: ValidationState = {};
    private debounceTimer: NodeJS.Timeout | null = null;

    constructor(sectionName: string) {
        const config = getSectionConfig(sectionName);
        if (!config) {
            throw new Error(`No configuration found for section: ${sectionName}`);
        }

        this.sectionConfig = config;
        this.currentCourseId = this.getCourseId();
        this.initialize();
    }

    // ==========================================================================
    // COURSE ID MANAGEMENT
    // ==========================================================================

    private getCourseId(): string | null {
        console.log('🔍 CourseFormHandler - Getting course ID for section:', this.sectionConfig?.section);
        console.log('📍 Current URL:', window.location.href);

        // First try to get course ID from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        console.log('🔗 URL Search Params:', urlParams.toString());

        const courseIdFromUrl = urlParams.get('courseId') || urlParams.get('id');

        if (courseIdFromUrl && courseIdFromUrl !== 'undefined') {
            console.log('✅ Found course ID in URL:', courseIdFromUrl);
            return courseIdFromUrl;
        } else {
            console.log('❌ No course ID in URL parameters');
        }

        // Fallback to session storage (for backward compatibility)
        const courseIdFromSession = sessionStorage.getItem("currentCourseId");
        if (courseIdFromSession && courseIdFromSession !== 'undefined') {
            console.log('✅ Found course ID in sessionStorage:', courseIdFromSession);
            return courseIdFromSession;
        } else {
            console.log('❌ No course ID in sessionStorage');
        }

        console.log('⚠️ No course ID found - entering CREATE NEW COURSE mode');
        return null;
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
            this.validateForm();
        }
    }

    private findForm(): void {

        // First, try to find form by section name (most reliable)
        if (this.sectionConfig.section === 'essentials') {
            this.form = document.querySelector('#course-essentials-form');
            if (this.form) {
                return;
            }
        }

        // Try to find the form in the active article 
        const activeArticle = document.querySelector<HTMLElement>('[data-course-section].is-active');
        if (activeArticle) {
            this.form = activeArticle.querySelector("form");
            if (this.form) {
                return;
            }
        } else {
        }

        // If still not found, try to find any form in the current section
        if (!this.form) {
            this.form = document.querySelector('form');
            if (this.form) {
                return;
            }
        }

        if (this.form) {
        } else {
            console.error('❌ No form found for section:', this.sectionConfig.section);
        }
    } private async initializeFields(): Promise<void> {
        if (!this.form) return;

        for (const fieldConfig of this.sectionConfig.fields) {
            const field = this.form.querySelector(
                `[name="${fieldConfig.name}"]`,
            ) as HTMLElement;

            if (!field) continue;

            // Handle display fields
            if (fieldConfig.type === "display" && fieldConfig.displayFunction) {
                try {
                    const displayValue = await fieldConfig.displayFunction();
                    this.setDisplayField(field, displayValue);
                } catch (error) {
                    console.error(
                        `Error setting display field ${fieldConfig.name}:`,
                        error,
                    );
                }
            }

            // Handle select fields with options
            if (fieldConfig.type === "select" && field.tagName === "SELECT") {
                if (fieldConfig.loadDynamically && fieldConfig.name === "course_language") {
                    // Load languages dynamically
                    try {
                        const { populateCourseLanguageSelect } = await import('../settings/languageLoader');
                        await populateCourseLanguageSelect(field as HTMLSelectElement);
                    } catch (error) {
                        console.error('❌ Error loading course languages:', error);
                        // Fallback to basic options
                        this.addFallbackLanguageOptions(field as HTMLSelectElement);
                    }
                } else if (fieldConfig.options) {
                    this.populateSelectField(field as HTMLSelectElement, fieldConfig);
                }
            }
        }
    }

    private setDisplayField(field: HTMLElement, value: string): void {
        if (field.tagName === "INPUT") {
            (field as HTMLInputElement).value = value;
            (field as HTMLInputElement).readOnly = true;
        } else {
            field.textContent = value;
        }
    }

    private populateSelectField(
        select: HTMLSelectElement,
        fieldConfig: any,
    ): void {
        select.innerHTML = "";

        // Add default option
        const defaultOption = document.createElement("option");
        defaultOption.value = "";
        defaultOption.textContent = `Select ${fieldConfig.name.replace("_", " ")}...`;
        select.appendChild(defaultOption);

        // Add options
        fieldConfig.options.forEach((option: string) => {
            const optionElement = document.createElement("option");
            optionElement.value = option;
            optionElement.textContent = option;
            select.appendChild(optionElement);
        });
    }

    private addFallbackLanguageOptions(select: HTMLSelectElement): void {
        select.innerHTML = "";

        // Add default option
        const defaultOption = document.createElement("option");
        defaultOption.value = "";
        defaultOption.textContent = "Select language...";
        select.appendChild(defaultOption);

        // Add common languages as fallback
        const fallbackLanguages = [
            { code: 'en', name: 'English' },
            { code: 'es', name: 'Spanish' },
            { code: 'fr', name: 'French' },
            { code: 'de', name: 'German' },
            { code: 'it', name: 'Italian' },
            { code: 'pt', name: 'Portuguese' },
            { code: 'ru', name: 'Russian' },
            { code: 'ja', name: 'Japanese' },
            { code: 'ko', name: 'Korean' },
            { code: 'zh', name: 'Chinese' }
        ];

        fallbackLanguages.forEach(lang => {
            const optionElement = document.createElement("option");
            optionElement.value = lang.code;
            optionElement.textContent = lang.name;
            select.appendChild(optionElement);
        });

  
    }

    // ==========================================================================
    // DATA LOADING
    // ==========================================================================

    private async loadExistingData(): Promise<void> {
        if (!this.form || !this.currentCourseId) {
            console.log('⚠️ Skipping loadExistingData:', {
                hasForm: !!this.form,
                hasCourseId: !!this.currentCourseId,
                courseId: this.currentCourseId
            });
            return;
        }

        try {
            console.log('📥 Loading existing course data for ID:', this.currentCourseId);
            const courseData = await getCourse(this.currentCourseId);

            if (!courseData) {
                console.warn('⚠️ No course data returned for ID:', this.currentCourseId);
                return;
            }

            console.log('✅ Course data loaded successfully:', courseData);
            this.populateFormFields(courseData);

            // Show course code if we're in essentials section and have a course ID
            if (this.sectionConfig.section === "essentials") {
                this.showCourseCode(this.currentCourseId);
            }

            setTimeout(() => this.validateForm(), 100);
        } catch (error) {
            console.error('❌ Error loading existing course data:', error);
        }
    }

    private populateFormFields(courseData: any): void {

        if (this.sectionConfig.section === "essentials") {
        
            this.setFieldValue("course_name", courseData.course_name);
            this.setFieldValue("course_description", courseData.course_description);
            this.setFieldValue("course_language", courseData.course_language);

            if (courseData.course_image) {
                this.displayExistingImage(courseData.course_image);
            }
        } else if (this.sectionConfig.section === "classification") {
      
            // Handle classification data from classification_data JSONB field
            if (courseData.classification_data) {
                const classificationData = courseData.classification_data;
           

                this.setFieldValue("class_year", classificationData.class_year);
                this.setFieldValue(
                    "curricular_framework",
                    classificationData.curricular_framework,
                );
                this.setFieldValue("domain", classificationData.domain);
                this.setFieldValue("subject", classificationData.subject);
                this.setFieldValue("topic", classificationData.topic);
                this.setFieldValue("subtopic", classificationData.subtopic);
                this.setFieldValue(
                    "previous_course",
                    classificationData.previous_course,
                );
                this.setFieldValue("current_course", classificationData.current_course);
                this.setFieldValue("next_course", classificationData.next_course);
            } else {
            }
        } else if (
            this.sectionConfig.jsonbField &&
            courseData[this.sectionConfig.jsonbField]
        ) {
            const sectionData = courseData[this.sectionConfig.jsonbField];

            this.sectionConfig.fields.forEach((fieldConfig) => {
                if (sectionData[fieldConfig.name]) {
                    this.setFieldValue(fieldConfig.name, sectionData[fieldConfig.name]);
                }
            });
        } else {
            // For sections without a jsonbField (top-level columns on courses)
            // populate fields directly from courseData if present
            try {
                this.sectionConfig.fields.forEach((fieldConfig) => {
                    const key = fieldConfig.name;
                    if (key in courseData) {
                        this.setFieldValue(key, (courseData as any)[key]);
                    }
                });
            } catch (e) {
                // No-op if courseData doesn't include these fields yet
            }
        }
    }

    private setFieldValue(fieldName: string, value: any): void {
        if (!this.form || value === null || value === undefined) return;

        // Handle classification dropdown fields
        if (this.sectionConfig.section === "classification") {
            const hiddenInput = this.form.querySelector(
                `#${fieldName}-value`,
            ) as HTMLInputElement;
            const dropdownTrigger = this.form.querySelector(`#${fieldName}-dropdown`);
            const dropdownLabel = dropdownTrigger?.querySelector('.dropdown__label, .dropdown__selected, .dropdown__trigger span');

            if (hiddenInput && dropdownTrigger && dropdownLabel) {
                hiddenInput.value = value;
                dropdownLabel.textContent = this.getDisplayTextForValue(
                    fieldName,
                    value,
                );
           
                return;
            } else {
          
            }
        }

        // Handle regular form fields
        const field = this.form.querySelector(`[name="${fieldName}"]`) as
            | HTMLInputElement
            | HTMLSelectElement
            | HTMLTextAreaElement;

        if (!field) {
            console.warn(`❌ Field not found: [name="${fieldName}"]`);
            return;
        }

   

        try {
            if (field.tagName === "SELECT") {
                const selectField = field as HTMLSelectElement;

                // For select fields, we need to make sure the option exists first
                let optionExists = false;
                for (let i = 0; i < selectField.options.length; i++) {
                    if (selectField.options[i].value === value) {
                        optionExists = true;
                        break;
                    }
                }

                if (optionExists) {
                    selectField.value = value;
               
                } else {
               
                    // For course_language, try advanced matching
                    if (fieldName === 'course_language') {
                        let found = false;

                        // Try to find by name (for names like 'English')
                        for (let i = 0; i < selectField.options.length; i++) {
                            const option = selectField.options[i];
                            const optionText = option.textContent || '';

                            // Check if the option text contains the language name
                            if (optionText.toLowerCase().includes(value.toLowerCase())) {
                                selectField.value = option.value; // Use the code, not the name
                                found = true;
                                break;
                            }
                        }

                        // If still not found, try common language name to code mappings
                        if (!found) {
                            const languageMap: Record<string, string> = {
                                'english': 'en',
                                'spanish': 'es',
                                'french': 'fr',
                                'german': 'de',
                                'italian': 'it',
                                'portuguese': 'pt',
                                'russian': 'ru',
                                'japanese': 'ja',
                                'korean': 'ko',
                                'chinese': 'zh-CN',
                                'mandarin': 'zh-CN'
                            };

                            const mappedCode = languageMap[value.toLowerCase()];
                            if (mappedCode) {
                                for (let i = 0; i < selectField.options.length; i++) {
                                    if (selectField.options[i].value === mappedCode) {
                                        selectField.value = mappedCode;
                                
                                        found = true;
                                        break;
                                    }
                                }
                            }
                        }

                        if (!found) {
                  
                        }
                    }
                }
            } else if (field.type !== "file") {
                field.value = value;
            }

            field.dispatchEvent(new Event("input", { bubbles: true }));
            field.dispatchEvent(new Event("change", { bubbles: true }));

        } catch (error) {
        }
    }

    private getDisplayTextForValue(fieldName: string, value: string): string {
        // For class year, return the value as is since it's user-friendly
        if (fieldName === "class_year") {
            return value;
        }

        // For curricular framework, return the value as is
        if (fieldName === "curricular_framework") {
            return value;
        }

        // For other fields, return the value (can be enhanced with lookup tables later)
        return value || "";
    }

    // ==========================================================================
    // EVENT HANDLING
    // ==========================================================================

    private setupEventListeners(): void {
        if (!this.form || this.form.dataset.listenersAttached === "true") return;

        const inputs = this.form.querySelectorAll("input, textarea, select");

        inputs.forEach((input) => {
            const inputElement = input as HTMLInputElement;
            if (inputElement.type === "file") {
                input.addEventListener("change", () =>
                    this.handleFileChange(inputElement),
                );
            } else {
                input.addEventListener("input", () => this.handleInputChange());
                input.addEventListener("change", () => this.handleInputChange());
            }
        });

        this.form.addEventListener("submit", (e) => this.handleSubmit(e));

        // Handle remove image button
        const removeImageBtn = this.form.querySelector("#remove-image");
        if (removeImageBtn) {
            removeImageBtn.addEventListener("click", () => this.handleRemoveImage());
        }

        this.form.dataset.listenersAttached = "true";
    }

    private handleInputChange(): void {
        this.validateForm();
        // If DB column is missing for pedagogy, block autosave with a clear message
        const isBlocked = this.form?.dataset.blockSave === 'true';
        if (isBlocked && this.sectionConfig.section === 'pedagogy') {
            this.showStatus('Cannot save: missing course_pedagogy column. Please run the migration.', 'error');
            return;
        }

        if (this.sectionConfig.autoSave && this.currentCourseId) {
            this.debouncedSave();
        }
    }

    private handleFileChange(input: HTMLInputElement): void {
        const file = input.files?.[0];
        if (file) {
            this.showFilePreview(file);
        }
        this.validateForm();
    }

    private handleRemoveImage(): void {
        const previewImg = document.getElementById(
            "preview-img",
        ) as HTMLImageElement;
        const removeBtn = document.getElementById(
            "remove-image",
        ) as HTMLButtonElement;
        const fileInput = document.getElementById(
            "course-image",
        ) as HTMLInputElement;

        if (previewImg && removeBtn && fileInput) {
            previewImg.style.display = "none";
            removeBtn.style.display = "none";
            fileInput.value = "";
            previewImg.src = "";
            this.validateForm();
        }
    }

    private async handleSubmit(event: Event): Promise<void> {
        event.preventDefault();

        if (this.form?.dataset.submitting === "true") return;

        if (!this.isFormValid()) {
            this.showStatus("Please fill in all required fields", "error");
            return;
        }

        if (this.form) this.form.dataset.submitting = "true";

        try {
            if (this.sectionConfig.section === "essentials") {
                await this.createNewCourse();
            } else {
                await this.updateExistingCourse();
            }
        } finally {
            if (this.form) this.form.dataset.submitting = "false";
        }
    }

    // ==========================================================================
    // VALIDATION
    // ==========================================================================

    private validateForm(): void {
        if (!this.form) return;

        const formData = this.getFormData();
        this.validationState = validateFormSection(
            this.sectionConfig.fields,
            formData,
        );
        this.updateUI();
    }

    private isFormValid(): boolean {
        return isFormSectionValid(
            this.sectionConfig.requiredFields,
            this.validationState,
        );
    }

    private getFormData(): { [key: string]: any } {
        if (!this.form) return {};

        const formData = new FormData(this.form);
        const data: { [key: string]: any } = {};

        for (const [key, value] of formData.entries()) {
            data[key] = value instanceof File ? value : String(value).trim();
        }

        return data;
    }

    // ==========================================================================
    // COURSE OPERATIONS
    // ==========================================================================

    private async createNewCourse(): Promise<void> {
        try {
            this.showStatus("Creating course...", "loading");

            const formData = this.getFormData();
            const courseData = {
                course_name: formData.course_name,
                course_description: formData.course_description,
                course_language: formData.course_language,
                course_image: formData.course_image,
            };

            const result = await createCourse(courseData);

            if (result.success && result.courseId) {
                this.showStatus("Course created successfully! 🎉", "success");

                // Show the course ID with copy functionality
                this.showCourseCode(result.courseId);

                // Set the course ID for other managers
                if (typeof window !== 'undefined' && (window as any).courseBuilderInstance) {
                    (window as any).courseBuilderInstance.setCourseId(result.courseId);
                }

                // Update the URL to include course ID (without redirect)
                const url = new URL(window.location.href);
                url.searchParams.set('courseId', result.courseId);
                window.history.replaceState({}, '', url.toString());

                // Enable course builder features
                this.enableCourseBuilderFeatures(result.courseId);

                
                // Navigate to next section after successful creation
                if (this.sectionConfig.section === 'essentials') {
                    this.navigateToNextSection();
                }
            } else {
                throw new Error(result.error || "Failed to create course");
            }
        } catch (error) {
            console.error("Error creating course:", error);
            const errorMessage =
                error instanceof Error ? error.message : "Unknown error occurred";
            this.showStatus(`Failed to create course: ${errorMessage}`, "error");
        }
    }

    private async updateExistingCourse(): Promise<void> {
        if (!this.currentCourseId) return;

        try {
            // Prevent save if pedagogy column is missing
            const isBlocked = this.form?.dataset.blockSave === 'true';
            if (isBlocked && this.sectionConfig.section === 'pedagogy') {
                this.showStatus('Cannot save: missing course_pedagogy column. Please run the migration.', 'error');
                return;
            }

            const formData = this.getFormData();
            const updateData: any = {};

            if (this.sectionConfig.jsonbField) {
                updateData[this.sectionConfig.jsonbField] = formData;
            } else {
                Object.assign(updateData, formData);
            }

            const result = await updateCourse(this.currentCourseId, updateData);

            if (result.success) {
                this.showStatus("Saved ✓", "success");
            } else {
                throw new Error(result.error || "Failed to save");
            }
        } catch (error) {
            console.error("Error updating course:", error);
            this.showStatus("Failed to save", "error");
        }
    }

    // ==========================================================================
    // UI HELPERS
    // ==========================================================================

    private displayExistingImage(imageUrl: string): void {
        const previewImg = document.getElementById(
            "preview-img",
        ) as HTMLImageElement;
        const removeBtn = document.getElementById(
            "remove-image",
        ) as HTMLButtonElement;
        const fileUploadLabel = this.form?.querySelector(
            ".file-upload__compact-label",
        );

        if (previewImg && removeBtn) {
            previewImg.src = imageUrl;
            previewImg.style.display = "block";
            removeBtn.style.display = "block";

            if (fileUploadLabel) {
                const textElement = fileUploadLabel.querySelector('element');
                if (textElement) {
                    textElement.textContent = "Change course image";
                }
            }
        }
    }

    private showFilePreview(file: File): void {
        const img = document.getElementById("preview-img") as HTMLImageElement;
        const removeBtn = document.getElementById(
            "remove-image",
        ) as HTMLButtonElement;

        if (img && removeBtn) {
            const reader = new FileReader();
            reader.onload = (e) => {
                img.src = e.target?.result as string;
                img.style.display = "block";
                removeBtn.style.display = "block";
            };
            reader.readAsDataURL(file);
        }
    }

    private updateUI(): void {
        const submitBtn = this.form?.querySelector(
            'button[type="submit"]',
        ) as HTMLButtonElement;

        if (submitBtn) {
            const isValid = this.isFormValid();
            submitBtn.disabled = !isValid;
            submitBtn
            submitBtn
        }
    }

    private showStatus(
        message: string,
        type: "success" | "error" | "loading",
    ): void {
        const statusDiv = this.form?.querySelector('.save-status__text') as HTMLElement;
        if (statusDiv) {
            statusDiv.textContent = message;
            statusDiv.className = `save-status__text save-status__text--${type}`;
        }
    }

    private showCourseCode(courseId: string): void {
        // Update the course ID value display
        const codeValueElement = document.getElementById('course-id-value');
        const courseCodeDisplay = document.getElementById('course-code-display');
        const courseCopyBtn = document.getElementById('course-code-copy-btn') as HTMLButtonElement;

        if (codeValueElement) {
            codeValueElement.textContent = courseId;
        }

        if (courseCopyBtn) {
            courseCopyBtn.setAttribute('data-course-id', courseId);
            courseCopyBtn.setAttribute('title', `Copy course ID: ${courseId}`);

            // Only add copy functionality if not already added
            if (!courseCopyBtn.hasAttribute('data-copy-listener')) {
                courseCopyBtn.setAttribute('data-copy-listener', 'true');

                courseCopyBtn.addEventListener('click', async () => {
                    try {
                        await navigator.clipboard.writeText(courseId);
                        this.showCopyFeedback(courseCopyBtn);
                    } catch (err) {
                        console.error('Failed to copy course ID:', err);
                        // Fallback for older browsers
                        this.fallbackCopy(courseId);
                        this.showCopyFeedback(courseCopyBtn);
                    }
                });
            }
        }

        // Show the course code display
        if (courseCodeDisplay) {
            courseCodeDisplay.style.display = 'flex';
        }

    }

    private enableCourseBuilderFeatures(courseId: string): void {

        // Enable next button or any other course-specific features
        const nextButton = document.getElementById('next-btn');
        if (nextButton) {
            nextButton.removeAttribute('disabled');
            nextButton.classList.remove('button--disabled');
        }

        // Store course ID globally for other components
        (window as any).currentCourseId = courseId;

        // Dispatch custom event for other components to listen
        window.dispatchEvent(new CustomEvent('courseCreated', {
            detail: { courseId: courseId }
        }));
    }

    private showCopyFeedback(button: HTMLElement): void {
        const originalContent = button.innerHTML;
        button.innerHTML = "<span>✓</span>";
        button.style.color = "#10b981"; // green

        setTimeout(() => {
            button.innerHTML = originalContent;
            button.style.color = "";
        }, 1500);
    }

    private fallbackCopy(text: string): void {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
    }

    private navigateToNextSection(): void {
        setTimeout(() => {
            const nextLink = document.querySelector(
                '[data-section="classification"]',
            ) as HTMLElement;
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
