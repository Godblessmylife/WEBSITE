import { PerformanceMonitor } from '@react-three/drei'
import { usePerfStore } from './perfStore'

// Монтируется внутри каждого Canvas (JourneyScene и GameMode — они
// независимые R3F-деревья, каждому нужен свой монитор), пишет в общий
// perfStore. onDecline — устойчивое падение fps ниже порога (drei сам
// считает скользящее среднее и не дёргается на разовый лаг),
// onIncline — устойчивое восстановление. flipflops ограничивает частые
// переключения туда-обратно на границе порога.
export function AdaptivePerformance() {
  const setReduced = usePerfStore((s) => s.setReduced)

  return (
    <PerformanceMonitor
      flipflops={3}
      onDecline={() => setReduced(true)}
      onIncline={() => setReduced(false)}
    />
  )
}
