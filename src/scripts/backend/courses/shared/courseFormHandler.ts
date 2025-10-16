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
import { uploadCourseImage, deleteCourseImage } from "./uploadCourseImage";

// ==========================================================================
// COURSE FORM HANDLER CLASS
// ==========================================================================

export class CourseFormHandler {
    private sectionConfig: SectionConfig;
    private form: HTMLFormElement | null = null;
    private currentCourseId: string | null = null;
    private validationState: ValidationState = {};
    private debounceTimer: ReturnType<typeof setTimeout> | null = null;
    private lastLoadedCourseId: string | null = null;
    private courseIdEventHandler?: (event: Event) => void;
    private skipNextAutoLoad = false;
    private currentCourseImageUrl: string | null = null;
    private pendingImageRemoval = false;
    private courseImageUrlPendingDeletion: string | null = null;

    constructor(sectionName: string, initialCourseId?: string) {
        const config = getSectionConfig(sectionName);
        if (!config) {
            throw new Error(`No configuration found for section: ${sectionName}`);
        }

        this.sectionConfig = config;
        if (initialCourseId && this.isValidCourseId(initialCourseId)) {
            this.updateResolvedCourseId(initialCourseId);
        }

        this.currentCourseId = this.currentCourseId || this.getCourseId();
        this.registerCourseIdListeners();
        this.initialize();
    }

    // ==========================================================================
    // COURSE ID MANAGEMENT
    // ==========================================================================

    private getCourseId(): string | null {
        console.log('🔍 CourseFormHandler - Getting course ID for section:', this.sectionConfig?.section);
        console.log('📍 Current URL:', window.location.href);

        const courseIdFromUrl = this.extractCourseIdFromUrl();
        if (courseIdFromUrl) {
            console.log('✅ Course ID resolved from URL:', courseIdFromUrl);
            this.updateResolvedCourseId(courseIdFromUrl);
            return courseIdFromUrl;
        }

        const courseIdFromSession = this.extractCourseIdFromSession();
        if (courseIdFromSession) {
            console.log('✅ Course ID restored from session storage:', courseIdFromSession);
            this.updateResolvedCourseId(courseIdFromSession);
            return courseIdFromSession;
        }

        const courseIdFromWindow = this.extractCourseIdFromWindow();
        if (courseIdFromWindow) {
            console.log('✅ Course ID obtained from global state:', courseIdFromWindow);
            this.updateResolvedCourseId(courseIdFromWindow);
            return courseIdFromWindow;
        }

        console.log('⚠️ No course ID found - entering CREATE NEW COURSE mode');
        return null;
    }

    private extractCourseIdFromUrl(): string | null {
        const urlParams = new URLSearchParams(window.location.search);
        const candidate = urlParams.get('courseId') || urlParams.get('id');
        return this.isValidCourseId(candidate) ? candidate! : null;
    }

    private extractCourseIdFromSession(): string | null {
        const candidate = sessionStorage.getItem("currentCourseId");
        return this.isValidCourseId(candidate) ? candidate! : null;
    }

    private extractCourseIdFromWindow(): string | null {
        if (typeof window === 'undefined') return null;

        const globalCandidate = (window as any).currentCourseId;
        if (this.isValidCourseId(globalCandidate)) {
            return globalCandidate;
        }

        const builderInstance = (window as any).courseBuilderInstance;
        if (builderInstance) {
            try {
                if (typeof builderInstance.getCourseId === 'function') {
                    const candidate = builderInstance.getCourseId();
                    if (this.isValidCourseId(candidate)) {
                        return candidate;
                    }
                } else if (this.isValidCourseId(builderInstance.courseId)) {
                    return builderInstance.courseId;
                }
            } catch (error) {
                console.warn('⚠️ Unable to read course ID from courseBuilderInstance:', error);
            }
        }

        return null;
    }

    private isValidCourseId(candidate: unknown): candidate is string {
        return typeof candidate === 'string' && candidate.trim() !== '' && candidate !== 'undefined';
    }

    private updateResolvedCourseId(courseId: string): void {
        this.currentCourseId = courseId;

        if (typeof window !== 'undefined') {
            (window as any).currentCourseId = courseId;
            try {
                sessionStorage.setItem("currentCourseId", courseId);
            } catch (error) {
                console.warn('⚠️ Unable to persist course ID to sessionStorage:', error);
            }
        }
    }

    private registerCourseIdListeners(): void {
        if (typeof window === 'undefined' || this.courseIdEventHandler) {
            return;
        }

        this.courseIdEventHandler = (event: Event) => {
            const detail = (event as CustomEvent).detail;
            const candidate = detail?.courseId ?? detail?.id;
            if (this.isValidCourseId(candidate)) {
                console.log('🔄 CourseFormHandler - Updating course ID from event:', candidate);
                this.updateResolvedCourseId(candidate);
                if (!this.form) {
                    this.findForm();
                }
                if (this.skipNextAutoLoad) {
                    this.skipNextAutoLoad = false;
                    return;
                }
                const suppressStatus = event.type === 'courseCreated' || detail?.suppressStatus === true;
                if (this.currentCourseId && this.form && this.currentCourseId !== this.lastLoadedCourseId) {
                    void this.loadExistingData(suppressStatus);
                }
            }
        };

        window.addEventListener('courseCreated', this.courseIdEventHandler as EventListener);
        window.addEventListener('courseIdResolved', this.courseIdEventHandler as EventListener);
        window.addEventListener('courseIdUpdated', this.courseIdEventHandler as EventListener);
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

        if (this.sectionConfig.section === 'pedagogy') {
            this.form = document.querySelector('#course-pedagogy-form');
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
            // eslint-disable-next-line no-empty
        }

        // If still not found, try to find any form in the current section
        if (!this.form) {
            this.form = document.querySelector('form');
            if (this.form) {
                return;
            }
        }

        if (this.form) {
            // eslint-disable-next-line no-empty
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

    private async loadExistingData(suppressStatus: boolean = false): Promise<void> {
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

            console.log('✅ Course data loaded successfully:', {
                courseId: courseData.id,
                courseName: courseData.course_name,
                courseDescription: courseData.course_description,
                courseLanguage: courseData.course_language,
                lastUpdated: courseData.updated_at,
                timestamp: new Date().toISOString()
            });
            this.populateFormFields(courseData);
            if (!suppressStatus) {
                this.showStatus("", "success");
            }

            this.lastLoadedCourseId = this.currentCourseId;

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
            } else {
                this.clearImagePreview(true);
                this.currentCourseImageUrl = null;
                this.pendingImageRemoval = false;
                this.courseImageUrlPendingDeletion = null;
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
                // eslint-disable-next-line no-empty
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

        if (fieldName === 'course_pedagogy' && typeof value === 'object') {
            try {
                value = JSON.stringify(value);
            } catch (error) {
                console.warn('Unable to serialize course_pedagogy value:', error);
                return;
            }
        }

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
            if (input instanceof HTMLInputElement && input.type === "file") {
                input.addEventListener("change", () => this.handleFileChange(input));
                return;
            }

            input.addEventListener("input", () => this.handleInputChange());
            input.addEventListener("change", () => this.handleInputChange());
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
        if (this.sectionConfig.section === 'pedagogy') {
            const inputValue = (this.form?.querySelector('#course-pedagogy-input') as HTMLInputElement | null)?.value;
            console.log('🎯 Pedagogy input change', { value: inputValue, isBlocked, courseId: this.currentCourseId });
        }
        if (isBlocked && this.sectionConfig.section === 'pedagogy') {
            this.showStatus('Cannot save: missing course_pedagogy column. Please run the migration.', 'error');
            return;
        }

        // Enable auto-save for essentials section after course creation
        const shouldAutoSave = this.sectionConfig.autoSave || 
            (this.sectionConfig.section === 'essentials' && this.currentCourseId);
        
        if (shouldAutoSave && this.currentCourseId) {
            this.debouncedSave();
        }
    }

    private handleFileChange(input: HTMLInputElement): void {
        const file = input.files?.[0];
        if (file) {
            this.pendingImageRemoval = false;
            this.courseImageUrlPendingDeletion = null;
            this.showFilePreview(file);
        }
        this.validateForm();
        const autosaveActive = this.sectionConfig.autoSave ||
            (this.sectionConfig.section === 'essentials' && this.currentCourseId);
        if (autosaveActive && this.currentCourseId) {
            this.debouncedSave();
        }
    }

    private handleRemoveImage(): void {
        const hadExistingImage = Boolean(this.currentCourseImageUrl);
        const confirmation = window.confirm("Are you sure you want to delete this image?");
        if (!confirmation) {
            return;
        }

        const previousImageUrl = this.currentCourseImageUrl;
        this.clearImagePreview(true);
        if (hadExistingImage) {
            this.pendingImageRemoval = true;
            this.courseImageUrlPendingDeletion = previousImageUrl;
            this.currentCourseImageUrl = null;
        } else {
            this.pendingImageRemoval = false;
            this.courseImageUrlPendingDeletion = null;
        }
        this.validateForm();

        const shouldAutoSave = hadExistingImage && (
            this.sectionConfig.autoSave ||
            (this.sectionConfig.section === 'essentials' && this.currentCourseId)
        );
        if (shouldAutoSave && this.currentCourseId) {
            this.debouncedSave();
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

                // Enable course builder features and refresh persisted state
                this.skipNextAutoLoad = true;
                try {
                    this.enableCourseBuilderFeatures(result.courseId);
                    await this.loadExistingData(true);
                } finally {
                    this.skipNextAutoLoad = false;
                }
                this.updateUI();

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

        let uploadedImageUrl: string | null = null;

        try {
            this.showStatus("Saving changes…", "loading");
            // Prevent save if pedagogy column is missing
            const isBlocked = this.form?.dataset.blockSave === 'true';
            if (isBlocked && this.sectionConfig.section === 'pedagogy') {
                this.showStatus('Cannot save: missing course_pedagogy column. Please run the migration.', 'error');
                return;
            }

            const rawFormData = this.form ? new FormData(this.form) : null;
            const selectedFileCandidate = rawFormData?.get('course_image');
            const formData = this.getFormData();
            const updateData: Record<string, any> = {};

            console.log('🔍 Processing form data for update:', {
                section: this.sectionConfig.section,
                formDataKeys: Object.keys(formData),
                hasFile: selectedFileCandidate instanceof File,
                courseId: this.currentCourseId
            });

            if (this.sectionConfig.jsonbField) {
                // For JSONB fields, only include non-File values
                for (const [key, value] of Object.entries(formData)) {
                    if (key === 'course_image') {
                        continue;
                    }
                    if (value instanceof File || (typeof value === 'string' && value === '')) {
                        continue;
                    }
                    updateData[key] = value;
                }
                if (Object.keys(updateData).length > 0) {
                    updateData[this.sectionConfig.jsonbField] = updateData;
                    // Remove individual keys since they're now in the JSONB field
                    this.sectionConfig.fields.forEach((field) => {
                        delete updateData[field.name];
                    });
                }
            } else {
                // For top-level columns, only include updatable fields
                const displayOnlyFields = new Set(
                    this.sectionConfig.fields
                        .filter(f => f.type === 'display')
                        .map(f => f.name)
                );

                for (const [key, value] of Object.entries(formData)) {
                    if (key === 'course_image') {
                        continue;
                    }
                    // Skip display fields (read-only)
                    if (displayOnlyFields.has(key)) {
                        console.log(`⏭️  Skipping display-only field: ${key}`);
                        continue;
                    }
                    // Skip File objects and empty strings
                    if (value instanceof File) {
                        continue;
                    }
                    if (typeof value === 'string' && value === '' && key !== 'course_image') {
                        continue;
                    }
                    updateData[key] = value;
                }
            }

            const hasNewUpload = selectedFileCandidate instanceof File && selectedFileCandidate.size > 0;
            const previousImageUrl = this.pendingImageRemoval
                ? this.courseImageUrlPendingDeletion
                : this.currentCourseImageUrl;

            if (hasNewUpload) {
                console.log('📸 Uploading new course image...');
                uploadedImageUrl = await uploadCourseImage({
                    file: selectedFileCandidate as File,
                    courseId: this.currentCourseId,
                });
                if (!uploadedImageUrl) {
                    this.showStatus("Failed to upload course image", "error");
                    return;
                }
                updateData.course_image = uploadedImageUrl;
            } else if (this.pendingImageRemoval) {
                updateData.course_image = null;
            }

            if (this.sectionConfig.section === 'pedagogy' && formData.course_pedagogy) {
                try {
                    const parsed = JSON.parse(formData.course_pedagogy);
                    updateData.course_pedagogy = parsed;
                    console.log('📤 Saving course_pedagogy', {
                        courseId: this.currentCourseId,
                        payload: parsed,
                    });
                } catch (parseError) {
                    console.warn('⚠️ Invalid course_pedagogy payload, skipping save:', parseError);
                }
            }

            console.log('📤 Final update payload:', {
                courseId: this.currentCourseId,
                section: this.sectionConfig.section,
                updateData: updateData,
                timestamp: new Date().toISOString()
            });

            if (Object.keys(updateData).length === 0) {
                console.warn('⚠️ No data to update - all fields were empty or invalid');
                this.showStatus("No changes to save", "success");
                return;
            }

            const result = await updateCourse(this.currentCourseId, updateData);

            if (result.success) {
                if (this.sectionConfig.section === 'pedagogy') {
                    console.log('✅ Pedagogy save success');
                }
                console.log('✅ Course update success:', {
                    courseId: this.currentCourseId,
                    section: this.sectionConfig.section,
                    timestamp: new Date().toISOString()
                });
                this.showStatus("Saved ✓", "success");
                if (uploadedImageUrl) {
                    this.displayExistingImage(uploadedImageUrl);
                    if (previousImageUrl && previousImageUrl !== uploadedImageUrl) {
                        const removed = await deleteCourseImage(previousImageUrl);
                        if (!removed) {
                            console.warn('⚠️ Failed to remove previous course image from storage');
                        }
                    }
                } else if (this.pendingImageRemoval) {
                    if (previousImageUrl) {
                        const removed = await deleteCourseImage(previousImageUrl);
                        if (!removed) {
                            console.warn('⚠️ Failed to remove previous course image from storage');
                        }
                    }
                    this.clearImagePreview(true);
                    this.currentCourseImageUrl = null;
                    this.pendingImageRemoval = false;
                    this.courseImageUrlPendingDeletion = null;
                    this.validateForm();
                }
            } else {
                if (this.sectionConfig.section === 'pedagogy') {
                    console.error('❌ Pedagogy save failed', result.error);
                }
                if (uploadedImageUrl) {
                    await deleteCourseImage(uploadedImageUrl);
                    uploadedImageUrl = null;
                }
                throw new Error(result.error || "Failed to save");
            }
        } catch (error) {
            console.error("❌ Error updating course:", error);
            if (uploadedImageUrl) {
                await deleteCourseImage(uploadedImageUrl);
                uploadedImageUrl = null;
            }
            if (this.pendingImageRemoval) {
                if (this.courseImageUrlPendingDeletion) {
                    this.displayExistingImage(this.courseImageUrlPendingDeletion);
                }
                this.pendingImageRemoval = false;
                this.courseImageUrlPendingDeletion = null;
            }
            const errorMsg = error instanceof Error ? error.message : String(error);
            this.showStatus(`Failed to save: ${errorMsg}`, "error");
        }
    }

    // ==========================================================================
    // UI HELPERS
    // ==========================================================================

    private displayExistingImage(imageUrl: string): void {
        const elements = this.getImageUploadElements();
        const { container, preview, removeButton, input, details, emptyState, filename } = elements;

        if (!container || !preview || !removeButton || !details) {
            return;
        }

        this.currentCourseImageUrl = imageUrl;
        this.pendingImageRemoval = false;
        this.courseImageUrlPendingDeletion = null;

        preview.src = imageUrl;
        preview.alt = "Course image preview";
        preview.hidden = false;
        container.classList.add("has-image");
        removeButton.hidden = false;
        details.hidden = false;
        if (emptyState) {
            emptyState.hidden = true;
        }
        if (filename) {
            filename.hidden = false;
        }

        const parsedFileName = this.extractFilenameFromPath(imageUrl);
        const friendlyName = parsedFileName.toLowerCase().startsWith("cover.")
            ? "Course cover image"
            : parsedFileName;
        this.setFilenameLabel(friendlyName, elements);

        if (input) {
            input.value = "";
            input.setAttribute("aria-label", `Change course image (${friendlyName})`);
        }
    }

    private clearImagePreview(resetInput: boolean = true): void {
        const elements = this.getImageUploadElements();
        const { container, preview, removeButton, input, details, emptyState, filename } = elements;

        if (container) {
            container.classList.remove("has-image");
        }

        if (preview) {
            preview.src = "";
            preview.removeAttribute("src");
            preview.alt = "Course image preview";
            preview.hidden = true;
        }

        if (removeButton) {
            removeButton.hidden = true;
        }

        if (details) {
            details.hidden = true;
        }

        if (emptyState) {
            emptyState.hidden = false;
        }

        if (filename) {
            filename.hidden = true;
        }

        if (resetInput && input) {
            input.value = "";
            input.setAttribute("aria-label", "Upload course image");
        }

        this.setFilenameLabel(null, elements);
    }

    private showFilePreview(file: File): void {
        const elements = this.getImageUploadElements();
        const { container, preview, removeButton, input, details, emptyState, filename } = elements;

        if (!container || !preview || !removeButton || !details) {
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            preview.src = e.target?.result as string;
            preview.alt = file.name || "Course image preview";
            preview.hidden = false;
            container.classList.add("has-image");
            removeButton.hidden = false;
            details.hidden = false;
            if (emptyState) {
                emptyState.hidden = true;
            }
            if (filename) {
                filename.hidden = false;
            }
            this.setFilenameLabel(file.name, elements);

            if (input) {
                input.setAttribute("aria-label", `Change course image (${file.name})`);
            }
        };
        reader.readAsDataURL(file);
    }

    private getImageUploadElements(): {
        container: HTMLElement | null;
        input: HTMLInputElement | null;
        preview: HTMLImageElement | null;
        removeButton: HTMLButtonElement | null;
        filename: HTMLElement | null;
        details: HTMLElement | null;
        emptyState: HTMLElement | null;
    } {
        return {
            container: document.getElementById("course-image-upload") as HTMLElement | null,
            input: document.getElementById("course-image") as HTMLInputElement | null,
            preview: document.getElementById("preview-img") as HTMLImageElement | null,
            removeButton: document.getElementById("remove-image") as HTMLButtonElement | null,
            filename: document.getElementById("course-image-filename") as HTMLElement | null,
            details: document.getElementById("course-image-details") as HTMLElement | null,
            emptyState: document.getElementById("course-image-empty") as HTMLElement | null,
        };
    }

    private setFilenameLabel(
        text: string | null,
        elements?: ReturnType<typeof this.getImageUploadElements>,
    ): void {
        const refs = elements ?? this.getImageUploadElements();
        if (!refs.filename) return;

        const content = text ?? "";
        refs.filename.textContent = content;

        if (content) {
            refs.filename.setAttribute("title", content);
            refs.filename.hidden = false;
        } else {
            refs.filename.removeAttribute("title");
            refs.filename.hidden = true;
        }
    }

    private extractFilenameFromPath(path: string): string {
        try {
            const origin =
                typeof window !== "undefined" ? window.location.origin : "https://placeholder.local";
            const potentialUrl = new URL(path, origin);
            const segments = potentialUrl.pathname.split("/");
            const lastSegment = segments.pop();
            if (lastSegment && lastSegment.trim().length > 0) {
                return decodeURIComponent(lastSegment);
            }
        } catch {
            // Fall through to manual parsing
        }

        const fallbackSegment = path.split("/").pop();
        if (fallbackSegment && fallbackSegment.trim().length > 0) {
            try {
                return decodeURIComponent(fallbackSegment);
            } catch {
                return fallbackSegment;
            }
        }

        return "Course image";
    }

    private updateUI(): void {
        const submitBtn = this.getSubmitButton();
        if (!submitBtn) {
            return;
        }

        const isEssentialsSection = this.sectionConfig.section === "essentials";

        if (isEssentialsSection && !submitBtn.dataset.originalLabel) {
            submitBtn.dataset.originalLabel = this.sectionConfig.submitLabel ?? submitBtn.textContent ?? "Create Course";
        }

        if (isEssentialsSection && this.currentCourseId) {
            // After course creation, button shows status and is disabled since auto-save is active
            submitBtn.textContent = "✓ Course Created";
            submitBtn.disabled = true;
            submitBtn.classList.add("button--disabled");
            submitBtn.setAttribute("aria-disabled", "true");
            submitBtn.title = "Changes are automatically saved as you type";
            return;
        }

        if (isEssentialsSection) {
            submitBtn.textContent = submitBtn.dataset.originalLabel ?? "Create Course";
            submitBtn.title = "Click to create a new course";
        }

        const shouldDisable = !this.isFormValid();
        submitBtn.disabled = shouldDisable;

        if (shouldDisable) {
            submitBtn.classList.add("button--disabled");
            submitBtn.setAttribute("aria-disabled", "true");
        } else {
            submitBtn.classList.remove("button--disabled");
            submitBtn.removeAttribute("aria-disabled");
        }
    }

    private getSubmitButton(): HTMLButtonElement | null {
        if (!this.form) return null;

        const insideForm = this.form.querySelector(
            'button[type="submit"]',
        ) as HTMLButtonElement | null;
        if (insideForm) return insideForm;

        if (!this.form.id) return null;
        return document.querySelector(
            `button[type="submit"][form="${this.form.id}"]`,
        ) as HTMLButtonElement | null;
    }

    private getStatusContainer(): HTMLElement | null {
        if (!this.form) return null;

        const embeddedStatus = this.form.querySelector('.save-status');
        if (embeddedStatus instanceof HTMLElement) {
            return embeddedStatus;
        }

        const article = this.form.closest('[data-course-section]');
        return (
            (article?.querySelector('.save-status') as HTMLElement | null) || null
        );
    }

    private buildSavedMessage(): string {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, "0");
        const minutes = now.getMinutes().toString().padStart(2, "0");
        const day = now.getDate().toString().padStart(2, "0");
        const month = (now.getMonth() + 1).toString().padStart(2, "0");
        const year = now.getFullYear();
        return `This page was last saved at ${hours}:${minutes}, on ${day}.${month}.${year}`;
    }

    private showStatus(
        message: string,
        type: "success" | "error" | "loading",
    ): void {
        const statusContainer = this.getStatusContainer();
        const statusText = statusContainer?.querySelector(
            ".save-status__text",
        ) as HTMLElement | null;

        if (!statusContainer || !statusText) return;

        if (type === "loading") {
            statusContainer.dataset.status = "saving";
            statusText.textContent = message || "Saving changes…";
            return;
        }

        if (type === "success") {
            statusContainer.dataset.status = "saved";
            statusText.textContent = this.buildSavedMessage();
            return;
        }

        statusContainer.dataset.status = "error";
        statusText.textContent = message || "Something went wrong";
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
            courseCodeDisplay.hidden = false;
        }

        const submitBtn = this.getSubmitButton();
        if (submitBtn) {
            submitBtn.textContent = "Created Course";
            submitBtn.disabled = true;
            submitBtn.classList.add("button--disabled");
            submitBtn.setAttribute("aria-disabled", "true");
        }
    }

    private enableCourseBuilderFeatures(courseId: string): void {

        this.updateResolvedCourseId(courseId);

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

export function initializeCourseForm(sectionName: string, courseId?: string): CourseFormHandler {
    return new CourseFormHandler(sectionName, courseId);
}
