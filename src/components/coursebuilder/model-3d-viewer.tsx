// @refresh reset
"use client"

import { useRef } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls, Environment, MeshDistortMaterial } from "@react-three/drei"
import type * as THREE from "three"

function SpinningModel() {
  const outerRef = useRef<THREE.Mesh>(null)
  const innerRef = useRef<THREE.Mesh>(null)
  const ringRef  = useRef<THREE.Mesh>(null)

  useFrame((_, delta) => {
    if (outerRef.current) {
      outerRef.current.rotation.y += delta * 0.4
      outerRef.current.rotation.x += delta * 0.15
    }
    if (innerRef.current) {
      innerRef.current.rotation.y -= delta * 0.7
      innerRef.current.rotation.z += delta * 0.3
    }
    if (ringRef.current) {
      ringRef.current.rotation.x += delta * 0.6
      ringRef.current.rotation.y += delta * 0.25
    }
  })

  return (
    <group>
      {/* Outer icosahedron with distortion */}
      <mesh ref={outerRef} scale={1.35}>
        <icosahedronGeometry args={[1, 1]} />
        <MeshDistortMaterial
          color="#818cf8"
          distort={0.25}
          speed={2}
          roughness={0.15}
          metalness={0.6}
        />
      </mesh>

      {/* Inner solid sphere */}
      <mesh ref={innerRef} scale={0.52}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial color="#c7d2fe" roughness={0.05} metalness={0.9} />
      </mesh>

      {/* Orbital ring */}
      <mesh ref={ringRef} rotation={[Math.PI / 4, 0, 0]}>
        <torusGeometry args={[1.9, 0.04, 16, 80]} />
        <meshStandardMaterial color="#6366f1" roughness={0.2} metalness={0.7} />
      </mesh>
    </group>
  )
}

export function Model3DViewer() {
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
          <Environment preset="city" />
          <ambientLight intensity={0.4} />
          <directionalLight position={[5, 8, 5]} intensity={1.2} castShadow />
          <SpinningModel />
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

      <p className="mt-2 text-[11px] text-muted-foreground text-center">
        Drag to orbit · Scroll to zoom
      </p>
    </div>
  )
}
