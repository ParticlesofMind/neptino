import {
  AudioLines,
  Box,
  FileText,
  Film,
  ImageIcon,
  LineChart,
  Map as MapIcon,
  Network,
  PlayCircle,
} from "lucide-react"
import type { ComponentType } from "react"

import type { CardType } from "../types"

export interface CardSpec {
  cardType: CardType
  label: string
  description: string
  detail: string
  fields: string[]
  group: "media" | "data"
  Icon: ComponentType<{ size?: number; className?: string }>
}

export const SAMPLE_CONTENT: Partial<Record<CardType, Record<string, unknown>>> = {
  text: {
    title: "The Water Cycle",
    text: "The water cycle describes the continuous movement of water through Earth's systems — from surface bodies to the atmosphere and back again. It is driven by solar energy and the force of gravity, distributing heat and freshwater across the planet.\n\nEvaporation converts liquid water into vapour; condensation forms clouds; precipitation returns water to the surface; infiltration recharges groundwater aquifers.",
  },
  image: {
    title: "Diagram: Circulatory system",
    url: "https://picsum.photos/seed/anatomy/800/600",
    alt: "Medical illustration",
  },
  audio: {
    title: "Lecture excerpt — Cell division",
    url: "https://commondatastorage.googleapis.com/codeskulptor-demos/DDR_assets/Kangaroo_MusiQue_-_The_Neverwritten_Role_Playing_Game.mp3",
  },
  video: {
    title: "Introduction to photosynthesis",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
  },
  animation: {
    title: "Mitosis — cell division",
    format: "Lottie / JSON",
    duration: "8s",
    fps: 30,
  },
  "model-3d": {
    title: "Astronaut model",
    format: "GLB",
    url: "https://modelviewer.dev/shared-assets/models/Astronaut.glb",
  },
  map: {
    title: "World population density",
    lat: 20.0,
    lng: 10.0,
    zoom: 2,
    layers: ["choropleth", "city labels"],
  },
  chart: {
    title: "Global temperature anomaly 1880–2020",
    chartType: "line",
    xLabel: "Year",
    yLabel: "°C anomaly",
    source: "NASA GISS",
  },
  diagram: {
    title: "Krebs cycle overview",
    diagramType: "flowchart",
    nodes: 7,
    edges: 7,
  },
}

export const CARD_SPECS: CardSpec[] = [
  {
    cardType: "text",
    label: "Text",
    description: "Structured copy with optional title.",
    detail: "Ideal for instructions, reading passages, and written prompts. Supports formatted paragraphs, headings, and inline emphasis.",
    fields: ["Title (optional)", "Body text (rich)", "Reading level hint"],
    group: "media",
    Icon: FileText,
  },
  {
    cardType: "image",
    label: "Image",
    description: "Inline media with caption.",
    detail: "Embeds a hosted image with optional alt text and caption. Respects configured dimensions while preserving aspect ratio.",
    fields: ["Title", "Image URL", "Alt text", "Caption (optional)"],
    group: "media",
    Icon: ImageIcon,
  },
  {
    cardType: "audio",
    label: "Audio",
    description: "Audio clip with waveform player.",
    detail: "Streams or plays a hosted audio file with a waveform visualiser, scrubber, and speed controls. Transcript support coming soon.",
    fields: ["Title", "Audio URL", "Duration (hh:mm:ss)"],
    group: "media",
    Icon: AudioLines,
  },
  {
    cardType: "video",
    label: "Video",
    description: "Hosted or uploaded video.",
    detail: "Embeds a hosted video with HTML5 player controls. Supports direct file URLs and streaming endpoints.",
    fields: ["Title", "Video URL", "Poster image (optional)"],
    group: "media",
    Icon: PlayCircle,
  },
  {
    cardType: "animation",
    label: "Animation",
    description: "Lottie or animated SVG.",
    detail: "Renders a looping or time-based animation from a Lottie JSON or animated SVG source. Useful for process diagrams and explainers.",
    fields: ["Title", "Animation source URL", "Duration", "FPS", "Loop"],
    group: "media",
    Icon: Film,
  },
  {
    cardType: "model-3d",
    label: "3D Model",
    description: "GLB / GLTF scene rendered in place.",
    detail: "Loads and renders a 3D asset inline using a WebGL viewer. Supports orbit, zoom, and lighting controls.",
    fields: ["Title", "Model URL (GLB / GLTF)", "Camera preset"],
    group: "media",
    Icon: Box,
  },
  {
    cardType: "map",
    label: "Map",
    description: "Geographic map with optional overlays.",
    detail: "Renders a Leaflet or Mapbox map with configurable centre, zoom, and data layers. Supports choropleth and point overlays.",
    fields: ["Title", "Centre (lat, lng)", "Zoom level", "Layers (CSV list)"],
    group: "data",
    Icon: MapIcon,
  },
  {
    cardType: "chart",
    label: "Chart",
    description: "Line, bar, scatter, and more.",
    detail: "Renders a chart from structured data. Supports line, bar, scatter, and area types with labelled axes and a legend.",
    fields: ["Title", "Chart type", "X-axis label", "Y-axis label", "Data source"],
    group: "data",
    Icon: LineChart,
  },
  {
    cardType: "diagram",
    label: "Diagram",
    description: "Flowchart or concept map.",
    detail: "Renders a node–edge diagram from a declarative spec. Supports flowchart, hierarchical, and circular layouts.",
    fields: ["Title", "Diagram type", "Node count", "Layout preset"],
    group: "data",
    Icon: Network,
  },
]

export const GROUPS: { id: "media" | "data"; label: string }[] = [
  { id: "media", label: "Media" },
  { id: "data", label: "Data & Visuals" },
]
