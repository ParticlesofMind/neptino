import { NextResponse } from "next/server"

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434"

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

type OllamaTag = { name?: string }
type OllamaTagsResponse = { models?: OllamaTag[] }
type OllamaPsModel = { name?: string }
type OllamaPsResponse = { models?: OllamaPsModel[] }

export async function GET() {
  for (const baseUrl of buildCandidates(OLLAMA_BASE_URL)) {
    try {
      const [tagsResponse, psResponse] = await Promise.all([
        fetch(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(2500), cache: "no-store" }),
        fetch(`${baseUrl}/api/ps`, { signal: AbortSignal.timeout(2500), cache: "no-store" }),
      ])

      if (!tagsResponse.ok) continue

      const tags = (await tagsResponse.json()) as OllamaTagsResponse
      const ps = psResponse.ok ? ((await psResponse.json()) as OllamaPsResponse) : { models: [] }

      const installedModels = (tags.models ?? [])
        .map((model) => String(model.name ?? "").split(":")[0])
        .filter(Boolean)

      const runningModels = (ps.models ?? [])
        .map((model) => String(model.name ?? "").split(":")[0])
        .filter(Boolean)

      const highLoad = runningModels.some((name) => ["deepseek-r1", "dbrx-instruct"].includes(name))

      return NextResponse.json(
        {
          healthy: true,
          activeBaseUrl: baseUrl,
          runningModels,
          installedModels,
          highLoad,
        },
        { status: 200 },
      )
    } catch {
    }
  }

  return NextResponse.json(
    {
      healthy: false,
      activeBaseUrl: null,
      runningModels: [],
      installedModels: [],
      highLoad: false,
    },
    { status: 503 },
  )
}
