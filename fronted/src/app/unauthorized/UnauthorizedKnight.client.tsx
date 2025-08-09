"use client"
import { useEffect, useRef, useState } from "react"
import * as THREE from "three"

type Phase = "idle" | "attack" | "defend"

export default function UnauthorizedKnight() {
  const containerRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)
  const [badgeColor, setBadgeColor] = useState("#ffffff")

  useEffect(() => {
    const el = containerRef.current!
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(el.clientWidth, el.clientHeight)
    el.appendChild(renderer.domElement)

    // Cámara ortográfica
    const camera = new THREE.OrthographicCamera(
      -el.clientWidth / 120,
      el.clientWidth / 120,
      el.clientHeight / 120,
      -el.clientHeight / 120,
      0.1,
      100
    )
    camera.position.set(0, 2, 5)
    camera.lookAt(0, 0, 0)

    const scene = new THREE.Scene()
    scene.add(new THREE.AmbientLight(0xffffff, 0.9))
    const dir = new THREE.DirectionalLight(0xffffff, 0.8)
    dir.position.set(4, 8, 6)
    scene.add(dir)

    // === MATERIALES ===
    const matBlue   = new THREE.MeshStandardMaterial({ color: 0x3352ff, flatShading: true })
    const matSilver = new THREE.MeshStandardMaterial({ color: 0xc0c6cf, flatShading: true })
    const matVisor  = new THREE.MeshStandardMaterial({ color: 0x20242a, flatShading: true })
    const matEye    = new THREE.MeshBasicMaterial({ color: 0xffea00, toneMapped: false })
    const matPurple = new THREE.MeshStandardMaterial({ color: 0x6b2bd6, flatShading: true })
    const matCape   = new THREE.MeshStandardMaterial({ color: 0x6a1bb0, side: THREE.DoubleSide })
    const matSword  = new THREE.MeshStandardMaterial({ color: 0xffd84a, emissive: 0x7a5d0c, emissiveIntensity: 0.25, metalness: 0.7, roughness: 0.35 })

    // === CABALLERO ===
    const knight = new THREE.Group()
    scene.add(knight)

    // Cuerpo
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.9, 14, 10), matBlue)
    knight.add(body)

    // Casco
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(1.02, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), matSilver)
    helmet.position.y = 0.12
    knight.add(helmet)

    // Visor
    const visor = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.38, 0.15), matVisor)
    visor.position.set(0, 0.25, 0.78)
    knight.add(visor)

    // Ojos
    const eyeGeom = new THREE.PlaneGeometry(0.22, 0.1)
    const eyeL = new THREE.Mesh(eyeGeom, matEye)
    eyeL.position.set(-0.22, 0.26, 0.81)
    const eyeR = eyeL.clone()
    eyeR.position.x = 0.22
    knight.add(eyeL, eyeR)

    // Pauldrons
    const pauldronGeom = new THREE.SphereGeometry(0.35, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2)
    const pauldronL = new THREE.Mesh(pauldronGeom, matPurple)
    pauldronL.position.set(-0.78, 0.42, 0)
    pauldronL.rotation.z = Math.PI * 0.5
    const pauldronR = pauldronL.clone()
    pauldronR.position.x = 0.78
    knight.add(pauldronL, pauldronR)

    // Brazos
    const armRight = new THREE.Group()
    armRight.position.set(0.78, 0.35, 0)
    armRight.add(new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), matSilver))
    knight.add(armRight)

    const armLeft = new THREE.Group()
    armLeft.position.set(-0.78, 0.35, 0)
    armLeft.add(new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), matSilver))
    knight.add(armLeft)

    // Botas
    const bootGeom = new THREE.BoxGeometry(0.5, 0.3, 0.6)
    const bootL = new THREE.Mesh(bootGeom, matPurple)
    bootL.position.set(-0.42, -0.82, 0.05)
    const bootR = bootL.clone()
    bootR.position.x = 0.42
    knight.add(bootL, bootR)

    // Capa
    const capeGeom = new THREE.PlaneGeometry(2.8, 1.7, 10, 3)
    const cape = new THREE.Mesh(capeGeom, matCape)
    const capePivot = new THREE.Group()
    capePivot.position.set(0, 0.65, -0.15)
    cape.position.set(0, 0, -0.8)
    cape.rotation.x = Math.PI * 0.15
    capePivot.add(cape)
    knight.add(capePivot)

    // Curva inicial de capa
    const posCape = capeGeom.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < posCape.count; i++) {
      const x = posCape.getX(i)
      const bend = (Math.abs(x) / 1.4) ** 1.2
      posCape.setZ(i, -0.15 - bend * 0.25)
    }
    posCape.needsUpdate = true

    // Espada
    const swordGroup = new THREE.Group()
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.4, 0.12), matSword)
    blade.position.y = -0.55
    swordGroup.add(blade)
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.18), matSword)
    guard.position.y = -0.02
    swordGroup.add(guard)
    const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.25, 8), matSword)
    hilt.rotation.z = Math.PI * 0.5
    hilt.position.y = 0.13
    swordGroup.add(hilt)
    swordGroup.position.set(0.18, -0.05, 0)
    armRight.add(swordGroup)

    // === ANIMACIÓN ===
    let phase: Phase = "idle"
    let animT = 0
    let targetYaw = 0
    let paused = false
    let lastTime = performance.now()

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width
      targetYaw = THREE.MathUtils.degToRad(THREE.MathUtils.lerp(-45, 45, x))
    }

    const onClick = () => {
      if (phase !== "idle") return
      badgeRef.current!.style.opacity = "1"
      setTimeout(() => (badgeRef.current!.style.opacity = "0"), 1000)
      phase = "attack"
      animT = 0
    }

    const onVisibility = () => (paused = document.hidden)

    el.addEventListener("mousemove", onMove)
    el.addEventListener("click", onClick)
    document.addEventListener("visibilitychange", onVisibility)

    const onResize = () => {
      const w = el.clientWidth, h = el.clientHeight
      renderer.setSize(w, h)
      camera.left = -w / 120
      camera.right = w / 120
      camera.top = h / 120
      camera.bottom = -h / 120
      camera.updateProjectionMatrix()
    }
    const ro = new ResizeObserver(onResize)
    ro.observe(el)

    const tick = () => {
      const now = performance.now()
      const delta = Math.min(0.05, (now - lastTime) / 1000)
      lastTime = now

      if (!paused) {
        knight.rotation.y += (targetYaw - knight.rotation.y) * 0.1
        knight.position.y = Math.sin(now / 1000 * 2) * 0.03 - 0.25

        // ondulación capa idle
        for (let i = 0; i < posCape.count; i++) {
          const x = posCape.getX(i)
          const bend = (Math.abs(x) / 1.4) ** 1.2
          const wave = Math.sin(now / 1000 * 2 + x * 2.2) * 0.03
          posCape.setZ(i, -0.15 - bend * 0.25 + wave)
        }
        posCape.needsUpdate = true

        if (phase === "attack") {
          const dur = 0.7
          animT = Math.min(1, animT + delta / dur)
          const cut = THREE.MathUtils.smoothstep(animT, 0, 1)
          armRight.rotation.x = THREE.MathUtils.lerp(0, -1.25, cut)
          armRight.rotation.y = THREE.MathUtils.lerp(0, 0.35, cut)
          blade.rotation.z = THREE.MathUtils.lerp(0, -0.35, cut)
          if (animT >= 1) { phase = "defend"; animT = 0 }
        } else if (phase === "defend") {
          const dur = 0.5
          animT = Math.min(1, animT + delta / dur)
          const block = THREE.MathUtils.smoothstep(animT, 0, 1)
          armLeft.rotation.x = THREE.MathUtils.lerp(0, -0.55, block)
          if (animT >= 1) {
            setTimeout(() => {
              armRight.rotation.set(0, 0, 0)
              blade.rotation.set(0, 0, 0)
              armLeft.rotation.set(0, 0, 0)
              phase = "idle"
            }, 250)
          }
        }
      }

      renderer.render(scene, camera)
      rafRef.current = requestAnimationFrame(tick)
    }
    tick()

    return () => {
      cancelAnimationFrame(rafRef.current!)
      el.removeEventListener("mousemove", onMove)
      el.removeEventListener("click", onClick)
      document.removeEventListener("visibilitychange", onVisibility)
      ro.disconnect()
      renderer.dispose()
      el.removeChild(renderer.domElement)
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
          top: "20%",
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
