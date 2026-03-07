"use client"

import type { BlockRenderProps } from "../types"

export function FooterBlock({ fieldValues, fieldEnabled }: BlockRenderProps) {
  const fe = fieldEnabled?.footer

  const showCourseName  = fe ? (fe["course_name"]  ?? false) : true
  const showModuleName  = fe ? (fe["module_name"]  ?? false) : true
  const showPageNumber  = fe ? (fe["page_number"]  ?? true)  : true

  const sessionTitle = fieldValues.session_title || fieldValues.course_name || ""
  const courseName   = showCourseName ? (fieldValues.course_name || "") : ""
  const moduleName   = showModuleName ? (fieldValues.module_name || "")  : ""
  const pageNumber   = showPageNumber ? (fieldValues.page_number || "1") : ""

  // Left side: session title is always shown; course name and module name are optional
  const leftText = [sessionTitle, courseName !== sessionTitle ? courseName : "", moduleName]
    .filter(Boolean)
    .join(" \u00b7 ")

  return (
    <footer className="flex h-full items-center justify-between px-4 border-t border-border text-[10px] text-muted-foreground">
      <span>{leftText}</span>
      {pageNumber ? <span>{pageNumber}</span> : null}
    </footer>
  )
}
