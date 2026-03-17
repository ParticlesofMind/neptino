import type { StudioProfile, StudioSection } from "./studio-profile-types"

export const CHART_PROFILE: StudioProfile = {
  mediaType: "Structured Data",
  productType: "Chart Narrative",
  defaults: { title: "", chartType: "line", xLabel: "", yLabel: "", source: "" },
  sections: [
    {
      title: "Chart setup",
      fields: [
        { key: "title", label: "Title", kind: "text" },
        {
          key: "chartType",
          label: "Chart type",
          kind: "select",
          options: [
            { label: "Line", value: "line" },
            { label: "Bar", value: "bar" },
            { label: "Scatter", value: "scatter" },
            { label: "Area", value: "area" },
          ],
        },
        { key: "xLabel", label: "X label", kind: "text" },
        { key: "yLabel", label: "Y label", kind: "text" },
      ],
    },
    {
      title: "Data",
      fields: [{ key: "source", label: "Source", kind: "text", placeholder: "Dataset or endpoint" }],
    },
  ],
}

export const DIAGRAM_PROFILE: StudioProfile = {
  mediaType: "Concept Model",
  productType: "Diagram Explanation",
  defaults: { title: "", diagramType: "flowchart", nodes: 4, edges: 3, layout: "auto" },
  sections: [
    {
      title: "Structure",
      fields: [
        { key: "title", label: "Title", kind: "text" },
        {
          key: "diagramType",
          label: "Type",
          kind: "select",
          options: [
            { label: "Flowchart", value: "flowchart" },
            { label: "Concept map", value: "concept-map" },
            { label: "Cycle", value: "cycle" },
          ],
        },
        { key: "nodes", label: "Nodes", kind: "number", min: 1, max: 30, step: 1 },
        { key: "edges", label: "Edges", kind: "number", min: 0, max: 60, step: 1 },
      ],
    },
    {
      title: "Layout",
      fields: [
        {
          key: "layout",
          label: "Preset",
          kind: "select",
          options: [
            { label: "Auto", value: "auto" },
            { label: "Horizontal", value: "horizontal" },
            { label: "Vertical", value: "vertical" },
          ],
        },
      ],
    },
  ],
}

export const GAMES_PROFILE: StudioProfile = {
  mediaType: "Game",
  productType: "Learning Game",
  defaults: {
    title: "",
    gameType: "word-match",
    instructions: "",
    pairs: [{ term: "", match: "" }],
    fillText: "",
    items: ["", ""],
    timeLimit: 120,
    showHints: true,
  },
  sections: [] as StudioSection[],
}

export const CHAT_PROFILE: StudioProfile = {
  mediaType: "AI Chat",
  productType: "AI Conversation",
  defaults: {
    title: "",
    chatMode: "qa",
    topic: "",
    aiPersona: "",
    openingMessage: "",
    learningObjectives: "",
    conversationStarters: [] as string[],
    maxTurns: 20,
    difficulty: "intermediate",
  },
  sections: [] as StudioSection[],
}

export const DEFAULT_PROFILE: StudioProfile = {
  mediaType: "Custom",
  productType: "Card",
  defaults: { title: "" },
  sections: [
    {
      title: "Basics",
      fields: [{ key: "title", label: "Title", kind: "text", placeholder: "Card title" }],
    },
  ],
}