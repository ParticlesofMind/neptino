"use client"

import dynamic from "next/dynamic"
import type { MapEditorProps } from "./types"

const MapEditorInner = dynamic(
  () => import("./map-editor-inner").then((m) => ({ default: m.MapEditorInner })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[260px] items-center justify-center bg-neutral-50 text-[12px] text-neutral-400">
        Loading map…
      </div>
    ),
  },
)

export function MapEditor({ content, onChange }: MapEditorProps) {
  return <MapEditorInner content={content} onChange={onChange} />
}
