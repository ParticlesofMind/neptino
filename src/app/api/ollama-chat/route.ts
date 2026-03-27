import { NextResponse } from "next/server"
import { DEFAULT_MODEL, resolveOllamaModel } from "@/lib/ollama/models"

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434"

interface ChatRequestBody {
  model?: string
  systemPrompt?: string
  messages?: Array<{ role?: string; content?: string }>
}

function buildCandidates(baseUrl: string): string[] {
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

export async function POST(request: Request) {
  const body = (await request.json()) as ChatRequestBody
  const requestedModel = typeof body.model === "string" && body.model.trim() ? body.model : DEFAULT_MODEL
  const model = await resolveOllamaModel(requestedModel, {
    baseUrl: OLLAMA_BASE_URL,
    fallbackModel: DEFAULT_MODEL,
  })
  const systemPrompt = typeof body.systemPrompt === "string" ? body.systemPrompt.trim() : ""
  const messages = Array.isArray(body.messages)
    ? body.messages
        .map((message) => ({
          role: typeof message.role === "string" ? message.role : "user",
          content: typeof message.content === "string" ? message.content : "",
        }))
        .filter((message) => message.content.trim().length > 0)
    : []

  if (messages.length === 0) {
    return NextResponse.json({ error: "At least one chat message is required." }, { status: 400 })
  }

  const ollamaMessages = [
    ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
    ...messages,
  ]

  let lastConnectionError: unknown = null

  for (const baseUrl of buildCandidates(OLLAMA_BASE_URL)) {
    try {
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          stream: false,
          keep_alive: "0s",
          options: {
            temperature: 0.7,
            num_predict: 400,
            num_ctx: 8192,
          },
          messages: ollamaMessages,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        return NextResponse.json({ error: `Ollama returned ${response.status}: ${errorText}` }, { status: 502 })
      }

      const data = (await response.json()) as { message?: { content?: string }; error?: string }
      if (data.error) {
        return NextResponse.json({ error: data.error }, { status: 502 })
      }

      return NextResponse.json({ message: data.message?.content ?? "", model }, { status: 200 })
    } catch (error) {
      lastConnectionError = error
    }
  }

  const detail = lastConnectionError instanceof Error ? ` ${lastConnectionError.message}` : ""
  return NextResponse.json(
    { error: `Cannot connect to Ollama at ${OLLAMA_BASE_URL}.${detail}` },
    { status: 503 },
  )
}