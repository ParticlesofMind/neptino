/**
 * Data Normalizer
 *
 * Robust type-safe normalization for curriculum and pedagogical data.
 * Converts messy or partial input into canonical types with sensible defaults.
 *
 * Ported from legacy architecture and modernized for React/Next.js stack.
 */

export type MethodType =
  | "Lecture"
  | "Discussion"
  | "Activity"
  | "Assessment"
  | "Lab"
  | "Workshop"
  | "Seminar"

export type SocialFormType =
  | "Individual"
  | "Pairs"
  | "Small Group"
  | "Whole Class"
  | "Online"
  | "Hybrid"

export type StructureSummary = {
  topics: number
  objectives: number
  tasks: number
} | null

export class DataNormalizer {
  /**
   * Normalize teaching/delivery method string to canonical MethodType.
   * Falls back to "Lecture" if unrecognized.
   */
  static method(method?: string | null): MethodType {
    if (!method) {
      return "Lecture"
    }

    switch (method.trim().toLowerCase()) {
      case "lecture":
        return "Lecture"
      case "discussion":
        return "Discussion"
      case "activity":
        return "Activity"
      case "assessment":
        return "Assessment"
      case "lab":
        return "Lab"
      case "workshop":
        return "Workshop"
      case "seminar":
        return "Seminar"
      default:
        return "Lecture"
    }
  }

  /**
   * Normalize social form / grouping type to canonical SocialFormType.
   * Falls back to "Whole Class" if unrecognized.
   */
  static socialForm(socialForm?: string | null): SocialFormType {
    if (!socialForm) {
      return "Whole Class"
    }

    switch (socialForm.trim().toLowerCase()) {
      case "individual":
      case "solo":
        return "Individual"
      case "pairs":
      case "pair":
      case "partner":
        return "Pairs"
      case "small group":
      case "groups":
      case "group":
        return "Small Group"
      case "whole class":
      case "class":
      case "full class":
        return "Whole Class"
      case "online":
        return "Online"
      case "hybrid":
        return "Hybrid"
      default:
        return "Whole Class"
    }
  }

  /**
   * Parse layout node from unknown input (JSON string or object).
   * Returns null if invalid.
   */
  static layout<T extends Record<string, unknown> = Record<string, unknown>>(
    layout: unknown,
  ): T | null {
    if (!layout) {
      return null
    }

    if (typeof layout === "string") {
      try {
        return JSON.parse(layout) as T
      } catch (error) {
        console.warn("⚠️ Failed to parse layout JSON string:", error)
        return null
      }
    }

    if (typeof layout === "object") {
      return layout as T
    }

    return null
  }

  /**
   * Extract lesson structure (topics, objectives, tasks) from object.
   * Handles multiple naming conventions and derives missing counts.
   * Returns null if no structure data found.
   */
  static structure(structure: unknown): StructureSummary {
    if (!structure || typeof structure !== "object") {
      return null
    }

    const record = structure as Record<string, unknown>
    const toNumber = (value: unknown): number =>
      typeof value === "number" && Number.isFinite(value) ? value : 0

    const topics = toNumber(
      record.topics ?? record.topicCount ?? record.topicsPerLesson,
    )
    let objectives = toNumber(record.objectives ?? record.objectiveCount)
    let tasks = toNumber(record.tasks ?? record.taskCount)

    // Derive objectives if not provided but objectivesPerTopic is available
    const objectivesPerTopic = toNumber(record.objectivesPerTopic)
    if (!objectives && objectivesPerTopic && topics) {
      objectives = objectivesPerTopic * topics
    }

    // Derive tasks if not provided but tasksPerObjective is available
    const tasksPerObjective = toNumber(record.tasksPerObjective)
    if (!tasks && tasksPerObjective && objectives) {
      tasks = tasksPerObjective * objectives
    }

    // If still no structure, return null
    if (!topics && !objectives && !tasks) {
      return null
    }

    return { topics, objectives, tasks }
  }

  /**
   * Normalize date string to ISO 8601 format.
   * Handles YYYY-MM-DD, ISO strings, and common formats.
   * Falls back to current date if invalid.
   */
  static date(value: string): string {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return new Date(`${value}T12:00:00Z`).toISOString()
    }

    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?Z$/.test(value)) {
      return value.length === 16 ? `${value}:00Z` : value
    }

    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString()
    }

    return new Date().toISOString()
  }

  /**
   * Check if a string is a valid date.
   */
  static isValidDate(value: string): boolean {
    if (!value || typeof value !== "string") {
      return false
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return true
    }

    const parsed = new Date(value)
    return !Number.isNaN(parsed.getTime())
  }

  /**
   * Resolve first non-empty string from fallback chain.
   * Useful for handling optional/null fields with defaults.
   */
  static resolveString(
    ...values: Array<string | null | undefined>
  ): string | null {
    for (const value of values) {
      if (typeof value === "string") {
        const trimmed = value.trim()
        if (trimmed.length) {
          return trimmed
        }
      }
    }
    return null
  }

  /**
   * Extract and trim string value from object property.
   * Returns null if not found or empty.
   */
  static extractString(source: unknown, key: string): string | null {
    if (!source || typeof source !== "object") {
      return null
    }

    const record = source as Record<string, unknown>
    const value = record[key]

    if (typeof value === "string") {
      const trimmed = value.trim()
      return trimmed.length ? trimmed : null
    }

    return null
  }
}
