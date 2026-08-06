import { create } from 'zustand'

// Стартовая эвристика для ЛЕНДИНГА (JourneyScene/PortfolioCarousel/
// Effects/Ufos - ВСЯ основная 3D-сцена сайта, не игра). НЕ путать с
// gamePerfStore.ts - игра нарочно использует ОТДЕЛЬНЫЙ стор с другим
// дефолтом (см. подробный комментарий там про то, почему объединять их
// оказалось ошибкой: touch ИЛИ мало ядер CPU - грубый, но дешёвый признак
// слабой машины, доступный до первого кадра, плюс динамическая подстройка
// по РЕАЛЬНОМУ fps через AdaptivePerformance (drei PerformanceMonitor) в
// каждом Canvas - если жизнь показывает, что кадры проседают, "reduced"
// включается, даже если по эвристике устройство выглядело мощным, и
// наоборот.
function detectInitialReduced(): boolean {
  if (typeof window === 'undefined') return false
  const isTouch = window.matchMedia('(pointer: coarse)').matches
  const weakCpu =
    typeof navigator !== 'undefined' &&
    typeof navigator.hardwareConcurrency === 'number' &&
    navigator.hardwareConcurrency > 0 &&
    navigator.hardwareConcurrency <= 4
  return isTouch || weakCpu
}

interface PerfState {
  reduced: boolean
  setReduced: (reduced: boolean) => void
}

export const usePerfStore = create<PerfState>((set) => ({
  reduced: detectInitialReduced(),
  setReduced: (reduced) => set({ reduced }),
}))
