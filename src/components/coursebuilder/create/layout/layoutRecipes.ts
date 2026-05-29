import type { CSSProperties } from "react"
import type { DroppedCard } from "../types"
import { getCardLayoutPolicy, type CardLayoutRole } from "../cards/cardLayoutPolicies"
import type { PageZones } from "./pageZones"

export type LayoutRecipeId =
  | "map-led-atlas"
  | "evidence-panel"
  | "data-investigation"
  | "comparison"
  | "workbook"
  | "standard-flow"

export interface LayoutRecipeSelection {
  id: LayoutRecipeId
  label: string
  dominantCardId?: string
  reasons: string[]
}

export interface LayoutRecipeCardPlacement {
  slot: string
  role: CardLayoutRole
  reason: string
}

const RECIPE_LABELS: Record<LayoutRecipeId, string> = {
  "map-led-atlas": "Map-led atlas page",
  "evidence-panel": "Evidence panel page",
  "data-investigation": "Data investigation page",
  comparison: "Comparison page",
  workbook: "Workbook page",
  "standard-flow": "Standard flow",
}

const PRIMARY_COMPARISON_TYPES = new Set(["map", "table", "dataset", "chart", "source-excerpt", "document", "image"])
const EVIDENCE_TYPES = new Set(["source-excerpt", "document", "image", "citation", "bibliography"])
const DATA_TYPES = new Set(["dataset", "table", "chart"])
const RESPONSE_TYPES = new Set(["whiteboard", "text-editor", "code-editor", "chat", "interactive", "form", "voice-recorder", "sorter", "games"])

function cardsOf(cards: DroppedCard[], types: ReadonlySet<string>): DroppedCard[] {
  return cards.filter((card) => types.has(card.cardType))
}

function firstCardOf(cards: DroppedCard[], types: ReadonlySet<string>): DroppedCard | undefined {
  return cards.find((card) => types.has(card.cardType))
}

export function selectLayoutRecipe(
  cards: DroppedCard[],
  pageZones: PageZones,
): LayoutRecipeSelection {
  if (cards.length === 0) {
    return {
      id: "standard-flow",
      label: RECIPE_LABELS["standard-flow"],
      reasons: ["No cards are visible on this page."],
    }
  }

  const map = cards.find((card) => card.cardType === "map")
  const hasTimeline = cards.some((card) => card.cardType === "timeline")
  const hasLegend = cards.some((card) => card.cardType === "legend")
  const hasMapSupport = hasTimeline || hasLegend || cards.some((card) => {
    const policy = getCardLayoutPolicy(card.cardType, card.content, pageZones)
    return policy.role === "metadata" || policy.role === "caption" || card.cardType === "text"
  })

  if (map && hasMapSupport) {
    return {
      id: "map-led-atlas",
      label: RECIPE_LABELS["map-led-atlas"],
      dominantCardId: String(map.id),
      reasons: [
        "A map is present with legend, timeline, source, caption, or short text support.",
        "Map receives the dominant body slot while supporting material moves to rails or strips.",
      ],
    }
  }

  const comparisonCandidates = cardsOf(cards, PRIMARY_COMPARISON_TYPES)
  const mapCount = cards.filter((card) => card.cardType === "map").length
  const sourceCount = cards.filter((card) => card.cardType === "source-excerpt" || card.cardType === "document").length
  const hasDataComparisonSurface = comparisonCandidates.some((card) => DATA_TYPES.has(card.cardType))
  if (comparisonCandidates.length >= 2 && (mapCount >= 2 || sourceCount >= 2 || (mapCount >= 1 && hasDataComparisonSurface))) {
    return {
      id: "comparison",
      label: RECIPE_LABELS.comparison,
      dominantCardId: String(comparisonCandidates[0]?.id ?? cards[0]!.id),
      reasons: [
        "Two primary comparison surfaces are visible.",
        "The recipe balances both surfaces and keeps shared support compact.",
      ],
    }
  }

  const dataCard = firstCardOf(cards, DATA_TYPES)
  if (dataCard) {
    return {
      id: "data-investigation",
      label: RECIPE_LABELS["data-investigation"],
      dominantCardId: String(dataCard.id),
      reasons: [
        "Dataset, table, or chart content is present.",
        "The data surface receives full body priority with explanations and responses nearby.",
      ],
    }
  }

  const evidenceCard = firstCardOf(cards, EVIDENCE_TYPES)
  if (evidenceCard) {
    return {
      id: "evidence-panel",
      label: RECIPE_LABELS["evidence-panel"],
      dominantCardId: String(evidenceCard.id),
      reasons: [
        "Evidence or citation material is present.",
        "The recipe protects the source surface while moving citations and notes to compact zones.",
      ],
    }
  }

  const responseCount = cardsOf(cards, RESPONSE_TYPES).length
  if (responseCount > 0 && responseCount >= Math.ceil(cards.length / 2)) {
    return {
      id: "workbook",
      label: RECIPE_LABELS.workbook,
      dominantCardId: String(firstCardOf(cards, RESPONSE_TYPES)?.id ?? cards[0]!.id),
      reasons: [
        "Response surfaces dominate the page.",
        "The prompt stays compact and writable student work receives stable body space.",
      ],
    }
  }

  return {
    id: "standard-flow",
    label: RECIPE_LABELS["standard-flow"],
    dominantCardId: String(cards[0]?.id ?? ""),
    reasons: ["No specialized page recipe is a stronger fit than standard flow."],
  }
}

export function getRecipeCardPlacement(
  card: DroppedCard,
  recipe: LayoutRecipeSelection,
  indexInRecipe = 0,
): LayoutRecipeCardPlacement {
  const type = card.cardType

  switch (recipe.id) {
    case "map-led-atlas":
      if (type === "map") return { slot: "primary", role: "primary", reason: "Primary map anchors the atlas page." }
      if (type === "legend") return { slot: "legend", role: "legend", reason: "Legend docks in the support rail." }
      if (type === "timeline") return { slot: "timeline", role: "timeline", reason: "Timeline reads best as a page-width strip." }
      if (type === "citation" || type === "bibliography") return { slot: "source", role: "metadata", reason: "Source notes stay compact and print-safe." }
      return { slot: "context", role: "support", reason: "Supporting explanation stays in a controlled reading column." }
    case "comparison":
      if (PRIMARY_COMPARISON_TYPES.has(type) && indexInRecipe <= 1) {
        return {
          slot: indexInRecipe === 0 ? "compare-left" : "compare-right",
          role: "primary",
          reason: "Primary comparison cards share the body evenly.",
        }
      }
      if (type === "legend" || type === "citation" || type === "bibliography") {
        return { slot: "support", role: type === "legend" ? "legend" : "metadata", reason: "Shared support remains compact between or below compared items." }
      }
      return { slot: "context", role: "support", reason: "Context stays brief and symmetrical." }
    case "data-investigation":
      if (DATA_TYPES.has(type)) return { slot: "primary", role: type === "chart" ? "support" : "primary", reason: "Data surfaces need full body priority." }
      if (RESPONSE_TYPES.has(type)) return { slot: "response", role: "response", reason: "Student response is protected below the data surface." }
      if (type === "citation" || type === "bibliography") return { slot: "source", role: "metadata", reason: "Source metadata moves to a compact note zone." }
      return { slot: "context", role: "support", reason: "Explanatory text stays near the investigation." }
    case "evidence-panel":
      if (EVIDENCE_TYPES.has(type) && type !== "citation" && type !== "bibliography") {
        return { slot: "primary", role: "primary", reason: "The source or artifact receives the primary evidence slot." }
      }
      if (type === "citation" || type === "bibliography") return { slot: "source", role: "metadata", reason: "Citation data belongs in a compact source zone." }
      if (RESPONSE_TYPES.has(type)) return { slot: "response", role: "response", reason: "Analysis response receives protected writing space." }
      return { slot: "context", role: "support", reason: "Context text stays in a narrow reading column." }
    case "workbook":
      if (RESPONSE_TYPES.has(type)) return { slot: "response", role: "response", reason: "Writable response surface gets the main workbook area." }
      if (type === "text" || type === "source-excerpt") return { slot: "prompt", role: "support", reason: "Prompt material stays print-safe and compact." }
      if (type === "citation" || type === "bibliography") return { slot: "source", role: "metadata", reason: "Teacher/source metadata moves to the note zone." }
      return { slot: "support", role: "support", reason: "Supporting media stays compact around the response area." }
    default:
      return { slot: "flow", role: "support", reason: "Standard flow preserves source card order." }
  }
}

export function getRecipeSlotOrder(recipeId: LayoutRecipeId): string[] {
  switch (recipeId) {
    case "map-led-atlas":
      return ["primary", "legend", "timeline", "context", "source"]
    case "comparison":
      return ["compare-left", "compare-right", "support", "context"]
    case "data-investigation":
      return ["primary", "context", "response", "source"]
    case "evidence-panel":
      return ["primary", "context", "source", "response"]
    case "workbook":
      return ["prompt", "response", "support", "source"]
    default:
      return ["flow"]
  }
}

export function getRecipeDeckStyle(recipeId: LayoutRecipeId): CSSProperties | undefined {
  switch (recipeId) {
    case "map-led-atlas":
      return {
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) minmax(140px, 220px)",
        gridTemplateRows: "minmax(240px, auto) auto auto",
        gridTemplateAreas: `
          "primary legend"
          "timeline timeline"
          "context source"
        `,
        gap: 8,
        alignItems: "start",
      }
    case "comparison":
      return {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gridTemplateAreas: `
          "compare-left compare-right"
          "support support"
          "context context"
        `,
        gap: 8,
        alignItems: "start",
      }
    case "data-investigation":
      return {
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) minmax(180px, 240px)",
        gridTemplateAreas: `
          "primary primary"
          "context source"
          "response response"
        `,
        gap: 8,
        alignItems: "start",
      }
    case "evidence-panel":
      return {
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) minmax(160px, 220px)",
        gridTemplateAreas: `
          "primary source"
          "context source"
          "response response"
        `,
        gap: 8,
        alignItems: "start",
      }
    case "workbook":
      return {
        display: "grid",
        gridTemplateColumns: "minmax(180px, 240px) minmax(0, 1fr)",
        gridTemplateAreas: `
          "prompt response"
          "support response"
          "source source"
        `,
        gap: 8,
        alignItems: "start",
      }
    default:
      return undefined
  }
}

export function getRecipeSlotStyle(slot: string): CSSProperties {
  return {
    gridArea: slot,
    minWidth: 0,
  }
}
