import { Position, type Edge, type Node } from "@xyflow/react"

export type DiagramShape = "rect" | "diamond" | "oval" | "hex"

export interface DiagramNodeData extends Record<string, unknown> {
  label: string
  shape: DiagramShape
}

export interface StoredDiagramNode {
  id: string
  label: string
  x: number
  y: number
  shape: DiagramShape
}

export interface StoredDiagramEdge {
  from: string
  to: string
  label?: string
}

export function parseNodes(raw: unknown): Node<DiagramNodeData>[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((node): node is StoredDiagramNode => {
      return typeof node === "object" && node !== null && "id" in node && "label" in node
    })
    .map((node) => ({
      id: node.id,
      position: { x: Number(node.x) || 0, y: Number(node.y) || 0 },
      data: { label: node.label, shape: node.shape || "rect" },
      type: "shapeNode",
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    }))
}

export function parseEdges(raw: unknown): Edge[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((edge): edge is StoredDiagramEdge => {
      return typeof edge === "object" && edge !== null && "from" in edge && "to" in edge
    })
    .map((edge, index) => ({
      id: `${edge.from}-${edge.to}-${index}`,
      source: edge.from,
      target: edge.to,
      label: edge.label,
      animated: false,
    }))
}

export function toStoredNodes(nodes: Node<DiagramNodeData>[]): StoredDiagramNode[] {
  return nodes.map((node) => ({
    id: node.id,
    label: node.data.label,
    x: Number(node.position.x.toFixed(1)),
    y: Number(node.position.y.toFixed(1)),
    shape: node.data.shape,
  }))
}

export function toStoredEdges(edges: Edge[]): StoredDiagramEdge[] {
  return edges.map((edge) => ({
    from: edge.source,
    to: edge.target,
    label: typeof edge.label === "string" ? edge.label : "",
  }))
}

export function nextNodeId(nodes: Node<DiagramNodeData>[]): string {
  let max = 0
  nodes.forEach((node) => {
    const n = Number(node.id.replace(/[^0-9]/g, ""))
    if (!Number.isNaN(n)) max = Math.max(max, n)
  })
  return `node-${max + 1}`
}

export function applySimpleLayout(nodes: Node<DiagramNodeData>[], mode: "auto" | "horizontal" | "vertical" | "circular") {
  if (nodes.length === 0) return nodes

  if (mode === "horizontal") {
    return nodes.map((node, i) => ({ ...node, position: { x: 80 + i * 180, y: 120 } }))
  }

  if (mode === "vertical") {
    return nodes.map((node, i) => ({ ...node, position: { x: 220, y: 60 + i * 110 } }))
  }

  if (mode === "circular") {
    const radius = Math.max(140, nodes.length * 18)
    return nodes.map((node, i) => {
      const angle = (i / nodes.length) * Math.PI * 2
      return {
        ...node,
        position: {
          x: 260 + radius * Math.cos(angle),
          y: 160 + radius * Math.sin(angle),
        },
      }
    })
  }

  const cols = Math.max(1, Math.ceil(Math.sqrt(nodes.length)))
  return nodes.map((node, i) => ({
    ...node,
    position: {
      x: 60 + (i % cols) * 180,
      y: 60 + Math.floor(i / cols) * 110,
    },
  }))
 }
