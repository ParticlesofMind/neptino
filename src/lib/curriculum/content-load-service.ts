/**
 * Content Load Service
 * Maps session duration to topic/objective/task counts
 * Based on legacy curriculum patterns
 */

export interface ContentLoadConfig {
  topicsPerLesson: number
  objectivesPerTopic: number
  tasksPerObjective: number
}

export interface DurationPreset {
  name: "mini" | "single" | "double" | "triple" | "fullday"
  minDuration: number
  maxDuration: number
  config: ContentLoadConfig
}

const DURATION_PRESETS: DurationPreset[] = [
  {
    name: "mini",
    minDuration: 0,
    maxDuration: 30,
    config: { topicsPerLesson: 1, objectivesPerTopic: 1, tasksPerObjective: 2 },
  },
  {
    name: "single",
    minDuration: 31,
    maxDuration: 60,
    config: { topicsPerLesson: 2, objectivesPerTopic: 2, tasksPerObjective: 3 },
  },
  {
    name: "double",
    minDuration: 61,
    maxDuration: 120,
    config: { topicsPerLesson: 3, objectivesPerTopic: 3, tasksPerObjective: 4 },
  },
  {
    name: "triple",
    minDuration: 121,
    maxDuration: 180,
    config: { topicsPerLesson: 4, objectivesPerTopic: 4, tasksPerObjective: 5 },
  },
  {
    name: "fullday",
    minDuration: 181,
    maxDuration: Infinity,
    config: { topicsPerLesson: 5, objectivesPerTopic: 5, tasksPerObjective: 6 },
  },
]

/**
 * Parse time string (HH:MM format) to minutes since midnight
 */
function parseTimeToMinutes(timeStr?: string): number | null {
  if (!timeStr) return null
  const match = timeStr.match(/^(\d{1,2}):(\d{2})/)
  if (!match) return null
  const hours = parseInt(match[1], 10)
  const minutes = parseInt(match[2], 10)
  return hours * 60 + minutes
}

/**
 * Calculate session duration in minutes from start and end times
 */
export function calculateSessionDuration(startTime?: string, endTime?: string): number | null {
  const start = parseTimeToMinutes(startTime)
  const end = parseTimeToMinutes(endTime)

  if (start === null || end === null) return null
  if (end <= start) return null // Invalid time range

  return end - start
}

/**
 * Get content load config for a given duration (in minutes)
 */
export function getContentLoadConfig(durationMinutes: number | null): ContentLoadConfig | null {
  if (durationMinutes === null) return null

  const preset = DURATION_PRESETS.find(
    (p) => durationMinutes >= p.minDuration && durationMinutes <= p.maxDuration,
  )

  return preset?.config ?? null
}

/**
 * Get preset name for a given duration
 */
export function getDurationPresetName(durationMinutes: number | null): string | null {
  if (durationMinutes === null) return null

  const preset = DURATION_PRESETS.find(
    (p) => durationMinutes >= p.minDuration && durationMinutes <= p.maxDuration,
  )

  return preset?.name ?? null
}

/**
 * Get all available duration presets
 */
export function listDurationPresets(): DurationPreset[] {
  return DURATION_PRESETS
}

/**
 * Calculate cumulative stats for a list of configs
 */
export function aggregateContentLoadConfigs(configs: ContentLoadConfig[]): ContentLoadConfig {
  if (configs.length === 0) {
    // Default fallback
    return { topicsPerLesson: 2, objectivesPerTopic: 2, tasksPerObjective: 3 }
  }

  const avgTopics = Math.round(configs.reduce((sum, c) => sum + c.topicsPerLesson, 0) / configs.length)
  const avgObjectives = Math.round(
    configs.reduce((sum, c) => sum + c.objectivesPerTopic, 0) / configs.length,
  )
  const avgTasks = Math.round(
    configs.reduce((sum, c) => sum + c.tasksPerObjective, 0) / configs.length,
  )

  return {
    topicsPerLesson: Math.max(1, avgTopics),
    objectivesPerTopic: Math.max(1, avgObjectives),
    tasksPerObjective: Math.max(1, avgTasks),
  }
}
