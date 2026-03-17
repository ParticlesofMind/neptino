import { describe, expect, it } from "vitest"

import {
  buildStudioCardContent,
  getStudioDefaults,
  getStudioProfile,
} from "@/components/coursebuilder/create/sidebar/make-studio-tools"
import { DEFAULT_POLY_PIZZA_MODEL } from "@/lib/poly-pizza-models"

describe("make studio profiles", () => {
  it("provides dedicated profiles for expanded card types", () => {
    expect(getStudioProfile("dataset").productType).toBe("Dataset Snapshot")
    expect(getStudioProfile("table").productType).toBe("Data Table")
    expect(getStudioProfile("document").mediaType).toBe("Document")
    expect(getStudioProfile("media").mediaType).toBe("Document")
    expect(getStudioProfile("interactive").mediaType).toBe("Interactive")
    expect(getStudioProfile("rich-sim").mediaType).toBe("Interactive")
    expect(getStudioProfile("village-3d").mediaType).toBe("Interactive")
  })

  it("returns defaults for expanded profiles", () => {
    expect(getStudioDefaults("table")).toMatchObject({
      rowLimit: 25,
      sortable: true,
    })
    expect(getStudioDefaults("dataset")).toMatchObject({
      schemaVersion: "v1",
      refreshCadence: "manual",
    })
    expect(getStudioDefaults("model-3d")).toMatchObject({
      modelId: DEFAULT_POLY_PIZZA_MODEL.id,
      url: DEFAULT_POLY_PIZZA_MODEL.assetUrl,
      format: "glb",
      cameraPreset: "front",
      annotations: [],
    })
  })

  it("normalizes map layers from CSV into array", () => {
    const content = buildStudioCardContent("map", {
      layers: " choropleth, city labels,  points ",
    })

    expect(content.layers).toEqual(["Choropleth", "Labels", "Points"])
  })

  it("normalizes map layer arrays from legacy values", () => {
    const content = buildStudioCardContent("map", {
      layers: ["labels", "Points", "marker", "city labels"],
    })

    expect(content.layers).toEqual(["Labels", "Points"])
  })
})
