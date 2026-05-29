import { describe, expect, it } from "vitest"
import {
  ATLAS_MEDIA_TYPES,
  ATLAS_PRODUCT_TYPES,
  canonicalizeAtlasTaxonomyValue,
} from "@/lib/atlas/taxonomy"

describe("Atlas taxonomy", () => {
  it("includes repository V1 media and product forms", () => {
    expect(ATLAS_MEDIA_TYPES.map((term) => term.id)).toEqual(
      expect.arrayContaining(["Document", "Animation", "Code Snippet", "Embed"]),
    )
    expect(ATLAS_PRODUCT_TYPES.map((term) => term.id)).toEqual(
      expect.arrayContaining(["Chart", "Table", "Gallery"]),
    )
  })

  it("canonicalizes legacy and card-facing aliases", () => {
    expect(canonicalizeAtlasTaxonomyValue("product", "Compendium")).toBe("Narrative")
    expect(canonicalizeAtlasTaxonomyValue("product", "Maps")).toBe("Map")
    expect(canonicalizeAtlasTaxonomyValue("activity", "chat")).toBe("Converse")
  })
})
