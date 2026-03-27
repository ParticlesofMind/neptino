/**
 * Card Registry
 *
 * Maps every CardType to its renderer pair (Editor + optional Preview).
 * Adding a new card type means:
 *   1. Create the component in ./card-types/
 *   2. Add an entry here
 *   3. Nothing else — CardRenderer picks it up automatically.
 *
 * Editor:  shown in the coursebuilder canvas (may include edit affordances)
 * Preview: shown in the student-facing published view (read-only).
 *           Defaults to Editor when no separate Preview component is provided.
 */

import type { ComponentType } from "react"
import type { DroppedCard, CardType } from "../types"

import { TextCard }  from "./card-types/TextCard"
import { ImageCard } from "./card-types/ImageCard"
import { VideoCard } from "./card-types/VideoCard"
import { RichCard }  from "./card-types/RichCard"
import { LayoutCard } from "./card-types/LayoutCard"
import { TimelineCard } from "./card-types/TimelineCard"
import { MapCard } from "./card-types/MapCard"
import { ChatCard } from "./card-types/ChatCard"
import { TextEditorCard } from "./card-types/TextEditorCard"
import { CodeEditorCard } from "./card-types/CodeEditorCard"
import { WhiteboardCard } from "./card-types/WhiteboardCard"

// ─── Shared prop contract ─────────────────────────────────────────────────────

export interface CardRenderProps {
  card: DroppedCard
  /** Optional remove handler — present in editor mode, absent in preview */
  onRemove?: () => void
}

// ─── Registry shape ───────────────────────────────────────────────────────────

/**
 * Each card type registers:
 *  - Editor   — the component the teacher sees while building the course
 *  - Preview  — the read-only component the student sees (omit to reuse Editor)
 */
export interface CardRenderers {
  Editor:   ComponentType<CardRenderProps>
  Preview?: ComponentType<CardRenderProps>
}

export type CardRegistry = Partial<Record<CardType, CardRenderers>>

// ─── Default registry ─────────────────────────────────────────────────────────

export const DEFAULT_CARD_REGISTRY: CardRegistry = {
  // ── DOM-rendered types ─────────────────────────────────────────────────────
  text:       { Editor: TextCard  },
  image:      { Editor: ImageCard },
  video:      { Editor: VideoCard },
  map:        { Editor: MapCard   },
  timeline:   { Editor: TimelineCard },
  chat:       { Editor: ChatCard },
  "text-editor": { Editor: TextEditorCard },
  "code-editor": { Editor: CodeEditorCard },
  whiteboard: { Editor: WhiteboardCard },
  // audio / document / table use the generic fallback in CardRenderer

  // ── Canvas-backed types ────────────────────────────────────────────────────
  // All three share RichCard as the host; the scene engine is resolved inside it
  "rich-sim":   { Editor: RichCard },
  "village-3d": { Editor: RichCard },
  interactive:  { Editor: RichCard },
  // ── Layout containers ─────────────────────────────────────────
  "layout-split":     { Editor: LayoutCard },
  "layout-stack":     { Editor: LayoutCard },
  "layout-feature":   { Editor: LayoutCard },
  "layout-sidebar":   { Editor: LayoutCard },
  "layout-quad":      { Editor: LayoutCard },
  "layout-mosaic":    { Editor: LayoutCard },
  "layout-triptych":  { Editor: LayoutCard },
  "layout-trirow":    { Editor: LayoutCard },
  "layout-banner":    { Editor: LayoutCard },
  "layout-broadside": { Editor: LayoutCard },
  "layout-tower":     { Editor: LayoutCard },
  "layout-pinboard":  { Editor: LayoutCard },
  "layout-annotated": { Editor: LayoutCard },
  "layout-sixgrid":   { Editor: LayoutCard },
  "layout-comparison": { Editor: LayoutCard },
  "layout-stepped": { Editor: LayoutCard },
  "layout-hero": { Editor: LayoutCard },
  "layout-dialogue": { Editor: LayoutCard },
  "layout-gallery": { Editor: LayoutCard },
  "layout-spotlight": { Editor: LayoutCard },
  "layout-flipcard": { Editor: LayoutCard },
}

// ─── Lookup helper ────────────────────────────────────────────────────────────

/**
 * Resolve the correct component for a given card type and render mode.
 * Returns `null` when no renderer is registered (caller should use a fallback).
 */
export function resolveCardRenderer(
  registry: CardRegistry,
  cardType: CardType,
  mode: "editor" | "preview" = "editor",
): ComponentType<CardRenderProps> | null {
  const renderers = registry[cardType]
  if (!renderers) return null
  return mode === "preview" ? (renderers.Preview ?? renderers.Editor) : renderers.Editor
}
