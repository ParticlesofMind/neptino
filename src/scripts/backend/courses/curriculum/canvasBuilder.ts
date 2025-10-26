import {
  CurriculumLesson,
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

export class CanvasBuilder {
  constructor() {}

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
  }> {
    const templateType = template?.template_type ?? "lesson";
    
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
    const structureSummary = LessonStructure.summarize(lesson);

    const canvases = [];

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
      });
    }

    // Fallback: if no canvases were created, create one with all blocks
    if (canvases.length === 0) {
      const fallbackCanvas = this.buildLessonCanvasPayload(lesson, template, lessonNumberFallback);
      return [{
        canvasIndex: 1,
        canvasData: fallbackCanvas.canvasData,
        canvasMetadata: fallbackCanvas.canvasMetadata,
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
      templateType: template?.template_type ?? "lesson",
    });

    const structureSummary = LessonStructure.summarize(lesson);

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
      header: {
        blockId: headerBlock.id,
        type: headerBlock.type,
      },
      footer: {
        blockId: footerBlock.id,
        type: footerBlock.type,
      },
    };

    return { canvasData, canvasMetadata };
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
      data: SectionDataBuilder.buildHeaderData(headerBlock, lesson),
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
      data: SectionDataBuilder.buildFooterData(footerBlock, lesson),
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
        mergedData.structure = LessonStructure.summarize(lesson);
        // Add transformed program data for ProgramRenderer
        mergedData.program = this.buildProgramData(lesson);
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
  private buildProgramData(lesson: CurriculumLesson): any {
    const topics = Array.isArray(lesson.topics) ? lesson.topics : [];
    
    if (!topics.length) {
      return { competencies: [] };
    }

    // Transform each topic into a competency with nested structure
    const competencies = topics.map((topic, topicIndex) => {
      const objectives = Array.isArray(topic.objectives) ? topic.objectives : [];
      const allTasks = Array.isArray(topic.tasks) ? topic.tasks : [];
      
      // Determine tasks per objective (from curriculum structure)
      const tasksPerObjective = objectives.length > 0 
        ? Math.ceil(allTasks.length / objectives.length)
        : allTasks.length;
      
      // Build nested objectives with their tasks
      const nestedObjectives = objectives.map((objective, objIndex) => {
        // Get tasks for this objective
        const startTaskIndex = objIndex * tasksPerObjective;
        const endTaskIndex = Math.min(startTaskIndex + tasksPerObjective, allTasks.length);
        const objectiveTasks = allTasks.slice(startTaskIndex, endTaskIndex);
        
        return {
          name: typeof objective === "string" && objective.trim().length
            ? objective.trim()
            : `Objective ${objIndex + 1}`,
          tasks: objectiveTasks.map((task, taskIndex) => ({
            name: typeof task === "string" && task.trim().length
              ? task.trim()
              : `Task ${taskIndex + 1}`,
          })),
        };
      });
      
      return {
        name: `Competency ${topicIndex + 1}`,
        topics: [
          {
            name: typeof topic.title === "string" && topic.title.trim().length
              ? topic.title.trim()
              : `Topic ${topicIndex + 1}`,
            objectives: nestedObjectives,
          },
        ],
      };
    });

    return { competencies };
  }
}
