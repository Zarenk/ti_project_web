"use client"

import { Player } from "@lottiefiles/react-lottie-player"
import { h1 as MotionH1 } from "framer-motion/client"

export default function UnauthorizedPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="w-64 h-64">
        <Player
          src="/animations/no-access.json"
          loop
          autoplay
          style={{ height: 200, width: 200 }}
        />
      </div>
      <MotionH1
        className="text-2xl font-semibold mt-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        Acceso no autorizado
      </MotionH1>
    </div>
  )
}