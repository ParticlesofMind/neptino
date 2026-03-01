"use client"

/**
 * RichCard — placeholder for canvas-backed card types (village-3d, rich-sim, interactive).
 *
 * When the PixiJS / Three.js renderer is wired up, this component receives a
 * ref to the canvas element and delegates all rendering to the external engine.
 * For now it renders an informational stub so layout can be validated.
 */

import { useEffect, useRef } from "react"
import type { DroppedCard, CardType } from "../../types"

interface RichCardProps {
  card: DroppedCard
  onRemove?: () => void
}

const CARD_TYPE_LABELS: Partial<Record<CardType, string>> = {
  "village-3d":  "3D Village Exploration",
  "rich-sim":    "Interactive Simulation",
  "interactive": "Interactive Canvas",
}

export function RichCard({ card, onRemove }: RichCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const label = CARD_TYPE_LABELS[card.cardType] ?? "Rich Card"

  useEffect(() => {
    // TODO: mount PixiJS / Three.js application onto canvasRef.current
    // The engine should be torn down in the cleanup return.
    return () => {
      // engine.destroy()
    }
  }, [card.cardId])

  return (
    <div
      className="group relative rounded border border-neutral-200 bg-neutral-900 shadow-sm overflow-hidden"
      style={{ width: card.dimensions.width || "100%", height: card.dimensions.height || 160 }}
    >
      {onRemove && (
        <button
          onClick={onRemove}
          className="absolute right-1 top-1 z-10 hidden h-5 w-5 items-center justify-center rounded bg-black/40 text-neutral-300 hover:text-white group-hover:flex"
          aria-label="Remove"
        >
          &times;
        </button>
      )}

      {/* Canvas target for PixiJS / Three.js */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        aria-label={label}
      />

      {/* Visible stub overlay — remove once the engine is mounted */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-500 pointer-events-none">
        <span className="text-[9px] uppercase tracking-widest">{label}</span>
        <span className="text-[8px] mt-1 opacity-50">Canvas renderer pending</span>
      </div>
    </div>
  )
}
