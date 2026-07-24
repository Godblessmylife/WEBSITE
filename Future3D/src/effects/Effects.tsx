import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom, ChromaticAberration, Vignette } from '@react-three/postprocessing'
import { BlendFunction, type ChromaticAberrationEffect } from 'postprocessing'
import * as THREE from 'three'
import { useScrollStore } from '@/utils/scrollStore'

// scrollStore уже считал velocity (Lenis отдаёт её с самого начала) —
// она нигде не использовалась. Здесь — единственное место на сайте,
// которое реагирует на СКОРОСТЬ скролла, а не только на его позицию:
// чем быстрее крутите, тем сильнее хроматическая аберрация и мягче
// виньетка — ощущение "разгона"/варп-скорости сквозь космос. При
// остановке скролла эффект плавно гаснет до нуля.
//
// Lenis отдаёт velocity в пикселях/кадр, не в 0..1 — VELOCITY_DIVISOR
// подобран на глаз (нет возможности протестировать в браузере),
// поправить одной цифрой, если покажется слишком слабо/сильно.
const MAX_OFFSET = 0.006
const VELOCITY_DIVISOR = 60

function VelocityWarp() {
  const effectRef = useRef<ChromaticAberrationEffect>(null!)
  const strengthRef = useRef(0)

  useFrame((_, delta) => {
    const velocity = useScrollStore.getState().velocity
    const target = THREE.MathUtils.clamp(Math.abs(velocity) / VELOCITY_DIVISOR, 0, 1)
    const damp = 1 - Math.exp(-6 * delta)
    strengthRef.current = THREE.MathUtils.lerp(strengthRef.current, target, damp)
    effectRef.current.offset.set(strengthRef.current * MAX_OFFSET, strengthRef.current * MAX_OFFSET)
  })

  return (
    <ChromaticAberration
      ref={effectRef}
      blendFunction={BlendFunction.NORMAL}
      radialModulation
      modulationOffset={0.3}
    />
  )
}

// Только Bloom по выбору клиента: солнце, метеоры и неоновые окна
// начинают реально светиться, а не просто быть яркими плоскими цветами.
//
// luminanceThreshold был 0.18 — это ниже яркости обычного светлого
// облачного фона (#c9d6e3 ~0.83 по формуле яркости), поэтому весь экран
// в зоне облаков засвечивался Bloom'ом целиком — это и была "белая
// вспышка". Порог поднят выше яркости фона, чтобы Bloom реагировал
// только на настоящие яркие объекты, а не на светлое небо/облака.
export function Effects() {
  return (
    <EffectComposer>
      <Bloom mipmapBlur luminanceThreshold={0.92} luminanceSmoothing={0.15} intensity={1.6} />
      <VelocityWarp />
      <Vignette offset={0.25} darkness={0.6} />
    </EffectComposer>
  )
}
