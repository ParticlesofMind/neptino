'use client'

import { useEffect, useRef } from 'react'
import { Application, Container, Graphics, Text as PixiText } from 'pixi.js'

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

export interface CanvasViewportInfo {
  pageRect:    { x: number; y: number; width: number; height: number }
  contentRect: { x: number; y: number; width: number; height: number }
  scale:   number
  zoomPct: number
}

/** All current tool settings — passed down from the toolbar */
export interface ToolConfig {
  brushSize:        number
  brushColor:       string
  penSize:          number
  penColor:         string
  penFill:          string
  fontSize:         string
  fontFamily:       string
  fontBold:         boolean
  fontItalic:       boolean
  textColor:        string
  shapeType:        string
  shapeStrokeWidth: number
  shapeStrokeColor: string
  shapeFillColor:   string
  eraserSize:       number
  tableRows:        number
  tableCols:        number
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
  config?:           CanvasPageConfig
  zoom?:             number
  onZoomChange?:     (pct: number) => void
  activeTool?:       string
  toolConfig?:       ToolConfig
  onViewportChange?: (info: CanvasViewportInfo) => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function cssToNum(color: string): number {
  if (!color || color === 'transparent' || color === 'none') return 0x000000
  const hex = color.replace('#', '')
  return parseInt(
    hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex,
    16,
  )
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
  toolConfig,
  onViewportChange,
}: PixiCanvasProps) {
  const containerRef   = useRef<HTMLDivElement>(null)
  const appRef         = useRef<Application | null>(null)
  const worldRef       = useRef<Container   | null>(null)
  const drawLayerRef   = useRef<Container   | null>(null)
  const zoomPct        = useRef(zoom)
  const onZoomCb       = useRef(onZoomChange)
  const onViewportCb   = useRef(onViewportChange)
  const configSnap     = useRef(config)
  const activeToolRef  = useRef(activeTool)
  const toolConfigRef  = useRef(toolConfig)

  useEffect(() => { onZoomCb.current      = onZoomChange     }, [onZoomChange])
  useEffect(() => { onViewportCb.current  = onViewportChange }, [onViewportChange])
  useEffect(() => { configSnap.current    = config           }, [config])
  useEffect(() => { activeToolRef.current = activeTool       }, [activeTool])
  useEffect(() => { toolConfigRef.current = toolConfig       }, [toolConfig])

  const emitViewport = (world: Container, cfg: CanvasPageConfig) => {
    const scale = world.scale.x
    const pageRect = {
      x: world.x,
      y: world.y,
      width: cfg.widthPx * scale,
      height: cfg.heightPx * scale,
    }
    const contentRect = {
      x: world.x + cfg.margins.left * scale,
      y: world.y + cfg.margins.top * scale,
      width: (cfg.widthPx - cfg.margins.left - cfg.margins.right) * scale,
      height: (cfg.heightPx - cfg.margins.top - cfg.margins.bottom) * scale,
    }
    onViewportCb.current?.({
      pageRect,
      contentRect,
      scale,
      zoomPct: zoomPct.current,
    })
  }

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
    emitViewport(world, configSnap.current)
  }, [zoom])

  // ── Redraw pages when config changes (preserve drawing layer) ──────────────
  useEffect(() => {
    const world     = worldRef.current
    const drawLayer = drawLayerRef.current
    if (!world) return
    world.removeChildren()
    drawPages(world, config)
    if (drawLayer) world.addChild(drawLayer) // re-attach above pages
    emitViewport(world, config)
  }, [config]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Mount once ────────────────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    let alive = true
    let textOverlay: HTMLDivElement | null = null

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
      el.style.position = 'relative'
      el.appendChild(app.canvas)
      appRef.current = app

      const world = new Container()
      app.stage.addChild(world)
      worldRef.current = world
      world.scale.set(zoomPct.current / 100)

      drawPages(world, configSnap.current)

      // Drawing layer — above pages, receives all user content
      const drawLayer = new Container()
      world.addChild(drawLayer)
      drawLayerRef.current = drawLayer

      fitWorld(app, world, configSnap.current)
      emitViewport(world, configSnap.current)

      // ── Drawing state ──────────────────────────────────────────────────────
      let isPanning    = false
      let isDrawing    = false
      let panOrigin    = { px: 0, py: 0, wx: 0, wy: 0 }
      let activeGfx:  Graphics  | null = null
      let drawPath:   { x: number; y: number }[] = []
      let shapeStart  = { x: 0, y: 0 }
      let selectedObj: Container | null = null
      let prevWP       = { x: 0, y: 0 }

      // Client coords → world space
      const toWorld = (cx: number, cy: number) => {
        const r = app.canvas.getBoundingClientRect()
        return { x: (cx - r.left - world.x) / world.scale.x, y: (cy - r.top - world.y) / world.scale.y }
      }
      // Client coords → canvas-relative px (for getBounds() hit tests)
      const toCanvas = (cx: number, cy: number) => {
        const r = app.canvas.getBoundingClientRect()
        return { x: cx - r.left, y: cy - r.top }
      }

      // ── Drawing helpers ────────────────────────────────────────────────────
      function strokePath(gfx: Graphics, path: { x: number; y: number }[], color: number, width: number) {
        gfx.clear()
        if (path.length < 2) return
        gfx.moveTo(path[0].x, path[0].y)
        for (let i = 1; i < path.length; i++) gfx.lineTo(path[i].x, path[i].y)
        gfx.stroke({ color, width, cap: 'round', join: 'round' })
      }

      function applyShape(gfx: Graphics, start: { x: number; y: number }, end: { x: number; y: number }) {
        const cfg = toolConfigRef.current
        if (!cfg) return
        gfx.clear()
        const sw = cfg.shapeStrokeWidth
        const sc = cssToNum(cfg.shapeStrokeColor)
        const hasFill = cfg.shapeFillColor !== 'transparent'
        const fc = hasFill ? cssToNum(cfg.shapeFillColor) : 0
        const dx = end.x - start.x
        const dy = end.y - start.y
        switch (cfg.shapeType) {
          case 'ellipse': {
            const cx2 = start.x + dx / 2, cy2 = start.y + dy / 2
            const rx = Math.abs(dx) / 2, ry = Math.abs(dy) / 2
            if (hasFill) { gfx.ellipse(cx2, cy2, rx, ry); gfx.fill({ color: fc }) }
            gfx.ellipse(cx2, cy2, rx, ry); gfx.stroke({ color: sc, width: sw })
            break
          }
          case 'line':
            gfx.moveTo(start.x, start.y); gfx.lineTo(end.x, end.y)
            gfx.stroke({ color: sc, width: sw })
            break
          case 'triangle': {
            const mx2 = start.x + dx / 2
            if (hasFill) {
              gfx.moveTo(mx2, start.y); gfx.lineTo(end.x, end.y)
              gfx.lineTo(start.x, end.y); gfx.closePath(); gfx.fill({ color: fc })
            }
            gfx.moveTo(mx2, start.y); gfx.lineTo(end.x, end.y)
            gfx.lineTo(start.x, end.y); gfx.closePath(); gfx.stroke({ color: sc, width: sw })
            break
          }
          default: // rectangle
            if (hasFill) { gfx.rect(start.x, start.y, dx, dy); gfx.fill({ color: fc }) }
            gfx.rect(start.x, start.y, dx, dy); gfx.stroke({ color: sc, width: sw })
        }
      }

      function applyTable(gfx: Graphics, start: { x: number; y: number }, end: { x: number; y: number }) {
        const cfg  = toolConfigRef.current
        const rows = cfg?.tableRows ?? 3
        const cols = cfg?.tableCols ?? 3
        gfx.clear()
        const w = end.x - start.x, h = end.y - start.y
        gfx.rect(start.x, start.y, w, h); gfx.stroke({ color: 0x000000, width: 1 })
        for (let r = 1; r < rows; r++) {
          const y = start.y + (h * r) / rows
          gfx.moveTo(start.x, y); gfx.lineTo(start.x + w, y)
        }
        if (rows > 1) gfx.stroke({ color: 0x000000, width: 1 })
        for (let c = 1; c < cols; c++) {
          const x = start.x + (w * c) / cols
          gfx.moveTo(x, start.y); gfx.lineTo(x, start.y + h)
        }
        if (cols > 1) gfx.stroke({ color: 0x000000, width: 1 })
      }

      function eraseAt(cp: { x: number; y: number }) {
        const r = (toolConfigRef.current?.eraserSize ?? 20) / 2
        const toRemove: Container[] = []
        for (const child of drawLayer.children) {
          const b = child.getBounds()
          if (cp.x >= b.x - r && cp.x <= b.x + b.width + r && cp.y >= b.y - r && cp.y <= b.y + b.height + r)
            toRemove.push(child)
        }
        toRemove.forEach(c => drawLayer.removeChild(c))
      }

      function findAt(cp: { x: number; y: number }): Container | null {
        for (let i = drawLayer.children.length - 1; i >= 0; i--) {
          const child = drawLayer.children[i]
          const b = child.getBounds()
          if (cp.x >= b.x && cp.x <= b.x + b.width && cp.y >= b.y && cp.y <= b.y + b.height)
            return child
        }
        return null
      }

      function placeTextOverlay(cp: { x: number; y: number }, wp: { x: number; y: number }) {
        if (textOverlay) { textOverlay.remove(); textOverlay = null }
        const cfg = toolConfigRef.current
        const div = document.createElement('div')
        div.contentEditable = 'true'
        div.setAttribute('aria-label', 'Text input')
        Object.assign(div.style, {
          position: 'absolute', left: `${cp.x}px`, top: `${cp.y}px`,
          minWidth: '100px', minHeight: '1.4em', padding: '2px 4px',
          border: '1.5px dashed #6366f1', background: 'rgba(255,255,255,0.97)',
          fontSize:   `${cfg?.fontSize ?? '16'}px`,
          fontFamily: cfg?.fontFamily ?? 'Arial',
          fontWeight: cfg?.fontBold   ? 'bold'   : 'normal',
          fontStyle:  cfg?.fontItalic ? 'italic' : 'normal',
          color:      cfg?.textColor  ?? '#000000',
          outline: 'none', cursor: 'text', zIndex: '50', whiteSpace: 'pre',
        })
        el?.appendChild(div)
        textOverlay = div
        setTimeout(() => div.focus(), 0)

        const commit = () => {
          const text = div.textContent?.trim() ?? ''
          div.remove(); textOverlay = null
          if (!text) return
          const c = toolConfigRef.current
          const t = new PixiText({
            text,
            style: {
              fontSize:   parseInt(c?.fontSize ?? '16', 10),
              fontFamily: c?.fontFamily ?? 'Arial',
              fontWeight: c?.fontBold   ? 'bold'   : 'normal',
              fontStyle:  c?.fontItalic ? 'italic' : 'normal',
              fill:       cssToNum(c?.textColor ?? '#000000'),
            },
          })
          t.x = wp.x; t.y = wp.y
          drawLayer.addChild(t)
        }
        div.addEventListener('blur', commit, { once: true })
        div.addEventListener('keydown', (ev) => {
          if (ev.key === 'Escape')                     { div.remove(); textOverlay = null }
          else if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); commit() }
        })
      }

      // ── Pointer down ───────────────────────────────────────────────────────
      const onDown = (e: PointerEvent) => {
        const tool = activeToolRef.current
        if (tool === 'grab' || e.button === 1) {
          isPanning = true
          panOrigin = { px: e.clientX, py: e.clientY, wx: world.x, wy: world.y }
          try { app.canvas.setPointerCapture(e.pointerId) } catch { /* noop */ }
          app.canvas.style.cursor = 'grabbing'
          return
        }
        if (e.button !== 0) return
        const wp = toWorld(e.clientX, e.clientY)
        prevWP = wp
        if (tool === 'brush' || tool === 'pen') {
          isDrawing = true; drawPath = [wp]
          activeGfx = new Graphics(); drawLayer.addChild(activeGfx)
          try { app.canvas.setPointerCapture(e.pointerId) } catch { /* noop */ }
          return
        }
        if (tool === 'shapes' || tool === 'tables') {
          isDrawing = true; shapeStart = wp
          activeGfx = new Graphics(); drawLayer.addChild(activeGfx)
          try { app.canvas.setPointerCapture(e.pointerId) } catch { /* noop */ }
          return
        }
        if (tool === 'eraser') {
          isDrawing = true; eraseAt(toCanvas(e.clientX, e.clientY))
          try { app.canvas.setPointerCapture(e.pointerId) } catch { /* noop */ }
          return
        }
        if (tool === 'text') {
          placeTextOverlay(toCanvas(e.clientX, e.clientY), wp); return
        }
        if (tool === 'selection') {
          const hit = findAt(toCanvas(e.clientX, e.clientY))
          if (hit) {
            selectedObj = hit; isDrawing = true; prevWP = wp
            try { app.canvas.setPointerCapture(e.pointerId) } catch { /* noop */ }
          }
          return
        }
      }

      // ── Pointer move ───────────────────────────────────────────────────────
      const onMove = (e: PointerEvent) => {
        if (isPanning) {
          world.x = panOrigin.wx + (e.clientX - panOrigin.px)
          world.y = panOrigin.wy + (e.clientY - panOrigin.py)
          emitViewport(world, configSnap.current)
          return
        }
        if (!isDrawing || !(e.buttons & 1)) return
        const tool = activeToolRef.current
        const cfg  = toolConfigRef.current
        const wp   = toWorld(e.clientX, e.clientY)
        if (tool === 'brush' && activeGfx) {
          drawPath.push(wp)
          strokePath(activeGfx, drawPath, cssToNum(cfg?.brushColor ?? '#000000'), cfg?.brushSize ?? 4)
          return
        }
        if (tool === 'pen' && activeGfx) {
          drawPath.push(wp)
          strokePath(activeGfx, drawPath, cssToNum(cfg?.penColor ?? '#000000'), cfg?.penSize ?? 2)
          return
        }
        if (tool === 'shapes' && activeGfx) { applyShape(activeGfx, shapeStart, wp); return }
        if (tool === 'tables' && activeGfx) { applyTable(activeGfx, shapeStart, wp); return }
        if (tool === 'eraser') { eraseAt(toCanvas(e.clientX, e.clientY)); return }
        if (tool === 'selection' && selectedObj) {
          selectedObj.x += wp.x - prevWP.x
          selectedObj.y += wp.y - prevWP.y
          prevWP = wp
          return
        }
      }

      // ── Pointer up / cancel ────────────────────────────────────────────────
      const onUp = (e: PointerEvent) => {
        if (isPanning) {
          isPanning = false
          try { app.canvas.releasePointerCapture(e.pointerId) } catch { /* noop */ }
          app.canvas.style.cursor = TOOL_CURSORS[activeToolRef.current] ?? 'default'
          return
        }
        if (isDrawing) {
          isDrawing = false; activeGfx = null; drawPath = []; selectedObj = null
          try { app.canvas.releasePointerCapture(e.pointerId) } catch { /* noop */ }
        }
      }

      // ── Wheel: plain → pan pages; Ctrl/⌘ → zoom toward cursor ────────────
      const onWheel = (e: WheelEvent) => {
        e.preventDefault()
        if (e.ctrlKey || e.metaKey) {
          const factor = e.deltaY < 0 ? 1.1 : 0.9
          const oldPct = zoomPct.current
          const newPct = Math.round(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, oldPct * factor)))
          if (newPct === oldPct) return
          const oldS = oldPct / 100, newS = newPct / 100
          const r  = app.canvas.getBoundingClientRect()
          const mx = e.clientX - r.left, my = e.clientY - r.top
          world.x = mx - (mx - world.x) * (newS / oldS)
          world.y = my - (my - world.y) * (newS / oldS)
          world.scale.set(newS)
          zoomPct.current = newPct
          onZoomCb.current?.(newPct)
        } else {
          // Scroll = pan through pages
          world.x -= e.deltaX
          world.y -= e.deltaY
        }
        emitViewport(world, configSnap.current)
      }

      app.canvas.addEventListener('pointerdown',   onDown)
      app.canvas.addEventListener('pointermove',   onMove)
      app.canvas.addEventListener('pointerup',     onUp)
      app.canvas.addEventListener('pointercancel', onUp)
      app.canvas.addEventListener('wheel',         onWheel, { passive: false })
    })()

    return () => {
      alive = false
      if (textOverlay) { textOverlay.remove(); textOverlay = null }
      if (appRef.current) {
        appRef.current.destroy({ removeView: true })
        appRef.current       = null
        worldRef.current     = null
        drawLayerRef.current = null
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={containerRef} className="relative h-full w-full overflow-hidden" />
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
