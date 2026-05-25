import Link from "next/link"
import { AtlasRepositoryWorkbench } from "./atlas-repository-workbench"

export default function TeacherAtlasRepositoryPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Atlas Repository</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Source Review</h1>
        </div>
        <Link
          href="/teacher/atlas"
          className="inline-flex h-9 items-center justify-center rounded-md border border-border px-3 text-sm font-semibold text-foreground hover:border-primary/40 hover:text-primary"
        >
          Atlas
        </Link>
      </div>

      <AtlasRepositoryWorkbench />
    </div>
  )
}
