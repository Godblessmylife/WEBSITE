import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import * as THREE from 'three'
import type { EcctrlHandle } from 'ecctrl'
import portalUrl from '../models/portal.glb'

const PORTAL_POSITION = new THREE.Vector3(10, 0, -10)
const TRIGGER_DISTANCE = 2

// Портал — декоративный проход (без физического коллайдера, через него
// специально можно пройти) со своей запечённой анимацией свечения.
// Подойти вплотную — выход из игры обратно на сайт (портал как "дверь
// наружу"). Если задумывалось иначе — телепорт внутри мира и т.п. —
// легко поменять, сама механика уже готова.
export function Portal({
  ecctrlRef,
  onEnter,
}: {
  ecctrlRef: RefObject<EcctrlHandle | null>
  onEnter: () => void
}) {
  const { scene, animations } = useGLTF(portalUrl)
  const groupRef = useRef<THREE.Group>(null!)
  const { actions, names } = useAnimations(animations, groupRef)
  const triggeredRef = useRef(false)

  useEffect(() => {
    const firstAction = names[0] ? actions[names[0]] : null
    firstAction?.reset().play()
  }, [actions, names])

  useFrame(() => {
    const handle = ecctrlRef.current
    if (!handle || triggeredRef.current) return
    if (handle.currPos.distanceTo(PORTAL_POSITION) < TRIGGER_DISTANCE) {
      triggeredRef.current = true
      onEnter()
    }
  })

  return (
    <group ref={groupRef} position={PORTAL_POSITION}>
      <primitive object={scene} />
      <pointLight color="#5fd4ff" intensity={6} distance={8} />
    </group>
  )
}

useGLTF.preload(portalUrl)
