import type maplibregl from "maplibre-gl"
import type { GeoJSONSource, StyleSpecification } from "maplibre-gl"

export type OverlayLayer = "Labels" | "Choropleth" | "Points"
export type MapStyleName = "Standard" | "Topographic" | "Dark"

export const MAP_STYLES: Record<MapStyleName, StyleSpecification> = {
  Standard: {
    version: 8,
    sources: {
      osm: {
        type: "raster",
        tiles: [
          "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
          "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
          "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
        ],
        tileSize: 256,
        attribution: "© OpenStreetMap contributors",
      },
    },
    layers: [{ id: "osm-base", type: "raster", source: "osm" }],
  },
  Topographic: {
    version: 8,
    sources: {
      topo: {
        type: "raster",
        tiles: [
          "https://a.tile.opentopomap.org/{z}/{x}/{y}.png",
          "https://b.tile.opentopomap.org/{z}/{x}/{y}.png",
          "https://c.tile.opentopomap.org/{z}/{x}/{y}.png",
        ],
        tileSize: 256,
        attribution: "© OpenStreetMap contributors, SRTM | OpenTopoMap",
      },
    },
    layers: [{ id: "topo-base", type: "raster", source: "topo" }],
  },
  Dark: {
    version: 8,
    sources: {
      dark: {
        type: "raster",
        tiles: [
          "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
          "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
          "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
        ],
        tileSize: 256,
        attribution: "© OpenStreetMap contributors © CARTO",
      },
    },
    layers: [{ id: "dark-base", type: "raster", source: "dark" }],
  },
}

export const OVERLAY_LAYERS: OverlayLayer[] = ["Labels", "Choropleth", "Points"]

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function generatePoints(lat: number, lng: number) {
  return {
    type: "FeatureCollection" as const,
    features: [
      { type: "Feature" as const, properties: { label: "Campus" }, geometry: { type: "Point" as const, coordinates: [lng, lat] } },
      { type: "Feature" as const, properties: { label: "District A" }, geometry: { type: "Point" as const, coordinates: [lng + 0.2, lat + 0.12] } },
      { type: "Feature" as const, properties: { label: "District B" }, geometry: { type: "Point" as const, coordinates: [lng - 0.18, lat + 0.1] } },
      { type: "Feature" as const, properties: { label: "District C" }, geometry: { type: "Point" as const, coordinates: [lng + 0.1, lat - 0.14] } },
      { type: "Feature" as const, properties: { label: "District D" }, geometry: { type: "Point" as const, coordinates: [lng - 0.16, lat - 0.16] } },
    ],
  }
}

function generateChoropleth(lat: number, lng: number) {
  const size = 0.22
  const cells = [
    { dx: -size, dy: size, score: 0.25 },
    { dx: size, dy: size, score: 0.72 },
    { dx: -size, dy: -size, score: 0.58 },
    { dx: size, dy: -size, score: 0.91 },
  ]

  return {
    type: "FeatureCollection" as const,
    features: cells.map((cell, idx) => {
      const cx = lng + cell.dx
      const cy = lat + cell.dy
      return {
        type: "Feature" as const,
        properties: { id: idx + 1, score: cell.score },
        geometry: {
          type: "Polygon" as const,
          coordinates: [[
            [cx - size * 0.6, cy - size * 0.5],
            [cx + size * 0.6, cy - size * 0.5],
            [cx + size * 0.6, cy + size * 0.5],
            [cx - size * 0.6, cy + size * 0.5],
            [cx - size * 0.6, cy - size * 0.5],
          ]],
        },
      }
    }),
  }
}

export function ensureOverlaySources(map: maplibregl.Map, lat: number, lng: number) {
  const pointsData = generatePoints(lat, lng)
  const choroplethData = generateChoropleth(lat, lng)

  if (!map.getSource("make-points")) {
    map.addSource("make-points", { type: "geojson", data: pointsData })
  } else {
    ;(map.getSource("make-points") as GeoJSONSource).setData(pointsData)
  }

  if (!map.getSource("make-choropleth")) {
    map.addSource("make-choropleth", { type: "geojson", data: choroplethData })
  } else {
    ;(map.getSource("make-choropleth") as GeoJSONSource).setData(choroplethData)
  }

  if (!map.getLayer("make-choropleth-fill")) {
    map.addLayer({
      id: "make-choropleth-fill",
      type: "fill",
      source: "make-choropleth",
      paint: {
        "fill-color": ["interpolate", ["linear"], ["get", "score"], 0, "#dbeafe", 0.5, "#60a5fa", 1, "#1d4ed8"],
        "fill-opacity": 0.42,
      },
    })
    map.addLayer({
      id: "make-choropleth-line",
      type: "line",
      source: "make-choropleth",
      paint: { "line-color": "#1e3a8a", "line-width": 1, "line-opacity": 0.7 },
    })
  }

  if (!map.getLayer("make-points-circle")) {
    map.addLayer({
      id: "make-points-circle",
      type: "circle",
      source: "make-points",
      paint: {
        "circle-radius": 6,
        "circle-color": "#00ccb3",
        "circle-stroke-color": "#0f172a",
        "circle-stroke-width": 1,
      },
    })
    map.addLayer({
      id: "make-points-label",
      type: "symbol",
      source: "make-points",
      layout: { "text-field": ["get", "label"], "text-size": 10, "text-offset": [0, 1.2] },
      paint: { "text-color": "#111827", "text-halo-color": "#ffffff", "text-halo-width": 1 },
    })
  }
}

export function setOverlayVisibility(map: maplibregl.Map, layers: string[]) {
  const labelsOn = layers.includes("Labels")
  const pointsOn = layers.includes("Points")
  const choroplethOn = layers.includes("Choropleth")

  const safeSet = (id: string, visible: boolean) => {
    if (map.getLayer(id)) {
      map.setLayoutProperty(id, "visibility", visible ? "visible" : "none")
    }
  }

  safeSet("make-choropleth-fill", choroplethOn)
  safeSet("make-choropleth-line", choroplethOn)
  safeSet("make-points-circle", pointsOn)
  safeSet("make-points-label", labelsOn)
}
