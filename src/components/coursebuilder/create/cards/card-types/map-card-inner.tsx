"use client"

import { useMemo } from "react"
import type { CardRenderProps } from "../CardRegistry"
import {
  TILE_LAYERS,
  generateDemoPoints,
  generateDemoChoropleth,
  type DemoCell,
  type DemoPoint,
  type MapStyleName,
  type OverlayLayer,
  type TerritoryLayer,
} from "../../sidebar/editors/map-editor-config"
import { LeafletMapView } from "./leaflet-map-view"
import { useSimulationTime } from "./simulation-time-context"

// ─── MapCardInner ──────────────────────────────────────────────────────────────

export default function MapCardInner({ card }: CardRenderProps) {
  const simulation = useSimulationTime()
  const { content } = card
  const lat = typeof content.lat === "number" ? content.lat : 20
  const lng = typeof content.lng === "number" ? content.lng : 10
  const zoom = typeof content.zoom === "number" ? content.zoom : 2
  const mapLayer =
    (typeof content.mapLayer === "string" ? content.mapLayer : "Standard") as MapStyleName
  const layers: OverlayLayer[] = Array.isArray(content.layers)
    ? (content.layers as OverlayLayer[])
    : []
  const atlasPoints: DemoPoint[] = Array.isArray(content.points)
    ? (content.points as DemoPoint[])
    : []
  const atlasCells: DemoCell[] = Array.isArray(content.cells)
    ? (content.cells as DemoCell[])
    : []
  const territoryLayers = useMemo<TerritoryLayer[]>(() => (
    Array.isArray(content.territories)
      ? (content.territories as TerritoryLayer[])
      : Array.isArray(content.geojsonLayers)
        ? (content.geojsonLayers as TerritoryLayer[])
        : []
  ), [content.geojsonLayers, content.territories])

  const tile = TILE_LAYERS[mapLayer] ?? TILE_LAYERS.Standard
  const demoPoints = atlasPoints.length > 0 ? atlasPoints : generateDemoPoints(lat, lng)
  const demoCells = atlasCells.length > 0 ? atlasCells : generateDemoChoropleth(lat, lng)
  const visibleTerritories = useMemo(() => {
    if (!simulation) return territoryLayers
    const timedTerritories = territoryLayers.filter((territory) => (
      typeof territory.startYear === "number" || typeof territory.endYear === "number"
    ))
    if (timedTerritories.length === 0) return territoryLayers

    const visible = timedTerritories.filter((territory) => {
      const startYear = territory.startYear ?? Number.NEGATIVE_INFINITY
      const endYear = territory.endYear ?? Number.POSITIVE_INFINITY
      return simulation.year >= startYear && simulation.year <= endYear
    })

    return visible.length > 0 ? visible : timedTerritories
  }, [simulation, territoryLayers])

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
      territories={visibleTerritories}
      fitToTerritories={visibleTerritories.length > 0}
      style={{ height: "100%", width: "100%", minHeight: 200 }}
    />
  )
}
