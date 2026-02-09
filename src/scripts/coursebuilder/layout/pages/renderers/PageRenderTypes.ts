import type { LayoutNode } from "../PageMetadata";

export type PlaceholderKind =
  | "generic"
  | "competency"
  | "topic"
  | "objective"
  | "task"
  | "method"
  | "social"
  | "time"
  | "module"
  | "course"
  | "institution"
  | "teacher";

export interface PageContainerConfig {
  width?: number;
  height?: number;
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  showDebugBorders?: boolean;
}

export interface TemplateSectionFieldConfig {
  values: Record<string, unknown>;
  order: string[];
  labels: Map<string, string>;
}

export interface LayoutSearchNode extends LayoutNode {
  children?: LayoutSearchNode[];
}
