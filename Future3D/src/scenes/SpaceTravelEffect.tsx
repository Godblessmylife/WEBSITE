import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useScrollStore } from '@/utils/scrollStore'
import { cameraPath } from './cameraPath'

// "Между солнечной системой и Землёй сделать крутую анимацию, словно
// путешествие" — окно приурочено к уже существующим константам пути:
// TRAVEL_PEAK ~0.317 совпадает с реальным ближайшим пролётом мимо
// солнечной системы (см. cameraPath.ts), TRAVEL_END чуть раньше
// SKY_HOLD_END — эффект успевает погаснуть до начала перехода в облака,
// а не наложиться на него.
//
// Компонент обобщён под props (start/peakEnd/end/color) — по просьбе
// клиента "приближаться к планете сквозь космос, эффект ускорения"
// нужен ВТОРОЙ такой же эффект, но на подлёте к Земле (см. JourneyScene.tsx,
// второй <SpaceTravelEffect> с другим окном progress). Раньше это были
// захардкоженные модульные константы — само собой, не размножающиеся.
const DEFAULT_START = 0.24
const DEFAULT_PEAK_END = 0.34
const DEFAULT_END = 0.42

const STREAK_COUNT = 90
const STREAK_RADIUS = 22
const STREAK_LENGTH = 7
const STREAK_SPAN = 60
const STREAK_SPEED = 55

function travelIntensity(progress: number, start: number, peakEnd: number, end: number) {
  const fadeIn = THREE.MathUtils.smoothstep(progress, start, peakEnd)
  const fadeOut = 1 - THREE.MathUtils.smoothstep(progress, peakEnd, end)
  return Math.min(fadeIn, fadeOut)
}

interface Streak {
  angle: number
  radius: number
  yOffset: number
  speedFactor: number
}

function createStreaks(): Streak[] {
  return Array.from({ length: STREAK_COUNT }, () => ({
    angle: Math.random() * Math.PI * 2,
    radius: 3 + Math.random() * STREAK_RADIUS,
    yOffset: (Math.random() - 0.5) * STREAK_SPAN,
    speedFactor: 0.7 + Math.random() * 0.6,
  }))
}

const pathPoint = new THREE.Vector3()
const dummy = new THREE.Object3D()

export function SpaceTravelEffect({
  start = DEFAULT_START,
  peakEnd = DEFAULT_PEAK_END,
  end = DEFAULT_END,
  color = '#bfe6ff',
}: {
  start?: number
  peakEnd?: number
  end?: number
  color?: string
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null!)
  const groupRef = useRef<THREE.Group>(null!)
  const streaks = useMemo(() => createStreaks(), [])

  useFrame((_, delta) => {
    const progress = THREE.MathUtils.clamp(useScrollStore.getState().progress, 0, 1)
    const intensity = travelIntensity(progress, start, peakEnd, end)
    const visible = intensity > 0.01
    groupRef.current.visible = visible
    if (!visible) return

    cameraPath.getPointAt(progress, pathPoint)
    groupRef.current.position.set(pathPoint.x, pathPoint.y, pathPoint.z)

    const fallSpeed = STREAK_SPEED * intensity
    for (let i = 0; i < streaks.length; i++) {
      const s = streaks[i]
      s.yOffset -= fallSpeed * s.speedFactor * delta
      if (s.yOffset < -STREAK_SPAN / 2) s.yOffset += STREAK_SPAN

      dummy.position.set(Math.cos(s.angle) * s.radius, s.yOffset, Math.sin(s.angle) * s.radius)
      dummy.scale.setScalar(intensity)
      dummy.rotation.set(0, 0, 0)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
    const material = meshRef.current.material as THREE.MeshBasicMaterial
    material.opacity = intensity * 0.85
  })

  return (
    <group ref={groupRef}>
      <instancedMesh ref={meshRef} args={[undefined, undefined, STREAK_COUNT]}>
        <cylinderGeometry args={[0.035, 0.035, STREAK_LENGTH, 5]} />
        <meshBasicMaterial color={color} transparent opacity={0} toneMapped={false} depthWrite={false} />
      </instancedMesh>
    </group>
  )
}
