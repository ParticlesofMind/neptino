import type { CardType } from "../types"
import {
  DATASET_PROFILE,
  DOCUMENT_PROFILE,
  INTERACTIVE_PROFILE,
  TABLE_PROFILE,
} from "./make-studio-additional-profiles"
export type StudioFieldKind = "text" | "textarea" | "number" | "select" | "toggle" | "action"

export interface StudioFieldOption {
  label: string; value: string
}

export interface StudioField {
  key: string
  label: string
  kind: StudioFieldKind
  placeholder?: string
  description?: string
  actionLabel?: string
  disabled?: boolean
  rows?: number
  min?: number
  max?: number
  step?: number
  options?: StudioFieldOption[]
}

export interface StudioSection {
  title: string
  fields: StudioField[]
}

export interface StudioProfile {
  mediaType: string
  productType: string
  defaults: Record<string, unknown>
  sections: StudioSection[]
}

const TEXT_PROFILE: StudioProfile = {
  mediaType: "Text",
  productType: "AI Writing Draft",
  defaults: {
    title: "",
    text: "",
    generationPrompt: "",
    writingTone: "instructional",
    targetLength: "medium",
    readingLevel: "",
    durationMinutes: 0,
  },
  sections: [
    {
      title: "Generation",
      fields: [
        {
          key: "generationPrompt",
          label: "What should AI write?",
          kind: "textarea",
          rows: 4,
          placeholder: "Use AI to write what you want.",
        },
        {
          key: "writingTone",
          label: "Tone",
          kind: "select",
          options: [
            { label: "Instructional", value: "instructional" },
            { label: "Academic", value: "academic" },
            { label: "Conversational", value: "conversational" },
          ],
        },
        {
          key: "targetLength",
          label: "Length",
          kind: "select",
          options: [
            { label: "Short", value: "short" },
            { label: "Medium", value: "medium" },
            { label: "Long", value: "long" },
          ],
        },
        {
          key: "generateText",
          label: "Generate draft",
          kind: "action",
          actionLabel: "Generate with AI",
          description: "Generation workflow not wired yet.",
        },
      ],
    },
    {
      title: "Learning",
      fields: [
        { key: "title", label: "Title", kind: "text", placeholder: "Optional" },
        { key: "text", label: "Body", kind: "textarea", rows: 6, placeholder: "Write content" },
        { key: "readingLevel", label: "Reading level", kind: "text", placeholder: "e.g. B1" },
        { key: "durationMinutes", label: "Estimated minutes", kind: "number", min: 0, max: 180, step: 1 },
      ],
    },
  ],
}
const IMAGE_PROFILE: StudioProfile = {
  mediaType: "Image",
  productType: "Visual Explanation",
  defaults: { title: "", url: "", alt: "", caption: "", attribution: "" },
  sections: [
    {
      title: "Creation",
      fields: [
        {
          key: "uploadImage",
          label: "Upload image",
          kind: "action",
          actionLabel: "Upload image",
          description: "Upload flow is prepared in UI.",
        },
        {
          key: "generateImage",
          label: "Generate image",
          kind: "action",
          actionLabel: "Generate imagery",
          description: "Generation option is visible but not implemented.",
        },
        {
          key: "openImageEditor",
          label: "Image editor",
          kind: "action",
          actionLabel: "Open editor",
          description: "Editor entry point only for now.",
        },
        { key: "url", label: "Image URL", kind: "text", placeholder: "https://..." },
        { key: "alt", label: "Alt text", kind: "text", placeholder: "Describe the image" },
      ],
    },
    {
      title: "Context",
      fields: [
        { key: "title", label: "Title", kind: "text" },
        { key: "caption", label: "Caption", kind: "textarea", rows: 3 },
        { key: "attribution", label: "Source", kind: "text" },
      ],
    },
  ],
}
const AUDIO_PROFILE: StudioProfile = {
  mediaType: "Audio",
  productType: "Guided Listening",
  defaults: { title: "", url: "", transcript: "", playback: "1x" },
  sections: [
    {
      title: "Creation",
      fields: [
        {
          key: "uploadAudio",
          label: "Upload audio",
          kind: "action",
          actionLabel: "Upload audio",
          description: "Upload workflow is prepared in UI.",
        },
        {
          key: "generateAudio",
          label: "Generate audio",
          kind: "action",
          actionLabel: "Generate audio",
          description: "Generation option is visible but not implemented.",
        },
        { key: "url", label: "Audio URL", kind: "text", placeholder: "https://..." },
        {
          key: "playback",
          label: "Default speed",
          kind: "select",
          options: [
            { label: "0.75x", value: "0.75x" },
            { label: "1x", value: "1x" },
            { label: "1.25x", value: "1.25x" },
            { label: "1.5x", value: "1.5x" },
          ],
        },
      ],
    },
    {
      title: "Support",
      fields: [
        { key: "title", label: "Title", kind: "text" },
        { key: "transcript", label: "Transcript", kind: "textarea", rows: 5 },
      ],
    },
  ],
}
const VIDEO_PROFILE: StudioProfile = {
  mediaType: "Video",
  productType: "Explainer Clip",
  defaults: { title: "", url: "", poster: "", captionsUrl: "", startAtSeconds: 0 },
  sections: [
    {
      title: "Media",
      fields: [
        { key: "url", label: "Video URL", kind: "text", placeholder: "https://..." },
        { key: "poster", label: "Poster URL", kind: "text" },
        { key: "captionsUrl", label: "Captions URL", kind: "text" },
      ],
    },
    {
      title: "Playback",
      fields: [
        { key: "title", label: "Title", kind: "text" },
        { key: "startAtSeconds", label: "Start at (seconds)", kind: "number", min: 0, max: 36000, step: 1 },
      ],
    },
  ],
}
const ANIMATION_PROFILE: StudioProfile = {
  mediaType: "Animation",
  productType: "Process Animation",
  defaults: { title: "", url: "", format: "lottie", duration: "", loop: true },
  sections: [
    {
      title: "Asset",
      fields: [
        { key: "url", label: "Animation URL", kind: "text", placeholder: "https://..." },
        {
          key: "format",
          label: "Format",
          kind: "select",
          options: [
            { label: "Lottie", value: "lottie" },
            { label: "SVG", value: "svg" },
            { label: "GIF", value: "gif" },
          ],
        },
      ],
    },
    {
      title: "Playback",
      fields: [
        { key: "title", label: "Title", kind: "text" },
        { key: "duration", label: "Duration", kind: "text", placeholder: "e.g. 8s" },
        { key: "loop", label: "Loop", kind: "toggle" },
      ],
    },
  ],
}
const MODEL_3D_PROFILE: StudioProfile = {
  mediaType: "3D Asset",
  productType: "Spatial Model",
  defaults: { title: "", url: "", format: "glb", cameraPreset: "orbit", annotations: false },
  sections: [
    {
      title: "Status",
      fields: [
        {
          key: "model3dPlanned",
          label: "3D model authoring",
          kind: "action",
          actionLabel: "Coming soon",
          description: "3D model creation and editing are not implemented yet.",
          disabled: true,
        },
      ],
    },
    {
      title: "Asset",
      fields: [
        { key: "url", label: "Model URL", kind: "text", placeholder: "https://..." },
        {
          key: "format",
          label: "Format",
          kind: "select",
          options: [
            { label: "GLB", value: "glb" },
            { label: "GLTF", value: "gltf" },
            { label: "USDZ", value: "usdz" },
          ],
        },
      ],
    },
    {
      title: "Viewing",
      fields: [
        { key: "title", label: "Title", kind: "text" },
        {
          key: "cameraPreset",
          label: "Camera",
          kind: "select",
          options: [
            { label: "Orbit", value: "orbit" },
            { label: "Top", value: "top" },
            { label: "Front", value: "front" },
          ],
        },
        { key: "annotations", label: "Show annotations", kind: "toggle" },
      ],
    },
  ],
}
const MAP_PROFILE: StudioProfile = {
  mediaType: "Geospatial",
  productType: "Map Insight",
  defaults: { title: "", lat: 0, lng: 0, zoom: 2, layers: "" },
  sections: [
    {
      title: "Viewport",
      fields: [
        { key: "title", label: "Title", kind: "text" },
        { key: "lat", label: "Latitude", kind: "number", min: -90, max: 90, step: 0.01 },
        { key: "lng", label: "Longitude", kind: "number", min: -180, max: 180, step: 0.01 },
        { key: "zoom", label: "Zoom", kind: "number", min: 1, max: 20, step: 1 },
      ],
    },
    {
      title: "Overlays",
      fields: [{ key: "layers", label: "Layers", kind: "text", placeholder: "choropleth, labels" }],
    },
  ],
}
const CHART_PROFILE: StudioProfile = {
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
const DIAGRAM_PROFILE: StudioProfile = {
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
const DEFAULT_PROFILE: StudioProfile = {
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

const STUDIO_PROFILES: Partial<Record<CardType, StudioProfile>> = {
  text: TEXT_PROFILE,
  image: IMAGE_PROFILE,
  audio: AUDIO_PROFILE,
  video: VIDEO_PROFILE,
  animation: ANIMATION_PROFILE,
  "model-3d": MODEL_3D_PROFILE,
  map: MAP_PROFILE,
  chart: CHART_PROFILE,
  diagram: DIAGRAM_PROFILE,
  dataset: DATASET_PROFILE,
  media: DOCUMENT_PROFILE,
  document: DOCUMENT_PROFILE,
  table: TABLE_PROFILE,
  interactive: INTERACTIVE_PROFILE,
  "rich-sim": INTERACTIVE_PROFILE,
  "village-3d": INTERACTIVE_PROFILE,
  games: {
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
  },
  chat: {
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
  },
}

export function getStudioProfile(cardType: CardType): StudioProfile {
  return STUDIO_PROFILES[cardType] ?? DEFAULT_PROFILE
}
export function getStudioDefaults(cardType: CardType): Record<string, unknown> {
  return { ...getStudioProfile(cardType).defaults }
}

export function buildStudioCardContent(
  cardType: CardType,
  draft: Record<string, unknown>,
): Record<string, unknown> {
  const base = {
    ...getStudioDefaults(cardType),
    ...draft,
  }

  if (cardType === "map" && typeof base.layers === "string") {
    return {
      ...base,
      layers: base.layers.split(",").map((layer) => layer.trim()).filter(Boolean),
    }
  }
  return base
}
