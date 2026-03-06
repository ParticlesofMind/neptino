"use client"

import { memo, useEffect, useMemo, useState } from "react"
import {
  addEdge,
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react"
import { Plus, Trash2 } from "lucide-react"
import {
  applySimpleLayout,
  nextNodeId,
  parseEdges,
  parseNodes,
  toStoredEdges,
  toStoredNodes,
  type DiagramNodeData,
  type DiagramShape,
} from "./diagram-flow-utils"

interface DiagramEditorProps {
  content: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
}

const shapeClasses: Record<DiagramShape, string> = {
  rect: "rounded-md",
  diamond: "rotate-45 rounded-sm",
  oval: "rounded-full",
  hex: "[clip-path:polygon(12%_0,88%_0,100%_50%,88%_100%,12%_100%,0_50%)]",
}

const ShapeNode = memo(function ShapeNode({ data, selected }: NodeProps<Node<DiagramNodeData>>) {
  const shape = data.shape
  const isDiamond = shape === "diamond"
  return (
    <div
      className={[
        "min-w-[120px] border bg-white px-3 py-2 text-center text-[12px] font-medium text-neutral-700 shadow-sm",
        shapeClasses[shape],
        selected ? "border-[#4a94ff] ring-2 ring-[#4a94ff]/20" : "border-neutral-300",
      ].join(" ")}
    >
      <span className={isDiamond ? "inline-block -rotate-45" : ""}>{data.label || "Node"}</span>
    </div>
  )
})

const nodeTypes = { shapeNode: ShapeNode }

type DiagramNodeType = Node<DiagramNodeData>
type DiagramEdgeType = Edge

function DiagramEditorInner({ content, onChange }: DiagramEditorProps) {
  const initialNodes = useMemo(() => parseNodes(content.nodes), [content.nodes])
  const initialEdges = useMemo(() => parseEdges(content.edges), [content.edges])

  const [nodes, setNodes, onNodesChange] = useNodesState<DiagramNodeType>(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState<DiagramEdgeType>(initialEdges)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const diagramType = typeof content.diagramType === "string" ? content.diagramType : "flowchart"

  useEffect(() => {
    setNodes(initialNodes)
  }, [initialNodes, setNodes])

  useEffect(() => {
    setEdges(initialEdges)
  }, [initialEdges, setEdges])

  useEffect(() => {
    onChange("nodes", toStoredNodes(nodes))
  }, [nodes, onChange])

  useEffect(() => {
    onChange("edges", toStoredEdges(edges))
  }, [edges, onChange])

  const addNode = () => {
    const id = nextNodeId(nodes)
    const idx = nodes.length
    setNodes((prev) => [
      ...prev,
      {
        id,
        type: "shapeNode",
        position: { x: 80 + (idx % 4) * 170, y: 60 + Math.floor(idx / 4) * 110 },
        data: { label: `Node ${idx + 1}`, shape: "rect" },
      },
    ])
  }

  const removeSelected = () => {
    if (!selectedNodeId) return
    setNodes((prev) => prev.filter((node) => node.id !== selectedNodeId))
    setEdges((prev) => prev.filter((edge) => edge.source !== selectedNodeId && edge.target !== selectedNodeId))
    setSelectedNodeId(null)
  }

  const onConnect = (params: Connection) => {
    setEdges((prev) => addEdge({ ...params, animated: false }, prev))
  }

  const applyLayout = (mode: "auto" | "horizontal" | "vertical" | "circular") => {
    setNodes((prev) => applySimpleLayout(prev, mode))
  }

  const selectedNode = nodes.find((node) => node.id === selectedNodeId)

  const updateSelectedNode = (updates: Partial<DiagramNodeData>) => {
    if (!selectedNodeId) return
    setNodes((prev) => prev.map((node) => {
      if (node.id !== selectedNodeId) return node
      return { ...node, data: { ...node.data, ...updates } }
    }))
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-neutral-200 bg-white px-3 py-2">
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
          className="inline-flex items-center gap-1 border border-neutral-900 bg-neutral-900 px-2 py-1 text-[10px] font-medium text-white hover:opacity-90"
        >
          <Plus size={10} /> Node
        </button>

        <button
          type="button"
          onClick={removeSelected}
          disabled={!selectedNodeId}
          className="inline-flex items-center gap-1 border border-neutral-200 px-2 py-1 text-[10px] font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-40"
        >
          <Trash2 size={10} /> Remove
        </button>

        <span className="text-neutral-200">|</span>

        {(["auto", "horizontal", "vertical", "circular"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => applyLayout(mode)}
            className="border border-neutral-200 px-2 py-1 text-[10px] capitalize text-neutral-600 hover:bg-neutral-50"
          >
            {mode}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.4}
          maxZoom={1.8}
          onNodeClick={(_e, node) => setSelectedNodeId(node.id)}
          onPaneClick={() => setSelectedNodeId(null)}
          className="bg-neutral-50"
        >
          <MiniMap pannable zoomable />
          <Controls showInteractive={false} />
          <Background gap={20} color="#e5e7eb" />
        </ReactFlow>
      </div>

      {selectedNode && (
        <div className="shrink-0 border-t border-neutral-200 bg-white px-3 py-2.5">
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <input
              type="text"
              value={selectedNode.data.label}
              onChange={(e) => updateSelectedNode({ label: e.target.value })}
              className="border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-[11px] text-neutral-700 outline-none focus:border-neutral-400"
              placeholder="Node label"
            />
            <select
              value={selectedNode.data.shape}
              onChange={(e) => updateSelectedNode({ shape: e.target.value as DiagramShape })}
              className="border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-[11px] text-neutral-700 outline-none"
            >
              <option value="rect">Rect</option>
              <option value="diamond">Diamond</option>
              <option value="oval">Oval</option>
              <option value="hex">Hex</option>
            </select>
          </div>
        </div>
      )}
    </div>
  )
}

export function DiagramEditor(props: DiagramEditorProps) {
  return (
    <ReactFlowProvider>
      <DiagramEditorInner {...props} />
    </ReactFlowProvider>
  )
}
