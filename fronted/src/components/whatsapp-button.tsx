"use client"

import Link from "next/link"
import { MessageCircle } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useState } from "react"
import { usePathname } from "next/navigation"
import { useAuth } from "@/context/auth-context"

export default function WhatsappButton() {
  const [hovered, setHovered] = useState(false)
  const pathname = usePathname()
  const { role } = useAuth()

  if (pathname.startsWith("/dashboard") || role !== "CLIENT") {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-6 right-6 z-50"
    >
      <Link
        href="https://wa.me/51949426294"
        target="_blank"
        rel="noopener noreferrer"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="group relative block"
      >
        <AnimatePresence>
          {hovered && (
            <motion.span
              key="label"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="absolute right-full mr-2 hidden sm:block bg-green-500 text-white px-3 py-1 rounded-md shadow-lg whitespace-nowrap text-xs"
            >
              Comunícate con nosotros
            </motion.span>
          )}
        </AnimatePresence>

        <motion.div
          whileHover={{ scale: 1.1, rotate: 6 }}
          whileTap={{ scale: 0.95 }}
          className="bg-green-500 text-white p-4 rounded-full shadow-lg flex items-center justify-center group-hover:animate-bounce"
        >
          <MessageCircle className="w-6 h-6" />
        </motion.div>
      </Link>
    </motion.div>
  )
}