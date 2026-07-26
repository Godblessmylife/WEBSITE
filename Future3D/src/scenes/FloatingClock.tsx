import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useScrollStore } from '@/utils/scrollStore'

// Растворяется почти сразу при начале скролла — это приветственный
// штрих для самого первого кадра (солнечная система), не элемент,
// который должен сопровождать весь путь.
const DISSOLVE_START = 0.02
const DISSOLVE_END = 0.14

// Панель "прибита" к камере (обновляет позицию/поворот от неё каждый
// кадр), а не стоит в мировых координатах — так гарантированно видна
// внизу кадра именно в начале пути, независимо от точной формы
// cameraPath (не нужно подбирать мировые координаты вручную без
// возможности посмотреть в браузере).
const LOCAL_OFFSET = new THREE.Vector3(0, -3.2, -7)
const worldOffset = new THREE.Vector3()

const DATE_FORMATTER = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' })
const TIME_FORMATTER = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

function drawClockTexture(canvas: HTMLCanvasElement, now: Date) {
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const glow = ctx.createRadialGradient(
    canvas.width / 2, canvas.height / 2, 0,
    canvas.width / 2, canvas.height / 2, canvas.width / 2,
  )
  glow.addColorStop(0, 'rgba(95, 212, 255, 0.15)')
  glow.addColorStop(1, 'rgba(95, 212, 255, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.shadowColor = '#5fd4ff'
  ctx.shadowBlur = 20

  ctx.fillStyle = '#eafcff'
  ctx.font = 'bold 88px "Courier New", monospace'
  ctx.fillText(TIME_FORMATTER.format(now), canvas.width / 2, canvas.height * 0.42)

  ctx.font = '36px "Courier New", monospace'
  ctx.fillStyle = '#9dd8ff'
  ctx.shadowBlur = 10
  ctx.fillText(DATE_FORMATTER.format(now), canvas.width / 2, canvas.height * 0.75)
}

// Плавающая 3D-панель даты/времени в начале пути (зона солнечной
// системы) — чисто декоративный приветственный штрих, растворяется в
// первые ~14% скролла, дальше не мешает космосу/облакам/земле.
export function FloatingClock() {
  const groupRef = useRef<THREE.Group>(null!)
  const materialRef = useRef<THREE.MeshBasicMaterial>(null!)
  const canvas = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 768
    c.height = 220
    return c
  }, [])
  const texture = useMemo(() => {
    const t = new THREE.CanvasTexture(canvas)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [canvas])

  useEffect(() => {
    drawClockTexture(canvas, new Date())
    texture.needsUpdate = true
    const interval = setInterval(() => {
      drawClockTexture(canvas, new Date())
      texture.needsUpdate = true
    }, 1000)
    return () => clearInterval(interval)
  }, [canvas, texture])

  useFrame((state) => {
    const progress = THREE.MathUtils.clamp(useScrollStore.getState().progress, 0, 1)
    const opacity = 1 - THREE.MathUtils.smoothstep(progress, DISSOLVE_START, DISSOLVE_END)
    const visible = opacity > 0.01

    groupRef.current.visible = visible
    if (!visible) return

    worldOffset.copy(LOCAL_OFFSET).applyQuaternion(state.camera.quaternion)
    groupRef.current.position.copy(state.camera.position).add(worldOffset)
    groupRef.current.quaternion.copy(state.camera.quaternion)
    materialRef.current.opacity = opacity
  })

  return (
    <group ref={groupRef}>
      <mesh>
        <planeGeometry args={[3, 0.86]} />
        <meshBasicMaterial
          ref={materialRef}
          map={texture}
          transparent
          toneMapped={false}
          depthWrite={false}
          fog={false}
        />
      </mesh>
    </group>
  )
}
