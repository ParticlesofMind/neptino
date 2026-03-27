import { afterEach, describe, expect, it, vi } from "vitest"

import { DEFAULT_MODEL, normalizeOllamaModelName, resolveOllamaModel } from "@/lib/ollama/models"

describe("ollama model resolution", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("normalizes legacy aliases", () => {
    expect(normalizeOllamaModelName("gemma3")).toBe("gemma3:4b")
    expect(normalizeOllamaModelName("llama3")).toBe("llama3.2")
    expect(DEFAULT_MODEL).toBe("llama3.2")
  })

  it("falls back to an installed model when the requested one is missing", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        models: [
          { name: "llama3.1:8b" },
          { name: "qwen3.5:latest" },
        ],
      }),
    } as Response)

    await expect(resolveOllamaModel("gemma3:4b")).resolves.toBe("llama3.1:8b")
  })

  it("prefers a base-name match when one is installed", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        models: [
          { name: "llama3.1:8b" },
          { name: "gemma3:12b" },
        ],
      }),
    } as Response)

    await expect(resolveOllamaModel("gemma3:4b")).resolves.toBe("gemma3:12b")
  })
})
