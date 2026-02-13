/**
 * CurriculumPageBridge - Connects existing curriculum canvas system to PageManager
 * 
 * This bridge:
 * 1. Listens for curriculum-canvases-ready event
 * 2. Fetches canvas data from Supabase
 * 3. Creates PageMetadata for each canvas
 * 4. Initializes PageManager with populated headers/footers
 */

import { PageManager } from "../coursebuilder/layout/pages/PageManager";
import type { PageMetadata } from "../coursebuilder/layout/pages/PageMetadata";
import { canvasEngine } from "../coursebuilder/canvas/CanvasEngine";
import { canvasMarginManager, canvasDimensionManager } from "../coursebuilder/layout/CanvasConfigManager";
import { supabase } from "../backend/supabase";
import {
  CanvasDataAccessor,
  type CourseInfo,
  type CurriculumCanvas,
} from "./utils/CanvasDataAccessor";
import { DataNormalizer } from "./utils/DataNormalizer";

type CanvasScrollNavInstance = {
  setTotalCanvases(total: number): void;
  setCurrentCanvas(canvasNumber: number): void;
  setOnNavigate(callback: (canvasIndex: number) => void): void;
};

type LessonScheduleEntry = {
  date?: string;
  startTime?: string;
  endTime?: string;
  day?: string;
};

export class CurriculumPageBridge {
  private pageManager: PageManager | null = null;
  private isInitialized = false;
  private currentCourseId: string | null = null;
  private courseInfo: CourseInfo | null = null;
  private lessonSchedule = new Map<number, LessonScheduleEntry>();
  private canvasScrollNav: CanvasScrollNavInstance | null = null;
  private canvasScrollNavReadyListener: ((event: Event) => void) | null = null;
  private handleCurriculumResetListener: EventListener;
  private currentPageData: PageMetadata[] = [];
  private dimensionUnsubscribe: (() => void) | null = null;
  private marginUnsubscribe: (() => void) | null = null;
  private rebuildingPages = false;

  constructor() {
    this.init();
    this.dimensionUnsubscribe = canvasDimensionManager.onChange(() => this.handleDimensionChange());
    this.marginUnsubscribe = canvasMarginManager.onChange((margins) => this.handleMarginChange(margins));
    this.handleCurriculumResetListener = this.handleCurriculumResetEvent.bind(this);
    document.addEventListener('curriculum-reset', this.handleCurriculumResetListener);
  }

  private init(): void {
    // Listen for curriculum canvases ready event
    document.addEventListener('curriculum-canvases-ready', (event: Event) => {
      const customEvent = event as CustomEvent<{ 
        courseId: string;
        canvasCount: number;
        inserts: number;
        updates: number;
      }>;
      console.log('📢 Curriculum canvases ready event received:', customEvent.detail);
      this.handleCanvasesReady(customEvent.detail.courseId);
    });

    console.log('🌉 CurriculumPageBridge initialized and listening for canvases');
  }

  private handleDimensionChange(): void {
    if (!this.currentPageData.length || this.rebuildingPages) {
      return;
    }

    this.rebuildingPages = true;
    void this.initializePageManager(this.currentPageData).finally(() => {
      this.rebuildingPages = false;
    });
  }

  private handleMarginChange(margins: { top: number; right: number; bottom: number; left: number }): void {
    if (!this.pageManager || !this.isInitialized) {
      return;
    }

    this.pageManager.updateMargins(margins);
  }

  /**
   * Load course information from database
   */
  private async loadCourseInfo(courseId: string): Promise<void> {
    try {
      console.log('[CurriculumPageBridge] Loading course info for:', courseId);
      
      const { data: course, error } = await supabase
        .from('courses')
        .select('id, course_name, course_description, course_language, schedule_settings, institution, teacher_id')
        .eq('id', courseId)
        .single();

      if (error) {
        console.error('[CurriculumPageBridge] Error loading course:', error);
        return;
      }

      if (course) {
        const teacherName = await this.loadTeacherName(course.teacher_id ?? null);
        this.courseInfo = {
          id: course.id,
          course_name: course.course_name ?? 'Untitled Course',
          course_description: course.course_description,
          course_language: course.course_language,
          schedule_settings: course.schedule_settings,
          institution: course.institution ?? null,
          teacher_id: course.teacher_id ?? null,
          teacherName,
        };
        this.lessonSchedule = this.buildLessonSchedule(course.schedule_settings);
        console.log('[CurriculumPageBridge] Course info loaded:', course);
      }
    } catch (err) {
      console.error('[CurriculumPageBridge] Exception loading course:', err);
    }
  }

  private buildLessonSchedule(scheduleSettings: unknown): Map<number, LessonScheduleEntry> {
    const scheduleMap = new Map<number, LessonScheduleEntry>();

    if (!Array.isArray(scheduleSettings)) {
      return scheduleMap;
    }

    scheduleSettings.forEach((entry) => {
      if (!entry || typeof entry !== 'object') {
        return;
      }

      const record = entry as Record<string, unknown>;
      const lessonNumber = typeof record.lessonNumber === 'number' ? record.lessonNumber : undefined;
      if (!lessonNumber || lessonNumber <= 0) {
        return;
      }

      const scheduleEntry: LessonScheduleEntry = {};
      if (typeof record.date === 'string') {
        scheduleEntry.date = record.date;
      }
      if (typeof record.startTime === 'string') {
        scheduleEntry.startTime = record.startTime;
      }
      if (typeof record.endTime === 'string') {
        scheduleEntry.endTime = record.endTime;
      }
      if (typeof record.day === 'string') {
        scheduleEntry.day = record.day;
      }

      scheduleMap.set(lessonNumber, scheduleEntry);
    });

    return scheduleMap;
  }

  private async loadTeacherName(teacherId: string | null): Promise<string | null> {
    if (!teacherId) {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('first_name, last_name, email')
        .eq('id', teacherId)
        .single();

      if (error || !data) {
        return null;
      }

      const combined = [data.first_name, data.last_name]
        .filter((part: string | null | undefined) => typeof part === 'string' && part.trim().length)
        .map((part: string) => part.trim())
        .join(' ');

      if (combined.length) {
        return combined;
      }

      if (typeof data.email === 'string' && data.email.includes('@')) {
        return data.email.split('@')[0];
      }

      return null;
    } catch (error) {
      console.warn('[CurriculumPageBridge] Failed to load teacher name:', error);
      return null;
    }
  }

  /**
   * Handle curriculum canvases ready event - fetch canvas data from Supabase
   */
  private async handleCanvasesReady(courseId: string): Promise<void> {
    console.log(`🎨 Fetching canvas data for course ${courseId}...`);
    this.currentCourseId = courseId;

    try {
      // Load course info first
      await this.loadCourseInfo(courseId);

      // Fetch all canvases for this course from Supabase
      const { data: canvases, error } = await supabase
        .from('canvases')
        .select('*')
        .eq('course_id', courseId)
        .order('lesson_number', { ascending: true })
        .order('canvas_index', { ascending: true });

      if (error) {
        console.error('❌ Failed to fetch canvases from Supabase:', error);
        return;
      }

      if (!canvases || canvases.length === 0) {
        console.warn('⚠️ No canvases found for course:', courseId);
        this.currentPageData = [];
        return;
      }

      console.log(`✅ Fetched ${canvases.length} canvases from Supabase`);

      // Convert canvas data to page metadata
      const pageData = this.convertCanvasesToPageData(canvases as CurriculumCanvas[]);

      console.log(`📄 Converted to ${pageData.length} page metadata entries`);

      this.currentPageData = pageData;

      // Initialize page manager with canvas engine viewport
      await this.initializePageManager(pageData);
    } catch (error) {
      console.error('❌ Error in handleCanvasesReady:', error);
    }
  }

  private convertCanvasesToPageData(canvases: CurriculumCanvas[]): PageMetadata[] {
    return canvases.map((canvas, index) => {
      const accessor = new CanvasDataAccessor(canvas, this.courseInfo);
      const canvasIndex = typeof canvas.canvas_index === "number" ? canvas.canvas_index : index + 1;
      const copyrightValue = this.generateCopyrightValue(
        accessor.explicitCopyright,
        accessor.teacherName,
        accessor.institutionName,
        accessor.courseTitle,
      );

      const metadata: PageMetadata = {
        pageNumber: index + 1,
        totalPages: canvases.length,
        lessonNumber: accessor.lessonNumber,
        lessonTitle: accessor.lessonTitle,
        moduleNumber: accessor.moduleNumber,
        courseName: accessor.courseTitle,
        courseCode: accessor.courseCode,
        canvasId: canvas.id,
        date: this.resolveLessonDate(
          accessor.lessonNumber,
          accessor.rawCanvasData,
          accessor.rawCanvasMeta,
          canvas,
        ),
        method: accessor.method,
        socialForm: accessor.socialForm,
        duration: accessor.duration,
        instructor: accessor.teacherName ?? "Instructor",
        topic: accessor.getTopicValue(canvasIndex),
        canvasIndex,
        canvasType: accessor.canvasType ?? null,
        copyright: copyrightValue,
        templateInfo: accessor.templateInfo,
        layout: accessor.layout,
        moduleTitle: accessor.moduleTitle ?? null,
        institutionName: accessor.institutionName ?? null,
        teacherName: accessor.teacherName ?? null,
        structure: accessor.structureSummary,
      };

      if (!metadata.moduleTitle && accessor.moduleNumber) {
        metadata.moduleTitle = `Module ${accessor.moduleNumber}`;
      }

      return metadata;
    });
  }

  private resolveLessonDate(
    lessonNumber: number,
    canvasData: CurriculumCanvas["canvas_data"],
    canvasMeta: CurriculumCanvas["canvas_metadata"],
    canvasRecord: CurriculumCanvas,
  ): string {
    const scheduleEntry = this.lessonSchedule.get(lessonNumber);
    const lessonDetails = (canvasData?.lesson ?? null) as Record<string, unknown> | null;
    const lessonDate =
      lessonDetails && typeof lessonDetails.date === "string" ? (lessonDetails.date as string) : null;
    const scheduledDate =
      lessonDetails && typeof lessonDetails.scheduledDate === "string"
        ? (lessonDetails.scheduledDate as string)
        : null;

    const candidates: Array<string | null | undefined> = [
      this.combineDateAndTime(scheduleEntry),
      lessonDate,
      scheduledDate,
      typeof canvasMeta?.generatedAt === "string" ? canvasMeta.generatedAt : null,
      typeof canvasRecord.created_at === "string" ? canvasRecord.created_at : null,
    ];

    for (const candidate of candidates) {
      if (candidate && DataNormalizer.isValidDate(candidate)) {
        return DataNormalizer.date(candidate);
      }
    }

    return DataNormalizer.date(new Date().toISOString());
  }

  private combineDateAndTime(schedule?: LessonScheduleEntry): string | null {
    if (!schedule || !schedule.date || typeof schedule.date !== "string") {
      return null;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(schedule.date)) {
      return schedule.date;
    }

    const normalizedTime =
      typeof schedule.startTime === "string" && /^\d{1,2}:\d{2}/.test(schedule.startTime)
        ? schedule.startTime
        : "12:00";

    const isoCandidate = `${schedule.date}T${normalizedTime.padStart(5, "0")}:00Z`;
    return isoCandidate;
  }

  private generateCopyrightValue(
    explicit: string | null,
    teacherName: string | null,
    institutionName: string | null,
    courseTitle: string | null,
  ): string {
    if (explicit) {
      return explicit;
    }
    const owner =
      DataNormalizer.resolveString(
        teacherName,
        institutionName,
        courseTitle,
        this.courseInfo?.course_name,
        "Neptino",
      ) ?? "Neptino";
    const year = new Date().getFullYear();
    return `© ${year} ${owner}`;
  }

  private async initializePageManager(pageData: PageMetadata[]): Promise<void> {
    if (this.isInitialized) {
      console.warn('⚠️ PageManager already initialized, destroying old instance');
      this.pageManager?.destroy();
    }

    // Wait for canvas engine to be ready
    await new Promise<void>((resolve) => {
      canvasEngine.onReady(() => resolve());
    });

    const viewport = canvasEngine.getViewport();
    if (!viewport) {
      console.error('❌ Viewport not found, cannot initialize PageManager');
      return;
    }

    // Hide the single-canvas layout overlay so it doesn't tint the first page
    canvasEngine.setLayoutVisibility(false);

    // Get current margins
    const margins = canvasMarginManager.getMargins();
    const dimensions = canvasDimensionManager.getState();

    // Create page manager
    this.pageManager = new PageManager({
      viewport,
      pageData,
      margins,
      pageDimensions: {
        width: dimensions.width,
        height: dimensions.height,
      },
      showDebugBorders: false, // Set to true for debugging
      onPageChange: (index) => this.handlePageChange(index),
      onTotalHeightChange: (totalHeight) => canvasEngine.setWorldSize({ height: totalHeight }),
    });

    canvasEngine.resetUserInteractionState();

    this.isInitialized = true;

    this.setupScrollNavigation(pageData.length);

    // Setup window API for debugging
    this.setupWindowAPI();

    console.log('✅ PageManager initialized with curriculum data');
    console.log(`📄 Total pages: ${this.pageManager.getTotalPages()}`);
    console.log(`📍 Current page: ${this.pageManager.getCurrentPageIndex() + 1}`);
  }

  private setupWindowAPI(): void {
    if (!this.pageManager) return;

    try {
      (window as any).curriculumPageBridge = {
        pageManager: this.pageManager,
        goToPage: (index: number) => this.pageManager?.goToPage(index),
        nextPage: () => this.pageManager?.nextPage(),
        previousPage: () => this.pageManager?.previousPage(),
        getCurrentPage: () => this.pageManager?.getCurrentPageIndex(),
        getTotalPages: () => this.pageManager?.getTotalPages(),
        getCurrentPageContainer: () => this.pageManager?.getCurrentPage(),
        getPage: (index: number) => this.pageManager?.getPage(index),
        getAllMetadata: () => this.pageManager?.getAllMetadata(),
      };

      console.log('🪟 Window API available: window.curriculumPageBridge');
    } catch (error) {
      console.warn('Failed to setup window API:', error);
    }
  }

  private handlePageChange(index: number): void {
    if (this.canvasScrollNav) {
      this.canvasScrollNav.setCurrentCanvas(index + 1);
    }
  }

  private resolveCanvasScrollNav(): CanvasScrollNavInstance | null {
    if (typeof window === 'undefined') {
      return null;
    }

    const nav = (window as any).canvasScrollNav;
    if (
      nav &&
      typeof nav.setTotalCanvases === 'function' &&
      typeof nav.setCurrentCanvas === 'function' &&
      typeof nav.setOnNavigate === 'function'
    ) {
      return nav as CanvasScrollNavInstance;
    }

    return null;
  }

  private setupScrollNavigation(totalPages: number): void {
    if (typeof window === 'undefined') {
      return;
    }

    if (this.canvasScrollNavReadyListener) {
      window.removeEventListener('canvas-scroll-nav-ready', this.canvasScrollNavReadyListener as EventListener);
      this.canvasScrollNavReadyListener = null;
    }

    const applyNavConfig = (nav: CanvasScrollNavInstance): void => {
      this.canvasScrollNav = nav;
      nav.setTotalCanvases(totalPages);
      nav.setCurrentCanvas((this.pageManager?.getCurrentPageIndex() ?? 0) + 1);
      nav.setOnNavigate((canvasIndex) => {
        this.pageManager?.goToPage(canvasIndex);
      });
    };

    const existingNav = this.resolveCanvasScrollNav();
    if (existingNav) {
      applyNavConfig(existingNav);
      return;
    }

    const listener = (event: Event): void => {
      const detail = (event as CustomEvent<{ instance?: CanvasScrollNavInstance }>).detail;
      const nav = detail?.instance ?? this.resolveCanvasScrollNav();
      if (!nav) {
        return;
      }

      applyNavConfig(nav);
      if (this.canvasScrollNavReadyListener) {
        window.removeEventListener('canvas-scroll-nav-ready', this.canvasScrollNavReadyListener as EventListener);
        this.canvasScrollNavReadyListener = null;
      }
    };

    this.canvasScrollNavReadyListener = listener;
    window.addEventListener('canvas-scroll-nav-ready', listener as EventListener);
  }

  private teardownScrollNavigation(): void {
    if (typeof window === 'undefined') {
      return;
    }

    if (this.canvasScrollNavReadyListener) {
      window.removeEventListener('canvas-scroll-nav-ready', this.canvasScrollNavReadyListener as EventListener);
      this.canvasScrollNavReadyListener = null;
    }

    if (this.canvasScrollNav) {
      this.canvasScrollNav.setOnNavigate(() => {});
      this.canvasScrollNav = null;
    }
  }

  public destroy(): void {
    this.dimensionUnsubscribe?.();
    this.dimensionUnsubscribe = null;
    this.marginUnsubscribe?.();
    this.marginUnsubscribe = null;
    this.resetCanvasDisplay("bridge-destroyed");
    document.removeEventListener('curriculum-reset', this.handleCurriculumResetListener);
    console.log('🧹 CurriculumPageBridge destroyed');
  }
  
  private handleCurriculumResetEvent(event: Event): void {
    const detail = (event as CustomEvent<{ courseId?: string; reason?: string }>).detail;
    if (this.currentCourseId && detail?.courseId && detail.courseId !== this.currentCourseId) {
      return;
    }
    if (!this.currentCourseId && detail?.courseId) {
      this.currentCourseId = detail.courseId;
    }
    this.resetCanvasDisplay(detail?.reason);
  }

  private resetCanvasDisplay(reason?: string): void {
    if (this.pageManager) {
      this.pageManager.destroy();
      this.pageManager = null;
    }
    this.teardownScrollNavigation();
    this.isInitialized = false;
    canvasEngine.resetWorldSize();
    canvasEngine.setLayoutVisibility(true);
    console.log(`🧼 Canvas cleared${reason ? ` due to ${reason}` : ""}.`);
  }
}

// Auto-initialize
if (typeof window !== 'undefined') {
  const bridge = new CurriculumPageBridge();
  (window as any).curriculumPageBridge = bridge;
}
