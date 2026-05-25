"use client"

import type { CardRenderProps } from "../CardRegistry"
import {
  TILE_LAYERS,
  generateDemoPoints,
  generateDemoChoropleth,
  type MapStyleName,
  type OverlayLayer,
} from "../../sidebar/editors/map-editor-config"
import { LeafletMapView } from "./leaflet-map-view"

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
    <LeafletMapView
      lat={lat}
      lng={lng}
      zoom={zoom}
      tileUrl={tile.url}
      tileAttribution={tile.attribution}
      layers={layers}
      points={demoPoints}
      cells={demoCells}
      style={{ height: "100%", width: "100%", minHeight: 200 }}
    />
  )
}
