/**
 * CurriculumPageBridge - Connects existing curriculum canvas system to PageManager
 * 
 * This bridge:
 * 1. Listens for curriculum-canvases-ready event
 * 2. Extracts canvas metadata from the existing system
 * 3. Creates PageMetadata for each canvas
 * 4. Initializes PageManager with populated headers/footers
 */

import { PageManager } from "../coursebuilder/pages/PageManager";
import type { PageMetadata, MethodType, SocialFormType } from "../coursebuilder/pages/PageMetadata";
import { canvasEngine } from "../coursebuilder/CanvasEngine";
import { canvasMarginManager } from "../coursebuilder/layout/CanvasMarginManager";

interface CurriculumCanvas {
  id?: string;
  lesson_number?: number;
  canvas_index?: number;
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
    };
    dimensions?: {
      width?: number;
      height?: number;
    };
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
    };
  };
}

export class CurriculumPageBridge {
  private pageManager: PageManager | null = null;
  private isInitialized = false;
  private courseInfo: {
    name: string;
    code: string;
    instructor: string;
  } | null = null;

  constructor() {
    this.init();
  }

  private init(): void {
    // Try to load course info from session storage or window
    this.loadCourseInfo();

    // Listen for curriculum canvases ready event
    document.addEventListener('curriculum-canvases-ready', (event: Event) => {
      const customEvent = event as CustomEvent<{ canvases: CurriculumCanvas[] }>;
      this.handleCanvasesReady(customEvent.detail.canvases);
    });

    console.log('🌉 CurriculumPageBridge initialized and listening for canvases');
  }

  private loadCourseInfo(): void {
    try {
      // Try to get from window.courseInfo (if set by course page)
      const windowCourseInfo = (window as any).courseInfo;
      if (windowCourseInfo) {
        this.courseInfo = {
          name: windowCourseInfo.name || windowCourseInfo.course_name || "Course Name",
          code: windowCourseInfo.code || windowCourseInfo.course_code || "COURSE-101",
          instructor: windowCourseInfo.instructor || windowCourseInfo.teacher || "Instructor",
        };
        console.log('📚 Loaded course info from window:', this.courseInfo);
        return;
      }

      // Try to get from sessionStorage
      const storedCourse = sessionStorage.getItem('currentCourse');
      if (storedCourse) {
        const course = JSON.parse(storedCourse);
        this.courseInfo = {
          name: course.course_name || course.name || "Course Name",
          code: course.course_code || course.code || "COURSE-101",
          instructor: course.instructor || course.teacher || "Instructor",
        };
        console.log('📚 Loaded course info from session:', this.courseInfo);
        return;
      }

      // Fallback values
      this.courseInfo = {
        name: "Course Name",
        code: "COURSE-101",
        instructor: "Instructor",
      };
      console.log('📚 Using fallback course info');
    } catch (error) {
      console.warn('Failed to load course info:', error);
      this.courseInfo = {
        name: "Course Name",
        code: "COURSE-101",
        instructor: "Instructor",
      };
    }
  }

  private handleCanvasesReady(canvases: CurriculumCanvas[]): void {
    console.log(`🎨 Received ${canvases.length} canvases, converting to page metadata...`);

    // Convert canvas data to page metadata
    const pageData = this.convertCanvasesToPageData(canvases);

    console.log(`📄 Converted to ${pageData.length} page metadata entries`);

    // Initialize page manager with canvas engine viewport
    this.initializePageManager(pageData);
  }

  private convertCanvasesToPageData(canvases: CurriculumCanvas[]): PageMetadata[] {
    const pageData: PageMetadata[] = [];

    canvases.forEach((canvas, index) => {
      const canvasData = canvas.canvas_data;
      const canvasMeta = canvas.canvas_metadata;

      // Extract lesson info
      const lessonNumber = canvasData?.lesson?.number ?? canvasMeta?.lessonNumber ?? 1;
      const lessonTitle = canvasData?.lesson?.title ?? canvasMeta?.title ?? `Lesson ${lessonNumber}`;
      const moduleNumber = canvasData?.lesson?.moduleNumber ?? canvasMeta?.moduleNumber;

      // Extract template info
      const template = canvasData?.template ?? canvasMeta?.template;
      const method = this.normalizeMethod(template?.method);
      const socialForm = this.normalizeSocialForm(template?.socialForm);
      const duration = template?.duration ?? 50;

      // Build page metadata
      const metadata: PageMetadata = {
        pageNumber: index + 1,
        totalPages: canvases.length,
        lessonNumber,
        lessonTitle,
        courseName: this.courseInfo?.name || "Course Name",
        courseCode: this.courseInfo?.code || "COURSE-101",
        date: canvasMeta?.generatedAt ?? new Date().toISOString(),
        method,
        socialForm,
        duration,
        instructor: this.courseInfo?.instructor || "Instructor",
        topic: `${lessonTitle} - Canvas ${canvas.canvas_index ?? 1}`,
      };

      // Add module info if available
      if (moduleNumber) {
        metadata.topic = `Module ${moduleNumber} - ${metadata.topic}`;
      }

      pageData.push(metadata);
    });

    return pageData;
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

    // Get current margins
    const margins = canvasMarginManager.getMargins();

    // Create page manager
    this.pageManager = new PageManager({
      viewport,
      pageData,
      margins,
      showDebugBorders: false, // Set to true for debugging
    });

    this.isInitialized = true;

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

  public destroy(): void {
    this.pageManager?.destroy();
    this.pageManager = null;
    this.isInitialized = false;
    console.log('🧹 CurriculumPageBridge destroyed');
  }
}

// Auto-initialize
if (typeof window !== 'undefined') {
  const bridge = new CurriculumPageBridge();
  (window as any).curriculumPageBridge = bridge;
}
