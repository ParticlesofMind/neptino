// @refresh reset
"use client"

import { Suspense, useMemo } from "react"
import { Canvas } from "@react-three/fiber"
import { Environment, OrbitControls, useGLTF } from "@react-three/drei"
import { Box } from "lucide-react"
import { resolveModel3DAsset } from "@/lib/poly-pizza-models"

function GLTFModel({ url }: { url: string }) {
  const { scene } = useGLTF(url)
  const clonedScene = useMemo(() => scene.clone(true), [scene])
  return <primitive object={clonedScene} scale={1.45} />
}

interface Model3DViewerProps {
  content?: Record<string, unknown>
}

export function Model3DViewer({ content = {} }: Model3DViewerProps) {
  const { model, url, format } = resolveModel3DAsset(content)
  const supportsInlinePreview = format === "glb" || format === "gltf"

  if (!supportsInlinePreview) {
    return (
      <div className="flex h-full flex-col justify-between rounded-xl border border-dashed border-border bg-muted/20 p-4">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground">3D preview unavailable</p>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            This viewer currently supports GLB and GLTF assets only.
          </p>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-9 items-center justify-center rounded-md border border-border px-3 text-[11px] font-medium text-foreground transition-colors hover:bg-muted"
        >
          Open asset
        </a>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="rounded-xl overflow-hidden bg-[hsl(var(--muted)/0.5)] flex-1 min-h-0">
        <Canvas
          camera={{ position: [0, 0, 7], fov: 46 }}
          gl={{ antialias: false, alpha: true, powerPreference: "low-power" }}
          dpr={1}
          frameloop="always"
          onCreated={({ gl }) => {
            gl.domElement.addEventListener("webglcontextlost", (e) => { e.preventDefault() })
          }}
        >
          <Environment preset="studio" />
          <ambientLight intensity={0.4} />
          <directionalLight position={[5, 8, 5]} intensity={1.2} castShadow />
          <Suspense fallback={null}>
            <GLTFModel url={url} />
          </Suspense>
          <OrbitControls
            autoRotate
            autoRotateSpeed={0.8}
            enableZoom
            enablePan={false}
            minDistance={3}
            maxDistance={9}
          />
        </Canvas>
      </div>

      <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{model?.title ?? "3D model"}</p>
          <p className="truncate">{model ? `${model.creator} · ${model.license}` : "External asset"}</p>
        </div>
        {model?.pageUrl ? (
          <a href={model.pageUrl} target="_blank" rel="noreferrer" className="shrink-0 rounded-md border border-border px-2 py-1 text-[10px] font-medium text-foreground transition-colors hover:bg-muted">
            Poly Pizza
          </a>
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-md border border-dashed border-border text-muted-foreground">
            <Box className="h-4 w-4" />
          </div>
        )}
      </div>
    </div>
  )
}

useGLTF.preload("https://static.poly.pizza/4754ce4b-40ec-4089-8be4-98ce7230bfe4.glb")
