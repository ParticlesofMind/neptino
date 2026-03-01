import Link from "next/link"
import { ArrowLeft, ArrowRight, Rocket } from "lucide-react"
import type { View } from "@/components/coursebuilder/builder-types"
import { VIEW_LABELS, getPrevView, getNextView } from "./page-section-registry"

interface CourseBuilderTopBarProps {
  view: View
  setView: (v: View) => void
}

export function CourseBuilderTopBar({ view, setView }: CourseBuilderTopBarProps) {
  const prevView = getPrevView(view)
  const nextView = getNextView(view)

  return (
    <div className="flex h-12 items-center justify-between border-b border-border px-4 shrink-0 gap-4">
      {/* Left: back / previous step */}
      <div className="flex items-center min-w-[110px]">
        {prevView === null ? (
          <Link
            href="/teacher/courses"
            className="flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Courses
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setView(prevView)}
            className="flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition"
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
      <div className="flex items-center justify-end min-w-[110px]">
        {nextView !== null ? (
          <button
            type="button"
            onClick={() => setView(nextView)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
              nextView === "launch"
                ? "bg-primary text-primary-foreground hover:opacity-90"
                : "border border-border bg-background text-foreground hover:border-primary/30 hover:text-primary"
            }`}
          >
            {VIEW_LABELS[nextView]}
            {nextView === "launch"
              ? <Rocket className="h-3.5 w-3.5" />
              : <ArrowRight className="h-3.5 w-3.5" />}
          </button>
        ) : (
          <Link
            href="/teacher/courses"
            className="flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition"
          >
            Done
          </Link>
        )}
      </div>
    </div>
  )
}
