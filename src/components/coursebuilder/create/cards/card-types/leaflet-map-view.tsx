"use client"

import "leaflet/dist/leaflet.css"
import { useEffect, useRef, type CSSProperties } from "react"
import L from "leaflet"
import type { OverlayLayer } from "../../sidebar/editors/map-editor-config"

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
  className?: string
  style?: CSSProperties
  interactive?: boolean
  zoomControl?: boolean
  attributionControl?: boolean
  onViewportChange?: (lat: number, lng: number, zoom: number) => void
  choroplethColor?: (score: number) => string
}

type LeafletContainer = HTMLDivElement & {
  _leaflet_id?: number
}

function clearLeafletContainer(container: LeafletContainer) {
  delete container._leaflet_id
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
  className,
  style,
  interactive = false,
  zoomControl = false,
  attributionControl = false,
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
    const overlays = overlaysRef.current
    if (!overlays) return

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

    if (layers.includes("Points")) {
      points.forEach((point, index) => {
        const marker = L.circleMarker([point.lat, point.lng], {
          color: "#3a6ea0",
          fillColor: index === 0 ? "#ef4444" : "#3b82f6",
          fillOpacity: 0.8,
          radius: index === 0 ? 10 : 7,
          weight: 1.5,
        }).addTo(overlays)

        if (layers.includes("Labels")) {
          marker.bindTooltip(point.label, {
            direction: "top",
            offset: [0, -8],
            opacity: 0.95,
            permanent: true,
          })
        }
      })
      return
    }

    if (layers.includes("Labels")) {
      points.forEach((point) => {
        L.circleMarker([point.lat, point.lng], {
          fillOpacity: 0,
          opacity: 0,
          radius: 1,
          weight: 0,
        })
          .bindTooltip(point.label, {
            direction: "top",
            offset: [0, -8],
            opacity: 0.95,
            permanent: true,
          })
          .addTo(overlays)
      })
    }
  }, [cells, choroplethColor, layers, points])

  return (
    <div
      ref={containerRef}
      className={className}
      style={style}
    />
  )
}
