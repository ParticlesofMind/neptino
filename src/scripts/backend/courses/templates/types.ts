import { TemplateBlockType, TemplateType } from "./templateOptions.js";

// Re-export types for easier importing
export { TemplateBlockType, TemplateType };

export interface TemplateData {
  template_id: string;
  course_id?: string;
  template_description?: string;
  template_type: TemplateType;
  template_data: {
    name: string;
    blocks: TemplateBlock[];
    settings: Record<string, any>;
  };
}

export interface TemplateBlock {
  id: string;
  type: TemplateBlockType;
  order: number;
  config: Record<string, boolean | undefined>;
  content: string;
}

export interface BlockFieldConfig {
  name: string;
  label: string;
  mandatory: boolean;
  separator?: boolean;
  indentLevel?: number;
  inlineGroup?: string;
  role?: "primary" | "time" | "method" | "social";
}

export interface FieldRow {
  groupId: string;
  indentLevel: number;
  placeholders: {
    [key: string]: string;
  };
}

export interface TemplateManagerState {
  currentlyLoadedTemplateId: string | null;
  currentlyLoadedTemplateData: any;
}
