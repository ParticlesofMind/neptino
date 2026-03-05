import { useCallback } from "react"
import { useCreateModeStore, type EditorMode } from "./store/createModeStore"

export function ModeBar() {
  const mode = useCreateModeStore((s) => s.mode)
  const setMode = useCreateModeStore((s) => s.setMode)

  const handleClick = useCallback(
    (m: EditorMode) => () => setMode(m),
    [setMode],
  )

  return (
    <div className="flex items-center shrink-0 h-9 px-3 border-b border-neutral-200 bg-white gap-1">
      {(["curate", "make", "fix"] as EditorMode[]).map((m) => (
        <button
          key={m}
          onClick={handleClick(m)}
          className={
            `px-3 py-1 rounded text-[11px] font-semibold capitalize transition-colors ${
              mode === m
                ? "bg-neutral-900 text-white"
                : "text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
            }`
          }
        >
          {m}
        </button>
      ))}
    </div>
  )
}
