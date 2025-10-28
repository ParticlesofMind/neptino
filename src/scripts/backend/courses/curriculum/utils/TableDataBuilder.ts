import { CurriculumLesson, TemplateDefinitionBlock } from "../curriculumManager.js";
import type { TableRow, TableData } from "../../../coursebuilder/layout/utils/TableRenderer.js";

interface ColumnDef {
  key: string;
  label: string;
  configKey: string;
}

interface FieldDef {
  key: string;
  label: string;
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
      { key: "competency", label: "Competency", configKey: "competence" },
      { key: "topic", label: "Topic", configKey: "topic" },
      { key: "objective", label: "Objective", configKey: "objective" },
      { key: "task", label: "Task", configKey: "task" },
      { key: "method", label: "Method", configKey: "program_method" },
      { key: "social", label: "Social Form", configKey: "program_social_form" },
      { key: "time", label: "Time", configKey: "program_time" },
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
      columns: columns.map(({ key, label }) => ({ key, label })),
      rows: rows.map((row) => ({
        depth: row.depth,
        cells: TableDataBuilder.pickCells(row.cells, columns.map((c) => c.key)),
      })),
      emptyMessage: "Program structure has not been configured.",
    };
  }

  /**
   * Build resources table data
   */
  private static buildResourcesTable(block: TemplateDefinitionBlock): TableData {
    const fieldDefs: FieldDef[] = [
      { key: "task", label: "Task", configKey: "task", mandatory: true },
      { key: "type", label: "Type", configKey: "type", mandatory: true },
      { key: "origin", label: "Origin", configKey: "origin", mandatory: true },
      { key: "state", label: "State", configKey: "state", mandatory: true },
      { key: "quality", label: "Quality", configKey: "quality", mandatory: true },
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
      columns: activeFields.map((field) => ({ key: field.key, label: field.label })),
      rows,
      emptyMessage: "No resources configured.",
    };
  }

  /**
   * Build content table data
   */
  private static buildContentTable(block: TemplateDefinitionBlock): TableData {
    const columnDefs: ColumnDef[] = [
      { key: "content", label: "Content", configKey: "competence" },
      { key: "time", label: "Time", configKey: "competence_time" },
      { key: "method", label: "Method", configKey: "instruction_method" },
      { key: "social", label: "Social Form", configKey: "instruction_social_form" },
    ];

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
      columns: columns.map(({ key, label }) => ({ key, label })),
      rows: rows.map((row) => ({
        depth: row.depth,
        cells: TableDataBuilder.pickCells(row.cells, columns.map((c) => c.key)),
      })),
      emptyMessage: "No content configured.",
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
    const columnDefs: ColumnDef[] = [
      { key: "content", label: "Assignment", configKey: "competence" },
      { key: "time", label: "Time", configKey: "competence_time" },
      { key: "method", label: "Method", configKey: "instruction_method" },
      { key: "social", label: "Social Form", configKey: "instruction_social_form" },
    ];

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
      columns: columns.map(({ key, label }) => ({ key, label })),
      rows: rows.map((row) => ({
        depth: row.depth,
        cells: TableDataBuilder.pickCells(row.cells, columns.map((c) => c.key)),
      })),
      emptyMessage: "No assignment configured.",
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
}

