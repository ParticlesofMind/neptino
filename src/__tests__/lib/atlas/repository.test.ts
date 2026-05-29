import { describe, expect, it } from "vitest"
import { buildContentHash, slugifyAtlasId } from "@/lib/atlas/repository"

describe("Atlas repository helpers", () => {
  it("hashes JSON with stable key ordering", () => {
    expect(buildContentHash({ b: 2, a: { d: 4, c: 3 } })).toBe(
      buildContentHash({ a: { c: 3, d: 4 }, b: 2 }),
    )
  })

  it("builds stable Atlas slugs", () => {
    expect(slugifyAtlasId("William Shakespeare")).toBe("william-shakespeare")
    expect(slugifyAtlasId("  ")).toBe("atlas-item")
  })
})
