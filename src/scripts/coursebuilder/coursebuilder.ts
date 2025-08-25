/**
 * CourseBuilderCanvas - PIXI Canvas controller for the course building interface
 * Coordinates canvas components with enhanced error handling and modular architecture
 */

// Import necessary types and managers
import { PixiCanvas } from "./canvas/PixiCanvas";
import { ToolStateManager } from "./ui/ToolStateManager";
import { UIEventHandler } from "./ui/UIEventHandler";
import { CourseFormHandler } from "../backend/courses/courseFormHandler";
import { CourseBuilderSelectHandler } from "./selectHandler";

// Import language loader to initialize languages on page load
import "../backend/courses/languageLoader";

// Course management imports
import { ScheduleCourseManager } from "../backend/courses/scheduleCourse";
import { CurriculumManager } from "../backend/courses/curriculumManager";
import { DeleteCourseManager } from "../backend/courses/deleteCourse";
import { supabase } from "../backend/supabase";

// Import and expose PIXI globally for devtools detection
import * as PIXI from "pixi.js";

// Expose PIXI globally for devtools
if (typeof window !== 'undefined') {
 (window as any).PIXI = PIXI;
 console.log('🔧 PIXI library exposed globally for devtools');
}

// Optional imports for managers that may not exist yet
// These will be conditionally imported when available

// ensure that there's a way to check whether margins exist or not 
type MarginSettingsManager = any;
type PageManager = any;
// Temporary type declarations for unimplemented classes
type MediaManager = any;
type FontManager = any;
type CommandManager = any;

/**
 * Error handler for consistent error reporting
 */
class ErrorBoundary {
 private static instance: ErrorBoundary;
 
 static getInstance(): ErrorBoundary {
 if (!ErrorBoundary.instance) {
 ErrorBoundary.instance = new ErrorBoundary();
 }
 return ErrorBoundary.instance;
 }
 
 handleError(error: Error, context: string): void {
 console.error(`[CourseBuilder/${context}] Error:`, error);
 // Could integrate with error reporting service here
 }
}

/**
 * Performance monitoring utility
 */
class PerformanceMonitor {
 private markers: Map<string, number> = new Map();
 
 start(name: string): void {
 this.markers.set(name, performance.now());
 }
 
 end(name: string): number {
 const start = this.markers.get(name);
 if (!start) return 0;
 
 const duration = performance.now() - start;
 console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
 this.markers.delete(name);
 return duration;
 }
}

/**
 * Main CourseBuilderCanvas class with enhanced architecture
 */
export class CourseBuilderCanvas {
 // Core canvas and state management
 private pixiCanvases: PixiCanvas[] = []; // Array to store PIXI canvases for each lesson
 private toolStateManager: ToolStateManager | null = null;
 private uiEventHandler: UIEventHandler | null = null;
 private commandManager: CommandManager | null = null;
 
 // Layout and content managers
 private marginSettingsManager: MarginSettingsManager | null = null;
 private pageManager: PageManager | null = null;
 private mediaManager: MediaManager | null = null;
 private fontManager: FontManager | null = null;
 
 // Course-specific managers
 private scheduleManager: ScheduleCourseManager | null = null;
 private curriculumManager: CurriculumManager | null = null;
 private currentFormHandler: CourseFormHandler | null = null;
 private selectHandler: CourseBuilderSelectHandler | null = null;
 private deleteCourseManager: DeleteCourseManager | null = null;
 
 // State tracking
 private currentSection: string = "essentials";
 private courseId: string | null = null;
 private isInitialized: boolean = false;
 private keyboardShortcutsEnabled: boolean = true;
 
 // Utility instances
 private errorBoundary: ErrorBoundary;
 private performanceMonitor: PerformanceMonitor;
 
 constructor() {
 this.errorBoundary = ErrorBoundary.getInstance();
 this.performanceMonitor = new PerformanceMonitor();
 
 // Expose globally for debugging
 if (typeof window !== 'undefined') {
 (window as any).courseBuilderCanvasInstance = this;
 }
 
 this.initialize();
 }

 // ==========================================================================
 // INITIALIZATION
 // ==========================================================================

 private async initialize(): Promise<void> {
 try {
 this.performanceMonitor.start('coursebuilder-init');
 
 console.log('🎨 Initializing CourseBuilderCanvas...');
 
 // Get course ID first
 this.getCourseId();
 
 // Initialize current section from URL
 this.initializeCurrentSection();
 
 // Setup section navigation
 this.setupSectionNavigation();
 
 // Initialize managers based on current section
 await this.initializeBasedOnSection();
 
 // Setup keyboard shortcuts
 this.setupKeyboardShortcuts();

 // Setup page layout listener
 this.setupPageLayoutListener();

 // Initialize all other managers
 this.initializeAllManagers(); this.isInitialized = true;
 this.performanceMonitor.end('coursebuilder-init');
 
 console.log('✅ CourseBuilderCanvas initialized successfully');
 } catch (error) {
 this.errorBoundary.handleError(error as Error, 'initialization');
 throw error;
 }
 }

 private getCourseId(): void {
 try {
 // First try URL parameters
 const urlParams = new URLSearchParams(window.location.search);
 const courseIdFromUrl = urlParams.get('courseId') || urlParams.get('id');
 
 if (courseIdFromUrl) {
 this.courseId = courseIdFromUrl;
 sessionStorage.setItem("currentCourseId", courseIdFromUrl);
 console.log('📋 Course ID from URL:', courseIdFromUrl);
 return;
 }

 // Fallback to session storage
 const courseIdFromSession = sessionStorage.getItem("currentCourseId");
 if (courseIdFromSession) {
 this.courseId = courseIdFromSession;
 console.log('📋 Course ID from session storage:', courseIdFromSession);
 return;
 }

 console.log('📋 No course ID found - this is likely a new course creation');
 } catch (error) {
 this.errorBoundary.handleError(error as Error, 'getCourseId');
 }
 }

 private initializeCurrentSection(): void {
 try {
 // Get section from URL hash or default to setup
 const hash = window.location.hash.substring(1);
 const validMainSections = ["setup", "create", "preview", "launch"];
 const validSubSections = ["essentials", "classification", "templates", "schedule", "curriculum", "settings", "marketplace", "resources"];
 
 if (validMainSections.includes(hash)) {
 this.currentSection = hash;
 } else if (validSubSections.includes(hash)) {
 // Map subsections to their parent main section
 this.currentSection = "setup"; // All subsections belong to setup
 } else {
 this.currentSection = "setup"; // Default to setup instead of essentials
 }
 
 console.log(`📄 Current section: ${this.currentSection}`);
 } catch (error) {
 this.errorBoundary.handleError(error as Error, 'initializeCurrentSection');
 this.currentSection = "setup";
 }
 }

 private setupSectionNavigation(): void {
 try {
 // Skip sidebar/aside links since CourseBuilderNavigation.ts handles them
 // Only handle main section navigation via URL hash changes
 const navLinks = document.querySelectorAll('[data-section]');
 
 // Don't add duplicate event handlers for aside links - CourseBuilderNavigation.ts handles them
 // Only handle non-sidebar navigation links if any exist
 navLinks.forEach(link => {
 // Skip sidebar menu links (they have .link--menu class and are handled by CourseBuilderNavigation.ts)
 if (link.classList.contains('link--menu')) {
 return; // Skip - handled by AsideNavigation in CourseBuilderNavigation.ts
 }
 
 // Handle other navigation links that aren't in the sidebar
 link.addEventListener('click', (e) => {
 e.preventDefault();
 const sectionId = (e.currentTarget as HTMLElement).getAttribute('data-section');
 if (sectionId) {
 this.navigateToSection(sectionId);
 }
 });
 });
 
 // Setup header navigation buttons
 const mainSections = ["setup", "create", "preview", "launch"];
 const previousBtn = document.getElementById('previous-button');
 const nextBtn = document.getElementById('next-button');
 
 previousBtn?.addEventListener('click', () => {
 const currentIndex = mainSections.indexOf(this.currentSection);
 if (currentIndex > 0) {
 this.navigateToSection(mainSections[currentIndex - 1]);
 } else if (currentIndex === 0) {
 // Navigate back to courses page when on first section (setup)
 window.location.href = '/src/pages/teacher/courses.html';
 }
 });
 
 nextBtn?.addEventListener('click', () => {
 const currentIndex = mainSections.indexOf(this.currentSection);
 if (currentIndex >= 0 && currentIndex < mainSections.length - 1) {
 this.navigateToSection(mainSections[currentIndex + 1]);
 }
 });
 
 // Listen for hash changes
 window.addEventListener('hashchange', () => {
 this.handleHashChange();
 });
 } catch (error) {
 this.errorBoundary.handleError(error as Error, 'setupSectionNavigation');
 }
 }

 private async initializeBasedOnSection(): Promise<void> {
 try {
 // Skip canvas initialization - using direct HTML5 canvases
 console.log('📚 Skipping PIXI canvas initialization - using HTML5 canvases');
 
 // Initialize section-specific handlers
 this.initializeSectionHandler(this.currentSection);
 
 // If we're in create section and have a course ID, initialize PIXI canvases immediately
 if (this.currentSection === "create" && this.courseId) {
 console.log('🎨 Create section detected with course ID, initializing PIXI canvases...');
 await this.generateLessonNavigation(this.courseId);
 }
 } catch (error) {
 this.errorBoundary.handleError(error as Error, 'initializeBasedOnSection');
 }
 }

 private shouldInitializeCanvas(): boolean {
 // Disable canvas initialization - using direct HTML5 canvases
 return false;
 }

 private async initializeCanvas(): Promise<void> {
 try {
 this.performanceMonitor.start('canvas-init');
 
 const canvasContainer = document.getElementById("canvas-container");
 if (!canvasContainer) {
 console.warn('⚠️ Canvas container not found - skipping canvas initialization');
 return;
 }

 // Skip all PIXI initialization - using direct HTML5 canvases for PDF-style layout
 console.log('📚 Skipping PIXI initialization - using HTML5 canvases for lessons');
 
 // If we have a course ID, initialize canvases now that container is ready
 if (this.courseId) {
 console.log('🎯 Canvas container ready - initializing course:', this.courseId);
 // Generate lesson navigation for this course
 this.generateLessonNavigation(this.courseId);
 }
 
 // Initialize core managers without PIXI dependency
 if (!this.uiEventHandler) {
 console.log('🎛️ Initializing core managers after canvas setup...');
 this.initializeCoreManagers();
 }
 
 this.performanceMonitor.end('canvas-init');
 console.log('✅ Canvas system initialized without PIXI');
 } catch (error) {
 this.errorBoundary.handleError(error as Error, 'canvas-init');
 throw error; // Canvas is critical, so rethrow
 }
 }

 /**
 * Set up listener for page layout changes to update canvas margins
 */
 private setupPageLayoutListener(): void {
 try {
 document.addEventListener('pageLayoutChange', (event: Event) => {
 if (this.pixiCanvases.length > 0 && (event as CustomEvent).detail) {
 const layout = (event as CustomEvent).detail;
 console.log('📄 Page layout changed, updating canvas margins:', layout.margins);
 
 // Convert margin values to pixels
 const margins = this.convertMarginsToPixels(layout.margins);
 // Update all canvases
 this.pixiCanvases.forEach(canvas => canvas.updateMargins(margins));
 }
 });
 
 console.log('📄 Page layout listener set up');
 } catch (error) {
 this.errorBoundary.handleError(error as Error, 'setupPageLayoutListener');
 }
 }

 /**
 * Load initial page layout settings for the current course
 */
 private async loadInitialPageLayout(): Promise<void> {
 try {
 if (!this.courseId) {
 console.log('📄 No course ID - using default margins');
 // Use default margins if no course ID
 const defaultMargins = { top: 72, right: 72, bottom: 72, left: 72 }; // 2.54cm in pixels
 if (this.pixiCanvases.length > 0) {
 this.pixiCanvases.forEach(canvas => canvas.updateMargins(defaultMargins));
 }
 return;
 }

 // Import and get page layout settings
 const { pageSetupHandler } = await import('../backend/courses/pageSetupHandler');
 const settings = pageSetupHandler.getCurrentSettings();
 
 if (settings && settings.margins) {
 const margins = this.convertMarginsToPixels(settings.margins);
 console.log('📄 Loading initial page layout margins:', margins);
 if (this.pixiCanvases.length > 0) {
 this.pixiCanvases.forEach(canvas => canvas.updateMargins(margins));
 }
 }
 } catch (error) {
 this.errorBoundary.handleError(error as Error, 'loadInitialPageLayout');
 }
 }

 /**
 * Convert margin values to pixels based on unit
 */
 private convertMarginsToPixels(margins: {
 top: number;
 right: number;
 bottom: number;
 left: number;
 unit: "mm" | "cm" | "inches";
 }): { top: number; right: number; bottom: number; left: number } {
 let conversionFactor = 1;
 
 // Convert to pixels (assuming 96 DPI)
 switch (margins.unit) {
 case "mm":
 conversionFactor = 96 / 25.4; // mm to pixels
 break;
 case "cm":
 conversionFactor = 96 / 2.54; // cm to pixels
 break;
 case "inches":
 conversionFactor = 96; // inches to pixels
 break;
 default:
 conversionFactor = 96 / 2.54; // default to cm
 }

 return {
 top: Math.round(margins.top * conversionFactor),
 right: Math.round(margins.right * conversionFactor),
 bottom: Math.round(margins.bottom * conversionFactor),
 left: Math.round(margins.left * conversionFactor),
 };
 }

 private setupKeyboardShortcuts(): void {
 try {
 if (!this.keyboardShortcutsEnabled) return;
 
 document.addEventListener('keydown', (e) => {
 // Handle keyboard shortcuts
 if ((e.ctrlKey || e.metaKey)) {
 switch (e.key.toLowerCase()) {
 case 's':
 e.preventDefault();
 this.handleSave();
 break;
 case 'z':
 if (!e.shiftKey) {
 e.preventDefault();
 this.handleUndo();
 }
 break;
 case 'y':
 e.preventDefault();
 this.handleRedo();
 break;
 }
 }
 });
 
 console.log('⌨️ Keyboard shortcuts enabled');
 } catch (error) {
 this.errorBoundary.handleError(error as Error, 'setupKeyboardShortcuts');
 }
 }

 private initializeAllManagers(): void {
 try {
 this.performanceMonitor.start('managers-init');
 
 // Initialize core managers only if canvas is available
 if (this.pixiCanvases.length > 0) {
 this.initializeCoreManagers();
 }
 
 // Initialize course-specific managers
 this.initializeCourseManagers();
 
 this.performanceMonitor.end('managers-init');
 console.log('✅ All managers initialized');
 } catch (error) {
 this.errorBoundary.handleError(error as Error, 'initializeAllManagers');
 }
 }

 private initializeCoreManagers(): void {
 try {
 // Tool state management
 this.toolStateManager = new ToolStateManager();
 
 // UI event handling
 this.uiEventHandler = new UIEventHandler(this.toolStateManager);
 
 // Connect UI tool selection to PIXI canvas tool activation
 this.uiEventHandler.setOnToolChange((toolName: string) => {
 console.log(`🔧 Activating tool: ${toolName} on ${this.pixiCanvases.length} canvases`);
 
 // Apply tool to all active PIXI canvases
 this.pixiCanvases.forEach((canvas, index) => {
 const success = canvas.setTool(toolName);
 if (!success) {
 console.warn(`⚠️ Failed to activate tool ${toolName} on canvas ${index + 1}`);
 } else {
 console.log(`✅ Tool ${toolName} activated on canvas ${index + 1}`);
 }
 });
 });
 
 // Connect UI color changes to PIXI canvases
 this.uiEventHandler.setOnColorChange((color: string) => {
 console.log(`🎨 Updating tool color: ${color} on ${this.pixiCanvases.length} canvases`);
 this.pixiCanvases.forEach((canvas) => {
 canvas.updateToolColor(color);
 });
 });

 // Connect UI tool settings changes to PIXI canvases
 this.uiEventHandler.setOnToolSettingsChange((toolName: string, settings: any) => {
 console.log(`⚙️ Updating tool settings for ${toolName} on ${this.pixiCanvases.length} canvases:`, settings);
 this.pixiCanvases.forEach((canvas) => {
 canvas.updateToolSettings(toolName, settings);
 });
 });
 
 console.log('✅ Core managers initialized with PIXI canvas integration');
 } catch (error) {
 this.errorBoundary.handleError(error as Error, 'initializeCoreManagers');
 }
 }

 private initializeCourseManagers(): void {
 try {
 // Only initialize if we have a course ID or are in creation mode
 if (this.courseId || this.currentSection === "essentials") {
 
 // Schedule manager for schedule section
 if (this.currentSection === "schedule" || this.courseId) {
 this.scheduleManager = new ScheduleCourseManager(this.courseId || undefined);
 console.log('📅 Schedule manager initialized');
 }
 
 // Curriculum manager for curriculum section
 if (this.currentSection === "curriculum" || this.courseId) {
 this.curriculumManager = new CurriculumManager(this.courseId || undefined);
 console.log('📚 Curriculum manager initialized');
 }
 
 // Delete course manager - always initialize if we have a course ID
 if (this.courseId) {
 this.deleteCourseManager = new DeleteCourseManager(this.courseId);
 console.log('🗑️ Delete course manager initialized');
 }
 }

 // Initialize dropdown handler for classification section
 if (!this.selectHandler) {
 this.selectHandler = new CourseBuilderSelectHandler();
 console.log('📋 Select handler initialized');
 }
 } catch (error) {
 this.errorBoundary.handleError(error as Error, 'initializeCourseManagers');
 }
 }

 // ==========================================================================
 // NAVIGATION AND SECTION HANDLING
 // ==========================================================================

 private navigateToSection(sectionId: string): void {
 try {
 console.log(`🔄 Navigating to section: ${sectionId}`);
 
 // Update URL hash
 window.location.hash = sectionId;
 
 // Update current section
 this.currentSection = sectionId;
 
 // Initialize canvas if navigating to a canvas section and not already initialized
 if ((sectionId === "create" || this.shouldInitializeCanvas()) && this.pixiCanvases.length === 0) {
 this.initializeCanvas().catch(error => {
 console.error('Failed to initialize canvas during navigation:', error);
 });
 }
 
 // Initialize section-specific handler
 this.initializeSectionHandler(sectionId);
 
 // Update UI state
 this.updateUIForSection(sectionId);
 } catch (error) {
 this.errorBoundary.handleError(error as Error, 'navigateToSection');
 }
 }

 private handleHashChange(): void {
 try {
 const hash = window.location.hash.substring(1);
 const newSection = hash || "setup";
 
 const mainSections = ["setup", "create", "preview", "launch"];
 const subSections = ["essentials", "classification", "templates", "schedule", "curriculum", "settings", "marketplace", "resources"];
 
 if (mainSections.includes(newSection)) {
 // Direct main section navigation
 if (newSection !== this.currentSection) {
 this.currentSection = newSection;
 this.updateUIForSection(newSection);
 }
 } else if (subSections.includes(newSection)) {
 // Subsection navigation - ensure we're in setup
 if (this.currentSection !== "setup") {
 this.currentSection = "setup";
 }
 this.updateUIForSection("setup");
 } else {
 // Invalid section, default to setup
 window.location.hash = "setup";
 }
 } catch (error) {
 this.errorBoundary.handleError(error as Error, 'handleHashChange');
 }
 }

 /**
 * Navigate to a specific section and initialize appropriate handlers
 * Fixed: Proper usage of currentFormHandler to eliminate TypeScript warnings
 */
 private initializeSectionHandler(sectionId: string): void {
 try {
 // Clean up previous handler
 if (this.currentFormHandler) {
 // If the handler has a destroy method, call it
 if (typeof (this.currentFormHandler as any).destroy === 'function') {
 (this.currentFormHandler as any).destroy();
 }
 this.currentFormHandler = null;
 }

 // Only initialize form handlers for specific sections
 if (sectionId === "schedule") {
 // Initialize schedule manager if it doesn't exist
 if (!this.scheduleManager) {
 console.log('📅 Initializing schedule manager for navigation');
 this.scheduleManager = new ScheduleCourseManager(this.courseId || undefined);
 }
 
 // Schedule manager is now available - trigger refresh
 if (this.scheduleManager) {
 // Trigger a refresh to show/hide preview as needed
 this.scheduleManager.refreshDisplay();
 }
 } else if (sectionId === "curriculum") {
 // Curriculum manager is already initialized - just ensure preview is visible
 if (this.curriculumManager) {
 // Trigger a refresh to show/hide preview as needed
 this.curriculumManager.refreshDisplay();
 } else {
 console.log('📋 Curriculum manager not initialized (create new course mode)');
 }
 // Also initialize form handler for curriculum form data
 this.currentFormHandler = new CourseFormHandler(sectionId);
 } else if (sectionId === "essentials" || sectionId === "settings") {
 // Initialize generic form handler for form-based sections
 this.currentFormHandler = new CourseFormHandler(sectionId);
 }

 // Use the form handler if it was created
 if (this.currentFormHandler) {
 console.log(`📝 Form handler initialized for section: ${sectionId}`);
 
 // You can add additional setup here, for example:
 // this.currentFormHandler.onFormSubmit(() => this.handleFormSubmit());
 // this.currentFormHandler.onFormChange(() => this.handleFormChange());
 }

 } catch (error) {
 this.errorBoundary.handleError(error as Error, `initializeSectionHandler(${sectionId})`);
 }
 }

 private updateUIForSection(sectionId: string): void {
 try {
 // Update active nav state for subsection links (in setup)
 // Only update sidebar links if we're handling a sidebar section
 const validSubSections = ["essentials", "classification", "templates", "schedule", "curriculum", "settings", "marketplace", "resources"];
 const isSubSection = validSubSections.includes(sectionId);
 
 // Don't interfere with CourseBuilderNavigation.ts handling of aside links
 // Only update nav links if this is a main section change
 if (!isSubSection) {
 const navLinks = document.querySelectorAll('[data-section]');
 navLinks.forEach(link => {
 const linkSection = link.getAttribute('data-section');
 if (linkSection === sectionId) {
 link.classList.add('link--menu-active');
 } else {
 link.classList.remove('link--menu-active');
 }
 });
 }
 
 // Update main coursebuilder element visibility
 const coursebuilderElements = document.querySelectorAll('.coursebuilder__setup, .coursebuilder__create, .coursebuilder__preview, .coursebuilder__launch');
 coursebuilderElements.forEach(element => {
 // Hide all elements first
 element.classList.remove('coursebuilder__setup--active', 'coursebuilder__create--active', 'coursebuilder__preview--active', 'coursebuilder__launch--active');
 element.setAttribute('aria-hidden', 'true');
 
 // Show the element that matches the sectionId
 if (element.classList.contains(`coursebuilder__${sectionId}`)) {
 element.classList.add(`coursebuilder__${sectionId}--active`);
 element.setAttribute('aria-hidden', 'false');
 }
 });
 
 // If we're in setup, also ensure the correct subsection is shown
 // But only if this is a subsection navigation (not handled by CourseBuilderNavigation.ts)
 if (sectionId === 'setup' || isSubSection) {
 // Get the hash to see which subsection we should show
 const hash = window.location.hash.substring(1);
 const targetSubSection = isSubSection ? sectionId : hash;
 
 if (validSubSections.includes(targetSubSection)) {
 // Show the specific subsection article - but don't interfere if CourseBuilderNavigation.ts is handling it
 const articles = document.querySelectorAll('.content__article');
 const targetArticle = document.getElementById(targetSubSection);
 
 // Only update if the target article isn't already active (avoid interference)
 if (targetArticle && !targetArticle.classList.contains('content__article--active')) {
 articles.forEach(article => {
 if (article.id === targetSubSection) {
 article.classList.add('content__article--active');
 } else {
 article.classList.remove('content__article--active');
 }
 });
 
 // Update the aside navigation - but only if not already active
 const asideLinks = document.querySelectorAll('.link--menu[data-section]');
 const targetLink = document.querySelector(`[data-section="${targetSubSection}"]`);
 if (targetLink && !targetLink.classList.contains('link--menu-active')) {
 asideLinks.forEach(link => {
 const linkSection = link.getAttribute('data-section');
 if (linkSection === targetSubSection) {
 link.classList.add('link--menu-active');
 } else {
 link.classList.remove('link--menu-active');
 }
 });
 }
 }
 }
 }
 } catch (error) {
 this.errorBoundary.handleError(error as Error, 'updateUIForSection');
 }
 }

 // ==========================================================================
 // COURSE ID MANAGEMENT
 // ==========================================================================

 /**
 * Update course ID for all managers
 */
 public setCourseId(courseId: string): void {
 try {
 console.log(`📋 Setting course ID: ${courseId}`);
 
 this.courseId = courseId;
 sessionStorage.setItem("currentCourseId", courseId);
 
 // Initialize canvases for this course - generate lesson navigation directly
 console.log('🎯 Initializing PIXI lesson canvases for course');
 this.generateLessonNavigation(courseId);
 
 // Update managers that need course ID
 if (this.scheduleManager) {
 this.scheduleManager.setCourseId(courseId);
 }
 
 if (this.curriculumManager) {
 this.curriculumManager.setCourseId(courseId);
 }
 
 // Update dropdown handler if available
 if (this.selectHandler) {
 this.selectHandler.setCourseId(courseId);
 }
 
 // Initialize or update delete course manager
 if (!this.deleteCourseManager) {
 this.deleteCourseManager = new DeleteCourseManager(courseId);
 console.log('🗑️ Delete course manager initialized');
 } else {
 this.deleteCourseManager.setCourseId(courseId);
 }

 // Initialize page setup handler for this course
 this.initializePageSetupHandler(courseId);
 
 // Update URL to include course ID parameter
 this.updateUrlWithCourseId(courseId);
 
 console.log('✅ Course ID updated for all managers');
 } catch (error) {
 this.errorBoundary.handleError(error as Error, 'setCourseId');
 }
 }



 /**
 * Generate lesson navigation UI based on course sessions
 */
 private async generateLessonNavigation(courseId: string): Promise<void> {
 try {
 // Get course data to determine number of sessions
 const { data: course, error } = await supabase
 .from('courses')
 .select('course_sessions, course_name')
 .eq('id', courseId)
 .single();

 let sessions = 1; // Default to 1 session
 if (error || !course) {
 console.warn('Failed to fetch course data or course not found:', error);
 console.log('📚 Using default single lesson for demo/testing purposes');
 } else {
 sessions = course.course_sessions || 1;
 console.log(`📚 Generating navigation for ${sessions} lessons from database`);
 }

 // Restore the original 3 navigation items
 const navContainer = document.querySelector('.engine__nav-course');
 if (!navContainer) {
 console.warn('Navigation container not found');
 return;
 }

 // Restore original navigation structure
 navContainer.innerHTML = `
 <div class="nav-course__item nav-course__item--active" data-preview="outline">
 <img class="icon icon--base" src="/src/assets/icons/coursebuilder/navigation/navigation-toc.svg" alt="">
 <span class="icon-label">Outline</span>
 </div>
 <div class="nav-course__item" data-preview="preview">
 <img class="icon icon--base" src="/src/assets/icons/coursebuilder/navigation/navigation-thumbnail.svg" alt="">
 <span class="icon-label">Preview</span>
 </div>
 <div class="nav-course__item" data-preview="marks">
 <img class="icon icon--base" src="/src/assets/icons/coursebuilder/navigation/navigation-bookmark.svg" alt="">
 <span class="icon-label">Marks</span>
 </div>
 `;

 // Add click handlers for preview navigation
 navContainer.querySelectorAll('.nav-course__item').forEach(item => {
 item.addEventListener('click', (e) => {
 const target = e.currentTarget as HTMLElement;
 const previewType = target.dataset.preview;
 this.switchPreviewMode(previewType || 'outline');
 });
 });

 // Generate lesson navigation in the outline preview
 await this.generateOutlineContent(courseId, sessions);

 // Create multiple canvases for each lesson
 await this.createLessonCanvases(sessions);

 console.log(`✅ Generated navigation for ${sessions} lessons`);
 } catch (error) {
 console.error('❌ Failed to generate lesson navigation:', error);
 }
 }

 /**
 * Generate the lesson outline content in the preview area
 */
 private async generateOutlineContent(courseId: string, sessions: number): Promise<void> {
 const outlineContainer = document.querySelector('#preview-outline .outline-preview__content');
 if (!outlineContainer) {
 console.warn('Outline content container not found');
 return;
 }

 // Generate lesson navigation items for the outline
 const lessonHTML = Array.from({ length: sessions }, (_, index) => {
 const lessonNumber = index + 1;
 return `
 <div class="lesson-item" data-lesson="${lessonNumber}">
 <h4 class="lesson-title">Lesson ${lessonNumber}</h4>
 <div class="lesson-topics">
 <p>Lesson content and topics will be configured here</p>
 </div>
 <button class="button button--outline button--small switch-to-lesson" data-course="${courseId}" data-lesson="${lessonNumber}">
 Edit Lesson ${lessonNumber}
 </button>
 </div>
 `;
 }).join('');

 outlineContainer.innerHTML = `
 <div class="lessons-outline">
 ${lessonHTML}
 </div>
 `;

 // Add click handlers for lesson switching
 outlineContainer.querySelectorAll('.switch-to-lesson').forEach(button => {
 button.addEventListener('click', (e) => {
 const target = e.currentTarget as HTMLElement;
 const lessonNumber = parseInt(target.dataset.lesson || '1');
 const courseId = target.dataset.course || '';
 this.switchToLesson(courseId, lessonNumber);
 });
 });
 }

 /**
 * Switch between preview modes (outline, preview, marks)
 */
 private switchPreviewMode(previewType: string): void {
 // Update active navigation item
 document.querySelectorAll('.nav-course__item').forEach(item => {
 item.classList.remove('nav-course__item--active');
 });
 
 const activeItem = document.querySelector(`[data-preview="${previewType}"]`);
 if (activeItem) {
 activeItem.classList.add('nav-course__item--active');
 }

 // Show corresponding preview content
 document.querySelectorAll('.preview__content').forEach(content => {
 content.classList.remove('preview__content--active');
 });

 const targetContent = document.querySelector(`#preview-${previewType}`);
 if (targetContent) {
 targetContent.classList.add('preview__content--active');
 }

 console.log(`📋 Switched to ${previewType} preview mode`);
 }

 /**
 * Create multiple PIXI.js canvas elements for lessons in PDF-style layout
 */
 private async createLessonCanvases(sessionCount: number): Promise<void> {
 try {
 const canvasContainer = document.querySelector('#canvas-container');
 if (!canvasContainer) {
 console.error('❌ Canvas container not found');
 return;
 }

 // Clear existing canvases
 this.pixiCanvases.forEach(canvas => canvas.destroy());
 this.pixiCanvases = [];
 canvasContainer.innerHTML = '';

 console.log(`🎨 Creating ${sessionCount} PIXI.js lesson canvases...`);

 // Create PIXI.js applications for each lesson - PDF-like scrollable stack
 for (let i = 1; i <= sessionCount; i++) {
 // Create container for this lesson
 const lessonWrapper = document.createElement('div');
 lessonWrapper.className = 'lesson-wrapper';
 lessonWrapper.id = `lesson-wrapper-${i}`;
 lessonWrapper.style.cssText = `
   margin: 20px auto;
   text-align: center;
 `;
 
 // Add lesson label
 const lessonLabel = document.createElement('div');
 lessonLabel.className = 'lesson-label';
 lessonLabel.textContent = `Lesson ${i}`;
 lessonLabel.style.cssText = `
   font-weight: bold;
   color: var(--color-text-secondary);
   margin-bottom: 10px;
   font-size: 14px;
 `;
 
 // Create container for PIXI canvas
 const pixiContainer = document.createElement('div');
 pixiContainer.id = `lesson-canvas-${i}`;
 pixiContainer.className = 'lesson-canvas';
 pixiContainer.style.cssText = `
   width: 794px;
   height: 1123px;
   margin: 0 auto;
   background: white;
   border: 1px solid var(--color-neutral-300);
   border-radius: var(--radius-large);
   box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
 `;
 
 lessonWrapper.appendChild(lessonLabel);
 lessonWrapper.appendChild(pixiContainer);
 canvasContainer.appendChild(lessonWrapper);

        // Initialize PIXI canvas for this lesson
        const pixiCanvas = new PixiCanvas(`#lesson-canvas-${i}`);
        await pixiCanvas.init();
        
        // Initialize lesson template for this canvas
        const layoutContainer = pixiCanvas.getLayoutContainer();
        if (layoutContainer) {
            const canvasDimensions = pixiCanvas.getCanvasDimensions();
            const { LessonLayoutTemplate } = await import("./canvas/LessonLayoutTemplate");
            const lessonTemplate = new LessonLayoutTemplate(
                layoutContainer,
                canvasDimensions.width,
                canvasDimensions.height,
                i // Pass lesson number (1-indexed)
            );
            await lessonTemplate.initialize();
            
            // Check if this lesson needs additional canvases for overflow content
            if (lessonTemplate.hasMultiplePages()) {
                const pageCount = lessonTemplate.getPageCount();
                console.log(`📄 Lesson ${i} requires ${pageCount} pages - creating additional canvases`);
                
                // Set the main template to show only page 1 when there are multiple pages
                lessonTemplate.setSpecificPage(1);
                
                // Create additional HTML containers and canvases for each extra page
                for (let pageIndex = 2; pageIndex <= pageCount; pageIndex++) {
                    // Create additional PIXI container HTML element
                    const additionalPixiContainer = document.createElement('div');
                    additionalPixiContainer.id = `lesson-canvas-${i}-page-${pageIndex}`;
                    additionalPixiContainer.className = 'lesson-canvas';
                    additionalPixiContainer.style.cssText = `
                        width: 794px;
                        height: 1123px;
                        margin: 10px auto 0 auto;
                        background: white;
                        border: 1px solid var(--color-neutral-300);
                        border-radius: var(--radius-large);
                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                    `;
                    
                    // Add it to the same lesson wrapper
                    lessonWrapper.appendChild(additionalPixiContainer);
                    
                    // Create and initialize the additional PIXI canvas
                    const additionalPixiCanvas = new PixiCanvas(`#lesson-canvas-${i}-page-${pageIndex}`);
                    await additionalPixiCanvas.init();
                    
                    // Initialize lesson template for the additional canvas with specific page content
                    const additionalLayoutContainer = additionalPixiCanvas.getLayoutContainer();
                    if (additionalLayoutContainer) {
                        // Create a NEW lesson template instance for this additional canvas
                        // This will have the same content but we'll set it to show only the specific page
                        const additionalLessonTemplate = new LessonLayoutTemplate(
                            additionalLayoutContainer,
                            canvasDimensions.width,
                            canvasDimensions.height,
                            i // Same lesson number
                        );
                        
                        // Initialize it first to create all the content
                        await additionalLessonTemplate.initialize();
                        
                        // Then set it to show only the specific page
                        if (additionalLessonTemplate.hasMultiplePages()) {
                            additionalLessonTemplate.setSpecificPage(pageIndex);
                        }
                    }
                    
                    // Store the additional canvas
                    this.pixiCanvases.push(additionalPixiCanvas);
                    console.log(`🎨 Created additional PIXI.js canvas for Lesson ${i}, Page ${pageIndex}`);
                }
            }
        }
        
        // Store in the array
        this.pixiCanvases.push(pixiCanvas); console.log(`🎨 Created PIXI.js canvas for Lesson ${i}`);
 }

 console.log(`✅ Created ${sessionCount} PIXI.js lesson canvases`);
 
 // Expose first PIXI app globally for devtools detection
 if (this.pixiCanvases && this.pixiCanvases.length > 0) {
 const firstCanvas = this.pixiCanvases[0];
 const firstApp = firstCanvas.getApp();
 if (firstApp && typeof window !== 'undefined') {
 (window as any).__PIXI_APP__ = firstApp;
 (window as any).PIXI_APP = firstApp; // Alternative naming
 (window as any).__NEPTINO_PIXI_APPS__ = this.pixiCanvases.map(c => c.getApp()).filter(Boolean);
 console.log('🔧 PIXI apps exposed for devtools detection:', this.pixiCanvases.length, 'canvases');
 console.log('🔧 First PIXI app exposed as window.__PIXI_APP__');
 
 // Trigger devtools detection
 if ((window as any).__PIXI_DEVTOOLS_GLOBAL_HOOK__) {
 (window as any).__PIXI_DEVTOOLS_GLOBAL_HOOK__.register(firstApp);
 console.log('🔧 PIXI app registered with devtools hook');
 }
 }
 }
 
 // Initialize core managers now that PIXI canvases are ready
 if (!this.uiEventHandler && this.pixiCanvases.length > 0) {
 console.log('🎛️ Initializing core managers after PIXI canvases creation...');
 this.initializeCoreManagers();
 }
 } catch (error) {
 console.error('❌ Failed to create PIXI lesson canvases:', error);
 }
 }

 /**
 * Switch to a specific lesson canvas by scrolling to it
 */
 private async switchToLesson(_courseId: string, lessonNumber: number): Promise<void> {
 try {
 console.log(`🎯 Scrolling to Lesson ${lessonNumber}`);

 // Update active lesson item in outline
 document.querySelectorAll('.lesson-item').forEach(item => {
 item.classList.remove('lesson-item--active');
 });
 
 const activeLesson = document.querySelector(`[data-lesson="${lessonNumber}"].lesson-item`);
 if (activeLesson) {
 activeLesson.classList.add('lesson-item--active');
 }

 // Scroll to the target lesson canvas
 const targetCanvas = document.querySelector(`#lesson-canvas-${lessonNumber}`) as HTMLCanvasElement;
 if (targetCanvas) {
 // Smooth scroll to the canvas
 targetCanvas.scrollIntoView({ 
   behavior: 'smooth', 
   block: 'center' 
 });
 
 // Highlight the active canvas temporarily
 targetCanvas.style.boxShadow = '0 0 20px rgba(77, 166, 255, 0.5)';
 setTimeout(() => {
   targetCanvas.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
 }, 2000);
 
 console.log(`📸 Scrolled to canvas for Lesson ${lessonNumber}`);
 
 // Add lesson-specific content if canvas is empty
 const ctx = targetCanvas.getContext('2d');
 if (ctx) {
   // Check if canvas is empty (just clear it and redraw)
   ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
   ctx.fillStyle = '#f8f9fa';
   ctx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);
   ctx.fillStyle = '#4da6ff';
   ctx.fillRect(50, 50, 200, 100);
   ctx.fillStyle = '#2c3e50';
   ctx.font = '18px Arial';
   ctx.fillText(`Lesson ${lessonNumber} Canvas`, 60, 180);
 }
 } else {
 console.error(`❌ Canvas for Lesson ${lessonNumber} not found`);
 }

 console.log(`✅ Switched to Lesson ${lessonNumber}`);
 } catch (error) {
 console.error(`❌ Failed to switch to lesson ${lessonNumber}:`, error);
 }
 }

 /**
 * Initialize page setup handler for the course
 */
 private async initializePageSetupHandler(courseId: string): Promise<void> {
 try {
 const { pageSetupHandler } = await import('../backend/courses/pageSetupHandler');
 pageSetupHandler.setCourseId(courseId);
 console.log('📄 Page setup handler initialized for course:', courseId);
 
 // If canvas is available, load the margins
 if (this.pixiCanvases.length > 0) {
 await this.loadInitialPageLayout();
 }
 } catch (error) {
 this.errorBoundary.handleError(error as Error, 'initializePageSetupHandler');
 }
 }

 /**
 * Update the URL to include the course ID parameter
 */
 private updateUrlWithCourseId(courseId: string): void {
 try {
 const url = new URL(window.location.href);
 url.searchParams.set('courseId', courseId);
 window.history.replaceState({}, '', url.toString());
 } catch (error) {
 this.errorBoundary.handleError(error as Error, 'updateUrlWithCourseId');
 }
 }

 // ==========================================================================
 // KEYBOARD SHORTCUTS HANDLERS
 // ==========================================================================

 private handleSave(): void {
 try {
 console.log('💾 Save shortcut triggered');
 
 if (this.currentFormHandler) {
 // Trigger form save if available
 const form = document.querySelector(`#${this.currentSection}-form`) as HTMLFormElement;
 if (form) {
 form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
 }
 }
 
 // Show save feedback
 this.showNotification('Saving...', 'info');
 } catch (error) {
 this.errorBoundary.handleError(error as Error, 'handleSave');
 }
 }

 private handleUndo(): void {
 try {
 // Command manager not implemented yet
 console.log('⚠️ Undo not implemented - command manager not available');
 this.showNotification('Undo not implemented yet', 'info');
 } catch (error) {
 this.errorBoundary.handleError(error as Error, 'handleUndo');
 }
 }

 private handleRedo(): void {
 try {
 // Command manager not implemented yet
 console.log('⚠️ Redo not implemented - command manager not available');
 this.showNotification('Redo not implemented yet', 'info');
 } catch (error) {
 this.errorBoundary.handleError(error as Error, 'handleRedo');
 }
 }

 // ==========================================================================
 // FORM HANDLER ACCESS METHODS
 // ==========================================================================

 /**
 * Get the current form handler (useful for debugging or external access)
 */
 public getCurrentFormHandler(): CourseFormHandler | null {
 return this.currentFormHandler;
 }

 /**
 * Check if a form handler is active for the current section
 */
 public hasActiveFormHandler(): boolean {
 return this.currentFormHandler !== null;
 }

 // ==========================================================================
 // UTILITY METHODS
 // ==========================================================================

 private showNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
 try {
 console.log(`[Notification/${type}] ${message}`);
 // Could integrate with a toast notification system here
 } catch (error) {
 this.errorBoundary.handleError(error as Error, 'showNotification');
 }
 }

 // ==========================================================================
 // PUBLIC API METHODS
 // ==========================================================================

 /**
 * Get the current section
 */
 public getCurrentSection(): string {
 return this.currentSection;
 }

 /**
 * Get the first PIXI canvas (for backward compatibility)
 */
 public getPixiCanvas(): any {
 return this.pixiCanvases.length > 0 ? this.pixiCanvases[0] : null;
 }

 /**
 * Refresh course ID detection for all managers
 */
 public refreshCourseId(): void {
 try {
 const oldCourseId = this.courseId;
 this.getCourseId();
 
 // If course ID changed, update all managers
 if (this.courseId && this.courseId !== oldCourseId) {
 console.log('📋 Course ID updated from refresh:', this.courseId);
 this.setCourseId(this.courseId);
 }
 } catch (error) {
 this.errorBoundary.handleError(error as Error, 'refreshCourseId');
 }
 }

 /**
 * Get the course ID
 */
 public getCourseIdValue(): string | null {
 return this.courseId;
 }

 /**
 * Get initialization status
 */
 public isReady(): boolean {
 return this.isInitialized;
 }

 /**
 * Enable or disable keyboard shortcuts
 */
 public setKeyboardShortcuts(enabled: boolean): void {
 this.keyboardShortcutsEnabled = enabled;
 console.log(`⌨️ Keyboard shortcuts ${enabled ? 'enabled' : 'disabled'}`);
 }

 /**
 * Get manager instances for debugging
 */
 public getManagers() {
 return {
 toolStateManager: this.toolStateManager,
 uiEventHandler: this.uiEventHandler,
 commandManager: this.commandManager,
 marginSettingsManager: this.marginSettingsManager,
 pageManager: this.pageManager,
 mediaManager: this.mediaManager,
 fontManager: this.fontManager,
 scheduleManager: this.scheduleManager,
 curriculumManager: this.curriculumManager,
 currentFormHandler: this.currentFormHandler,
 selectHandler: this.selectHandler,
 deleteCourseManager: this.deleteCourseManager,
 };
 }

 // ==========================================================================
 // CLEANUP AND DISPOSAL
 // ==========================================================================

 /**
 * Cleanup method that properly destroys all components and handlers
 */
 public destroy(): void {
 try {
 console.log('🧹 Destroying CourseBuilder...');
 
 // Clean up form handler
 if (this.currentFormHandler) {
 if (typeof (this.currentFormHandler as any).destroy === 'function') {
 (this.currentFormHandler as any).destroy();
 }
 this.currentFormHandler = null;
 }

 // Clean up canvas
 if (this.pixiCanvases.length > 0) {
 this.pixiCanvases.forEach(canvas => canvas.destroy());
 this.pixiCanvases = [];
 }

 // Clean up managers
 if (this.commandManager) {
 this.commandManager.destroy();
 this.commandManager = null;
 }

 // Clean up course managers
 if (this.scheduleManager) {
 // Schedule manager doesn't have destroy method yet
 console.log('📅 Schedule manager cleanup - no destroy method available');
 this.scheduleManager = null;
 }

 if (this.curriculumManager) {
 // Curriculum manager doesn't have destroy method yet
 console.log('📚 Curriculum manager cleanup - no destroy method available');
 this.curriculumManager = null;
 }

 // Clean up select handler
 if (this.selectHandler) {
 // Select handler doesn't have destroy method yet
 console.log('📋 Select handler cleanup - no destroy method available');
 this.selectHandler = null;
 }

 // Clean up delete course manager
 if (this.deleteCourseManager) {
 this.deleteCourseManager.destroy();
 this.deleteCourseManager = null;
 }

 // Remove global reference
 if (typeof window !== 'undefined') {
 delete (window as any).courseBuilderCanvasInstance;
 }

 this.isInitialized = false;
 console.log('✅ CourseBuilderCanvas destroyed');
 } catch (error) {
 this.errorBoundary.handleError(error as Error, 'destroy');
 }
 }
}

// ==========================================================================
// AUTO-INITIALIZATION
// ==========================================================================

// ==========================================================================
// ADAPTIVE SEARCH AND PREVIEW FUNCTIONALITY
// ==========================================================================

/**
 * Manages adaptive search placeholders and preview instances
 */
class AdaptiveSearchManager {
  private searchInput: HTMLInputElement | null = null;
  private mediaItems: NodeListOf<Element> | null = null;
  private navCourseItems: NodeListOf<Element> | null = null;
  private previewContainers: NodeListOf<Element> | null = null;
  
  private placeholders: { [key: string]: string } = {
    'video': 'Search video content...',
    'audio': 'Search audio files...',
    'image': 'Search images...',
    'text': 'Search text content...',
    'quiz': 'Search quiz questions...',
    'document': 'Search documents...',
    'default': 'Search media...'
  };

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    // Get DOM elements
    this.searchInput = document.getElementById('engine__search') as HTMLInputElement;
    this.mediaItems = document.querySelectorAll('.media__item');
    this.navCourseItems = document.querySelectorAll('.nav-course__item');
    this.previewContainers = document.querySelectorAll('[id^="preview-"]');

    if (this.searchInput && this.mediaItems.length > 0) {
      this.setupMediaItemListeners();
    }

    if (this.navCourseItems.length > 0) {
      this.setupNavCourseListeners();
      // Show the first preview by default (since first nav item is already selected)
      this.initializeDefaultPreview();
    }
  }

  private initializeDefaultPreview(): void {
    // Find the first nav-course item that's already active
    const activeNavItem = document.querySelector('.nav-course__item.active') as HTMLElement;
    if (activeNavItem) {
      const previewId = activeNavItem.getAttribute('data-preview');
      if (previewId) {
        this.showPreview(previewId);
      }
    } else if (this.navCourseItems && this.navCourseItems.length > 0) {
      // If no active item, use the first one
      const firstNavItem = this.navCourseItems[0] as HTMLElement;
      const previewId = firstNavItem.getAttribute('data-preview');
      if (previewId) {
        firstNavItem.classList.add('active');
        this.showPreview(previewId);
      }
    }
  }

  private setupMediaItemListeners(): void {
    this.mediaItems?.forEach(item => {
      item.addEventListener('click', () => {
        const mediaType = item.getAttribute('data-media-type') || 'default';
        this.updateSearchPlaceholder(mediaType);
        
        // Add active class to clicked item
        this.mediaItems?.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
      });
    });
  }

  private setupNavCourseListeners(): void {
    this.navCourseItems?.forEach(item => {
      item.addEventListener('click', () => {
        const previewId = item.getAttribute('data-preview');
        if (previewId) {
          this.showPreview(previewId);
          
          // Add active class to clicked item
          this.navCourseItems?.forEach(i => i.classList.remove('active'));
          item.classList.add('active');
        }
      });
    });
  }

  private updateSearchPlaceholder(mediaType: string): void {
    if (this.searchInput) {
      const placeholder = this.placeholders[mediaType] || this.placeholders['default'];
      this.searchInput.setAttribute('placeholder', placeholder);
    }
  }

  private showPreview(previewId: string): void {
    // Hide all preview containers
    this.previewContainers?.forEach(container => {
      container.classList.remove('active');
    });

    // Show the selected preview container
    const targetPreview = document.getElementById(`preview-${previewId}`);
    if (targetPreview) {
      targetPreview.classList.add('active');
      
      // If this is the outline preview, fetch curriculum data
      if (previewId === 'outline') {
        this.loadCurriculumData(targetPreview);
      }
    }
  }

  private async loadCurriculumData(previewContainer: Element): Promise<void> {
    try {
      // Get the actual curriculum data from the CurriculumManager
      const courseBuilderInstance = (window as any).courseBuilderCanvasInstance;
      if (courseBuilderInstance && courseBuilderInstance.curriculumManager) {
        const curriculumData = courseBuilderInstance.curriculumManager.getCurrentCurriculum();
        
        if (curriculumData && curriculumData.length > 0) {
          this.renderCurriculumOutline(previewContainer, { lessons: curriculumData });
        } else {
          // No curriculum data available
          previewContainer.innerHTML = '<p class="no-curriculum">No curriculum available for this course yet.</p>';
        }
      } else {
        // Fallback when CurriculumManager is not available
        previewContainer.innerHTML = '<p class="loading">Loading curriculum...</p>';
      }
    } catch (error) {
      console.error('Failed to load curriculum data:', error);
      previewContainer.innerHTML = '<p class="error">Failed to load curriculum outline</p>';
    }
  }

  private renderCurriculumOutline(container: Element, data: any): void {
    const outlineHTML = data.lessons.map((lesson: any) => `
      <div class="lesson">
        <h4>${lesson.title}</h4>
        <ul class="topics">
          ${lesson.topics.map((topic: any) => `<li>${topic.title || topic}</li>`).join('')}
        </ul>
      </div>
    `).join('');

    container.innerHTML = `
      <div class="outline-preview">
   
        ${outlineHTML}
      </div>
    `;
  }
}

// Auto-initialize when DOM is ready and we're on coursebuilder page
document.addEventListener("DOMContentLoaded", () => {
 try {
 // Check if we're on a coursebuilder page
 const isCourseBuilderPage = window.location.pathname.includes('coursebuilder') || 
 document.querySelector('.coursebuilder') ||
 document.querySelector('#canvas-container');
 
 if (isCourseBuilderPage) {
 console.log('🎨 CourseBuilderCanvas page detected, initializing...');
 new CourseBuilderCanvas();
 
 // Initialize adaptive search and preview functionality
 console.log('🔍 Initializing adaptive search and preview system...');
 new AdaptiveSearchManager();
 }
 } catch (error) {
 console.error('❌ Failed to auto-initialize CourseBuilderCanvas:', error);
 }
});

// Export for manual initialization
