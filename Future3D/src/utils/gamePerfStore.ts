import { create } from 'zustand'

// ОТДЕЛЬНЫЙ от perfStore.ts (лендинг) стор, специально для игры.
//
// Раньше игра читала ОБЩИЙ perfStore.ts - тот самый, что использует ВЕСЬ
// лендинг (JourneyScene.tsx: dpr сцены путешествия, Effects.tsx:
// постобработка/VelocityWarp, Ufos.tsx: количество НЛО). Когда по отзыву
// клиента про игру ("верни качество игры, раньше было круто") оттуда
// убрали "touch = слабое устройство" (см. историю perfStore.ts), это
// заодно и НЕЗАМЕТНО отключило тот же самый защитный механизм на
// ЛЕНДИНГЕ - full dpr/постобработка/полное число НЛО на любом телефоне
// с более чем 4 ядрами внезапно включились там, где раньше сцена была
// специально урезана под мобильный GPU. Результат - "долго грузится,
// чёрный экран, солнечная система не видна" (отзыв клиента), то есть
// точное повторение самого первого инцидента в этом проекте, который уже
// решался откатом целого коммита.
//
// Урок: нельзя было менять ОБЩИЙ стор ради одного потребителя (игры) -
// он используется четырьмя другими, никак не связанными с игрой местами.
// Разделение на два стора даёт каждому потребителю свою, реально нужную
// ему семантику "reduced", не задевая остальных: лендинг по-прежнему
// начинает с осторожного предположения "touch = вероятно слабее" (у него
// нет своей кнопки настроек, чтобы это поправить вручную), а игра - нет
// (у неё есть, см. graphicsQualityStore.ts + GraphicsSettingsButton.tsx),
// и достаточно только объективного признака слабого CPU. Динамическая
// часть (AdaptivePerformance.tsx, теперь принимает стор параметром)
// работает одинаково для обоих - живой fps может понизить качество в
// любом случае, независимо от стартовой эвристики.
function detectInitialReduced(): boolean {
  if (typeof window === 'undefined') return false
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.hardwareConcurrency === 'number' &&
    navigator.hardwareConcurrency > 0 &&
    navigator.hardwareConcurrency <= 4
  )
}

interface GamePerfState {
  reduced: boolean
  setReduced: (reduced: boolean) => void
}

export const useGamePerfStore = create<GamePerfState>((set) => ({
  reduced: detectInitialReduced(),
  setReduced: (reduced) => set({ reduced }),
}))
