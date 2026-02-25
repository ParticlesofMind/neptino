import { useCallback, useState } from "react"

export type CourseSectionSaveStatus = "empty" | "saving" | "saved" | "error"

export function useCourseSectionSave() {
  const [saveStatus, setSaveStatus] = useState<CourseSectionSaveStatus>("empty")
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)

  const markEmpty = useCallback(() => {
    setSaveStatus("empty")
  }, [])

  const markSaving = useCallback(() => {
    setSaveStatus("saving")
  }, [])

  const markError = useCallback(() => {
    setSaveStatus("error")
  }, [])

  const markSaved = useCallback(() => {
    setLastSavedAt(new Date().toISOString())
    setSaveStatus("saved")
  }, [])

  const runWithSaveState = useCallback(async (saveOp: () => Promise<boolean>) => {
    markSaving()
    try {
      const ok = await saveOp()
      if (ok) {
        markSaved()
      } else {
        markError()
      }
      return ok
    } catch {
      markError()
      return false
    }
  }, [markError, markSaved, markSaving])

  return {
    saveStatus,
    lastSavedAt,
    markEmpty,
    markSaving,
    markError,
    markSaved,
    runWithSaveState,
  }
}
