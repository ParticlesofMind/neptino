import { TemplateBlock, TemplateBlockType, BlockFieldConfig, FieldRow } from "./types.js";

export class TemplateBlockRenderer {
  private static formatPlaceholder(label: string): string {
    return `<span class="template-placeholder">${label}</span>`;
  }

  static renderBlockContent(block: TemplateBlock, checkedFields: BlockFieldConfig[]): string {
    if (block.type === "resources") {
      return this.renderResourcesBlockContent(checkedFields, block);
    }

    if (block.type === "program") {
      return this.renderProgramBlockContent(checkedFields);
    }

    if (block.type === "content" || block.type === "assignment") {
      return this.renderNestedBlockContent(block, checkedFields);
    }

    // Default table rendering for other blocks - single row with values only
    return `
<table class="lesson-plan-table">
<tbody>
<tr>
${checkedFields
  .map((field) => `
<td>${this.formatPlaceholder(field.label)}</td>
`)
  .join("")}
</tr>
</tbody>
</table>
`;
  }

  static renderNestedBlockContent(block: TemplateBlock, checkedFields: BlockFieldConfig[]): string {
    const rows = this.buildFieldRows(checkedFields);
    const baseTable = this.renderRowsTable(rows);

    if (!baseTable) {
      return '<p class="preview-placeholder">No fields selected</p>';
    }

    const includeProject = Boolean(block.config?.include_project);
    const projectSection = includeProject
      ? this.renderProjectExtension(block.type === "assignment" ? "Project Assignment" : "Project")
      : "";

    return `${baseTable}${projectSection}`;
  }

  private static buildFieldRows(fields: BlockFieldConfig[]): FieldRow[] {
    const rows: FieldRow[] = [];
    const rowIndex = new Map<string, number>();

    fields.forEach((field) => {
      if (field.separator || field.name === "include_project") {
        return;
      }

      // Skip space rows - they'll be added separately
      if (field.name.endsWith('_space')) {
        return;
      }

      const groupId = field.inlineGroup || field.name;
      if (!rowIndex.has(groupId)) {
        rowIndex.set(groupId, rows.length);
        rows.push({
          groupId,
          indentLevel: field.indentLevel ?? 0,
          placeholders: {},
        });
      }

      const row = rows[rowIndex.get(groupId)!];
      const placeholder = this.formatPlaceholder(field.label);

      switch (field.role) {
        case "time":
          row.placeholders.time = placeholder;
          break;
        case "method":
          row.placeholders.method = placeholder;
          break;
        case "social":
          row.placeholders.social = placeholder;
          break;
        default:
          row.placeholders.primary = placeholder;
      }
    });

    // Add space rows after instruction, student, and teacher areas
    const finalRows: FieldRow[] = [];
    rows.forEach((row) => {
      finalRows.push(row);
      
      // Add space row after instruction, student, and teacher areas
      if (row.groupId === 'instruction' || row.groupId === 'student' || row.groupId === 'teacher') {
        finalRows.push({
          groupId: `${row.groupId}_space`,
          indentLevel: row.indentLevel,
          placeholders: { primary: "" },
        });
      }
    });

    return finalRows;
  }

  private static renderRowsTable(rows: FieldRow[]): string {
    if (!rows.length) {
      return "";
    }

    const body = rows.map((row) => this.renderRow(row)).join("");

    return `
<table class="lesson-plan-table lesson-plan-table--hierarchy">
<tbody>
${body}
</tbody>
</table>
`;
  }

  private static renderRow(row: FieldRow): string {
    const indentClass = row.indentLevel
      ? ` lesson-plan-table__cell--indent-${row.indentLevel}`
      : "";

    return `
<tr>
<td class="lesson-plan-table__cell lesson-plan-table__cell--primary${indentClass}">${row.placeholders.primary ?? ""}</td>
<td class="lesson-plan-table__cell lesson-plan-table__cell--time">${row.placeholders.time ?? ""}</td>
<td class="lesson-plan-table__cell lesson-plan-table__cell--method">${row.placeholders.method ?? ""}</td>
<td class="lesson-plan-table__cell lesson-plan-table__cell--social">${row.placeholders.social ?? ""}</td>
</tr>
`;
  }

  private static renderProjectExtension(sectionTitle: string): string {
    const projectRows: FieldRow[] = [
      {
        groupId: "project_competence",
        indentLevel: 0,
        placeholders: {
          primary: this.formatPlaceholder("Project Competence"),
          time: this.formatPlaceholder("Time"),
        },
      },
      {
        groupId: "project_topic",
        indentLevel: 1,
        placeholders: {
          primary: this.formatPlaceholder("Project Topic"),
          time: this.formatPlaceholder("Time"),
        },
      },
      {
        groupId: "project_objective",
        indentLevel: 2,
        placeholders: {
          primary: this.formatPlaceholder("Project Objective"),
          time: this.formatPlaceholder("Time"),
        },
      },
      {
        groupId: "project_task",
        indentLevel: 3,
        placeholders: {
          primary: this.formatPlaceholder("Project Task"),
          time: this.formatPlaceholder("Time"),
        },
      },
      {
        groupId: "project_instruction",
        indentLevel: 4,
        placeholders: {
          primary: this.formatPlaceholder("Project Instruction Area"),
          method: this.formatPlaceholder("Method"),
          social: this.formatPlaceholder("Social form"),
        },
      },
      {
        groupId: "project_student",
        indentLevel: 4,
        placeholders: {
          primary: this.formatPlaceholder("Project Student Area"),
          method: this.formatPlaceholder("Method"),
          social: this.formatPlaceholder("Social form"),
        },
      },
      {
        groupId: "project_teacher",
        indentLevel: 4,
        placeholders: {
          primary: this.formatPlaceholder("Project Teacher Area"),
          method: this.formatPlaceholder("Method"),
          social: this.formatPlaceholder("Social form"),
        },
      },
    ];

    return `
<h5 class="preview-block__subtitle">${sectionTitle}</h5>
${this.renderRowsTable(projectRows)}
`;
  }

  private static renderProgramBlockContent(fields: BlockFieldConfig[]): string {
    const lookup = new Map<string, BlockFieldConfig>();
    fields.forEach((field) => {
      lookup.set(field.name, field);
    });

    const getPlaceholder = (name: string): string => {
      const field = lookup.get(name);
      return field ? this.formatPlaceholder(field.label) : "";
    };

    // Create single row with all fields on the same row
    return `
<table class="lesson-plan-table lesson-plan-table--program">
<tbody>
<tr>
<td>${getPlaceholder("competence")}</td>
<td>${getPlaceholder("topic")}</td>
<td>${getPlaceholder("objective")}</td>
<td>${getPlaceholder("task")}</td>
<td>${getPlaceholder("program_method")}</td>
<td>${getPlaceholder("program_social_form")}</td>
<td>${getPlaceholder("program_time")}</td>
</tr>
</tbody>
</table>
`;
  }

  static renderResourcesBlockContent(checkedFields: BlockFieldConfig[], block?: TemplateBlock): string {
    // Get main resource fields (excluding glossary items)
    const mainFields = checkedFields.filter(
      (field) =>
        ![
          "include_glossary",
          "historical_figures",
          "terminology",
          "concepts",
        ].includes(field.name),
    );

    // Check if glossary is included from the block config
    const includeGlossary = block?.config?.["include_glossary"] === true;

    // Get glossary items that are selected (checked)
    const glossaryItems = checkedFields.filter((field) =>
      ["historical_figures", "terminology", "concepts"].includes(field.name),
    );

    let html = "";

    // Main resources table - single row with values only
    if (mainFields.length > 0) {
      html += `
<table class="lesson-plan-table">
<tbody>
<tr>
${mainFields
  .map(
    (field) => `
<td>${this.formatPlaceholder(field.label)}</td>
`,
  )
  .join("")}
</tr>
</tbody>
</table>
`;
    }

    // Glossary section - each selected item gets its own row
    if (includeGlossary && glossaryItems.length > 0) {
      html += `
<h5 class="preview-block__subtitle">Glossary</h5>
<table class="lesson-plan-table">
<tbody>
${glossaryItems
  .map(
    (item) => `
<tr>
<td>${item.label}</td>
<td>${this.formatPlaceholder("URL")}</td>
</tr>
`,
  )
  .join("")}
</tbody>
</table>
`;
    }

    return html;
  }

  static getBlockPreviewContent(block: TemplateBlock): string {
    // If block has custom content, show it (removing HTML tags for preview)
    if (block.content && block.content.trim() !== "") {
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = block.content;
      const textContent = tempDiv.textContent || tempDiv.innerText || "";
      return (
        textContent.replace(/\{\{.*?\}\}/g, "[Dynamic Content]") ||
        this.getDefaultBlockContent(block.type)
      );
    }

    return this.getDefaultBlockContent(block.type);
  }

  static getDefaultBlockContent(blockType: TemplateBlockType): string {
    const defaultContent: Record<TemplateBlockType, string> = {
      header: "Course title and introduction will appear here",
      body: "Main body content container - contains all nested blocks",
      footer: "Credits and additional information will appear here",
      program: "Learning objectives and outcomes will be displayed here",
      resources: "Files, links, and materials will be listed here",
      content: "Main lesson content and materials will appear here",
      assignment: "Tasks and submission instructions will be shown here",
      scoring: "Evaluation criteria and scoring details will appear here",
    };
    return defaultContent[blockType] || "Block content will appear here";
  }
}
