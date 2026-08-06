import { PerformanceMonitor } from '@react-three/drei'

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
  return (
    <PerformanceMonitor
      flipflops={3}
      onDecline={() => setReduced(true)}
      onIncline={() => setReduced(false)}
    />
  )
}
