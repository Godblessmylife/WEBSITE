import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Trail } from '@react-three/drei'
import * as THREE from 'three'
import { usePerfStore } from '@/utils/perfStore'

const METEOR_COUNT = 10
const METEOR_COUNT_MOBILE = 5

// Локальные координаты внутри SkyZone (та рендерит это на
// position=[0, ZONE_ORIGIN_Y=50, 0]) — БЫЛО randFloat(35,75), то есть
// мировая высота 85-125: камера в течение всего времени, что SkyZone
// активна (progress ~0-0.3), находится на мировой высоте 55-60 (см.
// cameraPath.ts) - метеоры спавнились на 25-65 юнитов ВЫШЕ камеры,
// то есть практически никогда не попадали в кадр. Диапазон 0-15
// (мировая высота 50-65) реально накрывает высоту камеры.
function randomSpawn() {
  return new THREE.Vector3(
    THREE.MathUtils.randFloatSpread(90),
    THREE.MathUtils.randFloat(0, 15),
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
  const reduced = usePerfStore((s) => s.reduced)
  const count = reduced ? METEOR_COUNT_MOBILE : METEOR_COUNT

  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <Meteor key={i} speed={10 + (i % 5) * 2} />
      ))}
    </>
  )
}
