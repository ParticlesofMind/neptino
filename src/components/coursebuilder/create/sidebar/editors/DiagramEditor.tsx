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
import { EditorPreviewFrame } from "./editor-preview-frame"
import { EditorSplitLayout } from "./editor-split-layout"
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
        selected ? "border-[#9eb9da] ring-2 ring-[#dbe8f6]" : "border-neutral-300",
      ].join(" ")}
    >
      <span className={isDiamond ? "inline-block -rotate-45" : ""}>{data.label || "Node"}</span>
    </div>
  )
})

const nodeTypes = { shapeNode: ShapeNode }

type DiagramNodeType = Node<DiagramNodeData>
type DiagramEdgeType = Edge

function areStoredNodesEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

function areStoredEdgesEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

function DiagramEditorInner({ content, onChange }: DiagramEditorProps) {
  const title = typeof content.title === "string" ? content.title : ""
  const initialNodes = useMemo(() => parseNodes(content.nodes), [content.nodes])
  const initialEdges = useMemo(() => parseEdges(content.edges), [content.edges])

  const [nodes, setNodes, onNodesChange] = useNodesState<DiagramNodeType>(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState<DiagramEdgeType>(initialEdges)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const diagramType = typeof content.diagramType === "string" ? content.diagramType : "flowchart"
  const storedNodes = useMemo(() => toStoredNodes(nodes), [nodes])
  const storedEdges = useMemo(() => toStoredEdges(edges), [edges])
  const initialStoredNodes = useMemo(() => toStoredNodes(initialNodes), [initialNodes])
  const initialStoredEdges = useMemo(() => toStoredEdges(initialEdges), [initialEdges])

  useEffect(() => {
    setNodes((currentNodes) => (
      areStoredNodesEqual(initialStoredNodes, toStoredNodes(currentNodes)) ? currentNodes : initialNodes
    ))
  }, [content.nodes, initialNodes, initialStoredNodes, setNodes])

  useEffect(() => {
    setEdges((currentEdges) => (
      areStoredEdgesEqual(initialStoredEdges, toStoredEdges(currentEdges)) ? currentEdges : initialEdges
    ))
  }, [content.edges, initialEdges, initialStoredEdges, setEdges])

  useEffect(() => {
    if (!areStoredNodesEqual(content.nodes, storedNodes)) {
      onChange("nodes", storedNodes)
    }
  }, [content.nodes, onChange, storedNodes])

  useEffect(() => {
    if (!areStoredEdgesEqual(content.edges, storedEdges)) {
      onChange("edges", storedEdges)
    }
  }, [content.edges, onChange, storedEdges])

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
    <EditorSplitLayout
      sidebarWidthClassName="md:w-[26rem] xl:w-[30rem]"
      sidebar={(
        <div className="flex h-full flex-col overflow-auto bg-white">
          <div className="space-y-3 border-b border-neutral-100 px-4 py-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
                Diagram setup
              </p>
              <select
                value={diagramType}
                onChange={(e) => onChange("diagramType", e.target.value)}
                className="min-h-9 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-[11px] text-neutral-700 outline-none"
              >
                <option value="flowchart">Flowchart</option>
                <option value="concept-map">Concept Map</option>
                <option value="cycle">Cycle</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={addNode}
                className="inline-flex min-h-10 items-center justify-center gap-1 rounded-md border border-neutral-200 bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-700 transition-colors hover:bg-neutral-50"
              >
                <Plus size={10} /> Add node
              </button>

              <button
                type="button"
                onClick={removeSelected}
                disabled={!selectedNodeId}
                className="inline-flex min-h-10 items-center justify-center gap-1 rounded-md border border-neutral-200 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-600 hover:bg-neutral-50 disabled:opacity-40"
              >
                <Trash2 size={10} /> Remove
              </button>
            </div>
          </div>

          <div className="space-y-2 border-b border-neutral-100 px-4 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
              Layout
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(["auto", "horizontal", "vertical", "circular"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => applyLayout(mode)}
                  className="min-h-10 rounded-md border border-neutral-200 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-600 hover:bg-neutral-50"
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 px-4 py-4">
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
                Selected node
              </p>

              {selectedNode ? (
                <div className="mt-3 grid grid-cols-1 gap-2">
                  <input
                    type="text"
                    value={selectedNode.data.label}
                    onChange={(e) => updateSelectedNode({ label: e.target.value })}
                    className="min-h-10 rounded-md border border-neutral-200 bg-white px-3 py-2.5 text-[11px] text-neutral-700 outline-none focus:border-neutral-400"
                    placeholder="Node label"
                  />
                  <select
                    value={selectedNode.data.shape}
                    onChange={(e) => updateSelectedNode({ shape: e.target.value as DiagramShape })}
                    className="min-h-10 rounded-md border border-neutral-200 bg-white px-3 py-2.5 text-[11px] text-neutral-700 outline-none"
                  >
                    <option value="rect">Rect</option>
                    <option value="diamond">Diamond</option>
                    <option value="oval">Oval</option>
                    <option value="hex">Hex</option>
                  </select>
                </div>
              ) : (
                <p className="mt-3 text-[11px] leading-relaxed text-neutral-400">
                  Select a node in the preview card to rename it or change its shape.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      preview={(
        <div className="flex h-full min-h-0 items-center justify-center px-6 py-6 md:px-8">
          <EditorPreviewFrame
            cardType="diagram"
            title={title}
            onTitleChange={(next) => onChange("title", next)}
            className="w-full max-w-5xl"
            bodyClassName="overflow-hidden"
          >
            <div className="border-b border-neutral-100 px-5 py-3">
              <div className="flex items-center justify-between gap-3 text-[10px] text-neutral-400">
                <span>{nodes.length} nodes</span>
                <span>{edges.length} connections</span>
              </div>
            </div>
            <div className="h-[460px] bg-neutral-50">
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
          </EditorPreviewFrame>
        </div>
      )}
    />
  )
}

export function DiagramEditor(props: DiagramEditorProps) {
  return (
    <ReactFlowProvider>
      <DiagramEditorInner {...props} />
    </ReactFlowProvider>
  )
}
