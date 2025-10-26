import { CurriculumLesson, TemplateDefinitionBlock } from "../curriculumManager.js";
import type { TableColumn, TableRow, TableData } from "../../../coursebuilder/layout/utils/TableRenderer.js";

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
    const fieldDefs: FieldDef[] = [
      { key: "topic", label: "Topic", configKey: "topic", mandatory: true },
      { key: "objective", label: "Objective", configKey: "objective", mandatory: true },
      { key: "task", label: "Task", configKey: "task", mandatory: true },
      { key: "instruction_area", label: "Instruction Area", configKey: "instruction_area", mandatory: true },
      { key: "student_area", label: "Student Area", configKey: "student_area", mandatory: true },
      { key: "teacher_area", label: "Teacher Area", configKey: "teacher_area", mandatory: true },
    ];

    const activeFields = TableDataBuilder.filterFields(fieldDefs, block);
    const rows: TableRow[] = activeFields.map((field, index) => ({
      cells: {
        content: field.label,
      },
      depth: index < 3 ? index : 2,
    }));

    return {
      columns: [{ key: "content", label: "Content Structure" }],
      rows,
      emptyMessage: "No content configured.",
    };
  }

  /**
   * Build assignment table data
   */
  private static buildAssignmentTable(block: TemplateDefinitionBlock): TableData {
    const fieldDefs: FieldDef[] = [
      { key: "assignment", label: "Assignment", configKey: "task", mandatory: true },
      { key: "details", label: "Details", configKey: "assignment_details", mandatory: false },
      { key: "time", label: "Time", configKey: "assignment_time", mandatory: false },
      { key: "method", label: "Method", configKey: "assignment_method", mandatory: false },
      { key: "social", label: "Social Form", configKey: "assignment_social_form", mandatory: false },
    ];

    const activeFields = TableDataBuilder.filterFields(fieldDefs, block);
    const rows: TableRow[] = activeFields.map((field) => ({
      cells: {
        assignment: field.label,
      },
      depth: 2,
    }));

    return {
      columns: [{ key: "assignment", label: "Assignment Structure" }],
      rows,
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

