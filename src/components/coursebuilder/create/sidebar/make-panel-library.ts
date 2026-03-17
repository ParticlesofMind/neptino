import { CARD_TYPE_META } from "../cards/CardTypePreview"
import type { StudioCard } from "../store/makeLibraryStore"
import type { CardType } from "../types"

export interface LibraryCardTypeGroup {
  id: CardType
  label: string
  cards: StudioCard[]
  latestCreatedAt: number
}

export interface LibraryProjectGroup {
  id: string
  title: string
  cards: StudioCard[]
  cardTypeGroups: LibraryCardTypeGroup[]
  isCurrent: boolean
  latestCreatedAt: number
}

function matchesLibrarySearch(card: StudioCard, search: string) {
  if (!search) return true
  const query = search.toLowerCase()
  return [card.title, card.projectTitle, card.cardType].some((value) =>
    String(value ?? "").toLowerCase().includes(query),
  )
}

export function groupStudioCardsByProject(
  cards: StudioCard[],
  search: string,
  currentProjectId?: string,
): LibraryProjectGroup[] {
  const grouped = new Map<string, LibraryProjectGroup>()

  for (const card of cards) {
    if (!matchesLibrarySearch(card, search.trim())) continue

    const projectId = card.projectId?.trim() || "unassigned"
    const projectTitle = card.projectTitle?.trim() || "Unassigned"
    const existing = grouped.get(projectId)

    if (existing) {
      existing.cards.push(card)
      existing.latestCreatedAt = Math.max(existing.latestCreatedAt, card.createdAt)
      continue
    }

    grouped.set(projectId, {
      id: projectId,
      title: projectTitle,
      cards: [card],
      isCurrent: Boolean(currentProjectId) && projectId === currentProjectId,
      latestCreatedAt: card.createdAt,
    })
  }

  return Array.from(grouped.values())
    .map((group) => ({
      ...group,
      cards: [...group.cards].sort((left, right) => right.createdAt - left.createdAt),
      cardTypeGroups: groupCardsByType(group.cards),
    }))
    .sort((left, right) => {
      if (left.isCurrent !== right.isCurrent) return left.isCurrent ? -1 : 1
      if (left.latestCreatedAt !== right.latestCreatedAt) return right.latestCreatedAt - left.latestCreatedAt
      return left.title.localeCompare(right.title)
    })
}

function groupCardsByType(cards: StudioCard[]): LibraryCardTypeGroup[] {
  const grouped = new Map<CardType, LibraryCardTypeGroup>()

  for (const card of cards) {
    const existing = grouped.get(card.cardType)
    if (existing) {
      existing.cards.push(card)
      existing.latestCreatedAt = Math.max(existing.latestCreatedAt, card.createdAt)
      continue
    }

    grouped.set(card.cardType, {
      id: card.cardType,
      label: CARD_TYPE_META[card.cardType].label,
      cards: [card],
      latestCreatedAt: card.createdAt,
    })
  }

  return Array.from(grouped.values())
    .map((group) => ({
      ...group,
      cards: [...group.cards].sort((left, right) => right.createdAt - left.createdAt),
    }))
    .sort((left, right) => {
      if (left.latestCreatedAt !== right.latestCreatedAt) return right.latestCreatedAt - left.latestCreatedAt
      return left.label.localeCompare(right.label)
    })
}