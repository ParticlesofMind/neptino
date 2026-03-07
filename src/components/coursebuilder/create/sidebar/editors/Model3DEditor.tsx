"use client"

import { Suspense, useState, useRef } from "react"
import dynamic from "next/dynamic"
import { Plus, Trash2, Box, RotateCcw } from "lucide-react"
import {
  StudioSection,
  StudioUrlInput,
  StudioSegment,
  StudioToggle,
} from "./studio-primitives"

// Dynamic imports to avoid SSR issues
const CanvasR3F = dynamic(() => import("@react-three/fiber").then((m) => m.Canvas), { ssr: false })
const OrbitControlsR3F = dynamic(
  () => import("@react-three/drei").then((m) => m.OrbitControls as React.ComponentType<{
    autoRotate?: boolean
    autoRotateSpeed?: number
    enableZoom?: boolean
    enablePan?: boolean
    target?: [number, number, number]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ref?: React.Ref<any>
  }>),
  { ssr: false },
)
const EnvironmentR3F = dynamic(
  () => import("@react-three/drei").then((m) => m.Environment as React.ComponentType<{ preset: string }>),
  { ssr: false },
)
const UseGLTF = dynamic(
  () => import("@react-three/drei").then((m) => {
    const GLTFModel = ({ url }: { url: string }) => {
      const { scene } = m.useGLTF(url)
      return <primitive object={scene} scale={1.5} />
    }
    return { default: GLTFModel }
  }),
  { ssr: false },
)

interface Annotation {
  label: string
  x: string
  y: string
  z: string
}

interface Model3DEditorProps {
  content: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
}

function parseAnnotations(raw: unknown): Annotation[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((a): a is Annotation => typeof a === "object" && a !== null && "label" in a)
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
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>("front")
  const [env, setEnv] = useState<EnvPreset>("studio")
  const [wireframe, setWireframe] = useState(false)
  const [autoRotate, setAutoRotate] = useState(false)
  const orbitRef = useRef<{ object: { position: { set: (x: number, y: number, z: number) => void } } }>(null)

  const url = typeof content.url === "string" ? content.url : ""
  const format = typeof content.format === "string" ? content.format : "glb"
  const annotations = parseAnnotations(content.annotations)

  const applyCamera = (preset: CameraPreset) => {
    setCameraPreset(preset)
    const [x, y, z] = CAMERA_POSITIONS[preset]
    orbitRef.current?.object.position.set(x, y, z)
  }

  const addAnnotation = () => {
    onChange("annotations", [...annotations, { label: "Point", x: "0", y: "0", z: "0" }])
  }

  const removeAnnotation = (i: number) => {
    onChange("annotations", annotations.filter((_, idx) => idx !== i))
  }

  const updateAnnotation = (i: number, field: keyof Annotation, value: string) => {
    onChange("annotations", annotations.map((a, idx) => (idx === i ? { ...a, [field]: value } : a)))
  }

  const cameraPos = CAMERA_POSITIONS[cameraPreset]

  return (
    <div className="flex h-full flex-col overflow-auto bg-white">

      {/* 3D Viewport — the hero, at the top */}
      <div className="relative shrink-0 border-b border-neutral-100 bg-neutral-950" style={{ height: 300 }}>
        {url ? (
          <CanvasR3F
            camera={{ position: cameraPos, fov: 46 }}
            gl={{ antialias: true, alpha: true }}
            dpr={[1, 1.5]}
            className="h-full w-full"
          >
            <EnvironmentR3F preset={env} />
            <ambientLight intensity={0.5} />
            <directionalLight position={[5, 8, 5]} intensity={1.2} />
            <Suspense fallback={null}>
              {UseGLTF && <UseGLTF url={url} />}
            </Suspense>
            <OrbitControlsR3F
              ref={orbitRef as React.RefObject<never>}
              enableZoom
              enablePan
              autoRotate={autoRotate}
              autoRotateSpeed={2}
            />
          </CanvasR3F>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <Box size={40} className="text-neutral-700" />
            <p className="text-[12px] text-neutral-500">Load a model below to preview</p>
          </div>
        )}

        {/* Overlaid camera controls — top left */}
        <div className="absolute left-2 top-2 flex gap-1">
          {(["front", "side", "top", "iso"] as CameraPreset[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => applyCamera(p)}
              className={[
                "rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider transition-all",
                cameraPreset === p
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "bg-black/40 text-white/70 hover:bg-black/60 hover:text-white",
              ].join(" ")}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Overlaid environment controls — top right */}
        <div className="absolute right-2 top-2 flex gap-1">
          {ENV_LABELS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setEnv(e)}
              className={[
                "rounded px-2 py-0.5 text-[9px] font-bold capitalize tracking-wider transition-all",
                env === e
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "bg-black/40 text-white/70 hover:bg-black/60 hover:text-white",
              ].join(" ")}
            >
              {e}
            </button>
          ))}
        </div>

        {/* Overlaid display toggles — bottom left */}
        <div className="absolute bottom-2 left-2 flex gap-1">
          <button
            type="button"
            onClick={() => setWireframe((w) => !w)}
            className={[
              "rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider transition-all",
              wireframe ? "bg-[#4a94ff] text-white" : "bg-black/40 text-white/70 hover:bg-black/60",
            ].join(" ")}
          >
            Wire
          </button>
          <button
            type="button"
            onClick={() => setAutoRotate((r) => !r)}
            title="Auto-rotate"
            className={[
              "flex items-center gap-1 rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider transition-all",
              autoRotate ? "bg-[#4a94ff] text-white" : "bg-black/40 text-white/70 hover:bg-black/60",
            ].join(" ")}
          >
            <RotateCcw size={9} />
            Spin
          </button>
        </div>

        {/* Hint */}
        <div className="absolute bottom-2 right-2 rounded bg-black/30 px-1.5 py-0.5 text-[8px] text-white/60">
          Drag · Scroll · R-drag
        </div>
      </div>

      {/* Source */}
      <StudioSection label="Model source" className="pt-4">
        <StudioSegment
          label="Format"
          options={[
            { value: "glb", label: "GLB" },
            { value: "gltf", label: "GLTF" },
            { value: "usdz", label: "USDZ" },
          ]}
          value={format}
          onChange={(f) => onChange("format", f)}
          size="xs"
        />
        <StudioUrlInput
          value={url}
          placeholder="https://example.com/model.glb"
          onCommit={(u) => onChange("url", u)}
        />
      </StudioSection>

      {/* Render settings */}
      <StudioSection label="Render settings">
        <StudioToggle
          label="Wireframe overlay"
          description="Show mesh edges over the surface"
          checked={wireframe}
          onChange={setWireframe}
        />
        <StudioToggle
          label="Auto-rotate"
          description="Continuously spin the model"
          checked={autoRotate}
          onChange={setAutoRotate}
        />
      </StudioSection>

      {/* Annotations */}
      <StudioSection
        label="3D Annotations"
        noBorder
        action={
          <button
            type="button"
            onClick={addAnnotation}
            className="flex items-center gap-1 rounded-md border border-neutral-200 px-2 py-1 text-[10px] font-semibold text-neutral-600 transition-all hover:border-neutral-300 hover:bg-neutral-50"
          >
            <Plus size={10} />
            Add point
          </button>
        }
      >
        {annotations.length === 0 && (
          <p className="text-[11px] italic text-neutral-400">No annotations. Label a point in 3D space.</p>
        )}
        <div className="space-y-2">
          {annotations.map((a, i) => (
            <div key={i} className="space-y-1.5 rounded-lg border border-neutral-100 bg-neutral-50 p-2.5">
              <input
                type="text"
                value={a.label}
                onChange={(e) => updateAnnotation(i, "label", e.target.value)}
                placeholder="Label"
                className="w-full rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-[12px] text-neutral-700 outline-none focus:border-[#4a94ff]/60"
              />
              <div className="flex items-center gap-1.5">
                {(["x", "y", "z"] as const).map((axis) => (
                  <div key={axis} className="flex flex-1 items-center gap-1 rounded-md border border-neutral-200 bg-white px-2 py-1">
                    <span className="font-mono text-[9px] font-bold text-neutral-400">{axis.toUpperCase()}</span>
                    <input
                      type="number"
                      value={a[axis]}
                      step={0.1}
                      onChange={(e) => updateAnnotation(i, axis, e.target.value)}
                      className="min-w-0 flex-1 bg-transparent font-mono text-[11px] text-neutral-700 outline-none"
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => removeAnnotation(i)}
                  className="shrink-0 text-neutral-400 transition-colors hover:text-red-500"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </StudioSection>
    </div>
  )
}
