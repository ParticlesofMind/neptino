import { describe, expect, it } from "vitest"
import { cn } from "@/lib/utils"

describe("cn()", () => {
  it("returns a merged class string for plain strings", () => {
    expect(cn("foo", "bar")).toBe("foo bar")
  })

  it("deduplicates conflicting Tailwind classes (last wins)", () => {
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500")
  })

  it("ignores falsy values", () => {
    expect(cn("foo", false, null, undefined, "bar")).toBe("foo bar")
  })

  it("handles conditional objects", () => {
    expect(cn("base", { active: true, disabled: false })).toBe("base active")
  })

  it("returns empty string when no valid classes are provided", () => {
    expect(cn(false, null, undefined)).toBe("")
  })
})
