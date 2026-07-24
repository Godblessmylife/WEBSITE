import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Trail } from '@react-three/drei'
import * as THREE from 'three'
import { useIsTouchDevice } from '@/utils/useIsTouchDevice'

const METEOR_COUNT = 10
const METEOR_COUNT_MOBILE = 5

function randomSpawn() {
  return new THREE.Vector3(
    THREE.MathUtils.randFloatSpread(90),
    THREE.MathUtils.randFloat(35, 75),
    THREE.MathUtils.randFloatSpread(90),
  )
}

function Meteor({ speed }: { speed: number }) {
  const ref = useRef<THREE.Mesh>(null!)
  const [spawn] = useState(randomSpawn)

  useFrame((_, delta) => {
    const p = ref.current.position
    p.x -= speed * delta
    p.y -= speed * 0.5 * delta
    if (p.y < -5 || p.x < -60) {
      p.copy(randomSpawn())
    }
  })

  return (
    <Trail width={1.5} length={8} color="#bfe6ff" attenuation={(t) => t * t}>
      <mesh ref={ref} position={spawn}>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
    </Trail>
  )
}

// Метеорный дождь ("звездопад") в зоне неба: несколько частиц с хвостом
// (drei Trail) непрерывно летят по диагонали и переспавниваются.
export function ShootingStars() {
  const isTouch = useIsTouchDevice()
  const count = isTouch ? METEOR_COUNT_MOBILE : METEOR_COUNT

  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <Meteor key={i} speed={10 + (i % 5) * 2} />
      ))}
    </>
  )
}
