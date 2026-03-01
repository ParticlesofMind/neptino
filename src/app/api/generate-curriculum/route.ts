import { NextRequest, NextResponse } from "next/server"
import { MIN_TASKS_PER_OBJECTIVE, normalizeContentLoadConfig } from "@/lib/curriculum/content-load-service"
import type { GenerationAction } from "@/lib/curriculum/ai-generation-service"
import {
  repairJSON,
  extractSessionsViaRegex,
  extractModulesViaRegex,
  cleanModelOutput,
  fitToCount,
  normalizeGeneratedSessions,
} from "./generation-route-utils"
import type { GeneratedSession, GeneratedModule } from "./generation-route-utils"

// Allow up to 10 minutes for Ollama to generate (reasoning models like deepseek-r1 can be very slow)
export const maxDuration = 600

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434"
const OLLAMA_MODEL_DEFAULT = process.env.OLLAMA_MODEL || "gemma3:4b"
const OLLAMA_LOW_POWER_MODEL = process.env.OLLAMA_LOW_POWER_MODEL || "gemma3:4b"
const GENERATION_COOLDOWN_MS = 10_000

// Cloud LLM fallback — used when Ollama is unreachable.
// Any OpenAI-compatible endpoint works (OpenAI, Azure OpenAI, OpenRouter, etc.)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? ""
const OPENAI_BASE_URL = (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "")
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini"

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

const SYSTEM_PROMPT_BASE = `You are an expert curriculum designer and instructional architect. You create detailed, pedagogically sound curricula for educational courses.

CRITICAL RULES:
1. Every session title must be specific, descriptive, and clearly convey what the student will learn — never generic like "Introduction" or "Basics".
2. Topics must be concrete, domain-specific sub-areas — not vague categories.
3. Objectives must be measurable using Bloom's taxonomy verbs (analyze, evaluate, design, implement, compare, demonstrate, etc.) — never "understand" or "learn about".
4. Tasks must be concrete, hands-on activities that a student could actually do — not abstract instructions.
5. The curriculum must show clear progression: foundational concepts first, then building toward complexity and mastery.
6. If mandatory topics are provided, every single one MUST appear explicitly in the curriculum.
7. If a pedagogical approach is specified, reflect it in session design, task types, and assessment activities.
8. If prior knowledge is specified, do NOT re-teach it — build from it.
9. Vary activity types: include discussions, projects, case studies, labs, peer reviews, problem sets, reflections — not just "complete worksheet" style tasks.
10. Each session should feel like a real class session a teacher would deliver — not a textbook table of contents.
11. You MUST generate the EXACT number of sessions requested. Never stop early. Never skip sessions. If 20 sessions are requested, return exactly 20. If 40 are requested, return exactly 40. Count your sessions before finishing.

OUTPUT FORMAT:
Return ONLY a valid JSON object. No markdown, no explanation, no commentary before or after. The JSON must match this exact structure:
{
  "sessions": [
    {
      "sessionNumber": 1,
      "sessionTitle": "Descriptive, Specific Title",
      "topics": ["Concrete Topic 1", "Concrete Topic 2"],
      "objectives": ["By the end of this session, students will be able to ..."],
      "tasks": ["Specific activity or deliverable 1", "Specific activity or deliverable 2"]
    }
  ]
}`

function buildSystemPrompt(action: GenerationAction): string {
  if (action === "modules") {
    return `${SYSTEM_PROMPT_BASE}

ACTION OVERRIDE:
- Generate ONLY the modules array.
- Do NOT generate sessions, topics, objectives, or tasks.
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

    // Normalise legacy model names that were stored without an explicit tag.
    // Ollama 0.4+ requires the full "<name>:<tag>" form.
    const MODEL_ALIASES: Record<string, string> = {
      gemma3: "gemma3:4b",
      "gemma3:latest": "gemma3:4b",
      llama3: "llama3.2:latest",
      "llama3:latest": "llama3.2:latest",
      "deepseek-r1:latest": "deepseek-r1:latest", // already valid, kept for completeness
    }
    if (MODEL_ALIASES[selectedModel]) {
      selectedModel = MODEL_ALIASES[selectedModel]
    }

    // Estimate token budget: generous allocation per session.
    // deepseek-r1 may still use some tokens for reasoning even with think=false.
    const sessionCountMatch = prompt.match(/EXACTLY\s+(\d+)\s+sessions/)
    const estimatedSessions = sessionCountMatch ? parseInt(sessionCountMatch[1], 10) : 10
    const moduleCountMatch = prompt.match(/EXACTLY\s+(\d+)\s+module/) 
    const estimatedModules = moduleCountMatch ? parseInt(moduleCountMatch[1], 10) : 1
    const tokenBudget = generationAction === "modules"
      ? Math.min(1400, Math.max(420, estimatedModules * 120 + 240))
      : Math.min(4096, Math.max(1024, estimatedSessions * 180 + 512))
    console.log(`[generate-curriculum] Estimated ${estimatedSessions} sessions, token budget: ${tokenBudget}`)

    const isHeavyModel = selectedModel.includes("deepseek-r1") || selectedModel.includes("dbrx")
    if (isHeavyModel && estimatedSessions > 8) {
      console.warn(`[generate-curriculum] Heavy model '${selectedModel}' requested for ${estimatedSessions} sessions. Falling back to '${OLLAMA_LOW_POWER_MODEL}' to reduce load.`)
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

    // ── Extract rawContent from Ollama, or fall back to a cloud LLM ──
    let rawContent: string

    if (ollamaResponse?.ok) {
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
      rawContent = ollamaData.message?.content ?? ""
    } else if (OPENAI_API_KEY) {
      // Ollama is unreachable — try the configured cloud LLM endpoint
      console.log(`[generate-curriculum] Ollama unreachable. Falling back to cloud model: ${OPENAI_MODEL} @ ${OPENAI_BASE_URL}`)
      const cloudRequestBody = JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: "system", content: buildSystemPrompt(generationAction) },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: tokenBudget,
        stream: false,
      })
      const cloudResponse = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
        },
        body: cloudRequestBody,
      })
      if (!cloudResponse.ok) {
        const errText = await cloudResponse.text()
        console.error("[generate-curriculum] Cloud fallback error:", cloudResponse.status, errText)
        return NextResponse.json(
          { error: `Cloud LLM fallback returned ${cloudResponse.status}: ${errText}` },
          { status: 502 },
        )
      }
      const cloudData = (await cloudResponse.json()) as {
        choices?: Array<{ message?: { content?: string } }>
        error?: { message?: string }
      }
      if (cloudData.error) {
        return NextResponse.json(
          { error: `Cloud LLM error: ${cloudData.error.message}` },
          { status: 502 },
        )
      }
      rawContent = cloudData.choices?.[0]?.message?.content ?? ""
    } else if (ollamaResponse && !ollamaResponse.ok) {
      const errorText = await ollamaResponse.text()
      console.error("[generate-curriculum] Ollama error:", ollamaResponse.status, errorText)
      return NextResponse.json(
        { error: `Ollama returned ${ollamaResponse.status}: ${errorText}` },
        { status: 502 },
      )
    } else {
      throw (lastConnectionError instanceof Error ? lastConnectionError : new Error("fetch failed"))
    }

    if (!rawContent) {
      return NextResponse.json(
        { error: "LLM returned empty response" },
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
        const parsed = JSON.parse(jsonStr) as { sessions?: GeneratedSession[]; modules?: GeneratedModule[] }
        const hasSessions = Array.isArray(parsed.sessions) && parsed.sessions.length > 0
        const hasModules = Array.isArray(parsed.modules) && parsed.modules.length > 0
          if (hasSessions || hasModules) {
            const normalizedSessions = hasSessions ? normalizeGeneratedSessions(parsed.sessions ?? [], prompt) : []
          lastGenerationFinishedAt = Date.now()
            console.log(`[generate-curriculum] Strategy 1 (direct parse): sessions=${normalizedSessions.length}, modules=${parsed.modules?.length ?? 0}`)
            return NextResponse.json({ content: JSON.stringify({ sessions: normalizedSessions, modules: parsed.modules ?? [] }) })
        }
      } catch {
        // Try repair
        try {
          jsonStr = repairJSON(jsonStr)
          const parsed = JSON.parse(jsonStr) as { sessions?: GeneratedSession[]; modules?: GeneratedModule[] }
          const hasSessions = Array.isArray(parsed.sessions) && parsed.sessions.length > 0
          const hasModules = Array.isArray(parsed.modules) && parsed.modules.length > 0
          if (hasSessions || hasModules) {
            const normalizedSessions = hasSessions ? normalizeGeneratedSessions(parsed.sessions ?? [], prompt) : []
            lastGenerationFinishedAt = Date.now()
            console.log(`[generate-curriculum] Strategy 1 (repaired parse): sessions=${normalizedSessions.length}, modules=${parsed.modules?.length ?? 0}`)
            return NextResponse.json({ content: JSON.stringify({ sessions: normalizedSessions, modules: parsed.modules ?? [] }) })
          }
        } catch (repairErr) {
          console.warn("[generate-curriculum] Strategy 1 failed (parse + repair):", repairErr instanceof Error ? repairErr.message : repairErr)
        }
      }
    }

    // ── Strategy 2: Regex-based session extraction (handles severely broken JSON) ──
    console.log("[generate-curriculum] Falling back to regex-based session extraction…")
    const extractedSessions = extractSessionsViaRegex(cleaned)
    const extractedModules = extractModulesViaRegex(cleaned)

    if (extractedSessions.length > 0 || extractedModules.length > 0) {
      const normalizedSessions = normalizeGeneratedSessions(extractedSessions, prompt)
      lastGenerationFinishedAt = Date.now()
      console.log(`[generate-curriculum] Strategy 2 (regex extraction): sessions=${normalizedSessions.length}, modules=${extractedModules.length}`)
      if (normalizedSessions.length < estimatedSessions) {
        console.warn(`[generate-curriculum] WARNING: Only recovered ${normalizedSessions.length}/${estimatedSessions} sessions (output was likely truncated)`)
      }
      return NextResponse.json({ content: JSON.stringify({ sessions: normalizedSessions, modules: extractedModules }) })
    }

    // ── All strategies failed ──
    console.error("[generate-curriculum] All parsing strategies failed")
    console.error("[generate-curriculum] Raw content (first 1000):", cleaned.slice(0, 1000))
    return NextResponse.json(
      { error: "Failed to parse model JSON output. The model may not have generated valid curriculum data. Try again or reduce the number of sessions.", raw: cleaned.slice(0, 500) },
      { status: 502 },
    )
  } catch (error) {
    console.error("[generate-curriculum] Internal error:", error)
    const message = error instanceof Error ? error.message : "Unknown error"

    // Detect Ollama connection issues
    if (message.includes("ECONNREFUSED") || message.includes("fetch failed")) {
      const fallbackHint = OPENAI_API_KEY
        ? ""
        : " Alternatively, set OPENAI_API_KEY (and optionally OPENAI_BASE_URL, OPENAI_MODEL) to enable cloud LLM fallback."
      return NextResponse.json(
        { error: `Cannot connect to Ollama at ${OLLAMA_BASE_URL}. Make sure Ollama is running (ollama serve).${fallbackHint}` },
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
