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
    expect(getStudioProfile("embed").mediaType).toBe("Embed")
    expect(getStudioProfile("flashcards").productType).toBe("Revision Deck")
    expect(getStudioProfile("code-snippet").productType).toBe("Read-Only Snippet")
    expect(getStudioProfile("timeline").productType).toBe("Chronological Resource")
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
    expect(getStudioDefaults("layout-split")).toMatchObject({
      title: "Split composition",
      slots: {},
      slotDraft: {},
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

  it("turns layout editor slot drafts into canvas-renderable slots", () => {
    const content = buildStudioCardContent("layout-split", {
      title: "Compare causes",
      slotDraft: {
        0: ["text"],
        1: ["image"],
      },
    })

    expect(content.slotDraft).toBeUndefined()
    expect(content.slots).toMatchObject({
      0: [expect.objectContaining({ cardType: "text", areaKind: "instruction" })],
      1: [expect.objectContaining({ cardType: "image", areaKind: "instruction" })],
    })
  })
})
