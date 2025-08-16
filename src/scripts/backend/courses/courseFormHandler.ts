// ==========================================================================
// COURSE FORM HANDLER - Generic form UI controller for all course sections
// ==========================================================================

import {
 SectionConfig,
 ValidationState,
 getSectionConfig,
} from "./courseFormConfig";
import { validateFormSection, isFormSectionValid } from "./courseFormValidator";
import { createCourse, updateCourse, getCourse } from "./createCourse";

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
 // First try to get course ID from URL parameters
 const urlParams = new URLSearchParams(window.location.search);
 const courseIdFromUrl = urlParams.get('courseId') || urlParams.get('id');
 
 if (courseIdFromUrl) {
 console.log('📋 Course ID from URL:', courseIdFromUrl);
 return courseIdFromUrl;
 }

 // Fallback to session storage (for backward compatibility)
 const courseIdFromSession = sessionStorage.getItem("currentCourseId");
 if (courseIdFromSession) {
 console.log('📋 Course ID from session storage:', courseIdFromSession);
 return courseIdFromSession;
 }

 console.log('📋 No course ID found - this is likely a new course creation');
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
 const activeArticle = document.querySelector('element');
 if (activeArticle) {
 this.form = activeArticle.querySelector("form");
 }
 }

 private async initializeFields(): Promise<void> {
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
 if (
 fieldConfig.type === "select" &&
 fieldConfig.options &&
 field.tagName === "SELECT"
 ) {
 this.populateSelectField(field as HTMLSelectElement, fieldConfig);
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

 // ==========================================================================
 // DATA LOADING
 // ==========================================================================

 private async loadExistingData(): Promise<void> {
 if (!this.form || !this.currentCourseId) return;

 try {
 const courseData = await getCourse(this.currentCourseId);
 if (!courseData) return;

 this.populateFormFields(courseData);

 // Show course code if we're in essentials section and have a course ID
 if (this.sectionConfig.section === "essentials") {
 this.showCourseCode(this.currentCourseId);
 }

 setTimeout(() => this.validateForm(), 100);
 } catch (error) {
 console.error("Error loading existing course data:", error);
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
 const dropdownLabel = dropdownTrigger?.querySelector('element');

 if (hiddenInput && dropdownTrigger && dropdownLabel) {
 hiddenInput.value = value;
 dropdownLabel.textContent = this.getDisplayTextForValue(
 fieldName,
 value,
 );
 dropdownLabel
 dropdownTrigger
 return;
 }
 }

 // Handle regular form fields
 const field = this.form.querySelector(`[name="${fieldName}"]`) as
 | HTMLInputElement
 | HTMLSelectElement
 | HTMLTextAreaElement;
 if (!field) return;

 try {
 if (field.tagName === "SELECT") {
 (field as HTMLSelectElement).value = value;
 } else if (field.type !== "file") {
 field.value = value;
 }

 field.dispatchEvent(new Event("input", { bubbles: true }));
 field.dispatchEvent(new Event("change", { bubbles: true }));
 } catch (error) {
 console.warn(`Failed to set field ${fieldName}:`, error);
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
 const imagePreview = document.getElementById("image-preview");
 const previewImg = document.getElementById(
 "preview-img",
 ) as HTMLImageElement;
 const fileInput = document.getElementById(
 "course-image",
 ) as HTMLInputElement;

 if (imagePreview && previewImg && fileInput) {
 imagePreview.style.display = "none";
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
 
 // Immediately redirect to coursebuilder with courseId in URL
 const newUrl = `${window.location.pathname}?courseId=${result.courseId}`;
 window.location.href = newUrl;
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
 const imagePreview = document.getElementById("image-preview");
 const previewImg = document.getElementById(
 "preview-img",
 ) as HTMLImageElement;
 const fileUploadLabel = this.form?.querySelector(
 ".file-upload__compact-label",
 );

 if (imagePreview && previewImg) {
 previewImg.src = imageUrl;
 imagePreview.style.display = "block";

 if (fileUploadLabel) {
 const textElement = fileUploadLabel.querySelector('element');
 if (textElement) {
 textElement.textContent = "Change course image";
 }
 }
 }
 }

 private showFilePreview(file: File): void {
 const preview = document.getElementById("image-preview");
 const img = document.getElementById("preview-img") as HTMLImageElement;

 if (preview && img) {
 const reader = new FileReader();
 reader.onload = (e) => {
 img.src = e.target?.result as string;
 preview.style.display = "block";
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
 const statusDiv = this.form?.querySelector('element') as HTMLElement;
 if (statusDiv) {
 statusDiv.textContent = message;
 statusDiv
 }
 }

 private showCourseCode(courseId: string): void {
 const courseCodeDisplay = this.form?.querySelector(
 "#course-code-display",
 ) as HTMLElement;
 const courseCodeValue = this.form?.querySelector(
 "#course-code-value",
 ) as HTMLElement;
 const courseCodeCopyBtn = this.form?.querySelector(
 "#course-code-copy-btn",
 ) as HTMLElement;

 if (courseCodeDisplay && courseCodeValue && courseCodeCopyBtn) {
 courseCodeValue.textContent = courseId;
 courseCodeDisplay.style.display = "block";

 // Only add copy functionality if not already added
 if (!courseCodeCopyBtn.hasAttribute("data-copy-listener")) {
 courseCodeCopyBtn.setAttribute("data-copy-listener", "true");

 courseCodeCopyBtn.addEventListener("click", async () => {
 try {
 await navigator.clipboard.writeText(courseId);
 this.showCopyFeedback(courseCodeCopyBtn);
 } catch (err) {
 console.error("Failed to copy course code:", err);
 // Fallback for older browsers
 this.fallbackCopy(courseId);
 this.showCopyFeedback(courseCodeCopyBtn);
 }
 });
 }
 }
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
