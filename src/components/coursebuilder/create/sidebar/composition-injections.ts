import type { AtlasInjectionCardPatch, AtlasInjectionOption } from "@/lib/atlas/composition-injection-types"
import {
  OTTOMAN_CONTRACTION_PROXY,
  OTTOMAN_EARLY_BEYLIK_PROXY,
  OTTOMAN_IMPERIAL_CORE_PROXY,
  OTTOMAN_LAND_PROXY_SOURCE_URL,
  OTTOMAN_PEAK_REACH_PROXY,
} from "@/lib/atlas/ottoman-land-proxy-geojson"
import { sourceProvenanceFromMetadata } from "@/lib/atlas/source-provenance"
import type { TerritoryLayer } from "./editors/map-editor-config"
import type { DroppedCard } from "../types"

export type { AtlasInjectionCardPatch, AtlasInjectionOption } from "@/lib/atlas/composition-injection-types"

const OTTOMAN_TERRITORY_SOURCE_NOTE = "Visual proxy using Natural Earth 1:110m modern land polygons and schematic historical corridors; replace with reviewed historical GeoJSON before treating as evidence."

const OTTOMAN_SIMULATION_TIMELINE = {
  initialYear: 1453,
  minYear: 1299,
  maxYear: 1922,
  phases: [
    {
      id: "ottoman-early-beylik",
      label: "Early beylik",
      startYear: 1299,
      endYear: 1452,
      color: "#2563eb",
      description: "Northwestern Anatolia before the capture of Constantinople.",
    },
    {
      id: "ottoman-imperial-core",
      label: "Imperial core",
      startYear: 1453,
      endYear: 1516,
      color: "#14b8a6",
      description: "Balkans and Anatolia after Constantinople becomes the imperial capital.",
    },
    {
      id: "ottoman-peak-reach",
      label: "Peak reach",
      startYear: 1517,
      endYear: 1683,
      color: "#f59e0b",
      description: "Major holdings after expansion into Syria, Egypt, and the holy cities.",
    },
    {
      id: "ottoman-contraction-zones",
      label: "Contraction",
      startYear: 1684,
      endYear: 1922,
      color: "#ef4444",
      description: "Territorial losses, nationalist movements, and dissolution.",
    },
  ],
}

const OTTOMAN_REVIEW_METADATA = {
  source_id: "natural_earth",
  source_label: "Natural Earth modern land proxy",
  source_rank: "D",
  source_url: OTTOMAN_LAND_PROXY_SOURCE_URL,
  external_id: "ottoman-natural-earth-modern-land-proxy",
  retrieved_at: "2026-05-28T00:00:00.000Z",
  license: "ODC-PDDL via DataHub; original Natural Earth public domain source",
  confidence: 0.35,
  warnings: [
    "This is a coastline-following visual proxy, not a reviewed historical Ottoman boundary dataset.",
    "Modern country polygons are used to make the map fill land cleanly and should not be read as exact historical borders.",
    "Use OpenHistoricalMap or another reviewed historical GIS source before treating the shapes as evidence.",
  ],
}

const OTTOMAN_REVIEW_PROVENANCE = sourceProvenanceFromMetadata(OTTOMAN_REVIEW_METADATA)

const OTTOMAN_LAND_PROXY_TERRITORIES: TerritoryLayer[] = [
  {
    id: "ottoman-early-beylik",
    label: "Early beylik",
    color: "#2563eb",
    dateRange: "c. 1299-1453",
    startYear: 1299,
    endYear: 1452,
    certainty: "schematic",
    source: OTTOMAN_TERRITORY_SOURCE_NOTE,
    sourceUrl: OTTOMAN_LAND_PROXY_SOURCE_URL,
    fillOpacity: 0.42,
    opacity: 0.86,
    weight: 1.6,
    geojson: OTTOMAN_EARLY_BEYLIK_PROXY,
  },
  {
    id: "ottoman-imperial-core",
    label: "Imperial core",
    color: "#14b8a6",
    dateRange: "1453-1683",
    startYear: 1453,
    endYear: 1516,
    certainty: "review-needed",
    source: OTTOMAN_TERRITORY_SOURCE_NOTE,
    sourceUrl: OTTOMAN_LAND_PROXY_SOURCE_URL,
    fillOpacity: 0.24,
    opacity: 0.78,
    weight: 1.25,
    geojson: OTTOMAN_IMPERIAL_CORE_PROXY,
  },
  {
    id: "ottoman-peak-reach",
    label: "Peak reach",
    color: "#f59e0b",
    dateRange: "late 16th-17th century",
    startYear: 1517,
    endYear: 1683,
    certainty: "review-needed",
    source: OTTOMAN_TERRITORY_SOURCE_NOTE,
    sourceUrl: OTTOMAN_LAND_PROXY_SOURCE_URL,
    fillOpacity: 0.2,
    opacity: 0.72,
    weight: 1.2,
    geojson: OTTOMAN_PEAK_REACH_PROXY,
  },
  {
    id: "ottoman-contraction-zones",
    label: "Contraction",
    color: "#ef4444",
    dateRange: "18th-20th centuries",
    startYear: 1684,
    endYear: 1922,
    certainty: "review-needed",
    source: OTTOMAN_TERRITORY_SOURCE_NOTE,
    sourceUrl: OTTOMAN_LAND_PROXY_SOURCE_URL,
    fillOpacity: 0.18,
    opacity: 0.74,
    weight: 1.25,
    geojson: OTTOMAN_CONTRACTION_PROXY,
  },
]

export const ATLAS_INJECTION_OPTIONS: AtlasInjectionOption[] = [
  {
    id: "atlas-ottoman-empire-cartographic",
    label: "Ottoman Empire",
    description: "Rise, territorial extent, contraction, and dissolution, 1299-1922.",
    sourceLabel: "Atlas example: Wikidata + historical gazetteer candidate",
    compositionPresetId: "cartographic-simulation",
    patches: [
      {
        cardType: "legend",
        matchTitle: "Map legend",
        content: {
          title: "Ottoman expansion phases",
          layout: "list",
          items: [
            { color: "#2563eb", label: "Early beylik", description: "Northwestern Anatolia, c. 1299-1453" },
            { color: "#14b8a6", label: "Imperial core", description: "Balkans and Anatolia after Constantinople" },
            { color: "#f59e0b", label: "Peak reach", description: "Major holdings around the late 16th to 17th centuries" },
            { color: "#ef4444", label: "Contraction", description: "Territorial losses and dissolution, 18th-20th centuries" },
          ],
          sourceMetadata: OTTOMAN_REVIEW_METADATA,
          sourceProvenance: OTTOMAN_REVIEW_PROVENANCE,
        },
      },
      {
        cardType: "map",
        matchTitle: "Scenario map",
        content: {
          title: "Ottoman Empire territorial simulation",
          lat: 39.2,
          lng: 31.1,
          zoom: 4,
          mapLayer: "Standard",
          layers: ["Territories", "Points"],
          points: [
            { lat: 41.0082, lng: 28.9784, label: "Constantinople / Istanbul" },
            { lat: 40.1826, lng: 29.0665, label: "Bursa" },
            { lat: 41.6771, lng: 26.5557, label: "Edirne" },
            { lat: 44.7866, lng: 20.4489, label: "Belgrade" },
            { lat: 47.4979, lng: 19.0402, label: "Buda" },
            { lat: 30.0444, lng: 31.2357, label: "Cairo" },
            { lat: 33.5138, lng: 36.2765, label: "Damascus" },
            { lat: 21.3891, lng: 39.8579, label: "Mecca" },
          ],
          territories: OTTOMAN_LAND_PROXY_TERRITORIES,
          source: OTTOMAN_TERRITORY_SOURCE_NOTE,
          sourceMetadata: {
            geometry_precision: "modern_land_proxy",
            ...OTTOMAN_REVIEW_METADATA,
          },
          sourceProvenance: OTTOMAN_REVIEW_PROVENANCE,
        },
      },
      {
        cardType: "timeline",
        matchTitle: "Change over time",
        content: {
          title: "Ottoman imperial timeline",
          orientation: "horizontal",
          events: [
            { date: "1299", label: "Osman I's beylik", description: "The Ottoman polity emerges in northwestern Anatolia.", color: "#2563eb" },
            { date: "1453", label: "Constantinople captured", description: "Mehmed II takes Constantinople, making it the imperial capital.", color: "#14b8a6" },
            { date: "1517", label: "Syria and Egypt added", description: "Ottoman control expands across the Levant, Egypt, and the holy cities.", color: "#f59e0b" },
            { date: "1683", label: "Second siege of Vienna", description: "A common marker for the limits of Ottoman expansion in central Europe.", color: "#f59e0b" },
            { date: "1821", label: "Greek War of Independence", description: "National movements and foreign intervention accelerate territorial contraction.", color: "#ef4444" },
            { date: "1912", label: "Balkan Wars", description: "The empire loses most remaining European territories.", color: "#ef4444" },
            { date: "1922", label: "Sultanate abolished", description: "The Ottoman state ends after World War I and the Turkish War of Independence.", color: "#ef4444" },
          ],
          sourceMetadata: OTTOMAN_REVIEW_METADATA,
          sourceProvenance: OTTOMAN_REVIEW_PROVENANCE,
        },
      },
    ],
  },
]

function patchSlotCard(card: DroppedCard, patch: AtlasInjectionCardPatch): DroppedCard {
  return {
    ...card,
    content: {
      ...card.content,
      ...patch.content,
    },
  }
}

export function applyAtlasInjection(
  content: Record<string, unknown>,
  injection: AtlasInjectionOption,
): Record<string, unknown> {
  const rawSlots = content.slots
  if (!rawSlots || typeof rawSlots !== "object") return content

  const slots = rawSlots as Record<string, DroppedCard[]>
  return {
    ...content,
    title: `${content.title ?? "Composition"}: ${injection.label}`,
    atlasInjection: {
      id: injection.id,
      label: injection.label,
      sourceLabel: injection.sourceLabel,
    },
    ...(injection.id === "atlas-ottoman-empire-cartographic"
      ? { simulationTimeline: OTTOMAN_SIMULATION_TIMELINE }
      : {}),
    slots: Object.fromEntries(
      Object.entries(slots).map(([slotKey, cards]) => [
        slotKey,
        cards.map((card) => {
          const title = typeof card.content.title === "string" ? card.content.title : ""
          const patch = injection.patches.find((candidate) => (
            candidate.cardType === card.cardType &&
            (!candidate.matchTitle || candidate.matchTitle === title)
          ))
          return patch ? patchSlotCard(card, patch) : card
        }),
      ]),
    ),
  }
}

export function getInjectionOptionsForComposition(compositionPresetId: string): AtlasInjectionOption[] {
  return ATLAS_INJECTION_OPTIONS.filter((option) => option.compositionPresetId === compositionPresetId)
}
