import Link from "next/link"
import type { SearchParams } from "./atlas-page-utils"
import { buildQueryString } from "./atlas-page-utils"

interface Props {
  activePage: number
  totalPages: number
  visiblePages: number[]
  availableCount: number
  displayMode: string
  params: SearchParams
  PAGE_SIZE: number
}

export function AtlasPagination({ activePage, totalPages, visiblePages, availableCount, displayMode, params, PAGE_SIZE }: Props) {
  if (availableCount <= PAGE_SIZE) return null

  return (
    <div className="mt-6 flex flex-wrap items-center gap-2">
      <Link
        href={`/teacher/atlas?${buildQueryString(params, { page: String(Math.max(1, activePage - 1)), display: displayMode })}`}
        className={`rounded-md border border-[var(--atlas-border)] px-3 py-1.5 text-xs text-[var(--atlas-text)] transition-all ${
          activePage <= 1 ? "pointer-events-none opacity-30" : "hover:border-[var(--primary)]/40 hover:bg-[var(--primary)]/5"
        }`}
      >
        Previous
      </Link>

      {visiblePages.map(pageNumber => (
        <Link
          key={pageNumber}
          href={`/teacher/atlas?${buildQueryString(params, { page: String(pageNumber), display: displayMode })}`}
          className={
            pageNumber === activePage
              ? "rounded-md bg-[var(--primary)]/10 border border-[var(--primary)] px-3 py-1.5 text-xs font-medium text-[var(--primary)]"
              : "rounded-md border border-[var(--atlas-border)] px-3 py-1.5 text-xs text-[var(--atlas-text)] transition-all hover:border-[var(--primary)]/40 hover:bg-[var(--primary)]/5"
          }
        >
          {pageNumber}
        </Link>
      ))}

      <Link
        href={`/teacher/atlas?${buildQueryString(params, { page: String(Math.min(totalPages, activePage + 1)), display: displayMode })}`}
        className={`rounded-md border border-[var(--atlas-border)] px-3 py-1.5 text-xs text-[var(--atlas-text)] transition-all ${
          activePage >= totalPages ? "pointer-events-none opacity-30" : "hover:border-[var(--primary)]/40 hover:bg-[var(--primary)]/5"
        }`}
      >
        Next
      </Link>
    </div>
  )
}
