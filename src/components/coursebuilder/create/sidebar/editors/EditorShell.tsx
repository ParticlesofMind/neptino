"use client"

import { renderEditor, type EditorShellProps } from "./editor-registry"

type MakeEditorShellProps = EditorShellProps & {
  expandSidebar?: boolean
}

/**
 * EditorShell
 *
 * Routes to the appropriate per-type rich editor component.
 * Each editor receives the full content object and an onChange callback.
 */
export function EditorShell({ cardType, content, onChange, expandSidebar = false }: MakeEditorShellProps) {
  const editor = renderEditor({ cardType, content, onChange }) ?? (
    <div className="flex h-full items-center justify-center">
      <p className="text-[12px] text-neutral-400">No editor available for this block type.</p>
    </div>
  )

  return (
    <div className="make-editor-shell flex h-full min-h-0 flex-col overflow-hidden" data-expand-sidebar={expandSidebar}>
      {editor}
      <style>{`
        .make-editor-shell input:not([type="range"]):not([type="checkbox"]):not([type="radio"]),
        .make-editor-shell select {
          min-height: 2.5rem;
        }

        .make-editor-shell textarea {
          padding-top: 0.625rem;
          padding-bottom: 0.625rem;
        }

        @media (min-width: 768px) {
          .make-editor-shell[data-expand-sidebar="true"] .make-editor-split-sidebar {
            width: min(36rem, 42vw) !important;
            flex-basis: min(36rem, 42vw) !important;
          }
        }

        @media (min-width: 1280px) {
          .make-editor-shell[data-expand-sidebar="true"] .make-editor-split-sidebar {
            width: min(40rem, 44vw) !important;
            flex-basis: min(40rem, 44vw) !important;
          }
        }
      `}</style>
    </div>
  )
}
