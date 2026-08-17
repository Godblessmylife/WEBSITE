import { useEffect, useState } from 'react'
import { PerformanceMonitor } from '@react-three/drei'

// БАГ (по отзыву клиента: "сайт ещё раз перезагружается через секунды
// 2 после загрузки") - PerformanceMonitor (drei) выносит ПЕРВЫЙ вердикт
// ровно через iterations*ms = 10*250 = 2.5с после монтирования,
// детерминированно, независимо от устройства (см. node_modules/
// @react-three/drei/core/PerformanceMonitor.js). Эти же первые ~2.5с -
// гарантированно САМЫЙ тяжёлый момент JourneyScene (компиляция шейдеров
// Bloom/хроматической аберрации, декод GLTF солнечной системы/Земли) -
// ложное "устройство медленное" на этом фоне более чем вероятно.
// onDecline -> setReduced(true) -> у JourneyScene.tsx меняется проп dpr
// -> реальный ресайз WebGL-буфера -> уже задокументированный в этом же
// файле триггер потери контекста -> собственный обработчик
// webglcontextlost пересоздаёт ВЕСЬ Canvas через 300мс. Итого ~2.8с -
// то самое "ещё раз перезагружается через секунды 2".
//
// Сама логика монитора рабочая и её не трогаем - откладываем только
// МОМЕНТ, когда он начинает считать первую партию замеров, на 3.5с
// после монтирования (заведомо позже тяжёлого старта) - дальше
// (устойчивое реальное падение FPS) отслеживается точно так же, как и
// раньше.
const MONITOR_START_DELAY_MS = 3500

// Монтируется внутри каждого Canvas (JourneyScene и GameMode — они
// независимые R3F-деревья, каждому нужен свой монитор). setReduced
// передаётся снаружи (а не берётся из общего стора самим компонентом),
// потому что у лендинга и игры теперь РАЗНЫЕ сторы (perfStore.ts и
// gamePerfStore.ts - см. подробный комментарий в gamePerfStore.ts про
// то, почему их нельзя было оставить общими: понижение качества по
// признаку touch-устройства было нужно лендингу, но ломало игре её
// собственную настройку качества). onDecline — устойчивое падение fps
// ниже порога (drei сам считает скользящее среднее и не дёргается на
// разовый лаг), onIncline — устойчивое восстановление. flipflops
// ограничивает частые переключения туда-обратно на границе порога.
export function AdaptivePerformance({ setReduced }: { setReduced: (reduced: boolean) => void }) {
  const [started, setStarted] = useState(false)
  useEffect(() => {
    const t = window.setTimeout(() => setStarted(true), MONITOR_START_DELAY_MS)
    return () => window.clearTimeout(t)
  }, [])

  if (!started) return null

  return (
    <PerformanceMonitor
      flipflops={3}
      onDecline={() => setReduced(true)}
      onIncline={() => setReduced(false)}
    />
  )
}
