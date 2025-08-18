"use client"

import { useEffect, useRef } from "react"
import Navbar from "@/components/navbar"

export default function GsapDemoPage() {
  const titleRef = useRef<HTMLHeadingElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    let ctx: any
    async function loadGsap() {
      try {
        const gsapModule = await import("gsap")
        const ScrollTrigger = await import("gsap/ScrollTrigger")
        gsapModule.default.registerPlugin(ScrollTrigger.default)
        ctx = gsapModule.default.context(() => {
          gsapModule.default.from(titleRef.current, { opacity: 0, y: -50, duration: 1 })
          gsapModule.default.from(".demo-item", {
            opacity: 0,
            y: 50,
            stagger: 0.2,
            scrollTrigger: {
              trigger: listRef.current,
              start: "top 80%",
            },
          })
        })
      } catch (err) {
        console.error("GSAP demo failed to load", err)
      }
    }
    loadGsap()
    return () => ctx?.revert()
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto py-20">
        <h2 ref={titleRef} className="text-3xl font-bold mb-8">Ejemplos de animación GSAP</h2>
        <ul ref={listRef} className="space-y-4">
          <li className="demo-item p-4 bg-gray-200 dark:bg-gray-700 rounded">Fade in al hacer scroll 1</li>
          <li className="demo-item p-4 bg-gray-200 dark:bg-gray-700 rounded">Fade in al hacer scroll 2</li>
          <li className="demo-item p-4 bg-gray-200 dark:bg-gray-700 rounded">Fade in al hacer scroll 3</li>
        </ul>
      </div>
    </div>
  )
}