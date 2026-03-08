import { useCallback, useState } from "react"
import { BookOpen } from "lucide-react"
import { useCreateModeStore, type EditorMode } from "./store/createModeStore"
import { NachschlageDrawer } from "@/components/nachschlagewerk/NachschlageDrawer"
import { useCourseStore } from "./store/courseStore"

export function ModeBar() {
  const mode    = useCreateModeStore((s) => s.mode)
  const setMode = useCreateModeStore((s) => s.setMode)
  const courseId = useCourseStore((s) => s.sessions[0]?.courseId ?? "")

  const [drawerOpen, setDrawerOpen] = useState(false)

  const handleClick = useCallback(
    (m: EditorMode) => () => setMode(m),
    [setMode],
  )

  return (
    <>
      <div className="flex items-end shrink-0 h-9 px-3 border-b border-neutral-200 bg-white gap-1">
        {(["curate", "make", "fix"] as EditorMode[]).map((m) => (
          <button
            key={m}
            onClick={handleClick(m)}
            className={
              `px-3 py-1 text-[11px] font-semibold capitalize transition-colors ${
                mode === m
                  ? "-mb-px rounded-t-md rounded-b-none border border-[#9eb9da] border-b-white bg-[#dbe8f6] text-[#233f5d] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]"
                  : "rounded-md text-neutral-400 hover:text-[#355575] hover:bg-[#edf3fb]"
              }`
            }
          >
            {m}
          </button>
        ))}

        {/* Nachschlagewerk trigger — right-aligned */}
        <div className="ml-auto">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            title="Open Nachschlagewerk (course reference)"
            className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-semibold text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
          >
            <BookOpen size={13} />
            Reference
          </button>
        </div>
      </div>

      <NachschlageDrawer
        courseId={courseId}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </>
  )
}
