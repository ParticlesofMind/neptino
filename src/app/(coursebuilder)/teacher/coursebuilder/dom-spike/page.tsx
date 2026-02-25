import Link from "next/link"
import { DomFirstCanvasSpike } from "@/components/coursebuilder/dom-spike/dom-first-canvas-spike"

export default function DomSpikePage() {
  return (
    <div className="min-h-screen bg-muted/20 p-6">
      <div className="mx-auto mb-4 flex w-full max-w-[1200px] items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Coursebuilder DOM-first Spike</h1>
          <p className="text-sm text-muted-foreground">Isolated prototype using dnd-kit for zone-based drag/drop and chained page overflow.</p>
        </div>
        <Link
          href="/teacher/coursebuilder?view=create"
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground hover:bg-muted"
        >
          Back to Create
        </Link>
      </div>

      <div className="mx-auto w-full max-w-[1200px]">
        <DomFirstCanvasSpike />
      </div>
    </div>
  )
}
