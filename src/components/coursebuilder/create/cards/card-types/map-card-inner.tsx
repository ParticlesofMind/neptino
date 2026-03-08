"use client"

import "leaflet/dist/leaflet.css"
import { useEffect, useRef } from "react"
import {
  MapContainer,
  TileLayer,
  useMap,
  useMapEvents,
  CircleMarker,
  Rectangle,
} from "react-leaflet"
import type { CardRenderProps } from "../CardRegistry"
import {
  TILE_LAYERS,
  generateDemoPoints,
  generateDemoChoropleth,
  type MapStyleName,
  type OverlayLayer,
} from "../../sidebar/editors/map-editor-config"

// ─── Internal map sync components ─────────────────────────────────────────────

function ViewSync({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  const map = useMap()
  const prev = useRef({ lat, lng, zoom })
  useEffect(() => {
    const p = prev.current
    if (p.lat !== lat || p.lng !== lng || p.zoom !== zoom) {
      map.setView([lat, lng], zoom)
      prev.current = { lat, lng, zoom }
    }
  }, [lat, lng, zoom, map])
  return null
}

function MapEventBridge({
  onMoveEnd,
}: {
  onMoveEnd: (lat: number, lng: number, zoom: number) => void
}) {
  useMapEvents({
    moveend: (e) => {
      const c = e.target.getCenter()
      onMoveEnd(
        Number(c.lat.toFixed(4)),
        Number(c.lng.toFixed(4)),
        Number(e.target.getZoom().toFixed(2)),
      )
    },
  })
  return null
}

// ─── MapCardInner ──────────────────────────────────────────────────────────────

export default function MapCardInner({ card }: CardRenderProps) {
  const { content } = card
  const lat = typeof content.lat === "number" ? content.lat : 20
  const lng = typeof content.lng === "number" ? content.lng : 10
  const zoom = typeof content.zoom === "number" ? content.zoom : 2
  const mapLayer =
    (typeof content.mapLayer === "string" ? content.mapLayer : "Standard") as MapStyleName
  const layers: OverlayLayer[] = Array.isArray(content.layers)
    ? (content.layers as OverlayLayer[])
    : []

  const tile = TILE_LAYERS[mapLayer] ?? TILE_LAYERS.Standard
  const demoPoints = generateDemoPoints(lat, lng)
  const demoCells = generateDemoChoropleth(lat, lng)

  return (
    <MapContainer
      center={[lat, lng]}
      zoom={zoom}
      style={{ height: "100%", width: "100%", minHeight: 200 }}
      scrollWheelZoom={false}
    >
      <TileLayer url={tile.url} attribution={tile.attribution} />
      <ViewSync lat={lat} lng={lng} zoom={zoom} />

      {/* Overlays (read-only display) */}
      {layers.includes("Choropleth") &&
        demoCells.map((cell) => (
          <Rectangle
            key={cell.id}
            bounds={[
              [cell.bounds[0], cell.bounds[1]],
              [cell.bounds[2], cell.bounds[3]],
            ]}
            pathOptions={{
              color: "#3b82f6",
              fillOpacity: cell.score * 0.55,
              weight: 1,
              opacity: 0.5,
            }}
          />
        ))}

      {layers.includes("Points") &&
        demoPoints.map((pt, i) => (
          <CircleMarker
            key={i}
            center={[pt.lat, pt.lng]}
            radius={i === 0 ? 10 : 7}
            pathOptions={{ color: "#ef4444", fillOpacity: 0.8, weight: 1.5 }}
          />
        ))}
    </MapContainer>
  )
}
