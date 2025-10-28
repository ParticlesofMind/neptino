import { CurriculumLesson, TemplateDefinitionBlock } from "../curriculumManager.js";
type FieldSpan = "full" | "half" | "third";

interface FieldValidationRule {
  type: "required" | "maxLength" | "allowedValues" | "pattern";
  value?: number | string | Array<string | number>;
  message?: string;
}

interface FieldVisibilityRule {
  fieldId: string;
  equals?: string | number | boolean;
  notEquals?: string | number | boolean;
  includes?: Array<string | number | boolean>;
  excludes?: Array<string | number | boolean>;
}

interface TemplateTableColumn {
  key: string;
  label: string;
  span?: FieldSpan;
  helpText?: string;
  placeholder?: string;
  validations?: FieldValidationRule[];
  visibility?: FieldVisibilityRule[];
  sectionId?: string;
  meta?: Record<string, unknown>;
}

interface TemplateTableRow {
  cells: Record<string, string>;
  depth?: number;
  sectionId?: string;
}

interface TemplateTableData {
  columns: TemplateTableColumn[];
  rows: TemplateTableRow[];
  emptyMessage?: string;
  sections?: Array<{ id: string; title: string; helpText?: string }>;
  meta?: Record<string, unknown>;
}

type TableRow = TemplateTableRow;
type TableData = TemplateTableData;

const FORM_WIDTH = 1240;
const FORM_HEIGHT = 1754;

interface BaseFieldConfig {
  key: string;
  label: string;
  span?: FieldSpan;
  helpText?: string;
  placeholder?: string;
  validations?: FieldValidationRule[];
  visibility?: FieldVisibilityRule[];
  sectionId?: string;
  meta?: Record<string, unknown>;
}

interface ColumnDef extends BaseFieldConfig {
  configKey: string;
}

interface FieldDef extends BaseFieldConfig {
  configKey: string;
  mandatory: boolean;
}

export class TableDataBuilder {
  /**
   * Build table data for a specific block type and lesson
   */
  static build(
    block: TemplateDefinitionBlock,
    lesson: CurriculumLesson,
  ): TableData | null {
    switch (block.type) {
      case "program":
        return TableDataBuilder.buildProgramTable(block, lesson);
      case "resources":
        return TableDataBuilder.buildResourcesTable(block);
      case "content":
        return TableDataBuilder.buildContentTable(block);
      case "assignment":
        return TableDataBuilder.buildAssignmentTable(block);
      default:
        return null;
    }
  }

  /**
   * Build program table data
   */
  private static buildProgramTable(
    block: TemplateDefinitionBlock,
    lesson: CurriculumLesson,
  ): TableData {
    const columnDefs: ColumnDef[] = [
      {
        key: "competency",
        label: "Competency",
        configKey: "competence",
        span: "full",
        helpText: "High-level competency guiding this lesson program.",
        placeholder: "[Describe the competency focus]",
        validations: [
          { type: "required", message: "Competency is required." },
          { type: "maxLength", value: 200 },
        ],
        sectionId: "depth-0",
      },
      {
        key: "topic",
        label: "Topic",
        configKey: "topic",
        span: "half",
        helpText: "Specific topic that supports the competency.",
        placeholder: "[Topic title]",
        validations: [
          { type: "required", message: "Topic is required." },
          { type: "maxLength", value: 160 },
        ],
        sectionId: "depth-1",
      },
      {
        key: "objective",
        label: "Objective",
        configKey: "objective",
        span: "half",
        helpText: "What students should achieve for this topic.",
        placeholder: "[Objective details]",
        validations: [
          { type: "required", message: "Objective is required." },
          { type: "maxLength", value: 200 },
        ],
        sectionId: "depth-2",
      },
      {
        key: "task",
        label: "Task",
        configKey: "task",
        span: "half",
        helpText: "Observable task or activity for the objective.",
        placeholder: "[Task description]",
        validations: [
          { type: "required", message: "Task is required." },
          { type: "maxLength", value: 200 },
        ],
        sectionId: "depth-3",
      },
      {
        key: "method",
        label: "Method",
        configKey: "program_method",
        span: "third",
        helpText: "Instructional method paired with the task.",
        placeholder: "[Method]",
        validations: [
          {
            type: "allowedValues",
            value: ["Lecture", "Discussion", "Workshop", "Experiment", "Debate"],
            message: "Choose an instructional method.",
          },
        ],
        sectionId: "depth-3",
        meta: { sectionTitle: "Instructional Methods" },
      },
      {
        key: "social",
        label: "Social Form",
        configKey: "program_social_form",
        span: "third",
        helpText: "Grouping or collaboration model.",
        placeholder: "[Social form]",
        validations: [
          {
            type: "allowedValues",
            value: ["Individual", "Pairs", "Small Group", "Whole Class"],
          },
        ],
        sectionId: "depth-3",
      },
      {
        key: "time",
        label: "Time",
        configKey: "program_time",
        span: "third",
        helpText: "Estimated time (minutes).",
        placeholder: "45",
        validations: [
          { type: "pattern", value: "^\\d{1,3}$", message: "Use minutes (e.g., 45)." },
        ],
        sectionId: "depth-3",
      },
    ];

    const columns = TableDataBuilder.filterColumns(columnDefs, block);
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
        cells: TableDataBuilder.fillCells(columnDefs, { competency: competencyLabel }),
      });

      rows.push({
        depth: 1,
        cells: TableDataBuilder.fillCells(columnDefs, { topic: topicTitle }),
      });

      const objectives = Array.isArray(topic.objectives) ? topic.objectives : [];
      objectives.forEach((objective, objectiveIndex) => {
        const objectiveText =
          typeof objective === "string" && objective.trim().length
            ? objective.trim()
            : `Objective ${objectiveIndex + 1}`;
        rows.push({
          depth: 2,
          cells: TableDataBuilder.fillCells(columnDefs, { objective: objectiveText }),
        });
      });

      const tasks = Array.isArray(topic.tasks) ? topic.tasks : [];
      tasks.forEach((task, taskIndex) => {
        const taskText =
          typeof task === "string" && task.trim().length ? task.trim() : `Task ${taskIndex + 1}`;
        rows.push({
          depth: 3,
          cells: TableDataBuilder.fillCells(columnDefs, { task: taskText }),
        });
      });
    });

    if (!rows.length) {
      rows.push({
        depth: 0,
        cells: TableDataBuilder.fillCells(columnDefs, {
          competency: "No lesson structure defined yet.",
        }),
      });
    }

    return {
      columns: columns.map((column) => TableDataBuilder.mapColumn(column)),
      rows: rows.map((row) => ({
        depth: row.depth,
        cells: TableDataBuilder.pickCells(row.cells, columns.map((c) => c.key)),
      })),
      emptyMessage: "Program structure has not been configured.",
      sections: [
        {
          id: "depth-0",
          title: "Competencies",
          helpText: "Define the overarching competencies that guide this lesson.",
        },
        {
          id: "depth-1",
          title: "Topics",
          helpText: "Outline the topics that support each competency.",
        },
        {
          id: "depth-2",
          title: "Objectives",
          helpText: "Describe measurable objectives for each topic.",
        },
        {
          id: "depth-3",
          title: "Tasks & Methods",
          helpText: "Break down tasks, instructional methods, and timing.",
        },
      ],
      meta: {
        width: FORM_WIDTH,
        height: FORM_HEIGHT,
        padding: 32,
        gap: 24,
      },
    };
  }

  /**
   * Build resources table data
   */
  private static buildResourcesTable(block: TemplateDefinitionBlock): TableData {
    const fieldDefs: FieldDef[] = [
      {
        key: "task",
        label: "Task",
        configKey: "task",
        mandatory: true,
        span: "half",
        helpText: "Task or learning activity the resource supports.",
        placeholder: "[Task name]",
        validations: [{ type: "required", message: "Task is required." }],
        sectionId: "resource-core",
      },
      {
        key: "type",
        label: "Type",
        configKey: "type",
        mandatory: true,
        span: "third",
        helpText: "Resource format or medium.",
        placeholder: "Video / Article / Worksheet",
        validations: [
          {
            type: "allowedValues",
            value: ["Video", "Article", "Worksheet", "Interactive", "Audio", "Other"],
            message: "Select the closest resource type.",
          },
        ],
        sectionId: "resource-core",
      },
      {
        key: "origin",
        label: "Origin",
        configKey: "origin",
        mandatory: true,
        span: "half",
        helpText: "Where learners can access the resource.",
        placeholder: "https://",
        validations: [
          { type: "required", message: "Origin or URL is required." },
          {
            type: "maxLength",
            value: 250,
          },
        ],
        sectionId: "resource-core",
      },
      {
        key: "state",
        label: "State",
        configKey: "state",
        mandatory: true,
        span: "third",
        helpText: "Current availability state.",
        placeholder: "Draft / Review / Published",
        validations: [
          {
            type: "allowedValues",
            value: ["Draft", "Review", "Published", "Archived"],
          },
        ],
        sectionId: "resource-quality",
      },
      {
        key: "quality",
        label: "Quality",
        configKey: "quality",
        mandatory: true,
        span: "third",
        helpText: "Quality rating once reviewed.",
        placeholder: "⭐️⭐️⭐️⭐️⭐️",
        validations: [
          {
            type: "allowedValues",
            value: ["Pending", "Needs Updates", "Acceptable", "Excellent"],
          },
        ],
        visibility: [
          {
            fieldId: "state",
            excludes: ["Draft", "Archived"],
          },
        ],
        sectionId: "resource-quality",
      },
    ];

    const activeFields = TableDataBuilder.filterFields(fieldDefs, block);
    const rows: TableRow[] = [
      {
        cells: {
          task: "[Task]",
          type: "[Type]",
          origin: "[Origin]",
          state: "[State]",
          quality: "[Quality]",
        },
      },
    ];

    const config = (block.config ?? {}) as Record<string, unknown>;
    const includeGlossary = config.include_glossary === true;
    
    if (includeGlossary) {
      const glossaryItems = [
        { name: "Historical figures", url: "[URL]" },
        { name: "Terminology", url: "[URL]" },
        { name: "Concepts", url: "[URL]" },
      ];

      glossaryItems.forEach((item) => {
        rows.push({
          cells: {
            task: item.name,
            type: "Glossary",
            origin: item.url,
            state: "",
            quality: "",
          },
        });
      });
    }

    return {
      columns: activeFields.map((field) => TableDataBuilder.mapField(field)),
      rows,
      emptyMessage: "No resources configured.",
      sections: [
        {
          id: "resource-core",
          title: "Resource Details",
          helpText: "Describe how the resource supports the learning experience.",
        },
        {
          id: "resource-quality",
          title: "Availability & Quality",
          helpText: "Track status and review quality for this resource.",
        },
      ],
      meta: {
        width: FORM_WIDTH,
        height: FORM_HEIGHT,
        padding: 32,
        gap: 20,
      },
    };
  }

  /**
   * Build content table data
   */
  private static buildContentTable(block: TemplateDefinitionBlock): TableData {
    const columnDefs = TableDataBuilder.createInstructionColumnDefs();
    const columns = TableDataBuilder.filterContentColumns(columnDefs, block);
    const config = (block.config ?? {}) as Record<string, unknown>;
    const rows: TableRow[] = [];

    // Competency (depth 0)
    if (config.competence !== false) {
      rows.push({
        depth: 0,
        cells: TableDataBuilder.fillCells(columnDefs, { content: "[Competency]" }),
      });
    }

    // Topic (depth 1)
    if (config.topic !== false) {
      rows.push({
        depth: 1,
        cells: TableDataBuilder.fillCells(columnDefs, { content: "[Topic]" }),
      });
    }

    // Objective (depth 2)
    if (config.objective !== false) {
      rows.push({
        depth: 2,
        cells: TableDataBuilder.fillCells(columnDefs, { content: "[Objective]" }),
      });
    }

    // Task (depth 3)
    if (config.task !== false) {
      rows.push({
        depth: 3,
        cells: TableDataBuilder.fillCells(columnDefs, { content: "[Task]" }),
      });
    }

    // Inside Task: 6 rows at depth 4
    // Row 1: Instruction Area
    if (config.instruction_area !== false) {
      rows.push({
        depth: 4,
        cells: TableDataBuilder.fillCells(columnDefs, { 
          content: "[Instruction Area]",
          method: config.instruction_method !== false ? "[Method]" : "",
          social: config.instruction_social_form !== false ? "[Social Form]" : "",
        }),
      });
    }

    // Row 2: Space for Instruction Area
    rows.push({
      depth: 4,
      cells: TableDataBuilder.fillCells(columnDefs, { content: "" }),
    });

    // Row 3: Student Area
    if (config.student_area !== false) {
      rows.push({
        depth: 4,
        cells: TableDataBuilder.fillCells(columnDefs, { 
          content: "[Student Area]",
          method: config.student_method !== false ? "[Method]" : "",
          social: config.student_social_form !== false ? "[Social Form]" : "",
        }),
      });
    }

    // Row 4: Space for Student Area
    rows.push({
      depth: 4,
      cells: TableDataBuilder.fillCells(columnDefs, { content: "" }),
    });

    // Row 5: Teacher Area
    if (config.teacher_area !== false) {
      rows.push({
        depth: 4,
        cells: TableDataBuilder.fillCells(columnDefs, { 
          content: "[Teacher Area]",
          method: config.teacher_method !== false ? "[Method]" : "",
          social: config.teacher_social_form !== false ? "[Social Form]" : "",
        }),
      });
    }

    // Row 6: Space for Teacher Area
    rows.push({
      depth: 4,
      cells: TableDataBuilder.fillCells(columnDefs, { content: "" }),
    });

    if (!rows.length) {
      rows.push({
        depth: 0,
        cells: TableDataBuilder.fillCells(columnDefs, {
          content: "No content structure defined yet.",
        }),
      });
    }

    return {
      columns: columns.map((column) => TableDataBuilder.mapColumn(column)),
      rows: rows.map((row) => ({
        depth: row.depth,
        cells: TableDataBuilder.pickCells(row.cells, columns.map((c) => c.key)),
      })),
      emptyMessage: "No content configured.",
      sections: [
        {
          id: "depth-0",
          title: "Content Overview",
          helpText: "Describe the content and timing for each lesson component.",
        },
        { id: "depth-1", title: "Topics" },
        { id: "depth-2", title: "Objectives" },
        { id: "depth-3", title: "Tasks" },
        {
          id: "depth-4",
          title: "Activity Areas",
          helpText: "Differentiate instruction, student, and teacher activities.",
        },
      ],
      meta: {
        width: FORM_WIDTH,
        height: FORM_HEIGHT,
        padding: 32,
        gap: 24,
      },
    };
  }

  /**
   * Filter columns for content blocks
   */
  private static filterContentColumns(columnDefs: ColumnDef[], block: TemplateDefinitionBlock): ColumnDef[] {
    const config = (block.config ?? {}) as Record<string, unknown>;
    
    return columnDefs.filter((column) => {
      // Content column is always shown
      if (column.key === "content") return true;
      
      // Other columns are shown based on configuration
      return config[column.configKey] === true;
    });
  }

  /**
   * Build assignment table data
   */
  private static buildAssignmentTable(block: TemplateDefinitionBlock): TableData {
    const columnDefs = TableDataBuilder.createInstructionColumnDefs().map((column) =>
      column.key === "content"
        ? {
            ...column,
            label: "Assignment",
            helpText: "Describe the assignment scaffolding for learners.",
            placeholder: "[Assignment details]",
          }
        : column,
    );

    const columns = TableDataBuilder.filterContentColumns(columnDefs, block);
    const config = (block.config ?? {}) as Record<string, unknown>;
    const rows: TableRow[] = [];

    // Competency (depth 0)
    if (config.competence !== false) {
      rows.push({
        depth: 0,
        cells: TableDataBuilder.fillCells(columnDefs, { content: "[Competency]" }),
      });
    }

    // Topic (depth 1)
    if (config.topic !== false) {
      rows.push({
        depth: 1,
        cells: TableDataBuilder.fillCells(columnDefs, { content: "[Topic]" }),
      });
    }

    // Objective (depth 2)
    if (config.objective !== false) {
      rows.push({
        depth: 2,
        cells: TableDataBuilder.fillCells(columnDefs, { content: "[Objective]" }),
      });
    }

    // Task (depth 3)
    if (config.task !== false) {
      rows.push({
        depth: 3,
        cells: TableDataBuilder.fillCells(columnDefs, { content: "[Task]" }),
      });
    }

    // Inside Task: 6 rows at depth 4
    // Row 1: Instruction Area
    if (config.instruction_area !== false) {
      rows.push({
        depth: 4,
        cells: TableDataBuilder.fillCells(columnDefs, { 
          content: "[Instruction Area]",
          method: config.instruction_method !== false ? "[Method]" : "",
          social: config.instruction_social_form !== false ? "[Social Form]" : "",
        }),
      });
    }

    // Row 2: Space for Instruction Area
    rows.push({
      depth: 4,
      cells: TableDataBuilder.fillCells(columnDefs, { content: "" }),
    });

    // Row 3: Student Area
    if (config.student_area !== false) {
      rows.push({
        depth: 4,
        cells: TableDataBuilder.fillCells(columnDefs, { 
          content: "[Student Area]",
          method: config.student_method !== false ? "[Method]" : "",
          social: config.student_social_form !== false ? "[Social Form]" : "",
        }),
      });
    }

    // Row 4: Space for Student Area
    rows.push({
      depth: 4,
      cells: TableDataBuilder.fillCells(columnDefs, { content: "" }),
    });

    // Row 5: Teacher Area
    if (config.teacher_area !== false) {
      rows.push({
        depth: 4,
        cells: TableDataBuilder.fillCells(columnDefs, { 
          content: "[Teacher Area]",
          method: config.teacher_method !== false ? "[Method]" : "",
          social: config.teacher_social_form !== false ? "[Social Form]" : "",
        }),
      });
    }

    // Row 6: Space for Teacher Area
    rows.push({
      depth: 4,
      cells: TableDataBuilder.fillCells(columnDefs, { content: "" }),
    });

    if (!rows.length) {
      rows.push({
        depth: 0,
        cells: TableDataBuilder.fillCells(columnDefs, {
          content: "No assignment structure defined yet.",
        }),
      });
    }

    return {
      columns: columns.map((column) => TableDataBuilder.mapColumn(column)),
      rows: rows.map((row) => ({
        depth: row.depth,
        cells: TableDataBuilder.pickCells(row.cells, columns.map((c) => c.key)),
      })),
      emptyMessage: "No assignment configured.",
      sections: [
        {
          id: "depth-0",
          title: "Assignment Overview",
          helpText: "Capture the competency and core expectations for the assignment.",
        },
        { id: "depth-1", title: "Topics" },
        { id: "depth-2", title: "Objectives" },
        { id: "depth-3", title: "Tasks" },
        {
          id: "depth-4",
          title: "Activity Areas",
          helpText: "Detail what students and teachers do during the assignment.",
        },
      ],
      meta: {
        width: FORM_WIDTH,
        height: FORM_HEIGHT,
        padding: 32,
        gap: 24,
      },
    };
  }

  /**
   * Filter columns based on configuration
   */
  private static filterColumns(columnDefs: ColumnDef[], block: TemplateDefinitionBlock): ColumnDef[] {
    const config = (block.config ?? {}) as Record<string, unknown>;
    const mandatoryKeys = ["competence", "topic", "objective", "task"];
    const optionalKeys = ["program_method", "program_social_form", "program_time"];

    const activeColumns = columnDefs.filter((column) => {
      const isMandatory = mandatoryKeys.includes(column.configKey);
      const isOptional = optionalKeys.includes(column.configKey);
      
      if (isMandatory) {
        return config[column.configKey] !== false;
      } else if (isOptional) {
        return config[column.configKey] === true;
      }
      
      return true;
    });

    if (activeColumns.length > 0) return activeColumns;

    // Ensure we always have at least the core mandatory columns
    return columnDefs.filter(col => mandatoryKeys.includes(col.configKey));
  }

  /**
   * Filter fields based on configuration
   */
  private static filterFields(fieldDefs: FieldDef[], block: TemplateDefinitionBlock): FieldDef[] {
    const config = (block.config ?? {}) as Record<string, unknown>;
    
    return fieldDefs.filter((field) => {
      if (field.mandatory) {
        return config[field.configKey] !== false;
      } else {
        return config[field.configKey] === true;
      }
    });
  }

  /**
   * Fill cells for a row with provided values
   */
  private static fillCells(
    columnDefs: ColumnDef[],
    values: Record<string, string>,
  ): Record<string, string> {
    const cells: Record<string, string> = {};
    
    columnDefs.forEach((col) => {
      cells[col.key] = values[col.key] || "";
    });
    
    return cells;
  }

  /**
   * Pick specific cells from a row
   */
  private static pickCells(cells: Record<string, string>, keys: string[]): Record<string, string> {
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

  private static mapColumn(column: BaseFieldConfig): TemplateTableColumn {
    return {
      key: column.key,
      label: column.label,
      span: column.span,
      helpText: column.helpText,
      placeholder: column.placeholder,
      validations: column.validations
        ? column.validations.map((rule) => ({ ...rule }))
        : undefined,
      visibility: column.visibility
        ? column.visibility.map((rule) => ({
            fieldId: rule.fieldId,
            equals: rule.equals,
            notEquals: rule.notEquals,
            includes: rule.includes ? [...rule.includes] : undefined,
            excludes: rule.excludes ? [...rule.excludes] : undefined,
          }))
        : undefined,
      sectionId: column.sectionId,
      meta: column.meta ? { ...column.meta } : undefined,
    };
  }

  private static mapField(field: FieldDef): TemplateTableColumn {
    return TableDataBuilder.mapColumn(field);
  }

  private static createInstructionColumnDefs(): ColumnDef[] {
    return [
      {
        key: "content",
        label: "Content",
        configKey: "competence",
        span: "full",
        helpText: "Primary instructional content or activity description.",
        placeholder: "[Content details]",
        validations: [
          { type: "required", message: "Content is required." },
          { type: "maxLength", value: 280 },
        ],
        sectionId: "depth-0",
      },
      {
        key: "time",
        label: "Time",
        configKey: "competence_time",
        span: "third",
        helpText: "Estimated duration for this slice of the lesson (minutes).",
        placeholder: "45",
        validations: [
          { type: "pattern", value: "^\\d{1,3}$", message: "Use minutes (e.g., 45)." },
        ],
        sectionId: "depth-0",
      },
      {
        key: "method",
        label: "Method",
        configKey: "instruction_method",
        span: "third",
        helpText: "Instructional method that best supports the learning.",
        placeholder: "[Method]",
        validations: [
          {
            type: "allowedValues",
            value: ["Lecture", "Discussion", "Workshop", "Experiment", "Project"],
          },
        ],
        sectionId: "depth-4",
      },
      {
        key: "social",
        label: "Social Form",
        configKey: "instruction_social_form",
        span: "third",
        helpText: "Grouping strategy for learners.",
        placeholder: "[Social form]",
        validations: [
          {
            type: "allowedValues",
            value: ["Individual", "Pairs", "Small Group", "Whole Class"],
          },
        ],
        sectionId: "depth-4",
      },
    ];
  }

}
