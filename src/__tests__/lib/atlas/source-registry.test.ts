import { describe, expect, it } from "vitest"
import { getAtlasSourceHierarchy } from "@/lib/atlas/source-registry"

describe("Atlas source registry", () => {
  it("orders map sources by the source hierarchy and marks implemented connectors", () => {
    const hierarchy = getAtlasSourceHierarchy("map", {})
    expect(hierarchy.slice(0, 4).map((source) => source.id)).toEqual([
      "openhistoricalmap",
      "whg",
      "natural_earth",
      "wikidata",
    ])

    expect(hierarchy.find((source) => source.id === "wikidata")).toMatchObject({
      queryable: true,
      status: "available",
      sourceRank: "S",
    })
    expect(hierarchy.find((source) => source.id === "openhistoricalmap")).toMatchObject({
      queryable: false,
      status: "planned",
    })
  })

  it("reports API-key-gated sources without enabling their planned connectors", () => {
    const chartSources = getAtlasSourceHierarchy("chart", {})
    expect(chartSources.find((source) => source.id === "fred")).toMatchObject({
      queryable: false,
      status: "missing_api_key",
      missingEnvVars: ["FRED_API_KEY"],
    })

    const chartSourcesWithKey = getAtlasSourceHierarchy("chart", { FRED_API_KEY: "test" })
    expect(chartSourcesWithKey.find((source) => source.id === "fred")).toMatchObject({
      queryable: false,
      status: "planned",
      missingEnvVars: [],
    })
  })

  it("enables Wikimedia Commons as a linked media connector", () => {
    const imageSources = getAtlasSourceHierarchy("image", {})
    expect(imageSources.find((source) => source.id === "commons")).toMatchObject({
      queryable: true,
      status: "available",
      sourceRank: "A",
    })
  })
})
