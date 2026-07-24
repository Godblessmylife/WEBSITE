import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface PlanetConfig {
  distance: number
  size: number
  baseColor: string
  bandColor: string
  speed: number
  spin: number
  hasRing?: boolean
}

const PLANETS: PlanetConfig[] = [
  { distance: 6, size: 0.4, baseColor: '#6f85c9', bandColor: '#9db0e6', speed: 0.25, spin: 0.6 },
  { distance: 9, size: 0.6, baseColor: '#c97a4a', bandColor: '#e8a679', speed: 0.15, spin: 0.4 },
  {
    distance: 13,
    size: 0.9,
    baseColor: '#4a9c72',
    bandColor: '#7fd1a4',
    speed: 0.1,
    spin: 0.3,
    hasRing: true,
  },
  { distance: 17, size: 0.5, baseColor: '#9a6fc9', bandColor: '#c39be8', speed: 0.07, spin: 0.5 },
]

// Полосатая/пятнистая текстура-плейсхолдер вместо плоского цвета —
// у каждой планеты свой рисунок. Если клиент пришлёт реальные модели
// планет (.glb), эта функция и <sphereGeometry> ниже заменяются на
// useGLTF, как уже сделано для Земли (см. EarthPlanet.tsx).
function createPlanetTexture(baseColor: string, bandColor: string) {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 64
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = baseColor
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.fillStyle = bandColor
  ctx.globalAlpha = 0.45
  const bands = 4 + Math.floor(Math.random() * 4)
  for (let i = 0; i < bands; i++) {
    const y = (i / bands) * canvas.height + (Math.random() * 6 - 3)
    const h = 3 + Math.random() * 6
    ctx.fillRect(0, y, canvas.width, h)
  }

  ctx.globalAlpha = 0.25
  for (let i = 0; i < 10; i++) {
    ctx.beginPath()
    ctx.ellipse(
      Math.random() * canvas.width,
      Math.random() * canvas.height,
      4 + Math.random() * 8,
      2 + Math.random() * 4,
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

function Planet({ distance, size, baseColor, bandColor, speed, spin, hasRing }: PlanetConfig) {
  const orbitRef = useRef<THREE.Group>(null!)
  const spinRef = useRef<THREE.Mesh>(null!)
  const texture = useMemo(() => createPlanetTexture(baseColor, bandColor), [baseColor, bandColor])

  useFrame((_, delta) => {
    orbitRef.current.rotation.y += speed * delta
    spinRef.current.rotation.y += spin * delta
  })

  return (
    <group ref={orbitRef}>
      <mesh ref={spinRef} position={[distance, 0, 0]} rotation={[0.3, 0, 0]}>
        <sphereGeometry args={[size, 24, 24]} />
        <meshStandardMaterial map={texture} roughness={0.75} metalness={0.05} />
        {hasRing && (
          <mesh rotation={[Math.PI / 2.4, 0, 0]}>
            <ringGeometry args={[size * 1.5, size * 2.3, 48]} />
            <meshBasicMaterial color={bandColor} side={THREE.DoubleSide} transparent opacity={0.55} />
          </mesh>
        )}
      </mesh>
    </group>
  )
}

// Стилизованная солнечная система в глубине сцены неба: светящееся
// солнце + несколько орбитальных планет со своим вращением вокруг оси
// (не только орбитой) и текстурой. Не физически точная модель —
// декоративный элемент.
export function SolarSystem() {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[2.2, 32, 32]} />
        <meshBasicMaterial color="#ffd27f" toneMapped={false} />
      </mesh>
      <pointLight color="#ffedc2" intensity={60} distance={100} decay={2} />
      {PLANETS.map((planet, i) => (
        <Planet key={i} {...planet} />
      ))}
    </group>
  )
}
