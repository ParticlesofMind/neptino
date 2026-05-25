import type { StudioProfile } from "./studio-profile-types"

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

export const EMBED_PROFILE: StudioProfile = {
  mediaType: "Embed",
  productType: "External Resource",
  defaults: {
    title: "",
    url: "",
    documentType: "web",
    provider: "iframe",
    caption: "",
    attribution: "",
    pages: 0,
    excerpt: "",
  },
  sections: DOCUMENT_PROFILE.sections,
}

export const CODE_SNIPPET_PROFILE: StudioProfile = {
  mediaType: "Code",
  productType: "Read-Only Snippet",
  defaults: {
    title: "",
    language: "javascript",
    code: "",
    caption: "",
    prompt: "",
    showLineNumbers: true,
  },
  sections: [
    {
      title: "Snippet",
      fields: [
        { key: "title", label: "Title", kind: "text", placeholder: "Example function" },
        {
          key: "language",
          label: "Language",
          kind: "select",
          options: [
            { label: "JavaScript", value: "javascript" },
            { label: "TypeScript", value: "typescript" },
            { label: "HTML", value: "html" },
            { label: "CSS", value: "css" },
            { label: "JSON", value: "json" },
            { label: "Markdown", value: "markdown" },
          ],
        },
        { key: "code", label: "Code", kind: "textarea", rows: 10, placeholder: "const answer = 42" },
        { key: "caption", label: "Caption", kind: "textarea", rows: 3, placeholder: "What should students notice?" },
      ],
    },
  ],
}

export const FLASHCARDS_PROFILE: StudioProfile = {
  mediaType: "Flashcards",
  productType: "Revision Deck",
  defaults: {
    title: "",
    gameType: "word-match",
    instructions: "",
    pairs: [{ term: "", match: "" }],
    tags: [] as string[],
    difficulty: "intermediate",
    timeLimit: 0,
    showHints: true,
  },
  sections: [],
}

export const FORM_PROFILE: StudioProfile = {
  mediaType: "Learner Input",
  productType: "Structured Form",
  defaults: {
    title: "",
    prompt: "",
    submitLabel: "Submit",
    fields: [
      { id: "response", label: "Response", type: "textarea", required: true },
    ],
  },
  sections: [],
}

export const VOICE_RECORDER_PROFILE: StudioProfile = {
  mediaType: "Spoken Response",
  productType: "Voice Recorder",
  defaults: {
    title: "",
    prompt: "",
    maxDurationSeconds: 60,
    retryPolicy: "allow",
    transcript: "",
  },
  sections: [],
}

export const SORTER_PROFILE: StudioProfile = {
  mediaType: "Sorting Activity",
  productType: "Matcher",
  defaults: {
    title: "",
    mode: "match",
    instructions: "",
    pairs: [{ term: "", match: "" }],
    items: ["", ""],
    showHints: true,
  },
  sections: [],
}

export const TIMELINE_PROFILE: StudioProfile = {
  mediaType: "Timeline",
  productType: "Chronological Resource",
  defaults: {
    title: "",
    orientation: "horizontal",
    events: [],
  },
  sections: [
    {
      title: "Timeline",
      fields: [
        { key: "title", label: "Title", kind: "text", placeholder: "History of the Internet" },
        {
          key: "orientation",
          label: "Orientation",
          kind: "select",
          options: [
            { label: "Horizontal", value: "horizontal" },
            { label: "Vertical", value: "vertical" },
          ],
        },
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
  productType: "Assessment",
  defaults: {
    title: "",
    interactionType: "multiple-choice",
    prompt: "",
    options: [
      { text: "", correct: true, feedback: "" },
      { text: "", correct: false, feedback: "" },
    ],
    tfCorrect: true,
    sampleAnswer: "",
    keywords: "",
    hint: "",
    points: 1,
  },
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
