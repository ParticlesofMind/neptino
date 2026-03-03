"use client"

import { useEffect, useRef, useState } from "react"
import { Map as MapIcon } from "lucide-react"

interface MapEditorProps {
  content: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
}

function latLngToBbox(lat: number, lng: number, zoom: number) {
  // Approximate bounding box for OSM embed based on zoom level
  const delta = 180 / Math.pow(2, zoom)
  const west = lng - delta
  const east = lng + delta
  const south = lat - delta * 0.6
  const north = lat + delta * 0.6
  return `${west},${south},${east},${north}`
}

const MAP_LAYERS: Record<string, string> = {
  Standard: "mapnik",
  "Cycle Map": "cycle",
  Transport: "transport",
}

export function MapEditor({ content, onChange }: MapEditorProps) {
  const [iframeKey, setIframeKey] = useState(0)
  const latRef = useRef<HTMLInputElement>(null)
  const lngRef = useRef<HTMLInputElement>(null)

  const lat = typeof content.lat === "number" ? content.lat : 48.85
  const lng = typeof content.lng === "number" ? content.lng : 2.35
  const zoom = typeof content.zoom === "number" ? content.zoom : 8
  const mapLayer = typeof content.mapLayer === "string" ? content.mapLayer : "Standard"
  const layers = Array.isArray(content.layers) ? content.layers as string[] : []

  const bbox = latLngToBbox(lat, lng, zoom)
  const osmUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=${MAP_LAYERS[mapLayer] ?? "mapnik"}&marker=${lat},${lng}`

  const refresh = () => setIframeKey((k) => k + 1)

  const presets = [
    { label: "World", lat: 20, lng: 0, zoom: 2 },
    { label: "Europe", lat: 50, lng: 10, zoom: 4 },
    { label: "North America", lat: 40, lng: -100, zoom: 4 },
    { label: "Asia", lat: 35, lng: 100, zoom: 4 },
  ]

  const applyPreset = (p: { lat: number; lng: number; zoom: number }) => {
    onChange("lat", p.lat)
    onChange("lng", p.lng)
    onChange("zoom", p.zoom)
    setIframeKey((k) => k + 1)
  }

  const toggleLayer = (label: string) => {
    const next = layers.includes(label)
      ? layers.filter((l) => l !== label)
      : [...layers, label]
    onChange("layers", next)
  }

  return (
    <div className="flex h-full flex-col overflow-auto bg-white">
      {/* Map embed */}
      <div className="px-4 pt-4 pb-3 border-b border-neutral-100">
        <div className="overflow-hidden border border-neutral-200 bg-neutral-100" style={{ height: 240 }}>
          <iframe
            key={iframeKey}
            src={osmUrl}
            className="w-full h-full border-0"
            title="Map preview"
            loading="lazy"
          />
        </div>
        <p className="mt-1.5 text-[10px] text-neutral-400 text-center">
          Map via OpenStreetMap · <a href={`https://www.openstreetmap.org/#map=${zoom}/${lat}/${lng}`} target="_blank" rel="noopener noreferrer" className="underline">Open in OSM</a>
        </p>
      </div>

      {/* Presets */}
      <div className="px-4 py-3 border-b border-neutral-100 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Quick presets</p>
        <div className="flex gap-1.5 flex-wrap">
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => applyPreset(p)}
              className="border border-neutral-200 px-2.5 py-1 text-[11px] text-neutral-600 hover:bg-neutral-50"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Viewport controls */}
      <div className="px-4 py-3 border-b border-neutral-100 space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Viewport</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-[11px] font-medium text-neutral-600">Latitude</span>
            <input
              ref={latRef}
              type="number"
              value={lat}
              min={-90}
              max={90}
              step={0.01}
              onChange={(e) => onChange("lat", Number(e.target.value))}
              onBlur={refresh}
              className="w-full border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-[12px] font-mono text-neutral-700 outline-none focus:border-neutral-400"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-medium text-neutral-600">Longitude</span>
            <input
              ref={lngRef}
              type="number"
              value={lng}
              min={-180}
              max={180}
              step={0.01}
              onChange={(e) => onChange("lng", Number(e.target.value))}
              onBlur={refresh}
              className="w-full border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-[12px] font-mono text-neutral-700 outline-none focus:border-neutral-400"
            />
          </label>
        </div>

        <label className="block space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-neutral-600">Zoom</span>
            <span className="text-[11px] text-neutral-400">{zoom}</span>
          </div>
          <input
            type="range"
            min={1}
            max={18}
            step={1}
            value={zoom}
            onChange={(e) => onChange("zoom", Number(e.target.value))}
            onMouseUp={refresh}
            onTouchEnd={refresh}
            className="w-full accent-neutral-900"
          />
          <div className="flex justify-between text-[10px] text-neutral-400">
            <span>World</span>
            <span>City</span>
            <span>Street</span>
          </div>
        </label>
      </div>

      {/* Map style */}
      <div className="px-4 py-3 border-b border-neutral-100 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Map style</p>
        <div className="flex gap-1.5 flex-wrap">
          {Object.keys(MAP_LAYERS).map((layerName) => (
            <button
              key={layerName}
              type="button"
              onClick={() => { onChange("mapLayer", layerName); setIframeKey((k) => k + 1) }}
              className={[
                "border px-2.5 py-1 text-[11px] transition-colors",
                mapLayer === layerName ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 text-neutral-600 hover:bg-neutral-50",
              ].join(" ")}
            >
              {layerName}
            </button>
          ))}
        </div>
      </div>

      {/* Overlays */}
      <div className="px-4 py-3 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Overlays</p>
        {["Labels", "Choropleth", "Points"].map((l) => (
          <label key={l} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={layers.includes(l)}
              onChange={() => toggleLayer(l)}
              className="accent-neutral-900"
              disabled={l !== "Labels"}
            />
            <span className={`text-[11px] ${l !== "Labels" ? "text-neutral-400" : "text-neutral-600"}`}>
              {l}
              {l !== "Labels" && <span className="ml-1 text-[9px] bg-neutral-100 px-1 rounded text-neutral-400">coming soon</span>}
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}
