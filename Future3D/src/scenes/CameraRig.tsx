import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { cameraPath, LOOK_AHEAD, SOLAR_SYSTEM_TARGET, SOLAR_SYSTEM_LOOKAT_END } from './cameraPath'
import { useScrollStore } from '@/utils/scrollStore'

const targetPosition = new THREE.Vector3()
const lookAtPosition = new THREE.Vector3()
const finalLookAt = new THREE.Vector3()

export function CameraRig() {
  // Точка взгляда (в отличие от позиции) раньше применялась к камере
  // МГНОВЕННО, без сглаживания. cameraPath.ts на пути вниз имеет резкий
  // "выступ" по Z у второй контрольной точки (0,52,33) — сама кривая
  // из-за него в этом месте разворачивается почти в обратную сторону, и
  // направление взгляда (через LOOK_AHEAD, "смотреть чуть вперёд по
  // кривой") там же поворачивается на ~15° за долю процента прогресса.
  // Проверено численно (сэмплирование кривой скриптом): смена типа
  // сплайна тут не помогает — сама форма пути такая. Решение — сгладить
  // не путь, а РЕАКЦИЮ камеры на него: та же экспоненциальная демпфирующая
  // интерполяция, что уже стояла на позиции, применена и к точке взгляда.
  const smoothedLookAtRef = useRef<THREE.Vector3 | null>(null)

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

    if (!smoothedLookAtRef.current) {
      smoothedLookAtRef.current = finalLookAt.clone()
    } else {
      smoothedLookAtRef.current.lerp(finalLookAt, dampFactor)
    }
    state.camera.lookAt(smoothedLookAtRef.current)
  })

  return null
}
