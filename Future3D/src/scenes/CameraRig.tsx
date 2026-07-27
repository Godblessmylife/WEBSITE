import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  cameraPath,
  remapPathProgress,
  LOOK_AHEAD,
  SOLAR_SYSTEM_TARGET,
  SOLAR_SYSTEM_LOOKAT_HOLD,
  SOLAR_SYSTEM_LOOKAT_END,
} from './cameraPath'
import { useScrollStore, maxReachableProgress } from '@/utils/scrollStore'

const targetPosition = new THREE.Vector3()
const lookAtPosition = new THREE.Vector3()
const finalLookAt = new THREE.Vector3()
const forward = new THREE.Vector3()
const candidateRight = new THREE.Vector3()
const rightVec = new THREE.Vector3(1, 0, 0)
const upVec = new THREE.Vector3()
const basisMatrix = new THREE.Matrix4()
const WORLD_UP = new THREE.Vector3(0, 1, 0)

// Порог на |forward × worldUp|² = sin²(угол от вертикали). Ниже него
// "право" камеры пересчитывать не пытаемся — см. комментарий у
// applyStableLookAt.
const MIN_RIGHT_LENGTH_SQ = 0.0025

// state.camera.lookAt(target) внутри строит правый вектор как
// worldUp.cross(forward) — у любого пути, где камера хоть иногда
// смотрит почти строго вниз/вверх (проверено расчётом: на текущем
// пути это происходит у нескольких локальных "перегибов" по Z), длина
// этого креста стремится к нулю, и его НАПРАВЛЕНИЕ становится крайне
// чувствительным к исчезающе малым изменениям forward — камера
// "срывает" горизонт на произвольный угол за один кадр (баг клиента:
// "камера меняет горизонтальность" на конкретном проценте скролла).
//
// ПЕРВАЯ версия фикса замораживала right, пока его не с чем было
// пересчитать. Это НЕ РАБОТАЕТ, если требуемый разворот - буквально
// 180° (проверено расчётом: пока путь целиком лежал в плоскости x=0,
// right = forward × worldUp был обязан лежать строго на оси X - между
// +X и -X НЕТ промежуточного направления, значит ни заморозка, ни
// плавный lerp не могут "довернуть" через этот участок - через x=0 это
// математически невозможно). Реальный фикс - в cameraPath.ts (лёгкий
// боковой увод пути на нужном участке, дающий right настоящую третью
// размерность для поворота). Эта функция отвечает только за то, чтобы
// поворот, который теперь СТАЛ возможным, происходил плавно во времени
// (damping), а не мгновенно каждый кадр.
//
// ВАЖНО (проверено расчётом после того, как первая версия этой функции
// полностью гасила видимость солнечной системы): right и up достаточно
// двух векторных произведений - right = forward × worldUp, up = right ×
// forward. Третье "на всякий случай" произведение right = up × forward
// здесь НЕ лишняя подстраховка, а тождество (A×B)×B = -A при A⊥B -
// оно молча РАЗВОРАЧИВАЕТ right на 180°, ломая весь базис (проверено
// численным сравнением с THREE.Matrix4.lookAt: с третьим произведением
// расхождение было ровно 180°, без него - 0°).
const ROT_DAMP_RATE = 2

function applyStableLookAt(camera: THREE.Camera, from: THREE.Vector3, to: THREE.Vector3, delta: number) {
  forward.subVectors(to, from)
  if (forward.lengthSq() < 1e-8) return
  forward.normalize()

  candidateRight.crossVectors(forward, WORLD_UP)
  if (candidateRight.lengthSq() > MIN_RIGHT_LENGTH_SQ) {
    candidateRight.normalize()
    const rotDamp = 1 - Math.exp(-ROT_DAMP_RATE * delta)
    rightVec.lerp(candidateRight, rotDamp).normalize()
  }
  // Если candidateRight всё равно слишком мал (форвард почти точно
  // вертикален) - rightVec просто не трогаем этот кадр, а не тянем к
  // шумовому направлению.
  upVec.crossVectors(rightVec, forward).normalize()
  basisMatrix.makeBasis(rightVec, upVec, forward.clone().negate())
  camera.quaternion.setFromRotationMatrix(basisMatrix)
}

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

    // В начале пути и на всём пролёте мимо солнечной системы взгляд
    // ведёт отдельная цель (солнечная система), не касательная кривой —
    // иначе камера смотрит почти строго вниз, а на пролёте отворачивается
    // от солнца ровно в кульминации сближения (см. комментарий у
    // SOLAR_SYSTEM_LOOKAT_HOLD в cameraPath.ts). Полный блендинг держится
    // до HOLD, затем плавно отпускается к обычной логике "смотреть по
    // направлению движения" к моменту END.
    const solarBlend = 1 - THREE.MathUtils.smoothstep(progress, SOLAR_SYSTEM_LOOKAT_HOLD, SOLAR_SYSTEM_LOOKAT_END)
    finalLookAt.copy(lookAtPosition).lerp(SOLAR_SYSTEM_TARGET, solarBlend)

    if (!smoothedLookAtRef.current) {
      smoothedLookAtRef.current = finalLookAt.clone()
    } else {
      smoothedLookAtRef.current.lerp(finalLookAt, dampFactor)
    }
    applyStableLookAt(state.camera, state.camera.position, smoothedLookAtRef.current, delta)
  })

  return null
}
