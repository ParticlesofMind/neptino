'use client'

import { useEffect, useRef } from 'react'
import { Application, Container, Graphics } from 'pixi.js'

// ── Constants ─────────────────────────────────────────────────────────────────
const PAGE_GAP = 32   // px between pages (world-space)
const MIN_ZOOM = 10   // %
const MAX_ZOOM = 400  // %

// ── Config type ───────────────────────────────────────────────────────────────
export interface CanvasPageConfig {
  widthPx:   number
  heightPx:  number
  pageCount: number
  margins: { top: number; right: number; bottom: number; left: number }
}

export const DEFAULT_PAGE_CONFIG: CanvasPageConfig = {
  widthPx:   794,
  heightPx:  1123,
  pageCount: 1,
  margins:   { top: 96, right: 76, bottom: 96, left: 76 },
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

// ── Component ─────────────────────────────────────────────────────────────────
interface PixiCanvasProps {
  config?:       CanvasPageConfig
  zoom?:         number                 // percentage 10–400
  onZoomChange?: (pct: number) => void
  activeTool?:   string                 // current active tool id
}

const TOOL_CURSORS: Record<string, string> = {
  grab:       'grab',
  selection:  'default',
  pen:        'crosshair',
  brush:      'crosshair',
  text:       'text',
  shapes:     'crosshair',
  tables:     'cell',
  eraser:     'cell',
  generate:   'default',
  // animate tools
  scene:      'default',
  path:       'crosshair',
  modify:     'default',
}

export function PixiCanvas({
  config       = DEFAULT_PAGE_CONFIG,
  zoom         = 100,
  onZoomChange,
  activeTool   = 'selection',
}: PixiCanvasProps) {
  const containerRef  = useRef<HTMLDivElement>(null)
  const appRef        = useRef<Application | null>(null)
  const worldRef      = useRef<Container   | null>(null)
  const zoomPct       = useRef(zoom)
  const onZoomCb      = useRef(onZoomChange)
  const configSnap    = useRef(config)
  const activeToolRef = useRef(activeTool)

  useEffect(() => { onZoomCb.current     = onZoomChange }, [onZoomChange])
  useEffect(() => { configSnap.current   = config        }, [config])
  useEffect(() => { activeToolRef.current = activeTool   }, [activeTool])

  // ── Update canvas cursor when tool changes ─────────────────────────────────
  useEffect(() => {
    const canvas = appRef.current?.canvas
    if (!canvas) return
    canvas.style.cursor = TOOL_CURSORS[activeTool] ?? 'default'
  }, [activeTool])

  // ── Apply zoom changes from toolbar buttons ────────────────────────────────
  useEffect(() => {
    if (zoom === zoomPct.current) return
    const world = worldRef.current
    const app   = appRef.current
    if (!world) { zoomPct.current = zoom; return }

    const oldS = zoomPct.current / 100
    const newS = zoom            / 100
    if (app) {
      const cx = app.screen.width  / 2
      const cy = app.screen.height / 2
      world.x  = cx - (cx - world.x) * (newS / oldS)
      world.y  = cy - (cy - world.y) * (newS / oldS)
    }
    world.scale.set(newS)
    zoomPct.current = zoom
  }, [zoom])

  // ── Redraw pages when config changes ──────────────────────────────────────
  useEffect(() => {
    const world = worldRef.current
    if (!world) return
    world.removeChildren()
    drawPages(world, config)
  }, [config])

  // ── Mount once ────────────────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    let alive = true

    ;(async () => {
      const app = new Application()
      await app.init({
        backgroundAlpha: 0,
        antialias:       true,
        autoDensity:     true,
        resolution:      window.devicePixelRatio || 1,
        resizeTo:        el,
      })
      if (!alive) { app.destroy(); return }

      el.innerHTML = ''
      el.appendChild(app.canvas)
      appRef.current = app

      const world = new Container()
      app.stage.addChild(world)
      worldRef.current = world

      world.scale.set(zoomPct.current / 100)
      drawPages(world, configSnap.current)
      fitWorld(app, world, configSnap.current)

      // ── Panning ────────────────────────────────────────────────────────────
      let panning = false
      let origin  = { px: 0, py: 0, wx: 0, wy: 0 }

      const onDown = (e: PointerEvent) => {
        const tool = activeToolRef.current
        // Allow panning with grab tool, middle-mouse (button 1), or Space+drag
        if (tool !== 'grab' && e.button !== 1) return
        panning = true
        origin  = { px: e.clientX, py: e.clientY, wx: world.x, wy: world.y }
        try { app.canvas.setPointerCapture(e.pointerId) } catch { /* ignore */ }
        app.canvas.style.cursor = 'grabbing'
      }
      const onMove = (e: PointerEvent) => {
        if (!panning) return
        world.x = origin.wx + (e.clientX - origin.px)
        world.y = origin.wy + (e.clientY - origin.py)
      }
      const onUp = (e: PointerEvent) => {
        if (!panning) return
        panning = false
        try { app.canvas.releasePointerCapture(e.pointerId) } catch { /* ignore */ }
        app.canvas.style.cursor = TOOL_CURSORS[activeToolRef.current] ?? 'default'
      }

      // ── Wheel zoom toward cursor ───────────────────────────────────────────
      const onWheel = (e: WheelEvent) => {
        e.preventDefault()
        const factor = e.deltaY < 0 ? 1.1 : 0.9
        const oldPct = zoomPct.current
        const newPct = Math.round(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, oldPct * factor)))
        if (newPct === oldPct) return

        const oldS = oldPct / 100
        const newS = newPct / 100
        const r    = app.canvas.getBoundingClientRect()
        const mx   = e.clientX - r.left
        const my   = e.clientY - r.top

        world.x = mx - (mx - world.x) * (newS / oldS)
        world.y = my - (my - world.y) * (newS / oldS)
        world.scale.set(newS)
        zoomPct.current = newPct
        onZoomCb.current?.(newPct)
      }

      app.canvas.addEventListener('pointerdown',   onDown)
      app.canvas.addEventListener('pointermove',   onMove)
      app.canvas.addEventListener('pointerup',     onUp)
      app.canvas.addEventListener('pointercancel', onUp)
      app.canvas.addEventListener('wheel',         onWheel, { passive: false })
    })()

    return () => {
      alive = false
      if (appRef.current) {
        appRef.current.destroy({ removeView: true })
        appRef.current   = null
        worldRef.current = null
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={containerRef} className="h-full w-full overflow-hidden" />
}

// ── Drawing helpers ───────────────────────────────────────────────────────────

function drawPages(world: Container, cfg: CanvasPageConfig) {
  const { widthPx, heightPx, pageCount, margins } = cfg

  for (let i = 0; i < pageCount; i++) {
    const py = i * (heightPx + PAGE_GAP)

    // Drop shadow (slightly offset rectangle)
    const shadow = new Graphics()
    shadow.rect(4, py + 4, widthPx, heightPx)
    shadow.fill({ color: 0x000000, alpha: 0.07 })
    world.addChild(shadow)

    // White page
    const page = new Graphics()
    page.rect(0, py, widthPx, heightPx)
    page.fill({ color: 0xffffff })
    page.stroke({ color: 0xd1d5db, width: 1 })
    world.addChild(page)

    // Margin guide
    const guide = new Graphics()
    guide.rect(
      margins.left,
      py + margins.top,
      widthPx  - margins.left - margins.right,
      heightPx - margins.top  - margins.bottom,
    )
    guide.stroke({ color: 0x6366f1, width: 1, alpha: 0.35 })
    world.addChild(guide)
  }
}

function fitWorld(app: Application, world: Container, cfg: CanvasPageConfig) {
  const vw     = app.screen.width
  const vh     = app.screen.height
  const totalH = cfg.pageCount * (cfg.heightPx + PAGE_GAP) - PAGE_GAP
  const scale  = Math.min(
    (vw * 0.82) / cfg.widthPx,
    (vh * 0.82) / totalH,
    1.0,
  )
  world.scale.set(scale)
  world.x = (vw - cfg.widthPx * scale) / 2
  world.y = Math.max(24, (vh - totalH * scale) / 2)
}
