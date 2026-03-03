"use client"

import { useState, useRef, useCallback } from "react"
import { Plus, Trash2, Link as LinkIcon } from "lucide-react"

interface DiagramNode {
  id: string
  label: string
  x: number
  y: number
  shape: "rect" | "diamond" | "oval" | "hex"
}

interface DiagramEdge {
  from: string
  to: string
  label?: string
}

interface DiagramEditorProps {
  content: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
}

function parseNodes(raw: unknown): DiagramNode[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((n): n is DiagramNode =>
    typeof n === "object" && n !== null && "id" in n && "label" in n,
  )
}

function parseEdges(raw: unknown): DiagramEdge[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((e): e is DiagramEdge =>
    typeof e === "object" && e !== null && "from" in e && "to" in e,
  )
}

let nodeCounter = 0
function makeId() {
  return `node-${Date.now()}-${nodeCounter++}`
}

const NODE_W = 90
const NODE_H = 32

function getNodeCenter(n: DiagramNode) {
  return { cx: n.x + NODE_W / 2, cy: n.y + NODE_H / 2 }
}

function NodeShape({ node, selected, color }: { node: DiagramNode; selected: boolean; color: string }) {
  const { x, y, shape, label } = node
  const w = NODE_W
  const h = NODE_H

  const style = {
    fill: selected ? color : "white",
    stroke: selected ? color : "#d1d5db",
    strokeWidth: selected ? 2 : 1.5,
  }

  return (
    <g>
      {shape === "rect" && (
        <rect x={x} y={y} width={w} height={h} rx={4} {...style} />
      )}
      {shape === "diamond" && (
        <polygon
          points={`${x + w / 2},${y} ${x + w},${y + h / 2} ${x + w / 2},${y + h} ${x},${y + h / 2}`}
          {...style}
        />
      )}
      {shape === "oval" && (
        <ellipse cx={x + w / 2} cy={y + h / 2} rx={w / 2} ry={h / 2} {...style} />
      )}
      {shape === "hex" && (() => {
        const cx = x + w / 2
        const cy = y + h / 2
        const rx = w / 2
        const ry = h / 2
        const pts = [0, 60, 120, 180, 240, 300].map((a) => {
          const rad = (a * Math.PI) / 180
          return `${cx + rx * Math.cos(rad)},${cy + ry * Math.sin(rad)}`
        })
        return <polygon points={pts.join(" ")} {...style} />
      })()}
      <text
        x={x + w / 2}
        y={y + h / 2 + 4}
        textAnchor="middle"
        fontSize={10}
        fill={selected ? "white" : "#374151"}
        fontWeight={selected ? 600 : 400}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        {label.length > 14 ? label.slice(0, 13) + "…" : label}
      </text>
    </g>
  )
}

const LAYOUT_FNS: Record<string, (nodes: DiagramNode[]) => DiagramNode[]> = {
  horizontal: (nodes) => nodes.map((n, i) => ({ ...n, x: 60 + i * 120, y: 100 })),
  vertical: (nodes) => nodes.map((n, i) => ({ ...n, x: 200, y: 30 + i * 60 })),
  circular: (nodes) => nodes.map((n, i) => {
    const angle = (i / nodes.length) * 2 * Math.PI - Math.PI / 2
    return { ...n, x: 220 + 140 * Math.cos(angle) - NODE_W / 2, y: 140 + 100 * Math.sin(angle) - NODE_H / 2 }
  }),
  auto: (nodes) => {
    const cols = Math.ceil(Math.sqrt(nodes.length))
    return nodes.map((n, i) => ({ ...n, x: 40 + (i % cols) * 130, y: 30 + Math.floor(i / cols) * 80 }))
  },
}

const NODE_COLORS: Record<string, string> = {
  "node-0": "#6366f1",
  default: "#374151",
}

export function DiagramEditor({ content, onChange }: DiagramEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [connectMode, setConnectMode] = useState(false)
  const [connectFrom, setConnectFrom] = useState<string | null>(null)
  const [editingLabel, setEditingLabel] = useState<string | null>(null)
  const [labelDraft, setLabelDraft] = useState("")
  const dragRef = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null)

  const nodes = parseNodes(content.nodes)
  const edges = parseEdges(content.edges)
  const diagramType = typeof content.diagramType === "string" ? content.diagramType : "flowchart"

  const addNode = () => {
    const id = makeId()
    const cx = 120 + Math.random() * 200
    const cy = 60 + Math.random() * 120
    onChange("nodes", [...nodes, { id, label: "Node", x: cx, y: cy, shape: "rect" }])
  }

  const removeSelected = () => {
    if (!selectedId) return
    onChange("nodes", nodes.filter((n) => n.id !== selectedId))
    onChange("edges", edges.filter((e) => e.from !== selectedId && e.to !== selectedId))
    setSelectedId(null)
  }

  const applyLayout = (preset: string) => {
    const fn = LAYOUT_FNS[preset] ?? LAYOUT_FNS.auto
    onChange("nodes", fn(nodes))
  }

  const handleNodeMouseDown = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (connectMode) {
      if (!connectFrom) {
        setConnectFrom(id)
      } else if (connectFrom !== id) {
        const exists = edges.some((ed) => ed.from === connectFrom && ed.to === id)
        if (!exists) {
          onChange("edges", [...edges, { from: connectFrom, to: id }])
        }
        setConnectFrom(null)
      }
      return
    }

    setSelectedId(id)
    const node = nodes.find((n) => n.id === id)
    if (!node) return

    const svg = svgRef.current!
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const svgPt = pt.matrixTransform(svg.getScreenCTM()!.inverse())

    dragRef.current = { id, startX: svgPt.x, startY: svgPt.y, origX: node.x, origY: node.y }
  }, [connectMode, connectFrom, edges, nodes, onChange])

  const handleSvgMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current) return
    const svg = svgRef.current!
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const svgPt = pt.matrixTransform(svg.getScreenCTM()!.inverse())
    const dx = svgPt.x - dragRef.current.startX
    const dy = svgPt.y - dragRef.current.startY
    onChange("nodes", nodes.map((n) =>
      n.id === dragRef.current!.id ? { ...n, x: Math.max(0, dragRef.current!.origX + dx), y: Math.max(0, dragRef.current!.origY + dy) } : n,
    ))
  }, [nodes, onChange])

  const handleSvgMouseUp = () => {
    dragRef.current = null
  }

  const startEdit = (id: string, label: string) => {
    setEditingLabel(id)
    setLabelDraft(label)
  }

  const commitEdit = () => {
    if (!editingLabel) return
    onChange("nodes", nodes.map((n) => n.id === editingLabel ? { ...n, label: labelDraft } : n))
    setEditingLabel(null)
  }

  const setNodeShape = (shape: DiagramNode["shape"]) => {
    if (!selectedId) return
    onChange("nodes", nodes.map((n) => n.id === selectedId ? { ...n, shape } : n))
  }

  const selectedNode = nodes.find((n) => n.id === selectedId)

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="flex shrink-0 items-center gap-2 border-b border-neutral-200 bg-white px-3 py-2 flex-wrap">
        <select
          value={diagramType}
          onChange={(e) => onChange("diagramType", e.target.value)}
          className="border border-neutral-200 bg-neutral-50 px-2 py-1 text-[11px] text-neutral-700 outline-none"
        >
          <option value="flowchart">Flowchart</option>
          <option value="concept-map">Concept Map</option>
          <option value="cycle">Cycle</option>
        </select>

        <button
          type="button"
          onClick={addNode}
          className="flex items-center gap-1 border border-neutral-900 bg-neutral-900 px-2 py-1 text-[10px] font-medium text-white hover:opacity-90"
        >
          <Plus size={10} /> Node
        </button>

        <button
          type="button"
          onClick={removeSelected}
          disabled={!selectedId}
          className="flex items-center gap-1 border border-neutral-200 px-2 py-1 text-[10px] font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-40"
        >
          <Trash2 size={10} /> Remove
        </button>

        <button
          type="button"
          onClick={() => { setConnectMode(!connectMode); setConnectFrom(null) }}
          className={[
            "flex items-center gap-1 border px-2 py-1 text-[10px] font-medium transition-colors",
            connectMode ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 text-neutral-600 hover:bg-neutral-50",
          ].join(" ")}
        >
          <LinkIcon size={10} />
          {connectMode ? (connectFrom ? "Click target…" : "Click source…") : "Connect"}
        </button>

        <span className="text-neutral-200">|</span>

        {(["auto", "horizontal", "vertical", "circular"] as const).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => applyLayout(l)}
            className="border border-neutral-200 px-2 py-1 text-[10px] text-neutral-600 hover:bg-neutral-50 capitalize"
          >
            {l}
          </button>
        ))}
      </div>

      {/* SVG Canvas */}
      <div className="flex-1 min-h-0 overflow-hidden relative bg-neutral-50">
        <svg
          ref={svgRef}
          viewBox="0 0 480 280"
          className="w-full h-full select-none"
          style={{ cursor: connectMode ? "crosshair" : "default" }}
          onMouseMove={handleSvgMouseMove}
          onMouseUp={handleSvgMouseUp}
          onClick={() => { if (!connectMode) setSelectedId(null) }}
        >
          {/* Grid */}
          <defs>
            <pattern id="dg-grid" width={20} height={20} patternUnits="userSpaceOnUse">
              <path d="M20 0 L0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth={0.5} />
            </pattern>
            <marker id="dg-arrow" markerWidth={8} markerHeight={8} refX={6} refY={3} orient="auto">
              <path d="M0,0 L0,6 L8,3Z" fill="#9ca3af" />
            </marker>
          </defs>
          <rect width="100%" height="100%" fill="url(#dg-grid)" />

          {/* Edges */}
          {edges.map((edge, i) => {
            const fromNode = nodes.find((n) => n.id === edge.from)
            const toNode = nodes.find((n) => n.id === edge.to)
            if (!fromNode || !toNode) return null
            const { cx: x1, cy: y1 } = getNodeCenter(fromNode)
            const { cx: x2, cy: y2 } = getNodeCenter(toNode)
            return (
              <line
                key={i}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="#9ca3af"
                strokeWidth={1.5}
                markerEnd="url(#dg-arrow)"
              />
            )
          })}

          {/* Nodes */}
          {nodes.map((node) => (
            <g
              key={node.id}
              style={{ cursor: connectMode ? "pointer" : "grab" }}
              onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
              onDoubleClick={() => startEdit(node.id, node.label)}
            >
              <NodeShape
                node={node}
                selected={selectedId === node.id || connectFrom === node.id}
                color={connectFrom === node.id ? "#f59e0b" : "#374151"}
              />
            </g>
          ))}

          {nodes.length === 0 && (
            <text x="240" y="140" textAnchor="middle" fontSize={12} fill="#9ca3af">
              Click &quot;Node&quot; to start building your diagram
            </text>
          )}
        </svg>

        {/* Inline label editor */}
        {editingLabel && (() => {
          const n = nodes.find((nd) => nd.id === editingLabel)
          if (!n) return null
          const svgEl = svgRef.current
          if (!svgEl) return null
          const viewBox = svgEl.viewBox.baseVal
          const { width: svgW, height: svgH } = svgEl.getBoundingClientRect()
          const scaleX = svgW / viewBox.width
          const scaleY = svgH / viewBox.height
          return (
            <input
              autoFocus
              type="text"
              value={labelDraft}
              onChange={(e) => setLabelDraft(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditingLabel(null) }}
              style={{
                position: "absolute",
                left: n.x * scaleX,
                top: n.y * scaleY,
                width: NODE_W * scaleX,
                height: NODE_H * scaleY,
                fontSize: 10,
                textAlign: "center",
              }}
              className="border-2 border-blue-500 bg-white/95 outline-none px-1"
            />
          )
        })()}
      </div>

      {/* Node properties */}
      {selectedNode && (
        <div className="shrink-0 border-t border-neutral-200 bg-white px-3 py-2 flex items-center gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Shape</span>
          {(["rect", "diamond", "oval", "hex"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setNodeShape(s)}
              className={[
                "border px-2 py-0.5 text-[10px] capitalize transition-colors",
                selectedNode.shape === s ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 text-neutral-600",
              ].join(" ")}
            >
              {s}
            </button>
          ))}
          <span className="text-[10px] text-neutral-400">Double-click node to rename</span>
        </div>
      )}
    </div>
  )
}
