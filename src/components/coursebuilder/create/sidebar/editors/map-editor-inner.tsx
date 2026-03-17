"use client"

import "leaflet/dist/leaflet.css"
import { useEffect, useMemo } from "react"
import {
  Tooltip,
  MapContainer,
  TileLayer,
  CircleMarker,
  Rectangle,
  useMap,
  useMapEvents,
} from "react-leaflet"
import { Layers, LocateFixed, Map as MapIcon } from "lucide-react"
import {
  TILE_LAYERS,
  OVERLAY_LAYERS,
  clamp,
  generateDemoPoints,
  generateDemoChoropleth,
  normalizeOverlayLayers,
  type MapStyleName,
  type OverlayLayer,
} from "./map-editor-config"
import { EditorSplitLayout } from "./editor-split-layout"
import { EditorPreviewFrame } from "./editor-preview-frame"
import type { MapEditorProps } from "./types"
// ── Internal helpers ─────────────────────────────────────────────────────────

/** Syncs external center/zoom state into the Leaflet map instance. */
function ViewSyncer({
  lat,
  lng,
  zoom,
}: {
  lat: number
  lng: number
  zoom: number
}) {
  const map = useMap()

  useEffect(() => {
    const center = map.getCenter()
    const currentZoom = map.getZoom()
    const needsSync =
      Math.abs(center.lat - lat) > 0.0001 ||
      Math.abs(center.lng - lng) > 0.0001 ||
      Math.abs(currentZoom - zoom) > 0.0001

    if (needsSync) {
      map.setView([lat, lng], zoom, { animate: false })
    }
  }, [lat, lng, map, zoom])

  return null
}

/** Emits onChange events when the user pans/zooms the map. */
function MapEventBridge({
  onChange,
}: {
  onChange: (key: string, value: unknown) => void
}) {
  useMapEvents({
    moveend(evt) {
      const c = evt.target.getCenter()
      const z = evt.target.getZoom()
      onChange("lat", Number(c.lat.toFixed(4)))
      onChange("lng", Number(c.lng.toFixed(4)))
      onChange("zoom", Number(z.toFixed(2)))
    },
  })
  return null
}
// ── Choropleth color helper ───────────────────────────────────────────────────

function scoreToColor(score: number): string {
  const low = [219, 234, 254] // blue-100
  const high = [30, 64, 175]  // blue-800
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

  const tile = TILE_LAYERS[mapLayer]

  const demoPoints = useMemo(() => generateDemoPoints(lat, lng), [lat, lng])
  const demoCells = useMemo(() => generateDemoChoropleth(lat, lng), [lat, lng])

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
      sidebarWidthClassName="md:w-[26rem] xl:w-[30rem]"
      preview={(
        <div className="flex h-full min-h-0 items-center justify-center px-6 py-6 md:px-8">
          <EditorPreviewFrame
            cardType="map"
            title={title}
            onTitleChange={(next) => onChange("title", next)}
            className="w-full max-w-5xl"
            bodyClassName="overflow-hidden"
          >
            <div className="border-b border-neutral-100 px-5 py-3">
              <div className="flex items-center justify-between gap-3 text-[10px] text-neutral-400">
                <span className="inline-flex items-center gap-1">
                  <MapIcon size={11} /> Leaflet + OpenStreetMap
                </span>
                <span>
                  {lat.toFixed(3)}, {lng.toFixed(3)} | z{zoom.toFixed(1)}
                </span>
              </div>
            </div>
            <div className="h-[420px] overflow-hidden bg-neutral-100">
              <MapContainer
                center={[lat, lng]}
                zoom={zoom}
                style={{ height: "100%", width: "100%" }}
                zoomControl={false}
                scrollWheelZoom={false}
                attributionControl={false}
              >
                <ViewSyncer lat={lat} lng={lng} zoom={zoom} />
                <MapEventBridge onChange={onChange} />
                <TileLayer url={tile.url} attribution={tile.attribution} />

                {layers.includes("Choropleth") &&
                  demoCells.map((cell) => (
                    <Rectangle
                      key={cell.id}
                      bounds={[
                        [cell.bounds[0], cell.bounds[1]],
                        [cell.bounds[2], cell.bounds[3]],
                      ]}
                      pathOptions={{
                        color: scoreToColor(cell.score),
                        fillColor: scoreToColor(cell.score),
                        fillOpacity: 0.45,
                        weight: 1,
                      }}
                    />
                  ))}

                {layers.includes("Points") &&
                  demoPoints.map((pt) => (
                    <CircleMarker
                      key={pt.label}
                      center={[pt.lat, pt.lng]}
                      radius={6}
                      pathOptions={{
                        color: "#1e40af",
                        fillColor: "#3b82f6",
                        fillOpacity: 0.8,
                        weight: 1.5,
                      }}
                    >
                      {layers.includes("Labels") && (
                        <Tooltip direction="top" offset={[0, -8]} opacity={0.95} permanent>
                          <span className="text-[10px] font-medium">{pt.label}</span>
                        </Tooltip>
                      )}
                    </CircleMarker>
                  ))}

                {!layers.includes("Points") && layers.includes("Labels") &&
                  demoPoints.map((pt) => (
                    <CircleMarker
                      key={`${pt.label}-label`}
                      center={[pt.lat, pt.lng]}
                      radius={1}
                      pathOptions={{
                        opacity: 0,
                        fillOpacity: 0,
                        weight: 0,
                      }}
                    >
                      <Tooltip direction="top" offset={[0, -8]} opacity={0.95} permanent>
                        <span className="text-[10px] font-medium">{pt.label}</span>
                      </Tooltip>
                    </CircleMarker>
                  ))}
              </MapContainer>
            </div>
          </EditorPreviewFrame>
        </div>
      )}
      sidebar={(
        <div className="space-y-3 px-4 py-4">
          <div className="space-y-2 rounded-xl border border-neutral-200 bg-white px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
              Quick presets
            </p>
            <div className="flex gap-1.5 flex-wrap">
              {presets.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    onChange("lat", p.lat)
                    onChange("lng", p.lng)
                    onChange("zoom", p.zoom)
                  }}
                  className="rounded-md border border-neutral-200 px-2.5 py-1 text-[11px] text-neutral-600 hover:bg-neutral-50"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-neutral-200 bg-white px-4 py-3">
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

          <div className="space-y-2 rounded-xl border border-neutral-200 bg-white px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
              Map style
            </p>
            <div className="flex gap-1.5 flex-wrap">
              {(Object.keys(TILE_LAYERS) as MapStyleName[]).map((styleName) => (
                <button
                  key={styleName}
                  type="button"
                  onClick={() => onChange("mapLayer", styleName)}
                  className={[
                    "rounded-md border px-2.5 py-1 text-[11px] transition-colors",
                    mapLayer === styleName
                      ? "border-[#9eb9da] bg-[#dbe8f6] text-[#233f5d] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]"
                      : "border-neutral-200 text-neutral-600 hover:bg-neutral-50",
                  ].join(" ")}
                >
                  {styleName}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 rounded-xl border border-neutral-200 bg-white px-4 py-3">
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
