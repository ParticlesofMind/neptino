import type { LayoutNode } from "../PageMetadata";
import type { PlaceholderKind } from "./PageRenderTypes";

export const sanitizeTextInput = (input: string | null | undefined): string => {
  if (typeof input !== "string") {
    return "";
  }

  const withoutHtml = input
    .replace(/<[^>]*>/g, " ")
    .replace(/\{\{[^}]+\}\}/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");

  return withoutHtml.replace(/\s+/g, " ").trim();
};

export const isPlaceholderLabel = (text: string, kind: PlaceholderKind): boolean => {
  const normalized = text.trim().toLowerCase();

  switch (kind) {
    case "topic":
      return /^(topic|topic title)(\s+\d+)?$/.test(normalized);
    case "objective":
      return /^objective(\s+\d+)?$/.test(normalized);
    case "task":
      return /^task(\s+\d+)?$/.test(normalized);
    case "competency":
      return /^competency(\s+\d+)?$/.test(normalized);
    case "method":
      return normalized === "method";
    case "social":
      return normalized === "social" || normalized === "social form";
    case "time":
      return normalized === "time";
    case "module":
      return /^module(\s+\d+)?$/.test(normalized);
    case "course":
      return normalized === "course" || normalized === "course name";
    case "institution":
      return normalized === "institution" || normalized === "institution name";
    case "teacher":
      return normalized === "teacher" || normalized === "teacher name";
    default:
      return (
        normalized === "content section" ||
        normalized === "header" ||
        normalized === "footer" ||
        normalized === "section" ||
        normalized === "content" ||
        normalized === "course title" ||
        normalized === "teacher" ||
        normalized === "institution"
      );
  }
};

export const normalizeString = (value: string, kind: PlaceholderKind): string => {
  const sanitized = sanitizeTextInput(value);
  if (!sanitized || isPlaceholderLabel(sanitized, kind)) {
    return "";
  }
  return sanitized;
};

export const resolvePlaceholderKind = (columnKey: string): PlaceholderKind => {
  switch (columnKey) {
    case "competency":
      return "competency";
    case "topic":
      return "topic";
    case "objective":
      return "objective";
    case "task":
      return "task";
    case "method":
      return "method";
    case "social":
      return "social";
    case "time":
      return "time";
    default:
      return "generic";
  }
};

export const toDisplayString = (value: unknown, kind: PlaceholderKind = "generic"): string => {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return normalizeString(value, kind);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return normalizeString(String(value), kind);
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => toDisplayString(entry, kind))
      .filter((entry) => entry.length > 0)
      .join(", ");
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.name === "string") {
      return normalizeString(record.name, kind);
    }
    if (typeof record.title === "string") {
      return normalizeString(record.title, kind);
    }
    if (typeof record.label === "string") {
      return normalizeString(record.label, kind);
    }
    if (typeof record.value === "string") {
      return normalizeString(record.value, kind);
    }
  }

  return "";
};

export const formatBlockTitle = (block: LayoutNode): string => {
  if (block.type === "placeholder") {
    return "";
  }

  const content = block.templateBlock?.content;
  if (typeof content === "string" && content.trim().length > 0) {
    const normalized = normalizeString(content, "generic");
    if (normalized) {
      return normalized;
    }
  }

  if (block.type) {
    const normalizedType = block.type.toLowerCase();
    if (normalizedType === "content" || normalizedType === "container") {
      return "";
    }

    return block.type
      .split(/[-_]/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  return "";
};
