import { useCallback } from "react"
import { useCreateModeStore, type EditorMode } from "./store/createModeStore"

export function ModeBar() {
  const mode    = useCreateModeStore((s) => s.mode)
  const setMode = useCreateModeStore((s) => s.setMode)

  const handleClick = useCallback(
    (m: EditorMode) => () => setMode(m),
    [setMode],
  )

  return (
    <div className="flex items-center justify-center shrink-0 h-9 px-3 border-b border-neutral-200 bg-white gap-1">
      {(["curate", "make", "fix"] as EditorMode[]).map((m) => (
        <button
          key={m}
          onClick={handleClick(m)}
          className={
            `px-3 py-1 text-[11px] font-semibold capitalize transition-colors ${
              mode === m
                ? "rounded-md border border-[#9eb9da] bg-[#dbe8f6] text-[#233f5d] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]"
                : "rounded-md text-neutral-400 hover:text-[#355575] hover:bg-[#edf3fb]"
            }`
          }
        >
          {m}
        </button>
      ))}
    </div>
  )
}
