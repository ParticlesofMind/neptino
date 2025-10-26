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
}
