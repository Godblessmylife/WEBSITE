import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  PLANET_CENTER,
  PLANET_RADIUS,
  FADE_OUT_START,
  FADE_OUT_END,
  REVEAL_FAR_DISTANCE,
  REVEAL_NEAR_DISTANCE,
} from './EarthPlanet'
import { useScrollStore } from '@/utils/scrollStore'

interface SatelliteConfig {
  orbitRadius: number
  tilt: number
  speed: number
  phase: number
}

const SATELLITE_COUNT = 3

function createFleet(): SatelliteConfig[] {
  return Array.from({ length: SATELLITE_COUNT }, (_, i) => ({
    orbitRadius: PLANET_RADIUS + 8 + i * 4,
    tilt: (i / SATELLITE_COUNT) * Math.PI * 0.5 + 0.2,
    speed: 0.18 - i * 0.03,
    phase: (i / SATELLITE_COUNT) * Math.PI * 2,
  }))
}

function Satellite({ orbitRadius, tilt, speed, phase }: SatelliteConfig) {
  const orbitRef = useRef<THREE.Group>(null!)
  const bodyRef = useRef<THREE.Group>(null!)

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime * speed + phase
    orbitRef.current.rotation.y = t
    bodyRef.current.rotation.y += delta * 0.4
  })

  return (
    <group ref={orbitRef} rotation={[tilt, 0, 0]}>
      <group ref={bodyRef} position={[orbitRadius, 0, 0]}>
        {/* корпус */}
        <mesh>
          <boxGeometry args={[0.35, 0.35, 0.55]} />
          <meshStandardMaterial color="#d9dee3" metalness={0.7} roughness={0.35} />
        </mesh>
        {/* солнечные панели */}
        <mesh position={[0.6, 0, 0]}>
          <boxGeometry args={[1.1, 0.03, 0.4]} />
          <meshStandardMaterial color="#1c3a5e" metalness={0.6} roughness={0.3} />
        </mesh>
        <mesh position={[-0.6, 0, 0]}>
          <boxGeometry args={[1.1, 0.03, 0.4]} />
          <meshStandardMaterial color="#1c3a5e" metalness={0.6} roughness={0.3} />
        </mesh>
        {/* антенна-тарелка */}
        <mesh position={[0, 0.2, -0.3]} rotation={[0.6, 0, 0]}>
          <coneGeometry args={[0.15, 0.1, 12, 1, true]} />
          <meshStandardMaterial color="#f4f7fb" metalness={0.3} roughness={0.4} side={THREE.DoubleSide} />
        </mesh>
        <pointLight color="#7dd3ff" intensity={0.8} distance={3} />
      </group>
    </group>
  )
}

// Спутники на орбите вокруг настоящей Земли (EarthPlanet) — появляются
// вместе с ней (тот же progress-диапазон видимости) и гаснут вместе с
// ней при переходе в город.
export function Satellites() {
  const fleet = useMemo(() => createFleet(), [])
  const groupRef = useRef<THREE.Group>(null!)

  useFrame((state) => {
    const progress = THREE.MathUtils.clamp(useScrollStore.getState().progress, 0, 1)
    const distance = state.camera.position.distanceTo(PLANET_CENTER)
    const fadeIn = 1 - THREE.MathUtils.smoothstep(distance, REVEAL_NEAR_DISTANCE, REVEAL_FAR_DISTANCE)
    const fadeOut = 1 - THREE.MathUtils.smoothstep(progress, FADE_OUT_START, FADE_OUT_END)
    groupRef.current.visible = fadeIn * fadeOut > 0.01
  })

  return (
    <group ref={groupRef} position={PLANET_CENTER}>
      {fleet.map((cfg, i) => (
        <Satellite key={i} {...cfg} />
      ))}
    </group>
  )
}
