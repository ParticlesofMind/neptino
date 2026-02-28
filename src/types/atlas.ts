/**
 * Atlas Knowledge System Types
 * 
 * Atlas organizes all educational knowledge into four layers:
 * - Layer 1: Entity Types (what knowledge is about)
 * - Layer 2: Media Types (raw material formats)
 * - Layer 3: Products (assembled, passive delivery)
 * - Layer 4: Activities (require student response)
 */

// ═══════════════════════════════════════════════════════════════════════
// Layer 1 — ENTITY TYPES
// ═══════════════════════════════════════════════════════════════════════

/**
 * The 11 fundamental ontological categories that define what knowledge is about.
 */
export type EntityType =
  | "Concept"
  | "Process"
  | "Instance"
  | "Person"
  | "State"
  | "Time"
  | "Environment"
  | "Work"
  | "Technology"
  | "Institution"
  | "Movement"

/**
 * Sub-types within Entity Types for more granular classification.
 */
export type EntitySubType =
  // Concept sub-types
  | "Theory"
  | "Theorem"
  | "Law"
  | "Principle"
  | "Model"
  | "Definition"
  // Time sub-types
  | "Event"
  | "Period"
  | "Epoch"
  // Environment sub-types
  | "Place"
  | "Organism"
  | "Matter"

/**
 * Atlas Item (Layer 1 — Entity)
 */
export interface AtlasItem {
  id: string
  wikidata_id: string | null
  title: string
  knowledge_type: EntityType
  sub_type: EntitySubType | null
  domain: string | null
  secondary_domains: string[] | null
  era_group: string | null
  era_label: string | null
  depth: string | null
  summary: string | null
  tags: string[] | null
  metadata: Record<string, unknown> | null
  created_at?: string
}

// ═══════════════════════════════════════════════════════════════════════
// Layer 2 — MEDIA TYPES
// ═══════════════════════════════════════════════════════════════════════

/**
 * The 6 primitive formats that knowledge arrives in — the raw material.
 */
export type MediaType = "Text" | "Image" | "Audio" | "Video" | "Dataset" | "3D Model"

// ═══════════════════════════════════════════════════════════════════════
// Layer 3 — PRODUCTS
// ═══════════════════════════════════════════════════════════════════════

/**
 * The 8 finished products assembled from media and delivered passively.
 * 
 * Map and Timeline are special — they're structured views over entities:
 * - Map: spatial view over Place entities
 * - Timeline: temporal view over Event and Period entities
 */
export type ProductType =
  | "Map"
  | "Timeline"
  | "Simulation"
  | "Documentary"
  | "Diagram"
  | "Narrative"
  | "Profile"
  | "Game"

// ═══════════════════════════════════════════════════════════════════════
// Layer 4 — ACTIVITIES
// ═══════════════════════════════════════════════════════════════════════

/**
 * The 5 activities that demand something back from the student.
 */
export type ActivityType =
  | "Exercise"
  | "Quiz"
  | "Assessment"
  | "Interactive Simulation"
  | "Game"

// ═══════════════════════════════════════════════════════════════════════
// COMBINED TYPES
// ═══════════════════════════════════════════════════════════════════════

/**
 * Combined type for all content types across layers 2, 3, and 4.
 */
export type AtlasContentType = MediaType | ProductType | ActivityType

/**
 * Layer identifier for content items.
 */
export type AtlasLayer = 2 | 3 | 4

/**
 * Atlas Content (Layers 2, 3, 4 — Media, Products, Activities)
 */
export interface AtlasContent {
  id: string
  item_id: string
  media_type: AtlasContentType
  layer: AtlasLayer
  title: string
  description: string | null
  url: string | null
  metadata: Record<string, unknown> | null
  created_at?: string
}

// ═══════════════════════════════════════════════════════════════════════
// HELPER TYPES
// ═══════════════════════════════════════════════════════════════════════

/**
 * Type guard to check if a content type is a Media Type (Layer 2).
 */
export function isMediaType(type: string): type is MediaType {
  return ["Text", "Image", "Audio", "Video", "Dataset", "3D Model"].includes(type)
}

/**
 * Type guard to check if a content type is a Product (Layer 3).
 */
export function isProductType(type: string): type is ProductType {
  return ["Map", "Timeline", "Simulation", "Documentary", "Diagram", "Narrative", "Profile", "Game"].includes(type)
}

/**
 * Type guard to check if a content type is an Activity (Layer 4).
 */
export function isActivityType(type: string): type is ActivityType {
  return ["Exercise", "Quiz", "Assessment", "Interactive Simulation", "Game"].includes(type)
}

/**
 * Get the layer number for a given content type.
 */
export function getLayerForType(type: string): AtlasLayer | null {
  if (isMediaType(type)) return 2
  if (isProductType(type)) return 3
  if (isActivityType(type)) return 4
  return null
}

/**
 * Get human-readable label for entity type.
 */
export function getEntityTypeLabel(type: EntityType): string {
  return type
}

/**
 * Get human-readable description for layer.
 */
export function getLayerDescription(layer: AtlasLayer): string {
  switch (layer) {
    case 2:
      return "Raw material — primitive formats"
    case 3:
      return "Assembled products — passive delivery"
    case 4:
      return "Activities — require student response"
  }
}

/**
 * Get layer name.
 */
export function getLayerName(layer: AtlasLayer): string {
  switch (layer) {
    case 2:
      return "Media Types"
    case 3:
      return "Products"
    case 4:
      return "Activities"
  }
}

// ═══════════════════════════════════════════════════════════════════════
// ISCED SUBJECT DOMAINS (International Standard Classification of Education)
// ═══════════════════════════════════════════════════════════════════════

/**
 * ISCED-F 2013 broad fields of education and training.
 * Source: UNESCO Institute for Statistics
 */
export type ISCEDDomain =
  | "Education"
  | "Arts and humanities"
  | "Social sciences, journalism and information"
  | "Business, administration and law"
  | "Natural sciences, mathematics and statistics"
  | "Information and Communication Technologies"
  | "Engineering, manufacturing and construction"
  | "Agriculture, forestry, fisheries and veterinary"
  | "Health and welfare"
  | "Services"

// ═══════════════════════════════════════════════════════════════════════
// FILTER AND SEARCH TYPES
// ═══════════════════════════════════════════════════════════════════════

export interface AtlasFilters {
  query?: string
  domain?: ISCEDDomain
  entityType?: EntityType
  era?: string
  layer?: AtlasLayer
  contentType?: AtlasContentType
}

export interface AtlasPagination {
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

export interface AtlasSearchResult {
  items: AtlasItem[]
  pagination: AtlasPagination
  filters: AtlasFilters
}

// ═══════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════

export const ENTITY_TYPES: EntityType[] = [
  "Concept",
  "Process",
  "Instance",
  "Person",
  "State",
  "Time",
  "Environment",
  "Work",
  "Technology",
  "Institution",
  "Movement",
]

export const MEDIA_TYPES: MediaType[] = ["Text", "Image", "Audio", "Video", "Dataset", "3D Model"]

export const PRODUCT_TYPES: ProductType[] = [
  "Map",
  "Timeline",
  "Simulation",
  "Documentary",
  "Diagram",
  "Narrative",
  "Profile",
  "Game",
]

export const ACTIVITY_TYPES: ActivityType[] = [
  "Exercise",
  "Quiz",
  "Assessment",
  "Interactive Simulation",
  "Game",
]

/**
 * ISCED-F 2013 broad fields - official international classification.
 */
export const ISCED_DOMAINS: ISCEDDomain[] = [
  "Education",
  "Arts and humanities",
  "Social sciences, journalism and information",
  "Business, administration and law",
  "Natural sciences, mathematics and statistics",
  "Information and Communication Technologies",
  "Engineering, manufacturing and construction",
  "Agriculture, forestry, fisheries and veterinary",
  "Health and welfare",
  "Services",
]

/**
 * Color mappings for layers (for UI consistency).
 */
export const LAYER_COLORS = {
  1: {
    accent: "#6b9fe8",
    glow: "rgba(107, 159, 232, 0.15)",
    name: "Entity Types",
  },
  2: {
    accent: "#7ec8a0",
    glow: "rgba(126, 200, 160, 0.15)",
    name: "Media Types",
  },
  3: {
    accent: "#e8a06b",
    glow: "rgba(232, 160, 107, 0.15)",
    name: "Products",
  },
  4: {
    accent: "#c46be8",
    glow: "rgba(196, 107, 232, 0.15)",
    name: "Activities",
  },
} as const
