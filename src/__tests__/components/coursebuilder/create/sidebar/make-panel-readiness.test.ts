import { describe, expect, it } from "vitest"

import {
  getBlockReadiness,
  hasActualContent,
} from "@/components/coursebuilder/create/sidebar/make-panel-readiness"

describe("make panel readiness", () => {
  it("treats empty rich text as missing content", () => {
    expect(hasActualContent("text", { text: "<p>   </p>" })).toBe(false)
    expect(hasActualContent("text", { text: "<p>Hello world</p>" })).toBe(true)
  })

  it("requires a real source for media-style blocks", () => {
    expect(hasActualContent("image", { url: "" })).toBe(false)
    expect(hasActualContent("image", { url: "https://example.com/image.jpg" })).toBe(true)
  })

  it("accepts either topic or opening message for chat blocks", () => {
    expect(hasActualContent("chat", { topic: "", openingMessage: "" })).toBe(false)
    expect(hasActualContent("chat", { topic: "Darwin", openingMessage: "" })).toBe(true)
    expect(hasActualContent("chat", { topic: "", openingMessage: "Hello" })).toBe(true)
  })

  it("requires named entries for timeline and legend blocks", () => {
    expect(hasActualContent("timeline", { events: [{ date: "", label: "" }] })).toBe(false)
    expect(hasActualContent("timeline", { events: [{ date: "1969", label: "ARPANET" }] })).toBe(true)
    expect(hasActualContent("legend", { items: [{ color: "#fff", label: "" }] })).toBe(false)
    expect(hasActualContent("legend", { items: [{ color: "#fff", label: "Forest" }] })).toBe(true)
  })

  it("still requires a title before a layout block can be added", () => {
    expect(getBlockReadiness("layout-split", { title: "" })).toEqual({
      title: "",
      hasTitle: false,
      hasContent: true,
      canAddToCanvas: false,
    })

    expect(getBlockReadiness("layout-split", { title: "Two-column layout" }).canAddToCanvas).toBe(true)
  })

  it("requires both title and content for regular blocks", () => {
    expect(getBlockReadiness("text-editor", { title: "", document: "<p>Draft</p>" }).canAddToCanvas).toBe(false)
    expect(getBlockReadiness("text-editor", { title: "Writing studio", document: "<p>Draft</p>" }).canAddToCanvas).toBe(true)
  })
})