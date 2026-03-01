"use client"

import type { BlockRenderProps } from "../types"

export function FooterBlock({ fieldValues }: BlockRenderProps) {
  const institution = fieldValues["institution"] ?? ""
  const page        = fieldValues["page_number"] ?? ""
  const total       = fieldValues["total_pages"] ?? ""
  const copyright   = fieldValues["copyright"]   ?? ""

  return (
    <footer className="flex items-center justify-between px-4 py-2 border-t border-neutral-200 text-[10px] text-neutral-400">
      <span>{institution}</span>
      <span>{copyright}</span>
      {(page || total) && (
        <span>
          {page}{total ? ` / ${total}` : ""}
        </span>
      )}
    </footer>
  )
}
