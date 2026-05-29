import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { LeafletMapView } from "@/components/coursebuilder/create/cards/card-types/leaflet-map-view"

const leafletMock = vi.hoisted(() => {
  const mapInstance = {
    getCenter: vi.fn(() => ({ lat: 20, lng: 10 })),
    getZoom: vi.fn(() => 2),
    fitBounds: vi.fn(),
    invalidateSize: vi.fn(),
    off: vi.fn(),
    on: vi.fn(),
    remove: vi.fn(),
    setView: vi.fn(function setView() {
      return mapInstance
    }),
    zoomIn: vi.fn(),
    zoomOut: vi.fn(),
  }
  const tileLayer = {
    addTo: vi.fn(function addTo() {
      return tileLayer
    }),
    remove: vi.fn(),
  }
  const layerGroup = {
    addTo: vi.fn(function addTo() {
      return layerGroup
    }),
    clearLayers: vi.fn(),
  }

  return {
    layerGroup,
    mapInstance,
    tileLayer,
    L: {
      circleMarker: vi.fn(() => {
        const marker = {
          addTo: vi.fn(),
          bindTooltip: vi.fn(() => marker),
        }
        return marker
      }),
      geoJSON: vi.fn(() => {
        const layer = {
          addTo: vi.fn(),
          bindTooltip: vi.fn(() => layer),
        }
        return layer
      }),
      layerGroup: vi.fn(() => layerGroup),
      map: vi.fn((container: HTMLDivElement & { _leaflet_id?: number }) => {
        expect(container._leaflet_id).toBeUndefined()
        container._leaflet_id = 1
        return mapInstance
      }),
      rectangle: vi.fn(() => ({
        addTo: vi.fn(),
      })),
      tileLayer: vi.fn(() => tileLayer),
    },
  }
})

vi.mock("leaflet", () => ({
  default: leafletMock.L,
}))

describe("LeafletMapView", () => {
  it("clears Leaflet ownership from the container during cleanup", () => {
    const { unmount } = render(
      <LeafletMapView
        lat={20}
        lng={10}
        zoom={2}
        tileUrl="https://tiles.example/{z}/{x}/{y}.png"
        tileAttribution="Tiles"
        layers={["Points"]}
        points={[{ label: "A", lat: 20, lng: 10 }]}
        cells={[]}
      />,
    )

    const container = leafletMock.L.map.mock.calls[0]?.[0] as HTMLDivElement & { _leaflet_id?: number }
    expect(container._leaflet_id).toBe(1)

    unmount()

    expect(leafletMock.mapInstance.remove).toHaveBeenCalled()
    expect(container._leaflet_id).toBeUndefined()
  })

  it("renders GeoJSON territory layers", () => {
    render(
      <LeafletMapView
        lat={39.2}
        lng={31.1}
        zoom={4}
        tileUrl="https://tiles.example/{z}/{x}/{y}.png"
        tileAttribution="Tiles"
        layers={["Territories"]}
        points={[]}
        cells={[]}
        territories={[
          {
            id: "ottoman-core",
            label: "Imperial core",
            color: "#14b8a6",
            dateRange: "1453-1683",
            certainty: "schematic",
            geojson: {
              type: "Feature",
              properties: {},
              geometry: {
                type: "Polygon",
                coordinates: [[
                  [25, 36],
                  [45, 36],
                  [45, 43],
                  [25, 43],
                  [25, 36],
                ]],
              },
            },
          },
        ]}
        fitToTerritories
      />,
    )

    expect(leafletMock.L.geoJSON).toHaveBeenCalledWith(
      expect.objectContaining({ type: "Feature" }),
      expect.objectContaining({
        style: expect.objectContaining({
          color: "#14b8a6",
          fillColor: "#14b8a6",
          fillRule: "evenodd",
        }),
      }),
    )
    expect(leafletMock.mapInstance.fitBounds).toHaveBeenCalledWith(
      [
        [36, 25],
        [43, 45],
      ],
      expect.objectContaining({
        animate: false,
        maxZoom: 5,
      }),
    )
  })

  it("shows card map controls for zoom and refocus", () => {
    render(
      <LeafletMapView
        lat={20}
        lng={10}
        zoom={2}
        tileUrl="https://tiles.example/{z}/{x}/{y}.png"
        tileAttribution="Tiles"
        layers={[]}
        points={[]}
        cells={[]}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }))
    fireEvent.click(screen.getByRole("button", { name: "Zoom out" }))
    fireEvent.click(screen.getByRole("button", { name: "Refocus map" }))

    expect(leafletMock.mapInstance.zoomIn).toHaveBeenCalled()
    expect(leafletMock.mapInstance.zoomOut).toHaveBeenCalled()
    expect(leafletMock.mapInstance.setView).toHaveBeenCalledWith([20, 10], 2, { animate: false })
  })
})
