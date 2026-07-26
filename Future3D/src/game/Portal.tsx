import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useAnimations, Clone } from '@react-three/drei'
import * as THREE from 'three'
import type { EcctrlHandle } from 'ecctrl'
import { useTeleportStore } from '@/utils/teleportStore'
import portalUrl from '../models/portal.glb'

const TRIGGER_DISTANCE = 2
// После срабатывания портал "остывает", пока игрок не отойдёт дальше
// этого расстояния - без этого пара портал-туда/портал-обратно могла бы
// сработать один раз и навсегда "перегореть" (см. комментарий у Portal()
// ниже), а пассажир, прилетевший ПРЯМО на приёмную точку другого портала,
// мог бы мгновенно телепортироваться обратно, не успев ничего увидеть.
const REARM_DISTANCE = TRIGGER_DISTANCE * 4

// Полная длительность визуального эффекта в TeleportEffect.tsx (мс) -
// должна совпадать с суммой длительностей его CSS-анимаций (900ms).
const EFFECT_DURATION_MS = 900
// Момент внутри эффекта, когда белая вспышка (teleport-flash-anim) уже
// практически в максимуме (55-78% от 900ms) - сюда прячем реальное
// перемещение тела, чтобы "телепортация" не выглядела прыжком экрана.
const TELEPORT_AT_MS = 650

// Портал — телепортирует героя к другой точке карты (GameMode.tsx
// рендерит два экземпляра: пустыня -> космос и обратно, см. SpaceZone.tsx)
// с эффектом телепортации ПЕРЕД самим перемещением (TeleportEffect.tsx).
// Модель/анимация загружаются через useGLTF ОДИН РАЗ (кеш по URL), но
// рендерятся через <Clone>, а не <primitive> - у двух одновременно
// смонтированных порталов одна и та же scene иначе увела бы модель
// у одного из них (Object3D может быть только у одного родителя разом,
// та же проблема решалась для Земли в SpaceZone.tsx).
//
// Триггер — не разовая защёлка, а перевзводится по расстоянию
// (REARM_DISTANCE): иначе после ОДНОГО похода туда-обратно оба портала
// оказались бы "использованы" навсегда без возможности слетать снова.
export function Portal({
  ecctrlRef,
  position,
  target,
  glowColor = '#5fd4ff',
}: {
  ecctrlRef: RefObject<EcctrlHandle | null>
  position: THREE.Vector3
  target: THREE.Vector3
  glowColor?: string
}) {
  const { scene, animations } = useGLTF(portalUrl)
  const groupRef = useRef<THREE.Group>(null!)
  const { actions, names, mixer } = useAnimations(animations, groupRef)
  const armedRef = useRef(true)
  const pendingRef = useRef(false)

  useEffect(() => {
    const firstAction = names[0] ? actions[names[0]] : null
    firstAction?.reset().play()
    return () => {
      mixer.stopAllAction()
    }
  }, [actions, names, mixer])

  useEffect(() => {
    // Если игрок выходит из игры (GameMode размонтируется) во время
    // отложенного setTimeout ниже - не трогать чужой (уже отмонтированный)
    // ecctrlRef.body и не оставлять активным полноэкранный флэш навсегда.
    return () => useTeleportStore.getState().setActive(false)
  }, [])

  useFrame(() => {
    const handle = ecctrlRef.current
    if (!handle) return
    const dist = handle.currPos.distanceTo(position)

    if (armedRef.current && !pendingRef.current && dist < TRIGGER_DISTANCE) {
      armedRef.current = false
      pendingRef.current = true
      useTeleportStore.getState().setActive(true)

      setTimeout(() => {
        const h = ecctrlRef.current
        if (h) {
          h.body.setTranslation({ x: target.x, y: target.y, z: target.z }, true)
          h.body.setLinvel({ x: 0, y: 0, z: 0 }, true)
          useTeleportStore.getState().triggerSnap()
        }
        pendingRef.current = false
      }, TELEPORT_AT_MS)

      setTimeout(() => {
        useTeleportStore.getState().setActive(false)
      }, EFFECT_DURATION_MS)
    } else if (!armedRef.current && !pendingRef.current && dist > REARM_DISTANCE) {
      armedRef.current = true
    }
  })

  return (
    <group ref={groupRef} position={position}>
      <Clone object={scene} />
      <pointLight color={glowColor} intensity={6} distance={8} />
    </group>
  )
}

useGLTF.preload(portalUrl)
