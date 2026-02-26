'use client'

import { useRef, useState, useEffect } from 'react'
import type { CanvasPageConfig, ToolConfig } from './create-view-types'

interface CanvasPageProps {
  config: CanvasPageConfig
  pageNumber: number
  activeTool?: string
  toolConfig?: ToolConfig
  isActive: boolean
  children?: React.ReactNode
}

type Point = { x: number; y: number }

interface BaseElement {
  id: string
  x: number
  y: number
  selected?: boolean
}

interface PathElement extends BaseElement {
  type: 'path'
  points: Point[]
  color: string
  width: number
}

interface ShapeElement extends BaseElement {
  type: 'shape'
  shapeType: string // 'rectangle', 'ellipse', etc.
  width: number
  height: number
  strokeColor: string
  strokeWidth: number
  fillColor: string
}

interface TextElement extends BaseElement {
  type: 'text'
  text: string
  fontSize: number
  fontFamily: string
  color: string
  bold: boolean
  italic: boolean
}

type CanvasElement = PathElement | ShapeElement | TextElement

export function CanvasPage({
  config,
  pageNumber,
  activeTool = 'selection',
  toolConfig,
  isActive,
  children,
}: CanvasPageProps) {
  const [elements, setElements] = useState<CanvasElement[]>([])
  const [currentAction, setCurrentAction] = useState<{
    type: 'drawing' | 'shaping' | 'moving'
    startPoint: Point
    currentPoint: Point
    elementId?: string
    initialElementPos?: Point
  } | null>(null)

  const svgRef = useRef<SVGSVGElement>(null)

  // Helper to get coordinates relative to SVG
  const getLocalPoint = (e: React.PointerEvent): Point => {
    if (!svgRef.current) return { x: 0, y: 0 }
    const rect = svgRef.current.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    // If we are passing through events, this won't fire for background clicks,
    // but might for elements if they have pointer-events: auto.
    if (activeTool === 'grab' || !isActive) return

    const p = getLocalPoint(e)
    e.currentTarget.setPointerCapture(e.pointerId)

    if (activeTool === 'pen' || activeTool === 'brush') {
      const id = crypto.randomUUID()
      const width = activeTool === 'brush' ? (toolConfig?.brushSize ?? 10) : (toolConfig?.penSize ?? 2)
      const color = activeTool === 'brush' ? (toolConfig?.brushColor ?? '#000000') : (toolConfig?.penColor ?? '#000000')

      const newPath: PathElement = {
        type: 'path',
        id,
        x: 0, y: 0, // points are absolute in SVG space
        points: [p],
        color,
        width
      }
      setElements(prev => [...prev, newPath])
      setCurrentAction({ type: 'drawing', startPoint: p, currentPoint: p, elementId: id })
    }
    else if (activeTool === 'shapes') {
      const id = crypto.randomUUID()
      const shapeType = toolConfig?.shapeType ?? 'rectangle'
      const newShape: ShapeElement = {
        type: 'shape',
        id,
        x: p.x, y: p.y,
        width: 0, height: 0,
        shapeType,
        strokeColor: toolConfig?.shapeStrokeColor ?? '#000000',
        strokeWidth: toolConfig?.shapeStrokeWidth ?? 2,
        fillColor: toolConfig?.shapeFillColor ?? 'transparent'
      }
      setElements(prev => [...prev, newShape])
      setCurrentAction({ type: 'shaping', startPoint: p, currentPoint: p, elementId: id })
    }
    else if (activeTool === 'selection') {
        // If we clicked on background (and events captured), deselect all.
        // But with pointer-events: none on SVG root, this assumes we clicked an element
        // OR we are in a mode where SVG captures everything.
        // For 'selection' tool, we likely want to allow selecting SVG elements
        // AND interacting with DOM content if no SVG element is hit.
        // So pointer-events: none on SVG root is correct.
        // But then we can't "deselect all" by clicking empty space easily without blocking DOM.
        // Trade-off: Priority to DOM content interactions.
        setElements(prev => prev.map(el => ({ ...el, selected: false })))
    }
    else if (activeTool === 'text') {
        const text = prompt('Enter text:')
        if (text) {
             const newText: TextElement = {
                type: 'text',
                id: crypto.randomUUID(),
                x: p.x, y: p.y,
                text,
                fontSize: parseInt(toolConfig?.fontSize ?? '16'),
                fontFamily: toolConfig?.fontFamily ?? 'Arial',
                color: toolConfig?.textColor ?? '#000000',
                bold: toolConfig?.fontBold ?? false,
                italic: toolConfig?.fontItalic ?? false
             }
             setElements(prev => [...prev, newText])
        }
    }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!currentAction) return
    const p = getLocalPoint(e)

    if (currentAction.type === 'drawing' && currentAction.elementId) {
      setElements(prev => prev.map(el => {
        if (el.id === currentAction.elementId && el.type === 'path') {
          return { ...el, points: [...el.points, p] }
        }
        return el
      }))
    }
    else if (currentAction.type === 'shaping' && currentAction.elementId) {
      setElements(prev => prev.map(el => {
        if (el.id === currentAction.elementId && el.type === 'shape') {
           const start = currentAction.startPoint
           const w = p.x - start.x
           const h = p.y - start.y
           return {
             ...el,
             x: w < 0 ? p.x : start.x,
             y: h < 0 ? p.y : start.y,
             width: Math.abs(w),
             height: Math.abs(h)
           }
        }
        return el
      }))
    }
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (currentAction) {
      setCurrentAction(null)
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }

  const handleElementPointerDown = (e: React.PointerEvent, id: string) => {
      if (activeTool === 'selection') {
          e.stopPropagation() // Prevent bubbling to SVG background
          setElements(prev => prev.map(el => ({ ...el, selected: el.id === id })))
      } else if (activeTool === 'eraser') {
          e.stopPropagation()
          setElements(prev => prev.filter(el => el.id !== id))
      }
  }

  const { widthPx, heightPx, margins } = config

  // Decide pointer events for SVG root
  const isDrawingTool = ['pen', 'brush', 'shapes', 'text', 'eraser'].includes(activeTool)
  const svgPointerEvents = isDrawingTool ? 'auto' : 'none'

  return (
    <div
      className="relative bg-white shadow-sm ring-1 ring-gray-200 mx-auto"
      style={{
        width: widthPx,
        height: heightPx,
      }}
    >
        {/* Margin Guides */}
        <div
            className="absolute border border-indigo-500/30 pointer-events-none"
            style={{
                top: margins.top,
                bottom: margins.bottom,
                left: margins.left,
                right: margins.right,
            }}
        />

        {/* Template Content Layer - Lower z-index but clickable if SVG lets through */}
        <div className="absolute inset-0 z-0">
             {children}
        </div>

        {/* SVG Drawing Layer */}
        <svg
            ref={svgRef}
            className="absolute inset-0 z-10 w-full h-full touch-none"
            style={{ pointerEvents: svgPointerEvents }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
        >
            {elements.map(el => {
                const isPath = el.type === 'path'
                const isShape = el.type === 'shape'
                const isText = el.type === 'text'
                const commonProps = {
                    key: el.id,
                    onPointerDown: (e: React.PointerEvent) => handleElementPointerDown(e, el.id),
                    className: (el.selected ? "outline outline-1 outline-blue-500 cursor-move" : "cursor-pointer") + " pointer-events-auto",
                    style: { pointerEvents: 'auto' as const }
                }

                if (isPath) {
                    const d = el.points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ')
                    return (
                        <path
                            {...commonProps}
                            d={d}
                            stroke={el.color}
                            strokeWidth={el.width}
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    )
                }
                if (isShape) {
                     if (el.shapeType === 'ellipse') {
                         return (
                             <ellipse
                                 {...commonProps}
                                 cx={el.x + el.width/2}
                                 cy={el.y + el.height/2}
                                 rx={el.width/2}
                                 ry={el.height/2}
                                 stroke={el.strokeColor}
                                 strokeWidth={el.strokeWidth}
                                 fill={el.fillColor}
                             />
                         )
                     }
                     return (
                         <rect
                             {...commonProps}
                             x={el.x}
                             y={el.y}
                             width={el.width}
                             height={el.height}
                             stroke={el.strokeColor}
                             strokeWidth={el.strokeWidth}
                             fill={el.fillColor}
                         />
                     )
                }
                if (isText) {
                    return (
                        <text
                            {...commonProps}
                            x={el.x}
                            y={el.y}
                            fill={el.color}
                            fontSize={el.fontSize}
                            fontFamily={el.fontFamily}
                            fontWeight={el.bold ? 'bold' : 'normal'}
                            fontStyle={el.italic ? 'italic' : 'normal'}
                            className="select-none cursor-pointer pointer-events-auto"
                        >
                            {el.text}
                        </text>
                    )
                }
                return null
            })}
        </svg>
    </div>
  )
}
