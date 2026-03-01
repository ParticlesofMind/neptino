// Utility types and functions for the generate-curriculum API route.
// Extracted to keep route.ts focused on the HTTP handler and LLM integration.
import { MIN_TASKS_PER_OBJECTIVE, normalizeContentLoadConfig } from "@/lib/curriculum/content-load-service"

/** Shape of each lesson in the generated curriculum */
export interface GeneratedLesson {
  lessonNumber: number
  lessonTitle: string
  topics: string[]
  objectives: string[]
  tasks: string[]
}

export interface GeneratedModule {
  moduleNumber: number
  moduleTitle: string
}

export interface PromptLessonConstraint {
  lessonNumber: number
  durationMinutes?: number
  topics?: number
  objectives?: number
  tasks?: number
}

export interface PromptGlobalConstraint {
  topics?: number
  objectives?: number
  tasks?: number
}

/**
 * Attempt to repair common JSON issues produced by LLMs.
 * Handles: trailing commas, control characters, single quotes, truncated output, etc.
 */
export function repairJSON(raw: string): string {
  let s = raw

  // Remove BOM / zero-width chars
  s = s.replace(/^\uFEFF/, "").replace(/[\u200B-\u200D\uFEFF]/g, "")

  // Remove control characters except \n, \r, \t
  s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")

  // Replace single-quoted strings with double-quoted (heuristic for common patterns)
  s = s.replace(/(?<=[{,\[]\s*)'([^']+?)'\s*:/g, '"$1":')
  s = s.replace(/:\s*'([^']*?)'/g, ': "$1"')

  // Remove trailing commas before } or ]
  s = s.replace(/,\s*([}\]])/g, "$1")

  // Count open vs close braces/brackets to detect truncation
  let braces = 0
  let brackets = 0
  let inString = false
  let escape = false
  for (const ch of s) {
    if (escape) { escape = false; continue }
    if (ch === "\\") { escape = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue
    if (ch === "{") braces++
    else if (ch === "}") braces--
    else if (ch === "[") brackets++
    else if (ch === "]") brackets--
  }

  // Close unclosed string
  if (inString) s += '"'

  // Close unclosed brackets/braces (inner first)
  while (brackets > 0) { s += "]"; brackets-- }
  while (braces > 0) { s += "}"; braces-- }

  // Final trailing comma cleanup
  s = s.replace(/,\s*([}\]])/g, "$1")

  return s
}

/**
 * Regex-based fallback: extract individual lesson objects from malformed JSON.
 * Works even when the overall JSON structure is broken (e.g. truncated mid-lesson).
 */
export function extractLessonsViaRegex(text: string): GeneratedLesson[] {
  const lessons: GeneratedLesson[] = []

  // Match individual lesson-like objects: { "lessonNumber": N, ... }
  // We look for complete-ish objects that have at least lessonNumber and lessonTitle
  const lessonPattern = /\{\s*"lessonNumber"\s*:\s*(\d+)\s*,\s*"lessonTitle"\s*:\s*"([^"]*?)"/g
  let match

  while ((match = lessonPattern.exec(text)) !== null) {
    const startIdx = match.index

    // Find the closing brace for this lesson object by counting braces
    let depth = 0
    let inStr = false
    let esc = false
    let endIdx = -1

    for (let i = startIdx; i < text.length; i++) {
      const ch = text[i]
      if (esc) { esc = false; continue }
      if (ch === "\\") { esc = true; continue }
      if (ch === '"') { inStr = !inStr; continue }
      if (inStr) continue
      if (ch === "{") depth++
      else if (ch === "}") {
        depth--
        if (depth === 0) { endIdx = i; break }
      }
    }

    if (endIdx === -1) {
      // Truncated object — try to repair just this fragment
      const fragment = text.slice(startIdx)
      try {
        const repaired = repairJSON(fragment)
        const obj = JSON.parse(repaired)
        if (obj.lessonNumber && obj.lessonTitle) {
          lessons.push({
            lessonNumber: obj.lessonNumber,
            lessonTitle: obj.lessonTitle,
            topics: Array.isArray(obj.topics) ? obj.topics : [],
            objectives: Array.isArray(obj.objectives) ? obj.objectives : [],
            tasks: Array.isArray(obj.tasks) ? obj.tasks : [],
          })
        }
      } catch {
        // This fragment is too broken — skip it
        console.warn(`[generate-curriculum] Could not repair lesson fragment at index ${startIdx}`)
      }
      break // Truncated = last lesson, stop here
    }

    const objStr = text.slice(startIdx, endIdx + 1)
    try {
      const obj = JSON.parse(objStr)
      if (obj.lessonNumber && obj.lessonTitle) {
        lessons.push({
          lessonNumber: obj.lessonNumber,
          lessonTitle: obj.lessonTitle,
          topics: Array.isArray(obj.topics) ? obj.topics : [],
          objectives: Array.isArray(obj.objectives) ? obj.objectives : [],
          tasks: Array.isArray(obj.tasks) ? obj.tasks : [],
        })
      }
    } catch {
      // Individual object parse failed — try repair
      try {
        const repaired = repairJSON(objStr)
        const obj = JSON.parse(repaired)
        if (obj.lessonNumber && obj.lessonTitle) {
          lessons.push({
            lessonNumber: obj.lessonNumber,
            lessonTitle: obj.lessonTitle,
            topics: Array.isArray(obj.topics) ? obj.topics : [],
            objectives: Array.isArray(obj.objectives) ? obj.objectives : [],
            tasks: Array.isArray(obj.tasks) ? obj.tasks : [],
          })
        }
      } catch {
        console.warn(`[generate-curriculum] Skipping malformed lesson object at index ${startIdx}`)
      }
    }
  }

  return lessons
}

export function extractModulesViaRegex(text: string): GeneratedModule[] {
  const modules: GeneratedModule[] = []
  const modulePattern = /\{\s*"moduleNumber"\s*:\s*(\d+)\s*,\s*"moduleTitle"\s*:\s*"([^"]*?)"\s*\}/g
  let match

  while ((match = modulePattern.exec(text)) !== null) {
    const moduleNumber = Number.parseInt(match[1], 10)
    const moduleTitle = match[2]?.trim()
    if (Number.isFinite(moduleNumber) && moduleNumber > 0 && moduleTitle) {
      modules.push({ moduleNumber, moduleTitle })
    }
  }

  return modules
}

/**
 * Clean raw model output: strip think tags, code fences, and other non-JSON wrapping.
 */
export function cleanModelOutput(rawContent: string): string {
  let cleaned = rawContent
    // deepseek-r1 wraps reasoning in <think>...</think> tags — strip them
    .replace(/<think>[\s\S]*?<\/think>/g, "")
    // Unclosed <think> tag (model hit token limit mid-thought) — strip everything from <think> onward
    .replace(/<think>[\s\S]*/g, "")
    .trim()

  // Strip markdown code fences
  cleaned = cleaned
    .replace(/```(?:json)?\s*\n?/gi, "")
    .replace(/\n?```/gi, "")
    .trim()

  return cleaned
}

export function parsePromptGlobalConstraint(prompt: string): PromptGlobalConstraint {
  const topicsMatch = prompt.match(/-\s+(\d+)\s+topic\(s\)/)
  const objectivesMatch = prompt.match(/-\s+(\d+)\s+objective\(s\)\s+per\s+topic/)
  const tasksMatch = prompt.match(/-\s+(\d+)\s+task\(s\)\s+per\s+objective/)

  return {
    topics: topicsMatch ? Number.parseInt(topicsMatch[1], 10) : undefined,
    objectives: objectivesMatch ? Number.parseInt(objectivesMatch[1], 10) : undefined,
    tasks: tasksMatch ? Number.parseInt(tasksMatch[1], 10) : undefined,
  }
}

export function parsePromptLessonConstraints(prompt: string): Map<number, PromptLessonConstraint> {
  const constraints = new Map<number, PromptLessonConstraint>()
  const sessionLineRegex = /-\s+Session\s+(\d+):[^\n]*(?:\((\d+)min\))?[^\n]*(?:\[(\d+|\?)\s+topics,\s+(\d+|\?)\s+objectives,\s+(\d+|\?)\s+tasks\])?/g

  let match: RegExpExecArray | null
  while ((match = sessionLineRegex.exec(prompt)) !== null) {
    const lessonNumber = Number.parseInt(match[1], 10)
    if (!Number.isFinite(lessonNumber) || lessonNumber < 1) continue

    const durationMinutes = match[2] ? Number.parseInt(match[2], 10) : undefined
    const topics = match[3] && match[3] !== "?" ? Number.parseInt(match[3], 10) : undefined
    const objectives = match[4] && match[4] !== "?" ? Number.parseInt(match[4], 10) : undefined
    const tasks = match[5] && match[5] !== "?" ? Number.parseInt(match[5], 10) : undefined

    constraints.set(lessonNumber, {
      lessonNumber,
      durationMinutes,
      topics,
      objectives,
      tasks,
    })
  }

  return constraints
}

export function fitToCount(items: string[], targetCount: number, fallbackPrefix: string): string[] {
  const normalizedItems = items.map((item) => String(item ?? "").trim()).filter(Boolean)
  if (normalizedItems.length >= targetCount) {
    return normalizedItems.slice(0, targetCount)
  }

  return Array.from({ length: targetCount }, (_, index) => (
    normalizedItems[index] ?? `${fallbackPrefix} ${index + 1}`
  ))
}

export function normalizeGeneratedLessons(
  lessons: GeneratedLesson[],
  prompt: string,
): GeneratedLesson[] {
  const globalConstraint = parsePromptGlobalConstraint(prompt)
  const lessonConstraints = parsePromptLessonConstraints(prompt)

  return lessons.map((lesson, index) => {
    const lessonNumber = Number.isFinite(lesson.lessonNumber) && lesson.lessonNumber > 0
      ? lesson.lessonNumber
      : index + 1
    const lessonConstraint = lessonConstraints.get(lessonNumber)

    const normalizedCounts = normalizeContentLoadConfig(
      {
        topicsPerLesson: lessonConstraint?.topics ?? globalConstraint.topics ?? lesson.topics?.length ?? 1,
        objectivesPerTopic: lessonConstraint?.objectives ?? globalConstraint.objectives ?? lesson.objectives?.length ?? 2,
        tasksPerObjective: lessonConstraint?.tasks ?? globalConstraint.tasks ?? lesson.tasks?.length ?? MIN_TASKS_PER_OBJECTIVE,
      },
      lessonConstraint?.durationMinutes ?? null,
    )

    return {
      lessonNumber,
      lessonTitle: lesson.lessonTitle,
      topics: fitToCount(lesson.topics ?? [], normalizedCounts.topicsPerLesson, "Topic"),
      objectives: fitToCount(lesson.objectives ?? [], normalizedCounts.objectivesPerTopic, "Objective"),
      tasks: fitToCount(lesson.tasks ?? [], normalizedCounts.tasksPerObjective, "Task"),
    }
  })
}
