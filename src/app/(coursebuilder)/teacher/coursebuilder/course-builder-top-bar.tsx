import Link from "next/link"
import { ArrowLeft, ArrowRight } from "lucide-react"
import type { View } from "@/components/coursebuilder/builder-types"
import { VIEW_LABELS, getPrevView, getNextView } from "./page-section-registry"

interface CourseBuilderTopBarProps {
  view: View
  setView: (v: View) => void
}

export function CourseBuilderTopBar({ view, setView }: CourseBuilderTopBarProps) {
  const prevView = getPrevView(view)
  const nextView = getNextView(view)

  // single-row top-level navigation; create sub-modes render in the editor body
  return (
    <div className="flex h-9 items-center justify-between border-b border-border px-3 shrink-0 gap-4">
      {/* Left: back/previous */}
      <div className="flex items-center gap-4">
        {prevView === null ? (
          <Link
            href="/teacher/courses"
            className="flex items-center gap-1.5 bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Courses
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setView(prevView)}
            className="flex items-center gap-1.5 bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {VIEW_LABELS[prevView]}
          </button>
        )}
      </div>

      {/* Center: logo */}
      <div className="flex flex-1 items-center justify-center">
        <img src="/octopus-logo.png" alt="Neptino" className="h-6 w-6" />
      </div>

      {/* Right: next step */}
      <div className="flex items-center gap-4">
        {nextView !== null ? (
          <button
            type="button"
            onClick={() => setView(nextView)}
            className="flex items-center gap-1.5 bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:text-primary transition"
          >
            {VIEW_LABELS[nextView]}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        ) : (
          <Link
            href="/teacher/courses"
            className="flex items-center gap-1.5 bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition"
          >
            Done
          </Link>
        )}
      </div>
    </div>
  )
}
