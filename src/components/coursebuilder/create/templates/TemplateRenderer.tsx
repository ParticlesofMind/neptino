"use client"

/**
 * Template Renderer
 *
 * Reads a TemplateDefinition and mounts blocks from the BlockRegistry.
 * Adding a new template type = JSON definition + any new block component.
 * This file never needs to change.
 */

import type { BlockRenderProps, SessionId, TemplateType } from "../types"
import { getTemplateDefinition } from "./definitions"
import { DEFAULT_BLOCK_REGISTRY, type BlockRegistry } from "./BlockRegistry"
import { useTemplateStore } from "../store/templateStore"

// ─── Props ────────────────────────────────────────────────────────────────────

interface TemplateRendererProps {
  sessionId:   SessionId
  templateType: TemplateType
  /** Field values forwarded to every block (header/footer metadata, etc.) */
  fieldValues:  Record<string, string>
  /** Body data forwarded to complex blocks (program rows, topic tree, etc.) */
  data?:        Record<string, Record<string, unknown>>
  /**
   * When provided, only these body block keys are rendered on this canvas page.
   * Header and footer are rendered in the page margin bands by CanvasPage — not here.
   */
  allowedBlocks?: string[]
  /** Override the default block registry (useful for testing) */
  registry?:    Partial<BlockRegistry>
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TemplateRenderer({
  sessionId,
  templateType,
  fieldValues,
  data = {},
  allowedBlocks,
  registry,
}: TemplateRendererProps) {
  const resolvedRegistry: BlockRegistry = { ...DEFAULT_BLOCK_REGISTRY, ...registry }

  const definition = getTemplateDefinition(templateType)
  const config = useTemplateStore((s) => s.getConfig(sessionId))

  // Determine ordered body block keys (excludes header/footer — rendered in margins)
  const orderedBodyKeys = config.blockOrder.length > 0
    ? config.blockOrder
    : definition.blocks
        .filter((b) => b.key !== "header" && b.key !== "footer")
        .map((b) => b.key)

  // Resolve blocks that should be rendered on this canvas page
  const blocksToRender = orderedBodyKeys.filter((key) => {
    const defBlock = definition.blocks.find((b) => b.key === key)
    if (!defBlock) return false
    // If this canvas has a block restriction, honour it (required or not)
    if (allowedBlocks) return allowedBlocks.includes(key)
    if (defBlock.required) return true
    return config.visibleBlocks.includes(key)
  })

  return (
    <div className="flex flex-col w-full gap-2 px-1 py-2">
      {/* Body blocks — header/footer live in the page margin bands (owned by CanvasPage) */}
      {blocksToRender.map((key) => {
        const BlockComponent = resolvedRegistry[key]
        if (!BlockComponent) return null
        const blockProps: BlockRenderProps = {
          sessionId,
          fieldValues,
          data: data[key],
        }
        return <BlockComponent key={key} {...blockProps} />
      })}
    </div>
  )
}
