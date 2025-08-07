"use client"

import { useEffect, useRef, useState } from "react"
import clsx from "clsx"

interface ScrollUpSectionProps {
  children: React.ReactNode
  className?: string
}

export default function ScrollUpSection({
  children,
  className,
}: ScrollUpSectionProps) {
  const ref = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry], obs) => {
        if (entry.isIntersecting) {
          setVisible(true)
          obs.unobserve(entry.target)
        }
      },
      { threshold: 0.2 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <section
      ref={ref}
      className={clsx("scroll-up-section", className, {
        "is-visible": visible,
      })}
    >
      {children}
    </section>
  )
}