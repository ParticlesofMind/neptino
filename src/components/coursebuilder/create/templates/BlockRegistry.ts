/**
 * Block Registry
 *
 * Maps every BlockKey to its React component. Adding a new block type means:
 *   1. Create the component in ../blocks/
 *   2. Add an entry here
 *   3. Nothing else — TemplateRenderer picks it up automatically.
 */

import type { ComponentType } from "react"
import type { BlockKey, BlockRenderProps } from "../types"

import { HeaderBlock }    from "../blocks/Header"
import { FooterBlock }    from "../blocks/Footer"
import { ProgramBlock }   from "../blocks/Program"
import { ResourcesBlock } from "../blocks/Resources"
import { ContentBlock }   from "../blocks/Content"
import { ProjectBlock }   from "../blocks/Project"

// ─── Registry type ────────────────────────────────────────────────────────────

export type BlockRegistry = Record<BlockKey, ComponentType<BlockRenderProps>>

// ─── Default registry ─────────────────────────────────────────────────────────

export const DEFAULT_BLOCK_REGISTRY: BlockRegistry = {
  header:     HeaderBlock,
  footer:     FooterBlock,
  program:    ProgramBlock,
  resources:  ResourcesBlock,
  content:    ContentBlock,
  assignment: ContentBlock,   // shares the Content component; differs via props
  scoring:    ContentBlock,   // ditto — swap for ScoringBlock when built
  project:    ProjectBlock,
}
