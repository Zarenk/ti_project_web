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

  // Move elements more drastically to emphasize the upward motion
  const y = useTransform(scrollYProgress, [0, 1], ["100px", "-100px"])

  return (
    <motion.section ref={ref} style={{ y }} className={className}>
      {children}
    </motion.section>
  )
}