import {
  CurriculumLesson,
  TemplateRecord,
  TemplateDefinitionBlock,
  TemplateDefinition,
} from "./curriculumManager.js";

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
  private readonly defaultCanvasDimensions = { width: 1200, height: 1800 };
  private readonly defaultCanvasMargins = {
    top: 96,
    right: 96,
    bottom: 96,
    left: 96,
    unit: "px" as const,
  };

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

    const dimensions = this.getCanvasDimensions();
    const margins = this.resolveCanvasMargins();

    const definition =
      template?.template_data && Array.isArray(template.template_data.blocks)
        ? template.template_data
        : this.normalizeTemplateDefinition(template?.template_data ?? null);

    const headerBlock =
      definition.blocks.find((block) => block.type === "header") ??
      this.createFallbackBlock("header", lessonNumber, lessonTitle);
    const footerBlock =
      definition.blocks.find((block) => block.type === "footer") ??
      this.createFallbackBlock("footer", lessonNumber, lessonTitle);
    const bodyBlocks = definition.blocks.filter(
      (block) => block.type !== "header" && block.type !== "footer",
    );

    const templateInfo = template
      ? {
          id: template.id,
          slug: template.template_id,
          type: template.template_type,
          name: definition.name || template.template_id,
          scope: template.course_id ? "course" : "global",
          description: template.template_description ?? null,
        }
      : null;

    const layout = this.buildYogaLayoutTree({
      dimensions,
      margins,
      headerBlock,
      footerBlock,
      bodyBlocks,
      lesson,
      templateType: template?.template_type ?? "lesson",
    });

    const structureSummary = this.summarizeLessonStructure(lesson);

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
      templateBlock: this.serializeTemplateBlock(headerBlock),
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
      templateBlock: this.serializeTemplateBlock(footerBlock),
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
        templateBlock: this.serializeTemplateBlock(block),
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
        node.children = this.buildTopicNodes(lesson);
      }

      const mergedData: Record<string, unknown> = {
        ...(existingData ?? {}),
      };

      if (block.type === "program" && templateType === "lesson") {
        mergedData.structure = this.summarizeLessonStructure(lesson);
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

  private buildTopicNodes(
    lesson: CurriculumLesson,
  ): Record<string, unknown>[] {
    const topics = Array.isArray(lesson.topics) ? lesson.topics : [];

    if (!topics.length) {
      return [
        {
          id: "topic-placeholder",
          role: "topic-placeholder",
          type: "placeholder",
          yoga: {
            flexDirection: "column",
            width: { unit: "percent", value: 100 },
          },
          data: {
            message: "No topics defined for this lesson.",
          },
        },
      ];
    }

    return topics.map((topic, topicIndex) => {
      const objectives = Array.isArray(topic.objectives)
        ? topic.objectives
        : [];
      const tasks = Array.isArray(topic.tasks) ? topic.tasks : [];

      return {
        id: `lesson-topic-${topicIndex + 1}`,
        role: "lesson-topic",
        type: "topic",
        yoga: {
          flexDirection: "column",
          gap: 8,
          width: { unit: "percent", value: 100 },
        },
        data: {
          index: topicIndex + 1,
          title:
            typeof topic.title === "string" && topic.title.trim().length
              ? topic.title.trim()
              : `Topic ${topicIndex + 1}`,
          objectives,
          tasks,
        },
      };
    });
  }

  private buildLessonTableData(
    block: TemplateDefinitionBlock,
    lesson: CurriculumLesson,
  ): TableData | null {
    switch (block.type) {
      case "program":
        return this.buildLessonProgramTable(block, lesson);
      case "resources":
        return this.buildLessonResourcesTable(block);
      case "content":
        return this.buildLessonContentTable(lesson);
      case "assignment":
        return this.buildLessonAssignmentTable(lesson);
      default:
        return null;
    }
  }

  private buildLessonProgramTable(
    block: TemplateDefinitionBlock,
    lesson: CurriculumLesson,
  ): TableData {
    const columnDefs = [
      { key: "competency", label: "Competency", configKey: "competence" },
      { key: "topic", label: "Topic", configKey: "topic" },
      { key: "objective", label: "Objective", configKey: "objective" },
      { key: "task", label: "Task", configKey: "task" },
      { key: "method", label: "Method", configKey: "program_method" },
      { key: "social", label: "Social Form", configKey: "program_social_form" },
      { key: "time", label: "Time", configKey: "program_time" },
    ] as const;

    const config = (block.config ?? {}) as Record<string, unknown>;
    const activeColumns = columnDefs.filter((column) => config[column.configKey] !== false);
    const columns =
      activeColumns.length > 0
        ? activeColumns
        : columnDefs.slice(0, 4);

    const topics = Array.isArray(lesson.topics) ? lesson.topics : [];
    const rows: TableRow[] = [];

    topics.forEach((topic, topicIndex) => {
      const competencyLabel = `Competency ${topicIndex + 1}`;
      const topicTitle =
        typeof topic.title === "string" && topic.title.trim().length
          ? topic.title.trim()
          : `Topic ${topicIndex + 1}`;

      rows.push({
        depth: 0,
        cells: {
          competency: competencyLabel,
          topic: "",
          objective: "",
          task: "",
          method: "",
          social: "",
          time: "",
        },
      });

      rows.push({
        depth: 1,
        cells: {
          competency: "",
          topic: topicTitle,
          objective: "",
          task: "",
          method: "",
          social: "",
          time: "",
        },
      });

      const objectives = Array.isArray(topic.objectives)
        ? topic.objectives
        : [];
      objectives.forEach((objective, objectiveIndex) => {
        const objectiveText =
          typeof objective === "string" && objective.trim().length
            ? objective.trim()
            : `Objective ${objectiveIndex + 1}`;
        rows.push({
          depth: 2,
          cells: {
            competency: "",
            topic: "",
            objective: objectiveText,
            task: "",
            method: "",
            social: "",
            time: "",
          },
        });
      });

      const tasks = Array.isArray(topic.tasks) ? topic.tasks : [];
      tasks.forEach((task, taskIndex) => {
        const taskText =
          typeof task === "string" && task.trim().length
            ? task.trim()
            : `Task ${taskIndex + 1}`;
        rows.push({
          depth: 3,
          cells: {
            competency: "",
            topic: "",
            objective: "",
            task: taskText,
            method: "",
            social: "",
            time: "",
          },
        });
      });
    });

    if (!rows.length) {
      rows.push({
        depth: 0,
        cells: {
          competency: "No lesson structure defined yet.",
          topic: "",
          objective: "",
          task: "",
          method: "",
          social: "",
          time: "",
        },
      });
    }

    return {
      columns: columns.map(({ key, label }) => ({ key, label })),
      rows: rows.map((row) => ({
        depth: row.depth,
        cells: this.pickTableCells(row.cells, columns.map((c) => c.key)),
      })),
      emptyMessage: "Program structure has not been configured.",
    };
  }

  private buildLessonResourcesTable(block: TemplateDefinitionBlock): TableData {
    const config = (block.config ?? {}) as Record<string, unknown>;

    const rows: TableRow[] = [
      {
        cells: {
          resource: "Files",
          type: "Upload",
          notes: config.allowFiles === false ? "Disabled" : "Enabled",
        },
      },
      {
        cells: {
          resource: "Links",
          type: "External",
          notes: config.allowLinks === false ? "Disabled" : "Enabled",
        },
      },
      {
        cells: {
          resource: "Videos",
          type: "Embed",
          notes: config.allowVideos === false ? "Disabled" : "Enabled",
        },
      },
    ];

    const maxFiles =
      typeof config.maxFiles === "number" && Number.isFinite(config.maxFiles)
        ? config.maxFiles
        : null;

    if (maxFiles !== null) {
      rows.push({
        cells: {
          resource: "Upload Limit",
          type: "Files",
          notes: `${maxFiles} max`,
        },
      });
    }

    return {
      columns: [
        { key: "resource", label: "Resource" },
        { key: "type", label: "Type" },
        { key: "notes", label: "Notes" },
      ],
      rows,
      emptyMessage: "No resources configured.",
    };
  }

  private buildLessonContentTable(lesson: CurriculumLesson): TableData {
    const topics = Array.isArray(lesson.topics) ? lesson.topics : [];
    const rows: TableRow[] = [];

    topics.forEach((topic, topicIndex) => {
      const topicTitle =
        typeof topic.title === "string" && topic.title.trim().length
          ? topic.title.trim()
          : `Topic ${topicIndex + 1}`;

      rows.push({
        depth: 0,
        cells: {
          topic: topicTitle,
          objective: "",
          task: "",
        },
      });

      const objectives = Array.isArray(topic.objectives)
        ? topic.objectives
        : [];
      objectives.forEach((objective, objectiveIndex) => {
        const objectiveText =
          typeof objective === "string" && objective.trim().length
            ? objective.trim()
            : `Objective ${objectiveIndex + 1}`;
        rows.push({
          depth: 1,
          cells: {
            topic: "",
            objective: objectiveText,
            task: "",
          },
        });
      });

      const tasks = Array.isArray(topic.tasks) ? topic.tasks : [];
      tasks.forEach((task, taskIndex) => {
        const taskText =
          typeof task === "string" && task.trim().length
            ? task.trim()
            : `Task ${taskIndex + 1}`;
        rows.push({
          depth: 2,
          cells: {
            topic: "",
            objective: "",
            task: taskText,
          },
        });
      });
    });

    if (!rows.length) {
      rows.push({
        cells: {
          topic: "No content defined for this lesson.",
          objective: "",
          task: "",
        },
      });
    }

    return {
      columns: [
        { key: "topic", label: "Topic" },
        { key: "objective", label: "Objective" },
        { key: "task", label: "Task" },
      ],
      rows,
      emptyMessage: "No content items yet.",
    };
  }

  private buildLessonAssignmentTable(lesson: CurriculumLesson): TableData {
    const topics = Array.isArray(lesson.topics) ? lesson.topics : [];
    const rows: TableRow[] = [];

    topics.forEach((topic, topicIndex) => {
      const topicTitle =
        typeof topic.title === "string" && topic.title.trim().length
          ? topic.title.trim()
          : `Topic ${topicIndex + 1}`;

      const tasks = Array.isArray(topic.tasks) ? topic.tasks : [];
      if (!tasks.length) {
        rows.push({
          cells: {
            assignment: `No assignments for ${topicTitle}`,
            details: "",
          },
        });
        return;
      }

      tasks.forEach((task, taskIndex) => {
        const taskText =
          typeof task === "string" && task.trim().length
            ? task.trim()
            : `Task ${taskIndex + 1}`;
        rows.push({
          depth: 0,
          cells: {
            assignment: taskText,
            details: topicTitle,
          },
        });
      });
    });

    if (!rows.length) {
      rows.push({
        cells: {
          assignment: "No assignments defined yet.",
          details: "",
        },
      });
    }

    return {
      columns: [
        { key: "assignment", label: "Assignment" },
        { key: "details", label: "Details" },
      ],
      rows,
      emptyMessage: "No assignments have been configured.",
    };
  }

  private pickTableCells(
    cells: Record<string, string>,
    keys: string[],
  ): Record<string, string> {
    const result: Record<string, string> = {};
    keys.forEach((key) => {
      const value = cells[key];
      if (typeof value === "string") {
        result[key] = value;
      } else if (value === null || value === undefined) {
        result[key] = "";
      } else {
        result[key] = String(value);
      }
    });
    return result;
  }

  private serializeTemplateBlock(
    block: TemplateDefinitionBlock,
  ): Record<string, unknown> {
    return {
      id: block.id,
      type: block.type,
      order: block.order,
      config: block.config,
      content: block.content,
    };
  }

  private summarizeLessonStructure(
    lesson: CurriculumLesson | null | undefined,
  ): { topics: number; objectives: number; tasks: number } {
    if (!lesson) {
      return { topics: 0, objectives: 0, tasks: 0 };
    }

    const topics = Array.isArray(lesson.topics) ? lesson.topics : [];

    let objectives = 0;
    let tasks = 0;

    topics.forEach((topic) => {
      objectives += Array.isArray(topic.objectives)
        ? topic.objectives.length
        : 0;
      tasks += Array.isArray(topic.tasks) ? topic.tasks.length : 0;
    });

    return {
      topics: topics.length,
      objectives,
      tasks,
    };
  }

  private getCanvasDimensions(): { width: number; height: number } {
    try {
      const dimensionManager = (window as any)?.canvasSystem?.dimensionManager;
      if (
        dimensionManager &&
        typeof dimensionManager.getCurrentDimensions === "function"
      ) {
        const dims = dimensionManager.getCurrentDimensions();
        if (
          this.isValidPositiveNumber(dims?.width) &&
          this.isValidPositiveNumber(dims?.height)
        ) {
          return { width: dims.width, height: dims.height };
        }
      }
    } catch {
      /* empty */
    }

    try {
      const api = (window as any)?.canvasAPI;
      if (api && typeof api.getDimensions === "function") {
        const dims = api.getDimensions();
        if (
          this.isValidPositiveNumber(dims?.width) &&
          this.isValidPositiveNumber(dims?.height)
        ) {
          return { width: dims.width, height: dims.height };
        }
      }
    } catch {
      /* empty */
    }

    return { ...this.defaultCanvasDimensions };
  }

  private resolveCanvasMargins(): {
    top: number;
    right: number;
    bottom: number;
    left: number;
    unit: string;
  } {
    const fallback = { ...this.defaultCanvasMargins };

    try {
      const marginManager =
        (window as any)?.canvasSystem?.marginManager ??
        (window as any)?.canvasMarginManager;

      if (marginManager && typeof marginManager.getMargins === "function") {
        const margins = marginManager.getMargins();
        if (
          margins &&
          this.isValidPositiveNumber(margins.top) &&
          this.isValidPositiveNumber(margins.right) &&
          this.isValidPositiveNumber(margins.bottom) &&
          this.isValidPositiveNumber(margins.left)
        ) {
          return {
            top: margins.top,
            right: margins.right,
            bottom: margins.bottom,
            left: margins.left,
            unit: typeof margins.unit === "string" ? margins.unit : "px",
          };
        }
      }
    } catch (error) {
      console.warn(
        "Unable to resolve canvas margins, using defaults instead:",
        error,
      );
    }

    return fallback;
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

  private createFallbackBlock(
    blockType: "header" | "footer",
    lessonNumber: number,
    lessonTitle: string,
  ): TemplateDefinitionBlock {
    if (blockType === "header") {
      return {
        id: `fallback-header-${lessonNumber}`,
        type: "header",
        order: -100,
        config: {
          showTitle: true,
          showSubtitle: true,
        },
        content: lessonTitle,
      };
    }

    return {
      id: `fallback-footer-${lessonNumber}`,
      type: "footer",
      order: 1000,
      config: {
        showSignature: false,
      },
      content: "Reflection & next steps",
    };
  }

  private isValidPositiveNumber(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value) && value > 0;
  }
}
