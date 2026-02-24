export type ResourcePriority = "very_high" | "high" | "medium" | "low" | "very_low"

export type ResourcePreference = {
  id: string
  label: string
  description: string
  priority: ResourcePriority
  locked?: boolean
}

export const RESOURCE_PRIORITY_OPTIONS: Array<{ value: ResourcePriority; label: string }> = [
  { value: "very_high", label: "Very High" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
  { value: "very_low", label: "Very Low" },
]

export const RESOURCE_SOURCES: Array<Omit<ResourcePreference, "priority">> = [
  {
    id: "neptino",
    label: "Neptino",
    description: "Curated Neptino-approved sources and summaries.",
    locked: true,
  },
  {
    id: "wikipedia",
    label: "Wikipedia",
    description: "Open encyclopedia coverage for foundational topics.",
  },
  {
    id: "wikibooks",
    label: "Wikibooks",
    description: "Open textbooks and structured learning chapters.",
  },
  {
    id: "wikiversity",
    label: "Wikiversity",
    description: "Open learning materials and course outlines.",
  },
  {
    id: "openstax",
    label: "OpenStax",
    description: "Open-licensed textbooks for core subjects.",
  },
  {
    id: "mit_ocw",
    label: "MIT OpenCourseWare",
    description: "University course materials and readings.",
  },
  {
    id: "openlearn",
    label: "OpenLearn",
    description: "Free learning resources from The Open University.",
  },
  {
    id: "libretexts",
    label: "LibreTexts",
    description: "Open textbooks across STEM and humanities.",
  },
  {
    id: "arxiv",
    label: "arXiv",
    description: "Open research preprints for advanced topics.",
  },
  {
    id: "gutenberg",
    label: "Project Gutenberg",
    description: "Public domain literature and primary sources.",
  },
]

export function buildDefaultResourcePreferences(): ResourcePreference[] {
  return RESOURCE_SOURCES.map((source) => ({
    ...source,
    priority: source.id === "neptino" ? "very_high" : "medium",
  }))
}

export function mergeResourcePreferences(saved?: ResourcePreference[] | null): ResourcePreference[] {
  const byId = new Map((saved ?? []).map((item) => [item.id, item]))
  return RESOURCE_SOURCES.map((source) => {
    const existing = byId.get(source.id)
    if (source.id === "neptino") {
      return {
        ...source,
        priority: "very_high",
        locked: true,
      }
    }
    return {
      ...source,
      priority: existing?.priority ?? "medium",
    }
  })
}
