/**
 * Card Defaults
 *
 * Provides optimal default dimensions and sample content for each card type.
 * Used when dragging cards from the Files Browser onto the canvas.
 */

import type { CardType } from "../types"

// ─── Default dimensions ───────────────────────────────────────────────────────

export interface CardDimensions {
  width: number
  height: number
}

/**
 * Returns optimal default dimensions for a given card type.
 * These sizes are chosen to balance visual clarity with canvas space efficiency.
 */
export function getDefaultCardDimensions(cardType: CardType): CardDimensions {
  const dimensionMap: Record<CardType, CardDimensions> = {
    // ── Media cards ──
    text:       { width: 420, height: 320 },
    image:      { width: 400, height: 300 },
    audio:      { width: 420, height: 180 },
    video:      { width: 480, height: 270 },
    animation:  { width: 480, height: 270 },
    dataset:    { width: 480, height: 200 },
    "model-3d": { width: 520, height: 280 },
    map:        { width: 480, height: 360 },
    chart:      { width: 480, height: 320 },
    diagram:    { width: 480, height: 320 },
    media:      { width: 460, height: 240 },
    document:   { width: 420, height: 560 },
    table:      { width: 520, height: 360 },

    // ── Interactive cards ──
    "rich-sim":   { width: 520, height: 320 },
    "village-3d": { width: 560, height: 360 },
    interactive:  { width: 480, height: 280 },
    games:        { width: 560, height: 360 },
    chat:         { width: 420, height: 320 },

    // ── Layout cards ──
    "layout-split":     { width: 642, height: 310 },
    "layout-stack":     { width: 642, height: 420 },
    "layout-feature":   { width: 642, height: 400 },
    "layout-sidebar":   { width: 642, height: 310 },
    "layout-quad":      { width: 642, height: 510 },
    "layout-mosaic":    { width: 642, height: 630 },
    "layout-triptych":  { width: 780, height: 310 },
    "layout-trirow":    { width: 642, height: 540 },
    "layout-banner":    { width: 642, height: 440 },
    "layout-broadside": { width: 780, height: 440 },
    "layout-tower":     { width: 700, height: 540 },
    "layout-pinboard":  { width: 642, height: 560 },
    "layout-annotated": { width: 700, height: 510 },
    "layout-sixgrid":   { width: 780, height: 510 },
  }

  return dimensionMap[cardType] ?? { width: 420, height: 220 }
}

// ─── Sample content ───────────────────────────────────────────────────────────

/**
 * Returns realistic sample content for each card type.
 * Ensures cards appear populated and ready-to-test when dropped.
 */
export function getSampleCardContent(
  cardType: CardType,
  title: string,
): Record<string, unknown> {
  switch (cardType) {
    case "text":
      return {
        title,
        text: "The water cycle, also known as the hydrological cycle, describes the continuous movement of water through Earth's systems — from surface bodies to the atmosphere and back again. It is driven primarily by solar energy and the force of gravity, and it plays a fundamental role in distributing heat and freshwater across the planet.\n\nEvaporation is the process by which liquid water at the surface of oceans, lakes, rivers, and soil is converted into water vapour and enters the atmosphere. The sun's radiant energy provides the heat needed to break the molecular bonds holding liquid water together.",
        readingLevel: "B2",
        durationMinutes: 5,
      }

    case "image":
      return {
        title,
        url: "https://picsum.photos/seed/education/800/600",
        alt: "Educational diagram",
        caption: "Visual representation for teaching purposes",
        attribution: "Sample image",
      }

    case "audio":
      return {
        title,
        url: "https://commondatastorage.googleapis.com/codeskulptor-demos/DDR_assets/Kangaroo_MusiQue_-_The_Neverwritten_Role_Playing_Game.mp3",
        duration: "04:12",
        transcript: "Audio clip with narration and explanation of key concepts.",
        playbackSpeed: "1x",
      }

    case "video":
      return {
        title,
        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
        poster: "",
        captionsUrl: "",
        startAtSeconds: 0,
        duration: "10:53",
      }

    case "animation":
      return {
        title,
        format: "Lottie / JSON",
        duration: "8s",
        fps: 30,
        loop: true,
      }

    case "dataset":
      return {
        title,
        rows: 150,
        columns: 8,
        format: "CSV",
        url: "",
      }

    case "model-3d":
      return {
        title,
        format: "GLB",
        url: "https://modelviewer.dev/shared-assets/models/Astronaut.glb",
        polygons: 12500,
      }

    case "map":
      return {
        title,
        lat: 20.0,
        lng: 10.0,
        zoom: 2,
        layers: ["choropleth", "city labels"],
        attribution: "Natural Earth",
      }

    case "chart":
      return {
        title,
        chartType: "line",
        xLabel: "Time",
        yLabel: "Value",
        source: "Sample data",
        dataPoints: 24,
      }

    case "diagram":
      return {
        title,
        diagramType: "flowchart",
        nodes: 7,
        edges: 7,
        layout: "auto",
      }

    case "document":
      return {
        title,
        fileType: "PDF",
        pages: 12,
        url: "",
      }

    case "table":
      return {
        title,
        rows: 10,
        columns: 5,
        format: "HTML",
      }

    case "rich-sim":
      return {
        title,
        simType: "physics",
        controls: ["play", "pause", "reset"],
        interactive: true,
      }

    case "village-3d":
      return {
        title,
        sceneType: "exploration",
        interactiveElements: 8,
        cameraMode: "first-person",
      }

    case "interactive":
      return {
        title,
        activityType: "quiz",
        questions: 5,
        timeLimit: 300,
        difficulty: "intermediate",
      }

    case "games":
      return {
        title,
        gameType: "word-match",
        instructions: "Match the terms with their definitions",
        pairs: [
          { term: "Photosynthesis", match: "Process by which plants make food" },
          { term: "Mitosis", match: "Cell division process" },
          { term: "Evolution", match: "Change in species over time" },
        ],
        timeLimit: 180,
        showHints: true,
      }

    case "chat":
      return {
        title,
        chatMode: "qa",
        topic: "Educational topic",
        aiPersona: "AI Tutor",
        openingMessage: "Hello! I'm here to help you learn. What would you like to explore?",
        learningObjectives: "Understand key concepts through conversation",
        conversationStarters: [
          "What is the water cycle?",
          "How does photosynthesis work?",
          "Explain cell division",
        ],
        maxTurns: 20,
        difficulty: "intermediate",
      }

    case "layout-split":
    case "layout-stack":
    case "layout-feature":
    case "layout-sidebar":
    case "layout-quad":
    case "layout-mosaic":
    case "layout-triptych":
    case "layout-trirow":
    case "layout-banner":
    case "layout-broadside":
    case "layout-tower":
    case "layout-pinboard":
    case "layout-annotated":
    case "layout-sixgrid":
      return { slots: {} }

    default:
      return { title }
  }
}
