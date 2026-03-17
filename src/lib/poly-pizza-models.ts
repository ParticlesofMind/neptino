export interface PolyPizzaModel {
  id: string
  title: string
  creator: string
  license: string
  pageUrl: string
  assetUrl: string
  previewUrl: string
}

export const POLY_PIZZA_MODELS: PolyPizzaModel[] = [
  {
    id: "airplane",
    title: "Airplane",
    creator: "Poly by Google",
    license: "CC-BY 3.0",
    pageUrl: "https://poly.pizza/m/8ciDd9k8wha",
    assetUrl: "https://static.poly.pizza/4754ce4b-40ec-4089-8be4-98ce7230bfe4.glb",
    previewUrl: "https://static.poly.pizza/4754ce4b-40ec-4089-8be4-98ce7230bfe4.webp",
  },
  {
    id: "cottage",
    title: "Cottage",
    creator: "CreativeTrio",
    license: "CC0 1.0",
    pageUrl: "https://poly.pizza/m/YDGLLT0emC",
    assetUrl: "https://static.poly.pizza/8ab3d7cd-dcce-4535-8c64-a22aa0487050.glb",
    previewUrl: "https://static.poly.pizza/8ab3d7cd-dcce-4535-8c64-a22aa0487050.webp",
  },
  {
    id: "rocks",
    title: "Rocks",
    creator: "Quaternius",
    license: "CC0 1.0",
    pageUrl: "https://poly.pizza/m/gYhoEOKItJ",
    assetUrl: "https://static.poly.pizza/01671e28-0504-4db1-a5d5-af71ce0a6a1e.glb",
    previewUrl: "https://static.poly.pizza/01671e28-0504-4db1-a5d5-af71ce0a6a1e.webp",
  },
]

export const DEFAULT_POLY_PIZZA_MODEL = POLY_PIZZA_MODELS[0]

export interface ResolvedModel3DAsset {
  model?: PolyPizzaModel
  url: string
  format: string
}

export function resolveModel3DAsset(content: Record<string, unknown>): ResolvedModel3DAsset {
  const selectedModel = typeof content.modelId === "string"
    ? POLY_PIZZA_MODELS.find((entry) => entry.id === content.modelId)
    : undefined

  const rawUrl = typeof content.url === "string" ? content.url.trim() : ""
  const rawFormat = typeof content.format === "string" ? content.format.trim().toLowerCase() : ""

  if (rawUrl) {
    return {
      model: selectedModel,
      url: rawUrl,
      format: rawFormat || "glb",
    }
  }

  const fallbackModel = selectedModel ?? DEFAULT_POLY_PIZZA_MODEL

  return {
    model: fallbackModel,
    url: fallbackModel.assetUrl,
    format: "glb",
  }
}