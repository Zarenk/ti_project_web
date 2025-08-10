"use client"
import { useEffect, useRef, useState } from "react"
import * as THREE from "three"

type Phase = "idle" | "attack" | "defend"

type Pix = 0 | 1 | 2 // 0: transparente, 1: blanco, 2: negro

// ===== Sprites 16x16 en B/N =====
// Nota: Mantengo formas muy simples para un “caballerito” genérico (no Meta Knight).
// Capa base: cuerpo redondeado + ojos
const BODY_16: Pix[] = (() => {
  // disco “gordo” + ojos (dos columnas negras)
  const S: Pix[] = new Array(16 * 16).fill(0)
  const circle = (cx: number, cy: number, r: number) => {
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const dx = x - cx, dy = y - cy
        if (dx * dx + dy * dy <= r * r) S[y * 16 + x] = 1
      }
    }
  }
  circle(8, 9, 6.5)

  // ojos (negros)
  const setEye = (ex: number, ey: number) => {
    S[(ey + 0) * 16 + ex] = 2
    S[(ey + 1) * 16 + ex] = 2
    S[(ey + 2) * 16 + ex] = 2
  }
  setEye(5, 8)
  setEye(10, 8)

  return S
})()

// Yelmo muy simple (bisel superior y visor recto)
const HELMET_16: Pix[] = (() => {
  const H: Pix[] = new Array(16 * 16).fill(0)
  // línea superior curva (blanca) y visor (negro)
  for (let x = 2; x <= 13; x++) H[3 * 16 + x] = 1
  for (let x = 3; x <= 12; x++) H[4 * 16 + x] = 1
  for (let x = 4; x <= 11; x++) H[5 * 16 + x] = 1
  // visor
  for (let x = 4; x <= 11; x++) H[7 * 16 + x] = 2
  for (let x = 4; x <= 11; x++) H[8 * 16 + x] = 2
  return H
})()

// Brazos (dos “bultos” laterales)
const ARMS_16: Pix[] = (() => {
  const A: Pix[] = new Array(16 * 16).fill(0)
  // izquierda
  A[9 * 16 + 2] = 1; A[10 * 16 + 2] = 1; A[10 * 16 + 3] = 1
  // derecha
  A[9 * 16 + 13] = 1; A[10 * 16 + 13] = 1; A[10 * 16 + 12] = 1
  return A
})()

// Espada (se dibuja en un grupo aparte para animarla)
const SWORD_16: Pix[] = (() => {
  const S: Pix[] = new Array(16 * 16).fill(0)
  // empuñadura negra
  S[11 * 16 + 13] = 2
  S[12 * 16 + 13] = 2
  S[13 * 16 + 13] = 2
  // guarda horizontal
  S[12 * 16 + 12] = 2
  S[12 * 16 + 14] = 2
  // hoja blanca hacia abajo
  for (let y = 8; y <= 11; y++) S[y * 16 + 13] = 1
  for (let y = 4; y <= 7; y++) S[y * 16 + 13] = 1
  return S
})()

export default function UnauthorizedKnight() {
  const containerRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)
  const [badgeColor, setBadgeColor] = useState("#ffffff")

  useEffect(() => {
    const el = containerRef.current!
    // ===== Renderer en BAJA resolución para pixelar =====
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true })
    renderer.setClearAlpha(0)
    // Fijamos una resolución baja “retro”
    const LOW_W = 160
    const LOW_H = 160
    renderer.setPixelRatio(1) // importante: sin HiDPI
    renderer.setSize(LOW_W, LOW_H, false)
    // Escalar por CSS al tamaño del contenedor y pixelar
    renderer.domElement.style.width = "100%"
    renderer.domElement.style.height = "100%"
    ;(renderer.domElement.style as any).imageRendering = "pixelated"
    el.appendChild(renderer.domElement)

    // Cámara ortográfica sobre una placa frontal
    const cam = new THREE.OrthographicCamera(-8, 8, 8, -8, 0.1, 100)
    cam.position.set(0, 0, 10)
    cam.lookAt(0, 0, 0)

    const scene = new THREE.Scene()

    // Materiales B/N
    const MAT_WHITE = new THREE.MeshBasicMaterial({ color: 0xffffff })
    const MAT_BLACK = new THREE.MeshBasicMaterial({ color: 0x000000 })

    // Utilidad: crea un grupo de “píxeles” (cuadrados) a partir de un mapa 16×16
    function makePixelLayer(map: Pix[], pixelSize = 1): THREE.Group {
      const g = new THREE.Group()
      const geo = new THREE.PlaneGeometry(pixelSize, pixelSize)
      const instWhite: THREE.Mesh[] = []
      const instBlack: THREE.Mesh[] = []
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          const v = map[y * 16 + x]
          if (v === 0) continue
          const mesh = new THREE.Mesh(geo, v === 1 ? MAT_WHITE : MAT_BLACK)
          // centrado en (0,0)
          const px = (x - 8) * pixelSize + pixelSize / 2
          const py = (8 - y) * pixelSize - pixelSize / 2
          mesh.position.set(px, py, 0)
          g.add(mesh)
          if (v === 1) instWhite.push(mesh); else instBlack.push(mesh)
        }
      }
      return g
    }

    // ===== Construcción del “caballero” pixelado =====
    const knight = new THREE.Group()
    scene.add(knight)

    // Orden Z: casco delante de cuerpo, brazos, y espada al frente
    const body = makePixelLayer(BODY_16, 1)
    body.position.z = 0
    knight.add(body)

    const helmet = makePixelLayer(HELMET_16, 1)
    helmet.position.z = 0.1
    knight.add(helmet)

    const arms = makePixelLayer(ARMS_16, 1)
    arms.position.z = 0.15
    knight.add(arms)

    // Espada en grupo aparte para animar “swing”
    const swordGroup = new THREE.Group()
    const sword = makePixelLayer(SWORD_16, 1)
    swordGroup.add(sword)
    swordGroup.position.set(1.5, -1.5, 0.2) // anclaje al costado
    knight.add(swordGroup)

    // Pequeño “sombrado” por duplicado negro a z- y transparencia
    const shadow = makePixelLayer(BODY_16.map(v => (v ? 2 : 0)) as Pix[], 1)
    shadow.position.z = -0.2
    shadow.position.x = 0.4
    shadow.position.y = -0.4
    shadow.children.forEach(m => ((m as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.15)
    shadow.children.forEach(m => ((m as THREE.Mesh).material as THREE.MeshBasicMaterial).transparent = true)
    knight.add(shadow)

    // ===== Estado/Interacción =====
    let phase: Phase = "idle"
    let animT = 0
    let paused = false
    let last = performance.now()
    const onClick = () => {
      if (phase !== "idle") return
      if (badgeRef.current) {
        badgeRef.current.style.opacity = "1"
        setTimeout(() => { if (badgeRef.current) badgeRef.current.style.opacity = "0" }, 900)
      }
      phase = "attack"
      animT = 0
    }
    const onVisibility = () => (paused = document.hidden)
    el.addEventListener("click", onClick)
    document.addEventListener("visibilitychange", onVisibility)

    // Idle “bob” + parpadeo simple (apagamos ojos 1 frame cada cierto tiempo)
    let blinkTimer = 0
    const blinkInterval = 2200
    let eyesOff = false

    // Referencias rápidas a “ojos” (dos píxeles negros en BODY_16: (5,8..10) y (10,8..10))
    const findEyeMeshes = () => {
      const eyes: THREE.Mesh[] = []
      body.children.forEach((m) => {
        const mesh = m as THREE.Mesh
        const mat = mesh.material as THREE.MeshBasicMaterial
        if (mat.color.getHex() === 0x000000) eyes.push(mesh)
      })
      return eyes
    }
    const eyeMeshes = findEyeMeshes()

    // Loop
    const tick = () => {
      const now = performance.now()
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now

      if (!paused) {
        // bamboleo
        const t = now / 1000
        knight.position.y = Math.sin(t * 2) * 0.25 - 0.5
        knight.rotation.z = Math.sin(t * 1.6) * 0.03

        // parpadeo
        blinkTimer += dt * 1000
        if (blinkTimer > blinkInterval) {
          eyesOff = !eyesOff
          blinkTimer = 0
          // apagar/encender ojos (cambiar a blanco)
          for (const em of eyeMeshes) {
            const mat = (em.material as THREE.MeshBasicMaterial)
            mat.color.setHex(eyesOff ? 0xffffff : 0x000000)
          }
        }

        if (phase === "attack") {
          const dur = 0.5
          animT = Math.min(1, animT + dt / dur)
          const k = THREE.MathUtils.smoothstep(animT, 0, 1)
          // swing de la espada
          swordGroup.rotation.z = THREE.MathUtils.lerp(0, -Math.PI * 0.9, k)
          swordGroup.position.x = THREE.MathUtils.lerp(1.5, 0.6, k)
          swordGroup.position.y = THREE.MathUtils.lerp(-1.5, 0.2, k)
          if (animT >= 1) { phase = "defend"; animT = 0 }
        } else if (phase === "defend") {
          const dur = 0.45
          animT = Math.min(1, animT + dt / dur)
          const k = THREE.MathUtils.smoothstep(animT, 0, 1)
          // subir “escudo” (simulado con casco hacia delante)
          helmet.position.y = THREE.MathUtils.lerp(0, 0.5, k)
          arms.position.y = THREE.MathUtils.lerp(0, 0.3, k)
          swordGroup.rotation.z = THREE.MathUtils.lerp(-Math.PI * 0.9, -Math.PI * 0.4, k)
          if (animT >= 1) {
            setTimeout(() => {
              // reset
              helmet.position.y = 0
              arms.position.y = 0
              swordGroup.rotation.set(0, 0, 0)
              swordGroup.position.set(1.5, -1.5, 0.2)
              phase = "idle"
            }, 250)
          }
        }
      }

      renderer.render(scene, cam)
      rafRef.current = requestAnimationFrame(tick)
    }
    tick()

    // Cleanup
    return () => {
      cancelAnimationFrame(rafRef.current!)
      el.removeEventListener("click", onClick)
      document.removeEventListener("visibilitychange", onVisibility)
      renderer.dispose()
      if (renderer.domElement.parentElement === el) el.removeChild(renderer.domElement)
    }
  }, [])

  // Badge color según tema
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)")
    const resolve = () => setBadgeColor(mq?.matches ? "#ffffff" : "#0a0a0a")
    resolve()
    mq?.addEventListener?.("change", resolve)
    return () => mq?.removeEventListener?.("change", resolve)
  }, [])

  const badgeRef = useRef<HTMLDivElement>(null)

  return (
    <div ref={containerRef} className="pointer-events-auto absolute inset-0 z-10">
      <div
        ref={badgeRef}
        style={{
          position: "absolute",
          left: "50%",
          top: "14%",
          transform: "translate(-50%, -50%)",
          fontSize: 14,
          fontWeight: 700,
          color: badgeColor,
          textShadow: "0 1px 4px rgba(0,0,0,0.35)",
          userSelect: "none",
          pointerEvents: "none",
          opacity: 0,
          transition: "opacity 160ms ease-out",
          whiteSpace: "nowrap",
        }}
      >
        Protegida nuestra web
      </div>
    </div>
  )
}
