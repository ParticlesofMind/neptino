/**
 * Tool Configuration for Engine Modes
 * Defines tools and their settings for each mode (build, animate)
 */

const COLOR_SWATCHES = ["#4A7FB8", "#C35C5C", "#5E9E6B", "#2E2E2E", "#A0A0A0"];

export type ToolOptionType =
  | "slider"
  | "dropdown"
  | "swatches"
  | "toggle"
  | "toggle-group"
  | "number"
  | "text"
  | "button";

export interface ToolOption {
  id: string;
  type: ToolOptionType;
  label: string;
  icon?: string;
  settings: Record<string, any>;
}

export interface Tool {
  id: string;
  name: string;
  icon: string;
  options?: ToolOption[];
}

export interface ModeConfig {
  id: string;
  name: string;
  icon: string;
  tools: Tool[];
}

export const toolConfigs: Record<string, ModeConfig> = {
  build: {
    id: "build",
    name: "Build",
    icon: "/assets/icons/coursebuilder/modes/mode-build.svg",
    tools: [
      {
        id: "selection",
        name: "Select",
        icon: "/assets/icons/coursebuilder/tools/tool-select.svg",
        options: [
          {
            id: "mode",
            type: "toggle-group",
            label: "Selection",
            settings: {
              value: "contain",
              options: [
                { value: "contain", label: "Contain", icon: "/assets/icons/square-mouse-pointer-icon.svg" },
                { value: "intersect", label: "Intersect", icon: "/assets/icons/square-dashed-mouse-pointer-icon.svg" },
              ],
            },
          },
        ],
      },
      {
        id: "pen",
        name: "Pen",
        icon: "/assets/icons/coursebuilder/tools/tool-pen.svg",
        options: [
          {
            id: "vectorMode",
            type: "toggle",
            label: "Node Paths",
            icon: "/assets/icons/coursebuilder/tools/tool-node.svg",
            settings: { value: true },
          },
          {
            id: "strokeSize",
            type: "slider",
            label: "Stroke",
            settings: { min: 1, max: 24, snaps: [1, 2, 4, 8, 12, 16, 24], value: 2 },
          },
          {
            id: "strokeColor",
            type: "swatches",
            label: "Stroke Color",
            settings: { options: COLOR_SWATCHES, value: "#4A7FB8" },
          },
          {
            id: "fillColor",
            type: "swatches",
            label: "Fill Color",
            settings: { options: [...COLOR_SWATCHES, "transparent"], value: "transparent" },
          },
        ],
      },
      {
        id: "brush",
        name: "Brush",
        icon: "/assets/icons/coursebuilder/tools/tool-brush.svg",
        options: [
          {
            id: "size",
            type: "slider",
            label: "Brush Size",
            settings: { min: 1, max: 16, snaps: [1, 2, 4, 8, 16], value: 6 },
          },
          {
            id: "color",
            type: "swatches",
            label: "Brush Color",
            settings: { options: COLOR_SWATCHES, value: "#2E2E2E" },
          },
          {
            id: "opacity",
            type: "slider",
            label: "Opacity",
            settings: { min: 0, max: 1, step: 0.01, value: 1 },
          },
          {
            id: "style",
            type: "dropdown",
            label: "Brush Style",
            settings: {
              value: "solid-round",
              options: [
                { value: "calligraphic", label: "Calligraphic" },
                { value: "scatter", label: "Scatter" },
                { value: "art", label: "Art" },
                { value: "bristle", label: "Bristle" },
                { value: "pattern", label: "Pattern" },
                { value: "textured", label: "Textured" },
                { value: "solid-round", label: "Solid Round" },
                { value: "flat", label: "Flat" },
                { value: "spray", label: "Spray" },
              ],
            },
          },
        ],
      },
      {
        id: "text",
        name: "Text",
        icon: "/assets/icons/coursebuilder/tools/tool-write.svg",
        options: [
          {
            id: "fontSize",
            type: "slider",
            label: "Font Size",
            settings: { min: 1, max: 16, snaps: [1, 2, 4, 8, 16], value: 8 },
          },
          {
            id: "fontFamily",
            type: "dropdown",
            label: "Font",
            settings: {
              value: "Helvetica",
              options: [
                { value: "Helvetica", label: "Helvetica / Arial" },
                { value: "Times New Roman", label: "Times New Roman" },
                { value: "Roboto", label: "Roboto" },
                { value: "Open Sans", label: "Open Sans" },
                { value: "Montserrat", label: "Montserrat" },
              ],
            },
          },
          {
            id: "fontColor",
            type: "swatches",
            label: "Font Color",
            settings: { options: COLOR_SWATCHES, value: "#2E2E2E" },
          },
          { id: "bold", type: "toggle", label: "Bold", settings: { value: false } },
          { id: "italic", type: "toggle", label: "Italic", settings: { value: false } },
          { id: "underline", type: "toggle", label: "Underline", settings: { value: false } },
        ],
      },
      {
        id: "shapes",
        name: "Shapes",
        icon: "/assets/icons/coursebuilder/tools/tool-shapes.svg",
        options: [
          {
            id: "shapeType",
            type: "dropdown",
            label: "Shape",
            settings: {
              value: "rectangle",
              options: [
                { value: "rectangle", label: "Rectangle" },
                { value: "square", label: "Square" },
                { value: "circle", label: "Circle" },
                { value: "triangle", label: "Triangle" },
                { value: "star", label: "Star" },
              ],
            },
          },
          {
            id: "strokeWidth",
            type: "slider",
            label: "Stroke Width",
            settings: { min: 1, max: 20, step: 1, value: 2 },
          },
          {
            id: "strokeColor",
            type: "swatches",
            label: "Stroke Color",
            settings: { options: COLOR_SWATCHES, value: "#2E2E2E" },
          },
          {
            id: "fillColor",
            type: "swatches",
            label: "Fill",
            settings: { options: [...COLOR_SWATCHES, "transparent"], value: "#A0A0A0" },
          },
        ],
      },
      {
        id: "tables",
        name: "Tables",
        icon: "/assets/icons/coursebuilder/media/media-table.svg",
        options: [
          { id: "rows", type: "number", label: "Rows", settings: { min: 1, max: 10, step: 1, value: 3 } },
          { id: "columns", type: "number", label: "Columns", settings: { min: 1, max: 10, step: 1, value: 3 } },
          {
            id: "strokeWidth",
            type: "slider",
            label: "Stroke Width",
            settings: { min: 1, max: 4, snaps: [1, 2, 4], value: 2 },
          },
        ],
      },
      {
        id: "generate",
        name: "Generate",
        icon: "/assets/icons/bot-icon.svg",
        options: [
          {
            id: "contentType",
            type: "dropdown",
            label: "Content Type",
            settings: {
              value: "text",
              options: [
                {
                  value: "text",
                  label: "Text",
                  icon: "/assets/icons/coursebuilder/media/media-text.svg"
                },
                {
                  value: "image",
                  label: "Image",
                  icon: "/assets/icons/coursebuilder/media/media-image.svg"
                },
              ],
            },
          },
          {
            id: "prompt",
            type: "text",
            label: "Prompt",
            settings: { value: "", placeholder: "Describe what to generate…" },
          },
          { id: "send", type: "button", label: "Send", icon: "/assets/icons/send-icon.svg", settings: {} },
        ],
      },
      {
        id: "eraser",
        name: "Eraser",
        icon: "/assets/icons/coursebuilder/tools/tool-eraser.svg",
        options: [
          { id: "size", type: "slider", label: "Eraser Size", settings: { min: 1, max: 16, snaps: [1, 2, 4, 8, 16], value: 4 } },
        ],
      },
    ],
  },
  animate: {
    id: "animate",
    name: "Animate",
    icon: "/assets/icons/coursebuilder/modes/mode-animate.svg",
    tools: [
      {
        id: "selection",
        name: "Select",
        icon: "/assets/icons/coursebuilder/tools/tool-select.svg",
        options: [
          {
            id: "mode",
            type: "toggle-group",
            label: "Selection",
            settings: {
              value: "contain",
              options: [
                { value: "contain", label: "Contain" },
                { value: "intersect", label: "Intersect" },
              ],
            },
          },
        ],
      },
      {
        id: "scene",
        name: "Scene",
        icon: "/assets/icons/coursebuilder/modes/mode-animate.svg",
        options: [
          {
            id: "aspectRatio",
            type: "dropdown",
            label: "Aspect Ratio",
            settings: {
              value: "16:9",
              options: [
                { value: "16:9", label: "16:9" },
                { value: "4:3", label: "4:3" },
                { value: "3:2", label: "3:2" },
                { value: "1:1", label: "1:1" },
                { value: "9:16", label: "9:16" },
              ],
            },
          },
          {
            id: "duration",
            type: "slider",
            label: "Duration (s)",
            settings: { min: 3, max: 30, snaps: [3, 5, 10, 30], value: 5 },
          },
        ],
      },
      {
        id: "path",
        name: "Path",
        icon: "/assets/icons/coursebuilder/tools/tool-pen.svg",
        options: [
          { id: "simplify", type: "button", label: "Simplify Path", settings: {} },
          { id: "adherence", type: "slider", label: "Adherence", settings: { min: 0, max: 1, step: 0.05, value: 0.5 } },
        ],
      },
      {
        id: "modify",
        name: "Modify",
        icon: "/assets/icons/coursebuilder/tools/tool-shapes.svg",
        options: [
          { id: "time", type: "slider", label: "Timeline (s)", settings: { min: 0, max: 120, step: 0.5, value: 0 } },
          { id: "keyframe", type: "button", label: "Set Keyframe", settings: {} },
        ],
      },
    ],
  },
};
