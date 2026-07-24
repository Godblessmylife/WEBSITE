import type { RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { EcctrlHandle } from 'ecctrl'

// Вид от третьего лица "как в ГТА" — позади и чуть выше персонажа.
const LOCAL_OFFSET = new THREE.Vector3(0, 2.2, -4.5)
const LOOK_OFFSET = new THREE.Vector3(0, 1.2, 0)

const behind = new THREE.Vector3()
const targetPos = new THREE.Vector3()
const lookAt = new THREE.Vector3()

export function GameCamera({ ecctrlRef }: { ecctrlRef: RefObject<EcctrlHandle | null> }) {
  const { camera } = useThree()

  useFrame((_, delta) => {
    const handle = ecctrlRef.current
    if (!handle) return

    behind.copy(LOCAL_OFFSET).applyQuaternion(handle.currQuat)
    targetPos.copy(handle.currPos).add(behind)

    const damp = 1 - Math.exp(-4 * delta)
    camera.position.lerp(targetPos, damp)

    lookAt.copy(handle.currPos).add(LOOK_OFFSET)
    camera.lookAt(lookAt)
  })

  return null
}
