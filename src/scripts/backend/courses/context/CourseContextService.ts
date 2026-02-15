/**
 * CourseContextService — the single reactive source of truth for the
 * Course Fingerprint. Every subsystem that needs to know "what does this
 * course need?" subscribes here.
 *
 * Usage:
 *   import { courseContextService } from '.../context/CourseContextService';
 *
 *   // Subscribe to fingerprint changes
 *   const unsub = courseContextService.onChange((fp) => {
 *     console.log('Fingerprint updated', fp.courseName);
 *   });
 *
 *   // Trigger a refresh (called after any setup panel saves)
 *   await courseContextService.refreshFromCourse('some-uuid');
 *
 *   // Read the current fingerprint synchronously
 *   const fp = courseContextService.getFingerprint();
 *
 * The service listens to the following window events automatically:
 *   - `courseSectionUpdated` — dispatched by CourseFormHandler after a save
 *   - `courseCreated` — dispatched when a new course is created
 *   - `curriculumDataUpdated` — dispatched by CurriculumManager
 *   - `studentsProfilesUpdated` — dispatched by studentsProfileService
 *
 * See: Course Builder Architecture §5.1
 */

import { supabase } from '../../supabase';
import {
  type CourseFingerprint,
  type CourseClassification,
  type PedagogyCoordinates,
  type ScheduleSummary,
  type StudentSummary,
  type CurriculumModuleSummary,
  type CurriculumLessonSummary,
  type StructureConfig,
  type BlockContentAcceptance,
  type GradeLevel,
  type BloomLevel,
  type DepthLevel,
  type PedagogyBias,
  type ISCEDPath,
  DEFAULT_BLOCK_ACCEPTANCE,
  classYearToGradeLevel,
  derivePedagogyBias,
  deriveDepthLevel,
  deriveApproachLabel,
} from './CourseFingerprint';
import type { TemplateBlockType, TemplateType } from '../templates/templateOptions';

// ── Listener type ─────────────────────────────────────────────────────

type FingerprintListener = (fingerprint: CourseFingerprint) => void;

// ── Empty fingerprint factory ─────────────────────────────────────────

function emptyFingerprint(): CourseFingerprint {
  return {
    courseId: '',
    lastRefreshed: '',
    courseName: '',
    courseDescription: '',
    language: 'English',
    institution: '',
    classification: {},
    students: { studentCount: 0, learningStyles: [] },
    pedagogyCoordinates: null,
    instructionalApproach: 'Balanced',
    activeTemplateTypes: [],
    templateBlockAcceptance: { ...DEFAULT_BLOCK_ACCEPTANCE },
    schedule: null,
    moduleOrganization: 'linear',
    modules: [],
    structureConfig: { topicsPerLesson: 2, objectivesPerTopic: 2, tasksPerObjective: 2 },
  };
}

// ── Service class ─────────────────────────────────────────────────────

export class CourseContextService {
  private fingerprint: CourseFingerprint = emptyFingerprint();
  private listeners = new Set<FingerprintListener>();
  private currentCourseId: string | null = null;
  private refreshInFlight: Promise<void> | null = null;
  private boundEventHandlers = new Map<string, EventListener>();

  // ── Pub / Sub ─────────────────────────────────────────────────────

  /**
   * Register a callback that fires whenever the fingerprint changes.
   * Returns an unsubscribe function.
   */
  onChange(callback: FingerprintListener): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notify(): void {
    for (const cb of this.listeners) {
      try {
        cb(this.fingerprint);
      } catch (err) {
        console.error('[CourseContextService] listener error:', err);
      }
    }
  }

  // ── Accessors ─────────────────────────────────────────────────────

  /** Returns the current fingerprint (may be empty if never refreshed). */
  getFingerprint(): Readonly<CourseFingerprint> {
    return this.fingerprint;
  }

  /** Convenience: the currently tracked course ID, or null. */
  getCourseId(): string | null {
    return this.currentCourseId;
  }

  /** Returns the ISCED classification path, or null if not yet classified. */
  getISCEDPath(): ISCEDPath | null {
    const c = this.fingerprint.classification;
    if (!c.domain && !c.subject && !c.topic) return null;
    return {
      domain: c.domain ?? '',
      subject: c.subject ?? '',
      topic: c.topic ?? '',
      subtopic: c.subtopic,
    };
  }

  /** Derived pedagogy bias for content filtering. */
  getPedagogyBias(): PedagogyBias {
    return derivePedagogyBias(this.fingerprint.pedagogyCoordinates);
  }

  /**
   * Minimum Bloom level floor derived from classification.
   * Content below this level is deprioritized.
   */
  getBloomFloor(): BloomLevel {
    const gradeLevels = this.getGradeRange();
    if (gradeLevels.some((gl) => ['higher-ed', 'adult'].includes(gl))) return 'apply';
    if (gradeLevels.some((gl) => ['9-12'].includes(gl))) return 'understand';
    return 'remember';
  }

  /** Maximum lesson duration from schedule (minutes), or Infinity. */
  getMaxDuration(): number {
    return this.fingerprint.schedule?.lessonDuration ?? Infinity;
  }

  /** Course language. */
  getLanguage(): string {
    return this.fingerprint.language;
  }

  /** Mapped grade-level range from classification. */
  getGradeRange(): GradeLevel[] {
    return classYearToGradeLevel(this.fingerprint.classification.classYear);
  }

  /** Derived encyclopedia depth from grade + assessment scores. */
  getDepthLevel(): DepthLevel {
    return deriveDepthLevel(
      this.getGradeRange(),
      this.fingerprint.students.averageAssessmentScore,
    );
  }

  /**
   * Convenience: the current lesson context for a given lesson index.
   * Returns null if the lesson doesn't exist in the curriculum.
   */
  getLessonContext(lessonIndex: number): CurriculumLessonSummary | null {
    let idx = 0;
    for (const mod of this.fingerprint.modules) {
      for (const lesson of mod.lessons) {
        if (idx === lessonIndex) return lesson;
        idx++;
      }
    }
    return null;
  }

  /** Acceptance rules for a specific block type. */
  getBlockAcceptance(blockType: TemplateBlockType): BlockContentAcceptance {
    return this.fingerprint.templateBlockAcceptance[blockType] ?? DEFAULT_BLOCK_ACCEPTANCE[blockType];
  }

  // ── Data fetching ─────────────────────────────────────────────────

  /**
   * Refresh the fingerprint from Supabase for a given course.
   * Coalesces concurrent calls to the same courseId.
   */
  async refreshFromCourse(courseId: string): Promise<void> {
    if (!courseId) return;

    // If already refreshing this course, reuse the in-flight promise
    if (this.currentCourseId === courseId && this.refreshInFlight) {
      return this.refreshInFlight;
    }

    this.currentCourseId = courseId;
    this.refreshInFlight = this._doRefresh(courseId);

    try {
      await this.refreshInFlight;
    } finally {
      this.refreshInFlight = null;
    }
  }

  private async _doRefresh(courseId: string): Promise<void> {
    try {
      // ── 1. Fetch course row ──────────────────────────────────────
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();

      if (courseError || !course) {
        console.error('[CourseContextService] Failed to fetch course:', courseError);
        return;
      }

      // ── 2. Fetch student count + aggregate data ──────────────────
      const studentSummary = await this._fetchStudentSummary(courseId);

      // ── 3. Fetch template data ───────────────────────────────────
      const templateTypes = await this._fetchActiveTemplateTypes(courseId);

      // ── 4. Assemble fingerprint ──────────────────────────────────
      const classification = this._mapClassification(course.classification_data);
      const pedagogy = this._parsePedagogy(course.course_pedagogy);
      const schedule = this._mapSchedule(course.schedule_settings, course.curriculum_data);
      const { modules, structureConfig, moduleOrganization } = this._mapCurriculum(course.curriculum_data);

      this.fingerprint = {
        courseId,
        lastRefreshed: new Date().toISOString(),

        // Essentials
        courseName: course.course_name ?? '',
        courseSubtitle: course.course_subtitle ?? undefined,
        courseDescription: course.course_description ?? '',
        language: course.course_language ?? 'English',
        institution: course.institution ?? '',
        courseType: course.course_type ?? undefined,

        // Classification
        classification,

        // Students
        students: studentSummary,

        // Pedagogy
        pedagogyCoordinates: pedagogy,
        instructionalApproach: deriveApproachLabel(pedagogy),

        // Templates
        activeTemplateTypes: templateTypes,
        templateBlockAcceptance: { ...DEFAULT_BLOCK_ACCEPTANCE },

        // Schedule
        schedule,

        // Curriculum
        moduleOrganization,
        modules,
        structureConfig,
      };

      console.log('[CourseContextService] Fingerprint refreshed for course:', courseId);
      this.notify();
    } catch (err) {
      console.error('[CourseContextService] Refresh error:', err);
    }
  }

  // ── Private mapping helpers ───────────────────────────────────────

  private _mapClassification(data: any): CourseClassification {
    if (!data || typeof data !== 'object') return {};
    return {
      classYear: data.class_year ?? undefined,
      curricularFramework: data.curricular_framework ?? undefined,
      domain: data.domain ?? undefined,
      subject: data.subject ?? undefined,
      topic: data.topic ?? undefined,
      subtopic: data.subtopic ?? undefined,
      previousCourse: data.previous_course ?? undefined,
      currentCourse: data.current_course ?? undefined,
      nextCourse: data.next_course ?? undefined,
    };
  }

  private _parsePedagogy(raw: any): PedagogyCoordinates | null {
    if (!raw) return null;
    const obj = typeof raw === 'string' ? (() => { try { return JSON.parse(raw); } catch { return null; } })() : raw;
    if (obj && typeof obj.x === 'number' && typeof obj.y === 'number') {
      return { x: obj.x, y: obj.y };
    }
    return null;
  }

  private _mapSchedule(settings: any, curriculumData: any): ScheduleSummary | null {
    if (!settings) return null;

    const sessions: any[] = settings.sessions ?? settings.schedule ?? [];
    const totalSessions = sessions.length || curriculumData?.lessons?.length || 0;

    // Duration: explicit or compute from start/end times
    let lessonDuration = settings.class_duration ?? settings.lesson_duration ?? 0;
    if (!lessonDuration && sessions.length > 0) {
      const first = sessions[0];
      if (first.startTime && first.endTime) {
        const [sh, sm] = first.startTime.split(':').map(Number);
        const [eh, em] = first.endTime.split(':').map(Number);
        lessonDuration = (eh * 60 + em) - (sh * 60 + sm);
      }
    }

    return {
      totalSessions,
      lessonDuration,
      courseDuration: settings.startDate && settings.endDate
        ? { start: settings.startDate, end: settings.endDate }
        : undefined,
    };
  }

  private _mapCurriculum(data: any): {
    modules: CurriculumModuleSummary[];
    structureConfig: StructureConfig;
    moduleOrganization: 'linear' | 'modular';
  } {
    const defaults: StructureConfig = { topicsPerLesson: 2, objectivesPerTopic: 2, tasksPerObjective: 2 };

    if (!data || typeof data !== 'object') {
      return { modules: [], structureConfig: defaults, moduleOrganization: 'linear' };
    }

    const structureConfig: StructureConfig = {
      topicsPerLesson: data.structure?.topicsPerLesson ?? defaults.topicsPerLesson,
      objectivesPerTopic: data.structure?.objectivesPerTopic ?? defaults.objectivesPerTopic,
      tasksPerObjective: data.structure?.tasksPerObjective ?? defaults.tasksPerObjective,
    };

    const moduleOrganization: 'linear' | 'modular' =
      (data.modules && data.modules.length > 0) ? 'modular' : 'linear';

    const rawModules: any[] = data.modules ?? [];
    const rawLessons: any[] = data.lessons ?? [];

    // Build module summaries
    const modules: CurriculumModuleSummary[] = [];

    if (rawModules.length > 0) {
      // Modular: group lessons into their modules
      for (const mod of rawModules) {
        const modLessons = rawLessons.filter(
          (l: any) => l.moduleNumber === mod.moduleNumber,
        );
        modules.push({
          title: mod.title ?? `Module ${mod.moduleNumber}`,
          lessons: modLessons.map((l: any) => this._mapLesson(l)),
        });
      }
    } else if (rawLessons.length > 0) {
      // Linear: single implicit module
      modules.push({
        title: 'Course',
        lessons: rawLessons.map((l: any) => this._mapLesson(l)),
      });
    }

    return { modules, structureConfig, moduleOrganization };
  }

  private _mapLesson(raw: any): CurriculumLessonSummary {
    const topics: any[] = raw.topics ?? [];
    return {
      title: raw.title ?? `Lesson ${raw.lessonNumber ?? ''}`,
      topics: topics.map((t: any) => t.title ?? ''),
      competencies: (raw.competencies ?? []).map((c: any) =>
        typeof c === 'string' ? c : c.title ?? '',
      ),
      objectives: topics.flatMap((t: any) =>
        (t.objectives ?? []).map((o: any) => (typeof o === 'string' ? o : o.title ?? '')),
      ),
      tasks: topics.flatMap((t: any) =>
        (t.tasks ?? (t.objectives ?? []).flatMap((o: any) =>
          typeof o === 'object' && o.tasks ? o.tasks : [],
        )).map((task: any) => (typeof task === 'string' ? task : task.title ?? '')),
      ),
      templateType: raw.templateType ?? raw.templateId ?? undefined,
    };
  }

  private async _fetchStudentSummary(courseId: string): Promise<StudentSummary> {
    const fallback: StudentSummary = { studentCount: 0, learningStyles: [] };

    try {
      const { data: enrollments, error } = await supabase
        .from('enrollments')
        .select('id, metadata')
        .eq('course_id', courseId);

      if (error || !enrollments) return fallback;

      const count = enrollments.length;
      const stylesSet = new Set<string>();
      let scoreSum = 0;
      let scoreCount = 0;
      let gradeLevel: string | undefined;

      for (const enrollment of enrollments) {
        const meta = enrollment.metadata as any;
        if (!meta) continue;

        if (meta.learning_style) {
          const styles = Array.isArray(meta.learning_style)
            ? meta.learning_style
            : [meta.learning_style];
          for (const s of styles) stylesSet.add(String(s));
        }

        if (meta.assessment_score != null && !isNaN(Number(meta.assessment_score))) {
          scoreSum += Number(meta.assessment_score);
          scoreCount++;
        }

        if (meta.grade_level && !gradeLevel) {
          gradeLevel = String(meta.grade_level);
        }
      }

      return {
        studentCount: count,
        gradeLevel,
        learningStyles: Array.from(stylesSet),
        averageAssessmentScore: scoreCount > 0 ? Math.round(scoreSum / scoreCount) : undefined,
      };
    } catch (err) {
      console.warn('[CourseContextService] Failed to fetch student summary:', err);
      return fallback;
    }
  }

  private async _fetchActiveTemplateTypes(courseId: string): Promise<TemplateType[]> {
    try {
      const { data: templates, error } = await supabase
        .from('templates')
        .select('template_type')
        .eq('course_id', courseId);

      if (error || !templates) return [];

      const types = new Set<TemplateType>();
      for (const t of templates) {
        if (t.template_type) types.add(t.template_type as TemplateType);
      }
      return Array.from(types);
    } catch {
      return [];
    }
  }

  // ── Window event wiring ───────────────────────────────────────────

  /**
   * Start listening for course-related window events that should trigger
   * a fingerprint refresh. Call once during app init.
   */
  startListening(): void {
    const events = [
      'courseSectionUpdated',
      'courseCreated',
      'curriculumDataUpdated',
      'studentsProfilesUpdated',
    ];

    for (const eventName of events) {
      if (this.boundEventHandlers.has(eventName)) continue; // already listening

      const handler: EventListener = (e: Event) => {
        const detail = (e as CustomEvent).detail;
        const courseId = detail?.courseId ?? this.currentCourseId;
        if (courseId) {
          this.refreshFromCourse(courseId);
        }
      };

      this.boundEventHandlers.set(eventName, handler);
      window.addEventListener(eventName, handler);
    }

    console.log('[CourseContextService] Listening for course events');
  }

  /**
   * Stop listening (for cleanup / hot-reload scenarios).
   */
  stopListening(): void {
    for (const [eventName, handler] of this.boundEventHandlers) {
      window.removeEventListener(eventName, handler);
    }
    this.boundEventHandlers.clear();
  }

  /** Reset internal state (useful for tests). */
  reset(): void {
    this.fingerprint = emptyFingerprint();
    this.currentCourseId = null;
    this.refreshInFlight = null;
    this.listeners.clear();
    this.stopListening();
  }
}

// ── Singleton export ──────────────────────────────────────────────────

/**
 * The app-wide singleton. Import this from anywhere:
 *
 *   import { courseContextService } from '.../context/CourseContextService';
 */
export const courseContextService = new CourseContextService();
