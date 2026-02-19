import { CanvasDataAccessor } from "../../../integration/utils/CanvasDataAccessor.js";
import type {
  CourseInfo,
  CurriculumCanvas,
} from "../../../integration/utils/CanvasDataAccessor.js";
import type {
  MethodType as PageMethodType,
  SocialFormType as PageSocialFormType,
  TemplateSummary as PageTemplateSummary,
} from "../../../coursebuilder/layout/pages/PageMetadata.js";

export interface CanvasLessonSummary {
  id: string;
  lessonNumber: number;
  lessonTitle: string;
  moduleNumber: number | null;
  moduleTitle: string | null;
  topic: string;
  method: PageMethodType;
  socialForm: PageSocialFormType;
  duration: number;
  templateInfo: PageTemplateSummary | null;
  canvasType: string | null;
  structure: { topics: number; objectives: number; tasks: number } | null;
}

export class CanvasSummaryService {
  constructor(private readonly courseInfoProvider: () => CourseInfo | null) {}

  public build(canvases: any[] | null): CanvasLessonSummary[] {
    if (!Array.isArray(canvases) || canvases.length === 0) {
      return [];
    }

    const courseInfo = this.courseInfoProvider();

    return canvases.map((canvas, index) => {
      const accessor = new CanvasDataAccessor(canvas as CurriculumCanvas, courseInfo);
      const canvasIndex = typeof canvas.canvas_index === "number" ? canvas.canvas_index : index + 1;

      return {
        id: typeof canvas.id === "string" ? canvas.id : `canvas-${index + 1}`,
        lessonNumber: accessor.lessonNumber,
        lessonTitle: accessor.lessonTitle,
        moduleNumber: accessor.moduleNumber,
        moduleTitle: accessor.moduleTitle,
        topic: accessor.getTopicValue(canvasIndex),
        method: accessor.method,
        socialForm: accessor.socialForm,
        duration: accessor.duration,
        templateInfo: accessor.templateInfo,
        canvasType: accessor.canvasType,
        structure: accessor.structureSummary,
      };
    });
  }
}
