export type FieldSpan = "full" | "half" | "third";

export interface FieldValidationRule {
  type: "required" | "maxLength" | "allowedValues" | "pattern";
  value?: number | string | Array<string | number>;
  message?: string;
}

export interface FieldVisibilityRule {
  fieldId: string;
  equals?: string | number | boolean;
  notEquals?: string | number | boolean;
  includes?: Array<string | number | boolean>;
  excludes?: Array<string | number | boolean>;
}

export interface TemplateTableColumn {
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

export interface TemplateTableRow {
  cells: Record<string, string>;
  depth?: number;
  sectionId?: string;
}

export interface TemplateTableData {
  columns: TemplateTableColumn[];
  rows: TemplateTableRow[];
  emptyMessage?: string;
  sections?: Array<{
    id: string;
    title: string;
    helpText?: string;
  }>;
  meta?: Record<string, unknown>;
}

export interface FormField {
  id: string;
  label: string;
  value?: string;
  width?: FieldSpan;
  helpText?: string;
  error?: string | null;
  placeholder?: string;
  validations?: FieldValidationRule[];
  visibility?: FieldVisibilityRule[];
  stateKey?: string;
  meta?: Record<string, unknown>;
}

export interface FormSection {
  id: string;
  title: string;
  helpText?: string;
  fields: FormField[];
}

export interface FormGridData {
  width: number;
  height: number;
  gap?: number;
  padding?: number;
  sections: FormSection[];
  meta?: Record<string, unknown>;
}

export type FormFieldState = Record<string, string | number | boolean | null | undefined>;

export const TEMPLATE_FIELD_TYPES_RUNTIME_MARKER = true;
