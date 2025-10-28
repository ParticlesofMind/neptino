import type {
  FormField,
  FormGridData,
  FormSection,
  FieldSpan,
  FieldValidationRule,
  FieldVisibilityRule,
  TemplateTableColumn,
  TemplateTableData,
  TemplateTableRow,
} from "./TemplateFieldTypes.js";

const DEFAULT_FORM_WIDTH = 1240;
const DEFAULT_FORM_HEIGHT = 1754;
const DEFAULT_GAP = 24;
const DEFAULT_PADDING = 32;

interface BuildOptions {
  width?: number;
  height?: number;
  gap?: number;
  padding?: number;
}

interface SectionDescriptor {
  id: string;
  title: string;
}

export class FormGridBuilder {
  /**
   * Convert legacy table data into a flexible grid representation consumable by the renderer.
   */
  static fromTableData(
    table: TemplateTableData | null | undefined,
    options: BuildOptions = {},
  ): FormGridData | null {
    if (!table || !Array.isArray(table.columns) || table.columns.length === 0) {
      return null;
    }

    const width =
      options.width ??
      (typeof table.meta?.width === "number" ? table.meta.width : DEFAULT_FORM_WIDTH);
    const height =
      options.height ??
      (typeof table.meta?.height === "number" ? table.meta.height : DEFAULT_FORM_HEIGHT);
    const gap =
      options.gap ?? (typeof table.meta?.gap === "number" ? table.meta.gap : DEFAULT_GAP);
    const padding =
      options.padding ??
      (typeof table.meta?.padding === "number" ? table.meta.padding : DEFAULT_PADDING);

    const sectionsMap = new Map<string, FormSection>();
    const sectionOrder: string[] = [];
    const definedSections = new Map<string, { title: string; helpText?: string }>();

    if (Array.isArray(table.sections)) {
      table.sections.forEach((section) => {
        definedSections.set(section.id, { title: section.title, helpText: section.helpText });
      });
      definedSections.forEach((definition, id) => {
        this.ensureSection(id, definition.title, definition.helpText, sectionsMap, sectionOrder);
      });
    }

    const rows = Array.isArray(table.rows) ? table.rows : [];
    const rowCount = rows.length || 1;
    const columnCount = table.columns.length;

    rows.forEach((row, rowIndex) => {
      const descriptor = this.resolveSectionDescriptor(
        row,
        table.columns,
        rowIndex,
        definedSections,
      );

      table.columns.forEach((column) => {
        const targetSectionId = column.sectionId ?? row.sectionId ?? descriptor.id;
        const definition = definedSections.get(targetSectionId);
        const sectionTitle =
          definition?.title ??
          column.meta?.sectionTitle ??
          (column.sectionId ? column.label : descriptor.title);
        const sectionHelp = definition?.helpText;

        const section = this.ensureSection(
          targetSectionId,
          sectionTitle,
          sectionHelp,
          sectionsMap,
          sectionOrder,
        );

        const field = this.createField(
          column,
          row,
          rowIndex,
          rowCount,
          columnCount,
          targetSectionId,
        );
        if (field) {
          section.fields.push(field);
        }
      });
    });

    if (sectionsMap.size === 0) {
      const fallbackSection = this.ensureSection(
        "values",
        "Template Values",
        undefined,
        sectionsMap,
        sectionOrder,
      );
      table.columns.forEach((column, columnIndex) => {
        const pseudoRow: TemplateTableRow = {
          cells: table.rows?.[0]?.cells ?? {},
          depth: table.rows?.[0]?.depth,
        };
        const field = this.createField(column, pseudoRow, columnIndex, 1, columnCount, "values");
        if (field) {
          fallbackSection.fields.push(field);
        }
      });
    }

    const sections = sectionOrder
      .map((id) => sectionsMap.get(id))
      .filter((section): section is FormSection => !!section && section.fields.length > 0);

    if (!sections.length) {
      return null;
    }

    return {
      width,
      height,
      gap,
      padding,
      sections,
      meta: {
        ...table.meta,
        source: "table-data",
        hasDepth: rows.some((row) => typeof row.depth === "number"),
      },
    };
  }

  private static ensureSection(
    id: string,
    title: string,
    helpText: string | undefined,
    map: Map<string, FormSection>,
    order: string[],
  ): FormSection {
    let created = false;
    if (!map.has(id)) {
      map.set(id, {
        id,
        title,
        helpText,
        fields: [],
      });
      created = true;
    }

    const section = map.get(id)!;
    if (!section.title) {
      section.title = title;
    }
    if (helpText && !section.helpText) {
      section.helpText = helpText;
    }
    if (created) {
      order.push(id);
    } else if (!order.includes(id)) {
      order.push(id);
    }
    return section;
  }

  private static resolveSectionDescriptor(
    row: TemplateTableRow,
    columns: TemplateTableColumn[],
    rowIndex: number,
    definitions: Map<string, { title: string; helpText?: string }>,
  ): SectionDescriptor {
    if (row.sectionId) {
      const defined = definitions.get(row.sectionId);
      if (defined) {
        return { id: row.sectionId, title: defined.title };
      }
      const sectionColumn = columns.find((column) => column.sectionId === row.sectionId);
      if (sectionColumn) {
        return { id: row.sectionId, title: sectionColumn.label };
      }
      return { id: row.sectionId, title: row.sectionId };
    }

    const depth = typeof row.depth === "number" ? row.depth : 0;
    const depthKey = `depth-${depth}`;
    const depthDefinition = definitions.get(depthKey);
    if (depthDefinition) {
      return { id: depthKey, title: depthDefinition.title };
    }

    const fallbackColumn = columns.find((column) => {
      const cell = row.cells?.[column.key];
      return typeof cell === "string" && cell.trim().length > 0;
    });

    return {
      id: depthKey,
      title: fallbackColumn?.label ?? `Group ${rowIndex + 1}`,
    };
  }

  private static createField(
    column: TemplateTableColumn,
    row: TemplateTableRow,
    rowIndex: number,
    rowCount: number,
    columnCount: number,
    sectionId: string,
  ): FormField | null {
    const baseId = this.resolveBaseId(column);
    const requireRowIndex = column.meta?.singleton === true ? false : rowCount > 1;
    const id = requireRowIndex ? `${baseId}-${rowIndex + 1}` : baseId;

    const stateKey =
      typeof column.meta?.stateKey === "string" && column.meta.stateKey.length
        ? column.meta.stateKey
        : column.key;

    const value = row.cells?.[column.key] ?? "";
    const width = column.span ?? this.resolveDefaultSpan(columnCount);
    const validations = column.validations ? [...column.validations] : undefined;

    const error = this.evaluateValidations(value, validations);
    const visibility = column.visibility ? this.cloneVisibility(column.visibility) : undefined;

    return {
      id,
      label: column.label,
      value,
      width,
      helpText: column.helpText,
      error,
      placeholder: column.placeholder,
      validations,
      visibility,
      stateKey,
      meta: {
        ...column.meta,
        columnKey: column.key,
        sectionId,
        rowIndex,
        depth: row.depth,
      },
    };
  }

  private static resolveBaseId(column: TemplateTableColumn): string {
    if (typeof column.meta?.fieldId === "string" && column.meta.fieldId.trim().length) {
      return column.meta.fieldId.trim();
    }
    return column.key;
  }

  private static resolveDefaultSpan(columnCount: number): FieldSpan {
    if (columnCount <= 1) return "full";
    if (columnCount === 2) return "half";
    return "third";
  }

  private static cloneVisibility(rules: FieldVisibilityRule[]): FieldVisibilityRule[] {
    return rules.map((rule) => ({
      fieldId: rule.fieldId,
      equals: rule.equals,
      notEquals: rule.notEquals,
      includes: rule.includes ? [...rule.includes] : undefined,
      excludes: rule.excludes ? [...rule.excludes] : undefined,
    }));
  }

  private static evaluateValidations(
    value: string | undefined,
    rules: FieldValidationRule[] | undefined,
  ): string | null {
    if (!rules || !rules.length) {
      return null;
    }

    for (const rule of rules) {
      switch (rule.type) {
        case "required":
          if (this.isEmptyValue(value)) {
            return rule.message ?? "This field is required.";
          }
          break;
        case "maxLength":
          if (typeof rule.value === "number" && typeof value === "string" && value.length > rule.value) {
            return rule.message ?? `Maximum length is ${rule.value} characters.`;
          }
          break;
        case "allowedValues":
          if (
            Array.isArray(rule.value) &&
            rule.value.length > 0 &&
            typeof value === "string" &&
            !rule.value.map(String).includes(value)
          ) {
            return (
              rule.message ??
              `Value must be one of: ${rule.value.map((item) => String(item)).join(", ")}`
            );
          }
          break;
        case "pattern":
          if (typeof rule.value === "string" && typeof value === "string") {
            try {
              const regex = new RegExp(rule.value);
              if (!regex.test(value)) {
                return rule.message ?? "Value does not match required format.";
              }
            } catch {
              // Invalid regex - ignore validation
            }
          }
          break;
        default:
          break;
      }
    }

    return null;
  }

  private static isEmptyValue(value: string | undefined): boolean {
    if (!value || !value.trim().length) {
      return true;
    }
    const trimmed = value.trim();
    return trimmed.startsWith("[") && trimmed.endsWith("]");
  }
}
