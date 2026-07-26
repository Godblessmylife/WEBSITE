import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { usePerfStore } from '@/utils/perfStore'

interface UfoConfig {
  radius: number
  height: number
  speed: number
  phase: number
  scale: number
}

const UFO_COUNT = 4
// Каждая тарелка тащит свой pointLight — на мобильном вдвое меньше
// одновременных источников света в сцене.
const UFO_COUNT_MOBILE = 2

function createFleet(count: number): UfoConfig[] {
  return Array.from({ length: count }, (_, i) => ({
    radius: 18 + i * 7,
    height: 12 - i * 2.5,
    speed: 0.12 + i * 0.04,
    phase: (i / count) * Math.PI * 2,
    scale: 0.8 + ((i * 37) % 5) / 10,
  }))
}

function Ufo({ radius, height, speed, phase, scale }: UfoConfig) {
  const groupRef = useRef<THREE.Group>(null!)
  const ringRef = useRef<THREE.Mesh>(null!)

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime * speed + phase
    const group = groupRef.current
    group.position.set(Math.cos(t) * radius, height + Math.sin(t * 2.3) * 0.6, Math.sin(t) * radius)
    group.rotation.y = -t + Math.PI / 2
    ringRef.current.rotation.z += delta * 2
  })

  return (
    <group ref={groupRef} scale={scale}>
      {/* корпус-тарелка */}
      <mesh scale={[1, 0.32, 1]}>
        <sphereGeometry args={[1.1, 24, 16]} />
        <meshStandardMaterial color="#8fa3ad" roughness={0.3} metalness={0.8} />
      </mesh>
      {/* купол кабины */}
      <mesh position={[0, 0.28, 0]} scale={0.55}>
        <sphereGeometry args={[1, 16, 12]} />
        <meshStandardMaterial
          color="#8fe3c9"
          roughness={0.1}
          metalness={0.2}
          transparent
          opacity={0.55}
        />
      </mesh>
      {/* светящееся кольцо по ободу */}
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.05, 0.06, 8, 32]} />
        <meshBasicMaterial color="#7dffb0" toneMapped={false} />
      </mesh>
      <pointLight color="#7dffb0" intensity={3} distance={10} />
    </group>
  )
}

// Летающие НЛО — просто визуальная деталь для оживления сцены (просили
// добавить). Кружат по независимым орбитам в районе облаков/подлёта к
// городу; собраны на примитивах (сферы+тор), без внешних моделей.
export function Ufos() {
  const reduced = usePerfStore((s) => s.reduced)
  const fleet = useMemo(
    () => createFleet(reduced ? UFO_COUNT_MOBILE : UFO_COUNT),
    [reduced],
  )

  return (
    <group position={[0, 18, 10]}>
      {fleet.map((cfg, i) => (
        <Ufo key={i} {...cfg} />
      ))}
    </group>
  )
}
