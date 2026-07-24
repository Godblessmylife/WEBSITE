import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface PlanetConfig {
  distance: number
  size: number
  color: string
  speed: number
}

const PLANETS: PlanetConfig[] = [
  { distance: 6, size: 0.4, color: '#8fa8ff', speed: 0.25 },
  { distance: 9, size: 0.6, color: '#ff9966', speed: 0.15 },
  { distance: 13, size: 0.9, color: '#66ddaa', speed: 0.1 },
  { distance: 17, size: 0.5, color: '#cc88ff', speed: 0.07 },
]

function Planet({ distance, size, color, speed }: PlanetConfig) {
  const orbitRef = useRef<THREE.Group>(null!)

  useFrame((_, delta) => {
    orbitRef.current.rotation.y += speed * delta
  })

  return (
    <group ref={orbitRef}>
      <mesh position={[distance, 0, 0]}>
        <sphereGeometry args={[size, 24, 24]} />
        <meshStandardMaterial color={color} roughness={0.6} metalness={0.1} />
      </mesh>
    </group>
  )
}

// Стилизованная солнечная система в глубине сцены неба: светящееся
// солнце + несколько орбитальных планет. Не физически точная модель —
// декоративный "вау"-элемент.
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
