import { useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Trail } from '@react-three/drei'
import * as THREE from 'three'
import { useScrollStore } from '@/utils/scrollStore'
import { usePerfStore } from '@/utils/perfStore'
import { cameraPath } from './cameraPath'

// "Падающие звёзды" на подлёте к Земле — по просьбе клиента, в паре с
// SpaceTravelEffect (второй экземпляр, эффект ускорения) на этом же
// участке пути. ShootingStars.tsx (использован в SkyZone) для этого не
// годится: там метеоры спавнятся в ФИКСИРОВАННЫХ мировых координатах,
// а камера за это время (progress ~0.24-0.42 vs это окно ~0.38-0.74)
// проходит совсем другой (и куда более длинный) участок пути — метеоры
// остались бы далеко позади через пару секунд. Здесь, как и в
// SpaceTravelEffect, якорь-группа каждый кадр переставляется в текущую
// точку camera path, метеоры — её дети с собственным локальным падением.
const METEOR_START = 0.38
const METEOR_PEAK_END = 0.5
const METEOR_END = 0.74

const METEOR_COUNT = 9
const METEOR_COUNT_MOBILE = 4
const SPAWN_RADIUS = 16
const SPAWN_SPAN = 26
const FALL_SPEED = 9

function intensityAt(progress: number) {
  const fadeIn = THREE.MathUtils.smoothstep(progress, METEOR_START, METEOR_PEAK_END)
  const fadeOut = 1 - THREE.MathUtils.smoothstep(progress, METEOR_PEAK_END, METEOR_END)
  return Math.min(fadeIn, fadeOut)
}

function randomLocalSpawn() {
  const angle = Math.random() * Math.PI * 2
  const radius = 4 + Math.random() * SPAWN_RADIUS
  return new THREE.Vector3(
    Math.cos(angle) * radius,
    Math.random() * SPAWN_SPAN,
    Math.sin(angle) * radius,
  )
}

function Meteor({ intensityRef, speedFactor }: { intensityRef: RefObject<number>; speedFactor: number }) {
  const ref = useRef<THREE.Mesh>(null!)
  const [spawn] = useState(randomLocalSpawn)

  useFrame((_, delta) => {
    const intensity = intensityRef.current
    const p = ref.current.position
    p.y -= FALL_SPEED * speedFactor * intensity * delta
    if (p.y < -SPAWN_SPAN / 2) {
      const fresh = randomLocalSpawn()
      p.set(fresh.x, SPAWN_SPAN / 2, fresh.z)
    }
    const scale = intensity
    ref.current.scale.setScalar(scale)
  })

  return (
    <Trail width={1.2} length={6} color="#eafcff" attenuation={(t) => t * t}>
      <mesh ref={ref} position={spawn}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
    </Trail>
  )
}

const pathPoint = new THREE.Vector3()

export function ApproachMeteors() {
  const reduced = usePerfStore((s) => s.reduced)
  const count = reduced ? METEOR_COUNT_MOBILE : METEOR_COUNT
  const groupRef = useRef<THREE.Group>(null!)
  const intensityRef = useRef(0)
  const speedFactors = useMemo(
    () => Array.from({ length: count }, () => 0.7 + Math.random() * 0.6),
    [count],
  )

  useFrame(() => {
    const progress = THREE.MathUtils.clamp(useScrollStore.getState().progress, 0, 1)
    const intensity = intensityAt(progress)
    intensityRef.current = intensity
    const visible = intensity > 0.01
    groupRef.current.visible = visible
    if (!visible) return

    cameraPath.getPointAt(progress, pathPoint)
    groupRef.current.position.copy(pathPoint)
  })

  return (
    <group ref={groupRef}>
      {speedFactors.map((speedFactor, i) => (
        <Meteor key={i} intensityRef={intensityRef} speedFactor={speedFactor} />
      ))}
    </group>
  )
}
