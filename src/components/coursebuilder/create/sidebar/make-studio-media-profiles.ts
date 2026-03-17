import { DEFAULT_POLY_PIZZA_MODEL, POLY_PIZZA_MODELS } from "@/lib/poly-pizza-models"
import type { StudioProfile } from "./studio-profile-types"

export const TEXT_PROFILE: StudioProfile = {
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
        { key: "generationPrompt", label: "What should AI write?", kind: "textarea", rows: 4, placeholder: "Use AI to write what you want." },
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
        { key: "generateText", label: "Generate draft", kind: "action", actionLabel: "Generate with AI", description: "Generation workflow not wired yet." },
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

export const IMAGE_PROFILE: StudioProfile = {
  mediaType: "Image",
  productType: "Visual Explanation",
  defaults: { title: "", url: "", alt: "", caption: "", attribution: "" },
  sections: [
    {
      title: "Creation",
      fields: [
        { key: "uploadImage", label: "Upload image", kind: "action", actionLabel: "Upload image", description: "Upload flow is prepared in UI." },
        { key: "generateImage", label: "Generate image", kind: "action", actionLabel: "Generate imagery", description: "Generation option is visible but not implemented." },
        { key: "openImageEditor", label: "Image editor", kind: "action", actionLabel: "Open editor", description: "Editor entry point only for now." },
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

export const AUDIO_PROFILE: StudioProfile = {
  mediaType: "Audio",
  productType: "Guided Listening",
  defaults: { title: "", url: "", transcript: "", transcriptSegments: [], playback: "1x" },
  sections: [
    {
      title: "Creation",
      fields: [
        { key: "uploadAudio", label: "Upload audio", kind: "action", actionLabel: "Upload audio", description: "Upload workflow is prepared in UI." },
        { key: "generateAudio", label: "Generate audio", kind: "action", actionLabel: "Generate audio", description: "Generation option is visible but not implemented." },
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

export const VIDEO_PROFILE: StudioProfile = {
  mediaType: "Video",
  productType: "Explainer Clip",
  defaults: {
    title: "",
    url: "",
    poster: "",
    captionsUrl: "",
    startAtSeconds: 0,
    aspectRatio: "16:9",
    fitMode: "contain",
    showControls: true,
    autoplay: false,
    muted: false,
    loop: false,
  },
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
        {
          key: "aspectRatio",
          label: "Aspect ratio",
          kind: "select",
          options: [
            { label: "16:9", value: "16:9" },
            { label: "4:3", value: "4:3" },
            { label: "1:1", value: "1:1" },
            { label: "9:16", value: "9:16" },
          ],
        },
        {
          key: "fitMode",
          label: "Fit",
          kind: "select",
          options: [
            { label: "Contain", value: "contain" },
            { label: "Cover", value: "cover" },
          ],
        },
        { key: "showControls", label: "Show controls", kind: "toggle" },
        { key: "autoplay", label: "Autoplay", kind: "toggle" },
        { key: "muted", label: "Muted by default", kind: "toggle" },
        { key: "loop", label: "Loop playback", kind: "toggle" },
      ],
    },
  ],
}

export const ANIMATION_PROFILE: StudioProfile = {
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

export const MODEL_3D_PROFILE: StudioProfile = {
  mediaType: "3D Asset",
  productType: "Spatial Model",
  defaults: {
    title: "",
    modelId: DEFAULT_POLY_PIZZA_MODEL.id,
    url: DEFAULT_POLY_PIZZA_MODEL.assetUrl,
    format: "glb",
    cameraPreset: "front",
    autoRotate: true,
    annotations: [],
  },
  sections: [
    {
      title: "Status",
      fields: [
        { key: "model3dPlanned", label: "3D model authoring", kind: "action", actionLabel: "Display only", description: "3D model creation is disabled for now. Choose from the Poly Pizza test set instead.", disabled: true },
      ],
    },
    {
      title: "Library",
      fields: [
        {
          key: "modelId",
          label: "Poly Pizza model",
          kind: "select",
          options: POLY_PIZZA_MODELS.map((entry) => ({ label: entry.title, value: entry.id })),
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
            { label: "Front", value: "front" },
            { label: "Side", value: "side" },
            { label: "Top", value: "top" },
            { label: "Isometric", value: "iso" },
          ],
        },
      ],
    },
  ],
}

export const MAP_PROFILE: StudioProfile = {
  mediaType: "Geospatial",
  productType: "Map Insight",
  defaults: { title: "", lat: 0, lng: 0, zoom: 2, layers: [] },
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
      fields: [{ key: "layers", label: "Layers", kind: "text", placeholder: "Choropleth, Labels" }],
    },
  ],
}