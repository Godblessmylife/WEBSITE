import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useScrollStore } from '@/utils/scrollStore'

// "Сделать эффект стратосферы на 71-73%" — 72% видимого путешествия (см.
// JourneyTuner.tsx) соответствует progress~0.568 при текущей длине
// страницы (было 70%/0.545 - клиент чуть сдвинул точку). Мягкая голубая
// засветка по центру-низу экрана, нарастающая и гаснущая вокруг этой
// точки — ощущение "проскочили верхний слой атмосферы планеты", отдельно
// от основного тумана сцены (FogController держит небо тёмным весь этот
// участок специально, см. его комментарии) — это НЕ туман, а разовая
// вспышка, которая проходит. HALF_WIDTH=0.1 (progress) уже растягивает
// её заметно шире одной точки, что и покрывает запрошенный диапазон
// 71-73% с запасом.
//
// Обычный DOM-оверлей поверх Canvas (внутри sticky-обёртки в App.tsx),
// а не часть 3D-сцены — тот же приём, что и TeleportEffect.tsx в игре:
// такой эффект проще и надёжнее сделать в CSS, чем шейдером, и он не
// зависит от того, что происходит с WebGL-контекстом. Подписка на стор
// напрямую (subscribe, не хук) мутирует opacity у DOM-узла в обход
// React-рендера — обновляется каждый кадр скролла, пересоздавать элемент
// компонента на это незачем.
const PEAK_PROGRESS = 0.568
const HALF_WIDTH = 0.1

function intensityAt(progress: number) {
  const fadeIn = THREE.MathUtils.smoothstep(progress, PEAK_PROGRESS - HALF_WIDTH, PEAK_PROGRESS)
  const fadeOut = 1 - THREE.MathUtils.smoothstep(progress, PEAK_PROGRESS, PEAK_PROGRESS + HALF_WIDTH)
  return Math.min(fadeIn, fadeOut)
}

export function StratosphereFlash() {
  const ref = useRef<HTMLDivElement>(null!)

  useEffect(() => {
    const unsub = useScrollStore.subscribe((state) => {
      const progress = THREE.MathUtils.clamp(state.progress, 0, 1)
      ref.current.style.opacity = String(intensityAt(progress))
    })
    return unsub
  }, [])

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 5,
        pointerEvents: 'none',
        opacity: 0,
        background:
          'radial-gradient(circle at 50% 62%, rgba(140, 200, 255, 0.6) 0%, rgba(90, 160, 235, 0.28) 38%, rgba(10, 20, 40, 0) 72%)',
        mixBlendMode: 'screen',
      }}
    />
  )
}
