"use client"

/**
 * Block Renderer
 *
 * Renders an ordered set of body blocks onto a canvas page.
 * Header and footer are not rendered here — they live in the page margin bands
 * and are mounted directly by CanvasPage.
 *
 * `blockKeys` drives which blocks appear — always resolved from the session's template type.
 * No hardcoded default exists; a canvas with no `blockKeys` renders empty.
 */

import type { ComponentType } from "react"
import type { BlockKey, BlockRenderProps, CanvasId, SessionId } from "../types"

import { HeaderBlock }    from "../blocks/Header"
import { FooterBlock }    from "../blocks/Footer"
import { ProgramBlock }   from "../blocks/Program"
import { ResourcesBlock } from "../blocks/Resources"
import { ContentBlock }   from "../blocks/Content"
import { ProjectBlock }   from "../blocks/Project"

// ─── Registry ────────────────────────────────────────────────────────────────

export type BlockRegistry = Record<BlockKey, ComponentType<BlockRenderProps>>

export const BLOCK_REGISTRY: BlockRegistry = {
  header:     HeaderBlock,
  footer:     FooterBlock,
  program:    ProgramBlock,
  resources:  ResourcesBlock,
  content:    ContentBlock,
  assignment: ContentBlock,  // shares Content component; type-specific props added later
  scoring:    ContentBlock,  // placeholder until a dedicated ScoringBlock is built
  project:    ProjectBlock,
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface BlockRendererProps {
  sessionId:    SessionId
  canvasId?:    CanvasId
  fieldValues:  Record<string, string>
  data?:        Record<string, Record<string, unknown>>
  /** Which body blocks to render on this page, ordered. Resolved from the session template type. Renders empty when unset — no hardcoded default. */
  blockKeys?:   BlockKey[]
  /**
   * Per-block field visibility flags sourced from the active template's fieldState.
   * Forwarded verbatim to each block component via BlockRenderProps.fieldEnabled.
   */
  fieldEnabled?: Partial<Record<string, Record<string, boolean>>>
  /** Override the registry (useful for testing). */
  registry?:    Partial<BlockRegistry>
}

// ─── Component ───────────────────────────────────────────────────────────────

export function BlockRenderer({
  sessionId,
  canvasId,
  fieldValues,
  data = {},
  blockKeys,
  fieldEnabled,
  registry,
}: BlockRendererProps) {
  const resolvedRegistry: BlockRegistry = { ...BLOCK_REGISTRY, ...registry }
  const keys = (blockKeys ?? []).filter((k) => k !== "header" && k !== "footer")

  return (
    <div className="flex flex-col w-full gap-2 px-1 py-2">
      {keys.map((key) => {
        const BlockComponent = resolvedRegistry[key]
        if (!BlockComponent) return null
        const props: BlockRenderProps = {
          sessionId,
          canvasId,
          blockKey: key,
          fieldValues,
          data:        data[key],
          fieldEnabled,
        }
        return <BlockComponent key={key} {...props} />
      })}
    </div>
  )
}
