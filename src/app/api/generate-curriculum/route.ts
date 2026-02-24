import { NextRequest, NextResponse } from "next/server"

// Allow up to 10 minutes for Ollama to generate (reasoning models like deepseek-r1 can be very slow)
export const maxDuration = 600

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434"
const OLLAMA_MODEL_DEFAULT = process.env.OLLAMA_MODEL || "gemma3"
const OLLAMA_LOW_POWER_MODEL = process.env.OLLAMA_LOW_POWER_MODEL || "gemma3"
const GENERATION_COOLDOWN_MS = 10_000

let activeGenerationLock: { startedAt: number } | null = null
let lastGenerationFinishedAt = 0

function buildOllamaBaseUrlCandidates(baseUrl: string): string[] {
  const normalized = baseUrl.replace(/\/$/, "")
  const candidates = [normalized]
  if (normalized.includes("localhost")) {
    candidates.push(normalized.replace("localhost", "127.0.0.1"))
  }
  if (normalized.includes("127.0.0.1")) {
    candidates.push(normalized.replace("127.0.0.1", "localhost"))
  }
  return Array.from(new Set(candidates))
}

/** Shape of each lesson in the generated curriculum */
interface GeneratedLesson {
  lessonNumber: number
  lessonTitle: string
  topics: string[]
  objectives: string[]
  tasks: string[]
}

interface GeneratedModule {
  moduleNumber: number
  moduleTitle: string
}

type GenerationAction = "all" | "modules" | "lessons" | "topics" | "objectives" | "tasks"

/**
 * Attempt to repair common JSON issues produced by LLMs.
 * Handles: trailing commas, control characters, single quotes, truncated output, etc.
 */
function repairJSON(raw: string): string {
  let s = raw

  // Remove BOM / zero-width chars
  s = s.replace(/^\uFEFF/, "").replace(/[\u200B-\u200D\uFEFF]/g, "")

  // Remove control characters except \n, \r, \t
  // eslint-disable-next-line no-control-regex
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
function extractLessonsViaRegex(text: string): GeneratedLesson[] {
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

function extractModulesViaRegex(text: string): GeneratedModule[] {
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
function cleanModelOutput(rawContent: string): string {
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

const SYSTEM_PROMPT_BASE = `You are an expert curriculum designer and instructional architect. You create detailed, pedagogically sound curricula for educational courses.

CRITICAL RULES:
1. Every lesson title must be specific, descriptive, and clearly convey what the student will learn — never generic like "Introduction" or "Basics".
2. Topics must be concrete, domain-specific sub-areas — not vague categories.
3. Objectives must be measurable using Bloom's taxonomy verbs (analyze, evaluate, design, implement, compare, demonstrate, etc.) — never "understand" or "learn about".
4. Tasks must be concrete, hands-on activities that a student could actually do — not abstract instructions.
5. The curriculum must show clear progression: foundational concepts first, then building toward complexity and mastery.
6. If mandatory topics are provided, every single one MUST appear explicitly in the curriculum.
7. If a pedagogical approach is specified, reflect it in lesson design, task types, and assessment activities.
8. If prior knowledge is specified, do NOT re-teach it — build from it.
9. Vary activity types: include discussions, projects, case studies, labs, peer reviews, problem sets, reflections — not just "complete worksheet" style tasks.
10. Each lesson should feel like a real class session a teacher would deliver — not a textbook table of contents.
11. You MUST generate the EXACT number of lessons requested. Never stop early. Never skip lessons. If 20 lessons are requested, return exactly 20. If 40 are requested, return exactly 40. Count your lessons before finishing.

OUTPUT FORMAT:
Return ONLY a valid JSON object. No markdown, no explanation, no commentary before or after. The JSON must match this exact structure:
{
  "lessons": [
    {
      "lessonNumber": 1,
      "lessonTitle": "Descriptive, Specific Title",
      "topics": ["Concrete Topic 1", "Concrete Topic 2"],
      "objectives": ["By the end of this lesson, students will be able to ..."],
      "tasks": ["Specific activity or deliverable 1", "Specific activity or deliverable 2"]
    }
  ]
}`

function buildSystemPrompt(action: GenerationAction): string {
  if (action === "modules") {
    return `${SYSTEM_PROMPT_BASE}

ACTION OVERRIDE:
- Generate ONLY the modules array.
- Do NOT generate lessons, topics, objectives, or tasks.
- Return JSON with shape: { "modules": [{ "moduleNumber": 1, "moduleTitle": "..." }] }`
  }
  return SYSTEM_PROMPT_BASE
}

/**
 * POST /api/generate-curriculum
 * Accepts a formatted prompt string and calls Ollama to generate curriculum content.
 */
export async function POST(request: NextRequest) {
  const now = Date.now()
  const cooldownRemainingMs = Math.max(0, lastGenerationFinishedAt + GENERATION_COOLDOWN_MS - now)
  if (cooldownRemainingMs > 0) {
    const cooldownRemainingSeconds = Math.ceil(cooldownRemainingMs / 1000)
    return NextResponse.json(
      {
        error: `Generation cooldown active. Please wait ${cooldownRemainingSeconds}s before starting another run.`,
      },
      { status: 429 },
    )
  }

  if (activeGenerationLock) {
    const elapsedSeconds = Math.max(1, Math.floor((Date.now() - activeGenerationLock.startedAt) / 1000))
    return NextResponse.json(
      {
        error: `A generation job is already running (${elapsedSeconds}s elapsed). Please wait for it to finish before starting another one.`,
      },
      { status: 429 },
    )
  }

  activeGenerationLock = { startedAt: Date.now() }

  try {
    const body = await request.json()
    const { prompt, model, action } = body as { prompt: string; model?: string; action?: GenerationAction }
    const generationAction = action ?? "all"

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'prompt' in request body" },
        { status: 400 },
      )
    }

    // Use provided model or fall back to default
    let selectedModel = model ?? OLLAMA_MODEL_DEFAULT

    // Estimate token budget: generous allocation per lesson.
    // deepseek-r1 may still use some tokens for reasoning even with think=false.
    const lessonCountMatch = prompt.match(/EXACTLY\s+(\d+)\s+lessons/)
    const estimatedLessons = lessonCountMatch ? parseInt(lessonCountMatch[1], 10) : 10
    const moduleCountMatch = prompt.match(/EXACTLY\s+(\d+)\s+module/) 
    const estimatedModules = moduleCountMatch ? parseInt(moduleCountMatch[1], 10) : 1
    const tokenBudget = generationAction === "modules"
      ? Math.min(1400, Math.max(420, estimatedModules * 120 + 240))
      : Math.min(4096, Math.max(1024, estimatedLessons * 180 + 512))
    console.log(`[generate-curriculum] Estimated ${estimatedLessons} lessons, token budget: ${tokenBudget}`)

    const isHeavyModel = selectedModel.includes("deepseek-r1") || selectedModel.includes("dbrx")
    if (isHeavyModel && estimatedLessons > 8) {
      console.warn(`[generate-curriculum] Heavy model '${selectedModel}' requested for ${estimatedLessons} lessons. Falling back to '${OLLAMA_LOW_POWER_MODEL}' to reduce load.`)
      selectedModel = OLLAMA_LOW_POWER_MODEL
    }

    console.log(`[generate-curriculum] Using model: ${selectedModel}`)

    // Detect if this is a reasoning model (deepseek-r1, etc.)
    const isReasoningModel = selectedModel.includes("deepseek-r1") || selectedModel.includes("qwen3") || selectedModel.includes("deepseek")

    const requestBody = JSON.stringify({
      model: selectedModel,
      messages: [
        { role: "system", content: buildSystemPrompt(generationAction) },
        { role: "user", content: prompt },
      ],
      stream: false,
      ...(isReasoningModel ? { think: false } : {}),
      options: {
        temperature: 0.7,
        num_predict: tokenBudget,
        num_ctx: 8192,
      },
      keep_alive: "0s",
    })

    let ollamaResponse: Response | null = null
    let lastConnectionError: unknown = null

    for (const baseUrl of buildOllamaBaseUrlCandidates(OLLAMA_BASE_URL)) {
      try {
        ollamaResponse = await fetch(`${baseUrl}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: requestBody,
        })
        if (ollamaResponse.ok) {
          break
        }
      } catch (error) {
        lastConnectionError = error
      }
    }

    if (!ollamaResponse) {
      throw (lastConnectionError instanceof Error
        ? lastConnectionError
        : new Error("fetch failed"))
    }

    if (!ollamaResponse.ok) {
      const errorText = await ollamaResponse.text()
      console.error("[generate-curriculum] Ollama error:", ollamaResponse.status, errorText)
      return NextResponse.json(
        { error: `Ollama returned ${ollamaResponse.status}: ${errorText}` },
        { status: 502 },
      )
    }

    const ollamaData = (await ollamaResponse.json()) as {
      message?: { content?: string }
      error?: string
    }

    if (ollamaData.error) {
      console.error("[generate-curriculum] Ollama error in response:", ollamaData.error)
      return NextResponse.json(
        { error: `Ollama error: ${ollamaData.error}` },
        { status: 502 },
      )
    }

    const rawContent = ollamaData.message?.content ?? ""

    if (!rawContent) {
      return NextResponse.json(
        { error: "Ollama returned empty response" },
        { status: 502 },
      )
    }

    console.log("[generate-curriculum] Raw response length:", rawContent.length)

    const cleaned = cleanModelOutput(rawContent)

    console.log("[generate-curriculum] Cleaned response length:", cleaned.length)
    console.log("[generate-curriculum] First 300 chars:", cleaned.slice(0, 300))
    console.log("[generate-curriculum] Last 200 chars:", cleaned.slice(-200))

    if (!cleaned) {
      // All content was inside <think> tags — model spent all tokens reasoning
      return NextResponse.json(
        { error: "Model used all tokens for reasoning and produced no JSON output. Try reducing the number of lessons or using a different model." },
        { status: 502 },
      )
    }

    // ── Strategy 1: Standard JSON parse (with repair fallback) ──
    const jsonStart = cleaned.indexOf("{")
    const jsonEnd = cleaned.lastIndexOf("}")

    if (jsonStart !== -1) {
      let jsonStr = jsonEnd > jsonStart
        ? cleaned.slice(jsonStart, jsonEnd + 1)
        : cleaned.slice(jsonStart)

      // Try plain parse first
      try {
        const parsed = JSON.parse(jsonStr) as { lessons?: GeneratedLesson[]; modules?: GeneratedModule[] }
        const hasLessons = Array.isArray(parsed.lessons) && parsed.lessons.length > 0
        const hasModules = Array.isArray(parsed.modules) && parsed.modules.length > 0
        if (hasLessons || hasModules) {
          lastGenerationFinishedAt = Date.now()
          console.log(`[generate-curriculum] Strategy 1 (direct parse): lessons=${parsed.lessons?.length ?? 0}, modules=${parsed.modules?.length ?? 0}`)
          return NextResponse.json({ content: JSON.stringify(parsed) })
        }
      } catch {
        // Try repair
        try {
          jsonStr = repairJSON(jsonStr)
          const parsed = JSON.parse(jsonStr) as { lessons?: GeneratedLesson[]; modules?: GeneratedModule[] }
          const hasLessons = Array.isArray(parsed.lessons) && parsed.lessons.length > 0
          const hasModules = Array.isArray(parsed.modules) && parsed.modules.length > 0
          if (hasLessons || hasModules) {
            lastGenerationFinishedAt = Date.now()
            console.log(`[generate-curriculum] Strategy 1 (repaired parse): lessons=${parsed.lessons?.length ?? 0}, modules=${parsed.modules?.length ?? 0}`)
            return NextResponse.json({ content: JSON.stringify(parsed) })
          }
        } catch (repairErr) {
          console.warn("[generate-curriculum] Strategy 1 failed (parse + repair):", repairErr instanceof Error ? repairErr.message : repairErr)
        }
      }
    }

    // ── Strategy 2: Regex-based lesson extraction (handles severely broken JSON) ──
    console.log("[generate-curriculum] Falling back to regex-based lesson extraction…")
    const extractedLessons = extractLessonsViaRegex(cleaned)
    const extractedModules = extractModulesViaRegex(cleaned)

    if (extractedLessons.length > 0 || extractedModules.length > 0) {
      lastGenerationFinishedAt = Date.now()
      console.log(`[generate-curriculum] Strategy 2 (regex extraction): lessons=${extractedLessons.length}, modules=${extractedModules.length}`)
      if (extractedLessons.length < estimatedLessons) {
        console.warn(`[generate-curriculum] WARNING: Only recovered ${extractedLessons.length}/${estimatedLessons} lessons (output was likely truncated)`)
      }
      return NextResponse.json({ content: JSON.stringify({ lessons: extractedLessons, modules: extractedModules }) })
    }

    // ── All strategies failed ──
    console.error("[generate-curriculum] All parsing strategies failed")
    console.error("[generate-curriculum] Raw content (first 1000):", cleaned.slice(0, 1000))
    return NextResponse.json(
      { error: "Failed to parse model JSON output. The model may not have generated valid curriculum data. Try again or reduce the number of lessons.", raw: cleaned.slice(0, 500) },
      { status: 502 },
    )
  } catch (error) {
    console.error("[generate-curriculum] Internal error:", error)
    const message = error instanceof Error ? error.message : "Unknown error"

    // Detect Ollama connection issues
    if (message.includes("ECONNREFUSED") || message.includes("fetch failed")) {
      return NextResponse.json(
        { error: `Cannot connect to Ollama at ${OLLAMA_BASE_URL}. Make sure Ollama is running (ollama serve).` },
        { status: 503 },
      )
    }

    return NextResponse.json(
      { error: `Server error: ${message}` },
      { status: 500 },
    )
  } finally {
    activeGenerationLock = null
  }
}
