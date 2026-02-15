import { supabase } from "../../supabase";
import { CurriculumRenderer } from "./curriculumRenderer";
import { CanvasBuilder } from "./canvasBuilder";
import { LessonStructure } from "./utils/LessonStructure";
import { CourseContext } from "./CourseContext";
import {
  CanvasSummaryService,
  type CanvasLessonSummary,
} from "./CanvasSummaryService";
import { TemplatePlacementService } from "./TemplatePlacementService";
import {
  ContentLoadService,
  type ContentLoadConfig,
  type DurationPresetKey,
} from "./ContentLoadService";
import { ContentLoadController } from "./ContentLoadController";
import type { CurriculumCanvas } from "../../../integration/utils/CanvasDataAccessor";

// Module organization types
export type ModuleOrganizationType = "linear" | "equal" | "tiered" | "custom";

export interface CurriculumModule {
  moduleNumber: number;
  title: string;
  lessons: CurriculumLesson[];
}

export interface CurriculumLesson {
  lessonNumber: number;
  title: string;
  topics: CurriculumTopic[];
  moduleNumber?: number;
  templateId?: string; // Template assigned to this lesson/session
  competencies?: CurriculumCompetency[];
}

export interface CurriculumTopic {
  title: string;
  objectives: string[];
  tasks: string[];
}

export interface CurriculumCompetency {
  title: string;
  competencyNumber?: number;
  topics: CurriculumTopic[];
}

export type TemplatePlacementChoice =
  | "none"
  | "end-of-each-module"
  | "specific-modules"
  | "specific-lessons"
  | "end-of-course"
  | "all-lessons"
  | "lesson-ranges";

interface LessonRange {
  start: number;
  end: number;
}

export interface TemplatePlacementConfig {
  templateId: string;
  templateSlug: string;
  templateName: string;
  placementType: Exclude<TemplatePlacementChoice, "none">;
  moduleNumbers?: number[];
  lessonNumbers?: number[];
  lessonRanges?: LessonRange[];
}

export interface TemplateSummary {
  id: string;
  templateId: string;
  name: string;
  type: string;
  description?: string | null;
  isMissing?: boolean;
  scope?: "course" | "global" | "shared";
  definition?: TemplateDefinition;
}

export interface TemplateDefinitionBlock {
  id: string;
  type: string;
  order: number;
  config: Record<string, unknown>;
  content: string;
}

export interface TemplateDefinition {
  name?: string | null;
  blocks: TemplateDefinitionBlock[];
  settings: Record<string, unknown>;
}

export interface TemplateRecord {
  id: string;
  template_id: string;
  template_type: string;
  template_description?: string | null;
  template_data?: TemplateDefinition | null;
  course_id?: string | null;
}
interface CurriculumStructureConfig {
  durationType?: "mini" | "single" | "double" | "triple" | "halfFull";
  scheduledLessonDuration?: number;
  topicsPerLesson?: number;
  competenciesPerLesson?: number;
  objectivesPerTopic?: number;
  tasksPerObjective?: number;
}

interface CurriculumDataPayload {
  structure?: CurriculumStructureConfig;
  moduleOrganization?: ModuleOrganizationType;
  modules?: CurriculumModule[]; // New: lessons organized into modules
  lessons?: CurriculumLesson[]; // Legacy: for backward compatibility with "linear" mode
  templatePlacements?: TemplatePlacementConfig[];
  courseType?: "minimalist" | "essential" | "complete" | "custom";
}

type EditableContext = {
  moduleNum: number | null;
  lessonNum: number | null;
  topicIndex: number | null;
  competencyIndex: number | null;
  objectiveIndex: number | null;
  taskIndex: number | null;
  field: string | null;
};

interface DurationPreset {
  type: "mini" | "single" | "double" | "triple" | "halfFull";
  maxDuration: number;
  defaultTopics: number;
  defaultObjectives: number;
  defaultTasks: number;
  rationale: string;
}

type PreviewMode = "modules" | "titles" | "competencies" | "topics" | "objectives" | "tasks" | "all";

class CurriculumManager {
  private courseId: string;
  private curriculumConfigSection!: HTMLElement;
  private curriculumPreviewSection!: HTMLElement;
  private generationPreviewSection!: HTMLElement | null;
  private renderer!: CurriculumRenderer;
  private generationRenderer!: CurriculumRenderer | null;
  private canvasBuilder!: CanvasBuilder;
  private currentCurriculum: CurriculumLesson[] = []; // Flat list for internal processing
  private currentModules: CurriculumModule[] = []; // Hierarchical module structure
  private moduleOrganization: ModuleOrganizationType = "linear"; // Module organization mode
  private contentLoadConfig: ContentLoadConfig | null = null;
  private currentPreviewMode: PreviewMode = "all";
  private scheduledLessonDuration: number = 0; // Store the actual scheduled duration
  private editableUpdateTimers: Map<string, number> = new Map();
  private templatePlacementList: HTMLElement | null = null;
  private templatePlacements: TemplatePlacementConfig[] = [];
  private availableTemplates: TemplateSummary[] = [];
  private templatePlacementSaveTimeout: number | null = null;
  private courseType: "minimalist" | "essential" | "complete" | "custom" = "essential";
  private courseContext: CourseContext;
  private canvasSummaryService: CanvasSummaryService;
  private contentLoadController: ContentLoadController;
  private lessonStructureCounts: Map<number, { topics: number; objectives: number; tasks: number }> = new Map();
  private curriculumStructureDefaults: CurriculumStructureConfig | null = null;
  private initialModuleTitles: Map<number, string> = new Map();
  private lessonDates: Map<number, string> = new Map();
  private canvasSummaries: CanvasLessonSummary[] = [];
  private globalEventsBound = false;
  private pendingExternalReset: { reason?: string } | null = null;
  private readonly onCurriculumReset = (event: Event): void => {
    const customEvent = event as CustomEvent<{ courseId?: string; reason?: string }>;
    const targetCourseId = customEvent.detail?.courseId;
    if (targetCourseId && targetCourseId !== this.courseId) {
      return;
    }
    this.resetCurriculumState(customEvent.detail?.reason);
  };

  constructor(courseId?: string) {
    this.canvasBuilder = new CanvasBuilder();
    // Get course ID from parameter, URL, or session storage
    this.courseId = courseId || this.getCourseId();
    this.courseContext = new CourseContext(this.courseId);
    this.canvasSummaryService = new CanvasSummaryService(() => this.courseContext.buildCourseInfo());
    this.contentLoadController = new ContentLoadController({
      supabase,
      lessonDates: this.lessonDates,
      getCourseId: () => this.courseId,
      getCurrentCurriculum: () => this.currentCurriculum,
      getContentLoadConfig: () => this.contentLoadConfig,
      setContentLoadConfig: (config) => {
        this.contentLoadConfig = config;
      },
      getScheduledLessonDuration: () => this.scheduledLessonDuration,
      setScheduledLessonDuration: (duration) => {
        this.scheduledLessonDuration = duration;
      },
      computeCompetencies: (topics) => this.computeCompetenciesPerLesson(topics),
      regenerateAndSaveCurriculum: () => this.regenerateAndSaveCurriculum(),
      renderCurriculumPreview: () => this.renderCurriculumPreview(),
    });

    // Load saved preview mode from localStorage (or force default to 'all' for better UX)
    this.currentPreviewMode = "all"; // Force to show full structure by default
    this.savePreviewMode(this.currentPreviewMode); // Save the default

    this.registerGlobalEventListeners();

    if (!this.courseId) {
      console.warn("⚠️ No course ID available for curriculum management - some features may be limited");
      // Still initialize elements and basic functionality but delay slightly for DOM readiness
      setTimeout(() => {
        this.initializeElements();
        this.bindEvents();
      }, 100);
      return;
    }

    // For existing courses, initialize immediately and then load data
    setTimeout(() => {
      this.initializeElements();
      this.bindEvents();
      this.initializeCurriculum();
    }, 100);
  }

  private syncCanvasBuilderContext(): void {
    if (!this.canvasBuilder) {
      return;
    }

    if (this.currentCurriculum.length) {
      this.updateLessonStructureCountsFromLessons(this.currentCurriculum);
    } else {
      this.lessonStructureCounts.clear();
    }

    const moduleTitleMap = new Map<number, string>(this.initialModuleTitles);

    this.currentModules.forEach((module) => {
      if (!module || typeof module.moduleNumber !== "number") {
        return;
      }
      const moduleNumber = module.moduleNumber;
      const rawTitle = typeof module.title === "string" ? module.title.trim() : "";
      const title = rawTitle.length ? rawTitle : `Module ${moduleNumber}`;
      moduleTitleMap.set(moduleNumber, title);
    });

    const builderContext = this.courseContext.buildCanvasBuilderContext({
      courseId: this.courseId,
      moduleTitles: moduleTitleMap,
      lessonStructures: this.lessonStructureCounts,
      lessonDates: this.lessonDates,
    });

    this.canvasBuilder.setCourseContext(builderContext);
    this.canvasBuilder.setLessonStructures(new Map(this.lessonStructureCounts));
  }

  private getCourseId(): string {
    // First try to get course ID from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const courseIdFromUrl = urlParams.get('courseId') || urlParams.get('id');

    if (courseIdFromUrl) {
      return courseIdFromUrl;
    }

    // Fallback to session storage (for backward compatibility)
    const courseIdFromSession = sessionStorage.getItem("currentCourseId");
    if (courseIdFromSession) {
      return courseIdFromSession;
    }

    return "";
  }

  private async initializeCurriculum(): Promise<void> {
    try {
      console.log('\n╔════════════════════════════════════════════════════════════════╗');
      console.log('║         📚 LOADING ALL COURSE CONTEXT DATA                    ║');
      console.log('╚════════════════════════════════════════════════════════════════╝\n');

      // Load all course data from database to show comprehensive context
      await this.logAllCourseData();

      // Load schedule data first
      await this.contentLoadController.loadScheduleData();

      // Load existing curriculum
      await this.loadExistingCurriculum();

      // Sync canvas builder context with newly loaded modules and course info
      this.syncCanvasBuilderContext();

      // Load template placement data once curriculum context is ready
      await this.loadTemplatePlacementData();

      // Ensure lesson canvases exist for the current curriculum and schedule.
      await this.ensureLessonCanvases(this.currentCurriculum);

      // Sync course type UI (in case no curriculum was loaded)
      this.syncCourseTypeUI();

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

  private async logAllCourseData(): Promise<void> {
    if (!this.courseId) {
      console.warn('⚠️ No course ID - skipping comprehensive data logging');
      return;
    }

    try {
      // Query course data first
      const { data: courseData, error } = await supabase
        .from("courses")
        .select("*")
        .eq("id", this.courseId)
        .single();

      if (error) throw error;
      if (!courseData) {
        console.warn('⚠️ No course data found');
        return;
      }

      // Query teacher profile separately if we have a teacher_id
      let teacherProfile = null;
      if (courseData.teacher_id) {
        const { data: profileData } = await supabase
          .from("users")
          .select("id, email, first_name, last_name")
          .eq("id", courseData.teacher_id)
          .single();
        teacherProfile = profileData ? {
          id: profileData.id,
          email: profileData.email,
          username: profileData.email?.split('@')[0] || null,
          full_name: [profileData.first_name, profileData.last_name].filter(Boolean).join(' ') || profileData.email?.split('@')[0] || null
        } : null;
      }

      console.log('\n┌─────────────────────────────────────────────────────────────┐');
      console.log('│ 📋 1. COURSE ESSENTIALS                                     │');
      console.log('└─────────────────────────────────────────────────────────────┘');
      console.log('Course ID:', courseData.id);
      const courseName = courseData.course_name || courseData.title || 'Untitled Course';
      console.log('Course Title:', courseName);
      this.curriculumStructureDefaults = courseData.curriculum_data?.structure ?? this.curriculumStructureDefaults;
      console.log('Course Tagline:', courseData.tagline);
      console.log('Teacher ID:', courseData.teacher_id);
      console.log('Teacher Profile:', teacherProfile || 'Not loaded');
      this.courseContext.applyCourseData(courseData, teacherProfile ?? undefined);
      console.log('Teacher Name:', this.courseContext.getTeacherName() ?? 'Unknown Instructor');
      console.log('Created:', courseData.created_at);
      console.log('Updated:', courseData.updated_at);

      console.log('\n┌─────────────────────────────────────────────────────────────┐');
      console.log('│ 🏷️  2. CLASSIFICATION                                       │');
      console.log('└─────────────────────────────────────────────────────────────┘');
      console.log('Subject:', courseData.subject);
      console.log('Grade Level:', courseData.grade_level);
      console.log('Difficulty:', courseData.difficulty);
      console.log('Tags:', courseData.tags);
      console.log('Category:', courseData.category);

      console.log('\n┌─────────────────────────────────────────────────────────────┐');
      console.log('│ 🎯 3. PEDAGOGY APPROACH                                     │');
      console.log('└─────────────────────────────────────────────────────────────┘');
      console.log('Learning Plane:', courseData.course_pedagogy?.learningPlane || 'Not set');
      console.log('Instructional Approach:', courseData.course_pedagogy?.instructionalApproach || 'Not set');
      console.log('Assessment Strategy:', courseData.course_pedagogy?.assessmentStrategy || 'Not set');
      console.log('Full Pedagogy Config:', courseData.course_pedagogy);

      console.log('\n┌─────────────────────────────────────────────────────────────┐');
      console.log('│ 📅 4. SCHEDULE SETTINGS                                     │');
      console.log('└─────────────────────────────────────────────────────────────┘');
      console.log('Total Sessions:', courseData.course_sessions);
      console.log('Start Date:', courseData.start_date);
      console.log('End Date:', courseData.end_date);
      console.log('Schedule Settings:', courseData.schedule_settings);

      if (courseData.schedule_settings && Array.isArray(courseData.schedule_settings) && courseData.schedule_settings.length > 0) {
        const firstLesson = courseData.schedule_settings[0];
        console.log('\nFirst Lesson Example:');
        console.log('  - Date:', firstLesson.date);
        console.log('  - Day:', firstLesson.day);
        console.log('  - Start Time:', firstLesson.startTime);
        console.log('  - End Time:', firstLesson.endTime);
        console.log(
          '  - Duration:',
          ContentLoadService.calculateLessonDuration(
            firstLesson.startTime,
            firstLesson.endTime,
            firstLesson.breakTimes,
          ),
          'minutes',
        );
      }

      console.log('\n┌─────────────────────────────────────────────────────────────┐');
      console.log('│ 📚 5. CONTENT STRUCTURE (Curriculum Data)                  │');
      console.log('└─────────────────────────────────────────────────────────────┘');
      console.log('Curriculum Data Summary:', {
        hasData: !!courseData.curriculum_data,
        modulesCount: courseData.curriculum_data?.modules?.length || 0,
        lessonsCount: courseData.curriculum_data?.lessons?.length || 0,
        templatePlacements: courseData.curriculum_data?.templatePlacements?.length || 0,
      });

      if (courseData.curriculum_data) {
        console.log('\nCurriculum Structure:');
        console.log('  - Module Organization:', courseData.curriculum_data.moduleOrganization);
        console.log('  - Course Type:', courseData.curriculum_data.courseType);
        console.log('  - Structure Config:', courseData.curriculum_data.structure);

        if (courseData.curriculum_data.modules && courseData.curriculum_data.modules.length > 0) {
          console.log('  - Modules Count:', courseData.curriculum_data.modules.length);
          console.log('  - Modules:', courseData.curriculum_data.modules.map((m: any) => ({
            moduleNumber: m.moduleNumber,
            title: m.title,
            lessonsCount: m.lessons?.length || 0
          })));
        }

        if (courseData.curriculum_data.lessons && courseData.curriculum_data.lessons.length > 0) {
          console.log('  - Lessons Count:', courseData.curriculum_data.lessons.length);
          console.log('  - First Lesson:', courseData.curriculum_data.lessons[0]);
        }

        if (courseData.curriculum_data.templatePlacements && courseData.curriculum_data.templatePlacements.length > 0) {
          console.log('  - Template Placements:', courseData.curriculum_data.templatePlacements);
        }
      } else {
        console.log('❌ No curriculum data yet - will be generated');
      }

      this.initialModuleTitles = new Map();
      const modulesFromCourse = Array.isArray(courseData.curriculum_data?.modules)
        ? courseData.curriculum_data.modules
        : [];
      modulesFromCourse.forEach((module: any) => {
        if (!module || typeof module !== 'object') {
          return;
        }
        const moduleNumber = typeof module.moduleNumber === 'number' ? module.moduleNumber : null;
        if (!moduleNumber) {
          return;
        }
        const rawTitle = typeof module.title === 'string' ? module.title.trim() : '';
        const title = rawTitle.length ? rawTitle : `Module ${moduleNumber}`;
        this.storeModuleTitle(moduleNumber, title);
      });

      this.syncCanvasBuilderContext();

      console.log('\n┌─────────────────────────────────────────────────────────────┐');
      console.log('│ 📦 6. EXISTING CURRICULUM CONTENT                           │');
      console.log('└─────────────────────────────────────────────────────────────┘');

      // Query canvas/lesson content
      const { data: canvases, error: canvasError } = await supabase
        .from('canvases')
        .select('*')
        .eq('course_id', this.courseId);

      if (!canvasError && canvases && canvases.length > 0) {
        console.log('Canvas/Lesson Content:');
        console.log('  - Total Canvases:', canvases.length);
        canvases.forEach((canvas, index) => {
          console.log(`\n  Canvas ${index + 1}:`);
          console.log('    - ID:', canvas.id);
          console.log('    - Title:', canvas.title);
          console.log('    - Lesson Number:', canvas.lesson_number);
          console.log('    - Has Canvas Data:', !!canvas.canvas_data);
          console.log('    - Created:', canvas.created_at);
        });
      } else {
        console.log('❌ No canvas/lesson content yet');
      }

      this.canvasSummaries = this.canvasSummaryService.build(canvases || []);

      console.log('\n╔════════════════════════════════════════════════════════════════╗');
      console.log('║         ✅ COURSE CONTEXT DATA LOADED SUCCESSFULLY             ║');
      console.log('╚════════════════════════════════════════════════════════════════╝\n');

      // 🔥 THE BIG DUMP - Complete JSON of all context
      console.log('\n\n');
      console.log('═'.repeat(80));
      console.log('🔥 COMPLETE CONTEXT JSON DUMP - ALL DATA IN ONE OBJECT 🔥');
      console.log('═'.repeat(80));
      console.log('\n');

      const completeContext = {
        courseEssentials: {
          id: courseData.id,
          course_name: courseName,
          tagline: courseData.tagline,
          teacher_id: courseData.teacher_id,
          teacherProfile: teacherProfile,
          created_at: courseData.created_at,
          updated_at: courseData.updated_at,
          status: courseData.status,
          is_published: courseData.is_published
        },
        classification: {
          subject: courseData.subject,
          grade_level: courseData.grade_level,
          difficulty: courseData.difficulty,
          tags: courseData.tags,
          category: courseData.category
        },
        pedagogyApproach: courseData.course_pedagogy || {},
        scheduleSettings: {
          total_sessions: courseData.course_sessions,
          start_date: courseData.start_date,
          end_date: courseData.end_date,
          schedule_settings: courseData.schedule_settings,
          first_lesson_example: courseData.schedule_settings && courseData.schedule_settings.length > 0 ? {
            date: courseData.schedule_settings[0].date,
            day: courseData.schedule_settings[0].day,
            startTime: courseData.schedule_settings[0].startTime,
            endTime: courseData.schedule_settings[0].endTime,
            calculated_duration_minutes: ContentLoadService.calculateLessonDuration(
              courseData.schedule_settings[0].startTime,
              courseData.schedule_settings[0].endTime,
              courseData.schedule_settings[0].breakTimes
            )
          } : null
        },
        contentStructure: {
          curriculum_data: courseData.curriculum_data,
          has_curriculum: !!courseData.curriculum_data,
          module_organization: courseData.curriculum_data?.moduleOrganization,
          course_type: courseData.curriculum_data?.courseType,
          structure_config: courseData.curriculum_data?.structure,
          modules: courseData.curriculum_data?.modules || [],
          modules_count: courseData.curriculum_data?.modules?.length || 0,
          lessons: courseData.curriculum_data?.lessons || [],
          lessons_count: courseData.curriculum_data?.lessons?.length || 0,
          template_placements: courseData.curriculum_data?.templatePlacements || [],
          template_placements_count: courseData.curriculum_data?.templatePlacements?.length || 0
        },
        existingContent: {
          canvases: canvases || [],
          canvases_count: canvases?.length || 0,
          has_lesson_content: canvases && canvases.length > 0
        },
        rawCourseData: courseData,
        metadata: {
          logged_at: new Date().toISOString(),
          course_id: this.courseId,
          total_data_points: Object.keys(courseData).length,
          has_pedagogy: !!courseData.course_pedagogy,
          has_schedule: !!(courseData.schedule_settings && courseData.schedule_settings.length > 0),
          has_curriculum: !!courseData.curriculum_data,
          has_canvases: !!(canvases && canvases.length > 0)
        }
      };

      const serializedContext = JSON.stringify(completeContext, null, 2);
      if (serializedContext.length > 10240) {
        console.log(serializedContext.slice(0, 10240) + '\n... [truncated]');
      } else {
        console.log(serializedContext);
      }

      console.log('\n');
      console.log('═'.repeat(80));
      console.log('📊 CONTEXT SUMMARY STATS');
      console.log('═'.repeat(80));
      console.log(`Total Course Fields: ${Object.keys(courseData).length}`);
      console.log(`Total Lessons: ${completeContext.contentStructure.lessons_count}`);
      console.log(`Total Modules: ${completeContext.contentStructure.modules_count}`);
      console.log(`Total Canvases: ${completeContext.existingContent.canvases_count}`);
      console.log(`Total Schedule Entries: ${courseData.schedule_settings?.length || 0}`);
      console.log(`Total Template Placements: ${completeContext.contentStructure.template_placements_count}`);
      console.log(`Has Pedagogy Config: ${completeContext.metadata.has_pedagogy ? '✅' : '❌'}`);
      console.log(`Has Schedule: ${completeContext.metadata.has_schedule ? '✅' : '❌'}`);
      console.log(`Has Curriculum: ${completeContext.metadata.has_curriculum ? '✅' : '❌'}`);
      console.log(`Has Canvas Content: ${completeContext.metadata.has_canvases ? '✅' : '❌'}`);
      console.log('═'.repeat(80));
      console.log('\n\n');

    } catch (error) {
      console.error('❌ Error loading course data for logging:', error);
    }
  }

  private savePreviewMode(mode: PreviewMode): void {
    localStorage.setItem('curriculum-preview-mode', mode);
  }

  private initializeElements(): void {
    // The curriculum config panel lives in the config data panel within the curriculum article.
    this.curriculumConfigSection = document.querySelector(
      "#curriculum [data-article-panel=\"config\"]",
    ) as HTMLElement;

    // Initialize both curriculum and generation previews
    // They will show the same data but with different view mode controls
    const curriculumPreview = document.querySelector(
      "#curriculum [data-curriculum-preview]",
    ) as HTMLElement;
    const generationPreview = document.querySelector(
      "#generation [data-curriculum-preview]",
    ) as HTMLElement;

    // Store both preview sections for dual rendering
    this.curriculumPreviewSection = curriculumPreview;
    this.generationPreviewSection = generationPreview;

    this.templatePlacementList = document.getElementById(
      "curriculum-template-placement-list",
    );

    // Check if all elements were found
    if (!this.curriculumConfigSection) {
      console.error("curriculum config section element not found");
      return;
    }
    if (!this.curriculumPreviewSection) {
      console.error("curriculum preview element not found");
      return;
    }

    if (!this.templatePlacementList) {
      console.warn("Template placement UI elements not found");
    }

    // Set initial active button for preview mode
    this.setInitialActiveButton();

    // Initialize event listeners for both preview sections if they exist
    if (curriculumPreview && generationPreview) {
      this.initializePreviewControls(curriculumPreview);
      this.initializePreviewControls(generationPreview);
    }

    this.renderer = new CurriculumRenderer(
      this.curriculumPreviewSection,
      this.templatePlacementList,
    );

    // Initialize generation renderer if generation preview exists
    if (this.generationPreviewSection) {
      this.generationRenderer = new CurriculumRenderer(
        this.generationPreviewSection,
        null, // No template placement list for generation section
      );
    }

    if (this.pendingExternalReset) {
      const reason = this.pendingExternalReset.reason;
      this.pendingExternalReset = null;
      this.resetCurriculumState(reason);
    }
  }

  private resetCurriculumState(reason?: string): void {
    if (!this.renderer) {
      this.pendingExternalReset = { reason };
      return;
    }

    if (reason) {
      console.info(`♻️ Curriculum state reset (${reason}).`);
    } else {
      console.info("♻️ Curriculum state reset.");
    }

    this.currentCurriculum = [];
    this.currentModules = [];
    this.templatePlacements = [];
    this.lessonStructureCounts.clear();
    this.lessonDates.clear();
    this.contentLoadConfig = null;
    this.scheduledLessonDuration = 0;

    this.renderCurriculumPreview();
    this.renderTemplatePlacementUI();
  }

  private registerGlobalEventListeners(): void {
    if (this.globalEventsBound || typeof document === "undefined") {
      return;
    }

    document.addEventListener("curriculum-reset", this.onCurriculumReset);
    this.globalEventsBound = true;
  }

  private initializePreviewControls(previewSection: HTMLElement): void {
    // Add event listeners for view mode buttons in this specific preview section
    const modeButtons = previewSection.querySelectorAll<HTMLButtonElement>('button[data-mode]');
    modeButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const mode = button.dataset.mode as PreviewMode;
        if (mode) {
          this.setPreviewMode(mode);
          // Update both previews
          this.renderCurriculumPreview();
        }
      });
    });
  }
  private setInitialActiveButton(): void {
    // Use setTimeout to ensure DOM is fully ready
    setTimeout(() => {
      this.highlightPreviewModeButton(this.currentPreviewMode);
    }, 100);
  }

  private highlightPreviewModeButton(mode: PreviewMode): void {
    this.renderer.highlightPreviewModeButton(mode);
    // Also update generation preview buttons if it exists
    if (this.generationRenderer) {
      this.generationRenderer.highlightPreviewModeButton(mode);
    }
  }
  private bindEvents(): void {
    if (!this.curriculumConfigSection) {
      console.error("Cannot bind events: required elements not found");
      return;
    }

    // Module organization radio buttons
    const moduleOrgRadios = document.querySelectorAll<HTMLInputElement>('input[name="module-organization"]');
    moduleOrgRadios.forEach(radio => {
      radio.addEventListener('change', (event) => {
        const target = event.target as HTMLInputElement;
        if (target.checked) {
          const value = target.value as ModuleOrganizationType;
          this.setModuleOrganization(value);
        }
      });
    });

    // Add module button for custom organization
    const addModuleBtn = document.getElementById('add-module-btn');
    if (addModuleBtn) {
      addModuleBtn.addEventListener('click', () => {
        this.addCustomModule();
      });
    }

    // Content volume radio buttons (replacing old button system)
    const contentVolumeRadios = document.querySelectorAll<HTMLInputElement>('input[name="content-volume"]');
    contentVolumeRadios.forEach(radio => {
      radio.addEventListener('change', (event) => {
        const target = event.target as HTMLInputElement;
        if (target.checked) {
          const durationType = target.value as DurationPresetKey;
          if (ContentLoadService.isDurationPresetKey(durationType)) {
            this.contentLoadController.handleDurationSelection(durationType);
          }
        }
      });
    });

    // Course type radio buttons - filter templates based on selected type
    const courseTypeRadios = document.querySelectorAll<HTMLInputElement>('input[name="course-type"]');
    courseTypeRadios.forEach(radio => {
      radio.addEventListener('change', (event) => {
        const target = event.target as HTMLInputElement;
        if (target.checked) {
          const courseType = target.value as "minimalist" | "essential" | "complete" | "custom";
          this.handleCourseTypeChange(courseType);
        }
      });
    });

    // Preview mode buttons
    const previewModeButtons =
      this.curriculumPreviewSection?.querySelectorAll('button[data-mode]');
    previewModeButtons?.forEach((button) => {
      button.addEventListener("click", (event) => {
        const mode = (event.currentTarget as HTMLButtonElement).dataset
          .mode as PreviewMode | undefined;

        if (mode) {
          this.setPreviewMode(mode);
        }
      });
    });

    // Lesson template selector - delegate to preview section
    if (this.curriculumPreviewSection) {
      this.curriculumPreviewSection.addEventListener('change', (event) => {
        const target = event.target as HTMLSelectElement;
        if (target.matches('[data-lesson-template-select]')) {
          this.handleLessonTemplateChange(target);
        }
      });
    }

    if (this.templatePlacementList) {
      this.templatePlacementList.addEventListener("click", (event) => {
        const target = event.target as HTMLElement | null;
        if (!target) {
          return;
        }

        // Handle toggle button clicks
        const toggleButton = target.closest<HTMLButtonElement>('[data-template-toggle]');
        if (toggleButton) {
          event.preventDefault();
          const card = toggleButton.closest<HTMLElement>('[data-template-card]');
          if (card) {
            const bodyElements = card.querySelectorAll<HTMLElement>(
              '[data-template-card-description], [data-template-card-warning], [data-template-card-options]'
            );
            const currentlyCollapsed =
              card.dataset.collapsed === 'true' ||
              Array.from(bodyElements).every((el) => el.classList.contains('hidden'));
            const nextCollapsed = !currentlyCollapsed;

            bodyElements.forEach((el) => el.classList.toggle('hidden', nextCollapsed));
            if (nextCollapsed) {
              card.dataset.collapsed = 'true';
            } else {
              delete card.dataset.collapsed;
            }

            // Update aria-expanded attribute for accessibility
            const isExpanded = !nextCollapsed;
            toggleButton.setAttribute('aria-expanded', isExpanded.toString());
          }
          return;
        }

        // Handle add range button
        const addRangeButton = target.closest<HTMLButtonElement>('[data-range-add]');
        if (addRangeButton) {
          event.preventDefault();
          const card = addRangeButton.closest<HTMLElement>('[data-template-card]');
          if (card) {
            const templateId = card.dataset.templateId;
            if (templateId) {
              this.addLessonRange(templateId);
            }
          }
          return;
        }

        // Handle remove range button
        const removeRangeButton = target.closest<HTMLButtonElement>('[data-range-remove]');
        if (removeRangeButton) {
          event.preventDefault();
          const rangeIndex = Number(removeRangeButton.dataset.rangeRemove);
          const card = removeRangeButton.closest<HTMLElement>('[data-template-card]');
          if (card && !Number.isNaN(rangeIndex)) {
            const templateId = card.dataset.templateId;
            if (templateId) {
              this.removeLessonRange(templateId, rangeIndex);
            }
          }
          return;
        }

        const input = target.closest<HTMLInputElement>(
          "input[type='radio'], input[type='checkbox']",
        );

        if (!input) {
          return;
        }

        event.preventDefault();

        if (input.type === "checkbox") {
          input.checked = !input.checked;
        } else {
          input.checked = true;
        }

        this.handleTemplatePlacementInputChange(input);
        input.dataset.templatePlacementHandled = "true";
      });

      this.templatePlacementList.addEventListener("change", (event) => {
        const input = event.target as HTMLInputElement | null;
        if (!input) {
          return;
        }

        // Handle lesson range inputs
        if (input.hasAttribute('data-range-start') || input.hasAttribute('data-range-end')) {
          const card = input.closest<HTMLElement>('[data-template-card]');
          if (card) {
            const templateId = card.dataset.templateId;
            const rangeIndex = Number(input.dataset.rangeIndex);
            if (templateId && !Number.isNaN(rangeIndex)) {
              const isStart = input.hasAttribute('data-range-start');
              this.updateLessonRange(templateId, rangeIndex, isStart, Number(input.value));
            }
          }
          return;
        }

        if (!input.matches("input[type='radio'], input[type='checkbox']")) {
          return;
        }

        if (input.dataset.templatePlacementHandled === "true") {
          delete input.dataset.templatePlacementHandled;
          return;
        }

        this.handleTemplatePlacementInputChange(input);
      });
    }

    // AI Generation buttons
    const aiGenerateButtons = document.querySelectorAll<HTMLButtonElement>('[data-ai-generate]');
    aiGenerateButtons.forEach(button => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        const target = button.dataset.aiGenerate;
        if (target) {
          await this.handleAIGeneration(target as 'all' | 'modules' | 'lessons' | 'topics' | 'objectives' | 'tasks');
        }
      });
    });
  }

  // ============================================================================
  // AI CURRICULUM GENERATION
  // ============================================================================

  /**
   * Handle AI generation button clicks
   */
  private async handleAIGeneration(target: 'all' | 'modules' | 'lessons' | 'topics' | 'objectives' | 'tasks'): Promise<void> {
    if (!this.courseId) {
      alert('Please save the course first before using AI generation.');
      return;
    }

    // Import AI generator dynamically
    const { AICurriculumGenerator } = await import('./aiCurriculumGenerator');
    const generator = new AICurriculumGenerator(this.courseId);

    // Show status UI
    const statusElement = document.getElementById('ai-generation-status');
    const statusText = statusElement?.querySelector('[data-ai-status-text]');
    const progressBar = statusElement?.querySelector('[data-ai-progress-fill]') as HTMLElement;

    if (statusElement) {
      statusElement.style.display = 'block';
    }

    // Set up progress callback
    generator.onProgress((progress) => {
      if (statusText) {
        statusText.textContent = progress.status;
      }
      if (progressBar) {
        progressBar.style.width = `${progress.progress}%`;
      }
    });

    try {
      // Get context selection from checkboxes
      const includeSchedule = (document.querySelector('input[name="ai-context-schedule"]') as HTMLInputElement)?.checked || false;
      const includeStructure = (document.querySelector('input[name="ai-context-structure"]') as HTMLInputElement)?.checked || false;
      const includeExisting = (document.querySelector('input[name="ai-context-existing"]') as HTMLInputElement)?.checked || false;

      // Gather context
      const context = await generator.gatherContext({
        includeSchedule,
        includeStructure,
        includeExisting,
      });

      if (!context) {
        throw new Error('Failed to gather course context');
      }

      // Generate content
      const result = await generator.generate({
        target,
        context,
        includeSchedule,
        includeStructure,
        includeExisting,
      });

      // Apply generated content to curriculum
      await this.applyAIGeneratedContent(target, result);

      // Hide status
      setTimeout(() => {
        if (statusElement) {
          statusElement.style.display = 'none';
        }
      }, 2000);
    } catch (error) {
      console.error('AI generation failed:', error);
      if (statusText) {
        statusText.textContent = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
      setTimeout(() => {
        if (statusElement) {
          statusElement.style.display = 'none';
        }
      }, 3000);
    }
  }

  /**
   * Apply AI-generated content to the curriculum
   */
  private async applyAIGeneratedContent(target: string, content: any): Promise<void> {
    try {
      switch (target) {
        case 'all':
          // Replace entire curriculum structure
          if (Array.isArray(content) && content.length > 0) {
            this.currentCurriculum = content;
            await this.saveCurriculumToDatabase(this.currentCurriculum);
            this.renderCurriculumPreview();
          }
          break;

        case 'modules':
          // Update module titles
          if (Array.isArray(content) && this.currentModules.length > 0) {
            console.log('📝 Applying module names:', content);
            console.log('📦 Current modules before update:', this.currentModules.map(m => m.title));

            content.forEach((title: string, index: number) => {
              if (this.currentModules[index]) {
                console.log(`Updating module ${index + 1}: "${this.currentModules[index].title}" → "${title}"`);
                this.currentModules[index].title = title;
              }
            });

            console.log('📦 Current modules after update:', this.currentModules.map(m => m.title));

            // We need to save modules directly, not go through saveCurriculumToDatabase
            // because that function reorganizes lessons and might lose our module titles
            const payload: any = {
              structure: this.buildStructurePayload(),
              moduleOrganization: this.moduleOrganization,
              modules: this.currentModules,
              templatePlacements: this.templatePlacements,
              courseType: this.courseType,
            };

            if (this.moduleOrganization === "linear") {
              payload.lessons = this.currentCurriculum;
            }

            console.log('💾 Saving modules to database:', payload.modules);

            const { error } = await supabase
              .from("courses")
              .update({
                curriculum_data: payload,
              })
              .eq("id", this.courseId);

            if (error) {
              console.error('❌ Failed to save module names:', error);
              throw error;
            }

            console.log('✅ Module names saved successfully to database');
            this.renderCurriculumPreview();
          } else {
            console.warn('⚠️ Cannot update modules:', {
              contentIsArray: Array.isArray(content),
              contentLength: Array.isArray(content) ? content.length : 0,
              currentModulesLength: this.currentModules.length,
              content,
            });
          }
          break;

        case 'lessons':
          // Update lesson titles
          if (Array.isArray(content) && this.currentCurriculum.length > 0) {
            content.forEach((title: string, index: number) => {
              if (this.currentCurriculum[index]) {
                this.currentCurriculum[index].title = title;
              }
            });
            await this.saveCurriculumToDatabase(this.currentCurriculum);
            this.renderCurriculumPreview();
          }
          break;

        case 'topics':
          // Update topic titles - content is array of arrays
          if (Array.isArray(content)) {
            content.forEach((lessonTopics: string[], lessonIndex: number) => {
              if (this.currentCurriculum[lessonIndex]) {
                lessonTopics.forEach((topicTitle: string, topicIndex: number) => {
                  if (this.currentCurriculum[lessonIndex].topics[topicIndex]) {
                    this.currentCurriculum[lessonIndex].topics[topicIndex].title = topicTitle;
                  }
                });
              }
            });
            await this.saveCurriculumToDatabase(this.currentCurriculum);
            this.renderCurriculumPreview();
          }
          break;

        case 'objectives':
          // Update objectives - nested array structure [lesson][topic][objectives]
          if (Array.isArray(content)) {
            content.forEach((lessonObjectives: string[][], lessonIndex: number) => {
              if (this.currentCurriculum[lessonIndex]) {
                lessonObjectives.forEach((topicObjectives: string[], topicIndex: number) => {
                  if (this.currentCurriculum[lessonIndex].topics[topicIndex]) {
                    this.currentCurriculum[lessonIndex].topics[topicIndex].objectives = topicObjectives;
                  }
                });
              }
            });
            await this.saveCurriculumToDatabase(this.currentCurriculum);
            this.renderCurriculumPreview();
          }
          break;

        case 'tasks':
          // Update tasks - nested array structure [lesson][topic][objective][tasks]
          if (Array.isArray(content)) {
            content.forEach((lessonTasks: string[][][], lessonIndex: number) => {
              if (this.currentCurriculum[lessonIndex]) {
                lessonTasks.forEach((topicTasks: string[][], topicIndex: number) => {
                  if (this.currentCurriculum[lessonIndex].topics[topicIndex]) {
                    // Flatten tasks from objective-based to topic-based
                    const allTasks = topicTasks.flat();
                    this.currentCurriculum[lessonIndex].topics[topicIndex].tasks = allTasks;
                  }
                });
              }
            });
            await this.saveCurriculumToDatabase(this.currentCurriculum);
            this.renderCurriculumPreview();
          }
          break;
      }
    } catch (error) {
      console.error('Failed to apply AI-generated content:', error);
      throw error;
    }
  }

  // ============================================================================
  // TEMPLATE PLACEMENT MANAGEMENT
  // ============================================================================

  /**
   * Handles course type selection change
   */
  private handleCourseTypeChange(courseType: "minimalist" | "essential" | "complete" | "custom"): void {
    console.log(`📋 Course type changed to: ${courseType}`);
    this.courseType = courseType;

    // Re-render template placement UI with filtered templates
    this.renderTemplatePlacementUI();

    // Save the course type to database
    this.saveCourseTypeToDatabase();
  }

  /**
   * Saves the course type to the database
   */
  private async saveCourseTypeToDatabase(): Promise<void> {
    if (!this.courseId) {
      return;
    }

    try {
      // Load current curriculum data
      const { data: currentData } = await supabase
        .from("courses")
        .select("curriculum_data")
        .eq("id", this.courseId)
        .single();

      const existingPayload =
        currentData?.curriculum_data && typeof currentData.curriculum_data === "object"
          ? (currentData.curriculum_data as CurriculumDataPayload)
          : {};

      // Update with new course type
      const updatedPayload: CurriculumDataPayload = {
        ...existingPayload,
        courseType: this.courseType,
      };

      // Save back to database
      const { error } = await supabase
        .from("courses")
        .update({ curriculum_data: updatedPayload })
        .eq("id", this.courseId);

      if (error) {
        console.error("Error saving course type:", error);
      } else {
        console.log(`✅ Course type saved: ${this.courseType}`);
      }
    } catch (error) {
      console.error("Error in saveCourseTypeToDatabase:", error);
    }
  }

  private async loadTemplatePlacementData(): Promise<void> {
    if (!this.templatePlacementList) {
      return;
    }

    if (!this.courseId) {
      this.availableTemplates = [];
      this.renderTemplatePlacementUI();
      return;
    }

    try {
      await this.fetchAvailableTemplates();
      this.syncTemplatePlacements();
    } catch (error) {
      console.error("Error loading templates for curriculum placement:", error);
    } finally {
      this.renderCurriculumPreview();
      this.renderTemplatePlacementUI();
    }
  }

  private async fetchAvailableTemplates(): Promise<void> {
    if (!this.courseId) {
      this.availableTemplates = [];
      return;
    }

    const { data, error } = await supabase
      .from("templates")
      .select(
        "id, template_id, template_description, template_type, template_data, course_id, created_at",
      )
      .order("course_id", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    const templates = Array.isArray(data) ? data : [];
    const scopeRank = (scope: TemplateSummary["scope"] | undefined): number => {
      switch (scope) {
        case "course":
          return 0;
        case "shared":
          return 1;
        default:
          return 2;
      }
    };

    this.availableTemplates = templates
      .map((template: any) => {
        const templateData =
          typeof template.template_data === "object" && template.template_data
            ? template.template_data
            : {};
        const name =
          typeof templateData.name === "string" && templateData.name.trim().length
            ? templateData.name.trim()
            : template.template_id;
        const rawType =
          typeof template.template_type === "string" && template.template_type.trim().length
            ? template.template_type.trim()
            : "lesson";
        const normalizedType = this.normalizeTemplateTypeName(rawType);
        let scope: TemplateSummary["scope"] = "global";
        if (template.course_id === this.courseId) {
          scope = "course";
        } else if (template.course_id) {
          scope = "shared";
        }
        const definition = this.normalizeTemplateDefinition(template.template_data);
        return {
          id: template.id,
          templateId: template.template_id,
          name,
          type: normalizedType ?? rawType,
          description: template.template_description,
          scope,
          definition,
        } as TemplateSummary;
      })
      .sort((a, b) => {
        const scopeDifference = scopeRank(a.scope) - scopeRank(b.scope);
        if (scopeDifference !== 0) {
          return scopeDifference;
        }

        return a.name.localeCompare(b.name);
      });
  }

  private syncTemplatePlacements(): void {
    this.templatePlacements = TemplatePlacementService.syncWithTemplates(
      this.templatePlacements,
      this.availableTemplates,
    );
    this.templatePlacements = TemplatePlacementService.syncWithModules(
      this.templatePlacements,
      this.currentModules,
    );
    this.templatePlacements = TemplatePlacementService.syncWithLessons(
      this.templatePlacements,
      this.currentCurriculum,
    );
  }

  private renderTemplatePlacementUI(): void {
    this.renderer.renderTemplatePlacementUI();
  }

  private handleTemplatePlacementInputChange(input: HTMLInputElement): void {
    const card = input.closest<HTMLElement>("[data-template-card]");
    if (!card) {
      return;
    }

    const templateId = card.dataset.templateId;
    if (!templateId) {
      return;
    }

    if (input.type === "radio") {
      const choice = input.value as TemplatePlacementChoice;
      this.updateTemplatePlacementChoice(templateId, choice);

      // Apply template placements immediately for lesson templates
      this.applyTemplatePlacementsToLessons();

      this.renderTemplatePlacementUI();
      this.renderCurriculumPreview();
      this.persistTemplatePlacements();
      return;
    }

    const moduleValue = input.getAttribute("data-template-module");
    if (moduleValue) {
      const moduleNumber = Number(moduleValue);
      if (Number.isNaN(moduleNumber)) {
        return;
      }

      this.updateTemplatePlacementModules(templateId, moduleNumber, input.checked);
      this.renderCurriculumPreview();
      this.persistTemplatePlacements();
      return;
    }

    const lessonValue = input.getAttribute("data-template-lesson");
    if (!lessonValue) {
      return;
    }

    const lessonNumber = Number(lessonValue);
    if (Number.isNaN(lessonNumber)) {
      return;
    }

    this.updateTemplatePlacementLessons(templateId, lessonNumber, input.checked);
    this.renderCurriculumPreview();
    this.persistTemplatePlacements();
  }

  private handleLessonTemplateChange(select: HTMLSelectElement): void {
    const lessonNumber = Number(select.dataset.lessonNumber);
    if (Number.isNaN(lessonNumber)) {
      console.error('Invalid lesson number for template selection');
      return;
    }

    const templateId = select.value || undefined;

    // Find the lesson in current curriculum
    const lesson = this.currentCurriculum.find(l => l.lessonNumber === lessonNumber);
    if (!lesson) {
      console.error(`Lesson ${lessonNumber} not found`);
      return;
    }

    // Update the lesson's templateId
    lesson.templateId = templateId;

    console.log(`📄 Template ${templateId ? 'assigned' : 'removed'} for Lesson ${lessonNumber}`);

    // Re-render preview to show updated badge
    this.renderCurriculumPreview();

    // Save to database
    this.saveCurriculumToDatabase(this.currentCurriculum);
  }

  private updateTemplatePlacementChoice(
    templateId: string,
    choice: TemplatePlacementChoice,
  ): void {
    this.templatePlacements = TemplatePlacementService.updatePlacementChoice(
      this.templatePlacements,
      this.availableTemplates,
      templateId,
      choice,
      this.currentCurriculum.length,
    );
  }

  private updateTemplatePlacementModules(
    templateId: string,
    moduleNumber: number,
    isChecked: boolean,
  ): void {
    this.templatePlacements = TemplatePlacementService.toggleModuleSelection(
      this.templatePlacements,
      this.availableTemplates,
      templateId,
      moduleNumber,
      isChecked,
      this.currentCurriculum.length,
    );
  }

  private updateTemplatePlacementLessons(
    templateId: string,
    lessonNumber: number,
    isChecked: boolean,
  ): void {
    this.templatePlacements = TemplatePlacementService.toggleLessonSelection(
      this.templatePlacements,
      this.availableTemplates,
      templateId,
      lessonNumber,
      isChecked,
      this.currentCurriculum.length,
    );
  }

  private addLessonRange(templateId: string): void {
    this.templatePlacements = TemplatePlacementService.addLessonRange(
      this.templatePlacements,
      this.availableTemplates,
      templateId,
      this.currentCurriculum.length,
    );

    this.applyTemplatePlacementsToLessons();
    this.renderTemplatePlacementUI();
    this.renderCurriculumPreview();
    this.persistTemplatePlacements();
  }

  private removeLessonRange(templateId: string, rangeIndex: number): void {
    this.templatePlacements = TemplatePlacementService.removeLessonRange(
      this.templatePlacements,
      templateId,
      rangeIndex,
    );

    this.applyTemplatePlacementsToLessons();
    this.renderTemplatePlacementUI();
    this.renderCurriculumPreview();
    this.persistTemplatePlacements();
  }

  private updateLessonRange(
    templateId: string,
    rangeIndex: number,
    isStart: boolean,
    value: number,
  ): void {
    this.templatePlacements = TemplatePlacementService.updateLessonRange(
      this.templatePlacements,
      templateId,
      rangeIndex,
      isStart,
      value,
    );

    this.applyTemplatePlacementsToLessons();
    this.renderCurriculumPreview();
    this.persistTemplatePlacements();
  }

  private getTemplatePlacement(
    templateId: string,
  ): TemplatePlacementConfig | undefined {
    return TemplatePlacementService.findPlacement(
      templateId,
      this.templatePlacements,
      this.availableTemplates,
    );
  }

  private lookupTemplateSummary(
    templateId: string | null | undefined,
  ): TemplateSummary | undefined {
    return TemplatePlacementService.lookupTemplateSummary(templateId, this.availableTemplates);
  }

  private normalizeTemplateDefinition(raw: unknown): TemplateDefinition {
    const payload = this.parseTemplateDefinition(raw);
    if (!payload) {
      return {
        name: null,
        blocks: [],
        settings: {},
      };
    }

    const name =
      typeof payload.name === "string" && payload.name.trim().length
        ? payload.name.trim()
        : null;
    const settings =
      payload.settings && typeof payload.settings === "object" && !Array.isArray(payload.settings)
        ? (payload.settings as Record<string, unknown>)
        : {};

    const rawBlocks = Array.isArray(payload.blocks) ? payload.blocks : [];
    const blocks = rawBlocks
      .map((block, index) => this.normalizeTemplateBlock(block, index))
      .filter((block): block is TemplateDefinitionBlock => block !== null)
      .sort((a, b) => a.order - b.order);

    return {
      name,
      blocks,
      settings,
    };
  }

  private parseTemplateDefinition(raw: unknown): Record<string, unknown> | null {
    if (!raw) {
      return null;
    }

    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>;
        }
      } catch (error) {
        console.warn("CurriculumManager: failed to parse template definition JSON", error);
        return null;
      }
    }

    if (typeof raw === "object" && !Array.isArray(raw)) {
      return raw as Record<string, unknown>;
    }

    return null;
  }

  private normalizeTemplateTypeName(type: string | null | undefined): string | null {
    if (!type || typeof type !== "string") {
      return null;
    }
    const normalized = type.trim().toLowerCase().replace(/[\s-]+/g, "_");
    if (!normalized) {
      return null;
    }
    const simplified = normalized.replace(/_(template|plan|layout)$/, "");
    return simplified || normalized;
  }

  private normalizeTemplateBlock(raw: unknown, fallbackIndex = 0): TemplateDefinitionBlock | null {
    if (!raw || typeof raw !== "object") {
      return null;
    }

    const block = raw as Record<string, unknown>;
    const type =
      typeof block.type === "string" && block.type.trim().length
        ? block.type.trim()
        : "content";
    const id =
      typeof block.id === "string" && block.id.trim().length
        ? block.id.trim()
        : `${type}-${fallbackIndex + 1}`;
    const order =
      typeof block.order === "number" && Number.isFinite(block.order)
        ? block.order
        : fallbackIndex;
    const config =
      block.config && typeof block.config === "object" && !Array.isArray(block.config)
        ? (block.config as Record<string, unknown>)
        : {};
    const content = typeof block.content === "string" ? block.content : "";

    return {
      id,
      type,
      order,
      config,
      content,
    };
  }

  private resolveLessonTemplateId(
    lesson: CurriculumLesson | null | undefined,
  ): string | null {
    if (!lesson) {
      return null;
    }

    const templateId =
      typeof lesson.templateId === "string" && lesson.templateId.trim().length
        ? lesson.templateId.trim()
        : null;

    return templateId;
  }

  private persistTemplatePlacements(): void {
    if (this.templatePlacementSaveTimeout) {
      clearTimeout(this.templatePlacementSaveTimeout);
    }

    this.templatePlacementSaveTimeout = window.setTimeout(() => {
      void this.commitTemplatePlacements();
    }, 400);
  }

  private async commitTemplatePlacements(): Promise<void> {
    this.templatePlacementSaveTimeout = null;

    if (!this.courseId) {
      return;
    }

    this.syncTemplatePlacements();

    try {
      await this.saveCurriculumToDatabase(this.currentCurriculum);
    } catch (error) {
      console.error("Failed to persist template placements:", error);
    }
  }

  private applyTemplatePlacementsToLessons(): void {
    const lessons = Array.isArray(this.currentCurriculum) ? this.currentCurriculum : [];
    if (!lessons.length) {
      return;
    }

    TemplatePlacementService.applyToLessons(this.templatePlacements, lessons);
  }

  private async regenerateAndSaveCurriculum(): Promise<void> {
    if (!this.contentLoadConfig) {
      console.warn("Content load configuration not available.");
      return;
    }

    if (!this.courseId) {
      console.warn("No course ID available for curriculum regeneration.");
      return;
    }

    try {
      console.log('🔄 Regenerating curriculum with new structure:', {
        topics: this.contentLoadConfig.topicsPerLesson,
        objectives: this.contentLoadConfig.objectivesPerTopic,
        tasks: this.contentLoadConfig.tasksPerObjective
      });

      // Double-check the content load config values

      // Get the number of lessons from schedule
      const { data: scheduleData } = await supabase
        .from("courses")
        .select("schedule_settings, course_sessions")
        .eq("id", this.courseId)
        .single();

      const numLessons = scheduleData?.course_sessions || 1;

      console.log('🔍 LESSON COUNT CHECK:', {
        fromDatabase_course_sessions: scheduleData?.course_sessions,
        currentCurriculumLength: this.currentCurriculum.length,
        willCreate: numLessons,
        discrepancy: this.currentCurriculum.length !== numLessons ? '⚠️ MISMATCH!' : '✅ Match'
      });

      // Create new curriculum structure with current settings
      const newCurriculum = this.createCurriculumStructure(numLessons);

      // Debug: Log the actual structure created
      console.log('🏗️ Created curriculum structure sample:', {
        firstLesson: newCurriculum[0] ? {
          topicsCount: newCurriculum[0].topics.length,
          firstTopic: newCurriculum[0].topics[0] ? {
            objectivesCount: newCurriculum[0].topics[0].objectives.length,
            tasksCount: newCurriculum[0].topics[0].tasks.length
          } : null
        } : null
      });

      // Preserve existing lesson and topic titles if they exist
      if (this.currentCurriculum && this.currentCurriculum.length > 0) {
        newCurriculum.forEach((newLesson, lessonIndex) => {
          const existingLesson = this.currentCurriculum[lessonIndex];
          if (existingLesson) {
            // Preserve lesson title
            newLesson.title = existingLesson.title;

            // Preserve topic titles and content where they exist
            newLesson.topics.forEach((newTopic, topicIndex) => {
              const existingTopic = existingLesson.topics[topicIndex];
              if (existingTopic) {
                newTopic.title = existingTopic.title;

                // Preserve objectives where they exist
                newTopic.objectives.forEach((_, objIndex) => {
                  if (existingTopic.objectives[objIndex]) {
                    newTopic.objectives[objIndex] = existingTopic.objectives[objIndex];
                  }
                });

                // Preserve tasks where they exist
                newTopic.tasks.forEach((_, taskIndex) => {
                  if (existingTopic.tasks[taskIndex]) {
                    newTopic.tasks[taskIndex] = existingTopic.tasks[taskIndex];
                  }
                });
              }
            });
          }
        });
      }

      // Save to database
      console.log('📋 Final curriculum structure before save:', {
        lessonsCount: newCurriculum.length,
        firstLesson: newCurriculum[0] ? {
          title: newCurriculum[0].title,
          topicsCount: newCurriculum[0].topics.length,
          firstTopic: newCurriculum[0].topics[0] ? {
            title: newCurriculum[0].topics[0].title,
            objectivesCount: newCurriculum[0].topics[0].objectives.length,
            tasksCount: newCurriculum[0].topics[0].tasks.length,
            objectives: newCurriculum[0].topics[0].objectives,
            tasks: newCurriculum[0].topics[0].tasks
          } : null
        } : null
      });
      await this.saveCurriculumToDatabase(newCurriculum);

      // Update current curriculum and refresh display
      this.currentCurriculum = newCurriculum;
      this.renderCurriculumPreview();

    } catch (error) {
      console.error("❌ Error regenerating curriculum:", error);
    }
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

  private computeCompetenciesPerLesson(topicsPerLesson: number): number {
    if (!topicsPerLesson || topicsPerLesson <= 1) {
      return 1;
    }
    return Math.min(topicsPerLesson, Math.max(1, Math.ceil(topicsPerLesson / 2)));
  }

  private resolveCompetencyCountForTopics(topicsCount: number): number {
    if (topicsCount <= 1) {
      return 1;
    }
    const configured =
      this.contentLoadConfig?.competenciesPerLesson && this.contentLoadConfig.competenciesPerLesson > 0
        ? this.contentLoadConfig.competenciesPerLesson
        : null;
    if (configured) {
      return Math.min(Math.max(1, configured), topicsCount);
    }
    return Math.min(this.computeCompetenciesPerLesson(topicsCount), topicsCount);
  }

  private normalizeTopicStructure(topic: CurriculumTopic, fallbackIndex: number): CurriculumTopic {
    const title =
      typeof topic?.title === "string" && topic.title.trim().length
        ? topic.title.trim()
        : `Topic ${fallbackIndex + 1}`;

    return {
      title,
      objectives: this.normalizeStringArray(topic?.objectives),
      tasks: this.normalizeStringArray(topic?.tasks),
    };
  }

  private normalizeStringArray(values: unknown): string[] {
    if (!Array.isArray(values)) {
      return [];
    }

    return values
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .map((value) => (value.length ? value : null))
      .filter((value): value is string => value !== null);
  }

  private generateCompetenciesFromTopics(topics: CurriculumTopic[]): CurriculumCompetency[] {
    if (!topics.length) {
      return [];
    }

    const competencyCount = this.resolveCompetencyCountForTopics(topics.length);
    const topicsPerCompetency = Math.max(1, Math.ceil(topics.length / competencyCount));
    const competencies: CurriculumCompetency[] = [];

    for (let i = 0; i < competencyCount; i += 1) {
      const startIndex = i * topicsPerCompetency;
      const topicSlice = topics.slice(startIndex, startIndex + topicsPerCompetency);
      if (!topicSlice.length) {
        continue;
      }

      competencies.push({
        title: `Competency ${i + 1}`,
        competencyNumber: i + 1,
        topics: topicSlice,
      });
    }

    return competencies;
  }

  private ensureLessonCompetenciesRef(lesson: CurriculumLesson): CurriculumCompetency[] {
    if (!Array.isArray(lesson.competencies) || !lesson.competencies.length) {
      const topics = Array.isArray(lesson.topics) ? lesson.topics : [];
      lesson.competencies = this.generateCompetenciesFromTopics(topics);
    }
    return lesson.competencies as CurriculumCompetency[];
  }

  private normalizeLessonCompetenciesForPersistence(lesson: CurriculumLesson): void {
    const rawTopics = Array.isArray(lesson.topics) ? lesson.topics : [];
    const normalizedTopics = rawTopics.map((topic, index) => this.normalizeTopicStructure(topic, index));

    lesson.topics = normalizedTopics;

    const existingCompetencies = (lesson as unknown as { competencies?: CurriculumCompetency[] }).competencies;

    if (Array.isArray(existingCompetencies) && existingCompetencies.length) {
      const sanitized = existingCompetencies
        .map<CurriculumCompetency | null>((competency, index) => {
          const topics = Array.isArray(competency?.topics) ? competency.topics : [];
          const normalized = topics.length ? topics.map((topic, topicIndex) => this.normalizeTopicStructure(topic, topicIndex)) : [];
          if (!normalized.length) {
            return null;
          }

          const normalizedCompetency: CurriculumCompetency = {
            title:
              typeof competency.title === "string" && competency.title.trim().length
                ? competency.title.trim()
                : `Competency ${index + 1}`,
            competencyNumber: competency.competencyNumber ?? index + 1,
            topics: normalized,
          };

          return normalizedCompetency;
        })
        .filter((competency): competency is CurriculumCompetency => competency !== null);

      const competencies = sanitized.length ? sanitized : this.generateCompetenciesFromTopics(normalizedTopics);
      lesson.competencies = competencies;
      lesson.topics = competencies.flatMap((competency) => competency.topics);
      return;
    }

    lesson.competencies = this.generateCompetenciesFromTopics(normalizedTopics);
  }

  private attachCompetenciesToLessons(lessons: CurriculumLesson[]): CurriculumLesson[] {
    return lessons.map((lesson) => {
      this.normalizeLessonCompetenciesForPersistence(lesson);
      return lesson;
    });
  }

  private hydrateLessonFromCompetencies(lesson: CurriculumLesson): void {
    const competencyList = (lesson as unknown as { competencies?: CurriculumCompetency[] }).competencies;
    if (Array.isArray(competencyList) && competencyList.length) {
      const normalizedCompetencies: CurriculumCompetency[] = [];
      let topicCounter = 0;

      competencyList.forEach((competency, index) => {
        const topics = Array.isArray(competency.topics) ? competency.topics : [];
        const normalizedTopics = topics.map((topic) => {
          const normalized = this.normalizeTopicStructure(topic, topicCounter);
          topicCounter += 1;
          return normalized;
        });

        normalizedCompetencies.push({
          title:
            typeof competency.title === "string" && competency.title.trim().length
              ? competency.title.trim()
              : `Competency ${competency.competencyNumber ?? index + 1}`,
          competencyNumber: competency.competencyNumber ?? index + 1,
          topics: normalizedTopics,
        });
      });

      const flattenedTopics = normalizedCompetencies.flatMap((competency) => competency.topics);
      lesson.topics = flattenedTopics;
      lesson.competencies = normalizedCompetencies;
      return;
    }

    if (!lesson.competencies || !lesson.competencies.length) {
      lesson.competencies = this.generateCompetenciesFromTopics(Array.isArray(lesson.topics) ? lesson.topics : []);
    }
  }

  private hydrateLessonsFromCompetencies(lessons: CurriculumLesson[]): void {
    lessons.forEach((lesson) => this.hydrateLessonFromCompetencies(lesson));
  }

  private createCurriculumStructure(numLessons: number): CurriculumLesson[] {
    if (!this.contentLoadConfig) return [];

    console.log('🏗️ Creating curriculum structure with:', {
      numLessons,
      topicsPerLesson: this.contentLoadConfig.topicsPerLesson,
      objectivesPerTopic: this.contentLoadConfig.objectivesPerTopic,
      tasksPerObjective: this.contentLoadConfig.tasksPerObjective
    });

    const curriculum: CurriculumLesson[] = [];

    for (let i = 1; i <= numLessons; i++) {
      const lesson: CurriculumLesson = {
        lessonNumber: i,
        title: "",
        topics: [],
      };


      for (let j = 1; j <= this.contentLoadConfig.topicsPerLesson; j++) {
        const topic: CurriculumTopic = {
          title: "",
          objectives: [],
          tasks: [],
        };

        // Add objectives
        for (let k = 1; k <= this.contentLoadConfig.objectivesPerTopic; k++) {
          topic.objectives.push("");
        }

        // Add tasks - now creating tasksPerObjective for each objective
        const totalTasksForTopic = this.contentLoadConfig.objectivesPerTopic * this.contentLoadConfig.tasksPerObjective;
        for (let l = 1; l <= totalTasksForTopic; l++) {
          topic.tasks.push("");
        }

        lesson.topics.push(topic);
      }

      lesson.competencies = this.generateCompetenciesFromTopics(lesson.topics);
      curriculum.push(lesson);
    }

    console.log('🎯 Final curriculum structure created:', {
      totalLessons: curriculum.length,
      eachLessonHasTopics: curriculum.map(lesson => lesson.topics.length)
    });

    return curriculum;
  }

  private buildStructurePayload(): CurriculumStructureConfig | undefined {
    if (!this.contentLoadConfig) {
      if (this.scheduledLessonDuration) {
        return {
          scheduledLessonDuration: this.scheduledLessonDuration,
        };
      }
      return undefined;
    }

    return {
      durationType: this.contentLoadConfig.type,
      scheduledLessonDuration: this.contentLoadConfig.duration,
      topicsPerLesson: this.contentLoadConfig.topicsPerLesson,
      competenciesPerLesson: this.contentLoadConfig.competenciesPerLesson,
      objectivesPerTopic: this.contentLoadConfig.objectivesPerTopic,
      tasksPerObjective: this.contentLoadConfig.tasksPerObjective,
    };
  }

  // ============================================================================
  // MODULE ORGANIZATION HELPERS
  // ============================================================================

  /**
   * Extracts a flat list of lessons from a hierarchical module structure
   */
  private extractLessonsFromModules(modules: CurriculumModule[]): CurriculumLesson[] {
    const lessons: CurriculumLesson[] = [];
    let lessonCounter = 1;

    console.log('🔄 Extracting lessons from modules:', {
      modulesCount: modules.length,
      lessonsPerModule: modules.map(m => m.lessons.length)
    });

    for (const module of modules) {
      for (const lesson of module.lessons) {
        this.hydrateLessonFromCompetencies(lesson);
        // Re-number lessons sequentially across all modules
        lessons.push({
          ...lesson,
          lessonNumber: lessonCounter++,
          moduleNumber: module.moduleNumber,
        });
      }
    }

    console.log('✅ Extracted lessons:', {
      totalExtracted: lessons.length,
      lessonNumbers: lessons.map(l => l.lessonNumber)
    });

    this.updateLessonStructureCountsFromLessons(lessons);

    return lessons;
  }

  private extractStructureNumber(source: Record<string, unknown> | null | undefined, keys: string[]): number | null {
    if (!source) {
      return null;
    }

    for (const key of keys) {
      const value = (source as Record<string, unknown>)[key];
      if (typeof value === "number" && Number.isFinite(value)) {
        return value;
      }
    }

    return null;
  }

  private computeLessonStructureSummary(lesson: CurriculumLesson): { topics: number; objectives: number; tasks: number } {
    const baseSummary = LessonStructure.summarize(lesson);
    let topics = baseSummary.topics;
    let objectives = baseSummary.objectives;
    let tasks = baseSummary.tasks;

    const lessonStructure = (lesson as unknown as { structure?: Record<string, unknown> }).structure;

    const extract = (keys: string[]): number | null =>
      this.extractStructureNumber(
        lessonStructure && typeof lessonStructure === "object" ? lessonStructure : null,
        keys,
      );

    if (!topics) {
      topics = extract(["topics", "topicsCount", "topicsPerLesson"]) ?? this.curriculumStructureDefaults?.topicsPerLesson ?? 0;
    }

    if (!objectives) {
      const explicitObjectives = extract(["objectives", "objectivesCount"]);
      if (explicitObjectives !== null) {
        objectives = explicitObjectives;
      } else {
        const perTopic = extract(["objectivesPerTopic"]) ?? this.curriculumStructureDefaults?.objectivesPerTopic;
        if (perTopic && topics) {
          objectives = topics * perTopic;
        }
      }
    }

    if (!tasks) {
      const explicitTasks = extract(["tasks", "tasksCount"]);
      if (explicitTasks !== null) {
        tasks = explicitTasks;
      } else {
        const perObjective = extract(["tasksPerObjective"]) ?? this.curriculumStructureDefaults?.tasksPerObjective;
        if (perObjective && objectives) {
          tasks = objectives * perObjective;
        }
      }
    }

    const summary = {
      topics,
      objectives,
      tasks,
    };

    Object.defineProperty(lesson, 'structureSummary', {
      value: summary,
      writable: true,
      configurable: true,
      enumerable: false,
    });

    return summary;
  }

  private normalizeModuleTitle(moduleNumber: number, title: string | null | undefined): string {
    const raw = typeof title === "string" ? title.trim() : "";
    if (raw.length > 0) {
      return raw;
    }
    return `Module ${moduleNumber}`;
  }

  private resolveModuleTitle(moduleNumber: number, fallback: string | null | undefined): string {
    const stored = this.initialModuleTitles.get(moduleNumber);
    if (typeof stored === "string") {
      const normalizedStored = stored.trim();
      if (normalizedStored.length > 0) {
        return normalizedStored;
      }
    }
    return this.normalizeModuleTitle(moduleNumber, fallback);
  }

  private storeModuleTitle(moduleNumber: number, title: string | null | undefined): void {
    const normalized = this.normalizeModuleTitle(moduleNumber, title);
    this.initialModuleTitles.set(moduleNumber, normalized);
  }

  private applyStoredModuleTitles(modules: CurriculumModule[]): void {
    modules.forEach((module) => {
      if (typeof module.moduleNumber !== "number") {
        return;
      }
      module.title = this.resolveModuleTitle(module.moduleNumber, module.title);
    });
  }

  private refreshModuleTitleRegistry(modules: CurriculumModule[]): void {
    const seen = new Set<number>();
    modules.forEach((module) => {
      if (typeof module.moduleNumber !== "number") {
        return;
      }
      seen.add(module.moduleNumber);
      this.storeModuleTitle(module.moduleNumber, module.title);
    });

    Array.from(this.initialModuleTitles.keys()).forEach((moduleNumber) => {
      if (!seen.has(moduleNumber)) {
        this.initialModuleTitles.delete(moduleNumber);
      }
    });
  }

  private updateLessonStructureCountsFromLessons(lessons: CurriculumLesson[]): void {
    this.lessonStructureCounts.clear();

    lessons.forEach((lesson, index) => {
      const lessonNumber = typeof lesson.lessonNumber === "number" && lesson.lessonNumber > 0 ? lesson.lessonNumber : index + 1;
      const summary = this.computeLessonStructureSummary(lesson);
      this.lessonStructureCounts.set(lessonNumber, summary);
    });
  }

  /**
   * Organizes a flat list of lessons into modules based on organization type
   */
  private organizeLessonsIntoModules(lessons: CurriculumLesson[]): CurriculumModule[] {
    let modules: CurriculumModule[] = [];

    if (this.moduleOrganization === "linear") {
      if (!lessons.length) {
        return [];
      }

      lessons.forEach((lesson) => {
        lesson.moduleNumber = 1;
      });

      modules = [
        {
          moduleNumber: 1,
          title: this.resolveModuleTitle(1, "Module 1"),
          lessons,
        },
      ];
    } else if (this.moduleOrganization === "equal") {
      modules = this.assignModuleNumbers(this.distributeEqualModules(lessons));
    } else if (this.moduleOrganization === "tiered") {
      modules = this.assignModuleNumbers(this.createTieredModules(lessons));
    } else if (this.moduleOrganization === "custom") {
      // Custom organization - use existing module structure if available
      // Otherwise create a default single module
      if (this.currentModules.length > 0) {
        modules = this.assignModuleNumbers(this.currentModules);
      } else {
        const fallbackModules = [
          {
            moduleNumber: 1,
            title: "Module 1",
            lessons,
          },
        ];
        modules = this.assignModuleNumbers(fallbackModules);
      }
    }

    if (modules.length > 0) {
      this.applyStoredModuleTitles(modules);
    }

    return modules;
  }

  /**
   * Distributes lessons evenly across modules
   * Algorithm: divide lessons into n modules with max size difference of 1
   * Example: 11 lessons → 3 modules = [4, 4, 3]
   */
  private distributeEqualModules(lessons: CurriculumLesson[]): CurriculumModule[] {
    const totalLessons = lessons.length;

    console.log('📊 Distributing lessons into equal modules:', { totalLessons });

    // Default to 3 modules, but adjust based on lesson count
    let numModules = 3;
    if (totalLessons <= 3) numModules = 1;
    else if (totalLessons <= 6) numModules = 2;
    else if (totalLessons <= 12) numModules = 3;
    else if (totalLessons <= 24) numModules = 4;
    else numModules = Math.ceil(totalLessons / 6); // Approx 6 lessons per module

    const baseSize = Math.floor(totalLessons / numModules);
    const remainder = totalLessons % numModules;

    console.log('📐 Distribution calculation:', { numModules, baseSize, remainder });

    const modules: CurriculumModule[] = [];
    let lessonIndex = 0;

    for (let i = 0; i < numModules; i++) {
      // DISTRIBUTE REMAINDER EVENLY: Last 'remainder' modules get an extra lesson
      // This avoids front-loading and keeps modules more balanced visually
      const moduleSize = baseSize + (i >= (numModules - remainder) ? 1 : 0);
      // Create deep copies of lessons to avoid circular references
      const moduleLessons = lessons.slice(lessonIndex, lessonIndex + moduleSize).map(lesson => ({
        ...lesson,
        moduleNumber: i + 1
      }));

      console.log(`📦 Module ${i + 1}: ${moduleSize} lessons (${moduleLessons.map(l => l.lessonNumber).join(', ')})`);

      modules.push({
        moduleNumber: i + 1,
        title: `Module ${i + 1}`,
        lessons: moduleLessons
      });

      lessonIndex += moduleSize;
    }

    return modules;
  }

  private assignModuleNumbers(modules: CurriculumModule[]): CurriculumModule[] {
    modules.forEach((module) => {
      module.lessons.forEach((lesson) => {
        lesson.moduleNumber = module.moduleNumber;
      });
    });
    return modules;
  }

  /**
   * Creates three tiered modules: Introduction, Core Content, and Project/Assessment
   */
  private createTieredModules(lessons: CurriculumLesson[]): CurriculumModule[] {
    const totalLessons = lessons.length;

    // Tiered distribution: ~20% intro, ~60% core, ~20% project
    const introSize = Math.max(1, Math.ceil(totalLessons * 0.2));
    const projectSize = Math.max(1, Math.ceil(totalLessons * 0.2));
    const coreSize = totalLessons - introSize - projectSize;

    const introLessons = lessons.slice(0, introSize);
    introLessons.forEach((lesson) => {
      lesson.moduleNumber = 1;
    });

    const coreLessons = lessons.slice(introSize, introSize + coreSize);
    coreLessons.forEach((lesson) => {
      lesson.moduleNumber = 2;
    });

    const projectLessons = lessons.slice(introSize + coreSize);
    projectLessons.forEach((lesson) => {
      lesson.moduleNumber = 3;
    });

    return [
      {
        moduleNumber: 1,
        title: "Introduction & Foundations",
        lessons: introLessons,
      },
      {
        moduleNumber: 2,
        title: "Core Content",
        lessons: coreLessons,
      },
      {
        moduleNumber: 3,
        title: "Application & Assessment",
        lessons: projectLessons,
      },
    ];
  }

  private async saveCurriculumToDatabase(
    curriculum: CurriculumLesson[],
  ): Promise<void> {
    if (!this.courseId) {
      console.warn('📚 Cannot save curriculum: no course ID available');
      throw new Error('No course ID available for saving curriculum');
    }

    this.updateLessonStructureCountsFromLessons(curriculum);

    // Organize lessons into modules based on organization type
    const modules = this.organizeLessonsIntoModules(curriculum);

    console.log('💾 Saving curriculum structure to database:', {
      courseId: this.courseId,
      lessonsCount: curriculum.length,
      moduleOrganization: this.moduleOrganization,
      modulesCount: modules.length,
      sampleStructure: curriculum[0] ? {
        topicsCount: curriculum[0].topics.length,
        objectivesCount: curriculum[0].topics[0]?.objectives.length,
        tasksCount: curriculum[0].topics[0]?.tasks.length
      } : null
    });

    // Create deep copies to avoid circular references
    const curriculumCopy = JSON.parse(JSON.stringify(curriculum)) as CurriculumLesson[];
    const modulesCopy = JSON.parse(JSON.stringify(modules)) as CurriculumModule[];

    const normalizedLessons = this.attachCompetenciesToLessons(curriculumCopy);
    modulesCopy.forEach((module) => {
      module.lessons = this.attachCompetenciesToLessons(Array.isArray(module.lessons) ? module.lessons : []);
    });

    const payload: CurriculumDataPayload = {
      structure: this.buildStructurePayload(),
      moduleOrganization: this.moduleOrganization,
      templatePlacements: this.templatePlacements,
      courseType: this.courseType,
    };

    // Save either as modules or legacy lessons format
    if (modulesCopy.length) {
      payload.modules = modulesCopy;
    }

    if (this.moduleOrganization === "linear") {
      // Legacy format for backward compatibility
      payload.lessons = normalizedLessons;
    } else if (!payload.modules) {
      // Ensure module-based format persists modules when available
      payload.modules = modulesCopy;
    }

    this.currentModules = modules;
    this.refreshModuleTitleRegistry(modules);

    // Final safety check: ensure no circular references in payload
    try {
      JSON.stringify(payload);
    } catch (circularRefError) {
      console.error('❌ Circular reference detected in payload before save:', circularRefError);
      throw new Error('Failed to serialize curriculum data: ' + (circularRefError instanceof Error ? circularRefError.message : 'Circular reference detected'));
    }

    const { error } = await supabase
      .from("courses")
      .update({
        curriculum_data: payload,
      })
      .eq("id", this.courseId);

    if (error) {
      console.error('❌ Database save error:', error);
      throw error;
    }

    this.syncTemplatePlacements();
    this.renderTemplatePlacementUI();

    await this.ensureLessonCanvases(curriculum);

    document.dispatchEvent(
      new CustomEvent('curriculumDataUpdated', {
        detail: { courseId: this.courseId },
      }),
    );
  }

  private async ensureLessonCanvases(curriculum: CurriculumLesson[]): Promise<void> {
    if (!this.courseId || !Array.isArray(curriculum) || curriculum.length === 0) {
      // Even with empty curriculum we may still need to provision canvases based on schedule.
      if (!this.courseId) {
        return;
      }
    }

    try {
      this.syncCanvasBuilderContext();

      // Query canvases - handle both old schema (lesson_number only) and new schema (lesson_id + lesson_number)
      let { data: existingCanvases, error } = await supabase
        .from('canvases')
        .select('id, lesson_number, canvas_index')
        .eq('course_id', this.courseId);

      // Try to also get lesson_id if it exists (new schema)
      if (!error) {
        const { data: canvasesWithLessonId } = await supabase
          .from('canvases')
          .select('id, lesson_id, lesson_number, canvas_index')
          .eq('course_id', this.courseId);
        
        if (canvasesWithLessonId) {
          existingCanvases = canvasesWithLessonId;
        }
      }

      if (error) {
        console.warn('⚠️ Failed to load existing canvases for sync:', error);
        return;
      }

      const { data: courseSchedule } = await supabase
        .from('courses')
        .select('course_sessions, schedule_settings')
        .eq('id', this.courseId)
        .single();

      const scheduledFromCourse =
        typeof courseSchedule?.course_sessions === 'number' && courseSchedule.course_sessions > 0
          ? courseSchedule.course_sessions
          : 0;
      const scheduledFromSchedule =
        Array.isArray(courseSchedule?.schedule_settings) && courseSchedule!.schedule_settings.length > 0
          ? courseSchedule!.schedule_settings.length
          : 0;

      // Load existing lessons for this course (if lessons table exists)
      let existingLessons: any[] | null = null;
      try {
        const { data: lessons, error: lessonsError } = await supabase
          .from('lessons')
          .select('id, lesson_number')
          .eq('course_id', this.courseId);
        
        if (!lessonsError) {
          existingLessons = lessons;
        }
      } catch (err) {
        // Lessons table might not exist yet if migrations haven't run
        console.log('Lessons table not available yet, will use lesson_number only');
      }

      const lessonIdMap = new Map<number, string>();
      existingLessons?.forEach((lesson: any) => {
        if (typeof lesson.lesson_number === 'number' && lesson.id) {
          lessonIdMap.set(lesson.lesson_number, lesson.id);
        }
      });
      
      const hasLessonsTable = existingLessons !== null;

      const existingMap = new Map<number, { id: string | null; canvas_index: number; lesson_id: string | null }>();
      existingCanvases?.forEach((canvas: any) => {
        if (
          typeof canvas.lesson_number === 'number' &&
          canvas.canvas_index === 1
        ) {
          existingMap.set(canvas.lesson_number, {
            id: typeof canvas.id === 'string' ? canvas.id : null,
            canvas_index: canvas.canvas_index,
            lesson_id: typeof canvas.lesson_id === 'string' ? canvas.lesson_id : null,
          });
        }
      });

      const lessonsByNumber = new Map<number, CurriculumLesson>();
      curriculum.forEach((lesson, index) => {
        const lessonNumber =
          typeof lesson.lessonNumber === 'number' && lesson.lessonNumber > 0
            ? lesson.lessonNumber
            : index + 1;
        lessonsByNumber.set(lessonNumber, { ...lesson, lessonNumber });
      });

      const highestCurriculumLesson = lessonsByNumber.size
        ? Math.max(...lessonsByNumber.keys())
        : curriculum.length;
      const highestExistingLesson = existingMap.size ? Math.max(...existingMap.keys()) : 0;
      const scheduledLessonTarget = Math.max(scheduledFromCourse, scheduledFromSchedule);
      const desiredLessonCount = Math.max(
        scheduledLessonTarget,
        highestCurriculumLesson,
        highestExistingLesson,
      );

      if (desiredLessonCount === 0) {
        return;
      }

      const templateIds = new Set<string>();
      for (const lesson of lessonsByNumber.values()) {
        const templateId = this.resolveLessonTemplateId(lesson);
        if (templateId) {
          templateIds.add(templateId);
        }
      }

      const templateMap = new Map<string, TemplateRecord>();
      if (templateIds.size > 0) {
        const { data: templates, error: templateError } = await supabase
          .from('templates')
          .select('id, template_id, template_type, template_description, template_data, course_id')
          .in('id', Array.from(templateIds));

        if (templateError) {
          console.error('⚠️ Failed to load templates for canvas generation:', templateError);
        } else if (Array.isArray(templates)) {
          templates.forEach((row: any) => {
            if (typeof row?.id === 'string') {
              templateMap.set(row.id, {
                id: row.id,
                template_id: row.template_id,
                template_type: row.template_type,
                template_description: row.template_description ?? null,
                template_data: this.normalizeTemplateDefinition(row.template_data),
                course_id: row.course_id ?? null,
              });
            }
          });
        }
      }

      const inserts: Array<Record<string, unknown>> = [];
      const updates: Array<{
        lessonNumber: number;
        canvasIndex: number;
        canvas_data: Record<string, unknown>;
        canvas_metadata: Record<string, unknown>;
      }> = [];

      // Track existing canvases per lesson for proper update logic
      const existingCanvasesPerLesson = new Map<number, Set<number>>();
      existingCanvases?.forEach((canvas) => {
        if (typeof canvas.lesson_number === 'number' && typeof canvas.canvas_index === 'number') {
          if (!existingCanvasesPerLesson.has(canvas.lesson_number)) {
            existingCanvasesPerLesson.set(canvas.lesson_number, new Set());
          }
          existingCanvasesPerLesson.get(canvas.lesson_number)!.add(canvas.canvas_index);
        }
      });

      // First, ensure all lessons exist in the lessons table (if it exists)
      if (hasLessonsTable) {
        for (let lessonNumber = 1; lessonNumber <= desiredLessonCount; lessonNumber += 1) {
          if (!lessonIdMap.has(lessonNumber)) {
            const lesson =
              lessonsByNumber.get(lessonNumber) ??
              ({
                lessonNumber,
                title: `Lesson ${lessonNumber}`,
                topics: [],
              } as CurriculumLesson);

            // Create lesson in lessons table
            const { data: newLesson, error: lessonError } = await supabase
              .from('lessons')
              .insert({
                course_id: this.courseId,
                lesson_number: lessonNumber,
                title: lesson.title || `Lesson ${lessonNumber}`,
                payload: {},
              })
              .select('id, lesson_number')
              .single();

            if (lessonError || !newLesson) {
              console.error(`Failed to create lesson ${lessonNumber}:`, lessonError);
              continue;
            }

            lessonIdMap.set(lessonNumber, newLesson.id);
          }
        }
      }

      for (let lessonNumber = 1; lessonNumber <= desiredLessonCount; lessonNumber += 1) {
        const lessonId = hasLessonsTable ? lessonIdMap.get(lessonNumber) : null;
        
        // If lessons table exists but no lesson_id found, skip
        if (hasLessonsTable && !lessonId) {
          console.warn(`⚠️ No lesson_id found for lesson ${lessonNumber}, skipping canvas creation`);
          continue;
        }

        const lesson =
          lessonsByNumber.get(lessonNumber) ??
          ({
            lessonNumber,
            title: `Lesson ${lessonNumber}`,
            topics: [],
          } as CurriculumLesson);

        const templateId = this.resolveLessonTemplateId(lesson);
        const templateRecord = templateId ? templateMap.get(templateId) : undefined;

        if (templateId && !templateRecord) {
          console.warn(`⚠️ Template ${templateId} not found for lesson ${lessonNumber}. Using fallback layout.`);
        }

        // Build multiple canvas payloads (for lesson templates: 3 canvases)
        const canvasPayloads = this.canvasBuilder.buildLessonCanvasPayloads(
          lesson,
          templateRecord,
          lessonNumber,
        );

        const existingCanvasIndices = existingCanvasesPerLesson.get(lessonNumber) || new Set();

        // Process each canvas payload
        canvasPayloads.forEach((payload) => {
          // Merge lessonData into canvas_metadata
          const mergedMetadata = {
            ...payload.canvasMetadata,
            ...payload.lessonData,
          };

          const recordBase = {
            canvas_data: payload.canvasData,
            canvas_metadata: mergedMetadata,
            canvas_index: payload.canvasIndex,
          };

          if (existingCanvasIndices.has(payload.canvasIndex)) {
            updates.push({
              lessonNumber,
              canvasIndex: payload.canvasIndex,
              canvas_data: recordBase.canvas_data as Record<string, unknown>,
              canvas_metadata: recordBase.canvas_metadata as Record<string, unknown>,
            });
          } else {
            // Build insert record - include lesson_id only if available
            const insertRecord: any = {
              course_id: this.courseId,
              lesson_number: lessonNumber,
              ...recordBase,
            };
            
            if (lessonId) {
              insertRecord.lesson_id = lessonId;
            }
            
            inserts.push(insertRecord);
          }
        });
      }

      if (inserts.length > 0) {
        const { error: insertError } = await supabase
          .from('canvases')
          .insert(inserts);

        if (insertError) {
          console.error('❌ Failed to create lesson canvases:', insertError);
        } else {
          console.log(
            `🖼️ Created ${inserts.length} lesson canvas${inserts.length === 1 ? '' : 'es'} with Yoga layout.`,
          );
        }
      }

      if (updates.length > 0) {
        await Promise.all(
          updates.map(async (record) => {
            const lessonId = hasLessonsTable ? lessonIdMap.get(record.lessonNumber) : null;
            
            // Build update query - use lesson_id if available, otherwise use lesson_number
            let updateQuery = supabase
              .from('canvases')
              .update({
                canvas_data: record.canvas_data,
                canvas_metadata: record.canvas_metadata,
              })
              .eq('course_id', this.courseId)
              .eq('canvas_index', record.canvasIndex);
            
            if (lessonId) {
              updateQuery = updateQuery.eq('lesson_id', lessonId);
            } else {
              updateQuery = updateQuery.eq('lesson_number', record.lessonNumber);
            }

            const { error: updateError } = await updateQuery;

            if (updateError) {
              console.error(
                `❌ Failed to update canvas for lesson ${record.lessonNumber}, canvas ${record.canvasIndex}:`,
                updateError,
              );
            }
          }),
        );

        console.log(
          `🛠️ Updated ${updates.length} canvas${updates.length === 1 ? '' : 'es'} with Yoga layout.`,
        );
      }

      // Dispatch event to notify that canvases are ready for loading
      const totalCanvases = inserts.length + updates.length;
      if (totalCanvases > 0) {
        console.log(`📢 Dispatching curriculum-canvases-ready event for ${totalCanvases} canvases`);
        document.dispatchEvent(new CustomEvent('curriculum-canvases-ready', {
          detail: {
            courseId: this.courseId,
            canvasCount: totalCanvases,
            inserts: inserts.length,
            updates: updates.length
          }
        }));
      }
    } catch (err) {
      console.error('❌ Unexpected error while ensuring lesson canvases:', err);
    }
  }

  /**
   * Clear all canvas cache for the current course
   * This will force canvases to be regenerated with the new hierarchical structure
   */
  public async clearCanvasCache(): Promise<void> {
    if (!this.courseId) {
      console.warn('⚠️ No course ID - cannot clear canvas cache');
      return;
    }

    try {
      console.log(`🗑️  Clearing canvas cache for course: ${this.courseId}`);
      
      const { data, error } = await supabase
        .from('canvases')
        .delete()
        .eq('course_id', this.courseId)
        .select();

      if (error) {
        console.error('❌ Error clearing canvas cache:', error);
        return;
      }

      const deletedCount = data?.length || 0;
      console.log(`✅ Successfully deleted ${deletedCount} canvas(es)`);
      console.log('🔄 Canvases will be regenerated with the new hierarchical structure when you save the curriculum.');
      
      // Regenerate canvases immediately
      if (this.currentCurriculum.length > 0) {
        console.log('🔄 Regenerating canvases...');
        await this.ensureLessonCanvases(this.currentCurriculum);
      }
    } catch (error) {
      console.error('❌ Failed to clear canvas cache:', error);
    }
  }

  private setPreviewMode(mode: PreviewMode): void {
    this.currentPreviewMode = mode;
    this.savePreviewMode(mode);
    this.highlightPreviewModeButton(mode);
    this.renderCurriculumPreview();
  }

  /**
   * Sets the module organization type and updates UI accordingly
   */
  private setModuleOrganization(organization: ModuleOrganizationType): void {
    this.moduleOrganization = organization;

    // Keep Modules button visible but grey out when "No Modules" (linear)
    const modulesButton = document.querySelector('button[data-mode="modules"]') as HTMLButtonElement;
    if (modulesButton) {
      if (organization === 'linear') {
        modulesButton.disabled = true;
        modulesButton.classList.add('opacity-50', 'cursor-not-allowed');
      } else {
        modulesButton.disabled = false;
        modulesButton.classList.remove('opacity-50', 'cursor-not-allowed');
      }
    }

    // Show/hide and enable/disable custom module configuration
    const customModulesConfig = document.getElementById('custom-modules-config');
    if (customModulesConfig) {
      if (organization === 'custom') {
        customModulesConfig.removeAttribute('hidden');
        customModulesConfig.classList.remove('opacity-60', 'pointer-events-none');
        this.renderCustomModuleRows();
      } else {
        // Keep visible but grey out when not custom
        customModulesConfig.removeAttribute('hidden');
        customModulesConfig.classList.add('opacity-60', 'pointer-events-none');
      }
    }

    console.log('📦 Module organization changed to:', organization);

    // If curriculum exists, reorganize and save
    if (this.currentCurriculum.length > 0) {
      this.saveCurriculumToDatabase(this.currentCurriculum);
      this.renderCurriculumPreview();
    }
  }

  private renderCurriculumPreview(): void {
    const curriculumPreviewMode: PreviewMode = "modules";

    const sectionsToRender = this.generationRenderer ? 2 : 1;
    let completedSections = 0;
    const onSectionRenderComplete = (): void => {
      completedSections += 1;
      if (completedSections >= sectionsToRender) {
        this.bindEditableEvents();
      }
    };

    // Update and render curriculum preview
    this.renderer.updateData({
      currentCurriculum: this.currentCurriculum,
      currentModules: this.currentModules,
      currentPreviewMode: curriculumPreviewMode,
      scheduledLessonDuration: this.scheduledLessonDuration,
      availableTemplates: this.availableTemplates,
      templatePlacements: this.templatePlacements,
      courseType: this.courseType,
      moduleOrganization: this.moduleOrganization,
      canvasSummaries: this.canvasSummaries,
    });
    this.renderer.renderCurriculumPreview(onSectionRenderComplete);

    // Update and render generation preview if it exists
    if (this.generationRenderer) {
      this.generationRenderer.updateData({
        currentCurriculum: this.currentCurriculum,
        currentModules: this.currentModules,
        currentPreviewMode: this.currentPreviewMode,
        scheduledLessonDuration: this.scheduledLessonDuration,
        availableTemplates: this.availableTemplates,
        templatePlacements: this.templatePlacements,
        courseType: this.courseType,
        moduleOrganization: this.moduleOrganization,
        canvasSummaries: this.canvasSummaries,
      });
      this.generationRenderer.renderCurriculumPreview(onSectionRenderComplete);
    }
  }

  private bindEditableEvents(): void {
    this.bindEditableEventsForSection(this.curriculumPreviewSection);
    this.bindEditableEventsForSection(this.generationPreviewSection);
  }

  private bindEditableEventsForSection(section: HTMLElement | null): void {
    if (!section) {
      return;
    }

    const editableElements = section.querySelectorAll(
      '[contenteditable="true"]',
    );
    editableElements.forEach((element) => {
      const editableElement = element as HTMLElement;

      editableElement.addEventListener("input", () => {
        this.handleEditableInput(editableElement);
      });

      editableElement.addEventListener("keydown", (event: KeyboardEvent) => {
        if (event.key === "Enter") {
          event.preventDefault();
          editableElement.blur();
        }
      });

      editableElement.addEventListener("blur", () => {
        this.updateCurriculumData(editableElement);
      });
    });
  }

  private updateCurriculumData(element: HTMLElement): void {
    const context = this.extractEditableContext(element);
    console.log('📝 updateCurriculumData called with context:', context, 'element:', element);
    const key = this.getEditableContextKey(context);
    if (key && this.editableUpdateTimers.has(key)) {
      clearTimeout(this.editableUpdateTimers.get(key)!);
      this.editableUpdateTimers.delete(key);
    }

    const rawValue = element.textContent || "";
    const newValue = this.normalizeEditableValue(rawValue);
    console.log('📝 Calling applyEditableContext with newValue:', newValue);
    this.applyEditableContext(context, newValue);
  }

  private handleEditableInput(element: HTMLElement): void {
    const context = this.extractEditableContext(element);
    const key = this.getEditableContextKey(context);
    if (!key) {
      return;
    }

    if (this.editableUpdateTimers.has(key)) {
      clearTimeout(this.editableUpdateTimers.get(key)!);
    }

    const rawValue = element.textContent || "";
    const newValue = this.normalizeEditableValue(rawValue);

    const timerId = window.setTimeout(() => {
      this.editableUpdateTimers.delete(key);
      this.applyEditableContext(context, newValue);
    }, 600);

    this.editableUpdateTimers.set(key, timerId);
  }

  private normalizeEditableValue(value: string): string {
    return value.replace(/\s+/g, " ").trim();
  }

  private extractEditableContext(element: HTMLElement): EditableContext {
    const parseDatasetNumber = (value: string | undefined): number | null => {
      if (typeof value !== "string" || value.trim().length === 0) {
        return null;
      }
      const parsed = parseInt(value, 10);
      return Number.isNaN(parsed) ? null : parsed;
    };

    return {
      moduleNum: parseDatasetNumber(element.dataset.module),
      lessonNum: parseDatasetNumber(element.dataset.lesson),
      topicIndex: parseDatasetNumber(element.dataset.topic),
      competencyIndex: parseDatasetNumber(element.dataset.competency),
      objectiveIndex: parseDatasetNumber(element.dataset.objective),
      taskIndex: parseDatasetNumber(element.dataset.task),
      field: element.dataset.field ?? null,
    };
  }

  private getEditableContextKey(context: EditableContext): string | null {
    if (!context.field) {
      return null;
    }

    const parts = [
      context.field,
      context.moduleNum !== null ? `m${context.moduleNum}` : "",
      context.lessonNum !== null ? `l${context.lessonNum}` : "",
      context.topicIndex !== null ? `t${context.topicIndex}` : "",
      context.competencyIndex !== null ? `c${context.competencyIndex}` : "",
      context.objectiveIndex !== null ? `o${context.objectiveIndex}` : "",
      context.taskIndex !== null ? `k${context.taskIndex}` : "",
    ].filter(Boolean);

    if (!parts.length) {
      return null;
    }

    return parts.join("-");
  }

  private updateLessonInModules(
    lessonNumber: number,
    updater: (lesson: CurriculumLesson) => void,
  ): void {
    this.currentModules.forEach((module) => {
      module.lessons.forEach((moduleLesson) => {
        if (moduleLesson.lessonNumber === lessonNumber) {
          this.ensureLessonCompetenciesRef(moduleLesson);
          updater(moduleLesson);
        }
      });
    });
  }

  private applyEditableContext(context: EditableContext, newValue: string): void {
    console.log('🎯 applyEditableContext called:', { context, newValue, currentCurriculumLength: this.currentCurriculum.length });
    const { moduleNum, lessonNum, topicIndex, competencyIndex, objectiveIndex, taskIndex, field } = context;

    if (!field) {
      console.warn('❌ No field in context, returning');
      return;
    }

    let didChange = false;

    if (field === "title" && moduleNum !== null && lessonNum === null) {
      const updatedTitle = this.normalizeModuleTitle(moduleNum, newValue);
      const module = this.currentModules.find(m => m.moduleNumber === moduleNum);
      const existingTitle = module?.title ? module.title.trim() : this.initialModuleTitles.get(moduleNum) ?? "";

      if (existingTitle !== updatedTitle) {
        if (module) {
          module.title = updatedTitle;
        }
        console.log(`📦 Updated module ${moduleNum} title to: ${updatedTitle}`);
        this.storeModuleTitle(moduleNum, updatedTitle);
        didChange = true;
      }
    } else if (lessonNum !== null && lessonNum > 0) {
      console.log(`🔍 Looking for lesson ${lessonNum} in currentCurriculum (length: ${this.currentCurriculum.length})`);
      const lesson = this.currentCurriculum.find((l) => l.lessonNumber === lessonNum);
      if (!lesson) {
        console.error(`❌ Lesson ${lessonNum} not found in currentCurriculum!`);
        return;
      }
      console.log(`✅ Found lesson ${lessonNum}:`, lesson);

      if (field === "competency-title" && competencyIndex !== null) {
        const competencies = this.ensureLessonCompetenciesRef(lesson);
        const competency = competencies[competencyIndex];
        if (competency) {
          const nextTitle = newValue || `Competency ${competency.competencyNumber ?? competencyIndex + 1}`;
          if (competency.title !== nextTitle) {
            competency.title = nextTitle;
            this.updateLessonInModules(lessonNum, (moduleLesson) => {
              const moduleCompetencies = this.ensureLessonCompetenciesRef(moduleLesson);
              if (moduleCompetencies[competencyIndex]) {
                moduleCompetencies[competencyIndex].title = nextTitle;
              }
            });
            didChange = true;
          }
        }
      } else if (field === "title" && topicIndex === null) {
        console.log(`📝 Updating lesson ${lessonNum} title from "${lesson.title}" to "${newValue}"`);
        if (lesson.title !== newValue) {
          lesson.title = newValue;
          this.updateLessonInModules(lessonNum, (moduleLesson) => {
            moduleLesson.title = newValue;
          });
          didChange = true;
          console.log(`✅ Lesson title updated successfully`);
        } else {
          console.log(`⚠️ Lesson title unchanged (same value)`);
        }
      } else if (topicIndex !== null && lesson.topics[topicIndex]) {
        const topic = lesson.topics[topicIndex];

        if (field === "title") {
          if (topic.title !== newValue) {
            topic.title = newValue;
            this.updateLessonInModules(lessonNum, (moduleLesson) => {
              if (moduleLesson.topics && moduleLesson.topics[topicIndex]) {
                moduleLesson.topics[topicIndex].title = newValue;
              }
            });
            didChange = true;
          }
        } else if (objectiveIndex !== null) {
          if (
            topic.objectives &&
            topic.objectives[objectiveIndex] !== undefined &&
            topic.objectives[objectiveIndex] !== newValue
          ) {
            topic.objectives[objectiveIndex] = newValue;
            this.updateLessonInModules(lessonNum, (moduleLesson) => {
              if (
                moduleLesson.topics &&
                moduleLesson.topics[topicIndex] &&
                moduleLesson.topics[topicIndex].objectives &&
                moduleLesson.topics[topicIndex].objectives[objectiveIndex] !== undefined
              ) {
                moduleLesson.topics[topicIndex].objectives[objectiveIndex] = newValue;
              }
            });
            didChange = true;
          }
        } else if (taskIndex !== null) {
          if (
            topic.tasks &&
            topic.tasks[taskIndex] !== undefined &&
            topic.tasks[taskIndex] !== newValue
          ) {
            topic.tasks[taskIndex] = newValue;
            this.updateLessonInModules(lessonNum, (moduleLesson) => {
              if (
                moduleLesson.topics &&
                moduleLesson.topics[topicIndex] &&
                moduleLesson.topics[topicIndex].tasks &&
                moduleLesson.topics[topicIndex].tasks[taskIndex] !== undefined
              ) {
                moduleLesson.topics[topicIndex].tasks[taskIndex] = newValue;
              }
            });
            didChange = true;
          }
        }
      }
    }

    if (didChange) {
      console.log('💾 Changes detected, calling saveCurriculumToDatabase');
      this.saveCurriculumToDatabase(this.currentCurriculum);
    } else {
      console.log('⏭️ No changes detected, skipping save');
    }
  }

  private applyStructureConfig(structure?: CurriculumStructureConfig): void {
    if (!structure) {
      return;
    }

    if (
      typeof structure.scheduledLessonDuration === "number" &&
      !Number.isNaN(structure.scheduledLessonDuration)
    ) {
      this.scheduledLessonDuration = structure.scheduledLessonDuration;
    }

    const rawDuration =
      structure.scheduledLessonDuration ??
      this.contentLoadConfig?.duration ??
      this.scheduledLessonDuration;

    // Determine duration type with proper type checking
    let durationType: DurationPresetKey;
    if (ContentLoadService.isDurationPresetKey(structure.durationType)) {
      durationType = structure.durationType;
    } else if (this.contentLoadConfig?.type) {
      durationType = this.contentLoadConfig.type;
    } else {
      durationType = ContentLoadService.getPresetKeyForDuration(
        rawDuration || this.scheduledLessonDuration,
      );
    }

    const resolvedDuration =
      typeof rawDuration === "number" && !Number.isNaN(rawDuration)
        ? rawDuration
        : this.scheduledLessonDuration ||
          ContentLoadService.getPreset(durationType).maxDuration;

    const fallbackPreset = ContentLoadService.getPreset(durationType);

    const resolvedTopicsPerLesson =
      structure.topicsPerLesson ??
      this.contentLoadConfig?.topicsPerLesson ??
      fallbackPreset.defaultTopics;
    const resolvedCompetenciesPerLesson =
      structure.competenciesPerLesson ??
      this.contentLoadConfig?.competenciesPerLesson ??
      this.computeCompetenciesPerLesson(resolvedTopicsPerLesson);
    const resolvedObjectivesPerTopic =
      structure.objectivesPerTopic ??
      this.contentLoadConfig?.objectivesPerTopic ??
      fallbackPreset.defaultObjectives;
    const resolvedTasksPerObjective =
      structure.tasksPerObjective ??
      this.contentLoadConfig?.tasksPerObjective ??
      fallbackPreset.defaultTasks;

    this.contentLoadConfig = {
      type: durationType as "mini" | "single" | "double" | "triple" | "halfFull",
      duration: resolvedDuration,
      topicsPerLesson: resolvedTopicsPerLesson,
      competenciesPerLesson: resolvedCompetenciesPerLesson,
      objectivesPerTopic: resolvedObjectivesPerTopic,
      tasksPerObjective: resolvedTasksPerObjective,
      isRecommended: ContentLoadService.isRecommendedDuration(durationType, resolvedDuration),
      recommendationText: ContentLoadService.getRecommendationText(durationType, resolvedDuration),
    };

    this.syncStructureInputsWithConfig();

    if (
      this.contentLoadConfig &&
      ContentLoadService.isDurationPresetKey(this.contentLoadConfig.type)
    ) {
      this.setDurationButtonVisualState(this.contentLoadConfig.type);
    }
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

      const rawCurriculum = data?.curriculum_data;

      if (Array.isArray(rawCurriculum)) {
        // Legacy format: curriculum_data stored as an array of lessons
        this.currentCurriculum = rawCurriculum;
        this.hydrateLessonsFromCompetencies(this.currentCurriculum);
        this.templatePlacements = [];
        console.log('✅ Loaded existing curriculum:', {
          lessonsCount: this.currentCurriculum.length,
          sampleStructure: this.currentCurriculum[0] ? {
            topicsCount: this.currentCurriculum[0].topics.length,
            objectivesCount: this.currentCurriculum[0].topics[0]?.objectives.length,

            tasksCount: this.currentCurriculum[0].topics[0]?.tasks.length
          } : null

        });
        this.updateLessonStructureCountsFromLessons(this.currentCurriculum);
        this.renderCurriculumPreview();

        // Update inputs to match loaded curriculum structure
        this.contentLoadController.populateInputsFromExistingCurriculum();
      } else if (
        rawCurriculum &&
        typeof rawCurriculum === "object"
      ) {
        const payload = rawCurriculum as CurriculumDataPayload;

        this.curriculumStructureDefaults = payload.structure ?? null;
        // Extract module organization and lessons
        this.moduleOrganization = payload.moduleOrganization || "linear";

        // Load course type (default to "essential" if not set)
        this.courseType = payload.courseType || "essential";

        // Sync course type UI
        this.syncCourseTypeUI();

        // Determine which structure to use
        const moduleData = Array.isArray(payload.modules) ? payload.modules : undefined;
        const lessonData = Array.isArray(payload.lessons) ? payload.lessons : undefined;

        if (moduleData && moduleData.length > 0) {
          moduleData.forEach((module) => this.hydrateLessonsFromCompetencies(Array.isArray(module.lessons) ? module.lessons : []));
          this.currentModules = this.assignModuleNumbers(moduleData);
          // Flatten modules into lessons for internal processing
          this.currentCurriculum = this.extractLessonsFromModules(moduleData);

          console.log('📚 Loaded from MODULES:', {
            modulesCount: moduleData.length,
            totalLessonsExtracted: this.currentCurriculum.length,
            lessonsByModule: moduleData.map(m => ({
              moduleNum: m.moduleNumber,
              lessonsInModule: m.lessons.length,
              lessonNumbers: m.lessons.map(l => l.lessonNumber)
            }))
          });

          // VALIDATION: Check if lesson count matches course_sessions
          await this.validateAndFixLessonCount();
        } else if (lessonData && lessonData.length > 0) {
          // Legacy format: lessons at top level
          this.currentCurriculum = lessonData;
          this.hydrateLessonsFromCompetencies(this.currentCurriculum);
          this.currentModules = [];
          this.currentCurriculum.forEach((lesson) => {
            lesson.moduleNumber = lesson.moduleNumber ?? 1;
          });
          this.updateLessonStructureCountsFromLessons(this.currentCurriculum);

          console.log('📚 Loaded from LESSONS:', {
            lessonsCount: lessonData.length,
            lessonNumbers: lessonData.map(l => l.lessonNumber)
          });
        } else {
          this.currentCurriculum = [];
          this.currentModules = [];
          this.lessonStructureCounts.clear();
        }

        if (Array.isArray(payload.templatePlacements)) {
          this.templatePlacements = payload.templatePlacements
            .filter((placement): placement is TemplatePlacementConfig => placement !== null && typeof placement === 'object');
        } else {
          this.templatePlacements = [];
        }

        this.syncTemplatePlacements();

        console.log('✅ Loaded existing curriculum payload:', {
          lessonsCount: this.currentCurriculum.length,
          moduleOrganization: this.moduleOrganization,
          modulesCount: this.currentModules.length,
          hasStructure: Boolean(payload.structure),
          structure: payload.structure || null,
        });

        this.applyStructureConfig(payload.structure);

        if (this.currentCurriculum.length > 0) {
          this.renderCurriculumPreview();
          this.contentLoadController.populateInputsFromExistingCurriculum();
        } else {
          this.hideCurriculumPreview();
        }

        this.syncModuleOrganizationUI(); // Sync UI with loaded organization
      } else {

        this.hideCurriculumPreview();
      }
    } catch (error) {
      this.hideCurriculumPreview();
    }
  }

  /**
   * Syncs the module organization UI elements with current state
   */
  private syncModuleOrganizationUI(): void {
    // Update radio buttons
    const moduleOrgRadios = document.querySelectorAll<HTMLInputElement>('input[name="module-organization"]');
    moduleOrgRadios.forEach(radio => {
      radio.checked = radio.value === this.moduleOrganization;
    });

    // Show/hide and enable/disable custom module configuration
    const customModulesConfig = document.getElementById('custom-modules-config');
    if (customModulesConfig) {
      if (this.moduleOrganization === 'custom') {
        customModulesConfig.removeAttribute('hidden');
        customModulesConfig.classList.remove('opacity-60', 'pointer-events-none');
        this.renderCustomModuleRows();
      } else {
        // Keep visible but grey out when not custom
        customModulesConfig.removeAttribute('hidden');
        customModulesConfig.classList.add('opacity-60', 'pointer-events-none');
      }
    }

    // Keep Modules button visible but grey out when "No Modules" (linear)
    const modulesButton = document.querySelector('button[data-mode="modules"]') as HTMLButtonElement;
    if (modulesButton) {
      if (this.moduleOrganization === 'linear') {
        modulesButton.disabled = true;
        modulesButton.classList.add('opacity-50', 'cursor-not-allowed');
      } else {
        modulesButton.disabled = false;
        modulesButton.classList.remove('opacity-50', 'cursor-not-allowed');
      }
    }
  }

  /**
   * Syncs the course type UI with current state
   */
  private syncCourseTypeUI(): void {
    const courseTypeRadios = document.querySelectorAll<HTMLInputElement>('input[name="course-type"]');
    courseTypeRadios.forEach(radio => {
      radio.checked = radio.value === this.courseType;
    });
  }

  /**
   * Renders custom module configuration rows
   */
  private renderCustomModuleRows(): void {
    const customModulesList = document.getElementById('custom-modules-list');
    if (!customModulesList) {
      return;
    }

    const totalLessons = this.currentCurriculum.length;
    if (totalLessons === 0) {
      customModulesList.innerHTML = '<p class="text-sm text-neutral-500" data-custom-modules-empty>Generate a curriculum first to define custom modules.</p>';
      return;
    }

    // Build module rows from current module structure
    const modules = this.currentModules.length > 0
      ? this.currentModules
      : [{ moduleNumber: 1, title: 'Module 1', lessons: this.currentCurriculum }];

    let html = '';
    modules.forEach((module, index) => {
      const lastLesson = module.lessons[module.lessons.length - 1];
      const lastLessonNumber = lastLesson ? lastLesson.lessonNumber : (index + 1);

      html += `
       <div class="flex flex-wrap items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3" data-custom-module-row data-module-index="${index}">
         <span class="text-sm font-semibold text-neutral-800">Module ${index + 1}</span>
         <div class="flex items-center gap-2 text-sm text-neutral-600" data-custom-module-input-group>
           <span>Lesson 1 →</span>
           <input 
             type="number" 
             class="w-20 rounded-md border-0 py-1.5 text-sm text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 focus:ring-2 focus:ring-inset focus:ring-primary-600" 
             min="1" 
             max="${totalLessons}" 
             value="${lastLessonNumber}"
             data-module-end="${index}"
             data-custom-module-input
           />
         </div>
         ${index > 0 ? '<button type="button" class="inline-flex h-7 w-7 items-center justify-center rounded-md border border-red-200 text-sm font-semibold text-red-600 hover:bg-red-50" data-remove-module="' + index + '">×</button>' : '<span class="inline-block w-8"></span>'}
       </div>
     `;
    });

    customModulesList.innerHTML = html;

    // Bind events to module inputs and remove buttons
    customModulesList.querySelectorAll<HTMLInputElement>('[data-custom-module-input]').forEach(input => {
      input.addEventListener('change', () => {
        this.updateCustomModulesFromInputs();
      });
    });

    customModulesList.querySelectorAll<HTMLButtonElement>('[data-remove-module]').forEach(button => {
      button.addEventListener('click', (event) => {
        const index = parseInt((event.target as HTMLButtonElement).dataset.removeModule || '0');
        this.removeCustomModule(index);
      });
    });
  }

  /**
   * Adds a new custom module
   */
  private addCustomModule(): void {
    if (!this.currentCurriculum.length) {
      alert('Generate a curriculum first before adding custom modules.');
      return;
    }

    // Add a new module to the end
    const lastModule = this.currentModules[this.currentModules.length - 1];
    const lastLesson = lastModule ? lastModule.lessons[lastModule.lessons.length - 1] : this.currentCurriculum[this.currentCurriculum.length - 1];
    const nextLessonNumber = lastLesson ? lastLesson.lessonNumber + 1 : 1;

    if (nextLessonNumber > this.currentCurriculum.length) {
      alert('All lessons are already assigned to modules.');
      return;
    }

    this.renderCustomModuleRows();
  }

  /**
   * Removes a custom module
   */
  private removeCustomModule(index: number): void {
    if (index === 0) {
      return; // Can't remove first module
    }

    // Recalculate modules after removal
    this.updateCustomModulesFromInputs();
    this.renderCustomModuleRows();
  }

  /**
   * Updates module structure based on custom module inputs
   */
  private updateCustomModulesFromInputs(): void {
    const inputs = document.querySelectorAll<HTMLInputElement>('[data-custom-module-input]');
    const boundaries: number[] = Array.from(inputs).map(input => parseInt(input.value));

    // Rebuild modules based on boundaries
    const newModules: CurriculumModule[] = [];
    let startLesson = 1;

    boundaries.forEach((endLesson, index) => {
      const moduleLessons = this.currentCurriculum.filter(
        lesson => lesson.lessonNumber >= startLesson && lesson.lessonNumber <= endLesson
      );

      if (moduleLessons.length > 0) {
        newModules.push({
          moduleNumber: index + 1,
          title: `Module ${index + 1}`,
          lessons: moduleLessons.map(lesson => ({ ...lesson, moduleNumber: index + 1 }))
        });
      }

      startLesson = endLesson + 1;
    });

    this.applyStoredModuleTitles(newModules);
    this.currentModules = newModules;
    this.currentCurriculum = this.extractLessonsFromModules(newModules);
    this.renderCurriculumPreview();
    this.saveCurriculumToDatabase(this.currentCurriculum);
  }

  /**
   * Handles duration/content volume selection
   */
  private handleDurationSelection(durationType: DurationPresetKey): void {
    const preset = ContentLoadService.getPreset(durationType);
    const topicsInput = document.getElementById('curriculum-topics') as HTMLInputElement;
    const objectivesInput = document.getElementById('curriculum-objectives') as HTMLInputElement;
    const tasksInput = document.getElementById('curriculum-tasks') as HTMLInputElement;

    if (!topicsInput || !objectivesInput || !tasksInput) {
      return;
    }

    // Update input values with preset defaults
    topicsInput.value = preset.defaultTopics.toString();
    objectivesInput.value = preset.defaultObjectives.toString();
    tasksInput.value = preset.defaultTasks.toString();

    // Update content load config
    this.contentLoadConfig = ContentLoadService.determineContentLoad(
      this.scheduledLessonDuration || preset.maxDuration,
      (topics) => this.computeCompetenciesPerLesson(topics),
    );

    // Regenerate curriculum with new structure
    this.regenerateAndSaveCurriculum();
  }

  /**
  * Set course ID after initialization
  */
  public setCourseId(courseId: string): void {
    if (this.courseId === courseId) {
      return; // No change needed
    }

    this.courseId = courseId;

    // Reload data with new course ID
    this.initializeCurriculum();
  }

  /**
  * Refresh the display to show current state
  */
  public refreshDisplay(): void {
    if (this.currentCurriculum && this.currentCurriculum.length > 0) {
      this.renderer.showPreview();
    } else {
      this.renderer.hidePreview();
    }
  }

  /**
  * Get the current curriculum data
  */
  public getCurrentCurriculum(): CurriculumLesson[] {
    return this.currentCurriculum || [];
  }

  /**
   * Validates that the number of lessons in currentCurriculum matches course_sessions
   * If there's a mismatch, trims excess lessons and updates the database
   * Falls back to schedule_settings array length if course_sessions is not set
   */
  private async validateAndFixLessonCount(): Promise<void> {
    try {
      // Get course_sessions and schedule_settings from database
      const { data: courseData, error } = await supabase
        .from('courses')
        .select('course_sessions, schedule_settings')
        .eq('id', this.courseId)
        .single();

      if (error || !courseData) {
        console.error('❌ Failed to fetch course data for validation:', error);
        return;
      }

      let expectedLessonCount = courseData.course_sessions;

      // Fallback: If course_sessions is not set but schedule_settings exists, use its length
      if ((!expectedLessonCount || expectedLessonCount === 0) && Array.isArray(courseData.schedule_settings)) {
        expectedLessonCount = courseData.schedule_settings.length;
        console.log('ℹ️ Using schedule_settings length for validation (course_sessions not set):', expectedLessonCount);

        // Fix the database by syncing course_sessions with schedule_settings
        if (expectedLessonCount > 0) {
          await supabase
            .from('courses')
            .update({ course_sessions: expectedLessonCount })
            .eq('id', this.courseId);
          console.log('✅ Synced course_sessions with schedule_settings:', expectedLessonCount);
        }
      }

      // Skip validation if no schedule configured
      if (!expectedLessonCount || expectedLessonCount === 0) {
        console.log('ℹ️ Skipping lesson count validation - no schedule configured');
        return;
      }

      const actualLessonCount = this.currentCurriculum.length;

      if (actualLessonCount === expectedLessonCount) {
        console.log('✅ Lesson count validation passed:', { expected: expectedLessonCount, actual: actualLessonCount });
        return;
      }

      console.warn('⚠️ LESSON COUNT MISMATCH DETECTED:', {
        expected: expectedLessonCount,
        actual: actualLessonCount,
        difference: actualLessonCount - expectedLessonCount
      });

      if (actualLessonCount > expectedLessonCount) {
        // Trim excess lessons
        console.log(`🔧 Trimming ${actualLessonCount - expectedLessonCount} excess lesson(s)...`);
        this.currentCurriculum = this.currentCurriculum.slice(0, expectedLessonCount);

        // Rebuild modules with correct lesson count
        this.currentModules = this.organizeLessonsIntoModules(this.currentCurriculum);

        // Save corrected data to database
        await this.saveCurriculumToDatabase(this.currentCurriculum);

        console.log('✅ Lesson count corrected and saved to database');
      } else if (actualLessonCount < expectedLessonCount) {
        // Need to generate MORE lessons to match schedule
        console.warn(`⚠️ Curriculum has ${actualLessonCount} lessons but schedule requires ${expectedLessonCount}.`);
        console.log('🔧 Auto-generating curriculum to match schedule...');

        // Create curriculum structure matching the schedule
        const newCurriculum = this.createCurriculumStructure(expectedLessonCount);

        // Preserve any existing lesson titles
        newCurriculum.forEach((lesson, index) => {
          if (this.currentCurriculum[index]?.title) {
            lesson.title = this.currentCurriculum[index].title;
            // Also preserve topic/objective/task content if exists
            lesson.topics.forEach((topic, topicIndex) => {
              const existingTopic = this.currentCurriculum[index]?.topics[topicIndex];
              if (existingTopic) {
                topic.title = existingTopic.title || topic.title;
                topic.objectives = existingTopic.objectives || topic.objectives;
                topic.tasks = existingTopic.tasks || topic.tasks;
              }
            });
          }
        });

        this.currentCurriculum = newCurriculum;

        // Rebuild modules
        this.currentModules = this.organizeLessonsIntoModules(this.currentCurriculum);

        // Save to database
        await this.saveCurriculumToDatabase(this.currentCurriculum);

        console.log('✅ Curriculum auto-generated and saved:', {
          lessonsCreated: expectedLessonCount,
          modulesCreated: this.currentModules.length
        });

        // Re-render the preview
        this.renderCurriculumPreview();
      }
    } catch (error) {
      console.error('❌ Error during lesson count validation:', error);
    }
  }

  private showPreview(): void {
    this.renderer.showPreview();
  }

  private hideCurriculumPreview(): void {
    this.renderer.hidePreview();
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

export { CurriculumManager };
