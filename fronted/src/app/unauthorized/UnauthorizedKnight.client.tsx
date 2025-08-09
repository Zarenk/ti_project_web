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
    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(el.clientWidth, el.clientHeight)
    el.appendChild(renderer.domElement)

    // Cámara ortográfica para look “pixel”
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

    // Escena y luces
    const scene = new THREE.Scene()
    scene.add(new THREE.AmbientLight(0xffffff, 0.9))
    const dir = new THREE.DirectionalLight(0xffffff, 0.8)
    dir.position.set(4, 8, 6)
    scene.add(dir)

    // ====== MATERIALES TOON ======
    const toonBlue   = new THREE.MeshToonMaterial({ color: 0x2f4cff })
    const toonSilver = new THREE.MeshToonMaterial({ color: 0xc7ccd6 })
    const toonBlack  = new THREE.MeshToonMaterial({ color: 0x1b1f26 })
    const toonEye    = new THREE.MeshBasicMaterial({ color: 0xffeb00, toneMapped: false })
    const toonPurple = new THREE.MeshToonMaterial({ color: 0x732ee6 })
    const toonCape   = new THREE.MeshToonMaterial({ color: 0x5b16a8, side: THREE.DoubleSide })
    const toonGold   = new THREE.MeshToonMaterial({ color: 0xffd240 })

    // Utilidad: contorno falso
    function addOutline(mesh: THREE.Mesh, thickness = 1.02) {
      const outline = mesh.clone()
      outline.material = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide })
      outline.scale.multiplyScalar(thickness)
      mesh.add(outline)
      return outline
    }

    // ====== CONSTRUCCIÓN DEL CABALLERO ======
    const knight = new THREE.Group()
    scene.add(knight)

    // Cuerpo
    const bodyGeom = new THREE.SphereGeometry(0.92, 20, 16)
    const body = new THREE.Mesh(bodyGeom, toonBlue)
    addOutline(body, 1.02)
    knight.add(body)

    // Casco (media cúpula)
    const helmetGeom = new THREE.SphereGeometry(1.05, 20, 16, 0, Math.PI * 2, 0, Math.PI / 2)
    const helmet = new THREE.Mesh(helmetGeom, toonSilver)
    helmet.position.y = 0.12
    addOutline(helmet, 1.015)
    knight.add(helmet)

    // Cresta del casco (peine)
    const crest = new THREE.Group()
    const toothGeom = new THREE.BoxGeometry(0.10, 0.28, 0.20)
    for (let i = -4; i <= 4; i++) {
      const t = new THREE.Mesh(toothGeom, toonSilver)
      t.position.set(i * 0.14, 0.38, 0.0)
      t.rotation.z = (i * Math.PI) / 36
      crest.add(t)
    }
    crest.position.y = 0.15
    knight.add(crest)

    // Visor + ojos
    const visorGeom = new THREE.BoxGeometry(1.18, 0.34, 0.16)
    const visor = new THREE.Mesh(visorGeom, toonBlack)
    visor.position.set(0, 0.24, 0.78)
    addOutline(visor, 1.03)
    knight.add(visor)

    const eyeGeom = new THREE.PlaneGeometry(0.28, 0.1)
    const eyeL = new THREE.Mesh(eyeGeom, toonEye)
    eyeL.position.set(-0.25, 0.25, 0.81)
    eyeL.rotation.z = 0.12
    const eyeR = eyeL.clone()
    eyeR.position.x = 0.25
    eyeR.rotation.z = -0.12
    knight.add(eyeL, eyeR)

    // Hombreras con cuernos
    const pauldronBaseGeom = new THREE.SphereGeometry(0.38, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2)
    const hornGeom = new THREE.ConeGeometry(0.12, 0.22, 8)
    function makePauldron(side: 1 | -1) {
      const g = new THREE.Group()
      const base = new THREE.Mesh(pauldronBaseGeom, toonPurple)
      base.rotation.z = Math.PI * 0.5
      const horn = new THREE.Mesh(hornGeom, toonPurple)
      horn.rotation.x = Math.PI
      horn.position.set(0, 0.05, 0.08)
      g.add(base, horn)
      g.position.set(0.82 * side, 0.42, 0)
      addOutline(base, 1.03)
      addOutline(horn, 1.03)
      return g
    }
    const pauldronL = makePauldron(-1)
    const pauldronR = makePauldron(1)
    knight.add(pauldronL, pauldronR)

    // Brazos (grupos para animar)
    const armRight = new THREE.Group()
    armRight.position.set(0.80, 0.34, 0)
    const armRSphere = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 12), toonSilver)
    armRight.add(armRSphere)
    knight.add(armRight)

    const armLeft = new THREE.Group()
    armLeft.position.set(-0.80, 0.34, 0)
    const armLSphere = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 12), toonSilver)
    armLeft.add(armLSphere)
    knight.add(armLeft)

    // Botas
    const bootGeom = new THREE.BoxGeometry(0.56, 0.28, 0.62)
    function makeBoot(x: number) {
      const b = new THREE.Mesh(bootGeom, toonPurple)
      b.position.set(x, -0.84, 0.06)
      b.rotation.x = -0.06
      addOutline(b, 1.03)
      return b
    }
    const bootL = makeBoot(-0.45)
    const bootR = makeBoot(0.45)
    knight.add(bootL, bootR)

    // Alas (capa en dos planos recortados)
    const wingGeom = new THREE.PlaneGeometry(1.6, 1.2, 12, 3)
    // Recorte triangular ligero
    {
      const pos = wingGeom.attributes.position as THREE.BufferAttribute
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i)
        if (x > -0.05) {
          const cut = (x + 0.8) / 2.4
          pos.setY(i, y - Math.max(0, (y + 0.6) * cut * 0.6))
        }
      }
      pos.needsUpdate = true
    }
    const wingL = new THREE.Mesh(wingGeom.clone(), toonCape)
    const wingR = new THREE.Mesh(wingGeom.clone(), toonCape)
    wingL.position.set(-0.15, 0.55, -0.15)
    wingR.position.set(0.15, 0.55, -0.15)
    wingL.rotation.set(Math.PI * 0.08, Math.PI * 0.12, Math.PI * 0.08)
    wingR.rotation.set(Math.PI * 0.08, -Math.PI * 0.12, -Math.PI * 0.08)
    addOutline(wingL, 1.01)
    addOutline(wingR, 1.01)
    knight.add(wingL, wingR)
    const wingLPos = (wingL.geometry as THREE.PlaneGeometry).attributes.position as THREE.BufferAttribute
    const wingRPos = (wingR.geometry as THREE.PlaneGeometry).attributes.position as THREE.BufferAttribute

    // Espada dorada
    const sword = new THREE.Group()
    const bladeGeom = new THREE.BoxGeometry(0.10, 1.5, 0.10)
    const blade = new THREE.Mesh(bladeGeom, toonGold)
    blade.position.y = -0.60
    addOutline(blade, 1.04)
    sword.add(blade)

    const guardCenter = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.2, 8), toonGold)
    guardCenter.rotation.z = Math.PI * 0.5
    sword.add(guardCenter)

    const wingGuardGeom = new THREE.ConeGeometry(0.22, 0.28, 5)
    const guardL = new THREE.Mesh(wingGuardGeom, toonGold)
    guardL.rotation.set(Math.PI * 0.5, 0, Math.PI * 0.30)
    guardL.position.set(-0.22, 0.02, 0)
    const guardR = guardL.clone()
    guardR.rotation.z = -Math.PI * 0.30
    guardR.position.x = 0.22
    sword.add(guardL, guardR)

    const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), toonGold)
    pommel.position.y = 0.18
    sword.add(pommel)

    sword.position.set(0.18, -0.05, 0)
    armRight.add(sword)

    // ====== ESTADO / INTERACCIÓN ======
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
      // badge
      if (badgeRef.current) {
        badgeRef.current.style.opacity = "1"
        setTimeout(() => { if (badgeRef.current) badgeRef.current.style.opacity = "0" }, 1000)
      }
      phase = "attack"
      animT = 0
    }
    const onVisibility = () => (paused = document.hidden)

    el.addEventListener("mousemove", onMove)
    el.addEventListener("click", onClick)
    document.addEventListener("visibilitychange", onVisibility)

    // Resize
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

    // Ondulación de alas
    const waveWings = (t: number) => {
      const amp = 0.06
      for (const pos of [wingLPos, wingRPos]) {
        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i)
          const y = pos.getY(i)
          const zBase = -0.02 - Math.abs(x) * 0.08
          const wave = Math.sin(t * 2 + x * 2.0 + y * 1.2) * amp * (0.4 + (y + 0.6))
          pos.setZ(i, zBase + wave)
        }
        pos.needsUpdate = true
      }
    }

    // Loop
    const tick = () => {
      const now = performance.now()
      const delta = Math.min(0.05, (now - lastTime) / 1000)
      lastTime = now

      if (!paused) {
        // cámara-look: yaw al mouse + idle bob
        knight.rotation.y += (targetYaw - knight.rotation.y) * 0.1
        knight.position.y = Math.sin(now / 1000 * 2) * 0.03 - 0.25

        waveWings(now / 1000)

        if (phase === "attack") {
          const dur = 0.7
          animT = Math.min(1, animT + delta / dur)
          const cut = THREE.MathUtils.smoothstep(animT, 0, 1)
          armRight.rotation.x = THREE.MathUtils.lerp(0, -1.28, cut)
          armRight.rotation.y = THREE.MathUtils.lerp(0,  0.35, cut)
          blade.rotation.z    = THREE.MathUtils.lerp(0, -0.35, cut)
          if (animT >= 1) { phase = "defend"; animT = 0 }
        } else if (phase === "defend") {
          const dur = 0.5
          animT = Math.min(1, animT + delta / dur)
          const block = THREE.MathUtils.smoothstep(animT, 0, 1)
          armLeft.rotation.x = THREE.MathUtils.lerp(0, -0.6, block)
          // Cerrar alas un poco durante defensa
          wingL.rotation.y = THREE.MathUtils.lerp(Math.PI*0.12, Math.PI*0.22, block)
          wingR.rotation.y = THREE.MathUtils.lerp(-Math.PI*0.12, -Math.PI*0.22, block)
          if (animT >= 1) {
            setTimeout(() => {
              armRight.rotation.set(0, 0, 0)
              blade.rotation.set(0, 0, 0)
              armLeft.rotation.set(0, 0, 0)
              // Restablecer alas
              wingL.rotation.set(Math.PI * 0.08, Math.PI * 0.12, Math.PI * 0.08)
              wingR.rotation.set(Math.PI * 0.08, -Math.PI * 0.12, -Math.PI * 0.08)
              phase = "idle"
            }, 250)
          }
        }
      }

      renderer.render(scene, camera)
      rafRef.current = requestAnimationFrame(tick)
    }
    tick()

    // Cleanup
    return () => {
      cancelAnimationFrame(rafRef.current!)
      el.removeEventListener("mousemove", onMove)
      el.removeEventListener("click", onClick)
      document.removeEventListener("visibilitychange", onVisibility)
      ro.disconnect()
      renderer.dispose()
      if (renderer.domElement.parentElement === el) el.removeChild(renderer.domElement)

      // Dispose geometrías/materiales
      bodyGeom.dispose()
      helmetGeom.dispose()
      toothGeom.dispose()
      visorGeom.dispose()
      eyeGeom.dispose()
      pauldronBaseGeom.dispose()
      hornGeom.dispose()
      bootGeom.dispose()
      wingGeom.dispose()
      bladeGeom.dispose()

      toonBlue.dispose()
      toonSilver.dispose()
      toonBlack.dispose()
      toonEye.dispose()
      toonPurple.dispose()
      toonCape.dispose()
      toonGold.dispose()
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
