/**
 * EntityRefMark — TipTap Mark extension for inline entity references
 *
 * Lets teachers annotate a span of prose text with an Atlas Layer 1 entity.
 * The annotation is structurally inert at the card level (no onEntityChange handler).
 * It is stored as HTML attributes on a <span> and surfaces an Atlas
 * entry when the student taps the annotated word in the delivered lesson.
 *
 * Storage: Serialised as HTML inside the card's rich-text content field.
 * Rendered as: <span class="entity-ref" data-entity-id="..." data-entity-type="...">
 */

import { Mark, mergeAttributes } from "@tiptap/core"
import type { EntityType, EntitySubType } from "@/types/atlas"

export interface EntityRefAttrs {
  entityId: string
  entityTitle: string
  entityType: EntityType
  entitySubType?: EntitySubType | null
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    entityRef: {
      /** Annotate the current selection with an Atlas entity reference. */
      setEntityRef: (attrs: EntityRefAttrs) => ReturnType
      /** Remove the entity reference mark from the current selection. */
      unsetEntityRef: () => ReturnType
    }
  }
}

export const EntityRefMark = Mark.create({
  name: "entityRef",

  // Non-inclusive: typing at the edge of an annotation does not extend it.
  inclusive: false,

  addAttributes() {
    return {
      entityId:      { default: null, parseHTML: (el) => el.getAttribute("data-entity-id") },
      entityTitle:   { default: null, parseHTML: (el) => el.getAttribute("data-entity-title") },
      entityType:    { default: null, parseHTML: (el) => el.getAttribute("data-entity-type") },
      entitySubType: { default: null, parseHTML: (el) => el.getAttribute("data-entity-sub-type") },
    }
  },

  parseHTML() {
    return [{ tag: "span[data-entity-id]" }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(
        {
          class:                  "entity-ref",
          "data-entity-id":       HTMLAttributes.entityId,
          "data-entity-title":    HTMLAttributes.entityTitle,
          "data-entity-type":     HTMLAttributes.entityType,
          "data-entity-sub-type": HTMLAttributes.entitySubType ?? undefined,
        },
      ),
      0,
    ]
  },

  addCommands() {
    return {
      setEntityRef: (attrs: EntityRefAttrs) => ({ commands }) =>
        commands.setMark(this.name, attrs),

      unsetEntityRef: () => ({ commands }) =>
        commands.unsetMark(this.name),
    }
  },
})
