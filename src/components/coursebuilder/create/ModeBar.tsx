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

        {/* Nachschlagewerk trigger — right-aligned */}
        <div className="ml-auto">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            title="Open Nachschlagewerk (course reference)"
            className="flex items-center gap-1.5 rounded px-2 py-1 text-[11px] font-semibold text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
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
