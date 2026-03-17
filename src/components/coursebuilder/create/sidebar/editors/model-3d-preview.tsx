"use client"

import { Environment, OrbitControls, useGLTF } from "@react-three/drei"
import { Canvas } from "@react-three/fiber"
import { Box } from "lucide-react"
import { Suspense, useEffect, useMemo } from "react"
import type { Object3D } from "three"

interface Model3DPreviewProps {
  url: string
  format: string
  env: "city" | "studio" | "sunset" | "dawn" | "forest"
  cameraPos: [number, number, number]
  autoRotate: boolean
  wireframe: boolean
}

function applyWireframe(object: Object3D, wireframe: boolean) {
  object.traverse((node) => {
    if (!("isMesh" in node) || !node.isMesh || !("material" in node)) return

    const materials = Array.isArray(node.material) ? node.material : [node.material]
    for (const material of materials) {
      if (!material || !("wireframe" in material)) continue
      material.wireframe = wireframe
      material.needsUpdate = true
    }
  })
}

function GLTFModel({ url, wireframe }: { url: string; wireframe: boolean }) {
  const { scene } = useGLTF(url)
  const clonedScene = useMemo(() => scene.clone(true), [scene])

  useEffect(() => {
    applyWireframe(clonedScene, wireframe)
  }, [clonedScene, wireframe])

  return <primitive object={clonedScene} scale={1.5} />
}

export function Model3DPreview({ url, format, env, cameraPos, autoRotate, wireframe }: Model3DPreviewProps) {
  const supportsInlinePreview = format === "glb" || format === "gltf"

  if (!url) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <Box size={40} className="text-neutral-700" />
        <p className="text-[12px] text-neutral-500">Load a model to preview</p>
      </div>
    )
  }

  if (!supportsInlinePreview) {
    return (
      <div className="flex h-full items-center justify-center px-8 text-center">
        <div className="max-w-sm space-y-3 rounded-2xl border border-white/10 bg-white/5 px-6 py-7">
          <Box size={28} className="mx-auto text-white/45" />
          <p className="text-[13px] font-medium text-white/85">Inline preview not available for {format.toUpperCase()}</p>
          <p className="text-[11px] leading-relaxed text-white/50">
            USDZ assets do not render through the GLTF viewer. Use a GLB or GLTF source for live preview, or open the asset in a native viewer.
          </p>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-10 items-center justify-center rounded-md border border-white/15 px-3 py-2 text-[11px] font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            Open asset
          </a>
        </div>
      </div>
    )
  }

  return (
    <Canvas
      camera={{ position: cameraPos, fov: 46 }}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 1.5]}
      className="h-full w-full"
    >
      <Environment preset={env} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 8, 5]} intensity={1.2} />
      <Suspense fallback={null}>
        <GLTFModel url={url} wireframe={wireframe} />
      </Suspense>
      <OrbitControls enableZoom enablePan autoRotate={autoRotate} autoRotateSpeed={2} />
    </Canvas>
  )
}