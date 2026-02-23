import { NextRequest, NextResponse } from "next/server"

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434"
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "deepseek-r1"

const SYSTEM_PROMPT = `You are an expert curriculum designer and instructional architect. You create detailed, pedagogically sound curricula for educational courses.

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

/**
 * POST /api/generate-curriculum
 * Accepts a formatted prompt string and calls Ollama to generate curriculum content.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { prompt } = body as { prompt: string }

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'prompt' in request body" },
        { status: 400 },
      )
    }

    // Call Ollama's chat completion API
    const ollamaResponse = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 8192,
        },
      }),
    })

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

    // deepseek-r1 wraps reasoning in <think>...</think> tags — strip them
    const cleaned = rawContent
      .replace(/<think>[\s\S]*?<\/think>/g, "")
      .trim()

    return NextResponse.json({ content: cleaned })
  } catch (error) {
    console.error("[generate-curriculum] Internal error:", error)
    const message = error instanceof Error ? error.message : "Unknown error"

    // Detect Ollama connection issues
    if (message.includes("ECONNREFUSED") || message.includes("fetch failed")) {
      return NextResponse.json(
        { error: "Cannot connect to Ollama. Make sure Ollama is running (ollama serve)." },
        { status: 503 },
      )
    }

    return NextResponse.json(
      { error: `Server error: ${message}` },
      { status: 500 },
    )
  }
}
