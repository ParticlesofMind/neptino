// Leaflet-based map editor configuration.
// Replaces the former maplibre-gl StyleSpecification approach.

export type OverlayLayer = "Labels" | "Choropleth" | "Points"
export type MapStyleName = "Standard" | "Topographic" | "Dark"

export interface TileLayerConfig {
  url: string
  attribution: string
}

export const TILE_LAYERS: Record<MapStyleName, TileLayerConfig> = {
  Standard: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors",
  },
  Topographic: {
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors &copy; OpenTopoMap",
  },
  Dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
  },
}

export const OVERLAY_LAYERS: OverlayLayer[] = ["Labels", "Choropleth", "Points"]

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export interface DemoPoint {
  lat: number
  lng: number
  label: string
}

export function generateDemoPoints(lat: number, lng: number): DemoPoint[] {
  return [
    { lat, lng, label: "Center" },
    { lat: lat + 0.12, lng: lng + 0.2, label: "District A" },
    { lat: lat + 0.1, lng: lng - 0.18, label: "District B" },
    { lat: lat - 0.14, lng: lng + 0.1, label: "District C" },
    { lat: lat - 0.16, lng: lng - 0.16, label: "District D" },
  ]
}

export interface DemoCell {
  /** [minLat, minLng, maxLat, maxLng] */
  id: number
  bounds: [number, number, number, number]
  score: number
}

export function generateDemoChoropleth(lat: number, lng: number): DemoCell[] {
  const size = 0.22
  const cells = [
    { dx: -size, dy: size, score: 0.25 },
    { dx: size, dy: size, score: 0.72 },
    { dx: -size, dy: -size, score: 0.58 },
    { dx: size, dy: -size, score: 0.91 },
  ]
  return cells.map((c, i) => ({
    id: i + 1,
    bounds: [
      lat + c.dy - size * 0.5,
      lng + c.dx - size * 0.6,
      lat + c.dy + size * 0.5,
      lng + c.dx + size * 0.6,
    ] as [number, number, number, number],
    score: c.score,
  }))
}

