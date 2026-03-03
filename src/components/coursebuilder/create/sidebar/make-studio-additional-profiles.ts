import type { StudioProfile } from "./make-studio-tools"

export const DATASET_PROFILE: StudioProfile = {
  mediaType: "Structured Data",
  productType: "Dataset Snapshot",
  defaults: { title: "", source: "", schemaVersion: "v1", rows: 0, refreshCadence: "manual" },
  sections: [
    {
      title: "Source",
      fields: [
        { key: "title", label: "Title", kind: "text" },
        { key: "source", label: "Dataset source", kind: "text", placeholder: "URL or table name" },
        { key: "schemaVersion", label: "Schema version", kind: "text", placeholder: "e.g. v2" },
      ],
    },
    {
      title: "Lifecycle",
      fields: [
        { key: "rows", label: "Row count", kind: "number", min: 0, max: 100000000, step: 1 },
        {
          key: "refreshCadence",
          label: "Refresh",
          kind: "select",
          options: [
            { label: "Manual", value: "manual" },
            { label: "Daily", value: "daily" },
            { label: "Weekly", value: "weekly" },
          ],
        },
      ],
    },
  ],
}

export const DOCUMENT_PROFILE: StudioProfile = {
  mediaType: "Document",
  productType: "Reference Material",
  defaults: { title: "", url: "", documentType: "pdf", pages: 0, excerpt: "" },
  sections: [
    {
      title: "File",
      fields: [
        { key: "url", label: "Document URL", kind: "text", placeholder: "https://..." },
        {
          key: "documentType",
          label: "Type",
          kind: "select",
          options: [
            { label: "PDF", value: "pdf" },
            { label: "Slide deck", value: "slides" },
            { label: "Web article", value: "web" },
          ],
        },
      ],
    },
    {
      title: "Framing",
      fields: [
        { key: "title", label: "Title", kind: "text" },
        { key: "pages", label: "Pages", kind: "number", min: 0, max: 5000, step: 1 },
        { key: "excerpt", label: "Excerpt", kind: "textarea", rows: 4, placeholder: "Optional excerpt" },
      ],
    },
  ],
}

export const TABLE_PROFILE: StudioProfile = {
  mediaType: "Structured Data",
  productType: "Data Table",
  defaults: { title: "", columns: "", rowLimit: 25, sortable: true, highlightRule: "" },
  sections: [
    {
      title: "Structure",
      fields: [
        { key: "title", label: "Title", kind: "text" },
        { key: "columns", label: "Columns", kind: "text", placeholder: "name, value, date" },
        { key: "rowLimit", label: "Row limit", kind: "number", min: 1, max: 1000, step: 1 },
      ],
    },
    {
      title: "Interaction",
      fields: [
        { key: "sortable", label: "Sortable", kind: "toggle" },
        { key: "highlightRule", label: "Highlight rule", kind: "text", placeholder: "e.g. value > 90" },
      ],
    },
  ],
}

export const INTERACTIVE_PROFILE: StudioProfile = {
  mediaType: "Interactive",
  productType: "Learner Interaction",
  defaults: { title: "", interactionType: "sandbox", prompt: "", checkpoints: 0, hintsEnabled: true },
  sections: [
    {
      title: "Experience",
      fields: [
        { key: "title", label: "Title", kind: "text" },
        {
          key: "interactionType",
          label: "Type",
          kind: "select",
          options: [
            { label: "Sandbox", value: "sandbox" },
            { label: "Scenario", value: "scenario" },
            { label: "Guided", value: "guided" },
          ],
        },
        { key: "prompt", label: "Prompt", kind: "textarea", rows: 4, placeholder: "Starter instruction" },
      ],
    },
    {
      title: "Scaffolding",
      fields: [
        { key: "checkpoints", label: "Checkpoints", kind: "number", min: 0, max: 20, step: 1 },
        { key: "hintsEnabled", label: "Hints enabled", kind: "toggle" },
      ],
    },
  ],
}
