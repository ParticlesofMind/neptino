import { supabase } from "../../supabase.js";
import { CurriculumRenderer } from "./curriculumRenderer.js";
import { CanvasBuilder } from "./canvasBuilder.js";
import { LessonStructure } from "./utils/LessonStructure.js";

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
}

export interface CurriculumTopic {
  title: string;
  objectives: string[];
  tasks: string[];
}

interface ContentLoadConfig {
  type: "mini" | "single" | "double" | "triple" | "halfFull";
  duration: number; // in minutes
  topicsPerLesson: number;
  objectivesPerTopic: number;
  tasksPerObjective: number;
  isRecommended: boolean;
  recommendationText: string;
}


type TemplatePlacementChoice =
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
  scope?: "course" | "global";
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

interface DurationPreset {
  type: "mini" | "single" | "double" | "triple" | "halfFull";
  maxDuration: number;
  defaultTopics: number;
  defaultObjectives: number;
  defaultTasks: number;
  rationale: string;
}

type PreviewMode = "modules" | "titles" | "topics" | "objectives" | "tasks" | "all";

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
  private saveTimeout: number | null = null; // For debouncing saves
  private templatePlacementList: HTMLElement | null = null;
  private templatePlacements: TemplatePlacementConfig[] = [];
  private availableTemplates: TemplateSummary[] = [];
  private templatePlacementSaveTimeout: number | null = null;
  private courseType: "minimalist" | "essential" | "complete" | "custom" = "essential";
  private courseTitle: string | null = null;
  private courseCode: string | null = null;
  private institutionName: string | null = null;
  private teacherName: string | null = null;
  private lessonStructureCounts: Map<number, { topics: number; objectives: number; tasks: number }> = new Map();
  private curriculumStructureDefaults: CurriculumStructureConfig | null = null;
  private initialModuleTitles: Map<number, string> = new Map();

  // Duration presets with default values and rationale
  private readonly durationPresets: Record<string, DurationPreset> = {
    mini: {
      type: "mini",
      maxDuration: 30,
      defaultTopics: 1,
      defaultObjectives: 1,
      defaultTasks: 2,
      rationale: "Mini lessons need tight focus. One clear learning objective with just enough practice to check understanding."
    },
    single: {
      type: "single",
      maxDuration: 60,
      defaultTopics: 2,
      defaultObjectives: 2,
      defaultTasks: 2,
      rationale: "Standard lesson length allows for two related concepts, each with paired objectives and sufficient practice."
    },
    double: {
      type: "double",
      maxDuration: 120,
      defaultTopics: 3,
      defaultObjectives: 2,
      defaultTasks: 3,
      rationale: "Extended time allows deeper exploration but requires consolidation breaks. Three topics prevent cognitive overload while allowing meaningful depth."
    },
    triple: {
      type: "triple",
      maxDuration: 180,
      defaultTopics: 4,
      defaultObjectives: 2,
      defaultTasks: 3,
      rationale: "Very long sessions need structured variety. Four topics with regular consolidation activities maintain engagement and retention."
    },
    halfFull: {
      type: "halfFull",
      maxDuration: 999,
      defaultTopics: 5,
      defaultObjectives: 3,
      defaultTasks: 4,
      rationale: "Extended sessions can cover more ground but must include multiple consolidation periods, breaks, and varied activities to maintain effectiveness."
    }
  };

  constructor(courseId?: string) {
    this.canvasBuilder = new CanvasBuilder();
    // Get course ID from parameter, URL, or session storage
    this.courseId = courseId || this.getCourseId();

    // Load saved preview mode from localStorage (or force default to 'all' for better UX)
    this.currentPreviewMode = "all"; // Force to show full structure by default
    this.savePreviewMode(this.currentPreviewMode); // Save the default


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

    this.canvasBuilder.setCourseContext({
      courseId: this.courseId,
      courseTitle: this.courseTitle,
      courseCode: this.courseCode,
      institutionName: this.institutionName,
      teacherName: this.teacherName,
      moduleTitles: moduleTitleMap,
      lessonStructures: this.lessonStructureCounts,
    });
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
      await this.loadScheduleData();

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
          .from("profiles")
          .select("id, email, username, full_name")
          .eq("id", courseData.teacher_id)
          .single();
        teacherProfile = profileData;
      }

      console.log('\n┌─────────────────────────────────────────────────────────────┐');
      console.log('│ 📋 1. COURSE ESSENTIALS                                     │');
      console.log('└─────────────────────────────────────────────────────────────┘');
      console.log('Course ID:', courseData.id);
      const courseName = courseData.course_name || courseData.title || 'Untitled Course';
      console.log('Course Title:', courseName);
      this.courseTitle = courseName;
      this.courseCode = courseData.course_code ?? courseData.id ?? null;
      this.institutionName = courseData.institution ?? null;
      this.curriculumStructureDefaults = courseData.curriculum_data?.structure ?? this.curriculumStructureDefaults;
      console.log('Course Tagline:', courseData.tagline);
      console.log('Teacher ID:', courseData.teacher_id);
      console.log('Teacher Profile:', teacherProfile || 'Not loaded');
      const teacherNameCandidate =
        (teacherProfile?.full_name && teacherProfile.full_name.trim().length
          ? teacherProfile.full_name.trim()
          : teacherProfile?.username) ??
        courseData.teacher_name ??
        null;
      this.teacherName = teacherNameCandidate;
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
        console.log('  - Duration:', this.calculateLessonDuration(firstLesson.startTime, firstLesson.endTime), 'minutes');
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
        this.initialModuleTitles.set(moduleNumber, title);
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
            calculated_duration_minutes: this.calculateLessonDuration(
              courseData.schedule_settings[0].startTime,
              courseData.schedule_settings[0].endTime
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
    // The curriculum config is actually in .article__config within the curriculum article
    this.curriculumConfigSection = document.querySelector(
      "#curriculum .article__config",
    ) as HTMLElement;

    // Initialize both curriculum and generation previews
    // They will show the same data but with different view mode controls
    const curriculumPreview = document.querySelector(
      "#curriculum .curriculum__preview",
    ) as HTMLElement;
    const generationPreview = document.querySelector(
      "#generation .curriculum__preview",
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
      console.error("curriculum__preview element not found");
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
          const durationType = target.value as keyof typeof this.durationPresets;
          if (this.isDurationPresetKey(durationType)) {
            this.handleDurationSelection(durationType);
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
        if (target.classList.contains('lesson__template-dropdown')) {
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
            card.classList.toggle('template-placement-card--collapsed');

            // Update aria-expanded attribute for accessibility
            const isExpanded = !card.classList.contains('template-placement-card--collapsed');
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
    const { AICurriculumGenerator } = await import('./aiCurriculumGenerator.js');
    const generator = new AICurriculumGenerator(this.courseId);

    // Show status UI
    const statusElement = document.getElementById('ai-generation-status');
    const statusText = statusElement?.querySelector('.ai-generation__status-text');
    const progressBar = statusElement?.querySelector('.ai-generation__progress-fill') as HTMLElement;

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
      this.syncTemplatePlacementsWithTemplates();
      this.syncTemplatePlacementsWithModules();
      this.syncTemplatePlacementsWithLessons();
    } catch (error) {
      console.error("Error loading templates for curriculum placement:", error);
    } finally {
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
        "id, template_id, template_description, template_type, template_data, course_id",
      )
      .or(`course_id.eq.${this.courseId},course_id.is.null`);

    if (error) {
      throw error;
    }

    const templates = Array.isArray(data) ? data : [];
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
        const scope: "course" | "global" = template.course_id ? "course" : "global";
        const definition = this.normalizeTemplateDefinition(template.template_data);
        return {
          id: template.id,
          templateId: template.template_id,
          name,
          type: rawType,
          description: template.template_description,
          scope,
          definition,
        } as TemplateSummary;
      })
      .sort((a, b) => {
        if (a.scope !== b.scope) {
          return a.scope === "course" ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
  }

  private syncTemplatePlacementsWithTemplates(): void {
    if (!this.templatePlacements.length || !this.availableTemplates.length) {
      return;
    }

    const summaryById = new Map(
      this.availableTemplates.map((template) => [template.id, template]),
    );

    this.templatePlacements = this.templatePlacements.map((placement) => {
      const summary = summaryById.get(placement.templateId);
      if (summary) {
        return {
          ...placement,
          templateSlug: summary.templateId,
          templateName: summary.name,
        };
      }
      return placement;
    });
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
    const existing = this.getTemplatePlacement(templateId);

    if (choice === "none") {
      if (existing) {
        this.templatePlacements = this.templatePlacements.filter(
          (placement) => placement.templateId !== templateId,
        );
      }
      return;
    }

    const summary = this.availableTemplates.find((template) => template.id === templateId);
    const placementType = choice as Exclude<TemplatePlacementChoice, "none">;

    const updated: TemplatePlacementConfig = {
      templateId,
      templateSlug: summary?.templateId || existing?.templateSlug || templateId,
      templateName: summary?.name || existing?.templateName || summary?.templateId || templateId,
      placementType,
      moduleNumbers: placementType === "specific-modules" ? [...(existing?.moduleNumbers ?? [])] : undefined,
      lessonNumbers: placementType === "specific-lessons" ? [...(existing?.lessonNumbers ?? [])] : undefined,
      lessonRanges: placementType === "lesson-ranges" ? [...(existing?.lessonRanges ?? [{ start: 1, end: this.currentCurriculum.length || 1 }])] : undefined,
    };

    if (existing) {
      this.templatePlacements = this.templatePlacements.map((placement) =>
        placement.templateId === templateId ? updated : placement,
      );
    } else {
      this.templatePlacements.push(updated);
    }
  }

  private updateTemplatePlacementModules(
    templateId: string,
    moduleNumber: number,
    isChecked: boolean,
  ): void {
    let placement = this.getTemplatePlacement(templateId);

    if (!placement) {
      this.updateTemplatePlacementChoice(templateId, "specific-modules");
      placement = this.getTemplatePlacement(templateId);
    }

    if (!placement) {
      return;
    }

    const moduleNumbers = Array.isArray(placement.moduleNumbers)
      ? [...placement.moduleNumbers]
      : [];

    if (isChecked) {
      if (!moduleNumbers.includes(moduleNumber)) {
        moduleNumbers.push(moduleNumber);
      }
    } else {
      const index = moduleNumbers.indexOf(moduleNumber);
      if (index >= 0) {
        moduleNumbers.splice(index, 1);
      }
    }

    moduleNumbers.sort((a, b) => a - b);

    placement.moduleNumbers = moduleNumbers;

    this.templatePlacements = this.templatePlacements.map((entry) =>
      entry.templateId === templateId ? placement! : entry,
    );
  }

  private updateTemplatePlacementLessons(
    templateId: string,
    lessonNumber: number,
    isChecked: boolean,
  ): void {
    let placement = this.getTemplatePlacement(templateId);

    if (!placement) {
      this.updateTemplatePlacementChoice(templateId, "specific-lessons");
      placement = this.getTemplatePlacement(templateId);
    }

    if (!placement) {
      return;
    }

    const lessonNumbers = Array.isArray(placement.lessonNumbers)
      ? [...placement.lessonNumbers]
      : [];

    if (isChecked) {
      if (!lessonNumbers.includes(lessonNumber)) {
        lessonNumbers.push(lessonNumber);
      }
    } else {
      const index = lessonNumbers.indexOf(lessonNumber);
      if (index >= 0) {
        lessonNumbers.splice(index, 1);
      }
    }

    lessonNumbers.sort((a, b) => a - b);

    placement.lessonNumbers = lessonNumbers;

    this.templatePlacements = this.templatePlacements.map((entry) =>
      entry.templateId === templateId ? placement! : entry,
    );
  }

  private addLessonRange(templateId: string): void {
    let placement = this.getTemplatePlacement(templateId);

    if (!placement) {
      this.updateTemplatePlacementChoice(templateId, "lesson-ranges");
      placement = this.getTemplatePlacement(templateId);
    }

    if (!placement) {
      return;
    }

    const lessonRanges = Array.isArray(placement.lessonRanges)
      ? [...placement.lessonRanges]
      : [];

    const lessonCount = this.currentCurriculum.length;
    lessonRanges.push({ start: 1, end: lessonCount || 1 });

    placement.lessonRanges = lessonRanges;

    this.templatePlacements = this.templatePlacements.map((entry) =>
      entry.templateId === templateId ? placement! : entry,
    );

    // Apply template placements immediately for lesson templates
    this.applyTemplatePlacementsToLessons();

    this.renderTemplatePlacementUI();
    this.renderCurriculumPreview();
    this.persistTemplatePlacements();
  }

  private removeLessonRange(templateId: string, rangeIndex: number): void {
    const placement = this.getTemplatePlacement(templateId);
    if (!placement) {
      return;
    }

    const lessonRanges = Array.isArray(placement.lessonRanges)
      ? [...placement.lessonRanges]
      : [];

    lessonRanges.splice(rangeIndex, 1);

    placement.lessonRanges = lessonRanges;

    this.templatePlacements = this.templatePlacements.map((entry) =>
      entry.templateId === templateId ? placement! : entry,
    );

    // Apply template placements immediately for lesson templates
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
    const placement = this.getTemplatePlacement(templateId);
    if (!placement) {
      return;
    }

    const lessonRanges = Array.isArray(placement.lessonRanges)
      ? [...placement.lessonRanges]
      : [];

    if (rangeIndex >= lessonRanges.length) {
      return;
    }

    const range = lessonRanges[rangeIndex];
    if (isStart) {
      range.start = Math.max(1, Math.min(value, range.end));
    } else {
      range.end = Math.max(range.start, value);
    }

    placement.lessonRanges = lessonRanges;

    this.templatePlacements = this.templatePlacements.map((entry) =>
      entry.templateId === templateId ? placement! : entry,
    );

    // Apply template placements immediately for lesson templates
    this.applyTemplatePlacementsToLessons();

    this.renderCurriculumPreview();
    this.persistTemplatePlacements();
  }

  private getTemplatePlacement(
    templateId: string,
  ): TemplatePlacementConfig | undefined {
    return this.templatePlacements.find((placement) => placement.templateId === templateId);
  }

  private lookupTemplateSummary(
    templateId: string | null | undefined,
  ): TemplateSummary | undefined {
    if (!templateId) {
      return undefined;
    }

    return this.availableTemplates.find((template) => template.id === templateId);
  }

  private normalizeTemplateDefinition(raw: unknown): TemplateDefinition {
    if (!raw || typeof raw !== "object") {
      return {
        name: null,
        blocks: [],
        settings: {},
      };
    }

    const payload = raw as Record<string, unknown>;
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

    this.syncTemplatePlacementsWithModules();
    this.syncTemplatePlacementsWithLessons();

    try {
      await this.saveCurriculumToDatabase(this.currentCurriculum);
    } catch (error) {
      console.error("Failed to persist template placements:", error);
    }
  }

  private syncTemplatePlacementsWithModules(): void {
    const modules = this.currentModules;
    if (!modules.length) {
      return;
    }

    const validModuleNumbers = new Set(
      modules.map((module: CurriculumModule) => module.moduleNumber ?? 1),
    );

    this.templatePlacements = this.templatePlacements.map((placement) => {
      if (placement.placementType !== "specific-modules") {
        return placement;
      }

      const filtered = (placement.moduleNumbers ?? []).filter((number) =>
        validModuleNumbers.has(number),
      );

      return {
        ...placement,
        moduleNumbers: filtered,
      };
    });
  }

  private syncTemplatePlacementsWithLessons(): void {
    const lessons = Array.isArray(this.currentCurriculum)
      ? this.currentCurriculum
      : [];

    if (!lessons.length) {
      return;
    }

    const validLessonNumbers = new Set(
      lessons
        .map((lesson) => lesson.lessonNumber)
        .filter(
          (number): number is number =>
            typeof number === "number" && !Number.isNaN(number),
        ),
    );

    this.templatePlacements = this.templatePlacements.map((placement) => {
      if (placement.placementType !== "specific-lessons") {
        return placement;
      }

      const filtered = (placement.lessonNumbers ?? []).filter((number) =>
        validLessonNumbers.has(number),
      );

      return {
        ...placement,
        lessonNumbers: filtered,
      };
    });

    // Apply template placements to lessons
    this.applyTemplatePlacementsToLessons();
  }

  /**
   * Apply template placements (all-lessons, lesson-ranges) directly to lesson.templateId
   * This ensures that templates are actually assigned to the lessons
   */
  private applyTemplatePlacementsToLessons(): void {
    const lessons = Array.isArray(this.currentCurriculum)
      ? this.currentCurriculum
      : [];

    if (!lessons.length) {
      return;
    }

    // Find lesson template placements
    const lessonTemplatePlacements = this.templatePlacements.filter(
      (placement) => {
        const summary = this.lookupTemplateSummary(placement.templateId);
        return summary?.type === "lesson";
      }
    );

    // Apply templates to lessons
    lessons.forEach((lesson) => {
      const lessonNumber = lesson.lessonNumber;

      // Check if this lesson should have a template applied
      const applicablePlacement = lessonTemplatePlacements.find((placement) => {
        // All lessons placement
        if (placement.placementType === "all-lessons") {
          return true;
        }

        // Lesson ranges placement
        if (
          placement.placementType === "lesson-ranges" &&
          Array.isArray(placement.lessonRanges)
        ) {
          return placement.lessonRanges.some(
            (range) => lessonNumber >= range.start && lessonNumber <= range.end
          );
        }

        return false;
      });

      // Apply the template if found
      if (applicablePlacement) {
        lesson.templateId = applicablePlacement.templateId;
        console.log(`📄 Auto-applied template "${applicablePlacement.templateName}" to Lesson ${lessonNumber}`);
      }
    });
  }

  private async loadScheduleData(): Promise<void> {
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
    this.scheduledLessonDuration = duration;

    let selectedPreset: DurationPreset;
    const isRecommended = true;
    const recommendationText = "Recommended";

    if (duration <= 30) {
      selectedPreset = this.durationPresets.mini;
    } else if (duration <= 60) {
      selectedPreset = this.durationPresets.single;
    } else if (duration <= 120) {
      selectedPreset = this.durationPresets.double;
    } else if (duration <= 180) {
      selectedPreset = this.durationPresets.triple;
    } else {
      selectedPreset = this.durationPresets.halfFull;
    }

    return {
      type: selectedPreset.type,
      duration,
      topicsPerLesson: selectedPreset.defaultTopics,
      objectivesPerTopic: selectedPreset.defaultObjectives,
      tasksPerObjective: selectedPreset.defaultTasks,
      isRecommended,
      recommendationText
    };
  }

  private displayContentLoad(): void {
    if (!this.contentLoadConfig) return;

    // Setup the duration configuration immediately
    this.setupDurationConfiguration();
  }

  private setupDurationConfiguration(): void {
    const contentVolumeRadios = document.querySelectorAll<HTMLInputElement>('input[name="content-volume"]');
    const topicsInput = document.getElementById('curriculum-topics') as HTMLInputElement;
    const objectivesInput = document.getElementById('curriculum-objectives') as HTMLInputElement;
    const tasksInput = document.getElementById('curriculum-tasks') as HTMLInputElement;

    console.log('🔧 Setting up duration configuration...', {
      contentVolumeRadios: contentVolumeRadios.length,
      topicsInput: !!topicsInput,
      objectivesInput: !!objectivesInput,
      tasksInput: !!tasksInput
    });

    if (!topicsInput || !objectivesInput || !tasksInput) {
      console.error('❌ Duration configuration elements not found:', {
        topicsInput: !!topicsInput,
        objectivesInput: !!objectivesInput,
        tasksInput: !!tasksInput
      });

      // Try again after a short delay in case DOM isn't ready
      setTimeout(() => {
        this.setupDurationConfiguration();
      }, 1000);
      return;
    }

    // Set up input change handlers to update curriculum in real-time
    [topicsInput, objectivesInput, tasksInput].forEach(input => {
      // Use 'input' event for real-time updates as user types
      input.addEventListener('input', () => {
        this.handleInputChange(topicsInput, objectivesInput, tasksInput);
      });

      // Also listen for 'change' event for when user tabs out
      input.addEventListener('change', () => {
        this.handleInputChange(topicsInput, objectivesInput, tasksInput);
      });
    });

    // Auto-select the recommended duration option (but don't override existing curriculum structure)
    this.autoSelectRecommendedDuration();

    // Populate inputs with current curriculum structure if it exists, otherwise use recommended defaults
    this.populateInputsFromExistingCurriculum();
  }

  private syncStructureInputsWithConfig(): void {
    const topicsInput = document.getElementById(
      "curriculum-topics",
    ) as HTMLInputElement | null;
    const objectivesInput = document.getElementById(
      "curriculum-objectives",
    ) as HTMLInputElement | null;
    const tasksInput = document.getElementById(
      "curriculum-tasks",
    ) as HTMLInputElement | null;

    if (!topicsInput || !objectivesInput || !tasksInput || !this.contentLoadConfig) {
      return;
    }

    topicsInput.value =
      this.contentLoadConfig.topicsPerLesson.toString();
    objectivesInput.value =
      this.contentLoadConfig.objectivesPerTopic.toString();
    tasksInput.value =
      this.contentLoadConfig.tasksPerObjective.toString();

    console.log("📋 Synced inputs with configuration:", {
      topics: this.contentLoadConfig.topicsPerLesson,
      objectives: this.contentLoadConfig.objectivesPerTopic,
      tasks: this.contentLoadConfig.tasksPerObjective,
    });
  }

  private clampValue(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  private deriveStructureFromCurriculum():
    | { topics: number; objectives: number; tasksPerObjective: number }
    | null {
    if (!Array.isArray(this.currentCurriculum) || !this.currentCurriculum.length) {
      return null;
    }

    const firstLesson = this.currentCurriculum[0];
    if (!firstLesson || !Array.isArray(firstLesson.topics) || !firstLesson.topics.length) {
      return null;
    }

    const topicsCount = this.clampValue(firstLesson.topics.length, 1, 10);
    const firstTopic = firstLesson.topics[0];
    const objectivesCountRaw = Array.isArray(firstTopic?.objectives)
      ? firstTopic.objectives.length
      : 0;
    const tasksCountRaw = Array.isArray(firstTopic?.tasks)
      ? firstTopic.tasks.length
      : 0;

    const objectivesCount = this.clampValue(objectivesCountRaw || 1, 1, 5);
    const tasksPerObjectiveCount =
      objectivesCount > 0
        ? Math.ceil(tasksCountRaw / objectivesCount) || 1
        : 1;
    const tasksPerObjective = this.clampValue(tasksPerObjectiveCount, 1, 5);

    return {
      topics: topicsCount,
      objectives: objectivesCount,
      tasksPerObjective,
    };
  }

  private ensureContentLoadConfigFromCounts(counts: {
    topics: number;
    objectives: number;
    tasksPerObjective: number;
  }): void {
    const baseDuration =
      this.contentLoadConfig?.duration || this.scheduledLessonDuration || 0;
    const durationType: keyof typeof this.durationPresets =
      this.contentLoadConfig?.type ||
      this.getPresetKeyForDuration(baseDuration || this.scheduledLessonDuration);

    const isRecommended = this.isRecommendedDuration(
      durationType,
      baseDuration || this.scheduledLessonDuration,
    );

    const recommendationText = this.getRecommendationText(
      durationType,
      baseDuration || this.scheduledLessonDuration,
    );

    this.contentLoadConfig = {
      type: durationType as "mini" | "single" | "double" | "triple" | "halfFull",
      duration: baseDuration || this.scheduledLessonDuration,
      topicsPerLesson: counts.topics,
      objectivesPerTopic: counts.objectives,
      tasksPerObjective: counts.tasksPerObjective,
      isRecommended,
      recommendationText,
    };

    console.log("🔧 ContentLoadConfig derived from existing curriculum:", {
      durationType,
      duration: baseDuration || this.scheduledLessonDuration,
      ...counts,
    });
  }

  private populateInputsFromExistingCurriculum(): void {
    const derivedCounts = this.deriveStructureFromCurriculum();

    if (derivedCounts) {
      this.ensureContentLoadConfigFromCounts(derivedCounts);
      this.syncStructureInputsWithConfig();

      if (this.isDurationPresetKey(this.contentLoadConfig?.type)) {
        this.setDurationButtonVisualState(this.contentLoadConfig.type);
      }

      console.log("📚 Populated inputs from existing curriculum:", derivedCounts);
      return;
    }

    // No existing curriculum data; fall back to current configuration defaults
    this.syncStructureInputsWithConfig();
  }

  private handleInputChange(
    topicsInput: HTMLInputElement,
    objectivesInput: HTMLInputElement,
    tasksInput: HTMLInputElement
  ): void {
    if (!this.contentLoadConfig) return;

    // Clear any existing timeout
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    // Update the config immediately
    const topics = this.clampValue(
      parseInt(topicsInput.value, 10) || 1,
      parseInt(topicsInput.min || "1", 10) || 1,
      parseInt(topicsInput.max || "10", 10) || 10,
    );
    const objectives = this.clampValue(
      parseInt(objectivesInput.value, 10) || 1,
      parseInt(objectivesInput.min || "1", 10) || 1,
      parseInt(objectivesInput.max || "5", 10) || 5,
    );
    const tasks = this.clampValue(
      parseInt(tasksInput.value, 10) || 1,
      parseInt(tasksInput.min || "1", 10) || 1,
      parseInt(tasksInput.max || "5", 10) || 5,
    );

    topicsInput.value = topics.toString();
    objectivesInput.value = objectives.toString();
    tasksInput.value = tasks.toString();

    this.contentLoadConfig.topicsPerLesson = topics;
    this.contentLoadConfig.objectivesPerTopic = objectives;
    this.contentLoadConfig.tasksPerObjective = tasks;

    console.log('📝 Input values changed (before debounce):', {
      topics: this.contentLoadConfig.topicsPerLesson,
      objectives: this.contentLoadConfig.objectivesPerTopic,
      tasks: this.contentLoadConfig.tasksPerObjective
    });

    // Debounce the actual save operation
    this.saveTimeout = window.setTimeout(() => {
      this.regenerateAndSaveCurriculum();
    }, 500); // Wait 500ms after last change
  }

  private isRecommendedDuration(durationType: keyof typeof this.durationPresets, actualDuration: number): boolean {
    const preset = this.durationPresets[durationType];

    if (durationType === 'halfFull') {
      return actualDuration > 180;
    }

    const previousMaxDuration = this.getPreviousMaxDuration(durationType);
    return actualDuration > previousMaxDuration && actualDuration <= preset.maxDuration;
  }

  private getPreviousMaxDuration(durationType: keyof typeof this.durationPresets): number {
    switch (durationType) {
      case 'mini': return 0;
      case 'single': return 30;
      case 'double': return 60;
      case 'triple': return 120;
      case 'halfFull': return 180;
      default: return 0;
    }
  }

  private getRecommendationText(
    durationType: keyof typeof this.durationPresets,
    actualDuration: number,
  ): string {
    void durationType;
    void actualDuration;
    // Return empty string to remove recommendation text while satisfying lint rules
    return "";
  }

  private getPresetKeyForDuration(duration: number): keyof typeof this.durationPresets {
    if (duration <= 30) {
      return "mini";
    }
    if (duration <= 60) {
      return "single";
    }
    if (duration <= 120) {
      return "double";
    }
    if (duration <= 180) {
      return "triple";
    }
    return "halfFull";
  }

  private isDurationPresetKey(
    value: string | undefined,
  ): value is keyof typeof this.durationPresets {
    return Boolean(value && value in this.durationPresets);
  }

  private autoSelectRecommendedDuration(): void {
    if (this.scheduledLessonDuration <= 0) return;

    // Find the recommended duration type
    const recommendedType = this.getPresetKeyForDuration(
      this.scheduledLessonDuration,
    );

    // Update contentLoadConfig with recommended preset values
    const preset = this.durationPresets[recommendedType];
    if (!this.contentLoadConfig) {
      this.contentLoadConfig = {
        type: preset.type,
        duration: this.scheduledLessonDuration,
        topicsPerLesson: preset.defaultTopics,
        objectivesPerTopic: preset.defaultObjectives,
        tasksPerObjective: preset.defaultTasks,
        isRecommended: this.isRecommendedDuration(recommendedType, this.scheduledLessonDuration),
        recommendationText: this.getRecommendationText(recommendedType, this.scheduledLessonDuration)
      };

      console.log('🎯 Auto-selected contentLoadConfig:', {
        type: recommendedType,
        duration: this.scheduledLessonDuration,
        topics: preset.defaultTopics,
        objectives: preset.defaultObjectives,
        tasks: preset.defaultTasks
      });
    }

    // Set the visual state (check the appropriate radio button)
    const typeToHighlight = this.contentLoadConfig?.type || recommendedType;
    if (this.isDurationPresetKey(typeToHighlight)) {
      this.setDurationRadioState(typeToHighlight);
    }

    // Ensure inputs mirror the current configuration
    this.syncStructureInputsWithConfig();
  }

  private setDurationRadioState(durationType: keyof typeof this.durationPresets): void {
    const targetRadio = document.querySelector<HTMLInputElement>(
      `input[name="content-volume"][value="${durationType}"]`
    );

    if (targetRadio) {
      targetRadio.checked = true;
    }
  }

  /**
   * @deprecated - Use setDurationRadioState instead
   */
  private setDurationButtonVisualState(durationType: keyof typeof this.durationPresets): void {
    this.setDurationRadioState(durationType);
  }

  private displayNoScheduleWarning(): void {
    // Just show the setup configuration without a warning
    this.setupDurationConfiguration();
  } private async regenerateAndSaveCurriculum(): Promise<void> {
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
    if (this.moduleOrganization === "linear") {
      if (!lessons.length) {
        return [];
      }

      lessons.forEach((lesson) => {
        lesson.moduleNumber = 1;
      });

      return [
        {
          moduleNumber: 1,
          title: "Module 1",
          lessons: lessons,
        },
      ];
    }

    if (this.moduleOrganization === "equal") {
      return this.assignModuleNumbers(this.distributeEqualModules(lessons));
    }

    if (this.moduleOrganization === "tiered") {
      return this.assignModuleNumbers(this.createTieredModules(lessons));
    }

    if (this.moduleOrganization === "custom") {
      // Custom organization - use existing module structure if available
      // Otherwise create a default single module
      if (this.currentModules.length > 0) {
        return this.assignModuleNumbers(this.currentModules);
      }
      const fallbackModules = [{
        moduleNumber: 1,
        title: "Module 1",
        lessons: lessons
      }];
      return this.assignModuleNumbers(fallbackModules);
    }

    return [];
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
    const curriculumCopy = JSON.parse(JSON.stringify(curriculum));
    const modulesCopy = JSON.parse(JSON.stringify(modules));

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
      payload.lessons = curriculumCopy;
    } else if (!payload.modules) {
      // Ensure module-based format persists modules when available
      payload.modules = modulesCopy;
    }

    this.currentModules = modules;

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

    this.syncTemplatePlacementsWithModules();
    this.syncTemplatePlacementsWithLessons();
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

      const { data: existingCanvases, error } = await supabase
        .from('canvases')
        .select('id, lesson_number, canvas_index')
        .eq('course_id', this.courseId);

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

      const existingMap = new Map<number, { id: string | null; canvas_index: number }>();
      existingCanvases?.forEach((canvas) => {
        if (
          typeof canvas.lesson_number === 'number' &&
          canvas.canvas_index === 1
        ) {
          existingMap.set(canvas.lesson_number, {
            id: typeof canvas.id === 'string' ? canvas.id : null,
            canvas_index: canvas.canvas_index,
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

      for (let lessonNumber = 1; lessonNumber <= desiredLessonCount; lessonNumber += 1) {
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
            inserts.push({
              course_id: this.courseId,
              lesson_number: lessonNumber,
              ...recordBase,
            });
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
            const { error: updateError } = await supabase
              .from('canvases')
              .update({
                canvas_data: record.canvas_data,
                canvas_metadata: record.canvas_metadata,
              })
              .eq('course_id', this.courseId)
              .eq('lesson_number', record.lessonNumber)
              .eq('canvas_index', record.canvasIndex);

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

  private setPreviewMode(mode: PreviewMode): void {
    this.currentPreviewMode = mode;
    this.savePreviewMode(mode);
    this.renderer.highlightPreviewModeButton(mode);
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
        modulesButton.style.opacity = '0.5';
        modulesButton.style.cursor = 'not-allowed';
      } else {
        modulesButton.disabled = false;
        modulesButton.style.opacity = '1';
        modulesButton.style.cursor = 'pointer';
      }
    }

    // Show/hide and enable/disable custom module configuration
    const customModulesConfig = document.getElementById('custom-modules-config');
    if (customModulesConfig) {
      if (organization === 'custom') {
        customModulesConfig.removeAttribute('hidden');
        customModulesConfig.classList.remove('disabled');
        this.renderCustomModuleRows();
      } else {
        // Keep visible but grey out when not custom
        customModulesConfig.removeAttribute('hidden');
        customModulesConfig.classList.add('disabled');
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
    // Update and render curriculum preview
    this.renderer.updateData({
      currentCurriculum: this.currentCurriculum,
      currentModules: this.currentModules,
      currentPreviewMode: this.currentPreviewMode,
      scheduledLessonDuration: this.scheduledLessonDuration,
      availableTemplates: this.availableTemplates,
      templatePlacements: this.templatePlacements,
      courseType: this.courseType,
      moduleOrganization: this.moduleOrganization,
    });
    this.renderer.renderCurriculumPreview();
    this.bindEditableEvents();

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
      });
      this.generationRenderer.renderCurriculumPreview();
      // Also bind editable events for generation preview
      if (this.generationPreviewSection) {
        this.bindEditableEventsForSection(this.generationPreviewSection);
      }
    }
  }

  private bindEditableEvents(): void {
    this.bindEditableEventsForSection(this.curriculumPreviewSection);
  }

  private bindEditableEventsForSection(section: HTMLElement): void {
    const editableElements = section.querySelectorAll(
      '[contenteditable="true"]',
    );
    editableElements.forEach((element) => {
      element.addEventListener("blur", (e) =>
        this.updateCurriculumData(e.target as HTMLElement),
      );
    });
  }

  private updateCurriculumData(element: HTMLElement): void {
    const moduleNum = element.dataset.module ? parseInt(element.dataset.module) : null;
    const lessonNum = parseInt(element.dataset.lesson || "0");
    const topicIndex = element.dataset.topic
      ? parseInt(element.dataset.topic)
      : null;
    const objectiveIndex = element.dataset.objective
      ? parseInt(element.dataset.objective)
      : null;
    const taskIndex = element.dataset.task
      ? parseInt(element.dataset.task)
      : null;
    const field = element.dataset.field;

    // Clean the value by removing excessive whitespace and normalizing
    const rawValue = element.textContent || "";
    const newValue = rawValue.replace(/\s+/g, ' ').trim();

    // Handle module title edits
    if (moduleNum !== null && field === "title") {
      const module = this.currentModules.find(m => m.moduleNumber === moduleNum);
      if (module) {
        module.title = newValue;
        console.log(`📦 Updated module ${moduleNum} title to: ${newValue}`);
      }
      // Save updated modules
      this.saveCurriculumToDatabase(this.currentCurriculum);
      return;
    }

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
      } else if (taskIndex !== null) {
        // Task
        lesson.topics[topicIndex].tasks[taskIndex] = newValue;
      }
    }

    // Auto-save to database
    this.saveCurriculumToDatabase(this.currentCurriculum);
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
    let durationType: keyof typeof this.durationPresets;
    if (this.isDurationPresetKey(structure.durationType)) {
      durationType = structure.durationType;
    } else if (this.contentLoadConfig?.type) {
      durationType = this.contentLoadConfig.type;
    } else {
      durationType = this.getPresetKeyForDuration(rawDuration || this.scheduledLessonDuration);
    }

    const resolvedDuration =
      typeof rawDuration === "number" && !Number.isNaN(rawDuration)
        ? rawDuration
        : this.scheduledLessonDuration || this.durationPresets[durationType].maxDuration;

    const fallbackPreset = this.durationPresets[durationType];

    this.contentLoadConfig = {
      type: durationType as "mini" | "single" | "double" | "triple" | "halfFull",
      duration: resolvedDuration,
      topicsPerLesson:
        structure.topicsPerLesson ??
        this.contentLoadConfig?.topicsPerLesson ??
        fallbackPreset.defaultTopics,
      objectivesPerTopic:
        structure.objectivesPerTopic ??
        this.contentLoadConfig?.objectivesPerTopic ??
        fallbackPreset.defaultObjectives,
      tasksPerObjective:
        structure.tasksPerObjective ??
        this.contentLoadConfig?.tasksPerObjective ??
        fallbackPreset.defaultTasks,
      isRecommended: this.isRecommendedDuration(durationType, resolvedDuration),
      recommendationText: this.getRecommendationText(durationType, resolvedDuration),
    };

    this.syncStructureInputsWithConfig();

    if (this.contentLoadConfig && this.isDurationPresetKey(this.contentLoadConfig.type)) {
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
        this.populateInputsFromExistingCurriculum();
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

        this.syncTemplatePlacementsWithModules();
        this.syncTemplatePlacementsWithLessons();

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
          this.populateInputsFromExistingCurriculum();
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
        customModulesConfig.classList.remove('disabled');
        this.renderCustomModuleRows();
      } else {
        // Keep visible but grey out when not custom
        customModulesConfig.removeAttribute('hidden');
        customModulesConfig.classList.add('disabled');
      }
    }

    // Keep Modules button visible but grey out when "No Modules" (linear)
    const modulesButton = document.querySelector('button[data-mode="modules"]') as HTMLButtonElement;
    if (modulesButton) {
      if (this.moduleOrganization === 'linear') {
        modulesButton.disabled = true;
        modulesButton.style.opacity = '0.5';
        modulesButton.style.cursor = 'not-allowed';
      } else {
        modulesButton.disabled = false;
        modulesButton.style.opacity = '1';
        modulesButton.style.cursor = 'pointer';
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
      customModulesList.innerHTML = '<p class="form__help-text">Generate a curriculum first to define custom modules.</p>';
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
       <div class="custom-module-row" data-module-index="${index}">
         <span class="custom-module-row__label">Module ${index + 1}</span>
         <div class="custom-module-row__input-group">
           <span>Lesson 1 →</span>
           <input 
             type="number" 
             class="input input--number custom-module-row__input" 
             min="1" 
             max="${totalLessons}" 
             value="${lastLessonNumber}"
             data-module-end="${index}"
           />
         </div>
         ${index > 0 ? '<button type="button" class="custom-module-row__remove" data-remove-module="' + index + '">×</button>' : '<span style="width: 2rem;"></span>'}
       </div>
     `;
    });

    customModulesList.innerHTML = html;

    // Bind events to module inputs and remove buttons
    customModulesList.querySelectorAll<HTMLInputElement>('.custom-module-row__input').forEach(input => {
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
    const inputs = document.querySelectorAll<HTMLInputElement>('.custom-module-row__input');
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

    this.currentModules = newModules;
    this.currentCurriculum = this.extractLessonsFromModules(newModules);
    this.renderCurriculumPreview();
    this.saveCurriculumToDatabase(this.currentCurriculum);
  }

  /**
   * Handles duration/content volume selection
   */
  private handleDurationSelection(durationType: keyof typeof this.durationPresets): void {
    const preset = this.durationPresets[durationType];
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
    this.contentLoadConfig = {
      type: preset.type,
      duration: this.scheduledLessonDuration || preset.maxDuration,
      topicsPerLesson: preset.defaultTopics,
      objectivesPerTopic: preset.defaultObjectives,
      tasksPerObjective: preset.defaultTasks,
      isRecommended: this.isRecommendedDuration(durationType, this.scheduledLessonDuration),
      recommendationText: this.getRecommendationText(durationType, this.scheduledLessonDuration)
    };

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
