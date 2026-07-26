import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { cameraPath, remapPathProgress, LOOK_AHEAD, SOLAR_SYSTEM_TARGET, SOLAR_SYSTEM_LOOKAT_END } from './cameraPath'
import { useScrollStore, maxReachableProgress } from '@/utils/scrollStore'

const targetPosition = new THREE.Vector3()
const lookAtPosition = new THREE.Vector3()
const finalLookAt = new THREE.Vector3()

export function CameraRig() {
  // Достижимый максимум progress зависит от высоты вьюпорта (см.
  // maxReachableProgress) — не меняется каждый кадр, поэтому меряется
  // через DOM только при монтировании и на resize, а не в useFrame.
  const maxProgressRef = useRef(1)
  useEffect(() => {
    const update = () => {
      maxProgressRef.current = maxReachableProgress()
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // Точка взгляда (в отличие от позиции) раньше применялась к камере
  // МГНОВЕННО, без сглаживания — направление взгляда (через LOOK_AHEAD,
  // "смотреть чуть вперёд по кривой") на неровных участках пути могло
  // поворачиваться на десяток градусов за долю процента прогресса.
  // Решение — сгладить не путь, а РЕАКЦИЮ камеры на него: та же
  // экспоненциальная демпфирующая интерполяция, что уже стояла на
  // позиции, применена и к точке взгляда.
  const smoothedLookAtRef = useRef<THREE.Vector3 | null>(null)

  useFrame((state, delta) => {
    const progress = THREE.MathUtils.clamp(useScrollStore.getState().progress, 0, 1)
    const lookProgress = THREE.MathUtils.clamp(progress + LOOK_AHEAD, 0, 1)
    const maxProgress = maxProgressRef.current

    cameraPath.getPointAt(remapPathProgress(progress, maxProgress), targetPosition)
    cameraPath.getPointAt(remapPathProgress(lookProgress, maxProgress), lookAtPosition)

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
