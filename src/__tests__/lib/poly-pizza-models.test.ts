import { describe, expect, it } from "vitest"

import { DEFAULT_POLY_PIZZA_MODEL, resolveModel3DAsset } from "@/lib/poly-pizza-models"

describe("poly pizza model resolver", () => {
  it("returns the curated default asset when no url is provided", () => {
    expect(resolveModel3DAsset({})).toEqual({
      model: DEFAULT_POLY_PIZZA_MODEL,
      url: DEFAULT_POLY_PIZZA_MODEL.assetUrl,
      format: "glb",
    })
  })

  it("preserves explicit legacy urls", () => {
    expect(resolveModel3DAsset({ url: "https://example.com/custom.glb", format: "gltf" })).toEqual({
      model: undefined,
      url: "https://example.com/custom.glb",
      format: "gltf",
    })
  })
})