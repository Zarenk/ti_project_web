"use client"
import { useEffect, useRef } from "react"

type Phase = "idle" | "attack" | "defend"

/* ── Easing ───────────────────────────────────────────── */
const easeOut = (t: number) => 1 - (1 - t) ** 3
const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2

/* ── Palette (Meta Knight) ────────────────────────────── */
const P = {
  body: "#2B3990",
  bodyHi: "#3B4CB0",
  bodyLo: "#1C2760",
  mask: "#B8C4D8",
  maskHi: "#D8E0F0",
  maskLo: "#7888A0",
  maskEdge: "#D4A800",
  visor: "#080818",
  eye: "#FFE040",
  eyeBright: "#FFFDE0",
  eyeGlow: "rgba(255,224,64,0.35)",
  cape: "#121848",
  capeTip: "#1E2870",
  capeInner: "#5C2D91",
  shoe: "#6B3FA0",
  shoeLo: "#4A2878",
  hand: "#B8C0D0",
  gold: "#D4A800",
  goldHi: "#FFD700",
  gem: "#FF2050",
  bladeA: "#FF8800",
  bladeB: "#FFE080",
  shadow: "rgba(0,0,0,0.16)",
}

export default function UnauthorizedKnight() {
  const boxRef = useRef<HTMLDivElement>(null)
  const cvRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const box = boxRef.current!
    const cv = cvRef.current!
    const ctx = cv.getContext("2d")!

    let W = 0
    let H = 0
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    const resize = () => {
      W = box.clientWidth
      H = box.clientHeight
      cv.width = W * dpr
      cv.height = H * dpr
      cv.style.width = W + "px"
      cv.style.height = H + "px"
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()

    /* ── State ──────────────────────────────────────── */
    let phase: Phase = "idle"
    let phaseT = 0
    let mx = W / 2
    let my = H / 2
    let bobY = 0
    let blinkT = 0
    let blink = false
    let swing = 0
    let defend = 0
    let last = performance.now()
    let raf = 0
    let hidden = false
    let clickTimer: ReturnType<typeof setTimeout> | null = null

    const sc = () => Math.min(W, H) * 0.0026

    /* ── Events ─────────────────────────────────────── */
    const onMove = (e: MouseEvent) => {
      const r = box.getBoundingClientRect()
      mx = e.clientX - r.left
      my = e.clientY - r.top
    }
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0]
      const r = box.getBoundingClientRect()
      mx = t.clientX - r.left
      my = t.clientY - r.top
    }
    const onClick = () => {
      if (clickTimer) return
      clickTimer = setTimeout(() => {
        clickTimer = null
        if (phase !== "idle") return
        phase = "attack"
        phaseT = 0
      }, 220)
    }
    const onDbl = (e: Event) => {
      e.preventDefault()
      if (clickTimer) {
        clearTimeout(clickTimer)
        clickTimer = null
      }
      phase = "defend"
      phaseT = 0
      swing = 0
    }
    const onVis = () => {
      hidden = document.hidden
    }

    box.addEventListener("mousemove", onMove)
    box.addEventListener("touchmove", onTouchMove, { passive: true })
    box.addEventListener("click", onClick)
    box.addEventListener("dblclick", onDbl)
    document.addEventListener("visibilitychange", onVis)

    /* ── Draw helpers ───────────────────────────────── */
    const fill = (c: string) => {
      ctx.fillStyle = c
    }
    const ell = (
      x: number,
      y: number,
      rx: number,
      ry: number,
      c: string,
    ) => {
      ctx.fillStyle = c
      ctx.beginPath()
      ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), 0, 0, Math.PI * 2)
      ctx.fill()
    }

    /* ── Draw Meta Knight ───────────────────────────── */
    const drawKnight = (s: number, lx: number, ly: number, now: number) => {
      const R = 54 * s
      const t = now / 1000

      /* ── 1  Ground shadow ── */
      ell(0, R + 18 * s, R * 0.75, 8 * s, P.shadow)

      /* ── 2  Cape (behind body) ── */
      const capeWave = Math.sin(t * 1.8) * 6 * s
      const capeDef = defend * 0.3 // shrink when defending
      ctx.save()
      // Left wing
      fill(P.cape)
      ctx.beginPath()
      ctx.moveTo(-12 * s, -22 * s)
      ctx.bezierCurveTo(
        -75 * s + capeWave,
        -5 * s,
        -80 * s + capeWave * 0.6,
        55 * s,
        -55 * s * (1 - capeDef) + capeWave * 0.4,
        75 * s,
      )
      ctx.quadraticCurveTo(-30 * s, 55 * s, -18 * s, 30 * s)
      ctx.closePath()
      ctx.fill()
      // Wing tip highlight
      fill(P.capeTip)
      ctx.beginPath()
      ctx.moveTo(-55 * s * (1 - capeDef) + capeWave * 0.4, 75 * s)
      ctx.quadraticCurveTo(
        -70 * s + capeWave * 0.5,
        58 * s,
        -65 * s + capeWave,
        42 * s,
      )
      ctx.quadraticCurveTo(-50 * s, 55 * s, -55 * s * (1 - capeDef) + capeWave * 0.4, 75 * s)
      ctx.fill()

      // Right wing
      fill(P.cape)
      ctx.beginPath()
      ctx.moveTo(12 * s, -22 * s)
      ctx.bezierCurveTo(
        75 * s - capeWave,
        -5 * s,
        80 * s - capeWave * 0.6,
        55 * s,
        55 * s * (1 - capeDef) - capeWave * 0.4,
        75 * s,
      )
      ctx.quadraticCurveTo(30 * s, 55 * s, 18 * s, 30 * s)
      ctx.closePath()
      ctx.fill()
      fill(P.capeTip)
      ctx.beginPath()
      ctx.moveTo(55 * s * (1 - capeDef) - capeWave * 0.4, 75 * s)
      ctx.quadraticCurveTo(
        70 * s - capeWave * 0.5,
        58 * s,
        65 * s - capeWave,
        42 * s,
      )
      ctx.quadraticCurveTo(50 * s, 55 * s, 55 * s * (1 - capeDef) - capeWave * 0.4, 75 * s)
      ctx.fill()
      ctx.restore()

      /* ── 3  Body ── */
      const grad = ctx.createRadialGradient(
        -12 * s,
        -10 * s,
        R * 0.08,
        0,
        0,
        R,
      )
      grad.addColorStop(0, P.bodyHi)
      grad.addColorStop(0.6, P.body)
      grad.addColorStop(1, P.bodyLo)
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(0, 0, R, 0, Math.PI * 2)
      ctx.fill()

      /* ── 4  Shoes ── */
      ell(-20 * s, R * 0.72 + 14 * s, 17 * s, 11 * s, P.shoe)
      ell(-22 * s, R * 0.72 + 12 * s, 12 * s, 7 * s, P.shoeLo)
      ell(20 * s, R * 0.72 + 14 * s, 17 * s, 11 * s, P.shoe)
      ell(18 * s, R * 0.72 + 12 * s, 12 * s, 7 * s, P.shoeLo)

      /* ── 5  Mask ── */
      ctx.save()
      ctx.beginPath()
      ctx.arc(0, 0, R + 0.5, 0, Math.PI * 2)
      ctx.clip()

      const mGrad = ctx.createLinearGradient(0, -R, 0, 12 * s)
      mGrad.addColorStop(0, P.maskHi)
      mGrad.addColorStop(0.45, P.mask)
      mGrad.addColorStop(1, P.maskLo)
      ctx.fillStyle = mGrad
      ctx.beginPath()
      ctx.moveTo(-R * 0.92, 8 * s)
      ctx.quadraticCurveTo(-R * 0.95, -R * 0.5, 0, -R * 0.95)
      ctx.quadraticCurveTo(R * 0.95, -R * 0.5, R * 0.92, 8 * s)
      ctx.quadraticCurveTo(0, 22 * s, -R * 0.92, 8 * s)
      ctx.fill()

      // Mask center ridge
      ctx.strokeStyle = P.maskLo
      ctx.lineWidth = 1.8 * s
      ctx.beginPath()
      ctx.moveTo(0, -R * 0.88)
      ctx.lineTo(0, 8 * s)
      ctx.stroke()

      // Visor (V-shaped opening)
      fill(P.visor)
      const vY = -4 * s
      const vW = 38 * s
      const vH = 13 * s
      ctx.beginPath()
      ctx.roundRect(-vW / 2, vY, vW, vH, 3 * s)
      ctx.fill()
      ctx.beginPath()
      ctx.roundRect(-5 * s, vY + 2 * s, 10 * s, vH + 8 * s, [
        0,
        0,
        3 * s,
        3 * s,
      ])
      ctx.fill()

      ctx.restore()

      // Gold edge trim
      ctx.strokeStyle = P.maskEdge
      ctx.lineWidth = 2.2 * s
      ctx.beginPath()
      ctx.moveTo(-R * 0.88, 6 * s)
      ctx.quadraticCurveTo(-R * 0.9, -R * 0.45, 0, -R * 0.9)
      ctx.quadraticCurveTo(R * 0.9, -R * 0.45, R * 0.88, 6 * s)
      ctx.stroke()

      // Gold decorations on sides
      ell(-R * 0.78, 0, 4 * s, 4 * s, P.goldHi)
      ell(R * 0.78, 0, 4 * s, 4 * s, P.goldHi)

      /* ── 6  Eyes ── */
      if (!blink) {
        const ex = lx * 4.5 * s
        const ey = ly * 2.5 * s
        const eyeY = vY + 5 * s

        // Left eye
        ell(-12 * s + ex, eyeY + ey, 7 * s, 5 * s, P.eyeGlow)
        ell(-12 * s + ex, eyeY + ey, 4.5 * s, 3.5 * s, P.eye)
        ell(-11 * s + ex, eyeY - 1 * s + ey, 1.8 * s, 1.5 * s, P.eyeBright)

        // Right eye
        ell(12 * s + ex, eyeY + ey, 7 * s, 5 * s, P.eyeGlow)
        ell(12 * s + ex, eyeY + ey, 4.5 * s, 3.5 * s, P.eye)
        ell(13 * s + ex, eyeY - 1 * s + ey, 1.8 * s, 1.5 * s, P.eyeBright)
      }

      /* ── 7  Hand + Sword (Galaxia) ── */
      ctx.save()
      const pivX = R * 0.58
      const pivY = 8 * s
      ctx.translate(pivX, pivY)

      const restA = Math.PI * 0.12
      const atkA = -Math.PI * 0.88
      const defA = -Math.PI * 0.42
      const curA =
        phase === "attack"
          ? restA + (atkA - restA) * swing
          : phase === "defend"
            ? restA + (defA - restA) * defend
            : restA + Math.sin(t * 1.2) * 0.04
      ctx.rotate(curA)

      // Hand
      ell(0, 0, 9 * s, 9 * s, P.hand)

      // Hilt
      const hW = 7 * s
      const hH = 14 * s
      fill(P.gold)
      ctx.fillRect(-hW / 2, -hH, hW, hH)

      // Cross guard
      fill(P.goldHi)
      ctx.beginPath()
      ctx.roundRect(-13 * s, -hH - 3.5 * s, 26 * s, 5 * s, 2 * s)
      ctx.fill()

      // Gem
      ell(0, -hH - 1 * s, 3.5 * s, 3.5 * s, P.gem)
      ell(-0.8 * s, -hH - 2 * s, 1.2 * s, 1 * s, "rgba(255,255,255,0.5)")

      // Flame blade (zigzag)
      const bLen = 48 * s
      const bY = -hH - 5 * s
      const bGrad = ctx.createLinearGradient(0, bY, 0, bY - bLen)
      bGrad.addColorStop(0, P.bladeA)
      bGrad.addColorStop(0.4, "#FFBB44")
      bGrad.addColorStop(1, P.bladeB)
      ctx.fillStyle = bGrad
      ctx.beginPath()
      ctx.moveTo(-4.5 * s, bY)
      ctx.lineTo(-7 * s, bY - bLen * 0.28)
      ctx.lineTo(-3.5 * s, bY - bLen * 0.24)
      ctx.lineTo(-6.5 * s, bY - bLen * 0.52)
      ctx.lineTo(-2.5 * s, bY - bLen * 0.48)
      ctx.lineTo(-5 * s, bY - bLen * 0.78)
      ctx.lineTo(0, bY - bLen)
      ctx.lineTo(5 * s, bY - bLen * 0.78)
      ctx.lineTo(2.5 * s, bY - bLen * 0.48)
      ctx.lineTo(6.5 * s, bY - bLen * 0.52)
      ctx.lineTo(3.5 * s, bY - bLen * 0.24)
      ctx.lineTo(7 * s, bY - bLen * 0.28)
      ctx.lineTo(4.5 * s, bY)
      ctx.closePath()
      ctx.fill()

      // Blade inner glow
      ctx.fillStyle = "rgba(255,255,240,0.25)"
      ctx.beginPath()
      ctx.moveTo(-2 * s, bY - 2 * s)
      ctx.lineTo(-1 * s, bY - bLen * 0.85)
      ctx.lineTo(0, bY - bLen * 0.95)
      ctx.lineTo(1 * s, bY - bLen * 0.85)
      ctx.lineTo(2 * s, bY - 2 * s)
      ctx.closePath()
      ctx.fill()

      ctx.restore()

      /* ── 8  Cape front (defend) ── */
      if (defend > 0.01) {
        ctx.save()
        ctx.globalAlpha = defend * 0.92

        // Main cape wrap
        fill(P.cape)
        ctx.beginPath()
        ctx.moveTo(-R * 0.75, -18 * s)
        ctx.bezierCurveTo(
          -R * 1.05,
          15 * s,
          -R * 0.5,
          R * 0.9,
          -R * 0.15,
          R * 0.75,
        )
        ctx.lineTo(R * 0.15, R * 0.75)
        ctx.bezierCurveTo(
          R * 0.5,
          R * 0.9,
          R * 1.05,
          15 * s,
          R * 0.75,
          -18 * s,
        )
        ctx.quadraticCurveTo(0, -32 * s, -R * 0.75, -18 * s)
        ctx.fill()

        // Inner lining
        fill(P.capeInner)
        ctx.beginPath()
        ctx.moveTo(-R * 0.55, -8 * s)
        ctx.bezierCurveTo(
          -R * 0.8,
          18 * s,
          -R * 0.35,
          R * 0.7,
          -R * 0.08,
          R * 0.6,
        )
        ctx.lineTo(R * 0.08, R * 0.6)
        ctx.bezierCurveTo(
          R * 0.35,
          R * 0.7,
          R * 0.8,
          18 * s,
          R * 0.55,
          -8 * s,
        )
        ctx.quadraticCurveTo(0, -22 * s, -R * 0.55, -8 * s)
        ctx.fill()

        // Eyes peek through cape
        if (!blink) {
          const ex = lx * 3 * s
          const ey = ly * 2 * s
          ell(-10 * s + ex, -4 * s + ey, 5 * s, 3.5 * s, P.eyeGlow)
          ell(-10 * s + ex, -4 * s + ey, 3 * s, 2.5 * s, P.eye)
          ell(10 * s + ex, -4 * s + ey, 5 * s, 3.5 * s, P.eyeGlow)
          ell(10 * s + ex, -4 * s + ey, 3 * s, 2.5 * s, P.eye)
        }

        ctx.restore()
      }
    }

    /* ── Main loop ──────────────────────────────────── */
    const tick = () => {
      const now = performance.now()
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now

      if (!hidden) {
        bobY = Math.sin(now / 1000 * 2) * 4

        // Blink
        blinkT += dt
        if (!blink && blinkT > 2.8 + Math.random() * 2) {
          blink = true
          blinkT = 0
        }
        if (blink && blinkT > 0.13) {
          blink = false
          blinkT = 0
        }

        // Phase transitions
        if (phase === "attack") {
          phaseT = Math.min(1, phaseT + dt / 0.42)
          swing =
            phaseT < 0.35
              ? easeOut(phaseT / 0.35)
              : 1 - easeInOut((phaseT - 0.35) / 0.65)
          if (phaseT >= 1) {
            phase = "idle"
            swing = 0
            phaseT = 0
          }
        } else if (phase === "defend") {
          phaseT = Math.min(1, phaseT + dt / 0.85)
          if (phaseT < 0.25) defend = easeOut(phaseT / 0.25)
          else if (phaseT > 0.7) defend = 1 - easeInOut((phaseT - 0.7) / 0.3)
          else defend = 1
          if (phaseT >= 1) {
            phase = "idle"
            defend = 0
            phaseT = 0
          }
        }

        // Draw
        const s = sc()
        const cx = W / 2
        const cy = H / 2 + 8

        ctx.clearRect(0, 0, W, H)

        const lx = Math.max(-1, Math.min(1, (mx - cx) / (W * 0.4)))
        const ly = Math.max(-1, Math.min(1, (my - cy) / (H * 0.4)))

        ctx.save()
        ctx.translate(cx, cy + bobY * s)
        ctx.rotate(lx * 0.04)

        drawKnight(s, lx, ly, now)

        ctx.restore()
      }

      raf = requestAnimationFrame(tick)
    }
    tick()

    const ro = new ResizeObserver(resize)
    ro.observe(box)

    return () => {
      cancelAnimationFrame(raf)
      if (clickTimer) clearTimeout(clickTimer)
      box.removeEventListener("mousemove", onMove)
      box.removeEventListener("touchmove", onTouchMove)
      box.removeEventListener("click", onClick)
      box.removeEventListener("dblclick", onDbl)
      document.removeEventListener("visibilitychange", onVis)
      ro.disconnect()
    }
  }, [])

  return (
    <div
      ref={boxRef}
      className="pointer-events-auto absolute inset-0 z-10 cursor-crosshair select-none"
    >
      <canvas ref={cvRef} className="absolute inset-0" />
      <p className="absolute bottom-0 inset-x-0 text-center text-[11px] text-muted-foreground/40 select-none pointer-events-none">
        Click: atacar · Doble click: defender
      </p>
    </div>
  )
}
