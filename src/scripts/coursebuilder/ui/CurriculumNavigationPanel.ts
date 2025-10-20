import { supabase } from "../../backend/supabase.js";
import { getCourseId as getCourseIdFromUrl } from "../../utils/courseId.js";

interface CurriculumTopic {
  title?: string | null;
  objectives?: string[];
  tasks?: string[];
}

interface CurriculumLesson {
  lessonNumber?: number;
  title?: string | null;
  topics?: CurriculumTopic[];
  moduleNumber?: number;
}

interface CurriculumModule {
  moduleNumber?: number;
  title?: string | null;
  lessons?: CurriculumLesson[];
}

interface CurriculumStructure {
  topicsPerLesson?: number;
  objectivesPerTopic?: number;
  tasksPerObjective?: number;
}

interface CurriculumPayload {
  moduleOrganization?: string;
  modules?: CurriculumModule[];
  lessons?: CurriculumLesson[];
  structure?: CurriculumStructure;
}

interface CurriculumResponse {
  curriculum_data: CurriculumPayload | null;
  course_sessions: number | null;
  schedule_settings: unknown[] | null;
  course_name?: string | null;
  title?: string | null;
  updated_at: string | null;
}

interface CurriculumSummary {
  modules: CurriculumModule[];
  lessons: CurriculumLesson[];
  moduleOrganization?: string;
  structure?: CurriculumStructure;
  updatedAt?: string | null;
  courseTitle?: string | null;
  scheduledSessions: number;
  missingCourse?: boolean;
  estimatedCanvases: number;
}

const REFRESH_INTERVAL_MS = 10_000;

export class CurriculumNavigationPanel {
  private container: HTMLElement | null;
  private content: HTMLElement | null;
  private courseId: string | null = null;
  private isLoading = false;
  private lastLoadedAt: number | null = null;

  constructor() {
    this.container = document.querySelector(".engine__navigation");
    if (!this.container) {
      return;
    }

    this.content = this.ensureContentContainer();
    this.courseId = this.resolveCourseId();
    this.bindEvents();

    if (this.courseId) {
      void this.loadAndRender(true);
    } else {
      this.renderMessage(
        "Select or create a course to load its curriculum outline.",
      );
    }
  }

  private ensureContentContainer(): HTMLElement {
    const existing = this.container?.querySelector<HTMLElement>(
      ".navigation-content",
    );
    if (existing) {
      existing.innerHTML = "";
      return existing;
    }

    const wrapper = document.createElement("div");
    wrapper.className = "navigation-content";
    this.container!.appendChild(wrapper);
    return wrapper;
  }

  private bindEvents(): void {
    document.addEventListener("panelChanged", (event) => {
      const detail = (event as CustomEvent).detail;
      if (!detail) {
        return;
      }

      if (detail.activePanel === "navigation" && this.shouldRefresh()) {
        void this.loadAndRender();
      }
    });

    window.addEventListener("courseIdResolved", (event) => {
      const detail = (event as CustomEvent<{ courseId?: string }>).detail;
      if (!detail?.courseId) {
        return;
      }

      if (detail.courseId !== this.courseId) {
        this.courseId = detail.courseId;
        this.lastLoadedAt = null;
        void this.loadAndRender(true);
      }
    });

    window.addEventListener("courseIdUpdated", (event) => {
      const detail = (event as CustomEvent<{ courseId?: string }>).detail;
      if (!detail?.courseId) {
        return;
      }

      if (detail.courseId !== this.courseId) {
        this.courseId = detail.courseId;
        this.lastLoadedAt = null;
        void this.loadAndRender(true);
      }
    });

    document.addEventListener("curriculumDataUpdated", (event) => {
      const detail = (event as CustomEvent<{ courseId?: string }>).detail;
      if (!detail?.courseId || detail.courseId !== this.courseId) {
        return;
      }

      this.lastLoadedAt = null;
      void this.loadAndRender(true);
    });
  }

  private resolveCourseId(): string | null {
    const fromUrl = getCourseIdFromUrl();
    if (this.isValidCourseId(fromUrl)) {
      return fromUrl!;
    }

    try {
      const fromSession = sessionStorage.getItem("currentCourseId");
      if (this.isValidCourseId(fromSession)) {
        return fromSession!;
      }
    } catch {
      /* empty */
    }

    if (typeof window !== "undefined") {
      const fromWindow = (window as any).currentCourseId;
      if (this.isValidCourseId(fromWindow)) {
        return fromWindow;
      }
    }

    return null;
  }

  private isValidCourseId(candidate: unknown): candidate is string {
    return typeof candidate === "string" && candidate.trim().length > 0;
  }

  private shouldRefresh(): boolean {
    if (!this.courseId) {
      return false;
    }
    if (this.isLoading) {
      return false;
    }
    if (!this.lastLoadedAt) {
      return true;
    }
    return Date.now() - this.lastLoadedAt > REFRESH_INTERVAL_MS;
  }

  private async loadAndRender(forceReload = false): Promise<void> {
    if (!this.courseId || (this.isLoading && !forceReload)) {
      return;
    }

    if (!forceReload && !this.shouldRefresh()) {
      return;
    }

    this.isLoading = true;
    this.renderLoading();

    try {
      const summary = await this.fetchCurriculum(this.courseId);
      this.lastLoadedAt = Date.now();

      if (summary.missingCourse) {
        this.renderMessage(
          "We couldn't find this course. Refresh or verify the course ID.",
          true,
        );
        return;
      }

      if (!summary.modules.length && !summary.lessons.length) {
        this.renderMessage(
          "No curriculum found yet. Generate or save your curriculum to see it here.",
        );
        return;
      }

      this.renderStructure(summary);
    } catch (error) {
      const message = this.extractErrorMessage(error);
      console.error("Failed to load curriculum navigation:", error);
      this.renderMessage(message, true);
    } finally {
      this.isLoading = false;
    }
  }

  private async fetchCurriculum(courseId: string): Promise<CurriculumSummary> {
    const { data, error } = await supabase
      .from("courses")
      .select(
        "curriculum_data, course_sessions, schedule_settings, course_name, title, updated_at",
      )
      .eq("id", courseId)
      .maybeSingle<CurriculumResponse>();

    if (error) {
      throw error;
    }

    if (!data) {
      return {
        modules: [],
        lessons: [],
        moduleOrganization: undefined,
        structure: undefined,
        updatedAt: null,
        courseTitle: null,
        scheduledSessions: 0,
        missingCourse: true,
        estimatedCanvases: 0,
      };
    }

    const payload = data?.curriculum_data ?? {};
    const modules = this.sanitizeModules(payload.modules);
    const lessons = this.toArray<CurriculumLesson>(payload.lessons);

    const scheduledSessions = this.resolveScheduledSessions(
      data?.course_sessions,
      data?.schedule_settings,
      modules,
      lessons,
    );

    const lessonCount = this.countLessons(modules, lessons);
    const estimatedCanvases = Math.max(lessonCount, scheduledSessions);

    return {
      modules,
      lessons,
      moduleOrganization: payload.moduleOrganization,
      structure: payload.structure,
      updatedAt: data?.updated_at,
      courseTitle:
        data?.course_name ??
        (data?.title ?? null),
      scheduledSessions,
      estimatedCanvases,
    };
  }

  private extractErrorMessage(error: unknown): string {
    if (error && typeof error === "object") {
      const err = error as Record<string, unknown>;
      const status = typeof err.status === "number" ? err.status : null;
      const code = typeof err.code === "string" ? err.code : null;
      const message =
        typeof err.message === "string" && err.message.trim().length > 0
          ? err.message
          : null;

      if (code === "PGRST116" || status === 404) {
        return "This course no longer exists. Select a different course.";
      }

      if (status === 401 || status === 403) {
        return "You need to sign in again to view this curriculum.";
      }

      if (message) {
        return message;
      }
    }

    if (error instanceof Error && error.message) {
      return error.message;
    }

    return "Unable to load curriculum outline right now. Please try again.";
  }

  private resolveScheduledSessions(
    courseSessions: number | null,
    scheduleSettings: unknown[] | null,
    modules: CurriculumModule[],
    lessons: CurriculumLesson[],
  ): number {
    if (typeof courseSessions === "number" && courseSessions > 0) {
      return courseSessions;
    }

    if (Array.isArray(scheduleSettings) && scheduleSettings.length > 0) {
      return scheduleSettings.length;
    }

    if (modules.length > 0) {
      return modules.reduce(
        (total, module) => total + (module.lessons?.length ?? 0),
        0,
      );
    }

    if (lessons.length > 0) {
      return lessons.length;
    }

    return 0;
  }

  private renderLoading(): void {
    if (!this.content) {
      return;
    }
    this.content.innerHTML = "";

    const heading = document.createElement("h4");
    heading.textContent = "Course Structure";
    this.content.appendChild(heading);

    const loading = document.createElement("p");
    loading.textContent = "Loading the latest curriculum outline…";
    this.content.appendChild(loading);
  }

  private renderMessage(message: string, isError = false): void {
    if (!this.content) {
      return;
    }

    this.content.innerHTML = "";
    const heading = document.createElement("h4");
    heading.textContent = "Course Structure";
    this.content.appendChild(heading);

    const paragraph = document.createElement("p");
    paragraph.textContent = message;
    if (isError) {
      paragraph.setAttribute("role", "alert");
    }
    this.content.appendChild(paragraph);
  }

  private renderStructure(summary: CurriculumSummary): void {
    if (!this.content) {
      return;
    }

    this.content.innerHTML = "";

    const heading = document.createElement("h4");
    heading.textContent = "Course Structure";
    this.content.appendChild(heading);

    const descriptor = document.createElement("p");
    descriptor.textContent = this.buildSummaryDescriptor(summary);
    this.content.appendChild(descriptor);

    const meta = document.createElement("p");
    meta.className = "navigation-content__meta";
    meta.textContent = this.buildMetaDescriptor(summary);
    this.content.appendChild(meta);

    const lessons = this.toArray<CurriculumLesson>(summary.lessons);
    const normalizedModules = this.sanitizeModules(summary.modules);
    const modules = normalizedModules.length
      ? normalizedModules
      : this.wrapLessons(lessons);

    modules.forEach((module, moduleIndex) => {
      const moduleBlock = this.createModuleBlock(module, moduleIndex);
      this.content!.appendChild(moduleBlock);
    });
  }

  private buildSummaryDescriptor(summary: CurriculumSummary): string {
    const modules = this.sanitizeModules(summary.modules);
    const lessons = this.toArray<CurriculumLesson>(summary.lessons);
    const moduleCount = modules.length
      ? modules.length
      : lessons.length > 0
      ? 1
      : 0;
    const lessonCount = this.countLessons(modules, lessons);
    const topicCount = this.countTopics(modules, lessons);
    const title = summary.courseTitle
      ? `${summary.courseTitle}`
      : "Course curriculum";
    const canvasCount = summary.estimatedCanvases;

    const parts = [`${title}: ${lessonCount} lesson${lessonCount === 1 ? "" : "s"}`];
    if (moduleCount) {
      parts.push(`${moduleCount} module${moduleCount === 1 ? "" : "s"}`);
    }
    if (topicCount) {
      parts.push(`${topicCount} topic${topicCount === 1 ? "" : "s"}`);
    }
    if (canvasCount) {
      parts.push(`${canvasCount} planned canvas${canvasCount === 1 ? "" : "es"}`);
    }
    return parts.join(" · ");
  }

  private buildMetaDescriptor(summary: CurriculumSummary): string {
    const scheduled = summary.scheduledSessions;
    const modules = this.sanitizeModules(summary.modules);
    const lessons = this.toArray<CurriculumLesson>(summary.lessons);
    const lastUpdated = summary.updatedAt
      ? this.formatRelativeTime(summary.updatedAt)
      : "unknown";
    const structureHint = summary.structure
      ? this.describeStructure(summary.structure)
      : "no structure settings saved";
    const canvases = summary.estimatedCanvases;

    const scheduledText = scheduled
      ? `${scheduled} scheduled session${scheduled === 1 ? "" : "s"}`
      : "schedule not configured";

    const lessonCount = this.countLessons(modules, lessons);
    const lessonText = lessonCount
      ? `${lessonCount} lesson${lessonCount === 1 ? "" : "s"}`
      : "no lessons yet";
    const canvasText = canvases
      ? `${canvases} canvas${canvases === 1 ? "" : "es"} currently planned`
      : "planned canvases not set";

    return `Last synced ${lastUpdated} · ${scheduledText} · ${lessonText} · ${canvasText} · ${structureHint}`;
  }

  private describeStructure(structure: CurriculumStructure): string {
    const { topicsPerLesson, objectivesPerTopic, tasksPerObjective } =
      structure;
    const parts: string[] = [];

    if (typeof topicsPerLesson === "number") {
      parts.push(`${topicsPerLesson} topic${topicsPerLesson === 1 ? "" : "s"} per lesson`);
    }
    if (typeof objectivesPerTopic === "number") {
      parts.push(`${objectivesPerTopic} objective${objectivesPerTopic === 1 ? "" : "s"} per topic`);
    }
    if (typeof tasksPerObjective === "number") {
      parts.push(`${tasksPerObjective} task${tasksPerObjective === 1 ? "" : "s"} per objective`);
    }

    return parts.length ? parts.join(" · ") : "structure defaults not set";
  }

  private wrapLessons(lessons: CurriculumLesson[]): CurriculumModule[] {
    const normalizedLessons = this.toArray<CurriculumLesson>(lessons);
    if (normalizedLessons.length === 0) {
      return [];
    }
    return [
      {
        moduleNumber: 1,
        title: "Course Lessons",
        lessons: normalizedLessons,
      },
    ];
  }

  private createModuleBlock(
    module: CurriculumModule,
    moduleIndex: number,
  ): HTMLElement {
    const moduleWrapper = document.createElement("section");
    moduleWrapper.className = "navigation-content__module";

    const moduleCard = document.createElement("div");
    moduleCard.className =
      "navigation-content__item navigation-content__item--module";

    const moduleTitle = document.createElement("strong");
    const moduleNumber =
      module.moduleNumber ?? moduleIndex + 1;
    moduleTitle.textContent = `Module ${moduleNumber}: ${module.title ?? "Untitled module"}`;
    moduleCard.appendChild(moduleTitle);

    const moduleMeta = document.createElement("p");
    const lessons = this.toArray<CurriculumLesson>(module.lessons);
    const lessonCount = lessons.length;
    const topicsCount = lessons.reduce(
      (total, lesson) => total + this.countTopicsInLesson(lesson),
      0,
    );
    moduleMeta.textContent = `${lessonCount} lesson${lessonCount === 1 ? "" : "s"} · ${topicsCount} topic${topicsCount === 1 ? "" : "s"}`;
    moduleCard.appendChild(moduleMeta);

    moduleWrapper.appendChild(moduleCard);

    lessons.forEach((lesson, lessonIndex) => {
      const lessonCard = this.createLessonBlock(
        lesson,
        lessonIndex,
        lessons.length,
      );
      moduleWrapper.appendChild(lessonCard);
    });

    return moduleWrapper;
  }

  private createLessonBlock(
    lesson: CurriculumLesson,
    lessonIndex: number,
    totalLessons: number,
  ): HTMLElement {
    const lessonCard = document.createElement("div");
    lessonCard.className =
      "navigation-content__item navigation-content__item--lesson";

    const title = document.createElement("strong");
    const number = lesson.lessonNumber ?? lessonIndex + 1;
    title.textContent = `Lesson ${number}: ${lesson.title ?? "Untitled lesson"}`;
    lessonCard.appendChild(title);

    const lessonMeta = document.createElement("p");
    const topics = this.toArray<CurriculumTopic>(lesson.topics);
    const objectives = topics.reduce((total, topic) => {
      return total + this.toArray<string>(topic.objectives).length;
    }, 0);
    const tasks = topics.reduce((total, topic) => {
      return total + this.toArray<string>(topic.tasks).length;
    }, 0);
    const topicsText = `${topics.length} topic${topics.length === 1 ? "" : "s"}`;
    const objectivesText = `${objectives} objective${objectives === 1 ? "" : "s"}`;
    const tasksText = `${tasks} task${tasks === 1 ? "" : "s"}`;
    const positionText =
      totalLessons > 0 ? `Session ${number} of ${totalLessons}` : "";

    lessonMeta.textContent = [positionText, topicsText, objectivesText, tasksText]
      .filter(Boolean)
      .join(" · ");
    lessonCard.appendChild(lessonMeta);

    return lessonCard;
  }

  private countLessons(
    modules: CurriculumModule[],
    lessons: CurriculumLesson[],
  ): number {
    if (modules.length) {
      return modules.reduce(
        (total, module) => total + (module.lessons?.length ?? 0),
        0,
      );
    }

    return lessons.length;
  }

  private countTopics(
    modules: CurriculumModule[],
    lessons: CurriculumLesson[],
  ): number {
    if (modules.length) {
      return modules.reduce((total, module) => {
        const moduleTopics = this.toArray<CurriculumLesson>(module.lessons).reduce(
          (lessonTotal, lesson) => lessonTotal + this.countTopicsInLesson(lesson),
          0,
        );
        return total + moduleTopics;
      }, 0);
    }

    return lessons.reduce(
      (total, lesson) => total + this.countTopicsInLesson(lesson),
      0,
    );
  }

  private countTopicsInLesson(lesson: CurriculumLesson): number {
    return this.toArray<CurriculumTopic>(lesson.topics).length;
  }

  private sanitizeModules(modules: unknown): CurriculumModule[] {
    const moduleArray = this.toArray<CurriculumModule>(modules);
    return moduleArray.map((module) => ({
      ...module,
      lessons: this.toArray<CurriculumLesson>(module?.lessons),
    }));
  }

  private toArray<T>(value: unknown): T[] {
    return Array.isArray(value) ? (value as T[]) : [];
  }

  private formatRelativeTime(timestamp: string): string {
    const updated = new Date(timestamp);
    if (Number.isNaN(updated.getTime())) {
      return "recently";
    }

    const diffMs = Date.now() - updated.getTime();
    const diffMinutes = Math.round(diffMs / 60000);

    if (diffMinutes < 1) {
      return "just now";
    }
    if (diffMinutes === 1) {
      return "1 minute ago";
    }
    if (diffMinutes < 60) {
      return `${diffMinutes} minutes ago`;
    }

    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours === 1) {
      return "1 hour ago";
    }
    if (diffHours < 24) {
      return `${diffHours} hours ago`;
    }

    const diffDays = Math.round(diffHours / 24);
    if (diffDays === 1) {
      return "1 day ago";
    }
    if (diffDays < 7) {
      return `${diffDays} days ago`;
    }

    return updated.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  }
}

export function initializeCurriculumNavigationPanel(): CurriculumNavigationPanel | null {
  const container = document.querySelector(".engine__navigation");
  if (!container) {
    return null;
  }

  return new CurriculumNavigationPanel();
}
