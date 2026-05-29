"use client"

import "leaflet/dist/leaflet.css"
import { useEffect, useRef, type CSSProperties, type SyntheticEvent } from "react"
import L from "leaflet"
import { LocateFixed, Minus, Plus } from "lucide-react"
import type { Feature, FeatureCollection, GeoJsonObject, Geometry, GeometryCollection } from "geojson"
import type { OverlayLayer, TerritoryLayer } from "../../sidebar/editors/map-editor-config"

interface DemoPoint {
  label: string
  lat: number
  lng: number
}

interface DemoCell {
  id: string | number
  bounds: [number, number, number, number]
  score: number
}

interface LeafletMapViewProps {
  lat: number
  lng: number
  zoom: number
  tileUrl: string
  tileAttribution: string
  layers: OverlayLayer[]
  points: DemoPoint[]
  cells: DemoCell[]
  territories?: TerritoryLayer[]
  className?: string
  style?: CSSProperties
  interactive?: boolean
  zoomControl?: boolean
  attributionControl?: boolean
  fitToTerritories?: boolean
  mapControls?: boolean
  onViewportChange?: (lat: number, lng: number, zoom: number) => void
  choroplethColor?: (score: number) => string
}

type LeafletContainer = HTMLDivElement & {
  _leaflet_id?: number
}

function clearLeafletContainer(container: LeafletContainer) {
  delete container._leaflet_id
}

type CoordinateBounds = {
  south: number
  west: number
  north: number
  east: number
}

function emptyBounds(): CoordinateBounds {
  return {
    south: Number.POSITIVE_INFINITY,
    west: Number.POSITIVE_INFINITY,
    north: Number.NEGATIVE_INFINITY,
    east: Number.NEGATIVE_INFINITY,
  }
}

function extendBounds(bounds: CoordinateBounds, lng: number, lat: number) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
  bounds.south = Math.min(bounds.south, lat)
  bounds.west = Math.min(bounds.west, lng)
  bounds.north = Math.max(bounds.north, lat)
  bounds.east = Math.max(bounds.east, lng)
}

function collectCoordinateBounds(value: unknown, bounds: CoordinateBounds) {
  if (!Array.isArray(value)) return

  if (
    value.length >= 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number"
  ) {
    extendBounds(bounds, value[0], value[1])
    return
  }

  value.forEach((entry) => collectCoordinateBounds(entry, bounds))
}

function collectGeoJsonBounds(geojson: GeoJsonObject, bounds: CoordinateBounds) {
  if (geojson.type === "FeatureCollection") {
    const collection = geojson as FeatureCollection<Geometry>
    collection.features.forEach((feature) => {
      if (feature.geometry) collectGeoJsonBounds(feature.geometry as GeoJsonObject, bounds)
    })
    return
  }

  if (geojson.type === "Feature") {
    const feature = geojson as Feature<Geometry>
    if (feature.geometry) collectGeoJsonBounds(feature.geometry as GeoJsonObject, bounds)
    return
  }

  if (geojson.type === "GeometryCollection") {
    const collection = geojson as GeometryCollection<Geometry>
    collection.geometries.forEach((geometry) => collectGeoJsonBounds(geometry as GeoJsonObject, bounds))
    return
  }

  collectCoordinateBounds((geojson as { coordinates?: unknown }).coordinates, bounds)
}

function territoryBounds(territories: TerritoryLayer[]): L.LatLngBoundsExpression | null {
  const bounds = emptyBounds()
  territories.forEach((territory) => collectGeoJsonBounds(territory.geojson as GeoJsonObject, bounds))

  if (
    !Number.isFinite(bounds.south) ||
    !Number.isFinite(bounds.west) ||
    !Number.isFinite(bounds.north) ||
    !Number.isFinite(bounds.east)
  ) {
    return null
  }

  return [
    [bounds.south, bounds.west],
    [bounds.north, bounds.east],
  ]
}

export function LeafletMapView({
  lat,
  lng,
  zoom,
  tileUrl,
  tileAttribution,
  layers,
  points,
  cells,
  territories = [],
  className,
  style,
  interactive = false,
  zoomControl = false,
  attributionControl = false,
  fitToTerritories = false,
  mapControls = true,
  onViewportChange,
  choroplethColor,
}: LeafletMapViewProps) {
  const containerRef = useRef<LeafletContainer | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const tileRef = useRef<L.TileLayer | null>(null)
  const overlaysRef = useRef<L.LayerGroup | null>(null)
  const onViewportChangeRef = useRef(onViewportChange)

  useEffect(() => {
    onViewportChangeRef.current = onViewportChange
  }, [onViewportChange])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    clearLeafletContainer(container)

    const map = L.map(container, {
      attributionControl,
      boxZoom: interactive,
      doubleClickZoom: interactive,
      dragging: interactive,
      keyboard: interactive,
      scrollWheelZoom: interactive,
      touchZoom: interactive,
      zoomControl,
    }).setView([lat, lng], zoom)

    const tile = L.tileLayer(tileUrl, {
      attribution: tileAttribution,
    }).addTo(map)
    const overlays = L.layerGroup().addTo(map)

    mapRef.current = map
    tileRef.current = tile
    overlaysRef.current = overlays

    const onMoveEnd = () => {
      const center = map.getCenter()
      onViewportChangeRef.current?.(
        Number(center.lat.toFixed(4)),
        Number(center.lng.toFixed(4)),
        Number(map.getZoom().toFixed(2)),
      )
    }
    map.on("moveend", onMoveEnd)

    const frame = window.requestAnimationFrame(() => {
      map.invalidateSize()
    })

    return () => {
      window.cancelAnimationFrame(frame)
      map.off("moveend", onMoveEnd)
      overlays.clearLayers()
      tile.remove()
      map.remove()
      mapRef.current = null
      tileRef.current = null
      overlaysRef.current = null
      clearLeafletContainer(container)
    }
    // Create and destroy the map only with the DOM node lifecycle. Prop updates
    // are handled by the effects below to avoid reusing a Leaflet-owned element.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const current = map.getCenter()
    const currentZoom = map.getZoom()
    const needsSync =
      Math.abs(current.lat - lat) > 0.0001 ||
      Math.abs(current.lng - lng) > 0.0001 ||
      Math.abs(currentZoom - zoom) > 0.0001

    if (needsSync) {
      map.setView([lat, lng], zoom, { animate: false })
    }
  }, [lat, lng, zoom])

  useEffect(() => {
    const map = mapRef.current
    const currentTile = tileRef.current
    if (!map || !currentTile) return

    currentTile.remove()
    tileRef.current = L.tileLayer(tileUrl, {
      attribution: tileAttribution,
    }).addTo(map)
  }, [tileAttribution, tileUrl])

  useEffect(() => {
    const map = mapRef.current
    const overlays = overlaysRef.current
    if (!map || !overlays) return

    overlays.clearLayers()

    if (layers.includes("Choropleth")) {
      cells.forEach((cell) => {
        const color = choroplethColor?.(cell.score) ?? "#3b82f6"
        L.rectangle(
          [
            [cell.bounds[0], cell.bounds[1]],
            [cell.bounds[2], cell.bounds[3]],
          ],
          {
            color,
            fillColor: color,
            fillOpacity: 0.45,
            opacity: 0.55,
            weight: 1,
          },
        ).addTo(overlays)
      })
    }

    if (layers.includes("Territories") || territories.length > 0) {
      territories.forEach((territory) => {
        L.geoJSON(territory.geojson as GeoJsonObject, {
          style: {
            color: territory.color,
            fillColor: territory.color,
            fillOpacity: territory.fillOpacity ?? 0.28,
            fillRule: "evenodd",
            opacity: territory.opacity ?? 0.72,
            weight: territory.weight ?? 1.5,
            lineJoin: "round",
            dashArray: territory.certainty === "schematic" ? "4 3" : undefined,
          },
        })
          .bindTooltip(
            [
              territory.label,
              territory.dateRange,
              territory.certainty === "schematic" ? "Schematic" : null,
            ].filter(Boolean).join(" · "),
            {
              direction: "center",
              opacity: 0.9,
              sticky: true,
            },
          )
          .addTo(overlays)
      })

      const bounds = fitToTerritories ? territoryBounds(territories) : null
      if (bounds) {
        map.fitBounds(bounds, {
          animate: false,
          maxZoom: 5,
          padding: [18, 18],
        })
      }
    }

    if (layers.includes("Points")) {
      points.forEach((point) => {
        const marker = L.circleMarker([point.lat, point.lng], {
          color: "#1f5f8f",
          fillColor: "#2563eb",
          fillOpacity: 0.54,
          opacity: 0.72,
          radius: 4,
          weight: 1,
        }).addTo(overlays)

        if (layers.includes("Labels")) {
          marker.bindTooltip(point.label, {
            direction: "top",
            offset: [0, -8],
            opacity: 0.9,
            permanent: false,
            sticky: true,
          })
        }
      })
      return
    }

    if (layers.includes("Labels")) {
      points.forEach((point) => {
        L.circleMarker([point.lat, point.lng], {
          color: "#1f5f8f",
          fillColor: "#2563eb",
          fillOpacity: 0.46,
          opacity: 0.62,
          radius: 3.5,
          weight: 1,
        })
          .bindTooltip(point.label, {
            direction: "top",
            offset: [0, -8],
            opacity: 0.9,
            permanent: false,
            sticky: true,
          })
          .addTo(overlays)
      })
    }
  }, [cells, choroplethColor, fitToTerritories, layers, points, territories])

  const refocusMap = () => {
    const map = mapRef.current
    if (!map) return

    const bounds = fitToTerritories ? territoryBounds(territories) : null
    if (bounds) {
      map.fitBounds(bounds, {
        animate: false,
        maxZoom: 5,
        padding: [18, 18],
      })
      return
    }

    map.setView([lat, lng], zoom, { animate: false })
  }

  const stopMapControlEvent = (event: SyntheticEvent) => {
    event.stopPropagation()
  }

  return (
    <div className={["relative overflow-hidden", className].filter(Boolean).join(" ")} style={style}>
      <div ref={containerRef} className="absolute inset-0" />
      {mapControls && (
        <div
          className="absolute left-2 top-2 z-[500] flex flex-col overflow-hidden rounded-md border border-neutral-200 bg-white/95 shadow-sm backdrop-blur-sm"
          onPointerDown={stopMapControlEvent}
          onClick={stopMapControlEvent}
          onDoubleClick={stopMapControlEvent}
          onWheel={stopMapControlEvent}
        >
          <button
            type="button"
            aria-label="Zoom in"
            title="Zoom in"
            className="flex h-7 w-7 items-center justify-center border-b border-neutral-200 text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-900 focus:outline-none focus:ring-[3px] focus:ring-primary/15"
            onClick={() => mapRef.current?.zoomIn()}
          >
            <Plus size={14} strokeWidth={1.9} />
          </button>
          <button
            type="button"
            aria-label="Zoom out"
            title="Zoom out"
            className="flex h-7 w-7 items-center justify-center border-b border-neutral-200 text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-900 focus:outline-none focus:ring-[3px] focus:ring-primary/15"
            onClick={() => mapRef.current?.zoomOut()}
          >
            <Minus size={14} strokeWidth={1.9} />
          </button>
          <button
            type="button"
            aria-label="Refocus map"
            title="Refocus map"
            className="flex h-7 w-7 items-center justify-center text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-900 focus:outline-none focus:ring-[3px] focus:ring-primary/15"
            onClick={refocusMap}
          >
            <LocateFixed size={14} strokeWidth={1.9} />
          </button>
        </div>
      )}
    </div>
  )
}
