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
 private pixiCanvas: PixiCanvas | null = null;
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
 
 // Initialize all other managers
 this.initializeAllManagers();
 
 this.isInitialized = true;
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
 // Only initialize canvas for sections that need it
 if (this.currentSection === "create" || this.shouldInitializeCanvas()) {
 await this.initializeCanvas();
 }
 
 // Initialize section-specific handlers
 this.initializeSectionHandler(this.currentSection);
 } catch (error) {
 this.errorBoundary.handleError(error as Error, 'initializeBasedOnSection');
 }
 }

 private shouldInitializeCanvas(): boolean {
 // Define which sections need the canvas
 const canvasSections = ["create", "edit", "design"];
 return canvasSections.includes(this.currentSection);
 }

 private async initializeCanvas(): Promise<void> {
 try {
 this.performanceMonitor.start('canvas-init');
 
 const canvasContainer = document.getElementById("canvas-container");
 if (!canvasContainer) {
 console.warn('⚠️ Canvas container not found - skipping canvas initialization');
 return;
 }

 console.log('🎨 Initializing PIXI Canvas...');
 this.pixiCanvas = new PixiCanvas("#canvas-container");
 await this.pixiCanvas.init();
 
 // Initialize core managers now that canvas is available
 if (!this.uiEventHandler) {
 console.log('🎛️ Initializing core managers after canvas creation...');
 this.initializeCoreManagers();
 }
 
 this.performanceMonitor.end('canvas-init');
 console.log('✅ PIXI Canvas initialized');
 } catch (error) {
 this.errorBoundary.handleError(error as Error, 'canvas-init');
 throw error; // Canvas is critical, so rethrow
 }
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
 if (this.pixiCanvas) {
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
 
 // Connect UI tool selection to canvas tool activation
 this.uiEventHandler.setOnToolChange((toolName: string) => {
 if (this.pixiCanvas) {
 console.log(`🔧 Activating tool: ${toolName}`);
 const success = this.pixiCanvas.setTool(toolName);
 if (!success) {
 console.warn(`⚠️ Failed to activate tool: ${toolName}`);
 }
 } else {
 console.warn('⚠️ Cannot activate tool: PixiJS canvas not available');
 }
 });
 
 // Connect UI color changes to canvas
 this.uiEventHandler.setOnColorChange((color: string) => {
 if (this.pixiCanvas) {
 console.log(`🎨 Updating tool color: ${color}`);
 this.pixiCanvas.updateToolColor(color);
 }
 });

 // Connect UI tool settings changes to canvas
 this.uiEventHandler.setOnToolSettingsChange((toolName: string, settings: any) => {
 if (this.pixiCanvas) {
 console.log(`⚙️ Updating tool settings for ${toolName}:`, settings);
 this.pixiCanvas.updateToolSettings(toolName, settings);
 }
 });
 
 // Stub implementations for managers that don't exist yet
 console.log('⚠️ Using stub implementations for missing managers');
 
 console.log('✅ Core managers initialized');
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
 if ((sectionId === "create" || this.shouldInitializeCanvas()) && !this.pixiCanvas) {
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
 
 // Update URL to include course ID parameter
 this.updateUrlWithCourseId(courseId);
 
 console.log('✅ Course ID updated for all managers');
 } catch (error) {
 this.errorBoundary.handleError(error as Error, 'setCourseId');
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
 * Get PIXI canvas instance
 */
 public getPixiCanvas(): PixiCanvas | null {
 return this.pixiCanvas;
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
 if (this.pixiCanvas) {
 this.pixiCanvas.destroy();
 this.pixiCanvas = null;
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
