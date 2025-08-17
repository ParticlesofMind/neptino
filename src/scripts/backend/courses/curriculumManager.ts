import { supabase } from "../../backend/supabase.js";

interface CurriculumLesson {
 lessonNumber: number;
 title: string;
 topics: CurriculumTopic[];
}

interface CurriculumTopic {
 title: string;
 objectives: string[];
 tasks: string[];
}

interface ContentLoadConfig {
 type: "mini" | "regular" | "double" | "triple" | "long";
 duration: number; // in minutes
 topicsPerLesson: number;
 objectivesPerTopic: number;
 tasksPerTopic: number;
}

type PreviewMode = "titles" | "topics" | "objectives";

export class CurriculumManager {
 private courseId: string;
 private curriculumConfigSection!: HTMLElement;
 private curriculumPreviewSection!: HTMLElement;
 private contentLoadDisplay!: HTMLElement;
 private currentCurriculum: CurriculumLesson[] = [];
 private contentLoadConfig: ContentLoadConfig | null = null;
 private currentPreviewMode: PreviewMode = "titles";

 constructor(courseId?: string) {
 // Get course ID from parameter, URL, or session storage
 this.courseId = courseId || this.getCourseId();

 console.log('📚 CurriculumManager initializing with course ID:', this.courseId);

 if (!this.courseId) {
 console.warn("⚠️ No course ID available for curriculum management - some features may be limited");
 // Still initialize elements and basic functionality
 this.initializeElements();
 this.bindEvents();
 return;
 }

 this.initializeElements();
 this.bindEvents();
 this.initializeCurriculum();
 }

 private getCourseId(): string {
 // First try to get course ID from URL parameters
 const urlParams = new URLSearchParams(window.location.search);
 const courseIdFromUrl = urlParams.get('courseId') || urlParams.get('id');
 
 if (courseIdFromUrl) {
 console.log('📚 Course ID from URL:', courseIdFromUrl);
 return courseIdFromUrl;
 }

 // Fallback to session storage (for backward compatibility)
 const courseIdFromSession = sessionStorage.getItem("currentCourseId");
 if (courseIdFromSession) {
 console.log('📚 Course ID from session storage:', courseIdFromSession);
 return courseIdFromSession;
 }

 console.log('📚 No course ID found for curriculum manager');
 return "";
 }

 private async initializeCurriculum(): Promise<void> {
 try {
 // Load schedule data first
 await this.loadScheduleData();

 // Load existing curriculum
 await this.loadExistingCurriculum();

 // Auto-generate curriculum if we have schedule data but no curriculum
 if (!this.currentCurriculum.length && this.contentLoadConfig) {
 await this.generateCurriculum();
 }

 // Always show preview if we have curriculum data
 if (this.currentCurriculum.length > 0) {
 this.showPreview();
 }
 } catch (error) {
 console.error("Error initializing curriculum:", error);
 }
 }

  private initializeElements(): void {
    this.curriculumConfigSection = document.getElementById(
      "curriculum-config",
    ) as HTMLElement;
    this.curriculumPreviewSection = document.querySelector(
      ".coursebuilder-curriculum-preview",
    ) as HTMLElement;
    this.contentLoadDisplay = document.querySelector(
      ".coursebuilder-curriculum-preview__content",
    ) as HTMLElement; // Check if all elements were found
 if (!this.curriculumConfigSection) {
 console.error("curriculum-config element not found");
 return;
 }
 if (!this.curriculumPreviewSection) {
 console.error("curriculum-preview element not found");
 return;
 }

 }

 private bindEvents(): void {
 if (!this.curriculumConfigSection) {
 console.error("Cannot bind events: required elements not found");
 return;
 }

 // Preview mode buttons
 const previewModeButtons =
 this.curriculumPreviewSection?.querySelectorAll('elements');
 previewModeButtons?.forEach((button) => {
 button.addEventListener("click", (e) => {
 const mode = (e.target as HTMLElement).dataset.mode as PreviewMode;
 this.setPreviewMode(mode);
 });
 });

 }

 private async loadScheduleData(): Promise<void> {
 if (!this.courseId) {
 console.warn('📚 Cannot load schedule data: no course ID available');
 this.displayNoScheduleWarning();
 return;
 }

 try {
 const { data, error } = await supabase
 .from("courses")
 .select("schedule_settings")
 .eq("id", this.courseId)
 .single();

 if (error) throw error;

 if (
 data?.schedule_settings &&
 Array.isArray(data.schedule_settings) &&
 data.schedule_settings.length > 0
 ) {
 // Get the first lesson to determine duration
 const firstLesson = data.schedule_settings[0];
 const duration = this.calculateLessonDuration(
 firstLesson.startTime,
 firstLesson.endTime,
 );
 this.contentLoadConfig = this.determineContentLoad(duration);
 this.displayContentLoad();
 } else {
 this.displayNoScheduleWarning();
 }
 } catch (error) {
 console.error("Error loading schedule data:", error);
 this.displayNoScheduleWarning();
 }
 }

 private calculateLessonDuration(startTime: string, endTime: string): number {
 const start = new Date(`2000-01-01T${startTime}`);
 const end = new Date(`2000-01-01T${endTime}`);
 return Math.abs(end.getTime() - start.getTime()) / (1000 * 60); // Convert to minutes
 }

 private determineContentLoad(duration: number): ContentLoadConfig {
 if (duration <= 30) {
 return {
 type: "mini",
 duration,
 topicsPerLesson: 1,
 objectivesPerTopic: 1,
 tasksPerTopic: 2,
 };
 } else if (duration <= 60) {
 return {
 type: "regular",
 duration,
 topicsPerLesson: 2,
 objectivesPerTopic: 2,
 tasksPerTopic: 2,
 };
 } else if (duration <= 120) {
 return {
 type: "double",
 duration,
 topicsPerLesson: 3,
 objectivesPerTopic: 2,
 tasksPerTopic: 3,
 };
 } else if (duration <= 180) {
 return {
 type: "triple",
 duration,
 topicsPerLesson: 4,
 objectivesPerTopic: 3,
 tasksPerTopic: 3,
 };
 } else {
 return {
 type: "long",
 duration,
 topicsPerLesson: 5,
 objectivesPerTopic: 3,
 tasksPerTopic: 4,
 };
 }
 }

 private displayContentLoad(): void {
 if (!this.contentLoadDisplay || !this.contentLoadConfig) return;

 this.contentLoadDisplay.innerHTML = `
 <div class="content-load-info">
 <div class="content-load-badge content-load-badge--${this.contentLoadConfig.type}">
 ${this.contentLoadConfig.type.toUpperCase()}
 </div>
 <div class="content-load-details">
 <div class="duration">${this.contentLoadConfig.duration} minutes per lesson</div>
 <div class="structure">
 ${this.contentLoadConfig.topicsPerLesson} topic(s) • 
 ${this.contentLoadConfig.objectivesPerTopic} objective(s) per topic • 
 ${this.contentLoadConfig.tasksPerTopic} task(s) per topic
 </div>
 </div>
 </div>
 `;
 }

 private displayNoScheduleWarning(): void {
 if (!this.contentLoadDisplay) return;

 this.contentLoadDisplay.innerHTML = `
 <div class="content-load-warning">
 <div class="warning-icon">⚠️</div>
 <div class="warning-text">
 <strong>Schedule Required</strong>
 <p>Please create a schedule first to determine content load.</p>
 </div>
 </div>
 `;
 }

 private async generateCurriculum(): Promise<void> {
 if (!this.contentLoadConfig) {
 console.warn(
 "Content load configuration not available. Please ensure you have a schedule.",
 );
 return;
 }

 try {
 // Get the number of lessons from schedule
 const { data: scheduleData } = await supabase
 .from("courses")
 .select("schedule_settings, course_sessions")
 .eq("id", this.courseId)
 .single();

 const numLessons = scheduleData?.course_sessions || 1;
 const curriculum = this.createCurriculumStructure(numLessons);

 await this.saveCurriculumToDatabase(curriculum);
 this.currentCurriculum = curriculum;
 this.renderCurriculumPreview();

 } catch (error) {
 console.error("Error generating curriculum:", error);
 alert("Failed to generate curriculum. Please try again.");
 }
 }

 private createCurriculumStructure(numLessons: number): CurriculumLesson[] {
 if (!this.contentLoadConfig) return [];

 const curriculum: CurriculumLesson[] = [];

 for (let i = 1; i <= numLessons; i++) {
 const lesson: CurriculumLesson = {
 lessonNumber: i,
 title: `Lesson ${i}`,
 topics: [],
 };

 for (let j = 1; j <= this.contentLoadConfig.topicsPerLesson; j++) {
 const topic: CurriculumTopic = {
 title: `Topic ${j}`,
 objectives: [],
 tasks: [],
 };

 // Add objectives
 for (let k = 1; k <= this.contentLoadConfig.objectivesPerTopic; k++) {
 topic.objectives.push(`Objective ${k}`);
 }

 // Add tasks
 for (let l = 1; l <= this.contentLoadConfig.tasksPerTopic; l++) {
 topic.tasks.push(`Task ${l}`);
 }

 lesson.topics.push(topic);
 }

 curriculum.push(lesson);
 }

 return curriculum;
 }

 private async saveCurriculumToDatabase(
 curriculum: CurriculumLesson[],
 ): Promise<void> {
 if (!this.courseId) {
 console.warn('📚 Cannot save curriculum: no course ID available');
 throw new Error('No course ID available for saving curriculum');
 }

 const { error } = await supabase
 .from("courses")
 .update({
 curriculum_data: curriculum,
 })
 .eq("id", this.courseId);

 if (error) {
 throw error;
 }
 }

 private setPreviewMode(mode: PreviewMode): void {
 this.currentPreviewMode = mode;

 // Update active button
 const previewModeButtons =
 this.curriculumPreviewSection.querySelectorAll('elements');
 previewModeButtons.forEach((btn) => {
 btn
 });

 // Re-render preview with new mode
 this.renderCurriculumPreview();
 }

 private renderCurriculumPreview(): void {
 const previewContainer = this.curriculumPreviewSection.querySelector(
 ".curriculum-preview-content",
 );
 if (!previewContainer || !Array.isArray(this.currentCurriculum)) return;

 let html = "";

 this.currentCurriculum.forEach((lesson) => {
 html += `<div class="curriculum-lesson">`;

 // Always show lesson title
 html += `<div class="lesson-title" contenteditable="true" data-lesson="${lesson.lessonNumber}" data-field="title">${lesson.title}</div>`;

 if (
 this.currentPreviewMode === "topics" ||
 this.currentPreviewMode === "objectives"
 ) {
 lesson.topics.forEach((topic, topicIndex) => {
 html += `<div class="lesson-topic">`;
 html += `<div class="topic-title" contenteditable="true" data-lesson="${lesson.lessonNumber}" data-topic="${topicIndex}" data-field="title">${topic.title}</div>`;

 if (this.currentPreviewMode === "objectives") {
 topic.objectives.forEach((objective, objIndex) => {
 html += `<div class="topic-objective" contenteditable="true" data-lesson="${lesson.lessonNumber}" data-topic="${topicIndex}" data-objective="${objIndex}">${objective}</div>`;
 });
 }

 html += `</div>`;
 });
 }

 html += `</div>`;
 });

 previewContainer.innerHTML = html;
 this.bindEditableEvents();
 this.curriculumPreviewSection
 }

 private bindEditableEvents(): void {
 const editableElements = this.curriculumPreviewSection.querySelectorAll(
 '[contenteditable="true"]',
 );
 editableElements.forEach((element) => {
 element.addEventListener("blur", (e) =>
 this.updateCurriculumData(e.target as HTMLElement),
 );
 });
 }

 private updateCurriculumData(element: HTMLElement): void {
 const lessonNum = parseInt(element.dataset.lesson || "0");
 const topicIndex = element.dataset.topic
 ? parseInt(element.dataset.topic)
 : null;
 const objectiveIndex = element.dataset.objective
 ? parseInt(element.dataset.objective)
 : null;
 const field = element.dataset.field;
 const newValue = element.textContent || "";

 const lesson = this.currentCurriculum.find(
 (l) => l.lessonNumber === lessonNum,
 );
 if (!lesson) return;

 if (field === "title" && topicIndex === null) {
 // Lesson title
 lesson.title = newValue;
 } else if (topicIndex !== null && lesson.topics[topicIndex]) {
 if (field === "title") {
 // Topic title
 lesson.topics[topicIndex].title = newValue;
 } else if (objectiveIndex !== null) {
 // Objective
 lesson.topics[topicIndex].objectives[objectiveIndex] = newValue;
 }
 }

 // Auto-save to database
 this.saveCurriculumToDatabase(this.currentCurriculum);
 }

 private async loadExistingCurriculum(): Promise<void> {
 if (!this.courseId) {
 console.warn('📚 Cannot load curriculum: no course ID available');
 this.hideCurriculumPreview();
 return;
 }

 try {
 const { data, error } = await supabase
 .from("courses")
 .select("curriculum_data")
 .eq("id", this.courseId)
 .single();

 if (error) throw error;

 if (data?.curriculum_data && Array.isArray(data.curriculum_data)) {
 this.currentCurriculum = data.curriculum_data;
 this.renderCurriculumPreview();
 } else {
 this.hideCurriculumPreview();
 }
 } catch (error) {
 console.error("Error loading existing curriculum:", error);
 this.hideCurriculumPreview();
 }
 }

 /**
 * Set course ID after initialization
 */
 public setCourseId(courseId: string): void {
 if (this.courseId === courseId) {
 return; // No change needed
 }
 
 this.courseId = courseId;
 console.log('📚 Course ID updated for curriculum manager:', courseId);
 
 // Reload data with new course ID
 this.initializeCurriculum();
 }

 /**
 * Refresh the display to show current state
 */
 public refreshDisplay(): void {
 if (this.currentCurriculum && this.currentCurriculum.length > 0) {
 this.showPreview();
 } else {
 this.hideCurriculumPreview();
 }
 }

 private showPreview(): void {
 this.curriculumPreviewSection
 this.renderCurriculumPreview();
 }

 private hideCurriculumPreview(): void {
 this.curriculumPreviewSection
 }
}

// Make CurriculumManager available globally for testing/debugging
declare global {
 interface Window {
 CurriculumManager: typeof CurriculumManager;
 }
}

if (typeof window !== "undefined") {
 window.CurriculumManager = CurriculumManager;
}
