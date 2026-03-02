"use client"

import type { BlockRenderProps } from "../types"

export function FooterBlock({ fieldValues }: BlockRenderProps) {
  const title      = fieldValues.course_name  || fieldValues.session_title || ""
  const moduleName = fieldValues.module_name  || ""
  const pageNumber = fieldValues.page_number  || "1"

  const leftText = [title, moduleName].filter(Boolean).join(" \u00b7 ")

  return (
    <footer className="flex h-full items-center justify-between px-4 border-t border-neutral-200 text-[10px] text-neutral-400">
      <span>{leftText}</span>
      <span>{pageNumber}</span>
    </footer>
  )
}
