import type {
  LayoutNode,
  MethodType,
  SocialFormType,
  TemplateSummary,
} from "../../coursebuilder/layout/pages/PageMetadata";
import { DataNormalizer } from "./DataNormalizer";

export interface CourseInfo {
  id: string;
  course_name: string;
  course_description?: string;
  course_language?: string;
  schedule_settings?: unknown;
  institution?: string | null;
  teacher_id?: string | null;
  teacherName?: string | null;
}

export interface CurriculumCanvas {
  id: string;
  course_id: string;
  lesson_number: number;
  canvas_index: number;
  canvas_data?: {
    lesson?: Record<string, unknown>;
    template?: Record<string, unknown>;
    dimensions?: Record<string, unknown>;
    margins?: Record<string, unknown>;
    layout?: LayoutNode | string | null;
    structure?: Record<string, unknown>;
    [key: string]: unknown;
  };
  canvas_metadata?: {
    title?: string;
    lessonNumber?: number;
    moduleNumber?: number;
    generatedAt?: string;
    template?: Record<string, unknown>;
    canvasType?: string;
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
    layout?: LayoutNode | string | null;
    structure?: Record<string, unknown>;
    [key: string]: unknown;
  };
  created_at?: string;
  updated_at?: string;
}

type StructureSummary = { topics: number; objectives: number; tasks: number } | null;

interface MergedCanvasFields {
  lessonNumber: number;
  lessonTitle: string;
  moduleNumber: number | null;
  moduleTitle: string | null;
  courseTitle: string;
  courseCode: string;
  institutionName: string | null;
  teacherName: string | null;
  method: MethodType;
  socialForm: SocialFormType;
  duration: number;
  templateInfo: TemplateSummary | null;
  layout: LayoutNode | null;
  structureSummary: StructureSummary;
  canvasType: string | null;
  canvasTitle: string | null;
  explicitCopyright: string | null;
}

export class CanvasDataAccessor {
  private readonly canvasData: CurriculumCanvas["canvas_data"];
  private readonly canvasMeta: CurriculumCanvas["canvas_metadata"];
  private readonly merged: MergedCanvasFields;

  constructor(
    private readonly canvas: CurriculumCanvas,
    private readonly courseInfo: CourseInfo | null,
  ) {
    this.canvasData = canvas.canvas_data ?? null;
    this.canvasMeta = canvas.canvas_metadata ?? null;
    this.merged = this.merge();
  }

  get lessonNumber(): number {
    return this.merged.lessonNumber;
  }

  get lessonTitle(): string {
    return this.merged.lessonTitle;
  }

  get moduleNumber(): number | null {
    return this.merged.moduleNumber;
  }

  get moduleTitle(): string | null {
    return this.merged.moduleTitle;
  }

  get courseTitle(): string {
    return this.merged.courseTitle;
  }

  get courseCode(): string {
    return this.merged.courseCode;
  }

  get institutionName(): string | null {
    return this.merged.institutionName;
  }

  get teacherName(): string | null {
    return this.merged.teacherName;
  }

  get method(): MethodType {
    return this.merged.method;
  }

  get socialForm(): SocialFormType {
    return this.merged.socialForm;
  }

  get duration(): number {
    return this.merged.duration;
  }

  get templateInfo(): TemplateSummary | null {
    return this.merged.templateInfo;
  }

  get layout(): LayoutNode | null {
    return this.merged.layout;
  }

  get structureSummary(): StructureSummary {
    return this.merged.structureSummary;
  }

  get canvasType(): string | null {
    return this.merged.canvasType;
  }

  get explicitCopyright(): string | null {
    return this.merged.explicitCopyright;
  }

  get rawCanvasData(): CurriculumCanvas["canvas_data"] {
    return this.canvasData;
  }

  get rawCanvasMeta(): CurriculumCanvas["canvas_metadata"] {
    return this.canvasMeta;
  }

  getCanvasTitle(canvasIndex: number): string {
    const fallback = `${this.lessonTitle} - Canvas ${canvasIndex}`;
    return this.merged.canvasTitle ?? fallback;
  }

  getTopicValue(canvasIndex: number): string {
    const base = this.getCanvasTitle(canvasIndex);
    if (this.merged.moduleTitle) {
      return `${this.merged.moduleTitle} · ${base}`;
    }
    if (this.merged.moduleNumber) {
      return `Module ${this.merged.moduleNumber} - ${base}`;
    }
    return base;
  }

  private merge(): MergedCanvasFields {
    const lessonDetails = (this.canvasData?.lesson ?? null) as Record<string, unknown> | null;
    const template = (this.canvasData?.template ?? this.canvasMeta?.template ?? null) as TemplateSummary | null;

    const lessonNumber =
      (lessonDetails?.number as number | undefined) ??
      (typeof this.canvasMeta?.lessonNumber === "number" ? this.canvasMeta.lessonNumber : undefined) ??
      1;

    const lessonTitle =
      DataNormalizer.resolveString(
        lessonDetails?.title as string | undefined,
        this.canvasMeta?.lessonTitle,
      ) ?? `Lesson ${lessonNumber}`;

    const moduleNumber =
      (lessonDetails?.moduleNumber as number | undefined) ??
      (typeof this.canvasMeta?.moduleNumber === "number" ? this.canvasMeta.moduleNumber : undefined) ??
      null;

    const moduleTitle =
      DataNormalizer.resolveString(
        (lessonDetails as Record<string, unknown> | null)?.moduleTitle as string | undefined,
        this.canvasMeta?.moduleTitle,
      ) ?? null;

    const courseTitle =
      DataNormalizer.resolveString(
        this.canvasMeta?.courseTitle,
        (lessonDetails as Record<string, unknown> | null)?.courseTitle as string | undefined,
        this.courseInfo?.course_name,
      ) ?? "Course Name";

    const courseCode =
      DataNormalizer.resolveString(
        this.canvasMeta?.courseCode,
        (lessonDetails as Record<string, unknown> | null)?.courseCode as string | undefined,
        this.courseInfo?.id,
      ) ?? "COURSE-101";

    const institutionName =
      DataNormalizer.resolveString(
        this.canvasMeta?.institutionName,
        (lessonDetails as Record<string, unknown> | null)?.institutionName as string | undefined,
        this.courseInfo?.institution,
      ) ?? null;

    const teacherName =
      DataNormalizer.resolveString(
        this.canvasMeta?.teacherName,
        (lessonDetails as Record<string, unknown> | null)?.teacherName as string | undefined,
        this.courseInfo?.teacherName,
      ) ?? null;

    const layout = DataNormalizer.layout(this.canvasData?.layout ?? this.canvasMeta?.layout ?? null);
    const structureSummary = DataNormalizer.structure(this.canvasMeta?.structure ?? this.canvasData?.structure ?? null);

    const canvasType =
      DataNormalizer.resolveString(
        this.canvasMeta?.canvasType,
        template?.type,
      ) ?? null;

    const canvasTitle = DataNormalizer.resolveString(
      this.canvasMeta?.title,
      typeof template?.name === "string" ? template.name : null,
    );

    const explicitCopyright =
      DataNormalizer.resolveString(
        DataNormalizer.extractString(this.canvasMeta, "copyright"),
        DataNormalizer.extractString(this.canvasMeta?.template, "copyright"),
        DataNormalizer.extractString(this.canvasData, "copyright"),
        DataNormalizer.extractString(this.canvasData?.lesson, "copyright"),
        DataNormalizer.extractString(this.canvasData?.template, "copyright"),
      ) ?? null;

    return {
      lessonNumber,
      lessonTitle,
      moduleNumber,
      moduleTitle,
      courseTitle,
      courseCode,
      institutionName,
      teacherName,
      method: DataNormalizer.method((template?.method as string | undefined) ?? undefined),
      socialForm: DataNormalizer.socialForm((template?.socialForm as string | undefined) ?? undefined),
      duration: typeof template?.duration === "number" ? template.duration : 50,
      templateInfo: template ?? null,
      layout,
      structureSummary,
      canvasType,
      canvasTitle,
      explicitCopyright,
    };
  }
}
