// HTTP client and response parser extracted from ai-generation-service.ts
import { formatGenerationPrompt } from "@/lib/curriculum/generation-prompt-builder"
import type {
  GenerationContext,
  GenerationAction,
  GenerationResponse,
  GeneratedCurriculumContent,
} from "@/lib/curriculum/ai-generation-service"

/**
 * Attempt to repair common JSON issues produced by LLMs.
 */
function repairJSON(raw: string): string {
  let s = raw
  // Remove BOM / zero-width chars
  s = s.replace(/^\uFEFF/, "").replace(/[\u200B-\u200D\uFEFF]/g, "")
  // Remove control characters except \n, \r, \t
  s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
  // Remove trailing commas before } or ]
  s = s.replace(/,\s*([}\]])/g, "$1")

  // Close truncated JSON
  let braces = 0, brackets = 0, inString = false, escape = false
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
  if (inString) s += '"'
  while (brackets > 0) { s += "]"; brackets-- }
  while (braces > 0) { s += "}"; braces-- }
  s = s.replace(/,\s*([}\]])/g, "$1")
  return s
}

/**
 * Regex-based fallback: extract individual lesson objects from malformed JSON.
 * Works even when the overall JSON structure is broken (e.g. truncated mid-lesson).
 */
function extractLessonsViaRegex(text: string): Record<string, unknown>[] {
  const lessons: Record<string, unknown>[] = []
  const lessonPattern = /\{\s*"lessonNumber"\s*:\s*(\d+)\s*,\s*"lessonTitle"\s*:\s*"([^"]*?)"/g
  let match

  while ((match = lessonPattern.exec(text)) !== null) {
    const startIdx = match.index

    // Find closing brace by counting depth
    let depth = 0, inStr = false, esc = false, endIdx = -1
    for (let i = startIdx; i < text.length; i++) {
      const ch = text[i]
      if (esc) { esc = false; continue }
      if (ch === "\\") { esc = true; continue }
      if (ch === '"') { inStr = !inStr; continue }
      if (inStr) continue
      if (ch === "{") depth++
      else if (ch === "}") { depth--; if (depth === 0) { endIdx = i; break } }
    }

    const fragment = endIdx === -1 ? text.slice(startIdx) : text.slice(startIdx, endIdx + 1)
    try {
      const repaired = endIdx === -1 ? repairJSON(fragment) : fragment
      const obj = JSON.parse(repaired) as Record<string, unknown>
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
      // Fragment too broken — skip
    }

    if (endIdx === -1) break // Truncated = last lesson
  }

  return lessons
}

export function parseGenerationResponse(responseText: string): GenerationResponse {
  try {
    // Strip any leftover <think> tags or markdown fences
    const cleaned = responseText
      .replace(/<think>[\s\S]*?<\/think>/g, "")
      .replace(/<think>[\s\S]*/g, "")
      .replace(/```(?:json)?\s*\n?/gi, "")
      .replace(/\n?```/gi, "")
      .trim()

    // ── Strategy 1: Standard JSON parse (with repair fallback) ──
    const jsonStart = cleaned.indexOf("{")
    const jsonEnd = cleaned.lastIndexOf("}")
    if (jsonStart === -1) {
      return {
        success: false,
        message: "No JSON found in response",
        error: "Could not parse AI response as JSON",
      }
    }

    let jsonStr = jsonEnd > jsonStart
      ? cleaned.slice(jsonStart, jsonEnd + 1)
      : cleaned.slice(jsonStart)

    let parsed: Record<string, unknown> | null = null
    try {
      parsed = JSON.parse(jsonStr)
    } catch {
      try {
        jsonStr = repairJSON(jsonStr)
        parsed = JSON.parse(jsonStr)
      } catch {
        // Strategy 1 failed entirely — fall through to Strategy 2
      }
    }

    const validatedModules = Array.isArray(parsed?.modules)
      ? (parsed.modules as Record<string, unknown>[]).filter(
        (module) =>
          typeof module.moduleNumber === "number"
          && typeof module.moduleTitle === "string"
          && module.moduleTitle.trim().length > 0,
      ) as GeneratedCurriculumContent["modules"]
      : []

    const validatedLessons = Array.isArray(parsed?.lessons)
      ? (parsed.lessons as Record<string, unknown>[]).filter(
        (lesson) =>
          lesson.lessonNumber &&
          lesson.lessonTitle &&
          Array.isArray(lesson.topics) &&
          Array.isArray(lesson.objectives) &&
          Array.isArray(lesson.tasks),
      ) as GeneratedCurriculumContent["lessons"]
      : []

    if ((validatedLessons?.length ?? 0) > 0 || (validatedModules?.length ?? 0) > 0) {
      const parts: string[] = []
      if ((validatedModules?.length ?? 0) > 0) parts.push(`${validatedModules?.length} module(s)`)
      if ((validatedLessons?.length ?? 0) > 0) parts.push(`${validatedLessons?.length} lesson(s)`)
      return {
        success: true,
        message: `Successfully generated ${parts.join(" and ")}`,
        content: {
          ...(validatedModules && validatedModules.length > 0 ? { modules: validatedModules } : {}),
          ...(validatedLessons && validatedLessons.length > 0 ? { lessons: validatedLessons } : {}),
        },
        generatedAt: new Date().toISOString(),
      }
    }

    // ── Strategy 2: Regex-based lesson extraction ──
    const extractedLessons = extractLessonsViaRegex(cleaned) as GeneratedCurriculumContent["lessons"]
    if (extractedLessons && extractedLessons.length > 0) {
      return {
        success: true,
        message: `Successfully extracted ${extractedLessons.length} lesson(s) from partial response`,
        content: { lessons: extractedLessons },
        generatedAt: new Date().toISOString(),
      }
    }

    return {
      success: false,
      message: "No valid lessons in response",
      error: "Could not extract any valid lessons from AI response",
    }
  } catch (error) {
    return {
      success: false,
      message: "Failed to parse generation response",
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Call the curriculum generation API route (which calls Ollama).
 * Does NOT silently fall back — returns explicit errors so the UI can inform the user.
 */
export async function callGenerationAPI(
  context: GenerationContext,
  selectedModel?: string,
  externalSignal?: AbortSignal,
  action: GenerationAction = "all",
): Promise<GenerationResponse> {
  let sourceExcerpts = ""
  try {
    const retrievalController = new AbortController()
    const retrievalTimeout = setTimeout(() => retrievalController.abort(), 12_000)
    const retrievalRes = await fetch("/api/retrieve-sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        context: {
          courseName: context.courseName,
          courseDescription: context.courseDescription,
          keyTerms: context.keyTerms,
          mandatoryTopics: context.mandatoryTopics,
        },
        resourcesPreferences: context.resourcesPreferences ?? [],
      }),
      signal: retrievalController.signal,
    })
    clearTimeout(retrievalTimeout)

    if (retrievalRes.ok) {
      const data = (await retrievalRes.json()) as {
        excerpts?: Array<{ sourceLabel: string; title: string; excerpt: string; url?: string }>
        skipped?: Array<{ sourceId: string; reason: string }>
      }
      const excerpts = data.excerpts ?? []
      const excerptLines = excerpts.map((item) => {
        const url = item.url ? ` (${item.url})` : ""
        return `- [${item.sourceLabel}] ${item.title}: ${item.excerpt}${url}`
      })
      const skippedLines = (data.skipped ?? []).map((item) => `- ${item.sourceId}: ${item.reason}`)
      sourceExcerpts = [
        ...excerptLines,
        ...(skippedLines.length > 0 ? ["", "Notes:", ...skippedLines] : []),
      ].join("\n")
    }
  } catch {
    // Retrieval is best-effort; continue without excerpts.
  }

  const prompt = formatGenerationPrompt(context, sourceExcerpts, action)
  console.log("[callGenerationAPI] Prompt length:", prompt.length, "chars")
  console.log("[callGenerationAPI] Lesson count requested:", context.curriculum.lessonCount)
  if (selectedModel) {
    console.log("[callGenerationAPI] Selected model:", selectedModel)
  }

  // 10-minute timeout — local models like deepseek-r1 can be very slow
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10 * 60 * 1000)
  let abortedByCaller = Boolean(externalSignal?.aborted)

  const onExternalAbort = () => {
    abortedByCaller = true
    controller.abort()
  }

  if (externalSignal) {
    externalSignal.addEventListener("abort", onExternalAbort, { once: true })
  }

  try {
    console.log("[callGenerationAPI] Calling /api/generate-curriculum …")
    const res = await fetch("/api/generate-curriculum", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, action, ...(selectedModel && { model: selectedModel }) }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)
    if (externalSignal) {
      externalSignal.removeEventListener("abort", onExternalAbort)
    }

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({ error: res.statusText }))
      const errorMsg = (errorBody as { error?: string }).error ?? `HTTP ${res.status}`
      console.error("[callGenerationAPI] API route returned error:", res.status, errorMsg)
      return {
        success: false,
        message: "AI generation failed",
        error: `Ollama error: ${errorMsg}`,
      }
    }

    const { content: rawText } = (await res.json()) as { content: string }
    console.log("[callGenerationAPI] Got response, length:", rawText?.length ?? 0)

    if (!rawText) {
      return {
        success: false,
        message: "AI returned empty content",
        error: "The model returned an empty response. Try again.",
      }
    }

    const result = parseGenerationResponse(rawText)
    console.log("[callGenerationAPI] Parse result:", result.success, result.message)
    if (result.content?.lessons) {
      console.log("[callGenerationAPI] Lessons generated:", result.content.lessons.length)
      console.log("[callGenerationAPI] First lesson title:", result.content.lessons[0]?.lessonTitle)
    }
    return result
  } catch (error) {
    clearTimeout(timeoutId)
    if (externalSignal) {
      externalSignal.removeEventListener("abort", onExternalAbort)
    }
    const message = error instanceof Error ? error.message : "Unknown error"

    if (error instanceof DOMException && error.name === "AbortError") {
      if (abortedByCaller) {
        return {
          success: false,
          message: "Generation canceled",
          error: "The generation run was canceled.",
        }
      }
      console.error("[callGenerationAPI] Request timed out after 10 minutes")
      return {
        success: false,
        message: "Generation timed out",
        error: "The model took longer than 10 minutes to respond. For better performance, try: (1) Reducing lesson count to 20-40 lessons, (2) Using a faster model like Llama 3.2 or Phi 3, or (3) Splitting generation into smaller batches.",
      }
    }

    console.error("[callGenerationAPI] Fetch failed:", message)
    return {
      success: false,
      message: "Cannot reach AI service",
      error: `Could not connect to the generation API: ${message}. Is the dev server running?`,
    }
  }
}
