import { useCallback, useState } from "react"

type UseStringListInputOptions = {
  maxItems: number
  maxDraftLength: number
  initialItems?: string[]
}

export function useStringListInput({
  maxItems,
  maxDraftLength,
  initialItems = [],
}: UseStringListInputOptions) {
  const [items, setItems] = useState<string[]>(initialItems)
  const [draft, setDraft] = useState("")

  const canAdd = items.length < maxItems && draft.trim().length > 0

  const updateDraft = useCallback((next: string) => {
    setDraft(next.slice(0, maxDraftLength))
  }, [maxDraftLength])

  const removeAt = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index))
  }, [])

  const addDraft = useCallback(() => {
    setItems((prev) => {
      if (prev.length >= maxItems) return prev
      const value = draft.trim()
      if (!value) return prev
      return [...prev, value]
    })
    setDraft("")
  }, [draft, maxItems])

  const onDraftKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return
    if (!canAdd) return
    event.preventDefault()
    addDraft()
  }, [addDraft, canAdd])

  return {
    items,
    setItems,
    draft,
    updateDraft,
    canAdd,
    addDraft,
    removeAt,
    onDraftKeyDown,
  }
}
