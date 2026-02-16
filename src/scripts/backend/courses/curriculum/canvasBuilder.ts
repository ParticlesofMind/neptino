import {
  CurriculumLesson,
  CurriculumTopic,
  TemplateRecord,
  TemplateDefinitionBlock,
} from "./curriculumManager.js";
import { TableDataBuilder } from "./utils/TableDataBuilder.js";
import { CanvasDimensions } from "./utils/CanvasDimensions.js";
import { LessonStructure } from "./utils/LessonStructure.js";
import { TemplateDataBuilder } from "./utils/TemplateDataBuilder.js";
import { SectionDataBuilder } from "./utils/SectionDataBuilder.js";

interface TableColumn {
  key: string;
  label: string;
}

interface TableRow {
  cells: Record<string, string>;
  depth?: number;
}

interface TableData {
  columns: TableColumn[];
  rows: TableRow[];
  emptyMessage?: string;
}

type LessonStructureSummary = { topics: number; objectives: number; tasks: number };

interface CourseContext {
  courseId?: string;
  courseTitle?: string | null;
  courseCode?: string | null;
  institutionName?: string | null;
  teacherName?: string | null;
  moduleTitles: Map<number, string>;
  lessonDates?: Map<number, string>;
}

export class CanvasBuilder {
  private courseContext: CourseContext = {
    moduleTitles: new Map(),
    lessonDates: new Map(),
  };
  private lessonStructures: Map<number, LessonStructureSummary> = new Map();

  constructor() {}

  public setCourseContext(context: {
    courseId?: string | null;
    courseTitle?: string | null;
    courseCode?: string | null;
    institutionName?: string | null;
    teacherName?: string | null;
    moduleTitles?: Map<number, string> | Record<number, string> | Array<[number, string]>;
    lessonStructures?: Map<number, LessonStructureSummary> | Record<number, LessonStructureSummary> | Array<[number, LessonStructureSummary]>;
    lessonDates?: Map<number, string> | Record<number, string> | Array<[number, string]>;
  }): void {
    if (context.courseId !== undefined) {
      this.courseContext.courseId = context.courseId ?? undefined;
    }
    if (context.courseTitle !== undefined) {
      this.courseContext.courseTitle = context.courseTitle ?? null;
    }
    if (context.courseCode !== undefined) {
      this.courseContext.courseCode = context.courseCode ?? null;
    }
    if (context.institutionName !== undefined) {
      this.courseContext.institutionName = context.institutionName ?? null;
    }
    if (context.teacherName !== undefined) {
      this.courseContext.teacherName = context.teacherName ?? null;
    }

    if (context.moduleTitles) {
      if (context.moduleTitles instanceof Map) {
        this.courseContext.moduleTitles = new Map(context.moduleTitles);
      } else if (Array.isArray(context.moduleTitles)) {
        this.courseContext.moduleTitles = new Map(context.moduleTitles);
      } else {
        const entries = Object.entries(context.moduleTitles).map(([key, value]) => [Number(key), value]);
        this.courseContext.moduleTitles = new Map(entries);
      }
    }

    if (context.lessonStructures) {
      if (context.lessonStructures instanceof Map) {
        this.lessonStructures = new Map(context.lessonStructures);
      } else if (Array.isArray(context.lessonStructures)) {
        this.lessonStructures = new Map(context.lessonStructures);
      } else {
        const entries = Object.entries(context.lessonStructures).map(([key, value]) => [Number(key), value as LessonStructureSummary]);
        this.lessonStructures = new Map(entries);
      }
    }

    if (context.lessonDates) {
      if (context.lessonDates instanceof Map) {
        this.courseContext.lessonDates = new Map(context.lessonDates);
      } else if (Array.isArray(context.lessonDates)) {
        this.courseContext.lessonDates = new Map(context.lessonDates);
      } else {
        const entries: [number, string][] = Object.entries(context.lessonDates).map(([key, value]) => [Number(key), value as string]);
        this.courseContext.lessonDates = new Map(entries);
      }
    }
  }

  public updateModuleTitles(modules: Map<number, string>): void {
    this.courseContext.moduleTitles = new Map(modules);
  }
  public setLessonStructures(structures: Map<number, LessonStructureSummary>): void {
    this.lessonStructures = new Map(structures);
  }


  /**
   * Build multiple canvas payloads for a lesson based on template type
   * For lesson templates: creates 3 canvases (Program/Resources, Content, Assignment)
   * For other templates: creates 1 canvas with all blocks
   */
  public buildLessonCanvasPayloads(
    lesson: CurriculumLesson,
    template: TemplateRecord | null | undefined,
    lessonNumberFallback: number,
  ): Array<{
    canvasIndex: number;
    canvasData: Record<string, unknown>;
    canvasMetadata: Record<string, unknown>;
    lessonData: Record<string, unknown>;
  }> {
    const templateType =
      TemplateDataBuilder.canonicalizeTemplateType(template?.template_type) ?? "lesson";
    
    // For lesson templates, create separate canvases
    if (templateType === "lesson") {
      return this.buildMultiCanvasLesson(lesson, template, lessonNumberFallback);
    }
    
    // For other templates, use single canvas
    const singleCanvas = this.buildLessonCanvasPayload(lesson, template, lessonNumberFallback);
    return [{
      canvasIndex: 1,
      canvasData: singleCanvas.canvasData,
      canvasMetadata: singleCanvas.canvasMetadata,
      lessonData: singleCanvas.lessonData,
    }];
  }

  /**
   * Build multiple canvases for a lesson template
   */
  private buildMultiCanvasLesson(
    lesson: CurriculumLesson,
    template: TemplateRecord | null | undefined,
    lessonNumberFallback: number,
  ): Array<{
    canvasIndex: number;
    canvasData: Record<string, unknown>;
    canvasMetadata: Record<string, unknown>;
  }> {
    const lessonNumber =
      typeof lesson.lessonNumber === "number" && lesson.lessonNumber > 0
        ? lesson.lessonNumber
        : lessonNumberFallback;
    const lessonTitle =
      typeof lesson.title === "string" && lesson.title.trim().length
        ? lesson.title.trim()
        : `Lesson ${lessonNumber}`;
    const moduleNumber =
      typeof lesson.moduleNumber === "number" && lesson.moduleNumber > 0
        ? lesson.moduleNumber
        : null;
    const moduleTitle = this.resolveModuleTitle(moduleNumber);

    const dimensions = CanvasDimensions.getCanvasDimensions();
    const margins = CanvasDimensions.resolveCanvasMargins();

    const definition =
      template?.template_data && Array.isArray(template.template_data.blocks)
        ? template.template_data
        : TemplateDataBuilder.normalizeTemplateDefinition(template?.template_data ?? null);

    const headerBlock =
      definition.blocks.find((block) => block.type === "header") ??
      TemplateDataBuilder.createFallbackBlock("header", lessonNumber, lessonTitle);
    const footerBlock =
      definition.blocks.find((block) => block.type === "footer") ??
      TemplateDataBuilder.createFallbackBlock("footer", lessonNumber, lessonTitle);
    
    const allBodyBlocks = definition.blocks.filter(
      (block) => block.type !== "header" && block.type !== "footer",
    );

    const templateInfo = TemplateDataBuilder.buildTemplateInfo(template, definition);
    const structureSummary = this.getLessonStructureSummary(lessonNumber, lesson);
    const baseLessonData = this.createLessonData({
      lessonNumber,
      lessonTitle,
      moduleNumber,
      moduleTitle,
      templateInfo,
      structure: structureSummary,
    });

    const canvases: Array<{
      canvasIndex: number;
      canvasData: Record<string, unknown>;
      canvasMetadata: Record<string, unknown>;
      lessonData: Record<string, unknown>;
    }> = [];

    // Canvas 1: Program + Resources
    const programResourcesBlocks = allBodyBlocks.filter(
      (block) => block.type === "program" || block.type === "resources",
    );
    if (programResourcesBlocks.length > 0) {
      const layout1 = this.buildYogaLayoutTree({
        dimensions,
        margins,
        headerBlock,
        footerBlock,
        bodyBlocks: programResourcesBlocks,
        lesson,
        templateType: "lesson",
      });

      canvases.push({
        canvasIndex: 1,
        canvasData: {
          version: "2025.03.01",
          engine: "pixi-yoga",
          dimensions,
          margins,
          template: templateInfo,
          lesson: {
            number: lessonNumber,
            title: lessonTitle,
            moduleNumber,
            moduleTitle,
            courseTitle: baseLessonData.courseTitle,
            courseCode: baseLessonData.courseCode,
            institutionName: baseLessonData.institutionName,
            teacherName: baseLessonData.teacherName,
          },
          layout: layout1,
        },
        canvasMetadata: {
          title: `${lessonTitle} - Program & Resources`,
          lessonNumber,
          moduleNumber,
          canvasType: "program-resources",
          generatedAt: new Date().toISOString(),
          template: templateInfo,
          layoutEngine: "pixi-yoga",
          dimensions,
          margins,
          structure: structureSummary,
        },
        lessonData: { ...baseLessonData, canvasType: "program-resources" },
      });
    }

    // Canvas 2: Content
    const contentBlocks = allBodyBlocks.filter((block) => block.type === "content");
    if (contentBlocks.length > 0) {
      const layout2 = this.buildYogaLayoutTree({
        dimensions,
        margins,
        headerBlock,
        footerBlock,
        bodyBlocks: contentBlocks,
        lesson,
        templateType: "lesson",
      });

      canvases.push({
        canvasIndex: 2,
        canvasData: {
          version: "2025.03.01",
          engine: "pixi-yoga",
          dimensions,
          margins,
          template: templateInfo,
          lesson: {
            number: lessonNumber,
            title: lessonTitle,
            moduleNumber,
            moduleTitle,
            courseTitle: baseLessonData.courseTitle,
            courseCode: baseLessonData.courseCode,
            institutionName: baseLessonData.institutionName,
            teacherName: baseLessonData.teacherName,
          },
          layout: layout2,
        },
        canvasMetadata: {
          title: `${lessonTitle} - Content`,
          lessonNumber,
          moduleNumber,
          canvasType: "content",
          generatedAt: new Date().toISOString(),
          template: templateInfo,
          layoutEngine: "pixi-yoga",
          dimensions,
          margins,
          structure: structureSummary,
        },
        lessonData: { ...baseLessonData, canvasType: "content" },
      });
    }

    // Canvas 3: Assignment
    const assignmentBlocks = allBodyBlocks.filter((block) => block.type === "assignment");
    if (assignmentBlocks.length > 0) {
      const layout3 = this.buildYogaLayoutTree({
        dimensions,
        margins,
        headerBlock,
        footerBlock,
        bodyBlocks: assignmentBlocks,
        lesson,
        templateType: "lesson",
      });

      canvases.push({
        canvasIndex: 3,
        canvasData: {
          version: "2025.03.01",
          engine: "pixi-yoga",
          dimensions,
          margins,
          template: templateInfo,
          lesson: {
            number: lessonNumber,
            title: lessonTitle,
            moduleNumber,
            moduleTitle,
            courseTitle: baseLessonData.courseTitle,
            courseCode: baseLessonData.courseCode,
            institutionName: baseLessonData.institutionName,
            teacherName: baseLessonData.teacherName,
          },
          layout: layout3,
        },
        canvasMetadata: {
          title: `${lessonTitle} - Assignment`,
          lessonNumber,
          moduleNumber,
          canvasType: "assignment",
          generatedAt: new Date().toISOString(),
          template: templateInfo,
          layoutEngine: "pixi-yoga",
          dimensions,
          margins,
          structure: structureSummary,
        },
        lessonData: { ...baseLessonData, canvasType: "assignment" },
      });
    }

    // Fallback: if no canvases were created, create one with all blocks
    if (canvases.length === 0) {
      const fallbackCanvas = this.buildLessonCanvasPayload(lesson, template, lessonNumberFallback);
      return [{
        canvasIndex: 1,
        canvasData: fallbackCanvas.canvasData,
        canvasMetadata: fallbackCanvas.canvasMetadata,
        lessonData: fallbackCanvas.lessonData,
      }];
    }

    return canvases;
  }

  public buildLessonCanvasPayload(
    lesson: CurriculumLesson,
    template: TemplateRecord | null | undefined,
    lessonNumberFallback: number,
  ): {
    canvasData: Record<string, unknown>;
    canvasMetadata: Record<string, unknown>;
    lessonData: Record<string, unknown>;
  } {
    const lessonNumber =
      typeof lesson.lessonNumber === "number" && lesson.lessonNumber > 0
        ? lesson.lessonNumber
        : lessonNumberFallback;
    const lessonTitle =
      typeof lesson.title === "string" && lesson.title.trim().length
        ? lesson.title.trim()
        : `Lesson ${lessonNumber}`;
    const moduleNumber =
      typeof lesson.moduleNumber === "number" && lesson.moduleNumber > 0
        ? lesson.moduleNumber
        : null;
    const moduleTitle = this.resolveModuleTitle(moduleNumber);

    const dimensions = CanvasDimensions.getCanvasDimensions();
    const margins = CanvasDimensions.resolveCanvasMargins();

    const definition =
      template?.template_data && Array.isArray(template.template_data.blocks)
        ? template.template_data
        : TemplateDataBuilder.normalizeTemplateDefinition(template?.template_data ?? null);

    const headerBlock =
      definition.blocks.find((block) => block.type === "header") ??
      TemplateDataBuilder.createFallbackBlock("header", lessonNumber, lessonTitle);
    const footerBlock =
      definition.blocks.find((block) => block.type === "footer") ??
      TemplateDataBuilder.createFallbackBlock("footer", lessonNumber, lessonTitle);
    const bodyBlocks = definition.blocks.filter(
      (block) => block.type !== "header" && block.type !== "footer",
    );

    const templateInfo = TemplateDataBuilder.buildTemplateInfo(template, definition);
    const layout = this.buildYogaLayoutTree({
      dimensions,
      margins,
      headerBlock,
      footerBlock,
      bodyBlocks,
      lesson,
      templateType: TemplateDataBuilder.canonicalizeTemplateType(template?.template_type) ?? "lesson",
    });

    const structureSummary = this.getLessonStructureSummary(lessonNumber, lesson);
    const lessonData = this.createLessonData({
      lessonNumber,
      lessonTitle,
      moduleNumber,
      moduleTitle,
      templateInfo,
      structure: structureSummary,
    });

    const canvasData = {
      version: "2025.03.01",
      engine: "pixi-yoga",
      dimensions,
      margins,
      template: templateInfo,
      lesson: {
        number: lessonNumber,
        title: lessonTitle,
        moduleNumber,
        moduleTitle,
        courseTitle: lessonData.courseTitle,
        courseCode: lessonData.courseCode,
        institutionName: lessonData.institutionName,
        teacherName: lessonData.teacherName,
      },
      layout,
    };

    const canvasMetadata = {
      title: lessonTitle,
      lessonNumber,
      moduleNumber,
      generatedAt: new Date().toISOString(),
      template: templateInfo,
      layoutEngine: "pixi-yoga",
      dimensions,
      margins,
      structure: structureSummary,
    };
    const lessonDataWithType = {
      ...lessonData,
      canvasType:
        templateInfo?.type ??
        TemplateDataBuilder.canonicalizeTemplateType(template?.template_type) ??
        null,
    };

    return { canvasData, canvasMetadata, lessonData: lessonDataWithType };
  }

  private getLessonStructureSummary(lessonNumber: number | null | undefined, lesson: CurriculumLesson): LessonStructureSummary {
    if (lessonNumber && this.lessonStructures.has(lessonNumber)) {
      return this.lessonStructures.get(lessonNumber)!;
    }

    const summary = LessonStructure.summarize(lesson);
    if (lessonNumber) {
      this.lessonStructures.set(lessonNumber, summary);
    }
    return summary;
  }

  private resolveModuleTitle(moduleNumber: number | null): string | null {
    if (!moduleNumber || moduleNumber <= 0) {
      return null;
    }

    const title = this.courseContext.moduleTitles.get(moduleNumber);
    if (typeof title === "string" && title.trim().length > 0) {
      return title.trim();
    }

    return `Module ${moduleNumber}`;
  }

  private createLessonData(params: {
    lessonNumber: number;
    lessonTitle: string;
    moduleNumber: number | null;
    moduleTitle: string | null;
    templateInfo: ReturnType<typeof TemplateDataBuilder.buildTemplateInfo>;
    structure: LessonStructureSummary;
  }): Record<string, unknown> {
    const { lessonNumber, lessonTitle, moduleNumber, moduleTitle, templateInfo, structure } = params;

    return {
      courseId: this.courseContext.courseId ?? null,
      courseTitle: this.courseContext.courseTitle ?? null,
      courseCode: this.courseContext.courseCode ?? null,
      institutionName: this.courseContext.institutionName ?? null,
      teacherName: this.courseContext.teacherName ?? null,
      lessonNumber,
      lessonTitle,
      moduleNumber,
      moduleTitle,
      templateId: templateInfo?.id ?? null,
      templateName: templateInfo?.name ?? null,
      templateType: templateInfo?.type ?? null,
      structure,
    };
  }

  private buildYogaLayoutTree(params: {
    dimensions: { width: number; height: number };
    margins: { top: number; right: number; bottom: number; left: number; unit: string };
    headerBlock: TemplateDefinitionBlock;
    footerBlock: TemplateDefinitionBlock;
    bodyBlocks: TemplateDefinitionBlock[];
    lesson: CurriculumLesson;
    templateType?: string;
  }): Record<string, unknown> {
    const {
      dimensions,
      margins,
      headerBlock,
      footerBlock,
      bodyBlocks,
      lesson,
      templateType,
    } =
      params;

    const headerNode = {
      id: "lesson-header",
      role: "header",
      type: "template-block",
      templateBlock: TemplateDataBuilder.serializeTemplateBlock(headerBlock),
      data: SectionDataBuilder.buildHeaderData(headerBlock, lesson, {
        ...this.courseContext,
        lessonDate: this.courseContext.lessonDates?.get(lesson.lessonNumber || 1) ?? null,
      }),
      yoga: {
        flexDirection: "column",
        width: { unit: "percent", value: 100 },
        height: { unit: margins.unit, value: margins.top },
        flexGrow: 0,
        flexShrink: 0,
        justifyContent: "flex-end",
        alignItems: "stretch",
        padding: {
          left: margins.left,
          right: margins.right,
          top: 0,
          bottom: 0,
        },
      },
    };

    const footerNode = {
      id: "lesson-footer",
      role: "footer",
      type: "template-block",
      templateBlock: TemplateDataBuilder.serializeTemplateBlock(footerBlock),
      data: SectionDataBuilder.buildFooterData(footerBlock, lesson, this.courseContext),
      yoga: {
        flexDirection: "column",
        width: { unit: "percent", value: 100 },
        height: { unit: margins.unit, value: margins.bottom },
        flexGrow: 0,
        flexShrink: 0,
        justifyContent: "flex-start",
        alignItems: "stretch",
        padding: {
          left: margins.left,
          right: margins.right,
          top: 0,
          bottom: 0,
        },
      },
    };

    const bodyNode = {
      id: "lesson-body",
      role: "body",
      type: "container",
      yoga: {
        flexDirection: "column",
        width: { unit: "percent", value: 100 },
        flexGrow: 1,
        flexShrink: 1,
        padding: {
          top: 24,
          bottom: 24,
          left: margins.left,
          right: margins.right,
        },
        gap: 24,
      },
      children: this.buildBodyNodes(bodyBlocks, lesson, templateType ?? "lesson"),
    };

    return {
      id: "canvas-root",
      type: "container",
      yoga: {
        flexDirection: "column",
        width: { unit: "px", value: dimensions.width },
        height: { unit: "px", value: dimensions.height },
      },
      children: [headerNode, bodyNode, footerNode],
    };
  }

  private buildBodyNodes(
    blocks: TemplateDefinitionBlock[],
    lesson: CurriculumLesson,
    templateType: string,
  ): Record<string, unknown>[] {
    if (!blocks.length) {
      return [
        {
          id: "body-placeholder",
          role: "placeholder",
          type: "placeholder",
          yoga: {
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            width: { unit: "percent", value: 100 },
            minHeight: { unit: "percent", value: 100 },
          },
          data: {
            message:
              "No template blocks defined. Configure the template to populate content.",
          },
        },
      ];
    }

    const structureSummary = this.getLessonStructureSummary(lesson.lessonNumber ?? null, lesson);

    return blocks.map((block, index) => {
      const node: Record<string, unknown> = {
        id: `template-block-${block.id}`,
        role: "template-block",
        type: block.type,
        order: index,
        templateBlock: TemplateDataBuilder.serializeTemplateBlock(block),
        yoga: {
          flexDirection: "column",
          width: { unit: "percent", value: 100 },
          flexGrow: block.type === "content" ? 1 : 0,
          flexShrink: block.type === "content" ? 1 : 0,
          gap: 12,
          padding: {
            top: 12,
            bottom: 12,
          },
        },
      };

      const existingData =
        (node.data as Record<string, unknown> | undefined) ?? undefined;

      const tableData =
        templateType === "lesson" &&
        (block.type === "program" ||
          block.type === "resources" ||
          block.type === "content" ||
          block.type === "assignment")
          ? this.buildLessonTableData(block, lesson)
          : null;

      if (block.type === "content") {
        node.children = LessonStructure.buildTopicNodes(lesson);
      }

      const mergedData: Record<string, unknown> = {
        ...(existingData ?? {}),
      };

      if (block.type === "program" && templateType === "lesson") {
        mergedData.structure = structureSummary;
        // Add transformed program data for ProgramRenderer
        mergedData.program = this.buildProgramData(lesson, structureSummary);
      }

      if (tableData) {
        mergedData.table = tableData;
      }

      if (Object.keys(mergedData).length > 0) {
        node.data = mergedData;
      }

      return node;
    });
  }

  private buildLessonTableData(
    block: TemplateDefinitionBlock,
    lesson: CurriculumLesson,
  ): TableData | null {
    return TableDataBuilder.build(block, lesson);
  }

  /**
   * Transform flat curriculum structure into nested ProgramData format
   */
  private buildProgramData(lesson: CurriculumLesson, structureSummary?: LessonStructureSummary): any {
    const lessonCompetencies = this.extractLessonCompetencies(lesson);
    const effectiveSummary = structureSummary || this.getLessonStructureSummary(lesson.lessonNumber ?? null, lesson);

    if (lessonCompetencies.length) {
      const competencies = lessonCompetencies.map((competency, competencyIndex) => ({
        name: this.resolveCompetencyTitle(competency.title, competencyIndex),
        topics: competency.topics.map((topic, topicIndex) => this.buildProgramTopicNode(topic, topicIndex)),
      }));

      return { competencies };
    }

    const topics = Array.isArray(lesson.topics) ? lesson.topics : [];

    if (!topics.length) {
      const topicsCount = effectiveSummary.topics || 0;
      if (!topicsCount) {
        return { competencies: [] };
      }

      const objectivesTotal = effectiveSummary.objectives || 0;
      const tasksTotal = effectiveSummary.tasks || 0;

      const objectivesPerTopic = topicsCount > 0 && objectivesTotal > 0
        ? Math.max(1, Math.round(objectivesTotal / topicsCount))
        : 0;
      const totalObjectives = objectivesPerTopic * topicsCount;
      const tasksPerObjective = totalObjectives > 0 && tasksTotal > 0
        ? Math.max(1, Math.round(tasksTotal / totalObjectives))
        : 0;

      const competencies = Array.from({ length: topicsCount }, (_, topicIndex) => ({
        name: `Competency ${topicIndex + 1}`,
        topics: [
          {
            name: `Topic ${topicIndex + 1}`,
            objectives: objectivesPerTopic
              ? Array.from({ length: objectivesPerTopic }, (_, objIndex) => ({
                  name: `Objective ${objIndex + 1}`,
                  tasks: tasksPerObjective
                    ? Array.from({ length: tasksPerObjective }, (_, taskIndex) => ({
                        name: `Task ${taskIndex + 1}`,
                      }))
                    : [],
                }))
              : [],
          },
        ],
      }));

      return { competencies };
    }

    const fallbackCompetencies = topics.map((topic, topicIndex) => ({
      name: `Competency ${topicIndex + 1}`,
      topics: [this.buildProgramTopicNode(topic, topicIndex)],
    }));

    return {
      competencies: fallbackCompetencies,
    };
  }

  private resolveCompetencyTitle(rawTitle: unknown, competencyIndex: number): string {
    if (typeof rawTitle === "string" && rawTitle.trim().length) {
      return rawTitle.trim();
    }
    return `Competency ${competencyIndex + 1}`;
  }

  private resolveTopicTitle(rawTitle: unknown, topicIndex: number): string {
    if (typeof rawTitle === "string" && rawTitle.trim().length) {
      return rawTitle.trim();
    }
    return `Topic ${topicIndex + 1}`;
  }

  private buildProgramTopicNode(topic: CurriculumTopic, topicIndex: number): {
    name: string;
    objectives: Array<{ name: string; tasks: Array<{ name: string }> }>;
  } {
    const objectives = Array.isArray(topic.objectives) ? topic.objectives : [];
    const allTasks = Array.isArray(topic.tasks) ? topic.tasks : [];
    const tasksPerObjective = objectives.length > 0 ? Math.ceil(allTasks.length / objectives.length) : allTasks.length;

    const nestedObjectives =
      objectives.length > 0
        ? objectives.map((objective, objIndex) => {
            const startTaskIndex = objIndex * tasksPerObjective;
            const endTaskIndex = Math.min(startTaskIndex + tasksPerObjective, allTasks.length);
            const objectiveTasks = allTasks.slice(startTaskIndex, endTaskIndex);
            return {
              name:
                typeof objective === "string" && objective.trim().length
                  ? objective.trim()
                  : `Objective ${objIndex + 1}`,
              tasks: objectiveTasks.map((task, taskIndex) => ({
                name:
                  typeof task === "string" && task.trim().length
                    ? task.trim()
                    : `Task ${taskIndex + 1 + startTaskIndex}`,
              })),
            };
          })
        : allTasks.length
        ? [
            {
              name: "Objective 1",
              tasks: allTasks.map((task, taskIndex) => ({
                name: typeof task === "string" && task.trim().length ? task.trim() : `Task ${taskIndex + 1}`,
              })),
            },
          ]
        : [];

    return {
      name: this.resolveTopicTitle(topic.title, topicIndex),
      objectives: nestedObjectives,
    };
  }

  private extractLessonCompetencies(lesson: CurriculumLesson): Array<{ title: string; topics: CurriculumTopic[] }> {
    const competencySource = (lesson as unknown as { competencies?: Array<{ title?: string; topics?: CurriculumTopic[] }> }).competencies;
    if (Array.isArray(competencySource) && competencySource.length) {
      const sanitized = competencySource
        .map((competency, index) => {
          const topics = Array.isArray(competency.topics) ? competency.topics.filter(Boolean) : [];
          if (!topics.length) {
            return null;
          }
          const title =
            typeof competency.title === "string" && competency.title.trim().length
              ? competency.title.trim()
              : `Competency ${index + 1}`;
          return { title, topics };
        })
        .filter((entry): entry is { title: string; topics: CurriculumTopic[] } => entry !== null);
      if (sanitized.length) {
        return sanitized;
      }
    }

    const topics = Array.isArray(lesson.topics) ? lesson.topics : [];
    if (!topics.length) {
      return [];
    }

    return topics.map((topic, index) => ({
      title: `Competency ${index + 1}`,
      topics: [topic],
    }));
  }
}
