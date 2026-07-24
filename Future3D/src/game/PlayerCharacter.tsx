import { useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { Ecctrl, type EcctrlHandle } from 'ecctrl'
import * as THREE from 'three'
import heroModelUrl from '../models/hero.glb'

const CAPSULE_HALF_HEIGHT = 0.5
const CAPSULE_RADIUS = 0.35
// hero.glb сделан с ногами у y=0 (bbox: -0.00258..1.73828) — смещаем
// модель вниз на высоту капсулы, чтобы ступни совпадали с полом.
const MODEL_Y_OFFSET = -(CAPSULE_HALF_HEIGHT + CAPSULE_RADIUS)

export function PlayerCharacter({ ecctrlRef }: { ecctrlRef: RefObject<EcctrlHandle | null> }) {
  const { scene } = useGLTF(heroModelUrl)
  const tiltRef = useRef<THREE.Group>(null!)

  // hero.glb без скелета и анимаций (проверено) — вместо ходьбы/бега
  // персонаж наклоняется вперёд пропорционально скорости движения,
  // отдельно обозначенное клиенту временное решение.
  useFrame((_, delta) => {
    const handle = ecctrlRef.current
    if (!handle) return
    const speed = handle.relativeVelOnPlane.length()
    const targetTilt = handle.isMoving ? THREE.MathUtils.clamp(speed * 0.05, 0, 0.22) : 0
    const damp = 1 - Math.exp(-8 * delta)
    tiltRef.current.rotation.x = THREE.MathUtils.lerp(tiltRef.current.rotation.x, targetTilt, damp)
  })

  return (
    // position: без неё Ecctrl спавнится в (0,0,0) — ровно там же, где
    // верхняя грань земли (DesertGround), то есть капсула персонажа
    // стартует наполовину закопанной в пол. Отсюда и "падение в
    // текстуры": увязнув в коллайдере земли с самого первого кадра,
    // физика ведёт себя непредсказуемо. Спавн заметно выше — короткое
    // управляемое падение и приземление, как и должно быть.
    <Ecctrl
      ref={ecctrlRef}
      position={[0, 2, 0]}
      capsuleHalfHeight={CAPSULE_HALF_HEIGHT}
      capsuleRadius={CAPSULE_RADIUS}
    >
      <group ref={tiltRef}>
        <primitive object={scene} position={[0, MODEL_Y_OFFSET, 0]} />
      </group>
    </Ecctrl>
  )
}

useGLTF.preload(heroModelUrl)
