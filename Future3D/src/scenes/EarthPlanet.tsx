import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useScrollStore } from '@/utils/scrollStore'

// Процедурная текстура-плейсхолдер (океан + "континенты" + полярные
// шапки + лёгкая облачность), нарисованная на canvas. Не настоящая
// карта Земли — если клиент пришлёт реальные текстуры/модель планеты,
// это заменяется одной строкой (map={realTexture} вместо createEarthTexture()).
function createEarthTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 256
  const ctx = canvas.getContext('2d')!

  const ocean = ctx.createLinearGradient(0, 0, 0, canvas.height)
  ocean.addColorStop(0, '#0f3a63')
  ocean.addColorStop(0.5, '#1f6fa8')
  ocean.addColorStop(1, '#0f3a63')
  ctx.fillStyle = ocean
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.fillStyle = '#3d7a46'
  const continents = [
    { x: 90, y: 90, r: 55 },
    { x: 150, y: 160, r: 40 },
    { x: 260, y: 70, r: 45 },
    { x: 300, y: 150, r: 60 },
    { x: 380, y: 200, r: 35 },
    { x: 440, y: 90, r: 50 },
  ]
  for (const c of continents) {
    ctx.beginPath()
    const points = 10
    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * Math.PI * 2
      const radius = c.r * (0.7 + Math.random() * 0.5)
      const x = c.x + Math.cos(angle) * radius
      const y = c.y + Math.sin(angle) * radius * 0.6
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.fill()
  }

  ctx.fillStyle = '#eef6ff'
  ctx.fillRect(0, 0, canvas.width, 12)
  ctx.fillRect(0, canvas.height - 12, canvas.width, 12)

  ctx.globalAlpha = 0.22
  ctx.fillStyle = '#ffffff'
  for (let i = 0; i < 20; i++) {
    ctx.beginPath()
    ctx.ellipse(
      Math.random() * canvas.width,
      Math.random() * canvas.height,
      25 + Math.random() * 45,
      8 + Math.random() * 12,
      0,
      0,
      Math.PI * 2,
    )
    ctx.fill()
  }
  ctx.globalAlpha = 1

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

// Позиция подобрана так, чтобы шар был хорошо виден издалека в самом
// начале пути (рядом с солнечной системой) и оставался под облаками
// (ниже CloudZone), а к моменту подлёта к земле уже гас — иначе он
// визуально спорил бы с плоским городом GroundZone.
const PLANET_CENTER = new THREE.Vector3(0, -40, 20)
const PLANET_RADIUS = 45

export function EarthPlanet() {
  const texture = useMemo(() => createEarthTexture(), [])
  const surfaceRef = useRef<THREE.Mesh>(null!)
  const atmoRef = useRef<THREE.Mesh>(null!)

  useFrame((_, delta) => {
    const progress = THREE.MathUtils.clamp(useScrollStore.getState().progress, 0, 1)
    surfaceRef.current.rotation.y += delta * 0.02

    const fadeIn = THREE.MathUtils.smoothstep(progress, 0, 0.05)
    const fadeOut = 1 - THREE.MathUtils.smoothstep(progress, 0.45, 0.6)
    const opacity = fadeIn * fadeOut
    const visible = opacity > 0.01

    const surfaceMaterial = surfaceRef.current.material as THREE.MeshStandardMaterial
    surfaceMaterial.opacity = opacity
    surfaceMaterial.transparent = opacity < 1
    surfaceMaterial.visible = visible

    const atmosphereMaterial = atmoRef.current.material as THREE.MeshBasicMaterial
    atmosphereMaterial.opacity = opacity * 0.4
    atmosphereMaterial.visible = visible
  })

  return (
    <group position={PLANET_CENTER}>
      <mesh ref={surfaceRef}>
        <sphereGeometry args={[PLANET_RADIUS, 48, 48]} />
        <meshStandardMaterial map={texture} roughness={0.85} metalness={0} transparent />
      </mesh>
      <mesh ref={atmoRef} scale={1.04}>
        <sphereGeometry args={[PLANET_RADIUS, 48, 48]} />
        <meshBasicMaterial
          color="#6fb7ff"
          transparent
          opacity={0.3}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}
