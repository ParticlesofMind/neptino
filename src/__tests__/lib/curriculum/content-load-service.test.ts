import { describe, expect, it } from "vitest"
import {
  calculateSessionDuration,
  getContentLoadConfig,
  getDurationPresetName,
  MIN_TASKS_PER_OBJECTIVE,
  normalizeContentLoadConfig,
} from "@/lib/curriculum/content-load-service"

describe("normalizeContentLoadConfig()", () => {
  it("clamps tasksPerObjective to MIN_TASKS_PER_OBJECTIVE minimum", () => {
    const result = normalizeContentLoadConfig({ topicsPerLesson: 1, objectivesPerTopic: 2, tasksPerObjective: 0 })
    expect(result.tasksPerObjective).toBe(MIN_TASKS_PER_OBJECTIVE)
  })

  it("caps objectivesPerTopic at 2 for sessions >= 121 minutes", () => {
    const result = normalizeContentLoadConfig(
      { topicsPerLesson: 3, objectivesPerTopic: 10, tasksPerObjective: 3 },
      150,
    )
    expect(result.objectivesPerTopic).toBe(2)
  })

  it("allows up to 5 objectives for sessions < 121 minutes", () => {
    const result = normalizeContentLoadConfig(
      { topicsPerLesson: 1, objectivesPerTopic: 5, tasksPerObjective: 2 },
      60,
    )
    expect(result.objectivesPerTopic).toBe(5)
  })

  it("rounds fractional topic counts", () => {
    // toSafeCount uses Math.round
    const result = normalizeContentLoadConfig({ topicsPerLesson: 1.6, objectivesPerTopic: 2, tasksPerObjective: 2 })
    expect(result.topicsPerLesson).toBe(2)
  })
})

describe("calculateSessionDuration()", () => {
  it("returns duration in minutes between two times", () => {
    expect(calculateSessionDuration("09:00", "10:30")).toBe(90)
  })

  it("returns null when end is before start", () => {
    expect(calculateSessionDuration("10:00", "09:00")).toBeNull()
  })

  it("returns null when times are missing", () => {
    expect(calculateSessionDuration(undefined, "10:00")).toBeNull()
    expect(calculateSessionDuration("09:00", undefined)).toBeNull()
  })
})

describe("getContentLoadConfig()", () => {
  it("maps a 45-minute session to the 'single' preset", () => {
    const config = getContentLoadConfig(45)
    expect(config).not.toBeNull()
    expect(config!.topicsPerLesson).toBe(1)
  })

  it("maps a 90-minute session to the 'double' preset", () => {
    const config = getContentLoadConfig(90)
    expect(config).not.toBeNull()
    expect(config!.topicsPerLesson).toBe(2)
  })

  it("returns null for null input", () => {
    expect(getContentLoadConfig(null)).toBeNull()
  })
})

describe("getDurationPresetName()", () => {
  it("identifies 'mini' for sessions under 30 minutes", () => {
    expect(getDurationPresetName(20)).toBe("mini")
  })

  it("identifies 'marathon' for sessions over 240 minutes", () => {
    expect(getDurationPresetName(300)).toBe("marathon")
  })

  it("returns null for null input", () => {
    expect(getDurationPresetName(null)).toBeNull()
  })
})
