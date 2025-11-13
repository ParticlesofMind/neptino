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

    // Identify header fields (topic, competence, objective, task)
    const headerFields = ['topic', 'competence', 'objective', 'task'];
    
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
          isHeaderRow: headerFields.includes(field.name),
          headerLabel: headerFields.includes(field.name) ? field.label : undefined,
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

    // Build nested hierarchical structure: headers contain their child headers
    // Assign hierarchy levels: Topic=0, Competency=1, Objective=2, Task=3
    const headerOrder = ['topic', 'competence', 'objective', 'task'];
    const headerStack: FieldRow[] = []; // Stack to track nested headers
    const finalRows: FieldRow[] = [];

    rows.forEach((row) => {
      if (row.isHeaderRow) {
        // Determine hierarchy level based on header order
        const headerName = row.groupId.toLowerCase();
        const hierarchyLevel = headerOrder.indexOf(headerName);
        
        const newHeader: FieldRow = {
          ...row,
          childRows: [],
          hierarchyLevel: hierarchyLevel >= 0 ? hierarchyLevel : headerStack.length,
        };

        // Pop headers from stack that are at same or higher level (siblings or parents)
        while (headerStack.length > 0 && 
               (headerStack[headerStack.length - 1].hierarchyLevel ?? 0) >= hierarchyLevel) {
          const popped = headerStack.pop()!;
          if (headerStack.length === 0) {
            // Top-level header - add to final rows
            finalRows.push(popped);
          } else {
            // Nested header - add to parent's children
            headerStack[headerStack.length - 1].childRows!.push(popped);
          }
        }

        // Push new header onto stack
        headerStack.push(newHeader);
      } else {
        // This is a child row (Instruction/Student/Teacher areas)
        // Add to the most recent header (should be Task, hierarchy level 3)
        if (headerStack.length > 0) {
          const currentHeader = headerStack[headerStack.length - 1];
          if (!currentHeader.childRows) {
            currentHeader.childRows = [];
          }
          
          // Set hierarchy level to match parent
          const childRow: FieldRow = {
            ...row,
            hierarchyLevel: currentHeader.hierarchyLevel,
          };
          currentHeader.childRows.push(childRow);
          
          // For instruction/student/teacher areas, add empty row after the label row
          if (row.groupId === 'instruction' || row.groupId === 'student' || row.groupId === 'teacher') {
            currentHeader.childRows.push({
              groupId: `${row.groupId}_empty`,
              indentLevel: row.indentLevel,
              hierarchyLevel: currentHeader.hierarchyLevel,
              placeholders: { primary: "", time: "", method: "", social: "" },
            });
          }
        } else {
          // No header yet (shouldn't happen in normal flow, but handle gracefully)
          finalRows.push(row);
        }
      }
    });

    // Pop remaining headers from stack
    while (headerStack.length > 0) {
      const popped = headerStack.pop()!;
      if (headerStack.length === 0) {
        finalRows.push(popped);
      } else {
        headerStack[headerStack.length - 1].childRows!.push(popped);
      }
    }

    return finalRows;
  }

  private static renderRowsTable(rows: FieldRow[]): string {
    if (!rows.length) {
      return "";
    }

    return `
<article class="lesson-plan-grid lesson-plan-grid--hierarchy" aria-label="Lesson plan hierarchy">
${rows
  .map((row, index) => {
    if (row.isHeaderRow) {
      const isLastHeader = index === rows.length - 1;
      return this.renderHeaderRowWithChildren(row, isLastHeader);
    }
    return this.renderDataTable([row]);
  })
  .join("")}
</article>
`;
  }

  private static renderHeaderRowWithChildren(headerRow: FieldRow, isLastHeader: boolean): string {
    const headerLabel = headerRow.headerLabel || headerRow.placeholders.primary || "";
    const hierarchyLevel = headerRow.hierarchyLevel ?? 0;
    const hierarchyClass = ` lesson-plan-grid__group--hierarchy-${hierarchyLevel}`;
    
    // Show time for Topic (0) and Objective (2)
    const showTime = (hierarchyLevel === 0 || hierarchyLevel === 2) && headerRow.placeholders.time;
    const timeDisplay = showTime ? `<span class="lesson-plan-grid__header-time">${headerRow.placeholders.time}</span>` : "";
    
    let html = `
<section class="lesson-plan-grid__group${hierarchyClass}">
  <header class="lesson-plan-grid__header">
    <h6 class="lesson-plan-grid__title">${headerLabel.toUpperCase()}${timeDisplay}</h6>
  </header>
  <div class="lesson-plan-grid__content">`;

    if (headerRow.childRows && headerRow.childRows.length > 0) {
      let bufferedRows: FieldRow[] = [];

      const flushBufferedRows = (): void => {
        if (bufferedRows.length > 0) {
          html += this.renderDataTable(bufferedRows);
          bufferedRows = [];
        }
      };

      headerRow.childRows.forEach((childRow, index) => {
        if (childRow.isHeaderRow) {
          flushBufferedRows();
          const isLastChild = index === headerRow.childRows!.length - 1;
          html += this.renderHeaderRowWithChildren(childRow, isLastChild && isLastHeader);
        } else {
          bufferedRows.push(childRow);

          const isLastChild = index === headerRow.childRows!.length - 1;
          if (isLastChild) {
            flushBufferedRows();
          }
        }
      });

      flushBufferedRows();
    }

    html += `
  </div>
</section>`;

    return html;
  }

  private static renderDataTable(rows: FieldRow[]): string {
    if (!rows.length) {
      return "";
    }

    return `
  <div class="lesson-plan-grid__table-wrapper">
    <table class="lesson-plan-grid__table">
      <tbody>
${rows.map((row) => this.renderRow(row)).join("")}
      </tbody>
    </table>
  </div>
`;
  }

  private static renderRow(row: FieldRow): string {
    const indentClass = row.indentLevel
      ? ` lesson-plan-grid__cell--indent-${row.indentLevel}`
      : "";
    
    const isEmpty = !row.placeholders.primary && 
                    !row.placeholders.method && !row.placeholders.social;
    
    const hierarchyLevel = row.hierarchyLevel ?? 0;
    const hierarchyClass = ` lesson-plan-grid__row--hierarchy-${hierarchyLevel}`;

    if (isEmpty) {
      return `
        <tr class="lesson-plan-grid__row lesson-plan-grid__row--empty${hierarchyClass}">
          <td class="lesson-plan-grid__cell lesson-plan-grid__cell--empty" colspan="3"></td>
        </tr>
`;
    }

    return `
        <tr class="lesson-plan-grid__row${hierarchyClass}">
          <td class="lesson-plan-grid__cell lesson-plan-grid__cell--primary${indentClass}">${row.placeholders.primary ?? ""}</td>
          <td class="lesson-plan-grid__cell lesson-plan-grid__cell--method">${row.placeholders.method ?? ""}</td>
          <td class="lesson-plan-grid__cell lesson-plan-grid__cell--social">${row.placeholders.social ?? ""}</td>
        </tr>
`;
  }

  private static renderProjectExtension(sectionTitle: string): string {
    // Build project rows with flat header structure (each header encompasses rows until next header)
    // Hierarchy levels: Topic=0, Competence=1, Objective=2, Task=3
    const projectRows: FieldRow[] = [
      {
        groupId: "project_topic",
        indentLevel: 0,
        isHeaderRow: true,
        headerLabel: "Project Topic",
        hierarchyLevel: 0,
        placeholders: {
          primary: this.formatPlaceholder("Project Topic"),
          time: this.formatPlaceholder("Time"),
        },
        childRows: [
          {
            groupId: "project_competence",
            indentLevel: 0,
            isHeaderRow: true,
            headerLabel: "Project Competence",
            hierarchyLevel: 1,
            placeholders: {
              primary: this.formatPlaceholder("Project Competence"),
              time: this.formatPlaceholder("Time"),
            },
            childRows: [
              {
                groupId: "project_objective",
                indentLevel: 0,
                isHeaderRow: true,
                headerLabel: "Project Objective",
                hierarchyLevel: 2,
                placeholders: {
                  primary: this.formatPlaceholder("Project Objective"),
                  time: this.formatPlaceholder("Time"),
                },
                childRows: [
                  {
                    groupId: "project_task",
                    indentLevel: 0,
                    isHeaderRow: true,
                    headerLabel: "Project Task",
                    hierarchyLevel: 3,
                    placeholders: {
                      primary: this.formatPlaceholder("Project Task"),
                      time: this.formatPlaceholder("Time"),
                    },
                    childRows: [
                      {
                        groupId: "project_instruction",
                        indentLevel: 1,
                        hierarchyLevel: 3, // Align with Task
                        placeholders: {
                          primary: this.formatPlaceholder("Project Instruction Area"),
                          method: this.formatPlaceholder("Method"),
                          social: this.formatPlaceholder("Social form"),
                        },
                      },
                      {
                        groupId: "project_instruction_empty",
                        indentLevel: 1,
                        hierarchyLevel: 3, // Align with Task
                        placeholders: { primary: "", time: "", method: "", social: "" },
                      },
                      {
                        groupId: "project_student",
                        indentLevel: 1,
                        hierarchyLevel: 3, // Align with Task
                        placeholders: {
                          primary: this.formatPlaceholder("Project Student Area"),
                          method: this.formatPlaceholder("Method"),
                          social: this.formatPlaceholder("Social form"),
                        },
                      },
                      {
                        groupId: "project_student_empty",
                        indentLevel: 1,
                        hierarchyLevel: 3, // Align with Task
                        placeholders: { primary: "", time: "", method: "", social: "" },
                      },
                      {
                        groupId: "project_teacher",
                        indentLevel: 1,
                        hierarchyLevel: 3, // Align with Task
                        placeholders: {
                          primary: this.formatPlaceholder("Project Teacher Area"),
                          method: this.formatPlaceholder("Method"),
                          social: this.formatPlaceholder("Social form"),
                        },
                      },
                      {
                        groupId: "project_teacher_empty",
                        indentLevel: 1,
                        hierarchyLevel: 3, // Align with Task
                        placeholders: { primary: "", time: "", method: "", social: "" },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
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
<td>${getPlaceholder("topic")}</td>
<td>${getPlaceholder("competence")}</td>
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
