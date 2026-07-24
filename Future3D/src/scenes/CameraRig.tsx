import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { cameraPath, LOOK_AHEAD, SOLAR_SYSTEM_TARGET, SOLAR_SYSTEM_LOOKAT_END } from './cameraPath'
import { useScrollStore } from '@/utils/scrollStore'

const targetPosition = new THREE.Vector3()
const lookAtPosition = new THREE.Vector3()
const finalLookAt = new THREE.Vector3()

export function CameraRig() {
  useFrame((state, delta) => {
    const progress = THREE.MathUtils.clamp(useScrollStore.getState().progress, 0, 1)
    const lookProgress = THREE.MathUtils.clamp(progress + LOOK_AHEAD, 0, 1)

    cameraPath.getPointAt(progress, targetPosition)
    cameraPath.getPointAt(lookProgress, lookAtPosition)

    const dampFactor = 1 - Math.exp(-3 * delta)
    state.camera.position.lerp(targetPosition, dampFactor)

    // В начале пути взгляд ведёт отдельная цель (солнечная система),
    // не касательная кривой — иначе камера смотрит почти строго вниз
    // и большая часть диска планет остаётся за кадром. Дальше — обычная
    // логика "смотреть по направлению движения".
    const solarBlend = 1 - THREE.MathUtils.smoothstep(progress, 0, SOLAR_SYSTEM_LOOKAT_END)
    finalLookAt.copy(lookAtPosition).lerp(SOLAR_SYSTEM_TARGET, solarBlend)
    state.camera.lookAt(finalLookAt)
  })

  return null
}
