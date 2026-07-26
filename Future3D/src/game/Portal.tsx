import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import * as THREE from 'three'
import type { EcctrlHandle } from 'ecctrl'
import { useTeleportStore } from '@/utils/teleportStore'
import { SPACE_TELEPORT_TARGET } from './SpaceZone'
import portalUrl from '../models/portal.glb'

const PORTAL_POSITION = new THREE.Vector3(10, 0, -10)
const TRIGGER_DISTANCE = 2

// Полная длительность визуального эффекта в TeleportEffect.tsx (мс) -
// должна совпадать с суммой длительностей его CSS-анимаций (900ms).
const EFFECT_DURATION_MS = 900
// Момент внутри эффекта, когда белая вспышка (teleport-flash-anim) уже
// практически в максимуме (55-78% от 900ms) - сюда прячем реальное
// перемещение тела, чтобы "телепортация" не выглядела прыжком экрана.
const TELEPORT_AT_MS = 650

// Портал — декоративный проход со своей запечённой анимацией свечения.
// РАНЬШЕ подойти вплотную означало выход из игры обратно на сайт (портал
// как "дверь наружу"). По просьбе клиента — телепорт героя в космос
// (SpaceZone.tsx: платформа + звёзды + Земля), с эффектом телепортации
// ПЕРЕД самим перемещением (TeleportEffect.tsx). Выход из игры теперь
// только через кнопку "Выход" в HUD (GameMode.tsx) — она работает из
// любой точки карты независимо от портала.
export function Portal({ ecctrlRef }: { ecctrlRef: RefObject<EcctrlHandle | null> }) {
  const { scene, animations } = useGLTF(portalUrl)
  const groupRef = useRef<THREE.Group>(null!)
  const { actions, names } = useAnimations(animations, groupRef)
  const triggeredRef = useRef(false)

  useEffect(() => {
    const firstAction = names[0] ? actions[names[0]] : null
    firstAction?.reset().play()
  }, [actions, names])

  useEffect(() => {
    // Если игрок выходит из игры (GameMode размонтируется) во время
    // отложенного setTimeout ниже - не трогать чужой (уже отмонтированный)
    // ecctrlRef.body и не оставлять активным полноэкранный флэш навсегда.
    return () => useTeleportStore.getState().setActive(false)
  }, [])

  useFrame(() => {
    const handle = ecctrlRef.current
    if (!handle || triggeredRef.current) return
    if (handle.currPos.distanceTo(PORTAL_POSITION) < TRIGGER_DISTANCE) {
      triggeredRef.current = true
      useTeleportStore.getState().setActive(true)

      setTimeout(() => {
        const h = ecctrlRef.current
        if (h) {
          h.body.setTranslation(
            { x: SPACE_TELEPORT_TARGET.x, y: SPACE_TELEPORT_TARGET.y, z: SPACE_TELEPORT_TARGET.z },
            true,
          )
          h.body.setLinvel({ x: 0, y: 0, z: 0 }, true)
          useTeleportStore.getState().triggerSnap()
        }
      }, TELEPORT_AT_MS)

      setTimeout(() => {
        useTeleportStore.getState().setActive(false)
      }, EFFECT_DURATION_MS)
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
