"use client"

import { renderEditor, type EditorShellProps } from "./editor-registry"
import { EditorSurfaceContext, type EditorSurface } from "./editor-surface-context"

type MakeEditorShellProps = EditorShellProps & {
  expandSidebar?: boolean
  surface?: EditorSurface
}

/**
 * EditorShell
 *
 * Routes to the appropriate per-type rich editor component.
 * Each editor receives the full content object and an onChange callback.
 */
export function EditorShell({ cardType, content, onChange, expandSidebar = false, surface = "full" }: MakeEditorShellProps) {
  const editor = renderEditor({ cardType, content, onChange }) ?? (
    <div className="flex h-full items-center justify-center">
      <p className="text-[12px] text-neutral-400">No editor available for this card type.</p>
    </div>
  )

  return (
    <div
      className="make-editor-shell flex h-full min-h-0 flex-col overflow-hidden"
      data-expand-sidebar={expandSidebar}
      data-surface={surface}
    >
      <EditorSurfaceContext.Provider value={surface}>
        {editor}
      </EditorSurfaceContext.Provider>
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
          .make-editor-shell[data-surface="controls"] .make-editor-split-layout {
            display: block;
          }

          .make-editor-shell[data-surface="controls"] .make-editor-split-sidebar {
            width: 100% !important;
            max-width: none !important;
            height: 100%;
            border-right: 0;
          }

          .make-editor-shell[data-surface="controls"] .make-editor-split-layout > div:nth-child(2) {
            display: none;
          }

          .make-editor-shell[data-surface="preview"] .make-editor-split-sidebar {
            display: none;
          }

          .make-editor-shell[data-surface="preview"] .make-editor-split-layout {
            display: block;
          }

          .make-editor-shell[data-surface="preview"] .make-editor-split-layout > div:nth-child(2) {
            width: 100%;
            height: 100%;
          }

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
