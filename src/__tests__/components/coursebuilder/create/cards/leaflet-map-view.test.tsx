import { render } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { LeafletMapView } from "@/components/coursebuilder/create/cards/card-types/leaflet-map-view"

const leafletMock = vi.hoisted(() => {
  const mapInstance = {
    getCenter: vi.fn(() => ({ lat: 20, lng: 10 })),
    getZoom: vi.fn(() => 2),
    invalidateSize: vi.fn(),
    off: vi.fn(),
    on: vi.fn(),
    remove: vi.fn(),
    setView: vi.fn(function setView() {
      return mapInstance
    }),
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
})
