"use client"

import { useMemo } from "react"
import { Layers, LocateFixed, Map as MapIcon } from "lucide-react"
import {
  TILE_LAYERS,
  OVERLAY_LAYERS,
  clamp,
  generateDemoPoints,
  generateDemoChoropleth,
  normalizeOverlayLayers,
  type DemoCell,
  type DemoPoint,
  type MapStyleName,
  type OverlayLayer,
  type TerritoryLayer,
} from "./map-editor-config"
import { EditorSplitLayout } from "./editor-split-layout"
import { EditorPreviewFrame } from "./editor-preview-frame"
import type { MapEditorProps } from "./types"
import { LeafletMapView } from "../../cards/card-types/leaflet-map-view"
// ── Choropleth color helper ───────────────────────────────────────────────────

function scoreToColor(score: number): string {
  const low = [219, 232, 246] // #dbe8f6 entity-blue-light
  const high = [58, 110, 160]  // #3a6ea0 entity-blue-dark
  const r = Math.round(low[0] + (high[0] - low[0]) * score)
  const g = Math.round(low[1] + (high[1] - low[1]) * score)
  const b = Math.round(low[2] + (high[2] - low[2]) * score)
  return `rgb(${r},${g},${b})`
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MapEditorInner({ content, onChange }: MapEditorProps) {
  const title = typeof content.title === "string" ? content.title : ""
  const lat = typeof content.lat === "number" ? content.lat : 40.7128
  const lng = typeof content.lng === "number" ? content.lng : -74.006
  const zoom = typeof content.zoom === "number" ? content.zoom : 8
  const mapLayer = (
    typeof content.mapLayer === "string" ? content.mapLayer : "Standard"
  ) as MapStyleName
  const layers = useMemo(() => normalizeOverlayLayers(content.layers), [content.layers])
  const atlasPoints: DemoPoint[] = Array.isArray(content.points)
    ? (content.points as DemoPoint[])
    : []
  const atlasCells: DemoCell[] = Array.isArray(content.cells)
    ? (content.cells as DemoCell[])
    : []
  const territories: TerritoryLayer[] = Array.isArray(content.territories)
    ? (content.territories as TerritoryLayer[])
    : Array.isArray(content.geojsonLayers)
      ? (content.geojsonLayers as TerritoryLayer[])
      : []

  const tile = TILE_LAYERS[mapLayer]

  const demoPoints = useMemo(() => generateDemoPoints(lat, lng), [lat, lng])
  const demoCells = useMemo(() => generateDemoChoropleth(lat, lng), [lat, lng])
  const points = atlasPoints.length > 0 ? atlasPoints : demoPoints
  const cells = atlasCells.length > 0 ? atlasCells : demoCells

  const normalizeViewport = () => {
    onChange("lat", clamp(lat, -85, 85))
    onChange("lng", clamp(lng, -180, 180))
    onChange("zoom", clamp(zoom, 1, 18))
  }

  const presets = [
    { label: "World", lat: 20, lng: 0, zoom: 2 },
    { label: "Europe", lat: 50, lng: 10, zoom: 4 },
    { label: "N. America", lat: 40, lng: -100, zoom: 4 },
    { label: "Asia", lat: 35, lng: 100, zoom: 4 },
  ]

  const toggleLayer = (label: OverlayLayer) => {
    const next = layers.includes(label)
      ? layers.filter((l) => l !== label)
      : [...layers, label]
    onChange("layers", next)
  }

  return (
    <EditorSplitLayout
      sidebarWidthClassName="md:w-[30rem] md:flex-none xl:w-[32rem]"
      preview={(
        <div className="flex h-full min-h-0 items-center justify-center px-3 py-4 md:px-4">
          <EditorPreviewFrame
            cardType="map"
            title={title}
            onTitleChange={(next) => onChange("title", next)}
            className="w-full"
            bodyClassName="overflow-hidden"
          >
            <div className="border-b border-neutral-100 px-4 py-2.5">
              <div className="flex items-center justify-between gap-3 text-[10px] text-neutral-400">
                <span className="inline-flex items-center gap-1">
                  <MapIcon size={11} /> Leaflet + OpenStreetMap
                </span>
                <span>
                  {lat.toFixed(3)}, {lng.toFixed(3)} | z{zoom.toFixed(1)}
                </span>
              </div>
            </div>
            <div className="h-[340px] overflow-hidden bg-neutral-100">
              <LeafletMapView
                lat={lat}
                lng={lng}
                zoom={zoom}
                tileUrl={tile.url}
                tileAttribution={tile.attribution}
                layers={layers}
                points={points}
                cells={cells}
                territories={territories}
                fitToTerritories={territories.length > 0}
                interactive
                choroplethColor={scoreToColor}
                onViewportChange={(nextLat, nextLng, nextZoom) => {
                  onChange("lat", nextLat)
                  onChange("lng", nextLng)
                  onChange("zoom", nextZoom)
                }}
                style={{ height: "100%", width: "100%" }}
                attributionControl={false}
                zoomControl={false}
              />
            </div>
          </EditorPreviewFrame>
        </div>
      )}
      sidebar={(
        <div className="space-y-2.5 px-3 py-3">
          <div className="space-y-2 rounded-lg border border-neutral-200 bg-white px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
              Quick presets
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {presets.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    onChange("lat", p.lat)
                    onChange("lng", p.lng)
                    onChange("zoom", p.zoom)
                  }}
                  className="rounded-md border border-neutral-200 px-2 py-1 text-left text-[11px] text-neutral-600 hover:bg-neutral-50"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5 rounded-lg border border-neutral-200 bg-white px-3 py-2.5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
                Viewport
              </p>
              <button
                type="button"
                onClick={normalizeViewport}
                className="inline-flex items-center gap-1 rounded-md border border-neutral-200 px-2 py-1 text-[10px] text-neutral-600 hover:bg-neutral-50"
              >
                <LocateFixed size={11} /> Normalize
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
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

          <div className="space-y-2 rounded-lg border border-neutral-200 bg-white px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
              Map style
            </p>
            <div className="grid max-h-24 grid-cols-2 gap-1.5 overflow-y-auto pr-1">
              {(Object.keys(TILE_LAYERS) as MapStyleName[]).map((styleName) => (
                <button
                  key={styleName}
                  type="button"
                  onClick={() => onChange("mapLayer", styleName)}
                  className={[
                    "rounded-md border px-2 py-1 text-left text-[11px] transition-colors",
                    mapLayer === styleName
                      ? "border-[#9eb9da] bg-[#dbe8f6] text-[#3a6ea0] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]"
                      : "border-neutral-200 text-neutral-600 hover:bg-neutral-50",
                  ].join(" ")}
                >
                  {styleName}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 rounded-lg border border-neutral-200 bg-white px-3 py-2.5">
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
                <span className="text-[11px] text-neutral-600">{layerName}</span>
              </label>
            ))}
            <p className="text-[10px] text-neutral-400">
              Label, choropleth, and point overlays are rendered live on the map.
            </p>
          </div>
        </div>
      )}
    />
  )
}
