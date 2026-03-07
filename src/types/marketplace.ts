/**
 * Marketplace Types
 *
 * The Marketplace is a separate surface from Atlas where teachers browse, acquire,
 * and sell content assets (Layers 2–4 card configurations). It is NOT a knowledge
 * graph — it is a content asset store.
 *
 * Relationship to Atlas:
 *   Atlas     = Layer 1 knowledge graph (entities, concepts, people, places)
 *   Marketplace = Layers 2–4 asset store (cards, templates, simulations, games)
 */

import type { ISCEDDomain } from "./atlas"

// ─── Asset types ─────────────────────────────────────────────────────────────

/**
 * The kinds of asset a teacher can list or acquire in the Marketplace.
 *
 * simulation       — A configured rich-sim card (embed URL + prompt + checkpoints)
 * compound_blueprint — A pre-wired multi-card blueprint (e.g. Timeline + Map + Text)
 * lesson_template  — A full session template with pre-filled tasks and card content
 * game_config      — A game card configuration (pairs, time limits, scoring rules)
 * card_collection  — A curated set of related cards (e.g. all cards for a unit)
 */
export type MarketplaceAssetType =
  | "simulation"
  | "compound_blueprint"
  | "lesson_template"
  | "game_config"
  | "card_collection"

// ─── Asset ───────────────────────────────────────────────────────────────────

export interface MarketplaceAsset {
  id: string
  title: string
  description: string
  assetType: MarketplaceAssetType
  authorId: string
  authorName: string
  thumbnailUrl?: string
  /** Price in cents (0 = free) */
  price: number
  currency: "USD" | "EUR" | "GBP"
  tags: string[]
  domain?: ISCEDDomain
  /** URL for a read-only preview of the asset in action */
  previewUrl?: string
  createdAt: string
  updatedAt: string
  downloadCount: number
  /** 0–5 average rating */
  rating: number
  ratingCount: number
  /** Whether the current user has already acquired this asset */
  acquired?: boolean
}

// ─── Listing (teacher's own asset for sale) ──────────────────────────────────

export type MarketplaceListingStatus = "draft" | "pending_review" | "published" | "rejected" | "archived"

export interface MarketplaceListing {
  id: string
  asset: MarketplaceAsset
  status: MarketplaceListingStatus
  /** Serialised card/template payload — the actual importable content */
  payload: Record<string, unknown>
  /** Admin feedback when status is "rejected" */
  reviewFeedback?: string
  submittedAt?: string
  publishedAt?: string
}

// ─── Acquisition record ───────────────────────────────────────────────────────

export interface MarketplaceAcquisition {
  id: string
  assetId: string
  userId: string
  acquiredAt: string
  /** The asset snapshot at time of acquisition (assets may change after) */
  snapshotPayload: Record<string, unknown>
}

// ─── Search / filter ─────────────────────────────────────────────────────────

export interface MarketplaceFilters {
  query?: string
  assetType?: MarketplaceAssetType
  domain?: ISCEDDomain
  free?: boolean
  minRating?: number
  authorId?: string
}

export interface MarketplaceSortOption {
  field: "createdAt" | "rating" | "downloadCount" | "price"
  direction: "asc" | "desc"
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const MARKETPLACE_ASSET_TYPES: { id: MarketplaceAssetType; label: string; description: string }[] = [
  {
    id: "simulation",
    label: "Simulation",
    description: "Configured embeddable simulation with prompts and checkpoints",
  },
  {
    id: "compound_blueprint",
    label: "Compound Blueprint",
    description: "Pre-wired multi-card layout with coordinated entity scope",
  },
  {
    id: "lesson_template",
    label: "Lesson Template",
    description: "Full session with pre-filled tasks, objectives, and card content",
  },
  {
    id: "game_config",
    label: "Game",
    description: "Word match, memory, fill-in-the-blank, or drag & drop configuration",
  },
  {
    id: "card_collection",
    label: "Card Collection",
    description: "Curated set of related cards for a topic or unit",
  },
]
