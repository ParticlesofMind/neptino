import type { LayoutNode, MethodType, SocialFormType } from "../../coursebuilder/layout/pages/PageMetadata";

type StructureSummary = { topics: number; objectives: number; tasks: number } | null;

export class DataNormalizer {
  static method(method?: string | null): MethodType {
    if (!method) {
      return "Lecture";
    }

    switch (method.trim().toLowerCase()) {
      case "lecture":
        return "Lecture";
      case "discussion":
        return "Discussion";
      case "activity":
        return "Activity";
      case "assessment":
        return "Assessment";
      case "lab":
        return "Lab";
      case "workshop":
        return "Workshop";
      case "seminar":
        return "Seminar";
      default:
        return "Lecture";
    }
  }

  static socialForm(socialForm?: string | null): SocialFormType {
    if (!socialForm) {
      return "Whole Class";
    }

    switch (socialForm.trim().toLowerCase()) {
      case "individual":
      case "solo":
        return "Individual";
      case "pairs":
      case "pair":
      case "partner":
        return "Pairs";
      case "small group":
      case "groups":
      case "group":
        return "Small Group";
      case "whole class":
      case "class":
      case "full class":
        return "Whole Class";
      case "online":
        return "Online";
      case "hybrid":
        return "Hybrid";
      default:
        return "Whole Class";
    }
  }

  static layout(layout: unknown): LayoutNode | null {
    if (!layout) {
      return null;
    }

    if (typeof layout === "string") {
      try {
        return JSON.parse(layout) as LayoutNode;
      } catch (error) {
        console.warn("⚠️ Failed to parse layout JSON string:", error);
        return null;
      }
    }

    if (typeof layout === "object") {
      return layout as LayoutNode;
    }

    return null;
  }

  static structure(structure: unknown): StructureSummary {
    if (!structure || typeof structure !== "object") {
      return null;
    }

    const record = structure as Record<string, unknown>;
    const toNumber = (value: unknown): number =>
      typeof value === "number" && Number.isFinite(value) ? value : 0;

    let topics = toNumber(record.topics ?? record.topicCount ?? record.topicsPerLesson);
    let objectives = toNumber(record.objectives ?? record.objectiveCount);
    let tasks = toNumber(record.tasks ?? record.taskCount);

    const objectivesPerTopic = toNumber(record.objectivesPerTopic);
    if (!objectives && objectivesPerTopic && topics) {
      objectives = objectivesPerTopic * topics;
    }

    const tasksPerObjective = toNumber(record.tasksPerObjective);
    if (!tasks && tasksPerObjective && objectives) {
      tasks = tasksPerObjective * objectives;
    }

    if (!topics && !objectives && !tasks) {
      return null;
    }

    return { topics, objectives, tasks };
  }

  static date(value: string): string {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return new Date(`${value}T12:00:00Z`).toISOString();
    }

    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?Z$/.test(value)) {
      return value.length === 16 ? `${value}:00Z` : value;
    }

    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }

    return new Date().toISOString();
  }

  static isValidDate(value: string): boolean {
    if (!value || typeof value !== "string") {
      return false;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return true;
    }

    const parsed = new Date(value);
    return !Number.isNaN(parsed.getTime());
  }

  static resolveString(...values: Array<string | null | undefined>): string | null {
    for (const value of values) {
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed.length) {
          return trimmed;
        }
      }
    }
    return null;
  }

  static extractString(source: unknown, key: string): string | null {
    if (!source || typeof source !== "object") {
      return null;
    }

    const record = source as Record<string, unknown>;
    const value = record[key];

    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed.length ? trimmed : null;
    }

    return null;
  }
}
