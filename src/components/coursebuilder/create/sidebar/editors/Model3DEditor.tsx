"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { ExternalLink, RotateCcw } from "lucide-react"
import { POLY_PIZZA_MODELS, resolveModel3DAsset } from "@/lib/poly-pizza-models"
import {
  StudioSection,
  StudioSegment,
  StudioToggle,
} from "./studio-primitives"
import { EditorSplitLayout } from "./editor-split-layout"
import { EditorPreviewFrame } from "./editor-preview-frame"
import { MAKE_BLUE_ACTIVE_SOFT, MAKE_BLUE_INPUT_FOCUS } from "../make-theme"

const Model3DPreview = dynamic(
  () => import("./model-3d-preview").then((module) => ({ default: module.Model3DPreview })),
  { ssr: false },
)

interface Model3DEditorProps {
  content: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
}

type EnvPreset = "city" | "studio" | "sunset" | "dawn" | "forest"
type CameraPreset = "front" | "side" | "top" | "iso"

const CAMERA_POSITIONS: Record<CameraPreset, [number, number, number]> = {
  front: [0, 0, 6],
  side:  [6, 0, 0],
  top:   [0, 8, 0],
  iso:   [4, 4, 4],
}

const ENV_LABELS: EnvPreset[] = ["studio", "city", "sunset", "dawn", "forest"]

export function Model3DEditor({ content, onChange }: Model3DEditorProps) {
  const cameraPreset = (["front", "side", "top", "iso"] as const).includes(content.cameraPreset as CameraPreset)
    ? (content.cameraPreset as CameraPreset)
    : "front"
  const [env, setEnv] = useState<EnvPreset>("studio")
  const wireframe = typeof content.wireframe === "boolean" ? content.wireframe : false
  const autoRotate = typeof content.autoRotate === "boolean" ? content.autoRotate : false

  const selectedModelId = typeof content.modelId === "string" ? content.modelId : POLY_PIZZA_MODELS[0].id
  const resolvedModel = resolveModel3DAsset(content)
  const url = resolvedModel.url
  const title = typeof content.title === "string" ? content.title : ""
  const format = typeof content.format === "string" ? content.format : resolvedModel.format

  const applyCamera = (preset: CameraPreset) => {
    onChange("cameraPreset", preset)
  }

  const handleModelChange = (nextModelId: string) => {
    const nextModel = POLY_PIZZA_MODELS.find((entry) => entry.id === nextModelId)
    if (!nextModel) return

    onChange("modelId", nextModel.id)
    onChange("url", nextModel.assetUrl)
    onChange("format", "glb")

    if (!title.trim()) {
      onChange("title", nextModel.title)
    }
  }

  const cameraPos = CAMERA_POSITIONS[cameraPreset]

  return (
    <EditorSplitLayout
      previewClassName="bg-white"
      previewContentClassName="overflow-hidden"
      sidebar={(
        <>
          <StudioSection label="Poly Pizza library" className="pt-4">
            <label className="block space-y-1.5">
              <span className="text-[11px] font-medium text-neutral-600">Testing model</span>
              <select
                value={selectedModelId}
                onChange={(event) => handleModelChange(event.target.value)}
                className={`min-h-10 w-full rounded-md border border-neutral-200 bg-white px-3 py-2.5 text-[12px] text-neutral-700 outline-none ${MAKE_BLUE_INPUT_FOCUS}`}
              >
                {POLY_PIZZA_MODELS.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.title}
                  </option>
                ))}
              </select>
            </label>

            {resolvedModel.model && (
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-[11px] text-neutral-600">
                <p className="font-semibold text-neutral-900">{resolvedModel.model.title}</p>
                <p className="mt-1">{resolvedModel.model.creator} · {resolvedModel.model.license}</p>
                <a
                  href={resolvedModel.model.pageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 font-medium text-neutral-900 underline-offset-2 hover:underline"
                >
                  View on Poly Pizza
                  <ExternalLink size={12} />
                </a>
              </div>
            )}
          </StudioSection>

          <StudioSection label="Render settings">
            <StudioSegment
              label="Format"
              options={[{ value: "glb", label: "GLB" }]}
              value={format}
              onChange={(nextFormat) => onChange("format", nextFormat)}
              size="xs"
            />
            <StudioToggle
              label="Wireframe overlay"
              description="Show mesh edges over the surface"
              checked={wireframe}
              onChange={(value) => onChange("wireframe", value)}
            />
            <StudioToggle
              label="Auto-rotate"
              description="Continuously spin the model"
              checked={autoRotate}
              onChange={(value) => onChange("autoRotate", value)}
            />
          </StudioSection>
        </>
      )}
      preview={(
        <div className="relative h-full min-h-0 px-6 py-6 md:px-8">
          <EditorPreviewFrame
            cardType="model-3d"
            title={title}
            onTitleChange={(next) => onChange("title", next)}
            className="h-full"
            bodyClassName="relative h-[calc(100%-4.5rem)] min-h-[24rem] overflow-hidden bg-white"
          >
            <Model3DPreview
              url={url}
              format={format}
              env={env}
              cameraPos={cameraPos}
              autoRotate={autoRotate}
              wireframe={wireframe}
            />

            <div className="absolute left-3 top-3 flex gap-1">
              {(["front", "side", "top", "iso"] as CameraPreset[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => applyCamera(p)}
                  className={[
                    "rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider transition-all",
                    cameraPreset === p
                      ? MAKE_BLUE_ACTIVE_SOFT
                      : "bg-white text-neutral-500 ring-1 ring-inset ring-neutral-200 hover:bg-neutral-50 hover:text-neutral-700",
                  ].join(" ")}
                >
                  {p}
                </button>
              ))}
            </div>

            <div className="absolute right-3 top-3 flex gap-1">
              {ENV_LABELS.map((entry) => (
                <button
                  key={entry}
                  type="button"
                  onClick={() => setEnv(entry)}
                  className={[
                    "rounded px-2 py-0.5 text-[9px] font-bold capitalize tracking-wider transition-all",
                    env === entry
                      ? MAKE_BLUE_ACTIVE_SOFT
                      : "bg-white text-neutral-500 ring-1 ring-inset ring-neutral-200 hover:bg-neutral-50 hover:text-neutral-700",
                  ].join(" ")}
                >
                  {entry}
                </button>
              ))}
            </div>

            <div className="absolute bottom-3 left-3 flex gap-1">
              <button
                type="button"
                onClick={() => onChange("wireframe", !wireframe)}
                className={[
                  "rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider transition-all",
                  wireframe ? MAKE_BLUE_ACTIVE_SOFT : "bg-white text-neutral-500 ring-1 ring-inset ring-neutral-200 hover:bg-neutral-50",
                ].join(" ")}
              >
                Wire
              </button>
              <button
                type="button"
                onClick={() => onChange("autoRotate", !autoRotate)}
                title="Auto-rotate"
                className={[
                  "flex items-center gap-1 rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider transition-all",
                  autoRotate ? MAKE_BLUE_ACTIVE_SOFT : "bg-white text-neutral-500 ring-1 ring-inset ring-neutral-200 hover:bg-neutral-50",
                ].join(" ")}
              >
                <RotateCcw size={9} />
                Spin
              </button>
            </div>

            <div className="absolute bottom-3 right-3 rounded border border-neutral-200 bg-white/95 px-1.5 py-0.5 text-[8px] text-neutral-500 shadow-sm">
              Drag · Scroll · R-drag
            </div>
          </EditorPreviewFrame>
        </div>
      )}
    />
  )
}
