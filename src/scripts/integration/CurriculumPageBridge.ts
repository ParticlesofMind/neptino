/**
 * CurriculumPageBridge - Connects existing curriculum canvas system to PageManager
 * 
 * This bridge:
 * 1. Listens for curriculum-canvases-ready event
 * 2. Fetches canvas data from Supabase
 * 3. Creates PageMetadata for each canvas
 * 4. Initializes PageManager with populated headers/footers
 */

import { PageManager } from "../coursebuilder/pages/PageManager";
import type {
  PageMetadata,
  MethodType,
  SocialFormType,
  LayoutNode,
  TemplateSummary,
} from "../coursebuilder/pages/PageMetadata";
import { canvasEngine } from "../coursebuilder/CanvasEngine";
import { canvasMarginManager } from "../coursebuilder/layout/CanvasMarginManager";
import { canvasDimensionManager } from "../coursebuilder/layout/CanvasDimensionManager";
import { supabase } from "../backend/supabase";

type CanvasScrollNavInstance = {
  setTotalCanvases(total: number): void;
  setCurrentCanvas(canvasNumber: number): void;
  setOnNavigate(callback: (canvasIndex: number) => void): void;
};

interface CurriculumCanvas {
  id: string;
  course_id: string;
  lesson_number: number;
  canvas_index: number;
  canvas_data?: {
    lesson?: {
      number?: number;
      title?: string;
      moduleNumber?: number;
    };
    template?: {
      name?: string;
      type?: string;
      method?: string;
      socialForm?: string;
      duration?: number;
      id?: string;
      slug?: string;
      scope?: string;
      description?: string | null;
    };
    dimensions?: {
      width?: number;
      height?: number;
    };
    margins?: {
      top?: number;
      right?: number;
      bottom?: number;
      left?: number;
      unit?: string;
    };
    layout?: LayoutNode;
    structure?: Record<string, unknown>;
  };
  canvas_metadata?: {
    title?: string;
    lessonNumber?: number;
    moduleNumber?: number;
    generatedAt?: string;
    template?: {
      name?: string;
      type?: string;
      method?: string;
      socialForm?: string;
      duration?: number;
      id?: string;
      slug?: string;
      scope?: string;
      description?: string | null;
    };
    canvasType?: string;
    // Merged from lesson_data
    courseId?: string | null;
    courseTitle?: string | null;
    courseCode?: string | null;
    institutionName?: string | null;
    teacherName?: string | null;
    lessonTitle?: string | null;
    moduleTitle?: string | null;
    templateId?: string | null;
    templateName?: string | null;
    templateType?: string | null;
    layout?: LayoutNode;
    structure?: Record<string, unknown>;
  };
  created_at?: string;
  updated_at?: string;
}

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
  private courseInfo: {
    id: string;
    course_name: string;
    course_description?: string;
    course_language?: string;
    schedule_settings?: unknown;
    institution?: string | null;
    teacher_id?: string | null;
    teacherName?: string | null;
  } | null = null;
  private lessonSchedule = new Map<number, LessonScheduleEntry>();
  private canvasScrollNav: CanvasScrollNavInstance | null = null;
  private canvasScrollNavReadyListener: ((event: Event) => void) | null = null;
  private handleCurriculumResetListener: EventListener;
  private currentPageData: PageMetadata[] = [];
  private dimensionUnsubscribe: (() => void) | null = null;
  private rebuildingPages = false;

  constructor() {
    this.init();
    this.dimensionUnsubscribe = canvasDimensionManager.onChange(() => this.handleDimensionChange());
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
    const pageData: PageMetadata[] = [];

    canvases.forEach((canvas, index) => {
      const canvasData = canvas.canvas_data;
      const canvasMeta = canvas.canvas_metadata;

      // Extract lesson info
      const lessonNumber = canvasData?.lesson?.number ?? canvasMeta?.lessonNumber ?? 1;
      const lessonTitle = canvasData?.lesson?.title ?? canvasMeta?.lessonTitle ?? `Lesson ${lessonNumber}`;
      const moduleNumber = canvasData?.lesson?.moduleNumber ?? canvasMeta?.moduleNumber;
      const canvasIndex = typeof canvas.canvas_index === "number" ? canvas.canvas_index : index + 1;
      const moduleTitle = this.resolveString(
        canvasMeta?.moduleTitle,
        (canvasData?.lesson as any)?.moduleTitle,
        moduleNumber ? `Module ${moduleNumber}` : null,
      );

      // Extract template info
      const template = canvasData?.template ?? canvasMeta?.template;
      const method = this.normalizeMethod(template?.method);
      const socialForm = this.normalizeSocialForm(template?.socialForm);
      const duration = template?.duration ?? 50;
      const templateInfo = (template as TemplateSummary | undefined) ?? null;
      const layout = this.normalizeLayoutNode(canvasData?.layout ?? canvasMeta?.layout);
      const courseTitle =
        this.resolveString(canvasMeta?.courseTitle, (canvasData?.lesson as any)?.courseTitle, this.courseInfo?.course_name) ??
        "Course Name";
      const courseCode =
        this.resolveString(canvasMeta?.courseCode, (canvasData?.lesson as any)?.courseCode, this.courseInfo?.id) ??
        "COURSE-101";
      const institutionName = this.resolveString(
        canvasMeta?.institutionName,
        (canvasData?.lesson as any)?.institutionName,
        this.courseInfo?.institution,
      );
      const teacherName = this.resolveString(
        canvasMeta?.teacherName,
        (canvasData?.lesson as any)?.teacherName,
        this.courseInfo?.teacherName,
      );
      const canvasType = this.resolveString(
        canvasMeta?.canvasType,
        canvasMeta?.canvasType,
        template?.type,
      );
      const structureSummary = this.normalizeStructureSummary(
        (canvasMeta?.structure as any) ?? (canvasData?.structure as any) ?? null,
      );
      const canvasTitle =
        canvasMeta?.title ??
        (typeof template?.name === "string" ? template.name : null) ??
        `${lessonTitle} - Canvas ${canvasIndex}`;
      const combinedTopicBase = canvasTitle ?? `${lessonTitle} - Canvas ${canvasIndex}`;
      const topicValue = moduleTitle
        ? `${moduleTitle} · ${combinedTopicBase}`
        : moduleNumber
        ? `Module ${moduleNumber} - ${combinedTopicBase}`
        : combinedTopicBase;

      const explicitCopyright = this.resolveString(
        this.extractString(canvasMeta, "copyright"),
        this.extractString(canvasMeta?.template, "copyright"),
        this.extractString(canvasData, "copyright"),
        this.extractString(canvasData?.lesson, "copyright"),
        this.extractString(canvasData?.template, "copyright"),
      );
      const copyrightValue = this.generateCopyrightValue(
        explicitCopyright,
        teacherName,
        institutionName,
        courseTitle,
      );

      // Build page metadata
      const metadata: PageMetadata = {
        pageNumber: index + 1,
        totalPages: canvases.length,
        lessonNumber,
        lessonTitle,
        moduleNumber: typeof moduleNumber === "number" ? moduleNumber : null,
        courseName: courseTitle,
        courseCode,
        canvasId: canvas.id,
        date: this.resolveLessonDate(lessonNumber, canvasData, canvasMeta, canvas),
        method,
        socialForm,
        duration,
        instructor: teacherName ?? "Instructor",
        topic: topicValue,
        canvasIndex,
        canvasType: canvasType ?? null,
        copyright: copyrightValue,
        templateInfo,
        layout,
        moduleTitle: moduleTitle ?? null,
        institutionName: institutionName ?? null,
        teacherName: teacherName ?? null,
        structure: structureSummary,
      };

      // Ensure module title fallback if unavailable
      if (!metadata.moduleTitle && moduleNumber) {
        metadata.moduleTitle = `Module ${moduleNumber}`;
      }

      pageData.push(metadata);
    });

    return pageData;
  }

  private normalizeStructureSummary(input: unknown): { topics: number; objectives: number; tasks: number } | null {
    if (!input || typeof input !== "object") {
      return null;
    }

    const record = input as Record<string, unknown>;
    const toNumber = (value: unknown): number =>
      typeof value === "number" && Number.isFinite(value) ? value : 0;

    let topics = toNumber(record.topics ?? record.topicCount ?? record.topicsPerLesson);
    let objectives = toNumber(record.objectives ?? record.objectiveCount);
    let tasks = toNumber(record.tasks ?? record.taskCount);

    const objectivesPerTopic = toNumber(record.objectivesPerTopic);
    if (!objectives && objectivesPerTopic && topics) {
      objectives = objectivesPerTopic * topics;
    }

    const tasksPerObjective = toNumber(record.tasksPerObjective);
    if (!tasks && tasksPerObjective && objectives) {
      tasks = tasksPerObjective * objectives;
    }

    if (!topics && !objectives && !tasks) {
      return null;
    }

    return { topics, objectives, tasks };
  }

  private normalizeLayoutNode(layout: unknown): LayoutNode | null {
    if (!layout) {
      return null;
    }

    if (typeof layout === "string") {
      try {
        const parsed = JSON.parse(layout) as LayoutNode;
        return parsed ?? null;
      } catch (error) {
        console.warn("⚠️ Failed to parse layout JSON string:", error);
        return null;
      }
    }

    if (typeof layout === "object") {
      return layout as LayoutNode;
    }

    return null;
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
      if (candidate && this.isValidDate(candidate)) {
        return this.normalizeDate(candidate);
      }
    }

    // Final fallback: current date/time
    return new Date().toISOString();
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

  private normalizeDate(value: string): string {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return new Date(`${value}T12:00:00Z`).toISOString();
    }

    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?Z$/.test(value)) {
      return value.length === 16 ? `${value}:00Z` : value;
    }

    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }

    return new Date().toISOString();
  }

  private isValidDate(value: string): boolean {
    if (!value || typeof value !== "string") {
      return false;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return true;
    }

    const date = new Date(value);
    return !Number.isNaN(date.getTime());
  }

  private resolveString(...values: Array<string | null | undefined>): string | null {
    for (const value of values) {
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed.length) {
          return trimmed;
        }
      }
    }
    return null;
  }

  private extractString(source: unknown, key: string): string | null {
    if (!source || typeof source !== "object") {
      return null;
    }
    const record = source as Record<string, unknown>;
    const value = record[key];
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed.length ? trimmed : null;
    }
    return null;
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
      this.resolveString(
        teacherName,
        institutionName,
        courseTitle,
        this.courseInfo?.course_name,
        "Neptino",
      ) ?? "Neptino";
    const year = new Date().getFullYear();
    return `© ${year} ${owner}`;
  }

  private normalizeMethod(method: string | undefined): MethodType {
    if (!method) return "Lecture";

    const normalized = method.toLowerCase().trim();
    
    switch (normalized) {
      case "lecture":
        return "Lecture";
      case "discussion":
        return "Discussion";
      case "activity":
        return "Activity";
      case "assessment":
        return "Assessment";
      case "lab":
        return "Lab";
      case "workshop":
        return "Workshop";
      case "seminar":
        return "Seminar";
      default:
        return "Lecture";
    }
  }

  private normalizeSocialForm(socialForm: string | undefined): SocialFormType {
    if (!socialForm) return "Whole Class";

    const normalized = socialForm.toLowerCase().trim();
    
    switch (normalized) {
      case "individual":
      case "solo":
        return "Individual";
      case "pairs":
      case "pair":
      case "partner":
        return "Pairs";
      case "small group":
      case "group":
      case "small groups":
        return "Small Group";
      case "whole class":
      case "class":
      case "full class":
        return "Whole Class";
      case "online":
        return "Online";
      case "hybrid":
        return "Hybrid";
      default:
        return "Whole Class";
    }
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
    canvasEngine.setMarginOverlayVisibility(false);

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
    canvasEngine.setMarginOverlayVisibility(true);
    console.log(`🧼 Canvas cleared${reason ? ` due to ${reason}` : ""}.`);
  }
}

// Auto-initialize
if (typeof window !== 'undefined') {
  const bridge = new CurriculumPageBridge();
  (window as any).curriculumPageBridge = bridge;
}
