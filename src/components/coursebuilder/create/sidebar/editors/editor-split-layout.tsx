"use client"

import type { ReactNode } from "react"

interface EditorSplitLayoutProps {
  sidebar: ReactNode
  preview: ReactNode
  sidebarTitle?: string
  sidebarDescription?: string
  previewTitle?: string
  previewDescription?: string
  sidebarWidthClassName?: string
  previewClassName?: string
  sidebarContentClassName?: string
  previewContentClassName?: string
}

export function EditorSplitLayout({
  sidebar,
  preview,
  sidebarTitle,
  sidebarDescription,
  previewTitle,
  previewDescription,
  sidebarWidthClassName = "md:w-[29rem] md:flex-none xl:w-[31rem]",
  previewClassName = "bg-[#f5f7fb]",
  sidebarContentClassName,
  previewContentClassName,
}: EditorSplitLayoutProps) {
  return (
    <div className="make-editor-split-layout flex h-full min-h-0 w-full flex-col overflow-hidden bg-white md:flex-row">
      <div className={["make-editor-split-sidebar flex w-full shrink-0 flex-col border-b border-neutral-100 md:min-h-0 md:border-b-0 md:border-r md:border-neutral-200", sidebarWidthClassName].join(" ")}>
        {(sidebarTitle || sidebarDescription) && (
          <div className="shrink-0 border-b border-neutral-100 px-4 py-3">
            {sidebarTitle && <p className="text-[13px] font-semibold text-neutral-900">{sidebarTitle}</p>}
            {sidebarDescription && <p className="mt-1 text-[10px] text-neutral-500">{sidebarDescription}</p>}
          </div>
        )}
        <div className={["min-h-0 flex-1 overflow-y-auto bg-white", sidebarContentClassName].filter(Boolean).join(" ")}>
          {sidebar}
        </div>
      </div>

      <div className={["min-h-0 min-w-0 w-full md:flex-1", previewClassName].join(" ")}>
        <div className="flex h-full min-h-0 flex-col">
          {(previewTitle || previewDescription) && (
            <div className="shrink-0 border-b border-neutral-200 bg-white/80 px-5 py-4 backdrop-blur-sm">
              {previewTitle && <p className="text-[13px] font-semibold text-neutral-900">{previewTitle}</p>}
              {previewDescription && <p className="mt-1 text-[10px] text-neutral-500">{previewDescription}</p>}
            </div>
          )}
          <div className={["min-h-0 flex-1", previewContentClassName].filter(Boolean).join(" ")}>
            {preview}
          </div>
        </div>
      </div>
    </div>
  )
}
