"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import maplibregl, { type LngLatLike } from "maplibre-gl"
import { Layers, LocateFixed, Map as MapIcon } from "lucide-react"
import {
  MAP_STYLES,
  OVERLAY_LAYERS,
  clamp,
  ensureOverlaySources,
  setOverlayVisibility,
  type MapStyleName,
  type OverlayLayer,
} from "./map-editor-config"

interface MapEditorProps {
  content: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
}

export function MapEditor({ content, onChange }: MapEditorProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const [mapReady, setMapReady] = useState(false)

  const lat = typeof content.lat === "number" ? content.lat : 40.7128
  const lng = typeof content.lng === "number" ? content.lng : -74.006
  const zoom = typeof content.zoom === "number" ? content.zoom : 8
  const mapLayer = (typeof content.mapLayer === "string" ? content.mapLayer : "Standard") as MapStyleName
  const layers = useMemo(() => (Array.isArray(content.layers) ? content.layers as string[] : []), [content.layers])

  const center = useMemo(() => [lng, lat] as [number, number], [lat, lng])

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: MAP_STYLES[mapLayer],
      center: center as LngLatLike,
      zoom,
      cooperativeGestures: true,
    })

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right")

    map.on("load", () => {
      ensureOverlaySources(map, lat, lng)
      setOverlayVisibility(map, layers)
      setMapReady(true)
    })

    map.on("moveend", () => {
      const c = map.getCenter()
      const z = map.getZoom()
      onChange("lat", Number(c.lat.toFixed(4)))
      onChange("lng", Number(c.lng.toFixed(4)))
      onChange("zoom", Number(z.toFixed(2)))
    })

    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
      setMapReady(false)
    }
  }, [center, lat, lng, zoom, mapLayer, layers, onChange])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    map.setStyle(MAP_STYLES[mapLayer])
    map.once("styledata", () => {
      ensureOverlaySources(map, lat, lng)
      setOverlayVisibility(map, layers)
    })
  }, [mapLayer, mapReady, lat, lng, layers])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    map.easeTo({ center: center as LngLatLike, zoom: clamp(zoom, 1, 18), duration: 350 })
    ensureOverlaySources(map, lat, lng)
    setOverlayVisibility(map, layers)
  }, [center, zoom, lat, lng, layers, mapReady])

  const normalizeViewport = () => {
    onChange("lat", clamp(lat, -85, 85))
    onChange("lng", clamp(lng, -180, 180))
    onChange("zoom", clamp(zoom, 1, 18))
  }

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
  }

  const toggleLayer = (label: OverlayLayer) => {
    const next = layers.includes(label)
      ? layers.filter((l) => l !== label)
      : [...layers, label]
    onChange("layers", next)
  }

  return (
    <div className="flex h-full flex-col overflow-auto bg-white">
      {/* Map canvas */}
      <div className="px-4 pt-4 pb-3 border-b border-neutral-100">
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100" style={{ height: 260 }}>
          <div ref={mapContainerRef} className="h-full w-full" />
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] text-neutral-400">
          <span className="inline-flex items-center gap-1"><MapIcon size={11} /> MapLibre + OpenStreetMap</span>
          <span>{lat.toFixed(3)}, {lng.toFixed(3)} | z{zoom.toFixed(1)}</span>
        </div>
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
              className="rounded-md border border-neutral-200 px-2.5 py-1 text-[11px] text-neutral-600 hover:bg-neutral-50"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Viewport */}
      <div className="px-4 py-3 border-b border-neutral-100 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Viewport</p>
          <button
            type="button"
            onClick={normalizeViewport}
            className="inline-flex items-center gap-1 rounded-md border border-neutral-200 px-2 py-1 text-[10px] text-neutral-600 hover:bg-neutral-50"
          >
            <LocateFixed size={11} /> Normalize
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-[11px] font-medium text-neutral-600">Latitude</span>
            <input
              type="number"
              value={lat}
              min={-90}
              max={90}
              step={0.01}
              onChange={(e) => onChange("lat", Number(e.target.value))}
              className="w-full border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-[12px] font-mono text-neutral-700 outline-none focus:border-neutral-400"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-medium text-neutral-600">Longitude</span>
            <input
              type="number"
              value={lng}
              min={-180}
              max={180}
              step={0.01}
              onChange={(e) => onChange("lng", Number(e.target.value))}
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
            step={0.25}
            value={zoom}
            onChange={(e) => onChange("zoom", Number(e.target.value))}
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
          {(Object.keys(MAP_STYLES) as MapStyleName[]).map((layerName) => (
            <button
              key={layerName}
              type="button"
              onClick={() => onChange("mapLayer", layerName)}
              className={[
                "rounded-md border px-2.5 py-1 text-[11px] transition-colors",
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
        <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
          <Layers size={11} /> Overlays
        </p>
        {OVERLAY_LAYERS.map((layerName) => (
          <label key={layerName} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={layers.includes(layerName)}
              onChange={() => toggleLayer(layerName)}
              className="accent-neutral-900"
            />
            <span className="text-[11px] text-neutral-600">
              {layerName}
            </span>
          </label>
        ))}
        <p className="text-[10px] text-neutral-400">Choropleth and point overlays are now fully interactive on the map.</p>
      </div>
    </div>
  )
}
