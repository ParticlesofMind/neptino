import type { CardType } from "../types"
import { PAGE_COMPOSITION_PLACEMENT } from "../cards/pageComposition"
import { buildStudioCardContent } from "./studio-registry"

type CompositionPurpose = "simulation" | "checks" | "response-workspaces" | "layout-templates"
type CompositionSlotEntry = CardType | { cardType: CardType; title: string }

export interface CompositionLayoutOption {
  cardType: CardType
  label: string
  slotDraft: Record<string, CompositionSlotEntry[]>
}

export interface CompositionPreset {
  id: string
  title: string
  description: string
  purpose: CompositionPurpose
  defaultLayout: CardType
  layouts: CompositionLayoutOption[]
}

export const COMPOSITION_PRESETS: CompositionPreset[] = [
  {
    id: "cartographic-simulation",
    title: "Cartographic simulation",
    description: "Map-led simulation with context, controls, and observation space.",
    purpose: "simulation",
    defaultLayout: "layout-feature",
    layouts: [
      {
        cardType: "layout-feature",
        label: "Feature",
        slotDraft: {
          0: [{ cardType: "legend", title: "Map legend" }],
          1: [{ cardType: "map", title: "Scenario map" }],
          2: [{ cardType: "timeline", title: "Change over time" }],
        },
      },
      {
        cardType: "layout-sidebar",
        label: "Sidebar",
        slotDraft: {
          0: [{ cardType: "legend", title: "Map legend" }],
          1: [{ cardType: "map", title: "Scenario map" }],
        },
      },
      {
        cardType: "layout-annotated",
        label: "Annotated",
        slotDraft: {
          0: [{ cardType: "legend", title: "Map legend" }],
          1: [{ cardType: "map", title: "Scenario map" }],
          2: [{ cardType: "timeline", title: "Change over time" }],
          3: [{ cardType: "document", title: "Source packet" }],
          4: [{ cardType: "form", title: "Observation notes" }],
        },
      },
    ],
  },
  {
    id: "source-analysis-workspace",
    title: "Source analysis workspace",
    description: "Document, context, evidence notes, and written response in one surface.",
    purpose: "response-workspaces",
    defaultLayout: "layout-sidebar",
    layouts: [
      {
        cardType: "layout-sidebar",
        label: "Sidebar",
        slotDraft: {
          0: [{ cardType: "citation", title: "Source reference" }],
          1: [{ cardType: "source-excerpt", title: "Evidence excerpt" }, { cardType: "text-editor", title: "Analysis notes" }],
        },
      },
      {
        cardType: "layout-comparison",
        label: "Comparison",
        slotDraft: {
          0: [{ cardType: "source-excerpt", title: "Evidence excerpt" }],
          1: [{ cardType: "text-editor", title: "Interpretation notes" }],
        },
      },
      {
        cardType: "layout-banner",
        label: "Banner",
        slotDraft: {
          0: [{ cardType: "citation", title: "Source reference" }],
          1: [{ cardType: "source-excerpt", title: "Evidence excerpt" }],
          2: [{ cardType: "text-editor", title: "Analysis notes" }],
        },
      },
    ],
  },
  {
    id: "map-investigation",
    title: "Map investigation",
    description: "GIS layer, map, legend, source excerpt, and interpretation workspace.",
    purpose: "response-workspaces",
    defaultLayout: "layout-annotated",
    layouts: [
      {
        cardType: "layout-annotated",
        label: "Annotated",
        slotDraft: {
          0: [{ cardType: "legend", title: "Layer legend" }],
          1: [{ cardType: "map", title: "Investigation map" }],
          2: [{ cardType: "gis-layer", title: "GIS source layer" }],
          3: [{ cardType: "source-excerpt", title: "Map evidence" }],
          4: [{ cardType: "text-editor", title: "Interpretation notes" }],
        },
      },
      {
        cardType: "layout-feature",
        label: "Feature",
        slotDraft: {
          0: [{ cardType: "legend", title: "Layer legend" }, { cardType: "citation", title: "Layer citation" }],
          1: [{ cardType: "map", title: "Investigation map" }],
          2: [{ cardType: "gis-layer", title: "GIS source layer" }],
        },
      },
    ],
  },
  {
    id: "data-investigation",
    title: "Data investigation",
    description: "Dataset, chart, guidance, and interpretation workspace.",
    purpose: "response-workspaces",
    defaultLayout: "layout-quad",
    layouts: [
      {
        cardType: "layout-quad",
        label: "Quad",
        slotDraft: {
          0: ["dataset"],
          1: ["chart"],
          2: ["text"],
          3: ["text-editor"],
        },
      },
      {
        cardType: "layout-stack",
        label: "Stack",
        slotDraft: {
          0: ["chart"],
          1: ["text-editor"],
        },
      },
      {
        cardType: "layout-feature",
        label: "Feature",
        slotDraft: {
          0: ["chart"],
          1: ["dataset"],
          2: ["text-editor"],
        },
      },
    ],
  },
  {
    id: "historical-inquiry",
    title: "Historical inquiry",
    description: "Question, source set, timeline, map evidence, and written argument.",
    purpose: "response-workspaces",
    defaultLayout: "layout-broadside",
    layouts: [
      {
        cardType: "layout-broadside",
        label: "Broadside",
        slotDraft: {
          0: [{ cardType: "text", title: "Inquiry question" }],
          1: [{ cardType: "timeline", title: "Chronology" }],
          2: [{ cardType: "source-excerpt", title: "Primary source" }],
          3: [{ cardType: "text-editor", title: "Argument draft" }],
        },
      },
      {
        cardType: "layout-pinboard",
        label: "Pinboard",
        slotDraft: {
          0: [{ cardType: "text", title: "Inquiry question" }],
          1: [{ cardType: "map", title: "Place evidence" }],
          2: [{ cardType: "timeline", title: "Chronology" }],
          3: [{ cardType: "source-excerpt", title: "Primary source" }],
          4: [{ cardType: "bibliography", title: "Source set" }],
        },
      },
    ],
  },
  {
    id: "practice-check",
    title: "Practice check",
    description: "Prompt, practice interaction, and feedback capture.",
    purpose: "checks",
    defaultLayout: "layout-stack",
    layouts: [
      {
        cardType: "layout-stack",
        label: "Stack",
        slotDraft: {
          0: ["text"],
          1: ["interactive"],
        },
      },
      {
        cardType: "layout-split",
        label: "Split",
        slotDraft: {
          0: ["text"],
          1: ["sorter"],
        },
      },
      {
        cardType: "layout-flipcard",
        label: "Flipcard",
        slotDraft: {
          0: ["flashcards"],
          1: ["interactive"],
        },
      },
    ],
  },
  {
    id: "slide-presentation",
    title: "Slide presentation",
    description: "Keynote-style deck with slide sequence, notes, and embedded materials.",
    purpose: "response-workspaces",
    defaultLayout: "slides",
    layouts: [
      {
        cardType: "slides",
        label: "Deck",
        slotDraft: {},
      },
    ],
  },
]

export function getCompositionPreset(presetId: string): CompositionPreset | undefined {
  return COMPOSITION_PRESETS.find((preset) => preset.id === presetId)
}

export function getCompositionLayout(preset: CompositionPreset, cardType: CardType): CompositionLayoutOption {
  return preset.layouts.find((layout) => layout.cardType === cardType) ?? preset.layouts[0]
}

export function buildCompositionPresetContent(preset: CompositionPreset, cardType = preset.defaultLayout): Record<string, unknown> {
  const layout = getCompositionLayout(preset, cardType)
  if (layout.cardType === "slides") {
    return {
      title: preset.title,
      slides: [
        { title: "Opening", body: "Introduce the topic and frame the question.", notes: "Set context and expectations." },
        { title: "Evidence", body: "Place the key source, map, chart, or image here.", notes: "Ask students what they notice first." },
        { title: "Synthesis", body: "Summarise the claim, decision, or next step.", notes: "Close with a check for understanding." },
      ],
    }
  }
  return buildStudioCardContent(layout.cardType, {
    title: preset.title,
    compositionPresetId: preset.id,
    ...(preset.id === "cartographic-simulation" ? { pagePlacement: PAGE_COMPOSITION_PLACEMENT } : {}),
    slotDraft: layout.slotDraft,
  })
}
