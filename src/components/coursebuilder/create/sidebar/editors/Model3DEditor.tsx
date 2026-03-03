"use client"

import { Suspense, useState, useRef } from "react"
import dynamic from "next/dynamic"
import { Plus, Trash2, Box } from "lucide-react"

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
  return raw.filter((a): a is Annotation =>
    typeof a === "object" && a !== null && "label" in a,
  )
}

type EnvPreset = "city" | "studio" | "sunset" | "dawn" | "forest"
type CameraPreset = "front" | "side" | "top" | "isometric"

const CAMERA_POSITIONS: Record<CameraPreset, [number, number, number]> = {
  front: [0, 0, 6],
  side: [6, 0, 0],
  top: [0, 8, 0],
  isometric: [4, 4, 4],
}

export function Model3DEditor({ content, onChange }: Model3DEditorProps) {
  const [urlDraft, setUrlDraft] = useState(typeof content.url === "string" ? content.url : "")
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>("front")
  const [env, setEnv] = useState<EnvPreset>("studio")
  const [wireframe, setWireframe] = useState(false)
  const orbitRef = useRef<{ object: { position: { set: (x: number, y: number, z: number) => void } } }>(null)

  const url = typeof content.url === "string" ? content.url : ""
  const format = typeof content.format === "string" ? content.format : "glb"
  const annotations = parseAnnotations(content.annotations)

  const commitUrl = () => onChange("url", urlDraft)

  const applyCamera = (preset: CameraPreset) => {
    setCameraPreset(preset)
    const [x, y, z] = CAMERA_POSITIONS[preset]
    if (orbitRef.current) {
      orbitRef.current.object.position.set(x, y, z)
    }
  }

  const addAnnotation = () => {
    onChange("annotations", [...annotations, { label: "Point", x: "0", y: "0", z: "0" }])
  }

  const removeAnnotation = (i: number) => {
    onChange("annotations", annotations.filter((_, idx) => idx !== i))
  }

  const updateAnnotation = (i: number, field: keyof Annotation, value: string) => {
    onChange("annotations", annotations.map((a, idx) => idx === i ? { ...a, [field]: value } : a))
  }

  const cameraPos = CAMERA_POSITIONS[cameraPreset]

  return (
    <div className="flex h-full flex-col overflow-auto bg-white">
      {/* URL input */}
      <div className="px-4 pt-4 pb-3 border-b border-neutral-100 space-y-3">
        <div className="flex gap-0 border border-neutral-200 divide-x divide-neutral-200 w-fit">
          {(["glb", "gltf", "usdz"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => onChange("format", f)}
              className={[
                "px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition-colors",
                format === f ? "bg-neutral-900 text-white" : "bg-white text-neutral-500 hover:bg-neutral-50",
              ].join(" ")}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={urlDraft}
            placeholder="https://example.com/model.glb"
            onChange={(e) => setUrlDraft(e.target.value)}
            onBlur={commitUrl}
            onKeyDown={(e) => e.key === "Enter" && commitUrl()}
            className="flex-1 border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-[12px] text-neutral-700 outline-none focus:border-neutral-400"
          />
          <button
            type="button"
            onClick={commitUrl}
            className="border border-neutral-900 bg-neutral-900 px-3 py-1.5 text-[11px] font-medium text-white hover:opacity-90"
          >
            Load
          </button>
        </div>
      </div>

      {/* 3D Viewer */}
      <div className="px-4 py-3 border-b border-neutral-100 bg-neutral-50">
        <div className="overflow-hidden bg-black border border-neutral-200" style={{ height: 260 }}>
          {url ? (
            <CanvasR3F
              camera={{ position: cameraPos, fov: 46 }}
              gl={{ antialias: true, alpha: true }}
              dpr={[1, 1.5]}
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
                autoRotate={false}
              />
            </CanvasR3F>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3">
              <Box size={32} className="text-neutral-600" />
              <p className="text-[12px] text-neutral-500">Enter a GLB/GLTF URL above to view model</p>
            </div>
          )}
        </div>
        <p className="mt-1.5 text-center text-[10px] text-neutral-400">Drag to orbit · Scroll to zoom · Right-drag to pan</p>
      </div>

      {/* Camera presets */}
      <div className="px-4 py-3 border-b border-neutral-100 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Camera preset</p>
        <div className="flex gap-1 flex-wrap">
          {(["front", "side", "top", "isometric"] as CameraPreset[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => applyCamera(p)}
              className={[
                "border px-3 py-1.5 text-[11px] font-medium capitalize transition-colors",
                cameraPreset === p ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 text-neutral-600 hover:bg-neutral-50",
              ].join(" ")}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Environment */}
      <div className="px-4 py-3 border-b border-neutral-100 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Lighting</p>
        <div className="flex gap-1 flex-wrap">
          {(["studio", "city", "sunset", "dawn", "forest"] as EnvPreset[]).map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setEnv(e)}
              className={[
                "border px-3 py-1.5 text-[11px] font-medium capitalize transition-colors",
                env === e ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 text-neutral-600 hover:bg-neutral-50",
              ].join(" ")}
            >
              {e}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={wireframe}
            onChange={(e) => setWireframe(e.target.checked)}
            className="accent-neutral-900"
          />
          <span className="text-[11px] text-neutral-600">Wireframe overlay</span>
        </label>
      </div>

      {/* Annotations */}
      <div className="px-4 py-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Annotations</p>
          <button
            type="button"
            onClick={addAnnotation}
            className="flex items-center gap-1 border border-neutral-200 px-2 py-1 text-[10px] font-medium text-neutral-600 hover:bg-neutral-50"
          >
            <Plus size={10} /> Add point
          </button>
        </div>
        {annotations.length === 0 && (
          <p className="text-[11px] text-neutral-400 italic">No annotations. Add a labeled point in 3D space.</p>
        )}
        <div className="space-y-2">
          {annotations.map((a, i) => (
            <div key={i} className="border border-neutral-200 p-2 space-y-1.5">
              <input
                type="text"
                value={a.label}
                onChange={(e) => updateAnnotation(i, "label", e.target.value)}
                placeholder="Label"
                className="w-full border border-neutral-200 bg-neutral-50 px-2 py-1 text-[11px] text-neutral-700 outline-none focus:border-neutral-400"
              />
              <div className="flex gap-1">
                {(["x", "y", "z"] as const).map((axis) => (
                  <label key={axis} className="flex items-center gap-1 flex-1">
                    <span className="text-[10px] font-mono font-bold text-neutral-400 w-4">{axis}</span>
                    <input
                      type="number"
                      value={a[axis]}
                      step={0.1}
                      onChange={(e) => updateAnnotation(i, axis, e.target.value)}
                      className="flex-1 min-w-0 border border-neutral-200 bg-neutral-50 px-2 py-1 text-[11px] font-mono text-neutral-700 outline-none focus:border-neutral-400"
                    />
                  </label>
                ))}
                <button type="button" onClick={() => removeAnnotation(i)} className="ml-1 text-neutral-400 hover:text-red-500">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
