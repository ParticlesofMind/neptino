import type { DroppedCard } from "../../types"

function slugPart(value: unknown): string | null {
  if (typeof value !== "string") return null
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")

  return slug.length > 0 ? slug : null
}

export function resolveWhiteboardPersistenceKey(card: DroppedCard): string {
  const explicitKey = slugPart(card.content.boardKey)
  const scopedKey = [
    slugPart(card.taskId),
    slugPart(card.cardId),
    slugPart(card.id),
  ].filter(Boolean).join(":")

  return ["coursebuilder", "whiteboard", explicitKey, scopedKey].filter(Boolean).join(":")
}

export function getWhiteboardHeight(card: DroppedCard, readOnly: boolean): number {
  const rawHeight = Number(card.dimensions.height)
  const fallback = readOnly ? 340 : 420
  return Math.max(280, Math.min(620, Number.isFinite(rawHeight) && rawHeight > 0 ? rawHeight : fallback))
}
