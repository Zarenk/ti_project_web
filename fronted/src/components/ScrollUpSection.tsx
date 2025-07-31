"use client"

import { useRef } from "react"
import { motion, useScroll, useTransform } from "framer-motion"

interface ScrollUpSectionProps {
  children: React.ReactNode
  className?: string
}

export default function ScrollUpSection({
  children,
  className,
}: ScrollUpSectionProps) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  })

  // Subtle upward movement combined with a reveal effect
  const y = useTransform(scrollYProgress, [0, 1], ["50px", "-50px"])
  const opacity = useTransform(scrollYProgress, [0, 0.2], [0, 1])
  const clipPath = useTransform(
    scrollYProgress,
    [0, 1],
    ["inset(100% 0 0 0)", "inset(0% 0 0 0)"]
  )

  return (
    <motion.section
      ref={ref}
      style={{ y, opacity, clipPath }}
      className={className}
    >
      {children}
    </motion.section>
  )
}