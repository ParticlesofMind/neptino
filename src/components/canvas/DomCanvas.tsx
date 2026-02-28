'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { CanvasPageConfig, ToolConfig } from './create-view-types'
import { CanvasPage } from './CanvasPage'

export const DEFAULT_PAGE_CONFIG: CanvasPageConfig = {
  widthPx:   794,
  heightPx:  1123,
  pageCount: 1,
  margins:   { top: 96, right: 76, bottom: 96, left: 76 },
}

const PAGE_GAP = 32
const MIN_ZOOM = 10
const MAX_ZOOM = 400

interface DomCanvasProps {
  config?: CanvasPageConfig
  zoom?: number
  onZoomChange?: (pct: number) => void
  activePage?: number
  focusPage?: number | null // Add focusPage
  onActivePageChange?: (page: number) => void
  toolConfig?: ToolConfig
  activeTool?: string
  children?: React.ReactNode | ((pageNumber: number, isActive: boolean) => React.ReactNode)
}

export function DomCanvas({
  config = DEFAULT_PAGE_CONFIG,
  zoom = 100,
  onZoomChange,
  activePage = 1,
  focusPage, // Destructure
  onActivePageChange,
  toolConfig,
  activeTool = 'selection',
  children,
}: DomCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Viewport state
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const panStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)
  const zoomRef = useRef(zoom)
  const lastZoomPointRef = useRef<{ x: number; y: number } | null>(null)

  // Sync zoom ref
  useEffect(() => {
    const prevZoom = zoomRef.current
    if (prevZoom !== zoom) {
      const scale = zoom / 100
      const prevScale = prevZoom / 100

      let cx, cy
      if (lastZoomPointRef.current) {
        cx = lastZoomPointRef.current.x
        cy = lastZoomPointRef.current.y
        lastZoomPointRef.current = null
      } else if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        cx = rect.width / 2
        cy = rect.height / 2
      } else {
        cx = 0
        cy = 0
      }

      setPan(prevPan => ({
        x: cx - (cx - prevPan.x) * (scale / prevScale),
        y: cy - (cy - prevPan.y) * (scale / prevScale)
      }))

      zoomRef.current = zoom
    }
  }, [zoom])

  // Center page 1 on mount
  useEffect(() => {
    if (!containerRef.current) return
    if (pan.x === 0 && pan.y === 0) {
      const { width: cw } = containerRef.current.getBoundingClientRect()
      const px = (cw - config.widthPx * (zoom / 100)) / 2
      const py = 40
      setPan({ x: px, y: py })
    }
  }, [])

  const scale = zoom / 100

  // Handle Focus Page (Jump to page)
  useEffect(() => {
    if (typeof focusPage !== 'number' || !containerRef.current) return

    // Calculate position to center the page
    const pageIndex = Math.min(Math.max(0, focusPage - 1), config.pageCount - 1)
    const pageY = pageIndex * (config.heightPx + PAGE_GAP)

    // We want pageY to be centered
    // ScreenY center = vh / 2
    // transformY = screenY - pageY * scale
    // Wait, transform is applied to content.
    // content Y = pageY
    // We want content Y at screen center? Or top?
    // Let's center it.

    const vh = containerRef.current.clientHeight
    const vw = containerRef.current.clientWidth

    // Center X
    const targetPanX = (vw - config.widthPx * scale) / 2

    // Center Y
    const targetPanY = (vh / 2) - (pageY + config.heightPx / 2) * scale

    setPan({ x: targetPanX, y: targetPanY })

  }, [focusPage, config.heightPx, config.widthPx, config.pageCount, scale])


  // Wheel Handler
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (e.ctrlKey || e.metaKey) {
        // Zoom
        const direction = e.deltaY < 0 ? 1 : -1
        const factor = direction > 0 ? 1.1 : 0.9
        const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(zoomRef.current * factor)))

        if (newZoom !== zoomRef.current) {
          const rect = el.getBoundingClientRect()
          lastZoomPointRef.current = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
          }
          onZoomChange?.(newZoom)
        }
      } else {
        // Pan
        setPan(p => ({
          x: p.x - e.deltaX,
          y: p.y - e.deltaY
        }))
      }
    }

    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [onZoomChange])

  // Pointer Events for Panning
  const handlePointerDown = (e: React.PointerEvent) => {
    if (activeTool === 'grab' || e.button === 1 || (e.button === 0 && e.getModifierState('Space'))) {
      setIsPanning(true)
      panStartRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y }
      e.currentTarget.setPointerCapture(e.pointerId)
      e.preventDefault()
    }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isPanning && panStartRef.current) {
      const dx = e.clientX - panStartRef.current.x
      const dy = e.clientY - panStartRef.current.y
      setPan({
        x: panStartRef.current.panX + dx,
        y: panStartRef.current.panY + dy
      })
    }
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isPanning) {
      setIsPanning(false)
      panStartRef.current = null
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }

  // Determine active page
  useEffect(() => {
    if (isPanning || !containerRef.current) return

    const vh = containerRef.current.clientHeight
    const activationAnchorY = vh * 0.25
    const anchorContentY = (activationAnchorY - pan.y) / scale

    const pageTotalHeight = config.heightPx + PAGE_GAP
    const pageIndex = Math.floor(anchorContentY / pageTotalHeight)
    const boundedIndex = Math.max(0, Math.min(config.pageCount - 1, pageIndex))
    const pageNum = boundedIndex + 1

    if (pageNum !== activePage) {
      onActivePageChange?.(pageNum)
    }
  }, [pan, scale, config.heightPx, config.pageCount, activePage, onActivePageChange, isPanning])

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-muted/30 touch-none select-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        cursor: isPanning ? 'grabbing' : (activeTool === 'grab' ? 'grab' : 'default'),
      }}
    >
      <div
        className="absolute origin-top-left will-change-transform"
        style={{
          transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${scale})`,
        }}
      >
        {Array.from({ length: config.pageCount }).map((_, i) => {
          const pageNum = i + 1
          const isActive = pageNum === activePage
          const pageChildren = typeof children === 'function'
            ? children(pageNum, isActive)
            : (isActive ? children : null)
          return (
            <div
              key={i}
              style={{
                marginBottom: PAGE_GAP,
              }}
            >
              <CanvasPage
                config={config}
                pageNumber={pageNum}
                activeTool={activeTool}
                toolConfig={toolConfig}
                isActive={isActive}
              >
                {pageChildren}
              </CanvasPage>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Derive pixel dimensions from physical size/orientation. Reference width = 794 px. */
export function computePageConfig(
  size:        'a4' | 'us-letter',
  orientation: 'portrait' | 'landscape',
  pageCount    = 1,
  marginsMm    = { top: 25.4, right: 19.05, bottom: 25.4, left: 19.05 },
): CanvasPageConfig {
  const SIZES: Record<string, { w: number; h: number }> = {
    'a4':        { w: 210,   h: 297   },
    'us-letter': { w: 215.9, h: 279.4 },
  }
  const { w: rawW, h: rawH } = SIZES[size] ?? SIZES['a4']
  const wmm      = orientation === 'landscape' ? rawH : rawW
  const hmm      = orientation === 'landscape' ? rawW : rawH
  const pxPerMm  = 794 / wmm

  return {
    widthPx:   794,
    heightPx:  Math.round(hmm * pxPerMm),
    pageCount: Math.max(1, pageCount),
    margins: {
      top:    Math.round(marginsMm.top    * pxPerMm),
      right:  Math.round(marginsMm.right  * pxPerMm),
      bottom: Math.round(marginsMm.bottom * pxPerMm),
      left:   Math.round(marginsMm.left   * pxPerMm),
    },
  }
}
