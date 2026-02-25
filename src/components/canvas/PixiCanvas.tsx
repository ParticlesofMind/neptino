'use client'

import { useEffect, useRef } from 'react'
import '@pixi/layout'
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

export interface PixiTemplateLayoutSection {
  key: string
  id: string
  title: string
  lines: string[]
  mediaZones?: PixiTemplateMediaZone[]
}

export interface PixiTemplateMediaItem {
  id: string
  title: string
  description?: string
  url?: string
  mediaType?: string
  category?: string
}

export interface PixiTemplateMediaZone {
  areaKey: string
  title: string
  items: PixiTemplateMediaItem[]
}

export interface PixiTemplateLayoutModel {
  title: string
  headerChips: string[]
  sections: PixiTemplateLayoutSection[]
  footerChips: string[]
  pageLabel: string
}

export interface PixiTemplateLayoutMeasurement {
  sectionHeights: Record<string, number>
  bodyHeight: number
  measuredAt: number
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
  allowWheelScroll?: boolean
  activeTool?:       string
  toolConfig?:       ToolConfig
  activePage?:       number
  focusPage?:        number
  onViewportChange?: (info: CanvasViewportInfo) => void
  onActivePageChange?: (page: number) => void
  templateLayoutModel?: PixiTemplateLayoutModel | null
  enableTemplateLayout?: boolean
  onTemplateMediaActivate?: (media: PixiTemplateMediaItem) => void
  onTemplateAreaDrop?: (areaKey: string, rawPayload: string) => void
  onTemplateLayoutMeasured?: (measurement: PixiTemplateLayoutMeasurement) => void
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
  allowWheelScroll = true,
  activeTool   = 'selection',
  toolConfig,
  activePage   = 1,
  focusPage,
  onViewportChange,
  onActivePageChange,
  templateLayoutModel,
  enableTemplateLayout = false,
  onTemplateMediaActivate,
  onTemplateAreaDrop,
  onTemplateLayoutMeasured,
}: PixiCanvasProps) {
  const containerRef   = useRef<HTMLDivElement>(null)
  const appRef         = useRef<Application | null>(null)
  const worldRef       = useRef<Container   | null>(null)
  const drawLayerRef   = useRef<Container   | null>(null)
  const templateLayerRef = useRef<Container | null>(null)
  const zoomPct        = useRef(zoom)
  const onZoomCb       = useRef(onZoomChange)
  const onViewportCb   = useRef(onViewportChange)
  const onActivePageCb = useRef(onActivePageChange)
  const configSnap     = useRef(config)
  const activeToolRef  = useRef(activeTool)
  const activePageRef  = useRef(activePage)
  const focusPageRef   = useRef(focusPage)
  const toolConfigRef  = useRef(toolConfig)
  const templateLayoutRef = useRef<PixiTemplateLayoutModel | null>(templateLayoutModel ?? null)
  const templateLayoutEnabledRef = useRef(enableTemplateLayout)
  const onTemplateMediaActivateRef = useRef(onTemplateMediaActivate)
  const onTemplateAreaDropRef = useRef(onTemplateAreaDrop)
  const onTemplateLayoutMeasuredRef = useRef(onTemplateLayoutMeasured)
  const templateDropZonesRef = useRef<Map<string, Container>>(new Map())
  const baseScaleRef   = useRef(1)
  const allowWheelScrollRef = useRef(allowWheelScroll)

  useEffect(() => { onZoomCb.current      = onZoomChange     }, [onZoomChange])
  useEffect(() => { onViewportCb.current  = onViewportChange }, [onViewportChange])
  useEffect(() => { onActivePageCb.current = onActivePageChange }, [onActivePageChange])
  useEffect(() => { configSnap.current    = config           }, [config])
  useEffect(() => { activeToolRef.current = activeTool       }, [activeTool])
  useEffect(() => { activePageRef.current = activePage       }, [activePage])
  useEffect(() => { focusPageRef.current  = focusPage        }, [focusPage])
  useEffect(() => { toolConfigRef.current = toolConfig       }, [toolConfig])
  useEffect(() => { templateLayoutRef.current = templateLayoutModel ?? null }, [templateLayoutModel])
  useEffect(() => { templateLayoutEnabledRef.current = enableTemplateLayout }, [enableTemplateLayout])
  useEffect(() => { onTemplateMediaActivateRef.current = onTemplateMediaActivate }, [onTemplateMediaActivate])
  useEffect(() => { onTemplateAreaDropRef.current = onTemplateAreaDrop }, [onTemplateAreaDrop])
  useEffect(() => { onTemplateLayoutMeasuredRef.current = onTemplateLayoutMeasured }, [onTemplateLayoutMeasured])
  useEffect(() => { allowWheelScrollRef.current = allowWheelScroll }, [allowWheelScroll])

  const emitViewport = (world: Container, cfg: CanvasPageConfig, page = activePageRef.current) => {
    const safePage = Math.min(Math.max(1, page), Math.max(1, cfg.pageCount))
    const pageOffset = (safePage - 1) * (cfg.heightPx + PAGE_GAP)
    const scale = world.scale.x
    const pageRect = {
      x: world.x,
      y: world.y + pageOffset * scale,
      width: cfg.widthPx * scale,
      height: cfg.heightPx * scale,
    }
    const contentRect = {
      x: world.x + cfg.margins.left * scale,
      y: world.y + (pageOffset + cfg.margins.top) * scale,
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

  const getScaleForZoom = (pct: number) => {
    return baseScaleRef.current * (pct / 100)
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

    const oldS = getScaleForZoom(zoomPct.current)
    const newS = getScaleForZoom(zoom)
    if (app) {
      const cx = app.screen.width  / 2
      const cy = app.screen.height / 2
      world.x  = cx - (cx - world.x) * (newS / oldS)
      world.y  = cy - (cy - world.y) * (newS / oldS)
    }
    world.scale.set(newS)
    zoomPct.current = zoom
    emitViewport(world, configSnap.current, activePageRef.current)
  }, [zoom])

  useEffect(() => {
    const world = worldRef.current
    if (!world) return
    emitViewport(world, configSnap.current, activePage)
  }, [activePage])

  useEffect(() => {
    const app = appRef.current
    const world = worldRef.current
    const targetPage = focusPageRef.current
    if (!app || !world || typeof targetPage !== 'number' || Number.isNaN(targetPage)) return

    const cfg = configSnap.current
    const safePage = Math.min(Math.max(1, Math.round(targetPage)), Math.max(1, cfg.pageCount))
    centerWorldOnPage(app, world, cfg, safePage)
    emitViewport(world, cfg, safePage)
  }, [focusPage])

  useEffect(() => {
    const world = worldRef.current
    const templateLayer = templateLayerRef.current
    if (!world || !templateLayer) return

    templateLayer.removeChildren()
    templateDropZonesRef.current.clear()
    if (!templateLayoutEnabledRef.current || !templateLayoutRef.current) return

    const cfg = configSnap.current
    const active = Math.min(Math.max(1, activePageRef.current), Math.max(1, cfg.pageCount))
    const template = createTemplateLayoutContainer(
      cfg,
      active,
      templateLayoutRef.current,
      (areaKey, zone) => templateDropZonesRef.current.set(areaKey, zone),
      (media) => onTemplateMediaActivateRef.current?.(media),
    )
    templateLayer.addChild(template)

    window.requestAnimationFrame(() => {
      const measurement = measureTemplateLayout(template)
      if (measurement) {
        onTemplateLayoutMeasuredRef.current?.(measurement)
      }
    })
  }, [activePage, config, enableTemplateLayout, templateLayoutModel])

  // ── Redraw pages when config changes (preserve drawing layer) ──────────────
  useEffect(() => {
    const app       = appRef.current
    const world     = worldRef.current
    const drawLayer = drawLayerRef.current
    if (!world) return

    const prevScale = world.scale.x
    world.removeChildren()
    drawPages(world, config)
    if (drawLayer) world.addChild(drawLayer) // re-attach above pages

    if (app) {
      const fittedScale = fitWorld(app, world, config, activePageRef.current)
      baseScaleRef.current = fittedScale

      const nextScale = getScaleForZoom(zoomPct.current)
      if (Math.abs(nextScale - prevScale) > 0.0001) {
        world.scale.set(nextScale)
      }
      centerWorldOnPage(app, world, config, focusPageRef.current ?? activePageRef.current)
    }

    emitViewport(world, config, activePageRef.current)
  }, [config])

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

      drawPages(world, configSnap.current)

      // Drawing layer — above pages, receives all user content
      const templateLayer = new Container()
      world.addChild(templateLayer)
      templateLayerRef.current = templateLayer

      const drawLayer = new Container()
      world.addChild(drawLayer)
      drawLayerRef.current = drawLayer

      if (templateLayoutEnabledRef.current && templateLayoutRef.current) {
        const template = createTemplateLayoutContainer(
          configSnap.current,
          activePageRef.current,
          templateLayoutRef.current,
          (areaKey, zone) => templateDropZonesRef.current.set(areaKey, zone),
          (media) => onTemplateMediaActivateRef.current?.(media),
        )
        templateLayer.addChild(template)

        window.requestAnimationFrame(() => {
          const measurement = measureTemplateLayout(template)
          if (measurement) {
            onTemplateLayoutMeasuredRef.current?.(measurement)
          }
        })
      }

      const fittedScale = fitWorld(app, world, configSnap.current, activePageRef.current)
      baseScaleRef.current = fittedScale

      const initialScale = getScaleForZoom(zoomPct.current)
      if (Math.abs(initialScale - fittedScale) > 0.0001) {
        const cx = app.screen.width / 2
        const cy = app.screen.height / 2
        world.x = cx - (cx - world.x) * (initialScale / fittedScale)
        world.y = cy - (cy - world.y) * (initialScale / fittedScale)
        world.scale.set(initialScale)
      }
      centerWorldOnPage(app, world, configSnap.current, activePageRef.current)

      emitViewport(world, configSnap.current, activePageRef.current)

      const detectActivePageFromView = () => {
        const cfg = configSnap.current
        const scale = world.scale.x
        if (scale <= 0) return

        const viewCenterYInWorld = (app.screen.height / 2 - world.y) / scale
        const step = cfg.heightPx + PAGE_GAP
        const page = Math.min(
          Math.max(1, Math.round((viewCenterYInWorld - cfg.heightPx / 2) / step) + 1),
          Math.max(1, cfg.pageCount),
        )

        if (page !== activePageRef.current) {
          onActivePageCb.current?.(page)
        }
      }

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
          emitViewport(world, configSnap.current, activePageRef.current)
          detectActivePageFromView()
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
          const factor = e.deltaY < 0 ? 1.08 : 0.92
          const oldPct = zoomPct.current
          const newPct = Math.round(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, oldPct * factor)))
          if (newPct === oldPct) return
          const oldS = getScaleForZoom(oldPct)
          const newS = getScaleForZoom(newPct)
          const r  = app.canvas.getBoundingClientRect()
          const mx = e.clientX - r.left, my = e.clientY - r.top
          world.x = mx - (mx - world.x) * (newS / oldS)
          world.y = my - (my - world.y) * (newS / oldS)
          world.scale.set(newS)
          zoomPct.current = newPct
          onZoomCb.current?.(newPct)
        } else {
          if (!allowWheelScrollRef.current) {
            emitViewport(world, configSnap.current, activePageRef.current)
            return
          }
          // Scroll = pan through pages
          world.x -= e.deltaX
          world.y -= e.deltaY
        }
        emitViewport(world, configSnap.current, activePageRef.current)
        detectActivePageFromView()
      }

      const onDragOver = (e: DragEvent) => {
        if (!templateLayoutEnabledRef.current) return
        e.preventDefault()
        e.dataTransfer!.dropEffect = 'copy'
      }

      const onDrop = (e: DragEvent) => {
        if (!templateLayoutEnabledRef.current) return
        e.preventDefault()
        const raw = e.dataTransfer?.getData('application/json') || e.dataTransfer?.getData('text/plain')
        if (!raw) return

        const cp = toCanvas(e.clientX, e.clientY)
        for (const [areaKey, zone] of templateDropZonesRef.current.entries()) {
          const bounds = zone.getBounds()
          if (cp.x >= bounds.x && cp.x <= bounds.x + bounds.width && cp.y >= bounds.y && cp.y <= bounds.y + bounds.height) {
            onTemplateAreaDropRef.current?.(areaKey, raw)
            return
          }
        }
      }

      app.canvas.addEventListener('pointerdown',   onDown)
      app.canvas.addEventListener('pointermove',   onMove)
      app.canvas.addEventListener('pointerup',     onUp)
      app.canvas.addEventListener('pointercancel', onUp)
      app.canvas.addEventListener('wheel',         onWheel, { passive: false })
      app.canvas.addEventListener('dragover',      onDragOver)
      app.canvas.addEventListener('drop',          onDrop)
    })()

    return () => {
      alive = false
      if (textOverlay) { textOverlay.remove(); textOverlay = null }
      if (appRef.current) {
        appRef.current.destroy({ removeView: true })
        appRef.current       = null
        worldRef.current     = null
        drawLayerRef.current = null
        templateLayerRef.current = null
      }
    }
  }, [])

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

function centerWorldOnPage(app: Application, world: Container, cfg: CanvasPageConfig, page: number) {
  const safePage = Math.min(Math.max(1, Math.round(page)), Math.max(1, cfg.pageCount))
  const scale = world.scale.x
  world.x = (app.screen.width - cfg.widthPx * scale) / 2
  const pageCenterY = ((safePage - 1) * (cfg.heightPx + PAGE_GAP) + cfg.heightPx / 2) * scale
  world.y = app.screen.height / 2 - pageCenterY
}

function fitWorld(app: Application, world: Container, cfg: CanvasPageConfig, page = 1): number {
  const vw     = app.screen.width
  const vh     = app.screen.height
  const scale  = Math.min(
    (vw * 0.82) / cfg.widthPx,
    (vh * 0.82) / cfg.heightPx,
    1.0,
  )
  world.scale.set(scale)
  centerWorldOnPage(app, world, cfg, page)
  return scale
}

function createTemplateLayoutContainer(
  cfg: CanvasPageConfig,
  page: number,
  model: PixiTemplateLayoutModel,
  registerDropZone?: (areaKey: string, zone: Container) => void,
  onMediaActivate?: (media: PixiTemplateMediaItem) => void,
): Container {
  const safePage = Math.min(Math.max(1, Math.round(page)), Math.max(1, cfg.pageCount))
  const pageOffsetY = (safePage - 1) * (cfg.heightPx + PAGE_GAP)
  const contentWidth = cfg.widthPx - cfg.margins.left - cfg.margins.right
  const contentHeight = cfg.heightPx - cfg.margins.top - cfg.margins.bottom

  const root = new Container({
    layout: {
      x: cfg.margins.left,
      y: pageOffsetY + cfg.margins.top,
      width: contentWidth,
      height: contentHeight,
      flexDirection: 'column',
      gap: 8,
      padding: 8,
      overflow: 'hidden',
    } as never,
  })

  const header = new Container({
    layout: {
      width: '100%',
      padding: 6,
      gap: 6,
      flexDirection: 'column',
      backgroundColor: 0xf8fafc,
      borderRadius: 6,
      borderColor: 0xd1d5db,
      borderWidth: 1,
    } as never,
  })
  header.addChild(createLayoutText(model.title || 'Template', 13, 0x0f172a, true))
  if (model.headerChips.length > 0) {
    const chips = new Container({
      layout: {
        width: '100%',
        flexWrap: 'wrap',
        gap: 4,
      } as never,
    })
    model.headerChips.slice(0, 6).forEach((chip) => {
      chips.addChild(createChip(chip))
    })
    header.addChild(chips)
  }
  root.addChild(header)

  const body = new Container({
    layout: {
      width: '100%',
      flexGrow: 1,
      flexShrink: 1,
      gap: 6,
      overflow: 'hidden',
    } as never,
  })
  ;(body as Container & { __pixiBodyNode?: boolean }).__pixiBodyNode = true

  model.sections.forEach((section) => {
    const sectionContainer = new Container({
      layout: {
        width: '100%',
        padding: 6,
        gap: 4,
        backgroundColor: 0xffffff,
        borderRadius: 6,
        borderColor: 0xd1d5db,
        borderWidth: 1,
      } as never,
    })
    ;(sectionContainer as Container & { __pixiSectionKey?: string }).__pixiSectionKey = section.key
    sectionContainer.addChild(createLayoutText(section.title, 11, 0x334155, true))
    section.lines.slice(0, 6).forEach((line) => {
      sectionContainer.addChild(createLayoutText(line, 10, 0x475569))
    })

    if (Array.isArray(section.mediaZones) && section.mediaZones.length > 0) {
      section.mediaZones.slice(0, 8).forEach((zoneDef) => {
        const zone = new Container({
          layout: {
            width: '100%',
            padding: 6,
            gap: 4,
            borderRadius: 6,
            borderColor: 0x93c5fd,
            borderWidth: 1,
            backgroundColor: 0xeff6ff,
          } as never,
        })
        registerDropZone?.(zoneDef.areaKey, zone)
        zone.addChild(createLayoutText(zoneDef.title || zoneDef.areaKey, 10, 0x1e3a8a, true))

        if (zoneDef.items.length === 0) {
          zone.addChild(createLayoutText('Drop media here', 9, 0x475569))
        }

        zoneDef.items.slice(0, 4).forEach((item) => {
          const mediaRow = new Container({
            layout: {
              width: '100%',
              paddingHorizontal: 6,
              paddingVertical: 4,
              borderRadius: 4,
              borderColor: 0xcbd5e1,
              borderWidth: 1,
              backgroundColor: 0xffffff,
            } as never,
          })
          mediaRow.addChild(createLayoutText(item.title, 9, 0x0f172a))
          mediaRow.eventMode = 'static'
          mediaRow.cursor = 'pointer'
          mediaRow.on('pointertap', () => onMediaActivate?.(item))
          zone.addChild(mediaRow)
        })

        sectionContainer.addChild(zone)
      })
    }
    body.addChild(sectionContainer)
  })

  root.addChild(body)

  const footer = new Container({
    layout: {
      width: '100%',
      padding: 6,
      gap: 4,
      backgroundColor: 0xf8fafc,
      borderRadius: 6,
      borderColor: 0xd1d5db,
      borderWidth: 1,
      flexDirection: 'column',
    } as never,
  })

  if (model.footerChips.length > 0) {
    const footerChips = new Container({
      layout: {
        width: '100%',
        flexWrap: 'wrap',
        gap: 4,
      } as never,
    })
    model.footerChips.slice(0, 5).forEach((chip) => footerChips.addChild(createChip(chip)))
    footer.addChild(footerChips)
  }
  footer.addChild(createLayoutText(model.pageLabel, 10, 0x0f172a, true))
  root.addChild(footer)

  return root
}

function measureTemplateLayout(root: Container): PixiTemplateLayoutMeasurement | null {
  const sectionHeights: Record<string, number> = {}
  let bodyHeight = 0

  root.children.forEach((child) => {
    const typedChild = child as Container & { __pixiBodyNode?: boolean; __pixiSectionKey?: string }
    if (typedChild.__pixiBodyNode) {
      const bodyBounds = typedChild.getLocalBounds()
      bodyHeight = Math.max(0, Math.round(bodyBounds.height))
      typedChild.children.forEach((sectionNode) => {
        const typedSection = sectionNode as Container & { __pixiSectionKey?: string }
        const key = typedSection.__pixiSectionKey
        if (!key) return
        const bounds = typedSection.getLocalBounds()
        sectionHeights[key] = Math.max(0, Math.round(bounds.height))
      })
    }
  })

  return {
    sectionHeights,
    bodyHeight,
    measuredAt: Date.now(),
  }
}

function createChip(text: string): Container {
  const chip = new Container({
    layout: {
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 999,
      borderColor: 0xcbd5e1,
      borderWidth: 1,
      backgroundColor: 0xffffff,
    } as never,
  })
  chip.addChild(createLayoutText(text, 9, 0x334155))
  return chip
}

function createLayoutText(text: string, size: number, color: number, bold = false): PixiText {
  const node = new PixiText({
    text,
    style: {
      fontSize: size,
      fill: color,
      fontWeight: bold ? '600' : '400',
      wordWrap: true,
      wordWrapWidth: 580,
    },
    layout: {
      width: '100%',
    } as never,
  } as never)
  return node
}
