"use client"

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports */

import React, { useRef, useState, useEffect } from "react"
import { useTheme } from "next-themes"
import * as THREE from "three"

;(React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED ??= {}
;(React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner ??= {
  current: null,
}

// require instead of import so the above polyfill executes before loading fiber/drei
const { Canvas, useFrame } = require("@react-three/fiber") as typeof import("@react-three/fiber")
const { Html } = require("@react-three/drei")

const UnauthorizedKnight = () => {
  const group = useRef<THREE.Group>(null!)
  const rightArm = useRef<THREE.Group>(null!)
  const leftArm = useRef<THREE.Group>(null!)
  const action = useRef<{ phase: "idle" | "attack" | "defend" | "return"; progress: number }>({
    phase: "idle",
    progress: 0,
  })
  const targetYaw = useRef(0)
  const paused = useRef(false)
  const [showBadge, setShowBadge] = useState(false)
  const { resolvedTheme } = useTheme()
  const [badgeColor, setBadgeColor] = useState("#fff")

  useEffect(() => {
    const theme =
      resolvedTheme || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    setBadgeColor(theme === "dark" ? "#fff" : "#111")
  }, [resolvedTheme])

  useEffect(() => {
    const handleVisibility = () => {
      paused.current = document.hidden
    }
    document.addEventListener("visibilitychange", handleVisibility)
    return () => document.removeEventListener("visibilitychange", handleVisibility)
  }, [])

  useEffect(() => {
    const g = group.current
    return () => {
      g?.traverse((obj: THREE.Object3D) => {
        const geo = (obj as THREE.Mesh).geometry
        const mat = (obj as THREE.Mesh).material as
          | THREE.Material
          | THREE.Material[]
          | undefined
        if (geo) geo.dispose()
        if (mat) {
          if (Array.isArray(mat)) {
            mat.forEach((m) => m.dispose())
          } else {
            mat.dispose()
          }
        }
      })
    }
  }, [])

  const handleClick = () => {
    if (action.current.phase !== "idle") return
    action.current.phase = "attack"
    action.current.progress = 0
    setShowBadge(true)
  }

  const handleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    targetYaw.current = (x - 0.5) * (Math.PI / 3)
  }

  useFrame((state, delta) => {
    if (paused.current) return
    const g = group.current
    g.rotation.y += (targetYaw.current - g.rotation.y) * 0.1
    g.position.y = Math.sin(state.clock.getElapsedTime() * 2) * 0.05

    const act = action.current
    if (act.phase === "attack") {
      act.progress += delta
      const t = Math.min(act.progress / 0.25, 1)
      rightArm.current.rotation.z = -t * (Math.PI / 2)
      if (act.progress >= 0.25) {
        act.phase = "defend"
        act.progress = 0
      }
    } else if (act.phase === "defend") {
      act.progress += delta
      const t = Math.min(act.progress / 0.25, 1)
      rightArm.current.rotation.z = -Math.PI / 2 * (1 - t)
      leftArm.current.rotation.z = t * (Math.PI / 3)
      if (act.progress >= 0.25) {
        act.phase = "return"
        act.progress = 0
      }
    } else if (act.phase === "return") {
      act.progress += delta
      const t = Math.min(act.progress / 0.25, 1)
      leftArm.current.rotation.z = (Math.PI / 3) * (1 - t)
      if (act.progress >= 0.25) {
        leftArm.current.rotation.z = 0
        rightArm.current.rotation.z = 0
        act.phase = "idle"
        act.progress = 0
        setShowBadge(false)
      }
    }
  })

  return (
    <div className="absolute inset-0 z-10 pointer-events-auto" onPointerMove={handleMove} onClick={handleClick}>
      <Canvas camera={{ position: [0, 1.5, 5], fov: 25 }} gl={{ antialias: false, alpha: true }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} />
        <group ref={group}>
          <mesh position={[0, 0.5, 0]}>
            <boxGeometry args={[1, 1, 0.5]} />
            <meshStandardMaterial color="#555" flatShading />
          </mesh>
          <mesh position={[0, 1.3, 0]}>
            <boxGeometry args={[0.8, 0.8, 0.5]} />
            <meshStandardMaterial color="#888" flatShading />
          </mesh>
          <group ref={rightArm} position={[0.6, 1.0, 0]}>
            <mesh>
              <boxGeometry args={[0.2, 0.6, 0.2]} />
              <meshStandardMaterial color="#666" flatShading />
            </mesh>
            <mesh position={[0.1, -0.5, 0]}>
              <boxGeometry args={[0.1, 1, 0.1]} />
              <meshStandardMaterial color="#ccc" flatShading />
            </mesh>
          </group>
          <group ref={leftArm} position={[-0.6, 1.0, 0]}>
            <mesh>
              <boxGeometry args={[0.2, 0.6, 0.2]} />
              <meshStandardMaterial color="#666" flatShading />
            </mesh>
            <mesh position={[-0.2, 0, 0]}>
              <boxGeometry args={[0.4, 0.6, 0.1]} />
              <meshStandardMaterial color="#999" flatShading />
            </mesh>
          </group>
          {showBadge && (
            <Html position={[0, 2.2, 0]} center>
              <div style={{ color: badgeColor }} className="text-xs font-semibold">
                Protegida nuestra web
              </div>
            </Html>
          )}
        </group>
      </Canvas>
    </div>
  )
}

export default UnauthorizedKnight