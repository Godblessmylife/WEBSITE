import { create } from 'zustand'

// РАНЬШЕ стартовая эвристика включала "reduced" для ЛЮБОГО touch-
// устройства - по отзыву клиента это оказалось слишком грубо ("раньше
// графика была крутая, сейчас ни о чём"): наличие тачскрина само по себе
// ничего не говорит о мощности GPU (современный флагманский телефон
// часто быстрее старого ПК с мышкой). Осознанный выбор владельца слабого
// устройства теперь живёт в graphicsQualityStore.ts (кнопка-шестерёнка в
// игре) - там дефолт "высокое" для всех, а не автоматическое понижение
// по признаку touch. Здесь остаётся только "мало ядер CPU" (грубый, но
// дешёвый признак объективно слабой машины, доступный до первого кадра,
// не зависящий от типа устройства ввода) - и то как временный сигнал:
// динамическая подстройка по РЕАЛЬНОМУ fps через AdaptivePerformance
// (drei PerformanceMonitor) в каждом Canvas переключает reduced, если
// кадры проседают по факту, независимо от того, что показала эвристика
// на старте.
function detectInitialReduced(): boolean {
  if (typeof window === 'undefined') return false
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.hardwareConcurrency === 'number' &&
    navigator.hardwareConcurrency > 0 &&
    navigator.hardwareConcurrency <= 4
  )
}

interface PerfState {
  reduced: boolean
  setReduced: (reduced: boolean) => void
}

export const usePerfStore = create<PerfState>((set) => ({
  reduced: detectInitialReduced(),
  setReduced: (reduced) => set({ reduced }),
}))
