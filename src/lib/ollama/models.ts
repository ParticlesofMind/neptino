/**
 * Ollama Models Service
 * Manages fetching available models and their metadata
 */

export interface OllamaModel {
  name: string
  displayName: string
  description: string
  parameterSize: string
  speed: "fast" | "medium" | "slow"
  reasoning: boolean
  estimatedCostPerUse: string // "Free", "Low", "Medium", "High"
  family: string
}

/**
 * Comprehensive list of popular open-source LLM models available via Ollama.
 * These include reasoning models, fast inference models, and specialized models.
 */
export const AVAILABLE_MODELS: OllamaModel[] = [
  {
    name: "deepseek-r1",
    displayName: "DeepSeek R1",
    description:
      "Advanced reasoning model with chain-of-thought capability. Excellent for complex problem-solving, curriculum design, and detailed analysis. Slower but produces high-quality, well-structured outputs. Best for thorough, multi-step curriculum generation.",
    parameterSize: "70B",
    speed: "slow",
    reasoning: true,
    estimatedCostPerUse: "Free",
    family: "deepseek",
  },
  {
    name: "qwen3-instruct",
    displayName: "Qwen 3 Instruct",
    description:
      "Latest instruction-tuned model from Alibaba. Balanced performance between speed and quality. Good at following detailed instructions and generating structured content. Suitable for curriculum generation when you want reliable results without extreme wait times.",
    parameterSize: "14B",
    speed: "medium",
    reasoning: false,
    estimatedCostPerUse: "Free",
    family: "qwen",
  },
  {
    name: "llama3.2",
    displayName: "Llama 3.2",
    description:
      "Meta's latest general-purpose model. Fast, efficient, and good for most tasks. Excellent balance between speed and quality. Great for rapid curriculum iteration and testing. Prefer this for quick prototyping.",
    parameterSize: "11B",
    speed: "fast",
    reasoning: false,
    estimatedCostPerUse: "Free",
    family: "llama",
  },
  {
    name: "gemma3:4b",
    displayName: "Gemma 3",
    description:
      "Google's lightweight, efficient model. Extremely fast inference with good quality for standard tasks. Ideal when you need quick results for lesson and topic generation. Lower resource usage on your machine.",
    parameterSize: "4.3B",
    speed: "fast",
    reasoning: false,
    estimatedCostPerUse: "Free",
    family: "gemma",
  },
  {
    name: "mistral",
    displayName: "Mistral 7B",
    description:
      "Compact yet capable model from Mistral AI. Very fast and efficient. Good for generating clear, concise lesson content. Excellent for teaching material that favors clarity over complexity.",
    parameterSize: "7B",
    speed: "fast",
    reasoning: false,
    estimatedCostPerUse: "Free",
    family: "mistral",
  },
  {
    name: "neural-chat",
    displayName: "Neural Chat",
    description:
      "Intel's conversational model. Fast and optimized for dialog. Works well for generating discussion-based activities and interactive lesson components. Good for collaborative learning scenarios.",
    parameterSize: "7B",
    speed: "fast",
    reasoning: false,
    estimatedCostPerUse: "Free",
    family: "neural-chat",
  },
  {
    name: "phi3",
    displayName: "Phi 3",
    description:
      "Microsoft's compact, high-performing model. Extremely fast with surprisingly good reasoning abilities. Excellent choice for teachers who want speed without sacrificing too much quality.",
    parameterSize: "3.8B",
    speed: "fast",
    reasoning: false,
    estimatedCostPerUse: "Free",
    family: "phi",
  },
  {
    name: "dbrx-instruct",
    displayName: "DBRX Instruct",
    description:
      "Databricks' open-source MoE model. State-of-the-art performance with efficient inference. Good for complex curriculum design that requires understanding nuanced requests.",
    parameterSize: "132B (MoE)",
    speed: "medium",
    reasoning: false,
    estimatedCostPerUse: "Free",
    family: "dbrx",
  },
]

export const DEFAULT_MODEL = "llama3.2"

const MODEL_ALIASES: Record<string, string> = {
  gemma3: "gemma3:4b",
  "gemma3:latest": "gemma3:4b",
  llama3: "llama3.2",
  "llama3:latest": "llama3.2",
  qwen3: "qwen3-instruct",
  "qwen3:latest": "qwen3-instruct",
}

function candidateBaseUrls(baseUrl: string): string[] {
  const normalized = baseUrl.replace(/\/$/, "")
  const urls = [normalized]
  if (normalized.includes("localhost")) {
    urls.push(normalized.replace("localhost", "127.0.0.1"))
  }
  if (normalized.includes("127.0.0.1")) {
    urls.push(normalized.replace("127.0.0.1", "localhost"))
  }
  return Array.from(new Set(urls))
}

export function normalizeOllamaModelName(modelName: string): string {
  const trimmed = modelName.trim()
  return MODEL_ALIASES[trimmed] ?? trimmed
}

function getModelBaseName(modelName: string): string {
  const normalized = normalizeOllamaModelName(modelName)
  return normalized.split(":")[0]
}

/**
 * Fetch list of currently running models from Ollama
 */
export async function fetchOllamaModels(
  baseUrl: string = "http://127.0.0.1:11434",
): Promise<string[]> {
  for (const url of candidateBaseUrls(baseUrl)) {
    try {
      const response = await fetch(`${url}/api/tags`)
      if (!response.ok) {
        console.warn("[Ollama] Failed to fetch models:", response.statusText)
        continue
      }
      const data = (await response.json()) as { models?: Array<{ name: string }> }
      return data.models?.map((m) => m.name) ?? []
    } catch (error) {
      console.warn("[Ollama] Error fetching models:", error)
    }
  }
  return []
}

export async function resolveOllamaModel(
  requestedModel: string,
  options?: {
    baseUrl?: string
    fallbackModel?: string
  },
): Promise<string> {
  const normalizedRequested = normalizeOllamaModelName(requestedModel)
  const normalizedFallback = options?.fallbackModel
    ? normalizeOllamaModelName(options.fallbackModel)
    : null

  const installedModels = await fetchOllamaModels(options?.baseUrl)
  if (installedModels.length === 0) {
    return normalizedRequested
  }

  if (installedModels.includes(normalizedRequested)) {
    return normalizedRequested
  }

  const requestedBase = getModelBaseName(normalizedRequested)
  const baseMatch = installedModels.find((model) => getModelBaseName(model) === requestedBase)
  if (baseMatch) {
    return baseMatch
  }

  if (normalizedFallback) {
    if (installedModels.includes(normalizedFallback)) {
      return normalizedFallback
    }

    const fallbackBase = getModelBaseName(normalizedFallback)
    const fallbackBaseMatch = installedModels.find((model) => getModelBaseName(model) === fallbackBase)
    if (fallbackBaseMatch) {
      return fallbackBaseMatch
    }
  }

  const preferredFamilies = ["llama", "qwen", "gemma", "mistral", "phi", "deepseek", "neural-chat", "dbrx"]
  for (const family of preferredFamilies) {
    const familyMatch = installedModels.find((model) => getModelBaseName(model).includes(family))
    if (familyMatch) {
      return familyMatch
    }
  }

  return installedModels[0]
}

/**
 * Get model info from our curated list
 */
export function getModelInfo(modelName: string): OllamaModel | undefined {
  const normalized = normalizeOllamaModelName(modelName)
  return AVAILABLE_MODELS.find((m) => m.name === normalized || m.displayName === normalized || getModelBaseName(m.name) === getModelBaseName(normalized))
}

/**
 * Check if Ollama is running
 */
export async function checkOllamaHealth(baseUrl: string = "http://127.0.0.1:11434"): Promise<boolean> {
  for (const url of candidateBaseUrls(baseUrl)) {
    try {
      const response = await fetch(`${url}/api/tags`, { signal: AbortSignal.timeout(2000) })
      if (response.ok) return true
    } catch {
    }
  }
  return false
}
