"use client"

import { useEffect } from "react"
import { useCanvasStore } from "../store/canvasStore"

const AUTO_DISMISS_MS = 3500

export function EditorNoticeBanner() {
  const notice = useCanvasStore((s) => s.editorNotice)
  const clearEditorNotice = useCanvasStore((s) => s.clearEditorNotice)

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => clearEditorNotice(), AUTO_DISMISS_MS)
    return () => clearTimeout(timer)
  }, [notice, clearEditorNotice])

  if (!notice) return null

  return (
    <div className="pointer-events-none absolute right-4 top-4 z-40 max-w-[420px] rounded-md border border-amber-300 bg-amber-50 px-3 py-2 shadow-sm">
      <p className="text-xs font-semibold text-amber-900">Placement rejected</p>
      <p className="text-xs text-amber-800">{notice}</p>
    </div>
  )
}
