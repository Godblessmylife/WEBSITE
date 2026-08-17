import { useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { EcctrlHandle } from 'ecctrl'
import { useTeleportStore } from '@/utils/teleportStore'
import { useDriveStore, driveLiveStore } from '@/utils/driveStore'
import { useCameraZoomStore } from '@/utils/cameraZoomStore'

// Вид от третьего лица "как в ГТА" — позади и чуть выше персонажа. За
// рулём машины камера чуть дальше отъезжает назад (машина "длиннее"
// персонажа, тот же офсет упирался бы в капот/крышу).
const LOCAL_OFFSET = new THREE.Vector3(0, 2.2, -4.5)
// "Приблизить к лицу" (Дополнение 4) - НЕ настоящий вид от первого лица
// (решено с клиентом: камера остаётся СНАРУЖИ модели, просто заметно
// ближе и чуть ниже) - минимальный риск сломать существующий механизм
// лерпа/lookAt ниже, он не меняется вообще, меняется только то, какой
// офсет в него подставляется.
const ZOOM_OFFSET = new THREE.Vector3(0, 1.7, -1.6)
const CAR_LOCAL_OFFSET = new THREE.Vector3(0, 3.4, -8)
const LOOK_OFFSET = new THREE.Vector3(0, 1.2, 0)

const behind = new THREE.Vector3()
const targetPos = new THREE.Vector3()
const lookAt = new THREE.Vector3()
const carQuat = new THREE.Quaternion()
const carPos = new THREE.Vector3()
const UP_AXIS = new THREE.Vector3(0, 1, 0)

export function GameCamera({ ecctrlRef }: { ecctrlRef: RefObject<EcctrlHandle | null> }) {
  const { camera } = useThree()
  const initializedRef = useRef(false)
  const lastSnapNonceRef = useRef(useTeleportStore.getState().snapNonce)

  useFrame((_, delta) => {
    // Пока за рулём (CarDriving.tsx) - камера следует за машиной
    // (driveLiveStore), а не за ecctrl-персонажем, который в это время
    // стоит неподвижно и спрятан (PlayerCharacter.tsx).
    const drivingId = useDriveStore.getState().drivingId
    if (drivingId) {
      const live = driveLiveStore.getState()
      carPos.set(live.x, live.y, live.z)
      carQuat.setFromAxisAngle(UP_AXIS, live.yaw)

      behind.copy(CAR_LOCAL_OFFSET).applyQuaternion(carQuat)
      targetPos.copy(carPos).add(behind)

      if (!initializedRef.current) {
        camera.position.copy(targetPos)
        initializedRef.current = true
      } else {
        const damp = 1 - Math.exp(-4 * delta)
        camera.position.lerp(targetPos, damp)
      }

      lookAt.copy(carPos).add(LOOK_OFFSET)
      camera.lookAt(lookAt)
      return
    }

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

    const zoomLevel = useCameraZoomStore.getState().zoomLevel
    behind.copy(LOCAL_OFFSET).lerp(ZOOM_OFFSET, zoomLevel).applyQuaternion(handle.currQuat)
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
