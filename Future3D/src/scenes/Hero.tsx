import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Trail } from '@react-three/drei'
import * as THREE from 'three'
import { cameraPath } from './cameraPath'
import { useScrollStore } from '@/utils/scrollStore'
import { HeroModel } from './HeroModel'

// Герой держится немного впереди камеры по прогрессу скролла: при
// прокрутке вниз он "падает" ближе к земле раньше камеры, при
// прокрутке вверх — раньше камеры взмывает обратно в небо. Так как
// его позиция — чистая функция progress, направление скролла не
// требует отдельной логики (см. CameraRig).
const HERO_LEAD = 0.05

const heroPosition = new THREE.Vector3()
const tangent = new THREE.Vector3()

export function Hero() {
  const groupRef = useRef<THREE.Group>(null!)
  const spin = useRef(0)

  useFrame((_, delta) => {
    const progress = THREE.MathUtils.clamp(useScrollStore.getState().progress, 0, 1)
    const heroProgress = THREE.MathUtils.clamp(progress + HERO_LEAD, 0, 1)

    cameraPath.getPointAt(heroProgress, heroPosition)
    cameraPath.getTangentAt(heroProgress, tangent)

    const group = groupRef.current
    group.position.lerp(heroPosition, 1 - Math.exp(-6 * delta))

    // Тумблинг в свободном падении, стабилизация в вертикаль перед приземлением.
    const landing = THREE.MathUtils.smoothstep(heroProgress, 0.82, 0.98)
    spin.current += delta * THREE.MathUtils.lerp(2.2, 0, landing)

    const diveAngle = Math.atan2(-tangent.y, Math.hypot(tangent.x, tangent.z))
    const pitch = THREE.MathUtils.lerp(diveAngle, 0, landing)

    group.rotation.set(pitch, spin.current, 0)
  })

  return (
    <group ref={groupRef}>
      <Trail width={2.2} length={10} color="#5fd4ff" attenuation={(t) => t * t}>
        <HeroModel />
      </Trail>
    </group>
  )
}
