"use client"

/**
 * Canvas Page
 *
 * A single fixed-size page (A4 or custom dimensions) rendered using the
 * TemplateRenderer. The CanvasVirtualizer mounts/unmounts instances based
 * on scroll position — only the 2-3 visible pages are in the DOM at any time.
 *
 * Overflow detection is handled via the `useCanvasOverflow` hook; when the body
 * content exceeds the available height a new canvas page is appended.
 */

import { useRef } from "react"
import type {
  CanvasPage as CanvasPageModel,
  CourseSession,
  PageDimensions,
  SessionId,
} from "../types"
import { DEFAULT_PAGE_DIMENSIONS } from "../types"
import { BlockRenderer } from "../renderer/BlockRenderer"
import { HeaderBlock } from "../blocks/Header"
import { FooterBlock } from "../blocks/Footer"
import { useCanvasOverflow } from "../hooks/useCanvasOverflow"
import { useCanvasStore } from "../store/canvasStore"

// ─── Props ────────────────────────────────────────────────────────────────────

interface CanvasNewPageProps {
  page:         CanvasPageModel
  session:      CourseSession
  isLastPage:   boolean
  dims?:        PageDimensions
  /** Field values for header / footer rendering */
  fieldValues:  Record<string, string>
  /** Body data keyed by block key */
  bodyData?:    Record<string, Record<string, unknown>>
  /** 0-based virtual index — used only for aria labels */
  virtualIndex: number
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CanvasPage({
  page,
  session,
  isLastPage,
  dims = DEFAULT_PAGE_DIMENSIONS,
  fieldValues,
  bodyData = {},
  virtualIndex,
}: CanvasNewPageProps) {
  const bodyRef    = useRef<HTMLDivElement>(null)
  const contentRef  = useRef<HTMLDivElement>(null)
  const zoomLevel   = useCanvasStore((s) => s.zoomLevel)
  const activeCanvasId = useCanvasStore((s) => s.activeCanvasId)
  const setActiveCanvas = useCanvasStore((s) => s.setActiveCanvas)

  const scale = zoomLevel / 100

  // Overflow detection: detects when body content exceeds the available height
  // and automatically splits the topic list, trimming this page and appending
  // a continuation canvas page for the remaining topics.
  const isOverflowing = useCanvasOverflow({
    canvasId:   page.id,
    sessionId:  page.sessionId,
    bodyRef:    bodyRef    as React.RefObject<HTMLElement | null>,
    contentRef: contentRef as React.RefObject<HTMLElement | null>,
  })

  const isActive = activeCanvasId === page.id

  return (
    <div
      role="region"
      aria-label={`Page ${virtualIndex + 1}`}
      onClick={() => setActiveCanvas(page.id)}
      style={{
        width:     dims.widthPx,
        height:    dims.heightPx,
        overflow:  "hidden",
        transform: `scale(${scale})`,
        transformOrigin: "top center",
        // Compensate margin collapse under scale so the virtualizer rows stay accurate
        marginBottom: dims.heightPx * (scale - 1),
      }}
      className={[
        "relative bg-white shadow-md select-none",
        "ring-1",
        isActive ? "ring-blue-400" : "ring-neutral-200",
        isOverflowing ? "ring-amber-400" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Top margin band — Header metadata */}
      <div
        style={{ height: dims.margins.top }}
        className="absolute inset-x-0 top-0 overflow-hidden"
      >
        <HeaderBlock
          sessionId={session.id as SessionId}
          fieldValues={fieldValues}
        />
      </div>

      {/* Body — content area between margins */}
      <div
        ref={bodyRef}
        style={{
          position: "absolute",
          top:    dims.margins.top,
          right:  dims.margins.right,
          bottom: dims.margins.bottom,
          left:   dims.margins.left,
          overflow: "hidden",
        }}
      >
        <div ref={contentRef} className="w-full">
          <BlockRenderer
            sessionId={session.id as SessionId}
            canvasId={page.id}
            fieldValues={fieldValues}
            data={bodyData}
            blockKeys={page.blockKeys}
          />
        </div>
      </div>

      {/* Bottom margin band — Footer metadata */}
      <div
        style={{ height: dims.margins.bottom }}
        className="absolute inset-x-0 bottom-0 overflow-hidden"
      >
        <FooterBlock
          sessionId={session.id as SessionId}
          fieldValues={fieldValues}
        />
      </div>

    </div>
  )
}
