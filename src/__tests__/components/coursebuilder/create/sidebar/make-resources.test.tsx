import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { CardTypePreview } from "@/components/coursebuilder/create/cards/CardTypePreview"
import { CARD_SPECS } from "@/components/coursebuilder/create/sidebar/make-panel-data"
import { getBlockReadiness } from "@/components/coursebuilder/create/sidebar/make-panel-readiness"
import { getStudioProfile } from "@/components/coursebuilder/create/sidebar/make-studio-tools"
import type { CardType } from "@/components/coursebuilder/create/types"
import { DEFAULT_POLY_PIZZA_MODEL } from "@/lib/poly-pizza-models"

const RESOURCE_TYPES = CARD_SPECS
  .filter((spec) => spec.group === "resources")
  .map((spec) => spec.cardType)

const NETWORKED_PREVIEW_TYPES = new Set<CardType>([
  "image",
  "audio",
  "video",
  "animation",
  "embed",
  "model-3d",
])

const VALID_RESOURCE_CONTENT: Partial<Record<CardType, Record<string, unknown>>> = {
  text: {
    title: "Water cycle overview",
    text: "<p>Evaporation, condensation, and precipitation move water through connected systems.</p>",
  },
  image: {
    title: "Circulatory system",
    url: "https://example.com/circulatory-system.png",
    alt: "Circulatory system diagram",
    caption: "Major arteries and veins.",
  },
  audio: {
    title: "Cell division lecture",
    url: "https://example.com/cell-division.mp3",
    transcript: "Mitosis creates two genetically identical daughter cells.",
  },
  video: {
    title: "Photosynthesis clip",
    url: "https://example.com/photosynthesis.mp4",
  },
  animation: {
    title: "Mitosis animation",
    url: "https://example.com/mitosis.json",
    format: "lottie",
    duration: "8s",
  },
  dataset: {
    title: "Population dataset",
    source: "analytics.population_2026",
    rows: 1200,
    columns: 6,
    format: "CSV",
  },
  embed: {
    title: "External simulator",
    url: "about:blank",
    provider: "iframe",
    caption: "A browser-based simulation.",
  },
  flashcards: {
    title: "Cell vocabulary",
    pairs: [{ term: "Nucleus", match: "Stores genetic material" }],
    difficulty: "intermediate",
  },
  "code-snippet": {
    title: "Average function",
    language: "javascript",
    code: "const values = [1, 2, 3]\nconst average = values.reduce((sum, value) => sum + value, 0) / values.length",
    caption: "Read the reduce call from left to right.",
  },
  "model-3d": {
    title: DEFAULT_POLY_PIZZA_MODEL.title,
    modelId: DEFAULT_POLY_PIZZA_MODEL.id,
    url: DEFAULT_POLY_PIZZA_MODEL.assetUrl,
    format: "glb",
  },
  map: {
    title: "World population density",
    lat: 20,
    lng: 10,
    zoom: 2,
    layers: ["Labels"],
  },
  chart: {
    title: "Temperature anomaly",
    chartType: "line",
    columns: ["Year", "Anomaly"],
    rows: [["2020", "1.02"]],
  },
  diagram: {
    title: "Krebs cycle",
    diagramType: "cycle",
    nodes: [{ id: "a", label: "Acetyl CoA", x: 100, y: 100, shape: "rect" }],
    edges: [],
  },
  document: {
    title: "Newton excerpt",
    url: "https://example.com/principia.pdf",
    documentType: "pdf",
    pages: 12,
    excerpt: "Every body persists in its state of rest or uniform motion unless acted on by a force.",
  },
  timeline: {
    title: "History of the Internet",
    events: [{ date: "1969", label: "ARPANET", description: "The first packet-switched network nodes connect." }],
  },
}

describe("Make resources", () => {
  it("keeps a dedicated profile for every resource card type", () => {
    expect(RESOURCE_TYPES).toEqual([
      "text",
      "image",
      "audio",
      "video",
      "animation",
      "dataset",
      "embed",
      "flashcards",
      "code-snippet",
      "model-3d",
      "map",
      "chart",
      "diagram",
      "document",
      "timeline",
    ])

    for (const cardType of RESOURCE_TYPES) {
      const profile = getStudioProfile(cardType)
      expect(profile.mediaType, cardType).not.toBe("Custom")
      expect(profile.productType, cardType).not.toBe("Card")
    }
  })

  it("can create every resource from title plus meaningful content", () => {
    for (const cardType of RESOURCE_TYPES) {
      const content = VALID_RESOURCE_CONTENT[cardType]
      expect(content, cardType).toBeDefined()
      expect(getBlockReadiness(cardType, content!).canAddToCanvas, cardType).toBe(true)
    }
  })

  it("renders concrete previews for every resource type", () => {
    for (const cardType of RESOURCE_TYPES) {
      const content = VALID_RESOURCE_CONTENT[cardType]
      const previewContent = cardType === "timeline"
        ? { ...content!, events: [] }
        : NETWORKED_PREVIEW_TYPES.has(cardType)
        ? { ...content!, url: "" }
        : content!
      const { unmount } = render(<CardTypePreview cardType={cardType} content={previewContent} hideTitle />)

      expect(screen.queryByText("Preview not available for this type yet."), cardType).not.toBeInTheDocument()
      unmount()
    }
  })
})
