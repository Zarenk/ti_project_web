"use client"

import { Player } from "@lottiefiles/react-lottie-player"
import { h1 as MotionH1 } from "framer-motion/client"
import UnauthorizedKnight from "./UnauthorizedKnight"

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
      <div className="relative mt-4 flex items-center justify-center">
        <MotionH1
          className="text-2xl font-semibold"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Acceso no autorizado
        </MotionH1>
        <UnauthorizedKnight />
      </div>
    </div>
  )
}