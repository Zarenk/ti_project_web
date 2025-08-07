"use client"

import { Suspense, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Html, OrbitControls, useGLTF } from '@react-three/drei'
import { Player } from '@lottiefiles/react-lottie-player'
import { motion } from 'framer-motion'
import type * as THREE from 'three'

function AccessDeniedModel() {
  const { scene } = useGLTF('/access-denied.gltf')
  const ref = useRef<THREE.Group>(null)

  useFrame(() => {
    if (ref.current) {
      ref.current.rotation.y += 0.01
    }
  })

  return <primitive ref={ref} object={scene} scale={2} />
}

useGLTF.preload('/access-denied.gltf')

export default function UnauthorizedPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="w-64 h-64">
        <Canvas>
          <ambientLight intensity={0.5} />
          <Suspense
            fallback={
              <Html center>
                <Player
                  src="/animations/no-access.json"
                  loop
                  autoplay
                  style={{ height: 200, width: 200 }}
                />
              </Html>
            }
          >
            <AccessDeniedModel />
            <OrbitControls enableZoom={false} />
          </Suspense>
        </Canvas>
      </div>
      <motion.h1
        className="text-2xl font-semibold mt-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        Acceso no autorizado
      </motion.h1>
    </div>
  )
}