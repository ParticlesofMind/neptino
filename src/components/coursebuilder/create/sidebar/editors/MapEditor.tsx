"use client"

import dynamic from "next/dynamic"
import type { MapEditorProps } from "./types"

const MapEditorInner = dynamic(
  () => import("./map-editor-inner").then((m) => ({ default: m.MapEditorInner })),
  {
    ssr: false,
    loading: () => (
      <div className="h-[260px] rounded-xl border border-neutral-200 bg-neutral-50 p-3">
        <div className="h-4 w-24 rounded bg-neutral-200" />
        <div className="mt-3 h-[206px] rounded-lg bg-neutral-100" />
      </div>
    ),
  },
)

export function MapEditor({ content, onChange }: MapEditorProps) {
  return <MapEditorInner content={content} onChange={onChange} />
}
