import { useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { EcctrlHandle } from 'ecctrl'
import { useTeleportStore } from '@/utils/teleportStore'

// Вид от третьего лица "как в ГТА" — позади и чуть выше персонажа.
const LOCAL_OFFSET = new THREE.Vector3(0, 2.2, -4.5)
const LOOK_OFFSET = new THREE.Vector3(0, 1.2, 0)

const behind = new THREE.Vector3()
const targetPos = new THREE.Vector3()
const lookAt = new THREE.Vector3()

export function GameCamera({ ecctrlRef }: { ecctrlRef: RefObject<EcctrlHandle | null> }) {
  const { camera } = useThree()
  const initializedRef = useRef(false)
  const lastSnapNonceRef = useRef(useTeleportStore.getState().snapNonce)

  useFrame((_, delta) => {
    const handle = ecctrlRef.current
    if (!handle) return

    // Portal.tsx телепортирует тело мгновенно на другой конец карты
    // (в космос) и увеличивает snapNonce в тот же момент - без этого
    // камера обычным lerp'ом несколько секунд "долетала" бы через всю
    // сцену от старой позиции к новой, что стало бы видно сразу после
    // того, как экран очищается от вспышки телепортации.
    const snapNonce = useTeleportStore.getState().snapNonce
    if (snapNonce !== lastSnapNonceRef.current) {
      lastSnapNonceRef.current = snapNonce
      initializedRef.current = false
    }

    behind.copy(LOCAL_OFFSET).applyQuaternion(handle.currQuat)
    targetPos.copy(handle.currPos).add(behind)

    if (!initializedRef.current) {
      // Canvas в GameMode не задаёт стартовую позицию камеры — без
      // этого первый снап делался лерпом от дефолтной позиции R3F,
      // и путь лерпа мог проходить сквозь пол/персонажа (выглядело бы
      // как ещё одна причина "падения в текстуры"). Первый кадр —
      // сразу на месте, без пролёта.
      camera.position.copy(targetPos)
      initializedRef.current = true
    } else {
      const damp = 1 - Math.exp(-4 * delta)
      camera.position.lerp(targetPos, damp)
    }

    lookAt.copy(handle.currPos).add(LOOK_OFFSET)
    camera.lookAt(lookAt)
  })

  return null
}
