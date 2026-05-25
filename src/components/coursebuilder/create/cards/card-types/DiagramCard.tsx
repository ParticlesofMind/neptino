"use client"

import { memo, useMemo } from "react"
import {
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  type Node,
  type NodeProps,
} from "@xyflow/react"

import type { CardRenderProps } from "../CardRegistry"
import { parseEdges, parseNodes, type DiagramNodeData, type DiagramShape } from "../../sidebar/editors/diagram-flow-utils"
import { ResourceCardFrame } from "./ResourceCardFrame"

const shapeClasses: Record<DiagramShape, string> = {
  rect: "rounded-md",
  diamond: "rotate-45 rounded-sm",
  oval: "rounded-full",
  hex: "[clip-path:polygon(12%_0,88%_0,100%_50%,88%_100%,12%_100%,0_50%)]",
}

const ShapeNode = memo(function ShapeNode({ data, selected }: NodeProps<Node<DiagramNodeData>>) {
  const isDiamond = data.shape === "diamond"

  return (
    <div
      className={[
        "min-w-[112px] border bg-white px-3 py-2 text-center text-[12px] font-medium text-neutral-700 shadow-sm",
        shapeClasses[data.shape],
        selected ? "border-[#9eb9da] ring-2 ring-[#dbe8f6]" : "border-neutral-300",
      ].join(" ")}
    >
      <span className={isDiamond ? "inline-block -rotate-45" : ""}>{data.label || "Node"}</span>
    </div>
  )
})

const nodeTypes = { shapeNode: ShapeNode }

export function DiagramCard({ card, onRemove }: CardRenderProps) {
  const diagramType = typeof card.content.diagramType === "string" ? card.content.diagramType : "flowchart"
  const nodes = useMemo(() => parseNodes(card.content.nodes), [card.content.nodes])
  const edges = useMemo(() => parseEdges(card.content.edges), [card.content.edges])
  const graphHeight = Math.max(240, Math.min(560, (card.dimensions.height || 320) - 54))

  return (
    <ResourceCardFrame
      card={card}
      onRemove={onRemove}
      bodyClassName="p-0"
    >
      <div className="border-b border-neutral-100 bg-neutral-50/70 px-3 py-2">
        <div className="flex flex-wrap items-center gap-2 text-[10px] text-neutral-500">
          <span className="capitalize">{diagramType}</span>
          <span>{nodes.length} nodes</span>
          <span>{edges.length} connections</span>
        </div>
      </div>

      {nodes.length === 0 ? (
        <div
          className="flex items-center justify-center bg-neutral-50 px-4 text-center"
          style={{ height: graphHeight }}
        >
          <p className="max-w-64 text-[12px] leading-relaxed text-neutral-500">
            Add diagram nodes in the Make panel to render a navigable concept map here.
          </p>
        </div>
      ) : (
        <div
          className="bg-neutral-50"
          style={{ height: graphHeight }}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          onWheel={(event) => event.stopPropagation()}
        >
          <ReactFlowProvider>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              fitView
              minZoom={0.35}
              maxZoom={1.7}
              nodesConnectable={false}
              nodesDraggable={false}
              elementsSelectable={false}
              panOnDrag
              zoomOnPinch
              zoomOnScroll
              proOptions={{ hideAttribution: true }}
              className="bg-neutral-50"
            >
              <Controls showInteractive={false} />
              <Background gap={20} color="#e5e7eb" />
            </ReactFlow>
          </ReactFlowProvider>
        </div>
      )}
    </ResourceCardFrame>
  )
}
